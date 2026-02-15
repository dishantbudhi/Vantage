"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import type {
  AgentName,
  AgentStatus,
  AgentResults,
  AnalysisState,
} from "@/lib/types";
import type {
  OrchestratorOutput,
  SynthesisOutput,
} from "@/lib/agents/schemas";

type PipelineStatus = "idle" | "orchestrating" | "analyzing" | "synthesizing" | "complete" | "error";

const AGENTS: AgentName[] = [
  "geopolitics",
  "economy",
  "food_supply",
  "infrastructure",
  "civilian_impact",
  "synthesis",
];

function createInitialAgentTexts(): Record<AgentName, string> {
  const texts: Record<string, string> = {};
  AGENTS.forEach((agent) => {
    texts[agent] = "";
  });
  return texts as Record<AgentName, string>;
}

function createInitialAgentStatuses(): Record<AgentName, AgentStatus> {
  const statuses: Record<string, AgentStatus> = {};
  AGENTS.forEach((agent) => {
    statuses[agent] = "idle";
  });
  return statuses as Record<AgentName, AgentStatus>;
}

export interface UseAnalysisReturn extends AnalysisState {
  analyzeScenario: (scenario: string) => Promise<void>;
  reset: () => void;
  pipelineStatus: PipelineStatus;
  pipelineMessage: string;
  synthesisStatus: AgentStatus;
}

export function useAnalysis(): UseAnalysisReturn {
  const [status, setStatus] = useState<AnalysisState["status"]>("idle");
  const [scenario, setScenario] = useState<string | null>(null);
  const [orchestratorOutput, setOrchestratorOutput] = useState<OrchestratorOutput | null>(null);
  const [agentTexts, setAgentTexts] = useState<Record<AgentName, string>>(createInitialAgentTexts());
  const [agentResults, setAgentResults] = useState<AgentResults>({});
  const [agentStatuses, setAgentStatuses] = useState<Record<AgentName, AgentStatus>>(createInitialAgentStatuses());
  const [synthesisText, setSynthesisText] = useState("");
  const [synthesisOutput, setSynthesisOutput] = useState<SynthesisOutput | null>(null);
  const [compoundRiskScore, setCompoundRiskScore] = useState<number | null>(null);
  const [errors, setErrors] = useState<Array<{ message: string; agent?: AgentName }>>([]);
  
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
  const [pipelineMessage, setPipelineMessage] = useState("");
  const [synthesisStatus, setSynthesisStatus] = useState<AgentStatus>("idle");

  const abortControllerRef = useRef<AbortController | null>(null);

  // Chunk buffering: accumulate agent text chunks in a ref and flush at intervals
  // to reduce re-renders from ~100+/sec (per token) to ~10-20/sec.
  const chunkBufferRef = useRef<Record<string, string>>({});
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const FLUSH_INTERVAL_MS = 80;

  const flushChunkBuffer = useCallback(() => {
    const buffer = chunkBufferRef.current;
    const keys = Object.keys(buffer);
    if (keys.length === 0) return;

    setAgentTexts((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        const typedKey = key as AgentName;
        next[typedKey] = (prev[typedKey] || "") + buffer[key];
      }
      return next;
    });

    chunkBufferRef.current = {};
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flushChunkBuffer();
    }, FLUSH_INTERVAL_MS);
  }, [flushChunkBuffer]);

  // Clean up flush timer on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    chunkBufferRef.current = {};
    setStatus("idle");
    setScenario(null);
    setOrchestratorOutput(null);
    setAgentTexts(createInitialAgentTexts());
    setAgentResults({});
    setAgentStatuses(createInitialAgentStatuses());
    setSynthesisText("");
    setSynthesisOutput(null);
    setCompoundRiskScore(null);
    setErrors([]);
    setPipelineStatus("idle");
    setPipelineMessage("");
    setSynthesisStatus("idle");
  }, []);

  const analyzeScenario = useCallback(async (inputScenario: string) => {
    reset();
    setStatus("analyzing");
    setScenario(inputScenario);
    setPipelineStatus("orchestrating");
    setPipelineMessage("Analyzing scenario...");

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scenario: inputScenario }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      let currentData = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ") && currentEvent) {
            currentData = line.slice(6);
            
            try {
              const data = JSON.parse(currentData);
              
              switch (currentEvent) {
                case "orchestrator": {
                  setOrchestratorOutput(data);
                  setPipelineStatus("analyzing");
                  setPipelineMessage("Running specialist agents...");
                  break;
                }

                case "agent_chunk": {
                  const { agent, chunk } = data;
                  if (agent && chunk && AGENTS.includes(agent)) {
                    const typedAgent = agent as AgentName;
                    // Buffer chunks and flush at intervals to reduce re-renders
                    chunkBufferRef.current[typedAgent] =
                      (chunkBufferRef.current[typedAgent] || "") + chunk;
                    scheduleFlush();
                    setAgentStatuses((prev) => {
                      if (prev[typedAgent] === "streaming") return prev;
                      return { ...prev, [typedAgent]: "streaming" };
                    });
                  }
                  break;
                }

                case "agent_complete": {
                  const { agent, structured } = data;
                  if (agent === "synthesis") {
                    setSynthesisOutput(structured as SynthesisOutput);
                    setSynthesisStatus("complete");
                  } else if (agent && AGENTS.includes(agent)) {
                    const typedAgent = agent as AgentName;
                    setAgentResults((prev) => ({
                      ...prev,
                      [typedAgent]: structured,
                    }));
                    setAgentStatuses((prev) => ({
                      ...prev,
                      [typedAgent]: "complete",
                    }));
                  }
                  break;
                }

                case "synthesis_chunk": {
                  const { chunk } = data;
                  if (chunk) {
                    setSynthesisText((prev) => prev + chunk);
                    setSynthesisStatus((prev) => (prev !== "streaming" ? "streaming" : prev));
                  }
                  break;
                }

                case "complete": {
                  const { compound_risk_score } = data;
                  setCompoundRiskScore(compound_risk_score);
                  setStatus("complete");
                  setPipelineStatus("complete");
                  setPipelineMessage("Analysis complete");
                  setSynthesisStatus("complete");
                  break;
                }

                case "error": {
                  const { message: errMsg, agent } = data;
                  setErrors((prev) => [...prev, { message: errMsg, agent }]);
                  if (agent && AGENTS.includes(agent)) {
                    const typedAgent = agent as AgentName;
                    setAgentStatuses((prev) => ({
                      ...prev,
                      [typedAgent]: "error",
                    }));
                  }
                  if (!agent) {
                    setStatus("error");
                    setPipelineStatus("error");
                    setPipelineMessage(errMsg);
                  }
                  break;
                }

                case "status": {
                  const { status: pipeStatus, message: pipeMessage } = data;
                  if (pipeStatus === "orchestrating") {
                    setPipelineStatus("orchestrating");
                  } else if (pipeStatus === "analyzing") {
                    setPipelineStatus("analyzing");
                  } else if (pipeStatus === "synthesizing") {
                    setPipelineStatus("synthesizing");
                  }
                  if (pipeMessage) {
                    setPipelineMessage(pipeMessage);
                  }
                  break;
                }
              }
            } catch (parseError) {
              console.error("Failed to parse SSE data:", parseError, "Data:", currentData);
            }
            
            currentEvent = "";
            currentData = "";
          }
        }
      }
      // Flush any remaining buffered chunks
      flushChunkBuffer();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setErrors((prev) => [...prev, { message: errorMessage }]);
      setStatus("error");
      setPipelineStatus("error");
      setPipelineMessage(errorMessage);
    }
  }, [reset]);

  return {
    status,
    scenario,
    orchestratorOutput,
    agentTexts,
    agentResults,
    agentStatuses,
    synthesisText,
    synthesisOutput,
    compoundRiskScore,
    errors,
    analyzeScenario,
    reset,
    pipelineStatus,
    pipelineMessage,
    synthesisStatus,
  };
}

/**
 * Fallback replay logic for golden-path scenarios.
 * When the live AI pipeline fails, this module replays pre-cached
 * responses as SSE events with artificial delays to simulate streaming.
 */

import { GOLDEN_PATH_SCENARIOS } from "@/components/sidebar/constants";

// Map button text → fallback file name
const SCENARIO_TO_FALLBACK: Record<string, string> = {
  [GOLDEN_PATH_SCENARIOS.suez]: "fallback-suez",
  [GOLDEN_PATH_SCENARIOS.texas]: "fallback-texas",
  [GOLDEN_PATH_SCENARIOS.greenland]: "fallback-greenland",
};

export interface FallbackData {
  scenario: string;
  orchestrator: Record<string, unknown>;
  agentResults: Record<string, Record<string, unknown>>;
  synthesis: Record<string, unknown>;
}

/**
 * Check if a scenario matches a golden-path fallback.
 * Compares trimmed, lowercased text.
 */
export function matchFallbackScenario(scenario: string): string | null {
  const normalized = scenario.trim().toLowerCase();
  for (const [key, fallbackName] of Object.entries(SCENARIO_TO_FALLBACK)) {
    if (key.trim().toLowerCase() === normalized) {
      return fallbackName;
    }
  }
  return null;
}

/**
 * Load fallback data for a given fallback name.
 */
export async function loadFallbackData(fallbackName: string): Promise<FallbackData> {
  // Dynamic import for JSON files in lib/data
  const mod = await import(`@/lib/data/${fallbackName}.json`);
  return (mod.default ?? mod) as FallbackData;
}

const AGENT_NAMES = ["geopolitics", "economy", "food_supply", "infrastructure", "civilian_impact"] as const;

/**
 * Replay fallback data as SSE events with artificial streaming delays.
 * @param data The pre-cached fallback data
 * @param send Function to emit an SSE event
 * @param delay Delay in ms between events (default 100ms)
 */
export async function replayFallback(
  data: FallbackData,
  send: (event: string, payload: unknown) => void,
  delay: number = 100
): Promise<void> {
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  // 1. Orchestrator
  send("status", { status: "orchestrating", message: "Analyzing scenario..." });
  await sleep(delay);
  send("orchestrator", data.orchestrator);
  await sleep(delay);

  // 2. Agent chunks + completions
  send("status", { status: "analyzing", message: "Running specialist agents..." });
  await sleep(delay);

  for (const agent of AGENT_NAMES) {
    const agentData = data.agentResults[agent];
    if (!agentData) continue;

    const narrative = (agentData as { narrative?: string }).narrative ?? "";

    // Simulate streaming by emitting narrative in chunks
    if (narrative) {
      const words = narrative.split(" ");
      const chunkSize = 10;
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(" ") + " ";
        send("agent_chunk", { agent, chunk });
        await sleep(20); // Fast chunk rate for replay
      }
    }

    send("agent_complete", { agent, structured: agentData, narrative: (agentData as { narrative?: string }).narrative });
    await sleep(delay);
  }

  // 3. Synthesis
  send("status", { status: "synthesizing", message: "Generating synthesis..." });
  await sleep(delay);

  const synthesisNarrative = (data.synthesis as { narrative?: string }).narrative ?? "";
  if (synthesisNarrative) {
    const words = synthesisNarrative.split(" ");
    const chunkSize = 8;
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(" ") + " ";
      send("synthesis_chunk", { chunk });
      await sleep(20);
    }
  }

  send("agent_complete", { agent: "synthesis", structured: data.synthesis, narrative: synthesisNarrative });
  await sleep(delay);

  // 4. Complete
  const compoundRiskScore = (data.synthesis as { compound_risk_score?: number }).compound_risk_score ?? 0;
  send("complete", { compound_risk_score: compoundRiskScore });
}


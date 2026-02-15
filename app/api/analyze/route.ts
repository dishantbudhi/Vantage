import { NextRequest, NextResponse } from "next/server";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { runGeopoliticsAgent } from "@/lib/agents/geopolitics-agent";
import { runEconomyAgent } from "@/lib/agents/economy-agent";
import { runFoodSupplyAgent } from "@/lib/agents/food-supply-agent";
import { runInfrastructureAgent } from "@/lib/agents/infrastructure-agent";
import { runCivilianImpactAgent } from "@/lib/agents/civilian-impact-agent";
import { runSynthesisAgent, type AgentOutputs } from "@/lib/agents/synthesis-agent";
import { searchGDELT } from "@/lib/gdelt";
import type { AgentName } from "@/lib/types";
import type { OrchestratorOutput } from "@/lib/agents/schemas";
import type { GeopoliticsOutput, EconomyOutput, FoodSupplyOutput, InfrastructureOutput, CivilianImpactOutput } from "@/lib/agents/schemas";

const AGENT_TIMEOUT_MS = 20000;

interface AgentResult {
  name: AgentName;
  output: GeopoliticsOutput | EconomyOutput | FoodSupplyOutput | InfrastructureOutput | CivilianImpactOutput;
  narrative: string;
}

interface AgentError {
  name: AgentName;
  error: string;
}

type AgentPromiseResult = AgentResult | AgentError;

const agentConfigs: {
  name: AgentName;
  queryKey: "geopolitics" | "economy" | "food" | "infrastructure" | "civilian";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: any;
}[] = [
  {
    name: "geopolitics",
    queryKey: "geopolitics",
    run: runGeopoliticsAgent,
  },
  {
    name: "economy",
    queryKey: "economy",
    run: runEconomyAgent,
  },
  {
    name: "food_supply",
    queryKey: "food",
    run: runFoodSupplyAgent,
  },
  {
    name: "infrastructure",
    queryKey: "infrastructure",
    run: runInfrastructureAgent,
  },
  {
    name: "civilian_impact",
    queryKey: "civilian",
    run: runCivilianImpactAgent,
  },
];

export async function POST(req: NextRequest) {
  let scenario: string;

  try {
    const body = await req.json();
    scenario = body.scenario;
    if (!scenario || typeof scenario !== "string" || scenario.length < 1) {
      return NextResponse.json(
        { error: "Scenario is required and must be a non-empty string" },
        { status: 400 }
      );
    }
    if (scenario.length > 500) {
      return NextResponse.json(
        { error: "Scenario must be 500 characters or less" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const sendError = (message: string, agent?: AgentName) => {
        send("error", { message, agent });
      };

      try {
        send("status", { status: "orchestrating", message: "Analyzing scenario..." });

        const orchestratorOutput = await runOrchestrator(scenario);
        send("orchestrator", orchestratorOutput);

        send("status", { status: "analyzing", message: "Running specialist agents..." });

        const gdeltPromises = agentConfigs.map((config) =>
          searchGDELT(orchestratorOutput.context_queries[config.queryKey]).catch(
            () => "No recent news context available."
          )
        );
        const gdeltResults = await Promise.all(gdeltPromises);
        const gdeltContext: Record<AgentName, string> = Object.fromEntries(
          agentConfigs.map((config, i) => [config.name, gdeltResults[i]])
        ) as Record<AgentName, string>;

        const agentPromises = agentConfigs.map(async (config) => {
          const agentName = config.name;
          const context = gdeltContext[agentName];

          try {
            const result = await runAgentWithTimeout(
              config.run,
              orchestratorOutput,
              context,
              AGENT_TIMEOUT_MS,
              (chunk: string) => send("agent_chunk", { agent: agentName, chunk })
            );

            send("agent_complete", {
              agent: agentName,
              structured: result.structured,
              narrative: result.narrative,
            });

            return { name: agentName, output: result.structured, narrative: result.narrative } as AgentResult;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Agent failed";
            sendError(errorMessage, agentName);
            return { name: agentName, error: errorMessage } as AgentError;
          }
        });

        const agentResults = await Promise.allSettled(agentPromises);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fulfilledResults: any = {};

        for (const result of agentResults) {
          if (result.status === "fulfilled") {
            const value = result.value as AgentPromiseResult;
            if (!("error" in value)) {
              fulfilledResults[value.name] = value.output;
            }
          }
        }

        send("status", { status: "synthesizing", message: "Generating synthesis..." });

        const synthesisResult = await runSynthesisAgent(
          fulfilledResults,
          orchestratorOutput,
          { onChunk: (chunk: string) => send("synthesis_chunk", { chunk }) }
        );

        send("agent_complete", {
          agent: "synthesis",
          structured: synthesisResult.structured,
          narrative: synthesisResult.narrative,
        });

        send("complete", {
          compound_risk_score: synthesisResult.structured.compound_risk_score,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Pipeline error:", error);
        sendError(errorMessage);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runAgentWithTimeout(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runFn: any,
  orchestratorOutput: OrchestratorOutput,
  gdeltContext: string,
  timeoutMs: number,
  onChunk?: (chunk: string) => void
): Promise<{ narrative: string; structured: unknown }> {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Agent timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      const result = await runFn(orchestratorOutput, gdeltContext, { onChunk });
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

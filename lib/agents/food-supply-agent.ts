import { generateObject, streamText } from "ai";
import { minimax } from "./providers";
import { FoodSupplySchema, type FoodSupplyOutput, OrchestratorOutput } from "./schemas";
import { FOOD_SUPPLY_SYSTEM_PROMPT } from "./system-prompts";
import type { AgentOptions } from "./geopolitics-agent";

export async function runFoodSupplyAgent(
  orchestratorOutput: OrchestratorOutput,
  gdeltContext: string,
  options: AgentOptions = {}
): Promise<{ narrative: string; structured: FoodSupplyOutput }> {
  const { onChunk, temperature = 0.4, maxTokens = 2000 } = options;

  const prompt = buildPrompt(orchestratorOutput, gdeltContext);

  const textStream = streamText({
    model: minimax("MiniMax-M2.5"),
    system: FOOD_SUPPLY_SYSTEM_PROMPT,
    prompt,
    temperature,
    maxTokens,
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta" && onChunk) {
        onChunk(chunk.textDelta);
      }
    },
  });

  const narrative = await textStream.text;

  const { object: structured } = await generateObject({
    model: minimax("MiniMax-M2.5"),
    schema: FoodSupplySchema,
    system: FOOD_SUPPLY_SYSTEM_PROMPT,
    prompt,
    temperature: 0.3,
  });

  return { narrative, structured };
}

function buildPrompt(orchestratorOutput: OrchestratorOutput, gdeltContext: string): string {
  const contextSection = gdeltContext
    ? `RECENT NEWS CONTEXT:\n${gdeltContext}\n\n`
    : "";

  return `${contextSection}SCENARIO ANALYSIS REQUEST:

Scenario Summary: ${orchestratorOutput.scenario_summary}

Primary Affected Regions: ${orchestratorOutput.primary_regions.join(", ")}
Secondary Affected Regions: ${orchestratorOutput.secondary_regions.join(", ")}

Coordinates: lat ${orchestratorOutput.coordinates.lat}, lon ${orchestratorOutput.coordinates.lon}
Zoom Level: ${orchestratorOutput.zoom_level}
Time Horizon: ${orchestratorOutput.time_horizon}
Severity: ${orchestratorOutput.severity}/10
Event Categories: ${orchestratorOutput.event_categories.join(", ")}

Please provide your analysis in JSON format matching the schema.`;
}

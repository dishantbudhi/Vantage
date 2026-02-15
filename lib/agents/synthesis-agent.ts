import { generateObject, streamText } from "ai";
import { openai } from "./providers";
import {
  SynthesisSchema,
  type SynthesisOutput,
  type OrchestratorOutput,
  type GeopoliticsOutput,
  type EconomyOutput,
  type FoodSupplyOutput,
  type InfrastructureOutput,
  type CivilianImpactOutput,
} from "./schemas";
import { SYNTHESIS_SYSTEM_PROMPT } from "./system-prompts";
import { computeCompoundRiskScore } from "../risk-score";
import type { AgentOptions } from "./geopolitics-agent";

export interface AgentOutputs {
  geopolitics?: GeopoliticsOutput;
  economy?: EconomyOutput;
  food_supply?: FoodSupplyOutput;
  infrastructure?: InfrastructureOutput;
  civilian_impact?: CivilianImpactOutput;
}

function getGeopoliticsScore(output?: GeopoliticsOutput): number {
  return output?.affected_countries.reduce((max, c) => Math.max(max, c.impact_score), 0) ?? 0;
}

function getEconomyScore(output?: EconomyOutput): number {
  return output?.affected_countries.reduce((max, c) => Math.max(max, c.trade_disruption), 0) ?? 0;
}

function getFoodScore(output?: FoodSupplyOutput): number {
  return output?.affected_countries.reduce((max, c) => Math.max(max, c.food_security_impact), 0) ?? 0;
}

function getInfrastructureScore(output?: InfrastructureOutput): number {
  return output?.affected_countries.reduce((max, c) => Math.max(max, c.infrastructure_risk), 0) ?? 0;
}

function getCivilianScore(output?: CivilianImpactOutput): number {
  return output?.affected_countries.reduce((max, c) => Math.max(max, c.humanitarian_score), 0) ?? 0;
}

export async function runSynthesisAgent(
  agentOutputs: AgentOutputs,
  orchestratorOutput: OrchestratorOutput,
  options: AgentOptions = {}
): Promise<{ narrative: string; structured: SynthesisOutput }> {
  const { onChunk, temperature = 0.3, maxTokens = 2000 } = options;

  const prompt = buildPrompt(agentOutputs, orchestratorOutput);

  const textStream = streamText({
    model: openai("gpt-5.2"),
    system: SYNTHESIS_SYSTEM_PROMPT,
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

  const scores = extractDomainScores(agentOutputs);
  const compoundScore = computeCompoundRiskScore(
    scores,
    orchestratorOutput.event_categories
  );

  const { object: structured } = await generateObject({
    model: openai("gpt-5.2"),
    schema: SynthesisSchema,
    system: SYNTHESIS_SYSTEM_PROMPT,
    prompt,
    temperature,
  });

  return {
    narrative,
    structured: {
      ...structured,
      compound_risk_score: compoundScore,
    },
  };
}

function buildPrompt(agentOutputs: AgentOutputs, orchestratorOutput: OrchestratorOutput): string {
  return `SYNTHESIS ANALYSIS REQUEST

Original Scenario:
- Summary: ${orchestratorOutput.scenario_summary}
- Primary Regions: ${orchestratorOutput.primary_regions.join(", ")}
- Secondary Regions: ${orchestratorOutput.secondary_regions.join(", ")}
- Time Horizon: ${orchestratorOutput.time_horizon}
- Severity: ${orchestratorOutput.severity}/10
- Event Categories: ${orchestratorOutput.event_categories.join(", ")}

=== GEOPOLITICS ANALYSIS ===
${JSON.stringify(agentOutputs.geopolitics, null, 2)}

=== ECONOMY ANALYSIS ===
${JSON.stringify(agentOutputs.economy, null, 2)}

=== FOOD SUPPLY ANALYSIS ===
${JSON.stringify(agentOutputs.food_supply, null, 2)}

=== INFRASTRUCTURE ANALYSIS ===
${JSON.stringify(agentOutputs.infrastructure, null, 2)}

=== CIVILIAN IMPACT ANALYSIS ===
${JSON.stringify(agentOutputs.civilian_impact, null, 2)}

Please provide your unified synthesis in JSON format matching the schema. The compound_risk_score should be calculated using the algorithm specified in the system prompt.`;
}

function extractDomainScores(agentOutputs: AgentOutputs) {
  return {
    geopolitics: getGeopoliticsScore(agentOutputs.geopolitics),
    economy: getEconomyScore(agentOutputs.economy),
    food: getFoodScore(agentOutputs.food_supply),
    infrastructure: getInfrastructureScore(agentOutputs.infrastructure),
    civilian: getCivilianScore(agentOutputs.civilian_impact),
  };
}

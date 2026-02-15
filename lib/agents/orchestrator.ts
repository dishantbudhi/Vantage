import { generateObject } from "ai";
import { openai } from "./providers";
import { OrchestratorSchema, type OrchestratorOutput } from "./schemas";
import { ORCHESTRATOR_SYSTEM_PROMPT } from "./system-prompts";

export interface OrchestratorOptions {
  temperature?: number;
  maxTokens?: number;
}

export async function runOrchestrator(
  scenario: string,
  options: OrchestratorOptions = {}
): Promise<OrchestratorOutput> {
  const { temperature = 0.2, maxTokens = 1500 } = options;

  const { object } = await generateObject({
    model: openai("gpt-5.2"),
    schema: OrchestratorSchema,
    system: ORCHESTRATOR_SYSTEM_PROMPT,
    prompt: scenario,
    temperature,
    maxTokens,
  });

  return object;
}

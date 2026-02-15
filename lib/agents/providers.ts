import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const requiredEnvVars = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
};

for (const [name, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
}

export const openai = createOpenAI({
    apiKey: requiredEnvVars.OPENAI_API_KEY,
});

export const minimax = createOpenAICompatible({
    name: "minimax",
    baseURL: "https://api.minimax.io/v1",
    apiKey: requiredEnvVars.MINIMAX_API_KEY,
});

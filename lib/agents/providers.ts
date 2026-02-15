import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export const minimax = createOpenAICompatible({
    name: "minimax",
    baseURL: "https://api.minimax.io/v1",
    apiKey: process.env.MINIMAX_API_KEY!,
});

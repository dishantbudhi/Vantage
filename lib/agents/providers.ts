import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const openaiApiKey = process.env.OPENAI_API_KEY;
const minimaxApiKey = process.env.MINIMAX_API_KEY;

let openai: ReturnType<typeof createOpenAI>;
let minimax: ReturnType<typeof createOpenAICompatible>;

if (!openaiApiKey || !minimaxApiKey) {
    throw new Error("Missing required API keys. Set OPENAI_API_KEY and MINIMAX_API_KEY environment variables.");
}

const openai = createOpenAI({
    apiKey: openaiApiKey,
});

const minimax = createOpenAICompatible({
    name: "minimax",
    baseURL: "https://api.minimax.io/v1",
    apiKey: minimaxApiKey,
});

export { openai, minimax };

import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Lazily create providers to avoid throwing at build time when env vars aren't set.
// The providers are only used at runtime in API route handlers.

let _openai: ReturnType<typeof createOpenAI> | null = null;
let _minimax: ReturnType<typeof createOpenAICompatible> | null = null;

function getOpenAI() {
    if (!_openai) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("Missing OPENAI_API_KEY environment variable.");
        }
        _openai = createOpenAI({ apiKey });
    }
    return _openai;
}

function getMinimax() {
    if (!_minimax) {
        const apiKey = process.env.MINIMAX_API_KEY;
        if (!apiKey) {
            throw new Error("Missing MINIMAX_API_KEY environment variable.");
        }
        _minimax = createOpenAICompatible({
            name: "minimax",
            baseURL: "https://api.minimax.io/v1",
            apiKey,
        });
    }
    return _minimax;
}

// Export as callable getters that behave like the original exports
// Usage: openai("gpt-5.2") and minimax("MiniMax-M2.5") work the same way
export const openai: ReturnType<typeof createOpenAI> = ((...args: Parameters<ReturnType<typeof createOpenAI>>) => getOpenAI()(...args)) as ReturnType<typeof createOpenAI>;
export const minimax: ReturnType<typeof createOpenAICompatible> = ((...args: Parameters<ReturnType<typeof createOpenAICompatible>>) => getMinimax()(...args)) as ReturnType<typeof createOpenAICompatible>;

import { describe, it, expect, vi, beforeEach } from "vitest";

// Check if we can import providers. They depend on process.env.
// We'll mock process.env before importing.

describe("Providers", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.OPENAI_API_KEY = "mock-openai-key";
        process.env.MINIMAX_API_KEY = "mock-minimax-key";
    });

    it("should export openai and minimax instances", async () => {
        const { openai, minimax } = await import("@/lib/agents/providers");
        expect(openai).toBeDefined();
        expect(minimax).toBeDefined();
    });

    // We can't easily test if they are configured correctly without making a call, 
    // but we can check if they throw on import if keys are missing (optional behavior).
    // Or just check that they are objects/functions.
});

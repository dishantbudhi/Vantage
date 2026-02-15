import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Providers", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.OPENAI_API_KEY = "mock-openai-key";
        process.env.MINIMAX_API_KEY = "mock-minimax-key";
    });

    it("should export openai and minimax as callable functions", async () => {
        const { openai, minimax } = await import("@/lib/agents/providers");
        expect(typeof openai).toBe("function");
        expect(typeof minimax).toBe("function");
    });

    it("should not throw at import time even without API keys", async () => {
        delete process.env.OPENAI_API_KEY;
        delete process.env.MINIMAX_API_KEY;
        // Import should not throw — keys are checked lazily
        const mod = await import("@/lib/agents/providers");
        expect(mod.openai).toBeDefined();
        expect(mod.minimax).toBeDefined();
    });
});

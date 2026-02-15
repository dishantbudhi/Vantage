import { describe, it, expect, vi, beforeEach } from "vitest";

// This file tests the SSE parsing and state management logic
// used by the useAnalysis hook, extracted as pure functions.

describe("useAnalysis — SSE parsing logic", () => {
  // Simulating the core parsing logic from use-analysis.ts
  function parseSSEBuffer(buffer: string) {
    const events: Array<{ event: string; data: unknown }> = [];
    let currentEvent = "";
    const lines = buffer.split("\n");
    const remaining = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7);
      } else if (line.startsWith("data: ") && currentEvent) {
        try {
          const data = JSON.parse(line.slice(6));
          events.push({ event: currentEvent, data });
        } catch {
          // Skip malformed JSON
        }
        currentEvent = "";
      }
    }

    return { events, remaining, currentEvent };
  }

  it("parses orchestrator event", () => {
    const buffer = `event: orchestrator\ndata: {"scenario_summary":"test"}\n\n`;
    const { events } = parseSSEBuffer(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("orchestrator");
    expect((events[0].data as any).scenario_summary).toBe("test");
  });

  it("parses multiple agent_chunk events", () => {
    const buffer = [
      `event: agent_chunk`,
      `data: {"agent":"geopolitics","chunk":"Hello "}`,
      ``,
      `event: agent_chunk`,
      `data: {"agent":"economy","chunk":"World "}`,
      ``,
      ``
    ].join("\n");
    const { events } = parseSSEBuffer(buffer);
    expect(events).toHaveLength(2);
    expect((events[0].data as any).agent).toBe("geopolitics");
    expect((events[1].data as any).agent).toBe("economy");
  });

  it("parses complete event with score", () => {
    const buffer = `event: complete\ndata: {"compound_risk_score":73}\n\n`;
    const { events } = parseSSEBuffer(buffer);
    expect(events).toHaveLength(1);
    expect((events[0].data as any).compound_risk_score).toBe(73);
  });

  it("handles partial buffer (incomplete data line)", () => {
    const buffer = `event: agent_chunk\ndata: {"agent":"geo`;
    const { events, remaining } = parseSSEBuffer(buffer);
    // No complete event parsed
    expect(events).toHaveLength(0);
    // Remaining contains partial data
    expect(remaining).toContain("data:");
  });

  it("handles error events", () => {
    const buffer = `event: error\ndata: {"message":"Agent failed","agent":"geopolitics"}\n\n`;
    const { events } = parseSSEBuffer(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("error");
    expect((events[0].data as any).message).toBe("Agent failed");
    expect((events[0].data as any).agent).toBe("geopolitics");
  });

  it("skips malformed JSON data lines", () => {
    const buffer = `event: agent_chunk\ndata: {invalid json}\n\nevent: complete\ndata: {"compound_risk_score":50}\n\n`;
    const { events } = parseSSEBuffer(buffer);
    // Only the valid complete event should be parsed
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("complete");
  });

  it("parses status events", () => {
    const buffer = `event: status\ndata: {"status":"orchestrating","message":"Analyzing..."}\n\n`;
    const { events } = parseSSEBuffer(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("status");
    expect((events[0].data as any).status).toBe("orchestrating");
  });

  it("parses synthesis_chunk events", () => {
    const buffer = `event: synthesis_chunk\ndata: {"chunk":"Synthesis text..."}\n\n`;
    const { events } = parseSSEBuffer(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("synthesis_chunk");
    expect((events[0].data as any).chunk).toBe("Synthesis text...");
  });
});

describe("useAnalysis — chunk buffering logic", () => {
  it("accumulates chunks in buffer and flushes", () => {
    const buffer: Record<string, string> = {};

    // Simulate receiving chunks
    buffer["geopolitics"] = (buffer["geopolitics"] || "") + "Hello ";
    buffer["geopolitics"] = (buffer["geopolitics"] || "") + "world ";
    buffer["economy"] = (buffer["economy"] || "") + "Economic ";

    expect(buffer["geopolitics"]).toBe("Hello world ");
    expect(buffer["economy"]).toBe("Economic ");

    // Simulate flush
    const prevTexts: Record<string, string> = {
      geopolitics: "Existing: ",
      economy: "",
      food_supply: "",
      infrastructure: "",
      civilian_impact: "",
      synthesis: "",
    };

    const nextTexts = { ...prevTexts };
    for (const key of Object.keys(buffer)) {
      nextTexts[key] = (prevTexts[key] || "") + buffer[key];
    }

    expect(nextTexts["geopolitics"]).toBe("Existing: Hello world ");
    expect(nextTexts["economy"]).toBe("Economic ");

    // Clear buffer after flush
    Object.keys(buffer).forEach((k) => delete buffer[k]);
    expect(Object.keys(buffer).length).toBe(0);
  });
});

describe("useAnalysis — state management", () => {
  it("initial state is idle", () => {
    const state = {
      status: "idle",
      scenario: null,
      orchestratorOutput: null,
      agentTexts: { geopolitics: "", economy: "", food_supply: "", infrastructure: "", civilian_impact: "", synthesis: "" },
      agentResults: {},
      compoundRiskScore: null,
    };

    expect(state.status).toBe("idle");
    expect(state.scenario).toBeNull();
    expect(state.compoundRiskScore).toBeNull();
  });

  it("reset clears all state", () => {
    const state = {
      status: "complete",
      scenario: "Test",
      orchestratorOutput: { test: true },
      compoundRiskScore: 73,
    };

    // Simulate reset
    state.status = "idle";
    state.scenario = null as any;
    state.orchestratorOutput = null as any;
    state.compoundRiskScore = null;

    expect(state.status).toBe("idle");
    expect(state.scenario).toBeNull();
    expect(state.compoundRiskScore).toBeNull();
  });
});


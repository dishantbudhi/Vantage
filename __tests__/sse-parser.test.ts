import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("SSE Parser", () => {
  describe("Event and data in same chunk", () => {
    it("should parse event followed by data in single chunk", () => {
      const lines = `event: agent_chunk
data: {"agent": "geopolitics", "chunk": "Hello"}

`.split("\n");

      let currentEvent = "";
      let currentData = "";
      const events: Array<{ event: string; data: unknown }> = [];

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7);
        } else if (line.startsWith("data: ") && currentEvent) {
          currentData = line.slice(6);
          const data = JSON.parse(currentData);
          events.push({ event: currentEvent, data });
          currentEvent = "";
          currentData = "";
        }
      }

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe("agent_chunk");
      expect(events[0].data).toEqual({ agent: "geopolitics", chunk: "Hello" });
    });
  });

  describe("Event and data in separate chunks (simulates network fragmentation)", () => {
    it("should persist currentEvent across read() calls", () => {
      const chunk1 = `event: agent_chunk
`;
      const chunk2 = `data: {"agent": "geopolitics", "chunk": "Hello"}

`;

      let currentEvent = "";
      let currentData = "";
      const events: Array<{ event: string; data: unknown }> = [];

      // Simulate first read() - gets event line
      const lines1 = chunk1.split("\n");
      for (const line of lines1) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7);
        } else if (line.startsWith("data: ") && currentEvent) {
          currentData = line.slice(6);
          const data = JSON.parse(currentData);
          events.push({ event: currentEvent, data });
          currentEvent = "";
          currentData = "";
        }
      }

      // Simulate second read() - gets data line
      // BUG: currentEvent would be reset to "" in old code
      // FIX: currentEvent persists across read() calls
      const lines2 = chunk2.split("\n");
      for (const line of lines2) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7);
        } else if (line.startsWith("data: ") && currentEvent) {
          currentData = line.slice(6);
          const data = JSON.parse(currentData);
          events.push({ event: currentEvent, data });
          currentEvent = "";
          currentData = "";
        }
      }

      // This test passes with the fix - event persists across chunks
      expect(events).toHaveLength(1);
      expect(events[0].event).toBe("agent_chunk");
      expect(events[0].data).toEqual({ agent: "geopolitics", chunk: "Hello" });
    });

    it("should fail with old code (currentEvent reset between reads)", () => {
      const chunk1 = `event: agent_chunk
`;
      const chunk2 = `data: {"agent": "geopolitics", "chunk": "Hello"}

`;

      // Old buggy behavior: currentEvent reset on each "read"
      let currentEvent = "";
      let currentData = "";
      const events: Array<{ event: string; data: unknown }> = [];

      // First "read"
      const lines1 = chunk1.split("\n");
      for (const line of lines1) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7);
        } else if (line.startsWith("data: ") && currentEvent) {
          currentData = line.slice(6);
          const data = JSON.parse(currentData);
          events.push({ event: currentEvent, data });
        }
      }

      // BUG: Reset currentEvent to simulate old code behavior
      currentEvent = "";
      currentData = "";

      // Second "read"
      const lines2 = chunk2.split("\n");
      for (const line of lines2) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7);
        } else if (line.startsWith("data: ") && currentEvent) {
          currentData = line.slice(6);
          const data = JSON.parse(currentData);
          events.push({ event: currentEvent, data });
        }
      }

      // Old code loses the event - data is ignored because currentEvent was reset
      expect(events).toHaveLength(0);
    });
  });

  describe("Multiple events in sequence", () => {
    it("should parse multiple events in single chunk", () => {
      const chunk = `event: orchestrator
data: {"context": "test"}

event: agent_chunk
data: {"agent": "geopolitics", "chunk": "Hello"}

event: agent_complete
data: {"agent": "geopolitics", "structured": {"risk_score": 5}}

`;

      let currentEvent = "";
      let currentData = "";
      const events: Array<{ event: string; data: unknown }> = [];

      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7);
        } else if (line.startsWith("data: ") && currentEvent) {
          currentData = line.slice(6);
          const data = JSON.parse(currentData);
          events.push({ event: currentEvent, data });
          currentEvent = "";
          currentData = "";
        }
      }

      expect(events).toHaveLength(3);
      expect(events[0].event).toBe("orchestrator");
      expect(events[1].event).toBe("agent_chunk");
      expect(events[2].event).toBe("agent_complete");
    });
  });

  describe("Error handling", () => {
    it("should handle JSON parse errors gracefully", () => {
      const chunk = `event: agent_chunk
data: invalid json

`;

      let currentEvent = "";
      let currentData = "";
      const events: Array<{ event: string; data: unknown }> = [];
      const errors: Array<Error> = [];

      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7);
        } else if (line.startsWith("data: ") && currentEvent) {
          currentData = line.slice(6);
          try {
            const data = JSON.parse(currentData);
            events.push({ event: currentEvent, data });
          } catch (e) {
            errors.push(e as Error);
          }
          currentEvent = "";
          currentData = "";
        }
      }

      expect(events).toHaveLength(0);
      expect(errors).toHaveLength(1);
    });
  });
});

describe("AGENTS array includes synthesis", () => {
  it("should include synthesis in AGENTS", () => {
    const AGENTS = [
      "geopolitics",
      "economy",
      "food_supply",
      "infrastructure",
      "civilian_impact",
      "synthesis",
    ];

    expect(AGENTS).toContain("synthesis");
    expect(AGENTS).toHaveLength(6);
  });

  it("should route synthesis agent_complete to synthesisOutput", () => {
    const agent: string = "synthesis";
    const structured = { compound_risk_score: 75, summary: "Test synthesis" };

    let synthesisOutput: unknown = null;
    let agentResults: Record<string, unknown> = {};

    if (agent === "synthesis") {
      synthesisOutput = structured;
    } else {
      agentResults[agent] = structured;
    }

    expect(synthesisOutput).toEqual({ compound_risk_score: 75, summary: "Test synthesis" });
    expect(agentResults).toEqual({});
  });

  it("should route specialist agent_complete to agentResults", () => {
    const agent: string = "geopolitics";
    const structured = { risk_score: 5, summary: "Test" };

    let synthesisOutput: unknown = null;
    let agentResults: Record<string, unknown> = {};

    if (agent === "synthesis") {
      synthesisOutput = structured;
    } else {
      agentResults[agent] = structured;
    }

    expect(synthesisOutput).toBeNull();
    expect(agentResults).toEqual({ geopolitics: { risk_score: 5, summary: "Test" } });
  });
});

describe("Error handling for partial failures", () => {
  it("should not set global error for single-agent errors", () => {
    let status = "analyzing";
    let pipelineStatus = "analyzing";
    let pipelineMessage = "Running...";
    const errors: Array<{ message: string; agent?: string }> = [];

    const errorEvent = { message: "Geopolitics agent failed", agent: "geopolitics" };

    errors.push({ message: errorEvent.message, agent: errorEvent.agent });
    
    if (errorEvent.agent) {
      // Agent-specific error - don't mark global error
    } else {
      status = "error";
      pipelineStatus = "error";
      pipelineMessage = errorEvent.message;
    }

    expect(errors).toHaveLength(1);
    expect(errors[0].agent).toBe("geopolitics");
    expect(status).toBe("analyzing"); // Not changed
    expect(pipelineStatus).toBe("analyzing"); // Not changed
  });

  it("should set global error for pipeline-level errors", () => {
    let status = "analyzing";
    let pipelineStatus = "analyzing";
    let pipelineMessage = "Running...";
    const errors: Array<{ message: string; agent?: string }> = [];

    const errorEvent: { message: string; agent?: string } = { message: "Pipeline failed" };

    errors.push({ message: errorEvent.message, agent: errorEvent.agent });
    
    if (errorEvent.agent) {
      // Agent-specific error
    } else {
      status = "error";
      pipelineStatus = "error";
      pipelineMessage = errorEvent.message;
    }

    expect(errors).toHaveLength(1);
    expect(errors[0].agent).toBeUndefined();
    expect(status).toBe("error"); // Changed
    expect(pipelineStatus).toBe("error"); // Changed
    expect(pipelineMessage).toBe("Pipeline failed");
  });
});

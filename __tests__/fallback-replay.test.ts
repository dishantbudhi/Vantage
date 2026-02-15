import { describe, it, expect, vi } from "vitest";
import { matchFallbackScenario, replayFallback, type FallbackData } from "@/lib/fallback-replay";

// Mock the constants module
vi.mock("@/components/sidebar/constants", () => ({
  GOLDEN_PATH_SCENARIOS: {
    suez: "Suez Canal blocked + South Asian heat wave",
    texas: "Texas grid failure during winter storm",
    greenland: "Accelerated Greenland ice sheet collapse",
  },
}));

describe("matchFallbackScenario", () => {
  it("matches exact Suez scenario text", () => {
    expect(matchFallbackScenario("Suez Canal blocked + South Asian heat wave")).toBe("fallback-suez");
  });

  it("matches exact Texas scenario text", () => {
    expect(matchFallbackScenario("Texas grid failure during winter storm")).toBe("fallback-texas");
  });

  it("matches exact Greenland scenario text", () => {
    expect(matchFallbackScenario("Accelerated Greenland ice sheet collapse")).toBe("fallback-greenland");
  });

  it("matches case-insensitively", () => {
    expect(matchFallbackScenario("suez canal blocked + south asian heat wave")).toBe("fallback-suez");
    expect(matchFallbackScenario("TEXAS GRID FAILURE DURING WINTER STORM")).toBe("fallback-texas");
  });

  it("matches with leading/trailing whitespace", () => {
    expect(matchFallbackScenario("  Suez Canal blocked + South Asian heat wave  ")).toBe("fallback-suez");
  });

  it("returns null for non-matching scenarios", () => {
    expect(matchFallbackScenario("Random other scenario")).toBeNull();
    expect(matchFallbackScenario("")).toBeNull();
    expect(matchFallbackScenario("Suez Canal")).toBeNull();
  });
});

describe("replayFallback", () => {
  const mockFallbackData: FallbackData = {
    scenario: "Test scenario",
    orchestrator: {
      scenario_summary: "Test summary",
      primary_regions: ["USA"],
      secondary_regions: ["CAN"],
      coordinates: { lat: 30, lon: -97 },
      zoom_level: 6,
      time_horizon: "immediate",
      severity: 7,
      event_categories: ["infrastructure"],
      context_queries: {
        geopolitics: "test",
        economy: "test",
        food: "test",
        infrastructure: "test",
        civilian: "test",
      },
    },
    agentResults: {
      geopolitics: {
        affected_countries: [{ iso3: "USA", impact_score: 6, stance: "allied", key_concerns: ["test"], alliance_impacts: ["test"] }],
        conflict_zones: [],
        narrative: "Geopolitics analysis text here with multiple words for chunking.",
      },
      economy: {
        affected_countries: [{ iso3: "USA", gdp_impact_pct: -0.3, trade_disruption: 7, key_sectors: ["energy"], unemployment_risk: "medium" }],
        trade_routes_disrupted: [],
        narrative: "Economy analysis text.",
      },
      food_supply: {
        affected_countries: [{ iso3: "USA", food_security_impact: 5, population_at_risk: 10000000, primary_threats: ["cold chain"], is_food_desert: false }],
        supply_chain_disruptions: [],
        narrative: "Food supply analysis.",
      },
      infrastructure: {
        affected_countries: [{ iso3: "USA", infrastructure_risk: 9, systems_at_risk: ["power", "water"], cascade_risk: 9 }],
        outage_zones: [],
        narrative: "Infrastructure analysis.",
      },
      civilian_impact: {
        affected_countries: [{ iso3: "USA", humanitarian_score: 8, displaced_estimate: 1500000, health_risk: 8, vulnerable_groups: ["elderly"] }],
        displacement_flows: [],
        narrative: "Civilian impact analysis.",
      },
    },
    synthesis: {
      cascading_risk_chain: "A → B → C",
      most_affected_population: "Test population",
      second_order_effect: "Test effect",
      compound_risk_score: 73,
      narrative: "Synthesis narrative text here.",
    },
  };

  it("emits events in the correct order", async () => {
    const events: Array<{ event: string; data: unknown }> = [];
    const send = (event: string, data: unknown) => {
      events.push({ event, data });
    };

    await replayFallback(mockFallbackData, send, 0);

    // Check event order: status(orchestrating), orchestrator, status(analyzing),
    // [agent_chunk*, agent_complete] x5, status(synthesizing),
    // synthesis_chunk*, agent_complete(synthesis), complete
    const eventNames = events.map((e) => e.event);

    // First events
    expect(eventNames[0]).toBe("status");
    expect(eventNames[1]).toBe("orchestrator");
    expect(eventNames[2]).toBe("status");

    // Last event should be complete
    expect(eventNames[eventNames.length - 1]).toBe("complete");

    // Should contain agent_complete for all 5 agents + synthesis
    const agentCompletes = events.filter((e) => e.event === "agent_complete");
    expect(agentCompletes.length).toBe(6); // 5 agents + synthesis

    // Check complete event has compound_risk_score
    const completeEvent = events[events.length - 1];
    expect((completeEvent.data as { compound_risk_score: number }).compound_risk_score).toBe(73);
  });

  it("emits agent_chunk events for narratives", async () => {
    const events: Array<{ event: string; data: unknown }> = [];
    const send = (event: string, data: unknown) => {
      events.push({ event, data });
    };

    await replayFallback(mockFallbackData, send, 0);

    const agentChunks = events.filter((e) => e.event === "agent_chunk");
    expect(agentChunks.length).toBeGreaterThan(0);

    // Each chunk should have agent and chunk fields
    for (const chunk of agentChunks) {
      const data = chunk.data as { agent: string; chunk: string };
      expect(typeof data.agent).toBe("string");
      expect(typeof data.chunk).toBe("string");
    }
  });

  it("emits synthesis_chunk events", async () => {
    const events: Array<{ event: string; data: unknown }> = [];
    const send = (event: string, data: unknown) => {
      events.push({ event, data });
    };

    await replayFallback(mockFallbackData, send, 0);

    const synthesisChunks = events.filter((e) => e.event === "synthesis_chunk");
    expect(synthesisChunks.length).toBeGreaterThan(0);
  });

  it("sends orchestrator data correctly", async () => {
    const events: Array<{ event: string; data: unknown }> = [];
    const send = (event: string, data: unknown) => {
      events.push({ event, data });
    };

    await replayFallback(mockFallbackData, send, 0);

    const orchestratorEvent = events.find((e) => e.event === "orchestrator");
    expect(orchestratorEvent).toBeDefined();
    expect(orchestratorEvent!.data).toEqual(mockFallbackData.orchestrator);
  });
});


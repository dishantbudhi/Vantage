import { describe, it, expect } from "vitest";
import { buildImpactMap, createChoroplethLayer } from "@/components/map/layers/ChoroplethLayer";
import { createConflictLayer } from "@/components/map/layers/ConflictLayer";
import { createFoodDesertLayer } from "@/components/map/layers/FoodDesertLayer";
import { createInfrastructureLayer } from "@/components/map/layers/InfrastructureLayer";
import { createTradeArcLayer } from "@/components/map/layers/TradeArcLayer";
import { createDisplacementArcLayer } from "@/components/map/layers/DisplacementArcLayer";
import { createHeatmapLayer } from "@/components/map/layers/HeatmapLayer";
import type { AgentResults } from "@/lib/types";

const mockGeoJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { ISO_A3: "EGY", NAME: "Egypt" }, geometry: { type: "Polygon", coordinates: [[[30, 25], [35, 25], [35, 30], [30, 30], [30, 25]]] } },
    { type: "Feature", properties: { ISO_A3: "IND", NAME: "India" }, geometry: { type: "Polygon", coordinates: [[[70, 10], [90, 10], [90, 30], [70, 30], [70, 10]]] } },
  ],
};

const mockAgentResults: AgentResults = {
  geopolitics: {
    affected_countries: [
      { iso3: "EGY", impact_score: 8, stance: "allied", key_concerns: ["test"], alliance_impacts: ["test"] },
      { iso3: "IND", impact_score: 7, stance: "destabilized", key_concerns: ["test"], alliance_impacts: ["test"] },
    ],
    conflict_zones: [
      { coordinates: [32.37, 30.01], radius_km: 50, intensity: 8, type: "diplomatic_crisis" },
    ],
    narrative: "test",
  },
  economy: {
    affected_countries: [
      { iso3: "EGY", gdp_impact_pct: -2.1, trade_disruption: 9, key_sectors: ["energy"], unemployment_risk: "high" },
    ],
    trade_routes_disrupted: [
      { from: [39.1, 21.5], to: [4.48, 51.92], commodity: "Crude oil", severity: 9 },
    ],
    narrative: "test",
  },
  food_supply: {
    affected_countries: [
      { iso3: "EGY", food_security_impact: 8, population_at_risk: 40000000, primary_threats: ["wheat"], is_food_desert: false },
      { iso3: "YEM", food_security_impact: 9, population_at_risk: 21000000, primary_threats: ["supply"], is_food_desert: true },
    ],
    supply_chain_disruptions: [
      { from: [30.73, 46.48], to: [43.14, 11.59], product: "Wheat", severity: 9 },
    ],
    narrative: "test",
  },
  infrastructure: {
    affected_countries: [
      { iso3: "IND", infrastructure_risk: 8, systems_at_risk: ["power", "water"], cascade_risk: 9 },
    ],
    outage_zones: [
      { coordinates: [77.21, 28.61], radius_km: 100, type: "power", severity: 9, population_affected: 30000000 },
    ],
    narrative: "test",
  },
  civilian_impact: {
    affected_countries: [
      { iso3: "IND", humanitarian_score: 9, displaced_estimate: 2000000, health_risk: 9, vulnerable_groups: ["elderly"] },
    ],
    displacement_flows: [
      { from: [77.21, 28.61], to: [77.41, 28.95], estimated_people: 500000, urgency: "high" },
    ],
    narrative: "test",
  },
};

describe("buildImpactMap", () => {
  it("builds correct max impact scores from multiple agents", () => {
    const map = buildImpactMap(mockAgentResults);
    // EGY: max(geopolitics=8, economy=9, food=8) = 9
    expect(map.get("EGY")).toBe(9);
    // IND: max(geopolitics=7, infrastructure=8, civilian=9) = 9
    expect(map.get("IND")).toBe(9);
    // YEM: food_supply=9
    expect(map.get("YEM")).toBe(9);
  });

  it("returns empty map for empty agent results", () => {
    const map = buildImpactMap({});
    expect(map.size).toBe(0);
  });

  it("handles single agent result", () => {
    const map = buildImpactMap({
      geopolitics: {
        affected_countries: [{ iso3: "USA", impact_score: 5, stance: "allied", key_concerns: [], alliance_impacts: [] }],
        conflict_zones: [],
        narrative: "",
      },
    });
    expect(map.get("USA")).toBe(5);
  });
});

describe("createChoroplethLayer", () => {
  it("returns a layer with correct id", () => {
    const layer = createChoroplethLayer(mockGeoJSON, mockAgentResults, null);
    expect(layer.id).toBe("choropleth-layer");
  });

  it("returns a layer with empty agent results", () => {
    const layer = createChoroplethLayer(mockGeoJSON, {}, null);
    expect(layer.id).toBe("choropleth-layer");
  });
});

describe("createConflictLayer", () => {
  it("returns a layer with correct id", () => {
    const layer = createConflictLayer(mockAgentResults.geopolitics as any, 1.0);
    expect(layer.id).toBe("conflict-layer");
  });

  it("handles empty conflict zones", () => {
    const layer = createConflictLayer(
      { affected_countries: [], conflict_zones: [], narrative: "" },
      1.0
    );
    expect(layer.id).toBe("conflict-layer");
  });
});

describe("createFoodDesertLayer", () => {
  it("returns a layer with correct id", () => {
    const layer = createFoodDesertLayer(mockGeoJSON, mockAgentResults.food_supply as any);
    expect(layer.id).toBe("food-desert-layer");
  });

  it("handles no food desert countries", () => {
    const layer = createFoodDesertLayer(mockGeoJSON, {
      affected_countries: [
        { iso3: "EGY", food_security_impact: 5, population_at_risk: 1000, primary_threats: ["test"], is_food_desert: false },
      ],
      supply_chain_disruptions: [],
      narrative: "",
    });
    expect(layer.id).toBe("food-desert-layer");
  });
});

describe("createInfrastructureLayer", () => {
  it("returns a layer with correct id", () => {
    const layer = createInfrastructureLayer(mockAgentResults.infrastructure as any);
    expect(layer.id).toBe("infrastructure-layer");
  });

  it("handles empty outage zones", () => {
    const layer = createInfrastructureLayer({
      affected_countries: [],
      outage_zones: [],
      narrative: "",
    });
    expect(layer.id).toBe("infrastructure-layer");
  });
});

describe("createTradeArcLayer", () => {
  it("returns a layer with correct id", () => {
    const layer = createTradeArcLayer(
      mockAgentResults.economy as any,
      mockAgentResults.food_supply as any
    );
    expect(layer.id).toBe("trade-arc-layer");
  });

  it("handles undefined inputs", () => {
    const layer = createTradeArcLayer(undefined, undefined);
    expect(layer.id).toBe("trade-arc-layer");
  });

  it("handles economy only", () => {
    const layer = createTradeArcLayer(mockAgentResults.economy as any, undefined);
    expect(layer.id).toBe("trade-arc-layer");
  });
});

describe("createDisplacementArcLayer", () => {
  it("returns a layer with correct id", () => {
    const layer = createDisplacementArcLayer(mockAgentResults.civilian_impact as any);
    expect(layer.id).toBe("displacement-arc-layer");
  });

  it("handles empty displacement flows", () => {
    const layer = createDisplacementArcLayer({
      affected_countries: [],
      displacement_flows: [],
      narrative: "",
    });
    expect(layer.id).toBe("displacement-arc-layer");
  });
});

describe("createHeatmapLayer", () => {
  it("returns a layer with correct id", () => {
    const layer = createHeatmapLayer(mockAgentResults);
    expect(layer.id).toBe("heatmap-layer");
  });

  it("handles empty agent results", () => {
    const layer = createHeatmapLayer({});
    expect(layer.id).toBe("heatmap-layer");
  });
});


import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(__dirname, "../lib/data");

const FALLBACK_FILES = [
  { name: "fallback-suez.json", scenario: "Suez Canal blocked + South Asian heat wave" },
  { name: "fallback-texas.json", scenario: "Texas grid failure during winter storm" },
  { name: "fallback-greenland.json", scenario: "Accelerated Greenland ice sheet collapse" },
];

const AGENT_NAMES = ["geopolitics", "economy", "food_supply", "infrastructure", "civilian_impact"];

describe("Golden-Path Fallback Data", () => {
  for (const file of FALLBACK_FILES) {
    describe(file.name, () => {
      const filePath = path.join(DATA_DIR, file.name);
      let data: any;

      it("exists and is valid JSON", () => {
        expect(fs.existsSync(filePath)).toBe(true);
        const raw = fs.readFileSync(filePath, "utf-8");
        data = JSON.parse(raw);
        expect(data).toBeDefined();
      });

      it("has correct scenario string", () => {
        data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        expect(data.scenario).toBe(file.scenario);
      });

      it("has orchestrator output with required fields", () => {
        data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const orch = data.orchestrator;
        expect(orch).toBeDefined();
        expect(typeof orch.scenario_summary).toBe("string");
        expect(Array.isArray(orch.primary_regions)).toBe(true);
        expect(orch.primary_regions.length).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(orch.secondary_regions)).toBe(true);
        expect(orch.coordinates).toBeDefined();
        expect(typeof orch.coordinates.lat).toBe("number");
        expect(typeof orch.coordinates.lon).toBe("number");
        expect(typeof orch.zoom_level).toBe("number");
        expect(orch.zoom_level).toBeGreaterThanOrEqual(1);
        expect(orch.zoom_level).toBeLessThanOrEqual(18);
        expect(["immediate", "weeks", "months", "years"]).toContain(orch.time_horizon);
        expect(orch.severity).toBeGreaterThanOrEqual(1);
        expect(orch.severity).toBeLessThanOrEqual(10);
        expect(Array.isArray(orch.event_categories)).toBe(true);
        expect(orch.context_queries).toBeDefined();
      });

      it("has all 5 agent results", () => {
        data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        for (const agent of AGENT_NAMES) {
          expect(data.agentResults[agent]).toBeDefined();
          expect(data.agentResults[agent]).not.toBeNull();
        }
      });

      it("geopolitics has valid structure", () => {
        data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const geo = data.agentResults.geopolitics;
        expect(Array.isArray(geo.affected_countries)).toBe(true);
        expect(geo.affected_countries.length).toBeGreaterThan(0);
        expect(Array.isArray(geo.conflict_zones)).toBe(true);
        expect(typeof geo.narrative).toBe("string");
        expect(geo.narrative.length).toBeGreaterThan(100);

        for (const c of geo.affected_countries) {
          expect(c.iso3).toHaveLength(3);
          expect(c.impact_score).toBeGreaterThanOrEqual(1);
          expect(c.impact_score).toBeLessThanOrEqual(10);
          expect(["allied", "opposed", "neutral", "destabilized"]).toContain(c.stance);
        }

        for (const z of geo.conflict_zones) {
          expect(z.coordinates).toHaveLength(2);
          expect(z.radius_km).toBeGreaterThan(0);
          expect(["active_conflict", "tension", "diplomatic_crisis"]).toContain(z.type);
        }
      });

      it("economy has valid structure", () => {
        data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const econ = data.agentResults.economy;
        expect(Array.isArray(econ.affected_countries)).toBe(true);
        expect(Array.isArray(econ.trade_routes_disrupted)).toBe(true);
        expect(typeof econ.narrative).toBe("string");

        for (const c of econ.affected_countries) {
          expect(c.iso3).toHaveLength(3);
          expect(typeof c.gdp_impact_pct).toBe("number");
          expect(c.trade_disruption).toBeGreaterThanOrEqual(1);
          expect(c.trade_disruption).toBeLessThanOrEqual(10);
        }

        for (const r of econ.trade_routes_disrupted) {
          expect(r.from).toHaveLength(2);
          expect(r.to).toHaveLength(2);
          expect(typeof r.commodity).toBe("string");
        }
      });

      it("food_supply has valid structure", () => {
        data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const food = data.agentResults.food_supply;
        expect(Array.isArray(food.affected_countries)).toBe(true);
        expect(Array.isArray(food.supply_chain_disruptions)).toBe(true);
        expect(typeof food.narrative).toBe("string");

        for (const c of food.affected_countries) {
          expect(c.iso3).toHaveLength(3);
          expect(typeof c.is_food_desert).toBe("boolean");
          expect(c.food_security_impact).toBeGreaterThanOrEqual(1);
        }
      });

      it("infrastructure has valid structure", () => {
        data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const infra = data.agentResults.infrastructure;
        expect(Array.isArray(infra.affected_countries)).toBe(true);
        expect(Array.isArray(infra.outage_zones)).toBe(true);
        expect(typeof infra.narrative).toBe("string");

        for (const z of infra.outage_zones) {
          expect(z.coordinates).toHaveLength(2);
          expect(["power", "water", "telecom", "transport"]).toContain(z.type);
          expect(z.population_affected).toBeGreaterThan(0);
        }
      });

      it("civilian_impact has valid structure", () => {
        data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const civ = data.agentResults.civilian_impact;
        expect(Array.isArray(civ.affected_countries)).toBe(true);
        expect(Array.isArray(civ.displacement_flows)).toBe(true);
        expect(typeof civ.narrative).toBe("string");

        for (const f of civ.displacement_flows) {
          expect(f.from).toHaveLength(2);
          expect(f.to).toHaveLength(2);
          expect(f.estimated_people).toBeGreaterThan(0);
          expect(["low", "medium", "high", "critical"]).toContain(f.urgency);
        }
      });

      it("has synthesis with required fields", () => {
        data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const syn = data.synthesis;
        expect(syn).toBeDefined();
        expect(typeof syn.cascading_risk_chain).toBe("string");
        expect(syn.cascading_risk_chain).toContain("→");
        expect(typeof syn.most_affected_population).toBe("string");
        expect(typeof syn.second_order_effect).toBe("string");
        expect(typeof syn.compound_risk_score).toBe("number");
        expect(syn.compound_risk_score).toBeGreaterThanOrEqual(1);
        expect(syn.compound_risk_score).toBeLessThanOrEqual(100);
        expect(typeof syn.narrative).toBe("string");
        expect(syn.narrative.length).toBeGreaterThan(100);
      });
    });
  }
});


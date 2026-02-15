import { z } from "zod";

// ── Orchestrator (GPT-5.2 via OpenAI) ──────────────────────────────

export const OrchestratorSchema = z.object({
  scenario_summary: z.string().describe("1-2 sentence clean description"),
  primary_regions: z.array(z.string()).describe("ISO 3166-1 alpha-3 codes"),
  secondary_regions: z.array(z.string()).describe("Indirectly affected"),
  coordinates: z.object({ lat: z.number(), lon: z.number() }),
  zoom_level: z.number().min(1).max(18),
  time_horizon: z.enum(["immediate", "weeks", "months", "years"]),
  severity: z.number().min(1).max(10),
  event_categories: z.array(
    z.enum(["geopolitical", "climate", "infrastructure", "economic", "health"])
  ),
  context_queries: z.object({
    geopolitics: z.string(),
    economy: z.string(),
    food: z.string(),
    infrastructure: z.string(),
    civilian: z.string(),
  }),
});
export type OrchestratorOutput = z.infer<typeof OrchestratorSchema>;

// ── Geopolitics Agent (MiniMax-M2.5) ───────────────────────────────

export const GeopoliticsSchema = z.object({
  affected_countries: z.array(
    z.object({
      iso3: z.string(),
      impact_score: z.number().min(1).max(10),
      stance: z.enum(["allied", "opposed", "neutral", "destabilized"]),
      key_concerns: z.array(z.string()),
      alliance_impacts: z.array(z.string()),
    })
  ),
  conflict_zones: z.array(
    z.object({
      coordinates: z.tuple([z.number(), z.number()]),
      radius_km: z.number(),
      intensity: z.number().min(1).max(10),
      type: z.enum(["active_conflict", "tension", "diplomatic_crisis"]),
    })
  ),
  narrative: z.string(),
});
export type GeopoliticsOutput = z.infer<typeof GeopoliticsSchema>;

// ── Economy Agent (MiniMax-M2.5) ───────────────────────────────────

export const EconomySchema = z.object({
  affected_countries: z.array(
    z.object({
      iso3: z.string(),
      gdp_impact_pct: z.number(),
      trade_disruption: z.number().min(1).max(10),
      key_sectors: z.array(z.string()),
      unemployment_risk: z.enum(["low", "medium", "high", "severe"]),
    })
  ),
  trade_routes_disrupted: z.array(
    z.object({
      from: z.tuple([z.number(), z.number()]),
      to: z.tuple([z.number(), z.number()]),
      commodity: z.string(),
      severity: z.number().min(1).max(10),
    })
  ),
  narrative: z.string(),
});
export type EconomyOutput = z.infer<typeof EconomySchema>;

// ── Food Supply Agent (MiniMax-M2.5) ───────────────────────────────

export const FoodSupplySchema = z.object({
  affected_countries: z.array(
    z.object({
      iso3: z.string(),
      food_security_impact: z.number().min(1).max(10),
      population_at_risk: z.number(),
      primary_threats: z.array(z.string()),
      is_food_desert: z.boolean(),
    })
  ),
  supply_chain_disruptions: z.array(
    z.object({
      from: z.tuple([z.number(), z.number()]),
      to: z.tuple([z.number(), z.number()]),
      product: z.string(),
      severity: z.number().min(1).max(10),
    })
  ),
  narrative: z.string(),
});
export type FoodSupplyOutput = z.infer<typeof FoodSupplySchema>;

// ── Infrastructure Agent (MiniMax-M2.5) ────────────────────────────

export const InfrastructureSchema = z.object({
  affected_countries: z.array(
    z.object({
      iso3: z.string(),
      infrastructure_risk: z.number().min(1).max(10),
      systems_at_risk: z.array(
        z.enum(["power", "water", "telecom", "transport", "digital"])
      ),
      cascade_risk: z.number().min(1).max(10),
    })
  ),
  outage_zones: z.array(
    z.object({
      coordinates: z.tuple([z.number(), z.number()]),
      radius_km: z.number(),
      type: z.enum(["power", "water", "telecom", "transport"]),
      severity: z.number().min(1).max(10),
      population_affected: z.number(),
    })
  ),
  narrative: z.string(),
});
export type InfrastructureOutput = z.infer<typeof InfrastructureSchema>;

// ── Civilian Impact Agent (MiniMax-M2.5) ───────────────────────────

export const CivilianImpactSchema = z.object({
  affected_countries: z.array(
    z.object({
      iso3: z.string(),
      humanitarian_score: z.number().min(1).max(10),
      displaced_estimate: z.number(),
      health_risk: z.number().min(1).max(10),
      vulnerable_groups: z.array(z.string()),
    })
  ),
  displacement_flows: z.array(
    z.object({
      from: z.tuple([z.number(), z.number()]),
      to: z.tuple([z.number(), z.number()]),
      estimated_people: z.number(),
      urgency: z.enum(["low", "medium", "high", "critical"]),
    })
  ),
  narrative: z.string(),
});
export type CivilianImpactOutput = z.infer<typeof CivilianImpactSchema>;

// ── Synthesis Agent (GPT-5.2 via OpenAI) ───────────────────────────

export const SynthesisSchema = z.object({
  cascading_risk_chain: z.string(),
  most_affected_population: z.string(),
  second_order_effect: z.string(),
  compound_risk_score: z.number().min(1).max(100),
  narrative: z.string(),
});
export type SynthesisOutput = z.infer<typeof SynthesisSchema>;

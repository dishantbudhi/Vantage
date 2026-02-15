import type { AgentName } from "@/lib/types";

export const GOLDEN_PATH_SCENARIOS = {
  suez: "Suez Canal blocked + South Asian heat wave",
  texas: "Texas grid failure during winter storm",
  greenland: "Accelerated Greenland ice sheet collapse",
} as const;

export const AGENT_LABELS: Record<AgentName | "synthesis", string> = {
  geopolitics: "Geo",
  economy: "Econ",
  food_supply: "Food",
  infrastructure: "Infr",
  civilian_impact: "Civ",
  synthesis: "Synthesis",
};

export const AGENT_COLORS: Record<AgentName | "synthesis", string> = {
  geopolitics: "#ef4444",    // red
  economy: "#f59e0b",        // amber
  food_supply: "#22c55e",    // green
  infrastructure: "#3b82f6", // blue
  civilian_impact: "#a855f7", // purple
  synthesis: "#06b6d4",      // cyan
};

export const RISK_SCORE_THRESHOLDS = {
  low: 40,
  medium: 70,
} as const;

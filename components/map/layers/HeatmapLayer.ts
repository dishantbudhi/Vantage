import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import type { AgentResults } from "@/lib/types";
import type { GeopoliticsOutput, EconomyOutput, FoodSupplyOutput, InfrastructureOutput, CivilianImpactOutput } from "@/lib/agents/schemas";

const COLOR_RANGE = [
  [1, 152, 189],
  [49, 130, 206],
  [107, 174, 214],
  [158, 202, 225],
  [254, 224, 144],
  [253, 187, 132],
  [252, 141, 89],
  [227, 74, 51],
  [179, 0, 0],
];

export function createHeatmapLayer(agentResults: AgentResults) {
  const heatmapData: any[] = [];

  const geo = agentResults.geopolitics as GeopoliticsOutput | undefined;
  if (geo?.conflict_zones) {
    geo.conflict_zones.forEach((zone) => {
      heatmapData.push({
        position: zone.coordinates,
        weight: zone.intensity,
      });
    });
  }

  const infra = agentResults.infrastructure as InfrastructureOutput | undefined;
  if (infra?.outage_zones) {
    infra.outage_zones.forEach((zone) => {
      heatmapData.push({
        position: zone.coordinates,
        weight: zone.severity,
      });
    });
  }

  const econ = agentResults.economy as EconomyOutput | undefined;
  if (econ?.trade_routes_disrupted) {
    econ.trade_routes_disrupted.forEach((route) => {
      const midLon = (route.from[0] + route.to[0]) / 2;
      const midLat = (route.from[1] + route.to[1]) / 2;
      heatmapData.push({
        position: [midLon, midLat],
        weight: route.severity * 0.5,
      });
    });
  }

  const food = agentResults.food_supply as FoodSupplyOutput | undefined;
  if (food?.supply_chain_disruptions) {
    food.supply_chain_disruptions.forEach((chain) => {
      const midLon = (chain.from[0] + chain.to[0]) / 2;
      const midLat = (chain.from[1] + chain.to[1]) / 2;
      heatmapData.push({
        position: [midLon, midLat],
        weight: chain.severity * 0.5,
      });
    });
  }

  const civ = agentResults.civilian_impact as CivilianImpactOutput | undefined;
  if (civ?.displacement_flows) {
    civ.displacement_flows.forEach((flow) => {
      heatmapData.push({
        position: flow.from,
        weight: Math.log10(flow.estimated_people + 1) * 2,
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerConfig: any = {
    id: "heatmap-layer",
    data: heatmapData,
    pickable: false,
    opacity: 0.6,
    getPosition: (d: any) => d.position,
    getWeight: (d: any) => d.weight,
    radiusPixels: 60,
    intensity: 1,
    threshold: 0.05,
    colorRange: COLOR_RANGE,
    aggregation: "SUM",
  };

  return new HeatmapLayer(layerConfig);
}

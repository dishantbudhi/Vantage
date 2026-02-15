import { ArcLayer } from "@deck.gl/layers";
import type { EconomyOutput, FoodSupplyOutput } from "@/lib/agents/schemas";

function interpolateColor(
  severity: number,
  startColor: number[],
  endColor: number[]
): number[] {
  const t = (severity - 1) / 9;
  return [
    Math.round(startColor[0] + (endColor[0] - startColor[0]) * t),
    Math.round(startColor[1] + (endColor[1] - startColor[1]) * t),
    Math.round(startColor[2] + (endColor[2] - startColor[2]) * t),
    200,
  ];
}

export function createTradeArcLayer(
  economyOutput: EconomyOutput | undefined,
  foodOutput: FoodSupplyOutput | undefined
) {
  const arcData: any[] = [];

  if (economyOutput?.trade_routes_disrupted) {
    economyOutput.trade_routes_disrupted.forEach((route) => {
      arcData.push({
        source: route.from,
        target: route.to,
        severity: route.severity,
        commodity: route.commodity,
        type: "trade",
      });
    });
  }

  if (foodOutput?.supply_chain_disruptions) {
    foodOutput.supply_chain_disruptions.forEach((chain) => {
      arcData.push({
        source: chain.from,
        target: chain.to,
        severity: chain.severity,
        commodity: chain.product,
        type: "food",
      });
    });
  }

  if (arcData.length === 0) {
    return new ArcLayer({
      id: "trade-arc-layer",
      data: [],
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerConfig: any = {
    id: "trade-arc-layer",
    data: arcData,
    pickable: true,
    getWidth: 2,
    getSourcePosition: (d: any) => d.source,
    getTargetPosition: (d: any) => d.target,
    getSourceColor: (d: any) => interpolateColor(d.severity, [0, 200, 0], [255, 0, 0]),
    getTargetColor: (d: any) => interpolateColor(d.severity, [200, 100, 0], [139, 0, 0]),
    getHeight: (d: any) => d.severity * 0.15,
    greatCircle: true,
    widthUnits: "pixels",
    widthScale: 1,
    transitions: {
      getSourceColor: {
        duration: 1000,
      },
      getTargetColor: {
        duration: 1000,
      },
    },
  };

  return new ArcLayer(layerConfig);
}

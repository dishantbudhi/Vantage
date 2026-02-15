import { ScatterplotLayer } from "@deck.gl/layers";
import type { InfrastructureOutput } from "@/lib/agents/schemas";

const INFRA_COLORS: Record<string, number[]> = {
  power: [80, 80, 80, 200],
  water: [0, 120, 200, 200],
  telecom: [160, 32, 240, 200],
  transport: [200, 200, 0, 200],
};

export function createInfrastructureLayer(
  infraOutput: InfrastructureOutput
) {
  if (!infraOutput.outage_zones || infraOutput.outage_zones.length === 0) {
    return new ScatterplotLayer({
      id: "infrastructure-layer",
      data: [],
    });
  }

  const outageData = infraOutput.outage_zones.map((zone) => ({
    position: zone.coordinates,
    radius_km: zone.radius_km,
    type: zone.type,
    severity: zone.severity,
    population_affected: zone.population_affected,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerConfig: any = {
    id: "infrastructure-layer",
    data: outageData,
    pickable: true,
    opacity: 0.8,
    stroked: true,
    filled: true,
    radiusMinPixels: 8,
    radiusMaxPixels: 60,
    getPosition: (d: any) => d.position,
    getRadius: (d: any) => Math.sqrt(d.population_affected) * 50,
    getFillColor: (d: any) => {
      return INFRA_COLORS[d.type] || [128, 128, 128, 200];
    },
    getLineColor: (d: any) => {
      const baseColor = INFRA_COLORS[d.type] || [128, 128, 128, 200];
      return [baseColor[0], baseColor[1], baseColor[2], 255];
    },
    getLineWidth: 2,
    radiusUnits: "meters",
    transitions: {
      getRadius: {
        duration: 800,
      },
      getFillColor: {
        duration: 500,
      },
    },
  };

  return new ScatterplotLayer(layerConfig);
}

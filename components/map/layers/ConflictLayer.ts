import { ScatterplotLayer } from "@deck.gl/layers";
import type { GeopoliticsOutput } from "@/lib/agents/schemas";

export function createConflictLayer(
  geopoliticsOutput: GeopoliticsOutput,
  pulsingRadius: number = 1
) {
  if (!geopoliticsOutput.conflict_zones || geopoliticsOutput.conflict_zones.length === 0) {
    return new ScatterplotLayer({
      id: "conflict-layer",
      data: [],
    });
  }

  const conflictData = geopoliticsOutput.conflict_zones.map((zone) => ({
    position: zone.coordinates,
    radius_km: zone.radius_km,
    intensity: zone.intensity,
    type: zone.type,
  }));

  return new ScatterplotLayer({
    id: "conflict-layer",
    data: conflictData,
    pickable: true,
    opacity: 0.7,
    stroked: true,
    filled: true,
    radiusScale: pulsingRadius,
    radiusMinPixels: 5,
    radiusMaxPixels: 50,
    getPosition: (d: any) => d.position,
    getRadius: (d: any) => d.radius_km * 1000,
    getFillColor: (d: any) => {
      const intensity = d.intensity;
      const alpha = 100 + intensity * 15;
      return [255, 50, 50, alpha];
    },
    getLineColor: [255, 0, 0, 200],
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
  });
}

import { ArcLayer } from "@deck.gl/layers";
import type { CivilianImpactOutput } from "@/lib/agents/schemas";

export function createDisplacementArcLayer(
  civilianOutput: CivilianImpactOutput
) {
  if (!civilianOutput.displacement_flows || civilianOutput.displacement_flows.length === 0) {
    return new ArcLayer({
      id: "displacement-arc-layer",
      data: [],
    });
  }

  const displacementData = civilianOutput.displacement_flows.map((flow) => ({
    source: flow.from,
    target: flow.to,
    estimated_people: flow.estimated_people,
    urgency: flow.urgency,
  }));

  return new ArcLayer({
    id: "displacement-arc-layer",
    data: displacementData,
    pickable: true,
    getWidth: (d: any) => Math.log10(d.estimated_people + 1),
    getSourcePosition: (d: any) => d.source,
    getTargetPosition: (d: any) => d.target,
    getSourceColor: [100, 150, 255, 200],
    getTargetColor: [50, 100, 255, 200],
    getHeight: 0.3,
    greatCircle: true,
    widthUnits: "pixels",
    widthScale: 1,
    transitions: {
      getWidth: {
        duration: 800,
      },
    },
  });
}

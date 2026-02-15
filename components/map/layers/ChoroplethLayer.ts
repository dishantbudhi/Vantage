import { GeoJsonLayer } from "@deck.gl/layers";
import { AmbientLight, DirectionalLight, LightingEffect } from "@deck.gl/core";
import type { AgentResults } from "@/lib/types";
import type { GeopoliticsOutput, EconomyOutput, FoodSupplyOutput, InfrastructureOutput, CivilianImpactOutput } from "@/lib/agents/schemas";

const COLOR_SCALE: Record<number, number[]> = {
  1: [34, 139, 34],    // green
  2: [34, 139, 34],    // green
  3: [234, 179, 8],    // yellow
  4: [234, 179, 8],    // yellow
  5: [249, 115, 22],   // orange
  6: [249, 115, 22],   // orange
  7: [239, 68, 68],    // red
  8: [239, 68, 68],    // red
  9: [127, 29, 29],    // dark red
  10: [127, 29, 29],   // dark red
};

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0,
});

const directionalLight = new DirectionalLight({
  color: [255, 255, 255],
  intensity: 1.0,
  direction: [-1, -2, -3],
  _shadow: true,
});

const lightingEffect = new LightingEffect({ ambientLight, directionalLight });

function getImpactColor(impact: number): number[] {
  const color = COLOR_SCALE[impact] || [160, 160, 160];
  return [...color, 180];
}

/**
 * Build an O(1) lookup map of ISO3 → max impact score across all agents.
 * Replaces repeated .find() calls per country per agent.
 */
export function buildImpactMap(agentResults: AgentResults): Map<string, number> {
  const impactMap = new Map<string, number>();

  const updateMax = (iso3: string, score: number) => {
    const current = impactMap.get(iso3) ?? 0;
    if (score > current) impactMap.set(iso3, score);
  };

  const geo = agentResults.geopolitics as GeopoliticsOutput | undefined;
  if (geo?.affected_countries) {
    for (const c of geo.affected_countries) {
      updateMax(c.iso3, c.impact_score);
    }
  }

  const econ = agentResults.economy as EconomyOutput | undefined;
  if (econ?.affected_countries) {
    for (const c of econ.affected_countries) {
      updateMax(c.iso3, c.trade_disruption);
    }
  }

  const food = agentResults.food_supply as FoodSupplyOutput | undefined;
  if (food?.affected_countries) {
    for (const c of food.affected_countries) {
      updateMax(c.iso3, c.food_security_impact);
    }
  }

  const infra = agentResults.infrastructure as InfrastructureOutput | undefined;
  if (infra?.affected_countries) {
    for (const c of infra.affected_countries) {
      updateMax(c.iso3, c.infrastructure_risk);
    }
  }

  const civ = agentResults.civilian_impact as CivilianImpactOutput | undefined;
  if (civ?.affected_countries) {
    for (const c of civ.affected_countries) {
      updateMax(c.iso3, c.humanitarian_score);
    }
  }

  return impactMap;
}

export function createChoroplethLayer(
  countriesGeoJSON: GeoJSON.FeatureCollection,
  agentResults: AgentResults,
  selectedCountry: string | null
) {
  // Build O(1) lookup once instead of per-country .find() calls
  const impactMap = buildImpactMap(agentResults);

  const dataWithImpact = countriesGeoJSON.features.map((feature) => {
    const iso3 = feature.properties?.ISO_A3;
    const maxImpact = iso3 ? (impactMap.get(iso3) ?? 0) : 0;
    return {
      ...feature,
      properties: {
        ...feature.properties,
        max_impact: maxImpact,
      },
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerConfig: any = {
    id: "choropleth-layer",
    data: {
      type: "FeatureCollection",
      features: dataWithImpact,
    },
    filled: true,
    stroked: true,
    extruded: true,
    pickable: true,
    opacity: 0.8,
    lightingEffect: lightingEffect,
    material: {
      ambient: 0.5,
      diffuse: 0.8,
      shininess: 32,
      specularColor: [255, 255, 255],
    },
    getFillColor: (d: any) => {
      const impact = d.properties?.max_impact || 0;
      return getImpactColor(impact);
    },
    getLineColor: (d: any) => {
      const iso3 = d.properties?.ISO_A3;
      if (iso3 === selectedCountry) {
        return [255, 255, 255, 255];
      }
      return [80, 80, 80, 100];
    },
    getLineWidth: (d: any) => {
      const iso3 = d.properties?.ISO_A3;
      return iso3 === selectedCountry ? 3 : 1;
    },
    getElevation: (d: any) => {
      const impact = d.properties?.max_impact || 0;
      return impact * 50000;
    },
    elevationScale: 1,
    transitions: {
      getFillColor: {
        duration: 1000,
        easing: (t: number) => t,
      },
      getElevation: {
        duration: 1000,
        easing: (t: number) => t,
      },
    },
    updateTriggers: {
      getFillColor: [agentResults, selectedCountry],
      getLineColor: [selectedCountry],
      getElevation: [agentResults],
    },
  };

  return new GeoJsonLayer(layerConfig);
}

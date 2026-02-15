import { GeoJsonLayer } from "@deck.gl/layers";
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

function getImpactColor(impact: number): number[] {
  const color = COLOR_SCALE[impact] || [160, 160, 160];
  return [...color, 180];
}

function getMaxImpact(
  iso3: string,
  agentResults: AgentResults
): number {
  let maxImpact = 0;

  const geo = agentResults.geopolitics as GeopoliticsOutput | undefined;
  if (geo?.affected_countries) {
    const country = geo.affected_countries.find((c) => c.iso3 === iso3);
    if (country) {
      maxImpact = Math.max(maxImpact, country.impact_score);
    }
  }

  const econ = agentResults.economy as EconomyOutput | undefined;
  if (econ?.affected_countries) {
    const country = econ.affected_countries.find((c) => c.iso3 === iso3);
    if (country) {
      maxImpact = Math.max(maxImpact, country.trade_disruption);
    }
  }

  const food = agentResults.food_supply as FoodSupplyOutput | undefined;
  if (food?.affected_countries) {
    const country = food.affected_countries.find((c) => c.iso3 === iso3);
    if (country) {
      maxImpact = Math.max(maxImpact, country.food_security_impact);
    }
  }

  const infra = agentResults.infrastructure as InfrastructureOutput | undefined;
  if (infra?.affected_countries) {
    const country = infra.affected_countries.find((c) => c.iso3 === iso3);
    if (country) {
      maxImpact = Math.max(maxImpact, country.infrastructure_risk);
    }
  }

  const civ = agentResults.civilian_impact as CivilianImpactOutput | undefined;
  if (civ?.affected_countries) {
    const country = civ.affected_countries.find((c) => c.iso3 === iso3);
    if (country) {
      maxImpact = Math.max(maxImpact, country.humanitarian_score);
    }
  }

  return maxImpact;
}

export function createChoroplethLayer(
  countriesGeoJSON: GeoJSON.FeatureCollection,
  agentResults: AgentResults,
  selectedCountry: string | null
) {
  const dataWithImpact = countriesGeoJSON.features.map((feature) => {
    const iso3 = feature.properties?.ISO_A3;
    const maxImpact = iso3 ? getMaxImpact(iso3, agentResults) : 0;
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

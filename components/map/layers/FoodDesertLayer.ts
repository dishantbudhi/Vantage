import { GeoJsonLayer } from "@deck.gl/layers";
import type { FoodSupplyOutput } from "@/lib/agents/schemas";

export function createFoodDesertLayer(
  countriesGeoJSON: GeoJSON.FeatureCollection,
  foodOutput: FoodSupplyOutput
) {
  if (!foodOutput.affected_countries) {
    return new GeoJsonLayer({
      id: "food-desert-layer",
      data: [],
    });
  }

  const foodDesertCountries = foodOutput.affected_countries
    .filter((c) => c.is_food_desert === true)
    .map((c) => c.iso3);

  const filteredFeatures = countriesGeoJSON.features.filter(
    (feature) => foodDesertCountries.includes(feature.properties?.ISO_A3)
  );

  return new GeoJsonLayer({
    id: "food-desert-layer",
    data: {
      type: "FeatureCollection",
      features: filteredFeatures,
    },
    filled: true,
    stroked: true,
    pickable: true,
    opacity: 0.6,
    getFillColor: [255, 165, 0, 80],
    getLineColor: [255, 140, 0, 150],
    getLineWidth: 2,
    transitions: {
      getFillColor: {
        duration: 1000,
      },
    },
    updateTriggers: {
      getFillColor: [foodOutput],
    },
  });
}

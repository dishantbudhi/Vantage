"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapLibreMap, { NavigationControl, ScaleControl } from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import type { ViewState, LayerToggleState, AgentResults } from "@/lib/types";
import type { GeopoliticsOutput, EconomyOutput, FoodSupplyOutput, InfrastructureOutput, CivilianImpactOutput } from "@/lib/agents/schemas";

import { createChoroplethLayer } from "./layers/ChoroplethLayer";
import { createConflictLayer } from "./layers/ConflictLayer";
import { createFoodDesertLayer } from "./layers/FoodDesertLayer";
import { createInfrastructureLayer } from "./layers/InfrastructureLayer";
import { createTradeArcLayer } from "./layers/TradeArcLayer";
import { createDisplacementArcLayer } from "./layers/DisplacementArcLayer";
import { createHeatmapLayer } from "./layers/HeatmapLayer";

import "maplibre-gl/dist/maplibre-gl.css";

const INITIAL_VIEW: ViewState = {
  longitude: 30,
  latitude: 20,
  zoom: 2.5,
  pitch: 35,
  bearing: 0,
};

const MAP_STYLE = process.env.NEXT_PUBLIC_MAPTILER_KEY
  ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`
  : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export interface MapViewProps {
  viewState: ViewState;
  onViewStateChange: (viewState: ViewState) => void;
  agentResults: AgentResults;
  selectedCountry: string | null;
  onCountryClick: (iso3: string) => void;
  layerToggles: LayerToggleState;
  countriesGeoJSON?: GeoJSON.FeatureCollection;
}

export default function MapView({
  viewState,
  onViewStateChange,
  agentResults,
  selectedCountry,
  onCountryClick,
  layerToggles,
  countriesGeoJSON,
}: MapViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [pulsingRadius, setPulsingRadius] = useState(1);

  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      setPulsingRadius((prev) => {
        const next = prev + 0.02;
        return next > 1.2 ? 0.8 : next;
      });
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const onMove = useCallback(
    (evt: { viewState: ViewState }) => {
      onViewStateChange(evt.viewState);
    },
    [onViewStateChange]
  );

  const onClick = useCallback(
    (info: { object?: { properties?: { ISO_A3?: string } } }) => {
      if (info.object?.properties?.ISO_A3) {
        onCountryClick(info.object.properties.ISO_A3);
      }
    },
    [onCountryClick]
  );

  const layers = useMemo(() => {
    const deckLayers: any[] = [];

    if (layerToggles.choropleth && countriesGeoJSON) {
      deckLayers.push(
        createChoroplethLayer(countriesGeoJSON, agentResults, selectedCountry)
      );
    }

    if (layerToggles.conflict && agentResults.geopolitics) {
      deckLayers.push(
        createConflictLayer(agentResults.geopolitics as GeopoliticsOutput, pulsingRadius)
      );
    }

    if (layerToggles.foodDesert && countriesGeoJSON && agentResults.food_supply) {
      deckLayers.push(
        createFoodDesertLayer(countriesGeoJSON, agentResults.food_supply as FoodSupplyOutput)
      );
    }

    if (layerToggles.infrastructure && agentResults.infrastructure) {
      deckLayers.push(createInfrastructureLayer(agentResults.infrastructure as InfrastructureOutput));
    }

    if (layerToggles.tradeArcs && (agentResults.economy || agentResults.food_supply)) {
      deckLayers.push(
        createTradeArcLayer(agentResults.economy as EconomyOutput | undefined, agentResults.food_supply as FoodSupplyOutput | undefined)
      );
    }

    if (layerToggles.displacementArcs && agentResults.civilian_impact) {
      deckLayers.push(
        createDisplacementArcLayer(agentResults.civilian_impact as CivilianImpactOutput)
      );
    }

    if (layerToggles.heatmap && agentResults) {
      deckLayers.push(createHeatmapLayer(agentResults));
    }

    return deckLayers;
  }, [layerToggles, agentResults, selectedCountry, countriesGeoJSON, pulsingRadius]);

  return (
    <div className="relative w-full h-full">
      <DeckGL
        viewState={viewState}
        controller={true}
        layers={layers}
        onClick={onClick}
        onViewStateChange={({ viewState: newViewState }) => onViewStateChange(newViewState as ViewState)}
        getTooltip={({ object }) =>
          object?.properties?.NAME || object?.properties?.ISO_A3 || null
        }
        style={{ width: "100%", height: "100%" }}
      >
        <MapLibreMap
          ref={mapRef}
          mapStyle={MAP_STYLE}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          viewState={viewState as any}
          onMove={onMove}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" />
          <ScaleControl />
        </MapLibreMap>
      </DeckGL>
    </div>
  );
}

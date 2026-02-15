"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapLibreMap, { NavigationControl, ScaleControl } from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import type { ViewState, LayerToggleState, AgentResults } from "@/lib/types";
import type {
  GeopoliticsOutput,
  EconomyOutput,
  FoodSupplyOutput,
  InfrastructureOutput,
  CivilianImpactOutput,
} from "@/lib/agents/schemas";

import { createChoroplethLayer } from "./layers/ChoroplethLayer";
import { createConflictLayer } from "./layers/ConflictLayer";
import { createFoodDesertLayer } from "./layers/FoodDesertLayer";
import { createInfrastructureLayer } from "./layers/InfrastructureLayer";
import { createTradeArcLayer } from "./layers/TradeArcLayer";
import { createDisplacementArcLayer } from "./layers/DisplacementArcLayer";
import { createHeatmapLayer } from "./layers/HeatmapLayer";

import "maplibre-gl/dist/maplibre-gl.css";

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
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pulsingRadiusRef = useRef(1);
  const [pulsingRadius, setPulsingRadius] = useState(1);
  // Guard: defer DeckGL render until container has non-zero dimensions.
  const [ready, setReady] = useState(false);

  // Wait for the container to have layout dimensions before mounting DeckGL
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const check = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setReady(true);
      }
    };

    check();

    if (!ready) {
      const ro = new ResizeObserver(() => check());
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [ready]);

  // Pulsing animation for conflict zones — throttled to ~15fps to avoid
  // rebuilding all layers at 60fps. Only updates state every ~66ms.
  useEffect(() => {
    let animationFrame: number;
    let lastUpdate = 0;
    const THROTTLE_MS = 66; // ~15fps

    const animate = (timestamp: number) => {
      pulsingRadiusRef.current += 0.02;
      if (pulsingRadiusRef.current > 1.2) pulsingRadiusRef.current = 0.8;

      if (timestamp - lastUpdate >= THROTTLE_MS) {
        setPulsingRadius(pulsingRadiusRef.current);
        lastUpdate = timestamp;
      }

      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
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

  // Stable layers that do NOT depend on pulsingRadius — avoid rebuilding
  // choropleth, food desert, infra, trade arcs, displacement, heatmap at 15fps.
  const stableLayers = useMemo(() => {
    const deckLayers: any[] = [];

    if (layerToggles.choropleth && countriesGeoJSON) {
      deckLayers.push(
        createChoroplethLayer(countriesGeoJSON, agentResults, selectedCountry)
      );
    }

    if (
      layerToggles.foodDesert &&
      countriesGeoJSON &&
      agentResults.food_supply
    ) {
      deckLayers.push(
        createFoodDesertLayer(
          countriesGeoJSON,
          agentResults.food_supply as FoodSupplyOutput
        )
      );
    }

    if (layerToggles.infrastructure && agentResults.infrastructure) {
      deckLayers.push(
        createInfrastructureLayer(
          agentResults.infrastructure as InfrastructureOutput
        )
      );
    }

    if (
      layerToggles.tradeArcs &&
      (agentResults.economy || agentResults.food_supply)
    ) {
      deckLayers.push(
        createTradeArcLayer(
          agentResults.economy as EconomyOutput | undefined,
          agentResults.food_supply as FoodSupplyOutput | undefined
        )
      );
    }

    if (layerToggles.displacementArcs && agentResults.civilian_impact) {
      deckLayers.push(
        createDisplacementArcLayer(
          agentResults.civilian_impact as CivilianImpactOutput
        )
      );
    }

    if (layerToggles.heatmap && agentResults) {
      deckLayers.push(createHeatmapLayer(agentResults));
    }

    return deckLayers;
  }, [layerToggles, agentResults, selectedCountry, countriesGeoJSON]);

  // Conflict layer depends on pulsingRadius — separate memo so only this
  // layer rebuilds on animation ticks.
  const conflictLayer = useMemo(() => {
    if (layerToggles.conflict && agentResults.geopolitics) {
      return createConflictLayer(
        agentResults.geopolitics as GeopoliticsOutput,
        pulsingRadius
      );
    }
    return null;
  }, [layerToggles.conflict, agentResults.geopolitics, pulsingRadius]);

  const allLayers = useMemo(() => {
    const result = [...stableLayers];
    if (conflictLayer) result.push(conflictLayer);
    return result;
  }, [stableLayers, conflictLayer]);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {ready ? (
        <DeckGL
          viewState={viewState}
          controller={true}
          layers={allLayers}
          onClick={onClick}
          onViewStateChange={({ viewState: newViewState }) =>
            onViewStateChange(newViewState as ViewState)
          }
          getTooltip={({ object }: { object?: any }) =>
            object?.properties?.NAME || object?.properties?.ISO_A3 || null
          }
          style={{ width: "100%", height: "100%" }}
        >
          <MapLibreMap
            ref={mapRef}
            mapStyle={MAP_STYLE}
            onMove={onMove}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />
            <ScaleControl />
          </MapLibreMap>
        </DeckGL>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-background">
          <div className="text-muted-foreground text-sm">
            Initializing map...
          </div>
        </div>
      )}
    </div>
  );
}

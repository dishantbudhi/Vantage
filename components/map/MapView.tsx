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
  const [pulsingRadius, setPulsingRadius] = useState(1);
  // Guard: defer DeckGL render until container has non-zero dimensions.
  // luma.gl v9 crashes with "Cannot read properties of undefined
  // (reading 'maxTextureDimension2D')" when the WebGL canvas is created
  // inside a 0×0 container because device.limits is never populated.
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

    // Immediate check (container may already have size)
    check();

    if (!ready) {
      // Fallback: observe resize events until we get a valid size
      const ro = new ResizeObserver(() => check());
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [ready]);

  // Pulsing animation for conflict zones
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
        createConflictLayer(
          agentResults.geopolitics as GeopoliticsOutput,
          pulsingRadius
        )
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
  }, [
    layerToggles,
    agentResults,
    selectedCountry,
    countriesGeoJSON,
    pulsingRadius,
  ]);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {ready ? (
        <DeckGL
          viewState={viewState}
          controller={true}
          layers={layers}
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

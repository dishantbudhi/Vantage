"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAnalysis } from "@/hooks/use-analysis";
import ScenarioInput from "@/components/sidebar/ScenarioInput";
import AgentPanelGroup from "@/components/sidebar/AgentPanelGroup";
import SynthesisPanel from "@/components/sidebar/SynthesisPanel";
import RegionDetail from "@/components/sidebar/RegionDetail";
import MapControls from "@/components/map/MapControls";
import MapLegend from "@/components/map/MapLegend";
import type { ViewState, LayerName, LayerToggleState, AgentName } from "@/lib/types";
import { RISK_SCORE_THRESHOLDS } from "@/components/sidebar/constants";

// ── Dynamic import MapView (no SSR for MapLibre + deck.gl) ──────────

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <div className="text-muted-foreground">Loading map...</div>
    </div>
  ),
});

// ── Constants ────────────────────────────────────────────────────────

const INITIAL_VIEW: ViewState = {
  longitude: 30,
  latitude: 20,
  zoom: 2.5,
  pitch: 35,
  bearing: 0,
};

const DEFAULT_LAYER_TOGGLES: LayerToggleState = {
  choropleth: true,
  heatmap: true,
  conflict: false,
  foodDesert: false,
  infrastructure: false,
  tradeArcs: true,
  displacementArcs: false,
};

// ── Sidebar view states ─────────────────────────────────────────────

type SidebarView = "analysis" | "regionDetail";

// ── Country context shape (from /api/country-data) ──────────────────

interface CountryContext {
  name: string;
  iso3: string;
  economics: {
    gdp: number;
    population: number;
    poverty_rate: number;
    arable_land_pct: number;
    energy_use_per_capita: number;
    trade_pct_gdp: number;
  };
  risk: {
    risk_score: number;
    hazard_exposure: number;
    vulnerability: number;
    lack_of_coping_capacity: number;
  };
  displacement: {
    refugees: number;
    asylum_seekers: number;
    idps: number;
    stateless: number;
  };
}

// ── Risk Score Badge ────────────────────────────────────────────────

function RiskScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted border border-border">
        <span className="text-sm text-muted-foreground">Risk Score</span>
        <span className="text-lg font-bold text-muted-foreground">—</span>
      </div>
    );
  }

  const getScoreColor = (s: number) => {
    if (s <= RISK_SCORE_THRESHOLDS.low) return "text-green-500";
    if (s <= RISK_SCORE_THRESHOLDS.medium) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBg = (s: number) => {
    if (s <= RISK_SCORE_THRESHOLDS.low) return "bg-green-500/20 border-green-500/50";
    if (s <= RISK_SCORE_THRESHOLDS.medium) return "bg-yellow-500/20 border-yellow-500/50";
    return "bg-red-500/20 border-red-500/50";
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${getScoreBg(score)}`}>
      <span className="text-sm text-muted-foreground">Risk Score</span>
      <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
    </div>
  );
}

// ── Time Horizon Badge ──────────────────────────────────────────────

function TimeHorizonBadge({ horizon }: { horizon: string | undefined }) {
  if (!horizon) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
        <span className="text-sm text-muted-foreground">Time Horizon</span>
        <span className="text-sm font-medium text-muted-foreground">—</span>
      </div>
    );
  }

  const formatHorizon = (h: string) => h.charAt(0).toUpperCase() + h.slice(1);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/30 border border-accent">
      <span className="text-sm text-muted-foreground">Time Horizon</span>
      <span className="text-sm font-medium text-accent-foreground">{formatHorizon(horizon)}</span>
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────

export default function Home() {
  const analysis = useAnalysis();

  // Map state
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW);
  const [countriesGeoJSON, setCountriesGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);

  // Sidebar state machine
  const [sidebarView, setSidebarView] = useState<SidebarView>("analysis");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryData, setCountryData] = useState<CountryContext | null>(null);
  const [countryDataLoading, setCountryDataLoading] = useState(false);

  // Agent tabs
  const [activeTab, setActiveTab] = useState<AgentName | "synthesis">("geopolitics");

  // Layer toggles
  const [layerToggles, setLayerToggles] = useState<LayerToggleState>(DEFAULT_LAYER_TOGGLES);

  const isAnalyzing = analysis.status === "analyzing";

  // ── Load GeoJSON on mount ───────────────────────────────────────────

  useEffect(() => {
    fetch("/countries.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load countries GeoJSON");
        return res.json();
      })
      .then((data) => setCountriesGeoJSON(data))
      .catch((err) => console.error("Error loading countries GeoJSON:", err));
  }, []);

  // ── Fly to region when orchestrator completes ───────────────────────

  useEffect(() => {
    if (analysis.orchestratorOutput) {
      const { coordinates, zoom_level } = analysis.orchestratorOutput;
      if (coordinates && zoom_level) {
        setViewState((prev) => ({
          ...prev,
          latitude: coordinates.lat,
          longitude: coordinates.lon,
          zoom: zoom_level,
          transitionDuration: 1500,
        }));
      }
    }
  }, [analysis.orchestratorOutput]);

  // ── Auto-select synthesis tab when synthesis starts ─────────────────

  useEffect(() => {
    if (
      analysis.pipelineStatus === "synthesizing" ||
      (analysis.pipelineStatus === "complete" && analysis.synthesisStatus === "streaming")
    ) {
      setActiveTab("synthesis");
    }
  }, [analysis.pipelineStatus, analysis.synthesisStatus]);

  // ── Auto-enable layers when agents complete ─────────────────────────

  useEffect(() => {
    const results = analysis.agentResults;
    setLayerToggles((prev) => {
      const next = { ...prev };
      if (results.geopolitics && !prev.conflict) next.conflict = true;
      if (results.food_supply && !prev.foodDesert) next.foodDesert = true;
      if (results.infrastructure && !prev.infrastructure) next.infrastructure = true;
      if (results.civilian_impact && !prev.displacementArcs) next.displacementArcs = true;
      // Only update if something changed
      if (
        next.conflict !== prev.conflict ||
        next.foodDesert !== prev.foodDesert ||
        next.infrastructure !== prev.infrastructure ||
        next.displacementArcs !== prev.displacementArcs
      ) {
        return next;
      }
      return prev;
    });
  }, [analysis.agentResults]);

  // ── Reset sidebar view when analysis resets ─────────────────────────

  useEffect(() => {
    if (analysis.status === "idle") {
      setSidebarView("analysis");
      setSelectedCountry(null);
      setCountryData(null);
      setLayerToggles(DEFAULT_LAYER_TOGGLES);
    }
  }, [analysis.status]);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleLayerToggle = useCallback((layer: LayerName) => {
    setLayerToggles((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleCountryClick = useCallback(
    async (iso3: string) => {
      // Only switch to region detail if we have analysis data
      if (analysis.status === "idle") return;

      setSelectedCountry(iso3);
      setSidebarView("regionDetail");
      setCountryDataLoading(true);
      setCountryData(null);

      try {
        const res = await fetch(`/api/country-data?iso3=${encodeURIComponent(iso3)}`);
        if (res.ok) {
          const data = await res.json();
          setCountryData(data);
        }
      } catch (err) {
        console.error("Error fetching country data:", err);
      } finally {
        setCountryDataLoading(false);
      }
    },
    [analysis.status]
  );

  const handleBackToAnalysis = useCallback(() => {
    setSidebarView("analysis");
    setSelectedCountry(null);
    setCountryData(null);
  }, []);

  const handleTabChange = useCallback((tab: AgentName | "synthesis") => {
    setActiveTab(tab);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-border glass-top">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            CryoNexus
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <RiskScoreBadge score={analysis.compoundRiskScore} />
          <TimeHorizonBadge horizon={analysis.orchestratorOutput?.time_horizon} />
        </div>
      </header>

      {/* Main Content - 70/30 Grid */}
      <div className="flex-1 grid grid-cols-[1fr_420px] min-h-0">
        {/* Left: Map (70%) */}
        <div className="relative min-h-0 bg-background map-container">
          <MapView
            viewState={viewState}
            onViewStateChange={setViewState}
            agentResults={analysis.agentResults}
            selectedCountry={selectedCountry}
            onCountryClick={handleCountryClick}
            layerToggles={layerToggles}
            countriesGeoJSON={countriesGeoJSON ?? undefined}
          />
          <MapControls layerToggles={layerToggles} onToggle={handleLayerToggle} />
          <MapLegend />
        </div>

        {/* Right: Sidebar (30%) */}
        <aside className="border-l border-border flex flex-col min-h-0 glass sidebar-container">
          {/* Scenario Input (always visible) */}
          <div className="flex-shrink-0">
            <ScenarioInput
              onSubmit={analysis.analyzeScenario}
              isAnalyzing={isAnalyzing}
              currentScenario={analysis.scenario}
              onReset={analysis.reset}
            />
          </div>

          {/* Sidebar Content (state machine) */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Region Detail View */}
            {sidebarView === "regionDetail" && selectedCountry && (
              <div className="flex-1 overflow-y-auto p-4 animate-slide-in-right">
                {countryDataLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-sm text-muted-foreground shimmer p-4 rounded">
                      Loading country data...
                    </div>
                  </div>
                ) : (
                  <RegionDetail
                    iso3={selectedCountry}
                    agentResults={analysis.agentResults}
                    countryData={countryData}
                    onBack={handleBackToAnalysis}
                  />
                )}
              </div>
            )}

            {/* Analysis View (agents + synthesis) */}
            {sidebarView === "analysis" && analysis.status !== "idle" && (
              <>
                <div className="flex-1 min-h-0 overflow-hidden animate-fade-in">
                  <AgentPanelGroup
                    agentTexts={analysis.agentTexts}
                    agentStatuses={analysis.agentStatuses}
                    synthesisText={analysis.synthesisText}
                    synthesisStatus={analysis.synthesisStatus}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                  />
                </div>

                <div className="flex-shrink-0 max-h-[280px] overflow-y-auto border-t border-border">
                  <SynthesisPanel
                    synthesisText={analysis.synthesisText}
                    compoundRiskScore={analysis.compoundRiskScore}
                    isComplete={analysis.status === "complete"}
                  />
                </div>
              </>
            )}

            {/* Idle State */}
            {sidebarView === "analysis" && analysis.status === "idle" && (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-muted-foreground text-center">
                  Enter a scenario above to begin analysis
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

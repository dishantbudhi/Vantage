"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAnalysis } from "@/hooks/use-analysis";
import ScenarioInput from "@/components/sidebar/ScenarioInput";
import AgentPanelGroup from "@/components/sidebar/AgentPanelGroup";
import SynthesisPanel from "@/components/sidebar/SynthesisPanel";
import MapControls from "@/components/map/MapControls";
import MapLegend from "@/components/map/MapLegend";
import type { ViewState, LayerName, LayerToggleState, AgentName } from "@/lib/types";
import { RISK_SCORE_THRESHOLDS } from "@/components/sidebar/constants";

const MapView = dynamic(
  () => import("@/components/map/MapView"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    )
  }
);

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

function TimeHorizonBadge({ horizon }: { horizon: string | undefined }) {
  if (!horizon) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
        <span className="text-sm text-muted-foreground">Time Horizon</span>
        <span className="text-sm font-medium text-muted-foreground">—</span>
      </div>
    );
  }

  const formatHorizon = (h: string) => {
    return h.charAt(0).toUpperCase() + h.slice(1);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/30 border border-accent">
      <span className="text-sm text-muted-foreground">Time Horizon</span>
      <span className="text-sm font-medium text-accent-foreground">{formatHorizon(horizon)}</span>
    </div>
  );
}

export default function Home() {
  const analysis = useAnalysis();
  
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AgentName | "synthesis">("geopolitics");
  const [layerToggles, setLayerToggles] = useState<LayerToggleState>(DEFAULT_LAYER_TOGGLES);

  const isAnalyzing = analysis.status === "analyzing";

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

  useEffect(() => {
    if (analysis.pipelineStatus === "synthesizing" || 
        (analysis.pipelineStatus === "complete" && analysis.synthesisStatus === "streaming")) {
      setActiveTab("synthesis");
    }
  }, [analysis.pipelineStatus, analysis.synthesisStatus]);

  const handleLayerToggle = (layer: LayerName) => {
    setLayerToggles((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const handleCountryClick = (iso3: string) => {
    setSelectedCountry(iso3);
  };

  const handleTabChange = (tab: AgentName | "synthesis") => {
    setActiveTab(tab);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-border bg-card">
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
        <div className="relative min-h-0 bg-background">
          <MapView
            viewState={viewState}
            onViewStateChange={setViewState}
            agentResults={analysis.agentResults}
            selectedCountry={selectedCountry}
            onCountryClick={handleCountryClick}
            layerToggles={layerToggles}
          />
          <MapControls
            layerToggles={layerToggles}
            onToggle={handleLayerToggle}
          />
          <MapLegend />
        </div>

        {/* Right: Sidebar (30%) */}
        <aside className="border-l border-border flex flex-col min-h-0 bg-card">
          <div className="flex-shrink-0">
            <ScenarioInput
              onSubmit={analysis.analyzeScenario}
              isAnalyzing={isAnalyzing}
              currentScenario={analysis.scenario}
              onReset={analysis.reset}
            />
          </div>
          
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {analysis.status !== "idle" && (
              <>
                <div className="flex-1 min-h-0 overflow-hidden">
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
            
            {analysis.status === "idle" && (
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

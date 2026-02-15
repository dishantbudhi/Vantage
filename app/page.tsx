"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { AnalysisState, AgentName, AgentStatus, AgentResults, ViewState } from "@/lib/types";
import type { OrchestratorOutput } from "@/lib/agents/schemas";
import ScenarioInput from "@/components/sidebar/ScenarioInput";
import AgentPanelGroup from "@/components/sidebar/AgentPanelGroup";
import RegionDetail from "@/components/sidebar/RegionDetail";
import { RISK_SCORE_THRESHOLDS } from "@/components/sidebar/constants";

// Dynamic import for MapView (avoids SSR issues with map libraries)
const MapView = dynamic(
  () => import("@/components/map/MapView"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading map...</span>
        </div>
      </div>
    )
  }
);

type SidebarState = "collapsed" | "active" | "region-detail";

// Mock initial analysis state (will be replaced by useAnalysis hook)
const initialAnalysisState: AnalysisState = {
  status: "idle",
  scenario: null,
  orchestratorOutput: null,
  agentTexts: {
    geopolitics: "",
    economy: "",
    food_supply: "",
    infrastructure: "",
    civilian_impact: "",
    synthesis: "",
  },
  agentResults: {},
  agentStatuses: {
    geopolitics: "idle",
    economy: "idle",
    food_supply: "idle",
    infrastructure: "idle",
    civilian_impact: "idle",
    synthesis: "idle",
  },
  synthesisText: "",
  synthesisOutput: null,
  compoundRiskScore: null,
  errors: [],
};

const INITIAL_VIEW_STATE: ViewState = {
  longitude: 30,
  latitude: 20,
  zoom: 2.5,
  pitch: 35,
  bearing: 0,
};

function getRiskBadgeClass(score: number | null): string {
  if (score === null) return "risk-badge bg-muted";
  if (score <= RISK_SCORE_THRESHOLDS.low) return "risk-badge risk-badge-low";
  if (score <= RISK_SCORE_THRESHOLDS.medium) return "risk-badge risk-badge-medium";
  return "risk-badge risk-badge-high";
}

function formatTimeHorizon(horizon: string | null): string {
  if (!horizon) return "—";
  return horizon.charAt(0).toUpperCase() + horizon.slice(1);
}

interface CountryData {
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

// Mock function to get country data (placeholder for loader.ts integration)
async function getCountryData(iso3: string): Promise<CountryData | null> {
  // This would be replaced with actual loader.ts integration
  // For now, return mock data for demo
  const mockData: Record<string, CountryData> = {
    USA: {
      name: "United States",
      iso3: "USA",
      economics: { gdp: 25462700000000, population: 331893745, poverty_rate: 11.6, arable_land_pct: 17.3, energy_use_per_capita: 7079, trade_pct_gdp: 19.5 },
      risk: { risk_score: 3.2, hazard_exposure: 2.8, vulnerability: 3.1, lack_of_coping_capacity: 3.8 },
      displacement: { refugees: 3435, asylum_seekers: 18540, idps: 0, stateless: 0 }
    },
    EGY: {
      name: "Egypt",
      iso3: "EGY",
      economics: { gdp: 404100000000, population: 102334404, poverty_rate: 29.7, arable_land_pct: 3.9, energy_use_per_capita: 1898, trade_pct_gdp: 28.4 },
      risk: { risk_score: 5.8, hazard_exposure: 4.9, vulnerability: 6.2, lack_of_coping_capacity: 6.3 },
      displacement: { refugees: 267349, asylum_seekers: 15237, idps: 0, stateless: 26 }
    },
    IND: {
      name: "India",
      iso3: "IND",
      economics: { gdp: 3173400000000, population: 1407563842, poverty_rate: 21.6, arable_land_pct: 52.8, energy_use_per_capita: 639, trade_pct_gdp: 22.8 },
      risk: { risk_score: 5.3, hazard_exposure: 5.8, vulnerability: 5.1, lack_of_coping_capacity: 4.9 },
      displacement: { refugees: 21469, asylum_seekers: 589, idps: 0, stateless: 11 }
    },
  };
  
  return mockData[iso3] || null;
}

export default function Home() {
  const [analysisState, setAnalysisState] = useState<AnalysisState>(initialAnalysisState);
  const [sidebarState, setSidebarState] = useState<SidebarState>("collapsed");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [activeTab, setActiveTab] = useState<AgentName | "synthesis">("geopolitics");
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [layerToggles, setLayerToggles] = useState({
    choropleth: true,
    heatmap: true,
    conflict: false,
    foodDesert: false,
    infrastructure: false,
    tradeArcs: false,
    displacementArcs: false,
  });

  // Load country data when selected country changes (with race condition handling)
  useEffect(() => {
    let active = true;
    
    async function loadCountryData() {
      if (!selectedCountry) {
        setCountryData(null);
        return;
      }
      
      try {
        const data = await getCountryData(selectedCountry);
        if (active) {
          setCountryData(data);
        }
      } catch (error) {
        if (active) {
          console.error("Failed to load country data:", error);
          setCountryData(null);
        }
      }
    }
    
    loadCountryData();
    
    return () => {
      active = false;
    };
  }, [selectedCountry]);

  // Handle scenario submission (mock for now)
  const handleScenarioSubmit = useCallback((scenario: string) => {
    setAnalysisState((prev) => ({
      ...prev,
      status: "analyzing",
      scenario,
    }));
    setSidebarState("active");
  }, []);

  // Handle reset
  const handleReset = useCallback(() => {
    setAnalysisState(initialAnalysisState);
    setSidebarState("collapsed");
    setSelectedCountry(null);
    setActiveTab("geopolitics");
  }, []);

  // Handle map country click
  const handleCountryClick = useCallback((iso3: string) => {
    setSelectedCountry(iso3);
    setSidebarState("region-detail");
  }, []);

  // Handle back to analysis
  const handleBackToAnalysis = useCallback(() => {
    setSelectedCountry(null);
    setSidebarState("active");
  }, []);

  // Handle layer toggle
  const handleLayerToggle = useCallback((layer: string) => {
    setLayerToggles((prev) => ({
      ...prev,
      [layer]: !prev[layer as keyof typeof prev],
    }));
  }, []);

  // Handle view state change (fly to)
  const handleViewStateChange = useCallback((newViewState: ViewState) => {
    setViewState(newViewState);
  }, []);

  // Fly to orchestrator coordinates when available
  useEffect(() => {
    if (analysisState.orchestratorOutput) {
      const { coordinates, zoom_level } = analysisState.orchestratorOutput;
      setViewState((prev) => ({
        ...prev,
        longitude: coordinates.lon,
        latitude: coordinates.lat,
        zoom: zoom_level,
        transitionDuration: 1500,
      }));
    }
  }, [analysisState.orchestratorOutput]);

  // Determine which sidebar content to show
  const sidebarContent = useMemo(() => {
    if (sidebarState === "region-detail" && selectedCountry) {
      return (
        <RegionDetail
          iso3={selectedCountry}
          agentResults={analysisState.agentResults}
          countryData={countryData}
          onBack={handleBackToAnalysis}
        />
      );
    }

    if (sidebarState === "active") {
      return (
        <div className="flex flex-col h-full">
          <ScenarioInput
            onSubmit={handleScenarioSubmit}
            isAnalyzing={analysisState.status === "analyzing"}
            currentScenario={analysisState.scenario}
            onReset={handleReset}
          />
          
          <div className="flex-1 overflow-hidden mt-4">
            {analysisState.status !== "idle" && (
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0 pb-2">
                  <SynthesisPanelContent 
                    synthesisText={analysisState.synthesisText}
                    compoundRiskScore={analysisState.compoundRiskScore}
                    isComplete={analysisState.status === "complete"}
                  />
                </div>
                <div className="flex-1 overflow-hidden mt-4">
                  <AgentPanelGroup
                    agentTexts={analysisState.agentTexts}
                    agentStatuses={analysisState.agentStatuses}
                    synthesisText={analysisState.synthesisText}
                    synthesisStatus={analysisState.status === "complete" ? "complete" : analysisState.status === "analyzing" ? "streaming" : "idle"}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <ScenarioInput
        onSubmit={handleScenarioSubmit}
        isAnalyzing={analysisState.status === "analyzing"}
        currentScenario={analysisState.scenario}
        onReset={handleReset}
      />
    );
  }, [
    sidebarState,
    selectedCountry,
    analysisState,
    countryData,
    activeTab,
    handleScenarioSubmit,
    handleReset,
    handleBackToAnalysis,
  ]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 glass-top flex items-center justify-between px-6 flex-shrink-0 z-50">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            CryoNexus
          </h1>
        </div>

        {/* Risk Score Badge (Center) */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <div className={getRiskBadgeClass(analysisState.compoundRiskScore)}>
            {analysisState.compoundRiskScore ?? "—"}
          </div>
        </div>

        {/* Time Horizon Badge (Right) */}
        <div className="flex items-center">
          <div className="time-badge">
            {formatTimeHorizon(analysisState.orchestratorOutput?.time_horizon ?? null)}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Map (70%) */}
        <div className="w-[70%] h-full relative">
          <MapView
            viewState={viewState}
            onViewStateChange={handleViewStateChange}
            agentResults={analysisState.agentResults}
            selectedCountry={selectedCountry}
            onCountryClick={handleCountryClick}
            layerToggles={layerToggles}
          />
        </div>

        {/* Sidebar (30%) */}
        <aside className="w-[30%] h-full glass sidebar-container">
          {sidebarContent}
        </aside>
      </main>
    </div>
  );
}

// Inline synthesis panel for page.tsx (combines with agent panels)
function SynthesisPanelContent({
  synthesisText,
  compoundRiskScore,
  isComplete,
}: {
  synthesisText: string;
  compoundRiskScore: number | null;
  isComplete: boolean;
}) {
  const [displayScore, setDisplayScore] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isComplete || compoundRiskScore === null) {
      setDisplayScore(0);
      return;
    }

    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(compoundRiskScore * easeOut);
      setDisplayScore(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [compoundRiskScore, isComplete]);

  const getRiskLevel = (score: number) => {
    if (score <= RISK_SCORE_THRESHOLDS.low) return { label: "Low", color: "text-green-500", bg: "bg-green-500/20" };
    if (score <= RISK_SCORE_THRESHOLDS.medium) return { label: "Medium", color: "text-yellow-500", bg: "bg-yellow-500/20" };
    return { label: "Critical", color: "text-red-500", bg: "bg-red-500/20" };
  };

  return (
    <div className="p-3 rounded-lg bg-card border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Compound Risk Score</span>
        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRiskLevel(displayScore).color} ${getRiskLevel(displayScore).bg}`}>
          {getRiskLevel(displayScore).label}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className={getRiskBadgeClass(compoundRiskScore)}>
          {displayScore}
        </div>
        <span className="text-xs text-muted-foreground">
          {isComplete ? "Analysis complete" : "Analyzing..."}
        </span>
      </div>
    </div>
  );
}



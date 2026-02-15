// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

// ── Mocks ─────────────────────────────────────────────────────────────

// Mock next/dynamic - returns a component that renders the loaded module
vi.mock("next/dynamic", () => ({
  default: (_loader: () => Promise<any>, _opts?: any) => {
    // Return the mock MapView directly
    const MockDynamic = (props: any) => (
      <div
        data-testid="map-view"
        data-selected-country={props.selectedCountry}
        data-has-geojson={!!props.countriesGeoJSON}
        onClick={() => props.onCountryClick?.("EGY")}
      />
    );
    MockDynamic.displayName = "DynamicMapView";
    return MockDynamic;
  },
}));

// Mock MapControls and MapLegend
vi.mock("@/components/map/MapControls", () => ({
  default: (props: any) => (
    <div data-testid="map-controls" data-toggles={JSON.stringify(props.layerToggles)} />
  ),
}));

vi.mock("@/components/map/MapLegend", () => ({
  default: () => <div data-testid="map-legend" />,
}));

// Mock recharts
vi.mock("recharts", () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div />,
}));

// Mock react-markdown
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

// Mock fetch for GeoJSON and country data
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import the hook to spy on it
const mockAnalyzeScenario = vi.fn();
const mockReset = vi.fn();

let mockAnalysisState = {
  status: "idle" as string,
  scenario: null as string | null,
  orchestratorOutput: null as any,
  agentTexts: {
    geopolitics: "",
    economy: "",
    food_supply: "",
    infrastructure: "",
    civilian_impact: "",
    synthesis: "",
  },
  agentResults: {} as any,
  agentStatuses: {
    geopolitics: "idle" as string,
    economy: "idle" as string,
    food_supply: "idle" as string,
    infrastructure: "idle" as string,
    civilian_impact: "idle" as string,
    synthesis: "idle" as string,
  },
  synthesisText: "",
  synthesisOutput: null as any,
  compoundRiskScore: null as number | null,
  errors: [] as any[],
  analyzeScenario: mockAnalyzeScenario,
  reset: mockReset,
  pipelineStatus: "idle" as string,
  pipelineMessage: "",
  synthesisStatus: "idle" as string,
};

vi.mock("@/hooks/use-analysis", () => ({
  useAnalysis: () => mockAnalysisState,
}));

import Home from "@/app/page";

describe("Page Composition — Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset analysis state to idle
    mockAnalysisState = {
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
      analyzeScenario: mockAnalyzeScenario,
      reset: mockReset,
      pipelineStatus: "idle",
      pipelineMessage: "",
      synthesisStatus: "idle",
    };

    // Mock GeoJSON fetch
    mockFetch.mockImplementation((url: string) => {
      if (url === "/countries.geojson") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: { ISO_A3: "EGY", NAME: "Egypt" },
                  geometry: { type: "Polygon", coordinates: [] },
                },
              ],
            }),
        });
      }
      if (url.includes("/api/country-data")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              name: "Egypt",
              iso3: "EGY",
              economics: { gdp: 400e9, population: 102e6, poverty_rate: 3.5, arable_land_pct: 3.6, energy_use_per_capita: 900, trade_pct_gdp: 44.2 },
              risk: { risk_score: 4.8, hazard_exposure: 5.2, vulnerability: 4.1, lack_of_coping_capacity: 5.3 },
              displacement: { refugees: 300000, asylum_seekers: 50000, idps: 0, stateless: 0 },
            }),
        });
      }
      return Promise.reject(new Error(`Unmocked fetch: ${url}`));
    });
  });

  // ── Layout Tests ────────────────────────────────────────────────────

  it("renders the CryoNexus header", () => {
    render(<Home />);
    expect(screen.getByText("CryoNexus")).toBeInTheDocument();
  });

  it("renders risk score and time horizon badges with dashes when idle", () => {
    render(<Home />);
    // Both Risk Score and Time Horizon show "—" in idle state
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBe(2);
  });

  it("renders map view", () => {
    render(<Home />);
    expect(screen.getByTestId("map-view")).toBeInTheDocument();
  });

  it("renders map controls and legend", () => {
    render(<Home />);
    expect(screen.getByTestId("map-controls")).toBeInTheDocument();
    expect(screen.getByTestId("map-legend")).toBeInTheDocument();
  });

  // ── Idle State ────────────────────────────────────────────────────

  it("shows idle message when no analysis is running", () => {
    render(<Home />);
    expect(
      screen.getByText("Enter a scenario above to begin analysis")
    ).toBeInTheDocument();
  });

  it("shows scenario input with textarea in idle state", () => {
    render(<Home />);
    expect(
      screen.getByPlaceholderText("Describe a catastrophic scenario...")
    ).toBeInTheDocument();
  });

  // ── Active Analysis State ──────────────────────────────────────────

  it("shows agent panel group when analysis is running", () => {
    mockAnalysisState.status = "analyzing";
    mockAnalysisState.scenario = "Test scenario";

    render(<Home />);

    // Should not show idle message
    expect(
      screen.queryByText("Enter a scenario above to begin analysis")
    ).not.toBeInTheDocument();

    // Should show the agent tabs (may appear in tab trigger + panel header)
    expect(screen.getAllByText("Geo").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Econ").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Food").length).toBeGreaterThanOrEqual(1);
  });

  it("shows collapsed scenario input during analysis", () => {
    mockAnalysisState.status = "analyzing";
    mockAnalysisState.scenario = "Suez Canal blocked";

    render(<Home />);

    expect(screen.getByText("Suez Canal blocked")).toBeInTheDocument();
    expect(screen.getByText("Analyzing")).toBeInTheDocument();
  });

  // ── Risk Score Display ─────────────────────────────────────────────

  it("displays compound risk score when complete", () => {
    mockAnalysisState.status = "complete";
    mockAnalysisState.scenario = "Test scenario";
    mockAnalysisState.compoundRiskScore = 73;

    render(<Home />);
    expect(screen.getByText("73")).toBeInTheDocument();
  });

  // ── Region Detail View ─────────────────────────────────────────────

  it("transitions to region detail when map country is clicked", async () => {
    mockAnalysisState.status = "complete";
    mockAnalysisState.scenario = "Test scenario";
    mockAnalysisState.agentResults = {
      geopolitics: {
        affected_countries: [
          { iso3: "EGY", impact_score: 7, stance: "allied", key_concerns: ["test"], alliance_impacts: ["test"] },
        ],
        conflict_zones: [],
        narrative: "test",
      },
    };

    render(<Home />);

    // Click the map (which triggers onCountryClick("EGY"))
    const mapView = screen.getByTestId("map-view");
    await act(async () => {
      fireEvent.click(mapView);
    });

    // Should show region detail after country data loads
    await waitFor(() => {
      expect(screen.getByText("Egypt")).toBeInTheDocument();
    });
  });

  it("returns to analysis view when back button is clicked", async () => {
    mockAnalysisState.status = "complete";
    mockAnalysisState.scenario = "Test scenario";
    mockAnalysisState.agentResults = {
      geopolitics: {
        affected_countries: [
          { iso3: "EGY", impact_score: 7, stance: "allied", key_concerns: ["test"], alliance_impacts: ["test"] },
        ],
        conflict_zones: [],
        narrative: "test",
      },
    };

    render(<Home />);

    // Click map to go to region detail
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-view"));
    });

    // Wait for country data to load
    await waitFor(() => {
      expect(screen.getByText("Egypt")).toBeInTheDocument();
    });

    // Click back button
    await act(async () => {
      fireEvent.click(screen.getByText("Back"));
    });

    // Should be back to analysis view - agent tabs visible
    await waitFor(() => {
      expect(screen.getAllByText("Geo").length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Layer Auto-Enable ──────────────────────────────────────────────

  it("auto-enables conflict layer when geopolitics completes", () => {
    mockAnalysisState.status = "analyzing";
    mockAnalysisState.scenario = "Test";
    mockAnalysisState.agentResults = {
      geopolitics: {
        affected_countries: [],
        conflict_zones: [],
        narrative: "test",
      },
    };

    render(<Home />);

    const controls = screen.getByTestId("map-controls");
    const toggles = JSON.parse(controls.getAttribute("data-toggles") || "{}");
    expect(toggles.conflict).toBe(true);
  });

  it("keeps default layers enabled", () => {
    render(<Home />);

    const controls = screen.getByTestId("map-controls");
    const toggles = JSON.parse(controls.getAttribute("data-toggles") || "{}");
    expect(toggles.choropleth).toBe(true);
    expect(toggles.heatmap).toBe(true);
    expect(toggles.tradeArcs).toBe(true);
  });

  // ── GeoJSON Loading ────────────────────────────────────────────────

  it("fetches countries.geojson on mount", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/countries.geojson");
    });
  });
});


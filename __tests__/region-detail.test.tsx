// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RegionDetail from "@/components/sidebar/RegionDetail";
import type { AgentResults } from "@/lib/types";

// Mock recharts to avoid canvas/SVG rendering issues in tests
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: () => <div />,
}));

const mockCountryData = {
  name: "Egypt",
  iso3: "EGY",
  economics: {
    gdp: 400000000000,
    population: 102000000,
    poverty_rate: 3.5,
    arable_land_pct: 3.6,
    energy_use_per_capita: 900,
    trade_pct_gdp: 44.2,
  },
  risk: {
    risk_score: 4.8,
    hazard_exposure: 5.2,
    vulnerability: 4.1,
    lack_of_coping_capacity: 5.3,
  },
  displacement: {
    refugees: 300000,
    asylum_seekers: 50000,
    idps: 0,
    stateless: 0,
  },
};

const mockAgentResults: AgentResults = {
  geopolitics: {
    affected_countries: [
      {
        iso3: "EGY",
        impact_score: 7,
        stance: "allied" as const,
        key_concerns: ["Canal access", "Regional stability"],
        alliance_impacts: ["NATO logistics"],
      },
    ],
    conflict_zones: [],
    narrative: "Egypt faces geopolitical pressure...",
  },
  economy: {
    affected_countries: [
      {
        iso3: "EGY",
        gdp_impact_pct: -2.1,
        trade_disruption: 9,
        key_sectors: ["energy", "tourism"],
        unemployment_risk: "high" as const,
      },
    ],
    trade_routes_disrupted: [],
    narrative: "Trade disruption severe...",
  },
  food_supply: {
    affected_countries: [
      {
        iso3: "EGY",
        food_security_impact: 8,
        population_at_risk: 30000000,
        primary_threats: ["supply chain disruption", "price spikes"],
        is_food_desert: false,
      },
    ],
    supply_chain_disruptions: [],
    narrative: "Food supply at risk...",
  },
  infrastructure: {
    affected_countries: [
      {
        iso3: "EGY",
        infrastructure_risk: 6,
        systems_at_risk: ["power" as const, "transport" as const],
        cascade_risk: 5,
      },
    ],
    outage_zones: [],
    narrative: "Infrastructure strained...",
  },
  civilian_impact: {
    affected_countries: [
      {
        iso3: "EGY",
        humanitarian_score: 8,
        displaced_estimate: 200000,
        health_risk: 6,
        vulnerable_groups: ["refugees", "children"],
      },
    ],
    displacement_flows: [],
    narrative: "Civilian impact significant...",
  },
};

describe("RegionDetail", () => {
  it("renders country name", () => {
    render(
      <RegionDetail
        iso3="EGY"
        agentResults={mockAgentResults}
        countryData={mockCountryData}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText("Egypt")).toBeInTheDocument();
  });

  it("renders flag emoji for known ISO3 codes", () => {
    const { container } = render(
      <RegionDetail
        iso3="EGY"
        agentResults={mockAgentResults}
        countryData={mockCountryData}
        onBack={vi.fn()}
      />
    );

    // EGY should render a flag emoji (🇪🇬)
    const flagElement = container.querySelector(".text-2xl");
    expect(flagElement).toBeTruthy();
  });

  it("renders bar chart container", () => {
    render(
      <RegionDetail
        iso3="EGY"
        agentResults={mockAgentResults}
        countryData={mockCountryData}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("renders domain analysis section with 5 domains", () => {
    render(
      <RegionDetail
        iso3="EGY"
        agentResults={mockAgentResults}
        countryData={mockCountryData}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText("Domain Analysis")).toBeInTheDocument();
    expect(screen.getByText("Geopolitics")).toBeInTheDocument();
    expect(screen.getByText("Economy")).toBeInTheDocument();
    expect(screen.getByText("Food Supply")).toBeInTheDocument();
    expect(screen.getByText("Infrastructure")).toBeInTheDocument();
    expect(screen.getByText("Civilian")).toBeInTheDocument();
  });

  it("shows correct domain scores from agent results", () => {
    render(
      <RegionDetail
        iso3="EGY"
        agentResults={mockAgentResults}
        countryData={mockCountryData}
        onBack={vi.fn()}
      />
    );

    // Check that scores are displayed
    expect(screen.getByText("7/10")).toBeInTheDocument(); // geopolitics impact_score
    expect(screen.getByText("9/10")).toBeInTheDocument(); // economy trade_disruption
    // 8/10 appears twice (food_supply=8, civilian=8)
    expect(screen.getAllByText("8/10")).toHaveLength(2);
    expect(screen.getByText("6/10")).toBeInTheDocument(); // infrastructure
  });

  it("renders Back button that calls onBack", () => {
    const onBack = vi.fn();
    render(
      <RegionDetail
        iso3="EGY"
        agentResults={mockAgentResults}
        countryData={mockCountryData}
        onBack={onBack}
      />
    );

    const backButton = screen.getByText("Back");
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders key statistics", () => {
    render(
      <RegionDetail
        iso3="EGY"
        agentResults={mockAgentResults}
        countryData={mockCountryData}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText("Key Statistics")).toBeInTheDocument();
    expect(screen.getByText("Population")).toBeInTheDocument();
    expect(screen.getByText("GDP")).toBeInTheDocument();
    expect(screen.getByText("Displacement")).toBeInTheDocument();
    expect(screen.getByText("Risk Index")).toBeInTheDocument();
  });

  it("handles missing agent data gracefully", () => {
    render(
      <RegionDetail
        iso3="XYZ"
        agentResults={{}}
        countryData={null}
        onBack={vi.fn()}
      />
    );

    // Should render iso3 as name fallback
    expect(screen.getByText("XYZ")).toBeInTheDocument();
    // Should show "No data available" for all domains
    const noDataElements = screen.getAllByText("No data available");
    expect(noDataElements.length).toBe(5); // one per domain
  });

  it("formats population as millions", () => {
    render(
      <RegionDetail
        iso3="EGY"
        agentResults={mockAgentResults}
        countryData={mockCountryData}
        onBack={vi.fn()}
      />
    );

    // 102,000,000 should be formatted as 102.0M
    expect(screen.getByText("102.0M")).toBeInTheDocument();
  });

  it("formats GDP as currency", () => {
    render(
      <RegionDetail
        iso3="EGY"
        agentResults={mockAgentResults}
        countryData={mockCountryData}
        onBack={vi.fn()}
      />
    );

    // 400,000,000,000 should be formatted as $400.0B
    expect(screen.getByText("$400.0B")).toBeInTheDocument();
  });

  it("shows domain-specific summaries", () => {
    render(
      <RegionDetail
        iso3="EGY"
        agentResults={mockAgentResults}
        countryData={mockCountryData}
        onBack={vi.fn()}
      />
    );

    // Geopolitics summary mentions stance
    expect(screen.getByText(/Stance: allied/)).toBeInTheDocument();
    // Economy summary mentions GDP impact
    expect(screen.getByText(/GDP Impact: -2.1%/)).toBeInTheDocument();
  });
});


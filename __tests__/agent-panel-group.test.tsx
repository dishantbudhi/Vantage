// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AgentPanelGroup from "@/components/sidebar/AgentPanelGroup";
import type { AgentName, AgentStatus } from "@/lib/types";

// Mock react-markdown
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

const defaultAgentTexts: Record<AgentName, string> = {
  geopolitics: "Geo text",
  economy: "Econ text",
  food_supply: "Food text",
  infrastructure: "Infra text",
  civilian_impact: "Civ text",
  synthesis: "Synth text",
};

const defaultAgentStatuses: Record<AgentName, AgentStatus> = {
  geopolitics: "complete",
  economy: "streaming",
  food_supply: "idle",
  infrastructure: "error",
  civilian_impact: "complete",
  synthesis: "idle",
};

describe("AgentPanelGroup", () => {
  it("renders all 6 tab triggers (5 agents + synthesis)", () => {
    render(
      <AgentPanelGroup
        agentTexts={defaultAgentTexts}
        agentStatuses={defaultAgentStatuses}
        synthesisText="Test"
        synthesisStatus="idle"
        activeTab="geopolitics"
        onTabChange={vi.fn()}
      />
    );

    // Labels appear in both tab trigger and active panel header, so use getAllByText
    expect(screen.getAllByText("Geo").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Econ").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Food").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Infr").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Civ").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Synthesis").length).toBeGreaterThanOrEqual(1);

    // All 6 tabs should render as tab role elements
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(6);
  });

  it("shows complete checkmark for completed agents", () => {
    render(
      <AgentPanelGroup
        agentTexts={defaultAgentTexts}
        agentStatuses={defaultAgentStatuses}
        synthesisText=""
        synthesisStatus="idle"
        activeTab="geopolitics"
        onTabChange={vi.fn()}
      />
    );

    // Geopolitics and civilian_impact are complete — should have ✓
    const checkmarks = screen.getAllByText("✓");
    expect(checkmarks.length).toBeGreaterThanOrEqual(2);
  });

  it("shows error indicator for errored agents", () => {
    render(
      <AgentPanelGroup
        agentTexts={defaultAgentTexts}
        agentStatuses={defaultAgentStatuses}
        synthesisText=""
        synthesisStatus="idle"
        activeTab="geopolitics"
        onTabChange={vi.fn()}
      />
    );

    // Infrastructure is error — should have ✗
    const errorIndicators = screen.getAllByText("✗");
    expect(errorIndicators.length).toBeGreaterThanOrEqual(1);
  });

  it("renders clickable tabs with correct data attributes", () => {
    const onTabChange = vi.fn();
    render(
      <AgentPanelGroup
        agentTexts={defaultAgentTexts}
        agentStatuses={defaultAgentStatuses}
        synthesisText=""
        synthesisStatus="idle"
        activeTab="geopolitics"
        onTabChange={onTabChange}
      />
    );

    // Verify tabs have the correct role and content
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(6);

    // The active tab (geopolitics) should have data-state="active"
    const activeTab = tabs.find((t) => t.getAttribute("data-state") === "active");
    expect(activeTab).toBeDefined();
    expect(activeTab!.textContent).toContain("Geo");

    // Economy tab should be inactive
    const econTab = tabs.find((t) => t.textContent?.includes("Econ"));
    expect(econTab).toBeDefined();
    expect(econTab!.getAttribute("data-state")).toBe("inactive");
  });

  it("renders agent panel content for active tab", () => {
    render(
      <AgentPanelGroup
        agentTexts={defaultAgentTexts}
        agentStatuses={defaultAgentStatuses}
        synthesisText=""
        synthesisStatus="idle"
        activeTab="geopolitics"
        onTabChange={vi.fn()}
      />
    );

    // The geopolitics panel should display its text
    expect(screen.getByText("Geo text")).toBeInTheDocument();
  });
});


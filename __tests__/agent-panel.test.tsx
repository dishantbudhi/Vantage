// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AgentPanel from "@/components/sidebar/AgentPanel";

// Mock react-markdown
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

describe("AgentPanel", () => {
  it("renders agent label and color dot", () => {
    render(
      <AgentPanel agentName="geopolitics" streamingText="" status="idle" />
    );
    expect(screen.getByText("Geo")).toBeInTheDocument();
  });

  it("shows idle message when status is idle", () => {
    render(
      <AgentPanel agentName="geopolitics" streamingText="" status="idle" />
    );
    expect(screen.getByText("Waiting for analysis...")).toBeInTheDocument();
  });

  it("shows streaming indicator when status is streaming", () => {
    const { container } = render(
      <AgentPanel agentName="economy" streamingText="Analysis..." status="streaming" />
    );
    // Should have the pulsing green dot (animate-ping class)
    const pingElement = container.querySelector(".animate-ping");
    expect(pingElement).toBeTruthy();
  });

  it("shows checkmark when status is complete", () => {
    render(
      <AgentPanel agentName="food_supply" streamingText="Done." status="complete" />
    );
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows error indicator when status is error", () => {
    render(
      <AgentPanel agentName="infrastructure" streamingText="" status="error" />
    );
    expect(screen.getByText("✗")).toBeInTheDocument();
  });

  it("renders streaming text via ReactMarkdown when not idle", () => {
    render(
      <AgentPanel agentName="civilian_impact" streamingText="# Heading" status="streaming" />
    );
    expect(screen.getByTestId("markdown")).toHaveTextContent("# Heading");
  });

  it("renders synthesis agent label", () => {
    render(
      <AgentPanel agentName="synthesis" streamingText="" status="idle" />
    );
    expect(screen.getByText("Synthesis")).toBeInTheDocument();
  });
});


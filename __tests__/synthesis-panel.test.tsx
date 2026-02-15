// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SynthesisPanel from "@/components/sidebar/SynthesisPanel";

// Mock react-markdown
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

describe("SynthesisPanel", () => {
  it("renders the Synthesis title", () => {
    render(
      <SynthesisPanel synthesisText="" compoundRiskScore={null} isComplete={false} />
    );
    expect(screen.getByText("Synthesis")).toBeInTheDocument();
  });

  it("shows awaiting message when no synthesis text", () => {
    render(
      <SynthesisPanel synthesisText="" compoundRiskScore={null} isComplete={false} />
    );
    expect(screen.getByText("Awaiting synthesis analysis...")).toBeInTheDocument();
  });

  it("renders synthesis text via ReactMarkdown", () => {
    render(
      <SynthesisPanel synthesisText="# Risk Assessment" compoundRiskScore={null} isComplete={false} />
    );
    expect(screen.getByTestId("markdown")).toHaveTextContent("# Risk Assessment");
  });

  it("shows risk score of 0 when not complete", () => {
    render(
      <SynthesisPanel synthesisText="" compoundRiskScore={null} isComplete={false} />
    );
    // AnimatedRiskScore shows 0 when not complete
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders Risk Score label", () => {
    render(
      <SynthesisPanel synthesisText="" compoundRiskScore={73} isComplete={true} />
    );
    expect(screen.getByText("Risk Score")).toBeInTheDocument();
  });

  it("displays Low badge for low scores", () => {
    // When isComplete is false, displayScore stays at 0 which is <= 40 (low threshold)
    render(
      <SynthesisPanel synthesisText="" compoundRiskScore={20} isComplete={false} />
    );
    expect(screen.getByText("Low")).toBeInTheDocument();
  });
});


// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScenarioInput from "@/components/sidebar/ScenarioInput";

describe("ScenarioInput", () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    isAnalyzing: false,
    currentScenario: null as string | null,
    onReset: vi.fn(),
  };

  it("renders textarea in idle state", () => {
    render(<ScenarioInput {...defaultProps} />);
    expect(screen.getByPlaceholderText("Describe a catastrophic scenario...")).toBeInTheDocument();
  });

  it("renders Analyze button", () => {
    render(<ScenarioInput {...defaultProps} />);
    expect(screen.getByText("Analyze")).toBeInTheDocument();
  });

  it("disables Analyze button when input is empty", () => {
    render(<ScenarioInput {...defaultProps} />);
    const button = screen.getByText("Analyze");
    expect(button).toBeDisabled();
  });

  it("enables Analyze button when input has text", () => {
    render(<ScenarioInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Describe a catastrophic scenario...");
    fireEvent.change(textarea, { target: { value: "Test scenario" } });
    const button = screen.getByText("Analyze");
    expect(button).not.toBeDisabled();
  });

  it("shows character count", () => {
    render(<ScenarioInput {...defaultProps} />);
    expect(screen.getByText("0/500")).toBeInTheDocument();
  });

  it("updates character count on input", () => {
    render(<ScenarioInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Describe a catastrophic scenario...");
    fireEvent.change(textarea, { target: { value: "Hello world" } });
    expect(screen.getByText("11/500")).toBeInTheDocument();
  });

  it("calls onSubmit when Analyze is clicked", () => {
    const onSubmit = vi.fn();
    render(<ScenarioInput {...defaultProps} onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText("Describe a catastrophic scenario...");
    fireEvent.change(textarea, { target: { value: "Test scenario" } });
    fireEvent.click(screen.getByText("Analyze"));
    expect(onSubmit).toHaveBeenCalledWith("Test scenario");
  });

  it("submits on Enter key (not Shift+Enter)", () => {
    const onSubmit = vi.fn();
    render(<ScenarioInput {...defaultProps} onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText("Describe a catastrophic scenario...");
    fireEvent.change(textarea, { target: { value: "Test" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onSubmit).toHaveBeenCalledWith("Test");
  });

  it("does not submit on Shift+Enter", () => {
    const onSubmit = vi.fn();
    render(<ScenarioInput {...defaultProps} onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText("Describe a catastrophic scenario...");
    fireEvent.change(textarea, { target: { value: "Test" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders golden-path scenario chips", () => {
    render(<ScenarioInput {...defaultProps} />);
    // Should have 3 golden-path buttons (text may be truncated at 30 chars)
    const buttons = screen.getAllByRole("button");
    // Analyze + 3 chips = at least 4 buttons
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it("shows collapsed state with current scenario", () => {
    render(
      <ScenarioInput
        {...defaultProps}
        currentScenario="Suez Canal blocked"
      />
    );
    expect(screen.getByText("Suez Canal blocked")).toBeInTheDocument();
    expect(screen.getByText("New Scenario")).toBeInTheDocument();
  });

  it("shows 'Analyzing' label when analyzing", () => {
    render(
      <ScenarioInput
        {...defaultProps}
        currentScenario="Test"
        isAnalyzing={true}
      />
    );
    expect(screen.getByText("Analyzing")).toBeInTheDocument();
  });

  it("disables New Scenario button when analyzing", () => {
    render(
      <ScenarioInput
        {...defaultProps}
        currentScenario="Test"
        isAnalyzing={true}
      />
    );
    expect(screen.getByText("New Scenario")).toBeDisabled();
  });

  it("calls onReset when New Scenario is clicked", () => {
    const onReset = vi.fn();
    render(
      <ScenarioInput
        {...defaultProps}
        currentScenario="Test"
        onReset={onReset}
      />
    );
    fireEvent.click(screen.getByText("New Scenario"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});


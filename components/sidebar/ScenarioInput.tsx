"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GOLDEN_PATH_SCENARIOS } from "./constants";

interface ScenarioInputProps {
  onSubmit: (scenario: string) => void;
  isAnalyzing: boolean;
  currentScenario: string | null;
  onReset: () => void;
}

export default function ScenarioInput({
  onSubmit,
  isAnalyzing,
  currentScenario,
  onReset,
}: ScenarioInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (trimmed.length >= 1 && trimmed.length <= 500) {
      onSubmit(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChipClick = (scenario: string) => {
    setInputValue(scenario);
  };

  // Show collapsed state when we have a current scenario (both during and after analysis)
  if (currentScenario) {
    return (
      <div className="flex flex-col gap-2 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {isAnalyzing ? "Analyzing" : "Scenario"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={isAnalyzing}
            className="text-xs h-7"
          >
            New Scenario
          </Button>
        </div>
        <p className="text-sm font-medium text-card-foreground line-clamp-2">
          {currentScenario}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <Textarea
        placeholder="Describe a catastrophic scenario..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isAnalyzing}
        rows={3}
        className="resize-none"
      />
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {inputValue.trim().length}/500
        </span>
        <Button
          onClick={handleSubmit}
          disabled={isAnalyzing || inputValue.trim().length < 1}
          className="bg-primary hover:bg-primary/90"
        >
          {isAnalyzing ? "Analyzing..." : "Analyze"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {Object.values(GOLDEN_PATH_SCENARIOS).map((scenario) => (
          <button
            key={scenario}
            onClick={() => handleChipClick(scenario)}
            disabled={isAnalyzing}
            className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
          >
            {scenario.length > 30 ? `${scenario.slice(0, 30)}...` : scenario}
          </button>
        ))}
      </div>
    </div>
  );
}

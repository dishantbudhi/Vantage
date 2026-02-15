"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RISK_SCORE_THRESHOLDS } from "./constants";

interface SynthesisPanelProps {
  synthesisText: string;
  compoundRiskScore: number | null;
  isComplete: boolean;
}

function AnimatedRiskScore({
  targetScore,
  isComplete,
}: {
  targetScore: number | null;
  isComplete: boolean;
}) {
  const [displayScore, setDisplayScore] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isComplete || targetScore === null) {
      setDisplayScore(0);
      return;
    }

    const duration = 1500;
    const startTime = performance.now();
    const startScore = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.round(startScore + (targetScore - startScore) * easeOut);
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
  }, [targetScore, isComplete]);

  const getScoreColor = (score: number) => {
    if (score <= RISK_SCORE_THRESHOLDS.low) return "bg-green-500";
    if (score <= RISK_SCORE_THRESHOLDS.medium) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreTextColor = (score: number) => {
    if (score <= RISK_SCORE_THRESHOLDS.low) return "text-green-500";
    if (score <= RISK_SCORE_THRESHOLDS.medium) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-border"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={175.93}
            strokeDashoffset={175.93 - (175.93 * displayScore) / 100}
            className={`transition-colors duration-300 ${getScoreTextColor(displayScore)}`}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${getScoreTextColor(displayScore)}`}
        >
          {displayScore}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Risk Score</span>
        <Badge className={`${getScoreColor(displayScore)} w-fit mt-1`}>
          {displayScore <= RISK_SCORE_THRESHOLDS.low
            ? "Low"
            : displayScore <= RISK_SCORE_THRESHOLDS.medium
            ? "Medium"
            : "Critical"}
        </Badge>
      </div>
    </div>
  );
}

export default function SynthesisPanel({
  synthesisText,
  compoundRiskScore,
  isComplete,
}: SynthesisPanelProps) {
  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Synthesis</CardTitle>
          <AnimatedRiskScore
            targetScore={compoundRiskScore}
            isComplete={isComplete}
          />
        </div>
      </CardHeader>
      <CardContent className="overflow-y-auto">
        {synthesisText ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{synthesisText}</ReactMarkdown>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">
            Awaiting synthesis analysis...
          </span>
        )}
      </CardContent>
    </Card>
  );
}

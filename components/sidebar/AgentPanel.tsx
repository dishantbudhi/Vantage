"use client";

import ReactMarkdown from "react-markdown";
import type { AgentName, AgentStatus } from "@/lib/types";
import { AGENT_LABELS, AGENT_COLORS } from "./constants";

interface AgentPanelProps {
  agentName: AgentName | "synthesis";
  streamingText: string;
  status: AgentStatus;
}

function StatusIndicator({ status }: { status: AgentStatus }) {
  switch (status) {
    case "streaming":
      return (
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      );
    case "complete":
      return <span className="text-green-500">✓</span>;
    case "error":
      return <span className="text-red-500">✗</span>;
    default:
      return <span className="text-muted-foreground">○</span>;
  }
}

export default function AgentPanel({
  agentName,
  streamingText,
  status,
}: AgentPanelProps) {
  const label = AGENT_LABELS[agentName];
  const color = AGENT_COLORS[agentName];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="font-medium text-sm">{label}</span>
        <StatusIndicator status={status} />
      </div>
      
      <div className="flex-1 overflow-y-auto mt-3 prose prose-invert prose-sm max-w-none">
        {status === "idle" ? (
          <span className="text-muted-foreground text-sm">
            Waiting for analysis...
          </span>
        ) : (
          <ReactMarkdown>{streamingText}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}

"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AgentName, AgentStatus } from "@/lib/types";
import { AGENT_LABELS, AGENT_COLORS } from "./constants";
import AgentPanel from "./AgentPanel";

interface AgentPanelGroupProps {
  agentTexts: Record<AgentName, string>;
  agentStatuses: Record<AgentName, AgentStatus>;
  synthesisText: string;
  synthesisStatus: AgentStatus;
  activeTab: AgentName | "synthesis";
  onTabChange: (tab: AgentName | "synthesis") => void;
}

const AGENTS: AgentName[] = [
  "geopolitics",
  "economy",
  "food_supply",
  "infrastructure",
  "civilian_impact",
];

function TabStatusIndicator({ status }: { status: AgentStatus }) {
  switch (status) {
    case "streaming":
      return (
        <span className="relative flex h-2 w-2 ml-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      );
    case "complete":
      return <span className="text-green-500 ml-1 text-xs">✓</span>;
    case "error":
      return <span className="text-red-500 ml-1 text-xs">✗</span>;
    default:
      return null;
  }
}

export default function AgentPanelGroup({
  agentTexts,
  agentStatuses,
  synthesisText,
  synthesisStatus,
  activeTab,
  onTabChange,
}: AgentPanelGroupProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as AgentName | "synthesis")}
      className="flex flex-col h-full"
    >
      <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-transparent border-b border-border rounded-none">
        {AGENTS.map((agent) => (
          <TabsTrigger
            key={agent}
            value={agent}
            className="flex items-center gap-1 px-2 py-1 text-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: AGENT_COLORS[agent] }}
            />
            {AGENT_LABELS[agent]}
            <TabStatusIndicator status={agentStatuses[agent]} />
          </TabsTrigger>
        ))}
        <TabsTrigger
          value="synthesis"
          className="flex items-center gap-1 px-2 py-1 text-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
        >
          {AGENT_LABELS.synthesis}
          <TabStatusIndicator status={synthesisStatus} />
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-hidden">
        {AGENTS.map((agent) => (
          <TabsContent key={agent} value={agent} className="h-full mt-0">
            <div className="h-full p-2">
              <AgentPanel
                agentName={agent}
                streamingText={agentTexts[agent]}
                status={agentStatuses[agent]}
              />
            </div>
          </TabsContent>
        ))}
        <TabsContent value="synthesis" className="h-full mt-0">
          <div className="h-full p-2">
            <AgentPanel
              agentName="synthesis"
              streamingText={synthesisText}
              status={synthesisStatus}
            />
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}

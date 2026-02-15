import type {
    OrchestratorOutput,
    GeopoliticsOutput,
    EconomyOutput,
    FoodSupplyOutput,
    InfrastructureOutput,
    CivilianImpactOutput,
    SynthesisOutput,
} from "./agents/schemas";

// ── Agent Name Union ───────────────────────────────────────────────

export type AgentName =
    | "geopolitics"
    | "economy"
    | "food_supply"
    | "infrastructure"
    | "civilian_impact"
    | "synthesis";

// ── SSE Event Discriminated Unions ─────────────────────────────────

export type SSEOrchestratorEvent = {
    type: "orchestrator";
    data: OrchestratorOutput;
};

export type SSEAgentChunkEvent = {
    type: "agent_chunk";
    data: { agent: AgentName; chunk: string };
};

export type SSEAgentCompleteEvent = {
    type: "agent_complete";
    data: { agent: AgentName; structured: AgentOutput | SynthesisOutput; narrative?: string };
};

export type SSESynthesisChunkEvent = {
    type: "synthesis_chunk";
    data: { chunk: string };
};

export type SSECompleteEvent = {
    type: "complete";
    data: { compound_risk_score: number };
};

export type SSEErrorEvent = {
    type: "error";
    data: { message: string; agent?: AgentName };
};

export type SSEStatusEvent = {
    type: "status";
    data: { status: "orchestrating" | "analyzing" | "synthesizing"; message: string };
};

export type SSEEvent =
    | SSEOrchestratorEvent
    | SSEAgentChunkEvent
    | SSEAgentCompleteEvent
    | SSESynthesisChunkEvent
    | SSECompleteEvent
    | SSEErrorEvent
    | SSEStatusEvent;

// ── Agent Output Union ─────────────────────────────────────────────

export type AgentOutput =
    | GeopoliticsOutput
    | EconomyOutput
    | FoodSupplyOutput
    | InfrastructureOutput
    | CivilianImpactOutput;

// ── Agent Results Map ──────────────────────────────────────────────

export type AgentResults = Partial<Record<AgentName, AgentOutput>>;

// ── Agent Status ───────────────────────────────────────────────────

export type AgentStatus = "idle" | "streaming" | "complete" | "error";

// ── Analysis State ─────────────────────────────────────────────────

export interface AnalysisState {
    /** Current pipeline status */
    status: "idle" | "analyzing" | "complete" | "error";

    /** The scenario being analyzed */
    scenario: string | null;

    /** Orchestrator output (available after orchestrator completes) */
    orchestratorOutput: OrchestratorOutput | null;

    /** Streaming text per agent (appended token-by-token) */
    agentTexts: Record<AgentName, string>;

    /** Structured output per agent (available after agent completes) */
    agentResults: AgentResults;

    /** Per-agent status */
    agentStatuses: Record<AgentName, AgentStatus>;

    /** Synthesis streaming text */
    synthesisText: string;

    /** Structured synthesis output */
    synthesisOutput: SynthesisOutput | null;

    /** Final compound risk score (1–100) */
    compoundRiskScore: number | null;

    /** Errors encountered during analysis */
    errors: Array<{ message: string; agent?: AgentName }>;
}

// ── Analysis Callbacks ─────────────────────────────────────────────

export interface AnalysisCallbacks {
    onOrchestrator: (data: OrchestratorOutput) => void;
    onAgentChunk: (agent: AgentName, chunk: string) => void;
    onAgentComplete: (agent: AgentName, structured: AgentOutput) => void;
    onSynthesisChunk: (chunk: string) => void;
    onComplete: (score: number) => void;
    onError: (message: string, agent?: AgentName) => void;
}

// ── Layer Toggle State ─────────────────────────────────────────────

export type LayerName =
    | "choropleth"
    | "heatmap"
    | "conflict"
    | "foodDesert"
    | "infrastructure"
    | "tradeArcs"
    | "displacementArcs";

export type LayerToggleState = Record<LayerName, boolean>;

// ── View State (Map Camera) ────────────────────────────────────────

export interface ViewState {
    latitude: number;
    longitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
    transitionDuration?: number;
    padding?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    width?: number;
    height?: number;
}

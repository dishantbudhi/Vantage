# AI Agent Prompt: Build MVP Spec for "CryoNexus" — Multi-Agent Catastrophic Risk Simulation Platform

You are an expert systems architect and full-stack engineer. Your task is to produce a **complete, implementation-ready MVP specification document** for a 48-hour hackathon project called **CryoNexus** — an interactive multi-agent simulation platform where users input hypothetical catastrophic scenarios and watch AI agents analyze cascading impacts across geopolitics, economy, food systems, infrastructure, and civilian welfare, all visualized on a real-time interactive map.

This spec must be detailed enough that a team of 3-4 developers can open it at hour 0 of the hackathon and start building immediately with zero ambiguity about what to build, how to build it, or who builds what.

---

## PROJECT VISION

CryoNexus is a web application with two core components:

1. **A natural language scenario input** where users describe hypothetical events (geopolitical crises, natural disasters, infrastructure failures, climate events, etc.)
2. **An interactive world map** that dynamically visualizes the cascading impacts of that scenario across multiple domains, powered by 5+ specialized AI agents analyzing the scenario in parallel and streaming their analysis to the UI in real-time

### Example Scenarios the System Must Handle
- "Russia elects an AI agent as its leader" → agents analyze impact on Ukraine conflict, civilian welfare, geopolitical tensions, trade agreements, food supply chains, global economy
- "Texas loses power due to grid strain" → agents analyze impact on civilians, data centers, economy, interstate mutual aid, government intervention, supply chains
- "Ice caps melt causing 2m sea level rise in Greenland" → agents analyze geopolitical reactions, NATO response, economic impact, displacement, food security in affected nations
- "Suez Canal blocked during South Asian heat wave" → agents analyze trade disruption, energy prices, food supply chains, humanitarian impact, diplomatic responses

### Core User Experience
1. User types or selects a scenario
2. Map zooms to affected region(s)
3. 5 agent analysis panels stream results token-by-token in a sidebar
4. Map overlays animate simultaneously: conflict zones (red), food deserts (orange), power outages (dark), displacement flows (animated arcs), economic impact (choropleth)
5. A synthesis agent produces a unified assessment
6. User clicks any affected region on the map → sidebar shows detailed breakdown for that specific region across all 5 dimensions
7. User can modify parameters (escalation level, time horizon) → agents re-analyze

---

## TECHNICAL CONSTRAINTS

- **Build time**: 48 hours total, feature-freeze at hour 30
- **Team**: 3-4 developers (mixed frontend/backend/AI skills)
- **Target judges**: Engineering leaders at Snowflake who value data architecture, streaming pipelines, and systems thinking
- **Deployment**: Must be live-demoed, not just screenshots
- **Budget**: ~$100 total for API costs during development + demo

---

## TECH STACK (LOCKED DECISIONS)

### Frontend
- **Next.js 15** (App Router) with TypeScript
- **MapLibre GL JS** via `react-map-gl/maplibre` for the base map (open-source, zero cost)
- **deck.gl** (`@deck.gl/react`, `@deck.gl/layers`, `@deck.gl/geo-layers`, `@deck.gl/aggregation-layers`) for data visualization layers on top of MapLibre
- **Free tile provider**: MapTiler free tier (requires API key, 100k tile requests/month free) OR Protomaps self-hosted tiles
- **shadcn/ui** + **Tailwind CSS** for UI components
- **Recharts** for mini-charts in the detail sidebar
- Dark theme throughout (looks professional on stage, reduces map visual noise)

### Agent Orchestration
- **OpenAI Responses API** for all LLM calls (GPT-4.1-mini for specialist agents, GPT-4.1 for orchestrator + synthesis)
- Alternatively: **Vercel AI SDK 6** if the team prefers its `Agent` class with built-in SSE streaming and React hooks
- Agent coordination pattern: **fan-out parallel execution** — orchestrator dispatches to all 5 specialist agents simultaneously via `Promise.allSettled()` or `asyncio.gather()`, then a synthesis agent consumes all outputs
- Each agent receives: the user scenario, relevant pre-loaded data context for their domain, and a structured output schema (JSON)

### Data Layer
- **Pre-loaded static data** (loaded at build time or app startup, NOT fetched live during demo):
  - Natural Earth GeoJSON (110m resolution) for country/region boundaries
  - WRI Global Power Plant Database (~35,000 plants, single CSV)
  - INFORM Global Risk Index (191 countries, Excel → JSON at build time)
  - World Bank indicators: GDP, population, poverty rate, arable land, energy use, trade balance for all countries (bulk pre-fetched via World Bank API v2)
  - UNHCR displacement data (pre-fetched via api.unhcr.org)
  - USDA food security indicators (pre-loaded)
- **Live API calls** (only 1-2, for demo impact):
  - GDELT DOC 2.0 API (`api.gdeltproject.org/api/v2/doc/doc`) — real-time geopolitical event search, no auth needed, returns JSON
  - Open-Meteo API — current weather/climate data for affected regions, no auth needed
- **No database needed** — all state lives in React state + server memory during the session

### Deployment
- **Vercel** for the Next.js app (free tier, single `git push` deploy)
- Environment variables for API keys (OpenAI, MapTiler)

---

## DETAILED ARCHITECTURE SPECIFICATION

### 1. Project Structure

Produce a complete file tree for a Next.js 15 App Router project with the following organization:

```
cryonexus/
├── app/
│   ├── layout.tsx           # Root layout with dark theme, fonts
│   ├── page.tsx             # Main app page (map + sidebar)
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts     # POST endpoint: accepts scenario, streams agent results via SSE
│   └── globals.css
├── components/
│   ├── map/
│   │   ├── MapView.tsx              # MapLibre + deck.gl integration
│   │   ├── layers/
│   │   │   ├── ChoroplethLayer.tsx  # Country-level impact coloring
│   │   │   ├── ConflictLayer.tsx    # Conflict zone overlays
│   │   │   ├── DisplacementArcs.tsx # Animated arc layer for migration/displacement
│   │   │   ├── InfrastructureLayer.tsx # Power plants, critical infra markers
│   │   │   └── HeatmapLayer.tsx     # Risk intensity heatmap
│   │   └── MapControls.tsx          # Zoom, layer toggles
│   ├── sidebar/
│   │   ├── ScenarioInput.tsx        # Text input + pre-built scenario buttons
│   │   ├── AgentPanel.tsx           # Single agent's streaming output
│   │   ├── AgentPanelGroup.tsx      # All 5 agents in tabs or accordion
│   │   ├── SynthesisPanel.tsx       # Final synthesis output
│   │   └── RegionDetail.tsx         # Click-on-region detail view
│   └── ui/                          # shadcn/ui components
├── lib/
│   ├── agents/
│   │   ├── orchestrator.ts          # Fan-out to all agents, collect results
│   │   ├── geopolitics-agent.ts     # System prompt + tool definitions
│   │   ├── economy-agent.ts
│   │   ├── food-supply-agent.ts
│   │   ├── infrastructure-agent.ts
│   │   ├── civilian-impact-agent.ts
│   │   ├── synthesis-agent.ts
│   │   └── schemas.ts               # Zod schemas for structured agent outputs
│   ├── data/
│   │   ├── loader.ts                # Load and parse all pre-loaded datasets
│   │   ├── countries.json           # Natural Earth GeoJSON (pre-processed)
│   │   ├── power-plants.json        # WRI data (pre-processed)
│   │   ├── risk-index.json          # INFORM data (pre-processed)
│   │   ├── economic-indicators.json # World Bank data (pre-processed)
│   │   └── displacement.json        # UNHCR data (pre-processed)
│   ├── gdelt.ts                     # GDELT API client
│   └── types.ts                     # Shared TypeScript types
├── scripts/
│   └── preload-data.ts              # Script to fetch and cache all static data
├── public/
│   └── map-style.json               # MapLibre style spec
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── .env.local                       # OPENAI_API_KEY, MAPTILER_KEY
```

### 2. Agent Architecture

Define **6 agents** with the following specifications:

#### Orchestrator Agent (GPT-4.1)
- **Role**: Parse the user's natural language scenario into a structured event description, identify affected regions (as ISO 3166 country codes + lat/lon coordinates), determine time horizon, and dispatch to specialist agents
- **Input**: Raw user text
- **Output schema** (Zod):
```typescript
{
  scenario_summary: string,           // 1-2 sentence clean description
  primary_regions: string[],          // ISO 3166-1 alpha-3 codes
  secondary_regions: string[],        // Indirectly affected
  coordinates: { lat: number, lon: number }, // Map center point
  zoom_level: number,                 // 1-18
  time_horizon: "immediate" | "weeks" | "months" | "years",
  severity: 1-10,
  event_categories: ("geopolitical" | "climate" | "infrastructure" | "economic" | "health")[],
  context_queries: {                  // What to search GDELT for
    geopolitics: string,
    economy: string,
    food: string,
    infrastructure: string,
    civilian: string
  }
}
```
- **Behavior**: This agent runs FIRST. Its output becomes input to all 5 specialist agents.

#### Specialist Agents (5x, GPT-4.1-mini, run in parallel)

Each specialist agent receives:
1. The orchestrator's structured scenario description
2. Pre-loaded data relevant to their domain for the affected regions (filtered from the static datasets)
3. Optionally, live GDELT search results for their domain query
4. A system prompt defining their expertise and analytical framework

Each specialist agent must produce TWO outputs:
1. **Narrative analysis** (streaming text, 200-400 words) — displayed in the sidebar
2. **Structured impact data** (JSON) — consumed by the map visualization layers

**Geopolitics Agent:**
- System prompt: Expert in international relations, alliances, treaties, sanctions, military posture, diplomatic dynamics
- Structured output schema:
```typescript
{
  affected_countries: Array<{
    iso3: string,
    impact_score: 1-10,        // Overall geopolitical impact
    stance: "allied" | "opposed" | "neutral" | "destabilized",
    key_concerns: string[],
    alliance_impacts: string[]  // e.g., "NATO Article 5 implications"
  }>,
  conflict_zones: Array<{
    coordinates: [number, number],
    radius_km: number,
    intensity: 1-10,
    type: "active_conflict" | "tension" | "diplomatic_crisis"
  }>,
  narrative: string
}
```

**Economy Agent:**
- System prompt: Expert in macroeconomics, trade, financial markets, supply chains, sanctions, commodity markets
- Structured output schema:
```typescript
{
  affected_countries: Array<{
    iso3: string,
    gdp_impact_pct: number,    // Estimated % GDP impact
    trade_disruption: 1-10,
    key_sectors: string[],
    unemployment_risk: "low" | "medium" | "high" | "severe"
  }>,
  trade_routes_disrupted: Array<{
    from: [number, number],    // [lon, lat]
    to: [number, number],
    commodity: string,
    severity: 1-10
  }>,
  narrative: string
}
```

**Food Supply Agent:**
- System prompt: Expert in agricultural systems, food logistics, food security indices, water access, famine prediction
- Structured output schema:
```typescript
{
  affected_countries: Array<{
    iso3: string,
    food_security_impact: 1-10,
    population_at_risk: number,
    primary_threats: string[], // e.g., "supply chain disruption", "crop failure"
    is_food_desert: boolean
  }>,
  supply_chain_disruptions: Array<{
    from: [number, number],
    to: [number, number],
    product: string,
    severity: 1-10
  }>,
  narrative: string
}
```

**Infrastructure Agent:**
- System prompt: Expert in power grids, telecom, transportation, water systems, data centers, critical infrastructure interdependencies
- Structured output schema:
```typescript
{
  affected_countries: Array<{
    iso3: string,
    infrastructure_risk: 1-10,
    systems_at_risk: ("power" | "water" | "telecom" | "transport" | "digital")[],
    cascade_risk: 1-10         // Risk of cascading failures
  }>,
  outage_zones: Array<{
    coordinates: [number, number],
    radius_km: number,
    type: "power" | "water" | "telecom" | "transport",
    severity: 1-10,
    population_affected: number
  }>,
  narrative: string
}
```

**Civilian Impact Agent:**
- System prompt: Expert in humanitarian crises, displacement, public health, social stability, vulnerable populations, human rights
- Structured output schema:
```typescript
{
  affected_countries: Array<{
    iso3: string,
    humanitarian_score: 1-10,
    displaced_estimate: number,
    health_risk: 1-10,
    vulnerable_groups: string[]
  }>,
  displacement_flows: Array<{
    from: [number, number],
    to: [number, number],
    estimated_people: number,
    urgency: "low" | "medium" | "high" | "critical"
  }>,
  narrative: string
}
```

#### Synthesis Agent (GPT-4.1)
- Runs AFTER all 5 specialists complete
- Receives all 5 structured outputs + narratives
- Produces a 150-300 word unified assessment highlighting:
  1. The most critical cascading risk chain (e.g., "Infrastructure failure → food disruption → displacement → geopolitical tension")
  2. The single most affected population
  3. One non-obvious second-order effect the specialists identified
  4. A quantified "compound risk score" (1-100) that represents the multiplicative danger

### 3. Streaming Architecture

Specify the exact streaming implementation:

- The `/api/analyze` route accepts a POST with `{ scenario: string }`
- It returns a `ReadableStream` using the Web Streams API in a `Response` with `Content-Type: text/event-stream`
- Event types sent over SSE:
  - `event: orchestrator\ndata: {JSON}\n\n` — orchestrator's structured output (map zooms + regions highlight)
  - `event: agent_chunk\ndata: {"agent": "geopolitics", "chunk": "token text"}\n\n` — streaming text from each agent
  - `event: agent_complete\ndata: {"agent": "geopolitics", "structured": {JSON}}\n\n` — agent's structured output (map layers update)
  - `event: synthesis_chunk\ndata: {"chunk": "token text"}\n\n` — synthesis streaming
  - `event: complete\ndata: {"compound_risk_score": 73}\n\n` — all done
- Frontend consumes via `EventSource` or `fetch` with `getReader()`
- Each agent panel in the UI renders its streaming text independently
- Map layers update in response to `agent_complete` events with smooth deck.gl transitions

### 4. Map Visualization Specification

Define the exact deck.gl layer configuration for each data type:

- **Country Choropleth** (GeoJsonLayer): Color countries by composite impact score (green → yellow → orange → red → dark red), extruded in 3D by severity. Data source: merge all agent `affected_countries` arrays, compute max impact score per country. Smooth 1-second transition on data change.
- **Conflict Zones** (ScatterplotLayer): Pulsing red circles at conflict coordinates, radius proportional to intensity. Animated via deck.gl `radiusScale` transition.
- **Food Desert Overlay** (GeoJsonLayer): Orange-tinted regions where `is_food_desert: true`. Semi-transparent fill.
- **Power/Infrastructure Outages** (ScatterplotLayer): Dark gray circles with lightning bolt icons for power, water drop for water. Radius proportional to affected population.
- **Trade/Supply Chain Disruptions** (ArcLayer): Animated arcs between disrupted trade route endpoints. Color from green (low severity) to red (high severity). Height proportional to severity.
- **Displacement Flows** (ArcLayer): Blue animated arcs showing population movement from origin to destination. Width proportional to estimated people.
- **Risk Heatmap** (HeatmapLayer): Gaussian kernel density overlay showing compound risk intensity across the map. Built from all agent coordinate data weighted by severity scores.

All layers must have `pickable: true` for click interactivity. On click, populate the RegionDetail sidebar component.

### 5. Pre-Built "Golden Path" Scenarios

Define 3 scenarios that are pre-tested and guaranteed to produce impressive demos:

1. **"Suez Canal blocked + South Asian heat wave"** — Tests trade disruption + climate + food supply. Map shows global trade arcs going red, food security declining in import-dependent nations, displacement in South Asia.
2. **"Texas grid failure during winter storm"** — Tests infrastructure cascade + civilian impact + economy. Map zooms to Texas, shows outage zones, data center impacts, interstate mutual aid arcs.
3. **"Accelerated Greenland ice sheet collapse"** — Tests climate + geopolitical + displacement. Map shows rising sea levels, displaced populations, NATO response zones, economic impact on Nordic/European nations.

For each, provide the exact scenario text, expected orchestrator output, and pre-cached agent responses as fallbacks if API calls fail during demo.

### 6. UI Layout Specification

Define the exact layout:

- **Full viewport dark-themed app** (no scrolling on main page)
- **Left 70%**: Map (MapLibre + deck.gl, full height)
- **Right 30%**: Sidebar panel (full height, scrollable)
  - **Collapsed state**: Just the scenario input (textarea + submit button + 3 golden-path quick-select buttons)
  - **Active state**: Tabs for each agent (Geopolitics | Economy | Food | Infrastructure | Civilian | Synthesis), each showing streaming text. Active tab has a green dot when streaming, checkmark when complete.
  - **Region detail state**: When a map region is clicked, sidebar switches to show that region's data across all 5 dimensions with mini Recharts bar charts
- **Top bar**: App title "CryoNexus", compound risk score badge (animates from 0 to final score), time horizon indicator
- **Map overlays**: Layer toggle buttons (bottom-left), legend (bottom-right)

### 7. Data Pre-loading Script

Specify a `scripts/preload-data.ts` that:
1. Fetches Natural Earth GeoJSON from GitHub raw URL, simplifies geometry to reduce file size to <2MB
2. Fetches World Bank indicators for all countries via `api.worldbank.org/v2/country/all/indicator/{code}?format=json&per_page=300&date=2023` for: GDP, population, poverty, arable land, energy use, trade
3. Downloads INFORM Risk Index Excel from EU JRC, parses to JSON
4. Fetches UNHCR data via `api.unhcr.org/population/v1/`
5. Downloads WRI Global Power Plant Database CSV, parses to JSON
6. Writes all outputs to `lib/data/*.json`

This script runs ONCE before the hackathon. All data is committed to the repo.

---

## SPEC DOCUMENT REQUIREMENTS

The output spec document must include:

1. **System Architecture Diagram** — ASCII or Mermaid diagram showing data flow from user input → orchestrator → parallel agents → synthesis → map + sidebar
2. **Complete API contract** for `/api/analyze` including request body, SSE event types, and all JSON schemas
3. **Every agent's full system prompt** (200-500 words each) — not just a description, the actual prompt text ready to paste into code
4. **Exact package.json dependencies** with version numbers
5. **Environment variables** needed and how to obtain each API key
6. **48-hour sprint plan** broken into 6 phases with assigned roles (Frontend Dev, Backend/AI Dev, Data/Design Dev) and specific deliverables per phase:
   - Phase 1 (Hours 0-4): Project setup, deployment, basic map rendering
   - Phase 2 (Hours 4-12): Agent orchestration pipeline, SSE streaming
   - Phase 3 (Hours 12-20): Map layers, sidebar components, data integration
   - Phase 4 (Hours 20-28): End-to-end integration, golden path scenarios
   - Phase 5 (Hours 28-36): Polish, edge cases, fallback responses
   - Phase 6 (Hours 36-48): Feature freeze, demo prep, pitch rehearsal
7. **Risk mitigation table** — for each high-risk component (map rendering, API rate limits, streaming bugs, deck.gl performance), provide the fallback strategy
8. **3-minute pitch script** — the exact words the presenter says during the demo, timed to the second, with cues for when to click/interact with the app
9. **Compound Risk Score algorithm** — how the synthesis agent calculates the 1-100 score from individual agent outputs (must be explainable to judges)

---

## QUALITY STANDARDS

- Every code snippet must be TypeScript with proper types
- Every agent output must conform to a Zod schema (provide the schemas)
- Every map layer must specify: data source, visual encoding, color scale, interactivity behavior, and transition duration
- The spec must be complete enough that a developer can build any component in isolation without needing to ask questions
- Assume the reader is a competent developer but has never used deck.gl or the OpenAI Responses API before — include setup instructions for both

---

## OUTPUT FORMAT

Produce the spec as a single comprehensive Markdown document with clear headers, code blocks, and tables. Target length: 4,000-6,000 words. Prioritize specificity over brevity — this is a build document, not a pitch deck.

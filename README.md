# CryoNexus

Multi-Agent Catastrophic Risk Simulation Platform

## Prerequisites

- Node.js 20+
- npm or yarn

## Environment Setup

### 1. Copy the example environment file

```bash
cp .env.example .env.local
```

### 2. Configure your API keys in `.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for orchestrator and synthesis agents. Get from [platform.openai.com](https://platform.openai.com/api-keys) |
| `MINIMAX_API_KEY` | Yes | MiniMax API key for specialist agents. Get from [platform.minimaxi.com](https://platform.minimaxi.com/) |
| `NEXT_PUBLIC_MAPTILER_KEY` | Yes | MapTiler API key for map tiles. Get from [cloud.maptiler.com](https://cloud.maptiler.com/account/keys/) |

### 3. Secure your MapTiler key (recommended)

The `NEXT_PUBLIC_MAPTILER_KEY` is exposed to the client for browser-based map tile loading. To restrict it:

1. Go to your [MapTiler Dashboard](https://cloud.maptiler.com/account/keys/)
2. Edit your key to add domain restrictions
3. Only allow domains where you deploy the app

### CI/Production Builds

For CI pipelines and production deployments, set the environment variables as secrets:

```bash
# Vercel example
vercel env add OPENAI_API_KEY
vercel env add MINIMAX_API_KEY
vercel env add NEXT_PUBLIC_MAPTILER_KEY

# Or use -e flag with deployment
vercel deploy --env OPENAI_API_KEY=$OPENAI_API_KEY ...
```

**Important:** Never commit real API keys to the repository. The `.env` and `.env*.local` files are gitignored.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/analyze/       # SSE endpoint for analysis
│   ├── page.tsx           # Main page
│   └── layout.tsx         # Root layout
├── components/
│   ├── map/              # MapLibre + deck.gl components
│   └── sidebar/           # Sidebar UI components
├── hooks/
│   └── use-analysis.ts    # SSE client hook
├── lib/
│   ├── agents/            # AI agent implementations
│   ├── data/              # Data loading utilities
│   └── types.ts           # Shared TypeScript types
└── public/                 # Static assets
```

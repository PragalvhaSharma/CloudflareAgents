# Cloudflare Workers AI Chat Agent

This project is a bespoke chat experience built entirely on Cloudflare's AI platform. It combines the Cloudflare Agents runtime, Durable Objects, and Workers AI to deliver a streaming, tool-aware assistant that runs without any server infrastructure of its own. The UI is a Vite + React single-page app that talks directly to a Workers Durable Object which orchestrates the conversation.

## How the Project Works
- Incoming chat requests are routed to the `Chat` Durable Object in `src/server.ts`, which subclasses Cloudflare's `AIChatAgent` helper from the `agents` SDK.
- Each turn merges the built-in tool definitions from `src/tools.ts` with any MCP tools that might be connected, then cleans up partial tool calls and replays any pending confirmations via `processToolCalls`.
- The agent calls `streamText` against Cloudflare Workers AI using the `AI` binding configured in `wrangler.jsonc`, targeting the `@cf/meta/llama-3.3-70b-instruct-fp8-fast` model. Responses stream back to the browser as they are generated.
- A lightweight heuristic checks the latest user message for tool-intent keywords before enabling tool execution, so the model only reaches for APIs when the user is clearly asking for fresh data.
- The React client (`src/app.tsx`) renders message history, tool input/output cards, and a landing screen with quick prompts. It keeps the experience locked to dark mode, adds copy/regenerate controls, and exposes an optional debug view.

## Cloudflare Platform Pieces in Use
- **Workers AI** (`AI` binding) hosts the Llama 3.3 70B instruct model used for all completions.
- **Cloudflare Agents runtime** provides the `AIChatAgent` base class, agent routing, and MCP integrations.
- **Durable Objects** persist conversation state for each session via the `Chat` class.
- **Wrangler + the Cloudflare Vite plugin** power local development, asset bundling, and deployment from the CLI.
- **Workers Observability** is enabled (sampling rate 1) through `wrangler.jsonc` so requests show up in Cloudflare's dashboards.

## Built-In Toolbelt
All tools live in `src/tools.ts` and execute automatically when the heuristic allows:
- `getWeatherInformation` – Open-Meteo geocoding + forecast APIs for current conditions.
- `getLocalTime` – WorldTime API to resolve human-friendly locations into timezones.
- `getRandomFact` – Uses the Useless Facts API with curated fallbacks.
- `getNasaAPOD` – NASA Astronomy Picture of the Day with image + explanation rendering.
- `getStockData` – Yahoo Finance chart API with interval support and formatted change metrics.
- `getCountryInfo` – REST Countries v3 API for demographics, currencies, languages, and flags.

Adding new tools is as simple as defining another `tool({ inputSchema, execute })` export and (optionally) tweaking the keyword heuristic in `src/server.ts`.

## Frontend Experience
- Built with React 19, Tailwind CSS, and the `agents/react` hooks for streaming updates.
- Presents landing suggestions, quick prompts, and per-message actions (copy, regenerate, delete history).
- Tool invocations render inside `ToolInvocationCard` components so the user sees rich responses (markdown, images, lists).
- Debug toggles expose raw message payloads without leaving the UI, which is helpful when tuning tools or heuristics.

## Getting Started
### Prerequisites
- Node.js 20+ and npm.
- A Cloudflare account with Workers, Durable Objects, and Workers AI enabled.
- `wrangler` CLI (`npm install -g wrangler`) authenticated via `wrangler login`.
- (Optional) An OpenAI API key if you plan to swap models during experimentation; place it in `.dev.vars` as `OPENAI_API_KEY`.

### Configure Cloudflare Bindings
`wrangler.jsonc` already declares the `AI` binding and the `Chat` Durable Object migration. Make sure Workers AI is enabled on your account so the binding resolves to Cloudflare's hosted models when you run or deploy.

### Install & Run Locally
```bash
npm install
# create .dev.vars if you need local secrets
npm start
```
`npm start` launches the Vite dev server with the Cloudflare plugin, so your browser hits the Worker + Durable Object through Wrangler while serving the React app with HMR (default at `http://localhost:5173`).

To exercise the Worker without the frontend you can also run:
```bash
wrangler dev
```
which serves the Worker on `http://127.0.0.1:8787`.

### Deploy to Cloudflare
```bash
npm run deploy
```
This builds the React app, uploads the assets, and publishes the Worker + Durable Object to your Cloudflare account in one step.

## Customizing the Agent
- **Change models**: swap the call to `createWorkersAI().chat(...)` in `src/server.ts` or wire in a different provider (e.g., OpenAI) by toggling bindings and updating the `model` reference.
- **Tune tool usage**: adjust the regex in `shouldEnableTools` inside `src/server.ts` or add richer intent detection.
- **Add rich UI**: extend components under `src/components/` or update `src/app.tsx` to surface new controls, tool confirmations, or layout tweaks.
- **Integrate MCP servers**: uncomment the `this.mcp.connect(...)` section in `Chat.onChatMessage` and point it at your Model Context Protocol endpoint to stream additional tools into the same agent.

## Testing & Linting
```bash
npm test      # run Vitest
npm run check # formatting, Biome lint, and type-checking
```

## Further Reading
- [Cloudflare Agents docs](https://developers.cloudflare.com/agents/)
- [Workers AI docs](https://developers.cloudflare.com/workers-ai/)
- [Wrangler CLI reference](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/)

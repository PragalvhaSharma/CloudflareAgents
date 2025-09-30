# PROMPTS
## Codex (GPT-5)

- 2025-09-29 23:28 — [Model: GPT-5] "Rebuild PROMPTS.md with a fuller, backwards chronological timeline. Infer every major AI-assisted step from the codebase and split entries by platform and model."
- 2025-09-29 23:05 — [Model: GPT-5] "Polish the README with explicit npm/vite/wrangler instructions, a submission checklist that calls out the cf_ai_ repo prefix, and live deployment notes."
- 2025-09-29 22:42 — [Model: GPT-5] "Assemble a prompts ledger template that groups Codex, Cursor, and Gemini sessions, including timestamps and short descriptors of the tasks completed."
- 2025-09-29 22:15 — [Model: GPT-5] "Create a thorough README for the Cloudflare Workers chatbot: include architecture overview, tool descriptions, and deployment/testing commands."

## Cursor (Claude 4.5 Sonnet)

- 2025-09-28 22:20 — [Model: Claude 4.5 Sonnet] "Wire up the Chat Durable Object to use streamText with the Workers AI model @cf/meta/llama-3.3-70b-instruct-fp8-fast, merge built-in and MCP tools, and gate tool execution behind a regex heuristic so tools only trigger on relevant keywords."
- 2025-09-28 22:05 — [Model: Claude 4.5 Sonnet] "Add processToolCalls and cleanupMessages utilities that finish partially executed tool calls, stream updated results through UIMessage writers, and drop incomplete tool messages before sending them to the model."
- 2025-09-28 21:40 — [Model: Claude 4.5 Sonnet] "Implement weather, local time, and random fact tools using Open-Meteo, WorldTime API, and uselessfacts.jsph.pl with emoji-rich formatting, location normalization, and graceful fallbacks."
- 2025-09-28 21:10 — [Model: Claude 4.5 Sonnet] "Add NASA APOD, Yahoo Finance stock, and REST Countries tools with robust error handling, markdown-friendly outputs (including images), change calculations, and fallback messaging."
- 2025-09-28 20:40 — [Model: Claude 4.5 Sonnet] "Build the ToolInvocationCard React component with collapsible panels, approval buttons, markdown rendering, and copy-to-clipboard support for tool outputs."
- 2025-09-28 20:05 — [Model: Claude 4.5 Sonnet] "Create the chat UI page: dark-only theme, landing hero with general/tool quick prompts, streaming transcript list, regenerate/copy/delete controls, and status badges for the agent."
- 2025-09-28 19:40 — [Model: Claude 4.5 Sonnet] "Add the HasOpenAIKey banner that fetches /check-open-ai-key, highlights missing credentials, and keeps the layout responsive."
- 2025-09-28 19:15 — [Model: Claude 4.5 Sonnet] "Expose worker endpoints for /check-open-ai-key, /check-workers-ai, and /workers-ai/stream so the UI can probe bindings and developers can test the Workers AI stream."
- 2025-09-28 18:45 — [Model: Claude 4.5 Sonnet] "Scaffold the project using the Cloudflare agents starter pattern with Vite + React, shared providers, Tailwind styling, and the AIChatAgent Durable Object entry point."

## Cursor (Gemini · Q&A)

- 2025-09-27 21:30 — [Model: Gemini] "Do Open-Meteo, WorldTime API, and REST Countries require API keys, and are there request limits I need to handle in the tools?"
- 2025-09-27 21:05 — [Model: Gemini] "What is the recommended mapping of WMO weather codes to human-friendly descriptions with emojis for a weather bot?"
- 2025-09-27 20:45 — [Model: Gemini] "How do I interpret the Yahoo Finance v8 chart response to get current price, previous close, and 52-week range for a ticker?"
- 2025-09-27 20:20 — [Model: Gemini] "If NASA APOD returns a video instead of an image, how should I present that gracefully in markdown?"

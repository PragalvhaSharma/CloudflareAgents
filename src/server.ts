import { routeAgentRequest } from "agents";

import { AIChatAgent } from "agents/ai-chat-agent";
import {
  streamText,
  type StreamTextOnFinishCallback,
  stepCountIs,
  createUIMessageStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  type ToolSet
} from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { processToolCalls, cleanupMessages } from "./utils";
import { tools, executions } from "./tools";
// import { env } from "cloudflare:workers";

// Use Workers AI via binding
const workersAIModel = (env: Env) =>
  createWorkersAI({ binding: env.AI }).chat(
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as any
  );
// Cloudflare AI Gateway
// const openai = createOpenAI({
//   apiKey: env.OPENAI_API_KEY,
//   baseURL: env.GATEWAY_BASE_URL,
// });

/**
 * Chat Agent implementation that handles real-time AI chat interactions
 */
export class Chat extends AIChatAgent<Env> {
  /**
   * Handles incoming chat messages and manages the response stream
   */
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    _options?: { abortSignal?: AbortSignal }
  ) {
    // const mcpConnection = await this.mcp.connect(
    //   "https://path-to-mcp-server/sse"
    // );

    // Collect all tools, including MCP tools
    const allTools = {
      ...tools,
      ...this.mcp.getAITools()
    };

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Clean up incomplete tool calls to prevent API errors
        const cleanedMessages = cleanupMessages(this.messages);

        // Process any pending tool calls from previous messages
        // This handles human-in-the-loop confirmations for tools
        const processedMessages = await processToolCalls({
          messages: cleanedMessages,
          dataStream: writer,
          tools: allTools,
          executions
        });

        // Determine whether tools should be enabled for this turn.
        // Heuristic: only enable on clear tool-intent keywords to avoid unnecessary tool calls.
        const lastUserText = [...processedMessages]
          .reverse()
          .find((m) => m.role === "user")?.parts?.find((p: any) => p.type === "text") as any;
        const lastText = (lastUserText?.text as string) || "";
        const shouldEnableTools = /\b(weather|time|fact|color|palette|temperature|humidity|nasa|space|astronomy|picture|apod|stock|share|market|price|ticker|country|countries|population|currency|flag|nation|chart|graph|plot|visualize|bar|line|pie|data|about|info|information|tell me)\b/i.test(lastText);

        const result = streamText({
          system: `You are a concise, friendly assistant running on Cloudflare Workers.

General behavior:
- Never respond with generic refusals like "Your input is not sufficient" or claims about unavailable tools.
- Tools are optional. If a task can be answered directly, answer it directly. Only call tools when necessary.
- If the input is brief or ambiguous, provide a short helpful response and ask ONE clarifying question.
- Prefer practical steps, examples, and next actions. Keep responses compact.
- ALWAYS use tools when users ask for specific data that requires real-time information.

Available Tools:
- Weather information: Get current weather for any city worldwide
- Local time: Get current time for any location or timezone
- Random facts: Get interesting facts about science, history, nature, etc.
- Color palettes: Generate beautiful color schemes for design projects
- NASA APOD: Get NASA's daily astronomy picture with scientific explanations (use for space/astronomy queries)
- Stock data: Get real-time stock market data for any publicly traded company (use for stock/market queries)
- Country info: Get detailed information about any country including population, currency, flags, and more (ALWAYS use when asked about a specific country)
- Chart generator: Create visual charts (bar, line, pie, etc.) from data (ALWAYS use when asked to create/generate a chart)

Examples:
User: "hey" → Assistant: "Hey! What would you like help with today?"
User: "what's the weather in Paris?" → Use the weather tool to get current conditions.
User: "tell me about Japan" → Use the country info tool to get detailed data about Japan.
User: "create a bar chart with labels A,B,C and values 10,20,30" → Use the chart generator tool.
User: "show me today's space picture" → Use the NASA APOD tool.
User: "what's Apple's stock price?" → Use the stock data tool.
`,

          messages: convertToModelMessages(processedMessages),
          model: workersAIModel(this.env as Env),
          tools: shouldEnableTools ? allTools : undefined,
          toolChoice: shouldEnableTools ? "auto" : "none",
          // Type boundary: streamText expects specific tool types, but base class uses ToolSet
          // This is safe because our tools satisfy ToolSet interface (verified by 'satisfies' in tools.ts)
          onFinish: onFinish as unknown as StreamTextOnFinishCallback<
            typeof allTools
          >,
          stopWhen: stepCountIs(10)
        });

        writer.merge(result.toUIMessageStream());
      }
    });

    return createUIMessageStreamResponse({ stream });
  }
}

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Frontend health check: treat either OPENAI_API_KEY or Workers AI binding as configured
    if (url.pathname === "/check-open-ai-key") {
      const hasOpenAIKey = Boolean((env as any).OPENAI_API_KEY);
      const hasWorkersAI = typeof env.AI?.run === "function";
      return Response.json({ success: hasOpenAIKey || hasWorkersAI });
    }

    // Workers AI streaming endpoint (SSE)
    if (url.pathname === "/workers-ai/stream") {
      const stream = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        stream: true,
        max_tokens: 512,
        messages: [
          { role: "user", content: "wer\n" },
          {
            role: "assistant",
            content:
              "It seems like you started to type something, but it got cut off. Could you please complete your question or statement? I'm here to help with whatever you need.",
          },
        ],
      });

      return new Response(stream as ReadableStream, {
        headers: { "content-type": "text/event-stream" },
      });
    }

    if (url.pathname === "/check-workers-ai") {
      const hasBinding = typeof env.AI?.run === "function";
      return Response.json({ success: hasBinding });
    }
    return (
      // Route the request to our agent or return 404 if not found
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;

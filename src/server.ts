import { routeAgentRequest, type Schedule } from "agents";

import { getSchedulePrompt } from "agents/schedule";

import { AIChatAgent } from "agents/ai-chat-agent";
import {
  generateId,
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
        const shouldEnableTools = /\b(schedule|remind|weather|time|alarm|task)\b/i.test(lastText);

        const result = streamText({
          system: `You are a concise, friendly assistant running on Cloudflare Workers.
General behavior:
- Never respond with generic refusals like "Your input is not sufficient" or claims about unavailable tools.
- Tools are optional. If a task can be answered directly, answer it directly. Only call tools when necessary.
- If the input is brief or ambiguous, provide a short helpful response and ask ONE clarifying question.
- Prefer practical steps, examples, and next actions. Keep responses compact.

Examples:
User: "hey" → Assistant: "Hey! What would you like help with today? (e.g., draft an email, summarize a note)"
User: "write an essay about living in the digital age" → Assistant: "Sure—here’s a concise essay:" then write it.

${getSchedulePrompt({ date: new Date() })}

If the user asks to schedule a task, use the schedule tool to schedule the task.
`,

          messages: convertToModelMessages(processedMessages),
          model: workersAIModel(this.env as Env),
          tools: shouldEnableTools ? allTools : undefined,
          toolChoice: shouldEnableTools ? "auto" : "none",
          // Avoid runaway tool loops if enabled
          maxToolRoundtrips: shouldEnableTools ? 2 : 0,
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
  async executeTask(description: string, _task: Schedule<string>) {
    await this.saveMessages([
      ...this.messages,
      {
        id: generateId(),
        role: "user",
        parts: [
          {
            type: "text",
            text: `Running scheduled task: ${description}`
          }
        ],
        metadata: {
          createdAt: new Date()
        }
      }
    ]);
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

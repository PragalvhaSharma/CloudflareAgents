/** biome-ignore-all lint/correctness/useUniqueElementIds: it's alright */
import { useEffect, useState, useRef, useCallback, use } from "react";
import { useAgent } from "agents/react";
import { isToolUIPart } from "ai";
import { useAgentChat } from "agents/ai-react";
import type { UIMessage } from "@ai-sdk/react";
import type { tools } from "./tools";

// Component imports
import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import { Avatar } from "@/components/avatar/Avatar";
import { Toggle } from "@/components/toggle/Toggle";
import { Textarea } from "@/components/textarea/Textarea";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { ToolInvocationCard } from "@/components/tool-invocation-card/ToolInvocationCard";

// Icon imports
import {
  Bug,
  Robot,
  Trash,
  PaperPlaneTilt,
  Stop,
  Copy,
  ArrowClockwise,
  ArrowDown
} from "@phosphor-icons/react";

// List of tools that require human confirmation
// NOTE: this should match the tools that don't have execute functions in tools.ts
const toolsRequiringConfirmation: (keyof typeof tools)[] = [
  // All tools now have execute functions, so no confirmations needed
];

export default function Chat() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showDebug, setShowDebug] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState("auto");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    // Always apply dark theme
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }, []);

  // Scroll to bottom on mount
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Toggle scroll-to-bottom button visibility based on scroll position
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
      setShowScrollToBottom(!nearBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true } as AddEventListenerOptions);
    return () => el.removeEventListener("scroll", onScroll as EventListener);
  }, []);

  // Theme locked to dark mode

  const agent = useAgent({
    agent: "chat"
  });

  const [agentInput, setAgentInput] = useState("");
  const handleAgentInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setAgentInput(e.target.value);
  };

  const handleAgentSubmit = async (
    e: React.FormEvent,
    extraData: Record<string, unknown> = {}
  ) => {
    e.preventDefault();
    if (!agentInput.trim()) return;

    const message = agentInput;
    setAgentInput("");

    // Send message to agent
    await sendMessage(
      {
        role: "user",
        parts: [{ type: "text", text: message }]
      },
      {
        body: extraData
      }
    );
  };

  const {
    messages: agentMessages,
    addToolResult,
    clearHistory,
    status,
    sendMessage,
    stop
  } = useAgentChat<unknown, UIMessage<{ createdAt: string }>>({
    agent
  });

  // Helpers: derive last user message and UI actions
  const lastUserMessageText = (() => {
    for (let i = agentMessages.length - 1; i >= 0; i--) {
      const m = agentMessages[i];
      if (m.role === "user") {
        const textPart = m.parts?.find((p) => p.type === "text");
        if (textPart && (textPart as any).text) {
          return (textPart as any).text as string;
        }
      }
    }
    return "";
  })();

  const regenerateLast = async () => {
    if (!lastUserMessageText || status === "streaming" || status === "submitted") return;
    await sendMessage(
      { role: "user", parts: [{ type: "text", text: lastUserMessageText }] },
      { body: {} }
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard failures
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    agentMessages.length > 0 && scrollToBottom();
  }, [agentMessages, scrollToBottom]);

  const pendingToolCallConfirmation = agentMessages.some((m: UIMessage) =>
    m.parts?.some(
      (part) =>
        isToolUIPart(part) &&
        part.state === "input-available" &&
        // Manual check inside the component
        toolsRequiringConfirmation.includes(
          part.type.replace("tool-", "") as keyof typeof tools
        )
    )
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Landing screen: show when there are no messages yet
  if (agentMessages.length === 0) {
    const categories = [
      "🌤️ Weather information for any city worldwide",
      "🕐 Local time in different locations & timezones",
      "💡 Random interesting facts about science & nature",
      "🎨 Beautiful color palettes for design projects",
      "✍️ Creative writing assistance",
      "💻 Code explanations and debugging"
    ];
    const quickPrompts = [
      "What's the weather in Tokyo?",
      "Tell me an interesting fact",
      "Generate a warm color palette",
      "What time is it in London?",
      "Give me 3 dinner ideas",
      "Write a short poem about AI"
    ];

    return (
      <div className="relative h-[100vh] w-full overflow-hidden">
        <HasOpenAIKey />
        {/* Background gradient and subtle glows */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.15),transparent_40%),radial-gradient(circle_at_85%_18%,rgba(59,130,246,0.12),transparent_40%),radial-gradient(circle_at_15%_85%,rgba(236,72,153,0.10),transparent_35%)] bg-neutral-950" />

        {/* Header */}
        <div className="px-6 pt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#F48120]/15 text-[#F48120] flex items-center justify-center">
              <Robot size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold">AI Chat Agent</div>
              <div className="text-[10px] text-neutral-400">Llama 3.3 70B • Online</div>
            </div>
          </div>
        </div>

        {/* Center hero */}
        <div className="relative h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center px-6">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-800/60 text-neutral-200 ring-1 ring-white/10">
            <svg width="22" height="22" viewBox="0 0 24 24" className="opacity-90">
              <path fill="currentColor" d="M20 2H4a2 2 0 0 0-2 2v17l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-100">Welcome to AI Chat</h1>
          <p className="mt-2 text-sm text-neutral-400 text-center max-w-xl">
            Start a conversation with your AI assistant. I can help you with a wide variety of
            tasks and questions.
          </p>

          {/* Category chips */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl w-full">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setAgentInput(c)}
                className="text-xs px-4 py-2 rounded-full border border-neutral-800/80 bg-neutral-900/50 hover:bg-neutral-800/60 text-neutral-300 text-left"
              >
                {c}
              </button>
            ))}
          </div>

          {/* Quick prompts */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {quickPrompts.map((q) => (
              <button
                key={q}
                onClick={() => setAgentInput(q)}
                className="text-[11px] px-3 py-1.5 rounded-full border border-neutral-800/80 bg-neutral-900/60 hover:bg-neutral-800/60 text-neutral-200"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAgentSubmit(e);
            }}
            className="mt-8 w-full max-w-2xl"
          >
            <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900/70 backdrop-blur">
              <Textarea
                disabled={pendingToolCallConfirmation}
                placeholder={"Send a message..."}
                className="flex w-full border-0 bg-transparent px-4 py-3 ring-0 focus-visible:ring-0 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 min-h-[44px] max-h-[40dvh] overflow-hidden resize-none !text-sm pr-12"
                value={agentInput}
                onChange={(e) => {
                  handleAgentInputChange(e);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                rows={1}
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 h-8 w-8"
                  aria-label="Send message"
                  disabled={!agentInput.trim()}
                >
                  <PaperPlaneTilt size={16} />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500 px-1">
              <div className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                AI is ready to help
              </div>
              <div>Typically responds in seconds</div>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-10 text-[11px] text-neutral-600">
            Powered by advanced AI • Built with Cloudflare Workers and Tailwind CSS
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100vh] w-full p-4 flex justify-center items-center overflow-hidden">
      <HasOpenAIKey />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.12),transparent_40%),radial-gradient(circle_at_85%_18%,rgba(59,130,246,0.10),transparent_40%),radial-gradient(circle_at_15%_85%,rgba(236,72,153,0.08),transparent_35%)] bg-neutral-950" />
      <div className="h-[calc(100vh-2rem)] w-full mx-auto max-w-6xl flex flex-col rounded-2xl overflow-hidden relative border border-neutral-800/70 bg-neutral-900/60 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/40">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-3 sticky top-0 z-10 bg-neutral-900/50 backdrop-blur">
          <div className="flex items-center justify-center h-8 w-8">
            <svg
              width="28px"
              height="28px"
              className="text-[#F48120]"
              data-icon="agents"
            >
              <title>Cloudflare Agents</title>
              <symbol id="ai:local:agents" viewBox="0 0 80 79">
                <path
                  fill="currentColor"
                  d="M69.3 39.7c-3.1 0-5.8 2.1-6.7 5H48.3V34h4.6l4.5-2.5c1.1.8 2.5 1.2 3.9 1.2 3.8 0 7-3.1 7-7s-3.1-7-7-7-7 3.1-7 7c0 .9.2 1.8.5 2.6L51.9 30h-3.5V18.8h-.1c-1.3-1-2.9-1.6-4.5-1.9h-.2c-1.9-.3-3.9-.1-5.8.6-.4.1-.8.3-1.2.5h-.1c-.1.1-.2.1-.3.2-1.7 1-3 2.4-4 4 0 .1-.1.2-.1.2l-.3.6c0 .1-.1.1-.1.2v.1h-.6c-2.9 0-5.7 1.2-7.7 3.2-2.1 2-3.2 4.8-3.2 7.7 0 .7.1 1.4.2 2.1-1.3.9-2.4 2.1-3.2 3.5s-1.2 2.9-1.4 4.5c-.1 1.6.1 3.2.7 4.7s1.5 2.9 2.6 4c-.8 1.8-1.2 3.7-1.1 5.6 0 1.9.5 3.8 1.4 5.6s2.1 3.2 3.6 4.4c1.3 1 2.7 1.7 4.3 2.2v-.1q2.25.75 4.8.6h.1c0 .1.1.1.1.1.9 1.7 2.3 3 4 4 .1.1.2.1.3.2h.1c.4.2.8.4 1.2.5 1.4.6 3 .8 4.5.7.4 0 .8-.1 1.3-.1h.1c1.6-.3 3.1-.9 4.5-1.9V62.9h3.5l3.1 1.7c-.3.8-.5 1.7-.5 2.6 0 3.8 3.1 7 7 7s7-3.1 7-7-3.1-7-7-7c-1.5 0-2.8.5-3.9 1.2l-4.6-2.5h-4.6V48.7h14.3c.9 2.9 3.5 5 6.7 5 3.8 0 7-3.1 7-7s-3.1-7-7-7m-7.9-16.9c1.6 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.4-3 3-3m0 41.4c1.6 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.4-3 3-3M44.3 72c-.4.2-.7.3-1.1.3-.2 0-.4.1-.5.1h-.2c-.9.1-1.7 0-2.6-.3-1-.3-1.9-.9-2.7-1.7-.7-.8-1.3-1.7-1.6-2.7l-.3-1.5v-.7q0-.75.3-1.5c.1-.2.1-.4.2-.7s.3-.6.5-.9c0-.1.1-.1.1-.2.1-.1.1-.2.2-.3s.1-.2.2-.3c0 0 0-.1.1-.1l.6-.6-2.7-3.5c-1.3 1.1-2.3 2.4-2.9 3.9-.2.4-.4.9-.5 1.3v.1c-.1.2-.1.4-.1.6-.3 1.1-.4 2.3-.3 3.4-.3 0-.7 0-1-.1-2.2-.4-4.2-1.5-5.5-3.2-1.4-1.7-2-3.9-1.8-6.1q.15-1.2.6-2.4l.3-.6c.1-.2.2-.4.3-.5 0 0 0-.1.1-.1.4-.7.9-1.3 1.5-1.9 1.6-1.5 3.8-2.3 6-2.3q1.05 0 2.1.3v-4.5c-.7-.1-1.4-.2-2.1-.2-1.8 0-3.5.4-5.2 1.1-.7.3-1.3.6-1.9 1s-1.1.8-1.7 1.3c-.3.2-.5.5-.8.8-.6-.8-1-1.6-1.3-2.6-.2-1-.2-2 0-2.9.2-1 .6-1.9 1.3-2.6.6-.8 1.4-1.4 2.3-1.8l1.8-.9-.7-1.9c-.4-1-.5-2.1-.4-3.1s.5-2.1 1.1-2.9q.9-1.35 2.4-2.1c.9-.5 2-.8 3-.7.5 0 1 .1 1.5.2 1 .2 1.8.7 2.6 1.3s1.4 1.4 1.8 2.3l4.1-1.5c-.9-2-2.3-3.7-4.2-4.9q-.6-.3-.9-.6c.4-.7 1-1.4 1.6-1.9.8-.7 1.8-1.1 2.9-1.3.9-.2 1.7-.1 2.6 0 .4.1.7.2 1.1.3V72zm25-22.3c-1.6 0-3-1.3-3-3 0-1.6 1.3-3 3-3s3 1.3 3 3c0 1.6-1.3 3-3 3"
                />
              </symbol>
              <use href="#ai:local:agents" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base truncate">AI Chat Agent</h2>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                Llama 3.3 70B
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${status === "streaming" || status === "submitted" ? "bg-blue-200 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200" : "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status === "streaming" || status === "submitted" ? "bg-blue-600 animate-pulse" : "bg-emerald-600"}`} />
                {status === "streaming" || status === "submitted" ? "Generating" : "Idle"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 mr-2">
            <Bug size={16} />
            <Toggle
              toggled={showDebug}
              aria-label="Toggle debug mode"
              onClick={() => setShowDebug((prev) => !prev)}
            />
          </div>

          <Button
            variant="ghost"
            size="md"
            shape="square"
            className="rounded-full h-9 w-9"
            onClick={clearHistory}
          >
            <Trash size={20} />
          </Button>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 max-h-[calc(100vh-10rem)]">
          {agentMessages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <Card className="p-6 max-w-md mx-auto bg-neutral-100 dark:bg-neutral-900">
                <div className="text-center space-y-4">
                  <div className="bg-[#F48120]/10 text-[#F48120] rounded-full p-3 inline-flex">
                    <Robot size={24} />
                  </div>
                  <h3 className="font-semibold text-lg">Welcome to AI Chat</h3>
                  <p className="text-muted-foreground text-sm">
                    Start a conversation with your AI assistant. I can help with:
                  </p>
                  <ul className="text-sm text-left space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-[#F48120]">🌤️</span>
                      <span>Weather information for any city</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#F48120]">🕐</span>
                      <span>Local time in different locations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#F48120]">💡</span>
                      <span>Interesting facts about science & nature</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#F48120]">🎨</span>
                      <span>Color palettes for design projects</span>
                    </li>
                  </ul>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {["What's the weather in Paris?","Tell me a fun fact","Generate a color palette","What time is it in Tokyo?"].map((s) => (
                      <button
                        key={s}
                        onClick={(e) => {
                          e.preventDefault();
                          setAgentInput(s);
                        }}
                        className="text-xs px-3 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {agentMessages.map((m, index) => {
            const isUser = m.role === "user";
            const showAvatar =
              index === 0 || agentMessages[index - 1]?.role !== m.role;

            return (
              <div key={m.id}>
                {showDebug && (
                  <pre className="text-xs text-muted-foreground overflow-scroll">
                    {JSON.stringify(m, null, 2)}
                  </pre>
                )}
                <div
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-2 max-w-[85%] ${
                      isUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {showAvatar && !isUser ? (
                      <Avatar username={"AI"} />
                    ) : (
                      !isUser && <div className="w-8" />
                    )}

                    <div>
                      <div>
                        {m.parts?.map((part, i) => {
                          if (part.type === "text") {
                            return (
                              // biome-ignore lint/suspicious/noArrayIndexKey: immutable index
                              <div key={i}>
                                <Card
                                  className={`p-3 rounded-2xl ${
                                    isUser
                                      ? "bg-gradient-to-br from-purple-600/80 to-blue-600/80 text-white border-0"
                                      : "bg-neutral-900/70 border border-neutral-800 text-neutral-200"
                                  } ${
                                    part.text.startsWith("scheduled message")
                                      ? "border-accent/50"
                                      : ""
                                  } relative shadow-sm`}
                                >
                                  {!isUser && (
                                    <div className="absolute top-1 right-1 flex gap-1 opacity-70 hover:opacity-100 transition">
                                      <button
                                        className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800"
                                        onClick={() => copyToClipboard(part.text.replace(/^scheduled message: /, ""))}
                                        aria-label="Copy message"
                                      >
                                        <Copy size={14} />
                                      </button>
                                      {index === agentMessages.length - 1 && (
                                        <button
                                          className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800"
                                          onClick={regenerateLast}
                                          aria-label="Regenerate"
                                          disabled={status === "streaming" || status === "submitted"}
                                        >
                                          <ArrowClockwise size={14} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {part.text.startsWith(
                                    "scheduled message"
                                  ) && (
                                    <span className="absolute -top-3 -left-2 text-base">
                                      🕒
                                    </span>
                                  )}
                                  <MemoizedMarkdown
                                    id={`${m.id}-${i}`}
                                    content={part.text.replace(
                                      /^scheduled message: /,
                                      ""
                                    )}
                                  />
                                </Card>
                                <p
                                  className={`text-xs text-muted-foreground mt-1 ${
                                    isUser ? "text-right" : "text-left"
                                  }`}
                                >
                                  {formatTime(
                                    m.metadata?.createdAt
                                      ? new Date(m.metadata.createdAt)
                                      : new Date()
                                  )}
                                </p>
                              </div>
                            );
                          }

                          if (isToolUIPart(part)) {
                            const toolCallId = part.toolCallId;
                            const toolName = part.type.replace("tool-", "");
                            const needsConfirmation =
                              toolsRequiringConfirmation.includes(
                                toolName as keyof typeof tools
                              );

                            // Skip rendering the card in debug mode
                            if (showDebug) return null;

                            return (
                              <ToolInvocationCard
                                // biome-ignore lint/suspicious/noArrayIndexKey: using index is safe here as the array is static
                                key={`${toolCallId}-${i}`}
                                toolUIPart={part}
                                toolCallId={toolCallId}
                                needsConfirmation={needsConfirmation}
                                onSubmit={({ toolCallId, result }) => {
                                  addToolResult({
                                    tool: part.type.replace("tool-", ""),
                                    toolCallId,
                                    output: result
                                  });
                                }}
                                addToolResult={(toolCallId, result) => {
                                  addToolResult({
                                    tool: part.type.replace("tool-", ""),
                                    toolCallId,
                                    output: result
                                  });
                                }}
                              />
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
          {(status === "streaming" || status === "submitted") && (
            <div className="sticky bottom-24 left-0 right-0 mx-auto w-fit text-xs text-neutral-500 dark:text-neutral-400 animate-pulse">
              Assistant is typing…
            </div>
          )}
        </div>

        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-28 right-6 z-20 inline-flex items-center gap-1 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 px-3 py-1 text-sm shadow hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={14} />
            <span>New messages</span>
          </button>
        )}

        {/* Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAgentSubmit(e, {
              annotations: {
                hello: "world"
              }
            });
            setTextareaHeight("auto"); // Reset height after submission
          }}
          className="p-3 absolute bottom-0 left-0 right-0 z-10 border-t border-neutral-800 bg-neutral-900/60 backdrop-blur"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Textarea
                disabled={pendingToolCallConfirmation}
                placeholder={
                  pendingToolCallConfirmation
                    ? "Please respond to the tool confirmation above..."
                    : "Send a message..."
                }
                className="flex w-full border border-neutral-800 bg-neutral-900/70 px-3 py-2 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-2xl !text-base pb-10"
                value={agentInput}
                onChange={(e) => {
                  handleAgentInputChange(e);
                  // Auto-resize the textarea
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                  setTextareaHeight(`${e.target.scrollHeight}px`);
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    handleAgentSubmit(e as unknown as React.FormEvent);
                    setTextareaHeight("auto"); // Reset height on Enter submission
                  }
                }}
                rows={2}
                style={{ height: textareaHeight }}
              />
              <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
                {status === "submitted" || status === "streaming" ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-full p-1.5 h-fit border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                    aria-label="Stop generation"
                  >
                    <Stop size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-full p-1.5 h-fit border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                    disabled={pendingToolCallConfirmation || !agentInput.trim()}
                    aria-label="Send message"
                  >
                    <PaperPlaneTilt size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const hasOpenAiKeyPromise = fetch("/check-open-ai-key").then((res) =>
  res.json<{ success: boolean }>()
);

function HasOpenAIKey() {
  const hasOpenAiKey = use(hasOpenAiKeyPromise);

  if (!hasOpenAiKey.success) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-500/10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-red-200 dark:border-red-900 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-labelledby="warningIcon"
                >
                  <title id="warningIcon">Warning Icon</title>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                  OpenAI API Key Not Configured
                </h3>
                <p className="text-neutral-600 dark:text-neutral-300 mb-1">
                  Requests to the API, including from the frontend UI, will not
                  work until an OpenAI API key is configured.
                </p>
                <p className="text-neutral-600 dark:text-neutral-300">
                  Please configure an OpenAI API key by setting a{" "}
                  <a
                    href="https://developers.cloudflare.com/workers/configuration/secrets/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 dark:text-red-400"
                  >
                    secret
                  </a>{" "}
                  named{" "}
                  <code className="bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded text-red-600 dark:text-red-400 font-mono text-sm">
                    OPENAI_API_KEY
                  </code>
                  . <br />
                  You can also use a different model provider by following these{" "}
                  <a
                    href="https://github.com/cloudflare/agents-starter?tab=readme-ov-file#use-a-different-ai-model-provider"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 dark:text-red-400"
                  >
                    instructions.
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

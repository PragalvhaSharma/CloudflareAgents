import { useState } from "react";
import type { ToolUIPart } from "ai";
import { Robot, CaretDown, Copy, Check } from "@phosphor-icons/react";
import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import { APPROVAL } from "@/shared";
import { MemoizedMarkdown } from "@/components/memoized-markdown";

interface ToolResultWithContent {
  content: Array<{ type: string; text: string }>;
}

function isToolResultWithContent(
  result: unknown
): result is ToolResultWithContent {
  return (
    typeof result === "object" &&
    result !== null &&
    "content" in result &&
    Array.isArray((result as ToolResultWithContent).content)
  );
}

interface ToolInvocationCardProps {
  toolUIPart: ToolUIPart;
  toolCallId: string;
  needsConfirmation: boolean;
  onSubmit: ({
    toolCallId,
    result
  }: {
    toolCallId: string;
    result: string;
  }) => void;
  addToolResult: (toolCallId: string, result: string) => void;
}

export function ToolInvocationCard({
  toolUIPart,
  toolCallId,
  needsConfirmation,
  onSubmit
  // addToolResult
}: ToolInvocationCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <Card className="p-4 my-3 w-full max-w-[700px] rounded-md bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 cursor-pointer"
      >
        <div
          className={`${needsConfirmation ? "bg-[#F48120]/10" : "bg-[#F48120]/5"} p-1.5 rounded-full flex-shrink-0`}
        >
          <Robot size={16} className="text-[#F48120]" />
        </div>
        <h4 className="font-medium flex items-center gap-2 flex-1 text-left">
          {toolUIPart.type}
          {!needsConfirmation && toolUIPart.state === "output-available" && (
            <span className="text-xs text-[#F48120]/70">✓ Completed</span>
          )}
        </h4>
        <CaretDown
          size={16}
          className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`transition-all duration-200 ${isExpanded ? "max-h-[600px] opacity-100 mt-3" : "max-h-0 opacity-0 overflow-hidden"}`}
      >
        <div
          className="overflow-y-auto"
          style={{ maxHeight: isExpanded ? "580px" : "0px" }}
        >
          <div className="mb-3">
            <h5 className="text-xs font-medium mb-1 text-muted-foreground">
              Arguments:
            </h5>
            <pre className="bg-background/80 p-2 rounded-md text-xs overflow-auto whitespace-pre-wrap break-words max-w-[650px]">
              {JSON.stringify(toolUIPart.input, null, 2)}
            </pre>
          </div>

          {needsConfirmation && toolUIPart.state === "input-available" && (
            <div className="flex gap-2 justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onSubmit({ toolCallId, result: APPROVAL.NO })}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onSubmit({ toolCallId, result: APPROVAL.YES })}
              >
                Approve
              </Button>
            </div>
          )}

          {!needsConfirmation && toolUIPart.state === "output-available" && (
            <div className="mt-3 border-t border-[#F48120]/10 pt-3">
              <div className="flex items-center justify-between mb-1">
                <h5 className="text-xs font-medium text-muted-foreground">
                  Result:
                </h5>
                <button
                  onClick={() => {
                    const result = toolUIPart.output;
                    let content: string;

                    if (isToolResultWithContent(result)) {
                      content = result.content
                        .map(
                          (item: { type: string; text: string }) => item.text
                        )
                        .join("\n");
                    } else if (typeof result === "string") {
                      content = result;
                    } else {
                      content = JSON.stringify(result, null, 2);
                    }

                    copyToClipboard(content);
                  }}
                  className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                  aria-label={copied ? "Copied!" : "Copy result"}
                  title={copied ? "Copied!" : "Copy result"}
                >
                  {copied ? (
                    <Check
                      size={14}
                      className="text-green-600 dark:text-green-400"
                    />
                  ) : (
                    <Copy
                      size={14}
                      className="text-neutral-600 dark:text-neutral-400"
                    />
                  )}
                </button>
              </div>
              <div className="bg-background/80 p-2 rounded-md text-xs overflow-auto max-w-[650px]">
                {(() => {
                  const result = toolUIPart.output;
                  let content: string;

                  if (isToolResultWithContent(result)) {
                    content = result.content
                      .map((item: { type: string; text: string }) => {
                        if (
                          item.type === "text" &&
                          item.text.startsWith("\n~ Page URL:")
                        ) {
                          const lines = item.text.split("\n").filter(Boolean);
                          return lines
                            .map(
                              (line: string) => `- ${line.replace("\n~ ", "")}`
                            )
                            .join("\n");
                        }
                        return item.text;
                      })
                      .join("\n");
                  } else if (typeof result === "string") {
                    content = result;
                  } else {
                    content = `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
                  }

                  return (
                    <MemoizedMarkdown
                      id={`tool-result-${toolCallId}`}
                      content={content}
                    />
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

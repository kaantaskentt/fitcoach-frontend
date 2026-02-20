"use client";

import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/types";
import { Avatar } from "@/components/ui/Avatar";

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (content: string) => void;
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.status === "error";

  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end animate-fade-in">
        <div className="max-w-[75%] sm:max-w-[65%]">
          <div
            className="px-4 py-2.5 rounded-2xl rounded-tr-md text-sm leading-relaxed transition-all duration-200 hover:shadow-sm"
            style={{
              background: "var(--color-accent-light)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-accent-subtle)",
            }}
          >
            {message.content}
          </div>
        </div>
        <Avatar type="user" />
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <Avatar type="coach" />
      <div className="max-w-[75%] sm:max-w-[65%]">
        <div
          className="px-4 py-2.5 rounded-2xl rounded-tl-md text-sm leading-relaxed transition-all duration-200 hover:shadow-sm"
          style={{
            background: isError ? "var(--color-error-light)" : "var(--color-surface)",
            borderLeft: isError ? "2px solid var(--color-error)" : "none",
            border: isError ? undefined : "1px solid var(--color-border)",
          }}
        >
          {isError ? (
            <div>
              <p style={{ color: "var(--color-error)" }}>{message.content}</p>
              {onRetry && (
                <button
                  onClick={() => onRetry(message.content)}
                  className="mt-2 text-xs font-medium underline underline-offset-2 transition-colors duration-150"
                  style={{ color: "var(--color-accent)" }}
                >
                  Try again
                </button>
              )}
            </div>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0" style={{ color: "var(--color-text-primary)" }}>
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {children}
                    </strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-2 ml-4 list-disc last:mb-0 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-2 ml-4 list-decimal last:mb-0 space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ color: "var(--color-text-primary)" }}>{children}</li>
                  ),
                  code: ({ children, className }) => {
                    const isBlock = className?.includes("language-");
                    if (isBlock) {
                      return (
                        <code
                          className="block my-2 p-3 rounded-lg text-[13px] leading-relaxed overflow-x-auto"
                          style={{
                            background: "var(--color-bg)",
                            color: "var(--color-text-primary)",
                            fontFamily: "var(--font-jetbrains), monospace",
                          }}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code
                        className="px-1 py-0.5 rounded text-[13px]"
                        style={{
                          background: "var(--color-bg)",
                          color: "var(--color-accent)",
                          fontFamily: "var(--font-jetbrains), monospace",
                        }}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => <pre className="my-0">{children}</pre>,
                  h1: ({ children }) => (
                    <p className="mb-2 font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {children}
                    </p>
                  ),
                  h2: ({ children }) => (
                    <p className="mb-2 font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {children}
                    </p>
                  ),
                  h3: ({ children }) => (
                    <p className="mb-1.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {children}
                    </p>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

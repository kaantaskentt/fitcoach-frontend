"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { ChatMessage } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { WelcomeHero } from "./WelcomeHero";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onRetry?: (content: string) => void;
}

export function MessageList({ messages, isLoading, onRetry }: MessageListProps) {
  const isEmptyState = messages.length <= 1 && messages[0]?.id === "welcome";
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const isNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    const threshold = 120;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  // Auto-scroll when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom();
    }
  }, [messages, isLoading, isNearBottom, scrollToBottom]);

  // Track scroll position for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    setShowScrollButton(!isNearBottom());
  }, [isNearBottom]);

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-6 sm:px-6"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          {isEmptyState && <WelcomeHero />}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onRetry={message.status === "error" ? onRetry : undefined}
            />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-md transition-all duration-200 animate-fade-in"
          style={{
            background: "var(--color-surface)",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 2.5V9.5M6 9.5L2.5 6M6 9.5L9.5 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          New messages
        </button>
      )}
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { useChat } from "@/hooks/useChat";
import { useGamificationContext } from "@/context/GamificationContext";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface ChatPanelProps {
  sessionId: string;
  onLevelUp?: (level: number) => void;
  onNewBadges?: (badges: string[]) => void;
}

export function ChatPanel({ sessionId, onLevelUp, onNewBadges }: ChatPanelProps) {
  const { messages, isLoading, isReady, sendMessage, retryMessage } =
    useChat(sessionId);
  const { recordMessage } = useGamificationContext();

  const handleSend = useCallback(
    async (text: string) => {
      // Record gamification before sending (for immediate feedback)
      const result = recordMessage(text);

      if (result.leveledUp && result.newLevel !== null) {
        onLevelUp?.(result.newLevel);
      }
      if (result.newBadges.length > 0) {
        onNewBadges?.(result.newBadges);
      }

      await sendMessage(text);
    },
    [sendMessage, recordMessage, onLevelUp, onNewBadges]
  );

  const handleRetry = useCallback(
    async (content: string) => {
      await retryMessage(content);
    },
    [retryMessage]
  );

  if (!isReady) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-2 h-2 rounded-full"
                style={{
                  background: "var(--color-border)",
                  animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={messages}
        isLoading={isLoading}
        onRetry={handleRetry}
      />
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}

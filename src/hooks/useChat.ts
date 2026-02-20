"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ChatMessage } from "@/types";
import { sendMessage as sendToN8n } from "@/lib/n8n";
import { storage } from "@/lib/storage";

function createWelcomeMessage(userName: string): ChatMessage {
  const name = userName.trim();
  const greeting = name
    ? `Hey ${name}! I'm your fitness coach.`
    : "Hey! I'm your fitness coach.";

  return {
    id: "welcome",
    role: "assistant",
    content: `${greeting} Ask me about training, nutrition, recovery, mobility — anything fitness related. What are you working on today?`,
    timestamp: Date.now(),
    status: "sent",
  };
}

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const lastSendTime = useRef(0);

  // Load messages from storage on mount
  useEffect(() => {
    const stored = storage.getMessages();
    if (stored.length > 0) {
      setMessages(stored);
    } else {
      const userName = storage.getName();
      setMessages([createWelcomeMessage(userName)]);
    }
    setIsReady(true);
  }, []);

  // Persist messages whenever they change (after initial load)
  useEffect(() => {
    if (isReady && messages.length > 0) {
      storage.setMessages(messages);
    }
  }, [messages, isReady]);

  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || isLoading || !sessionId) return false;

      // Rate limit: 500ms between sends
      const now = Date.now();
      if (now - lastSendTime.current < 500) return false;
      lastSendTime.current = now;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
        status: "sending",
      };

      setMessages((prev) => [
        ...prev,
        { ...userMessage, status: "sent" },
      ]);
      setIsLoading(true);

      try {
        const response = await sendToN8n(trimmed, sessionId);

        if (response.success && response.data) {
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: response.data.message,
            timestamp: Date.now(),
            status: "sent",
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
          return true;
        } else {
          const errorMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              response.error ||
              "Something went wrong. Please try again.",
            timestamp: Date.now(),
            status: "error",
            errorMessage: response.error,
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsLoading(false);
          return false;
        }
      } catch {
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Could not reach the server. Check your connection.",
          timestamp: Date.now(),
          status: "error",
          errorMessage: "Network error",
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsLoading(false);
        return false;
      }
    },
    [isLoading, sessionId]
  );

  const clearMessages = useCallback(() => {
    const userName = storage.getName();
    const welcome = createWelcomeMessage(userName);
    setMessages([welcome]);
    storage.setMessages([welcome]);
  }, []);

  const retryMessage = useCallback(
    async (messageContent: string) => {
      // Remove the error message, resend
      setMessages((prev) => prev.slice(0, -1));
      return sendMessage(messageContent);
    },
    [sendMessage]
  );

  return {
    messages,
    isLoading,
    isReady,
    sendMessage,
    clearMessages,
    retryMessage,
  };
}

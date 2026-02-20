"use client";

import { useState, useCallback } from "react";
import { GamificationProvider } from "@/context/GamificationContext";
import { useSessionId } from "@/hooks/useSessionId";
import { ChatPanel } from "./ChatPanel";
import { Sidebar } from "@/components/gamification/Sidebar";
import { MobileSidebarToggle } from "@/components/gamification/MobileSidebarToggle";
import { LevelUpToast } from "@/components/gamification/LevelUpToast";
import { OnboardingTooltips } from "@/components/gamification/OnboardingTooltips";
import { Button } from "@/components/ui/Button";

export function ChatLayout() {
  const { sessionId, resetSession } = useSessionId();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [levelUpToast, setLevelUpToast] = useState<number | null>(null);
  const [chatKey, setChatKey] = useState(0);

  const handleNewConversation = useCallback(() => {
    resetSession();
    setChatKey((k) => k + 1);
  }, [resetSession]);

  const handleLevelUp = useCallback((level: number) => {
    setLevelUpToast(level);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    // Re-key the chat panel so it re-mounts with the personalized welcome message
    setChatKey((k) => k + 1);
  }, []);

  if (!sessionId) {
    return (
      <div
        className="h-dvh flex items-center justify-center"
        style={{ background: "var(--color-bg)" }}
      >
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
    );
  }

  return (
    <GamificationProvider>
      <div className="h-dvh flex flex-col" style={{ background: "var(--color-bg)" }}>
        {/* Header */}
        <header
          className="shrink-0 flex items-center justify-between px-5 sm:px-7 h-16 border-b"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg animate-gold-pulse"
              style={{ background: "linear-gradient(135deg, #C9A96E, #9F7D55)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2" y="6" width="3" height="4" rx="0.75" fill="white" />
                <rect x="11" y="6" width="3" height="4" rx="0.75" fill="white" />
                <rect x="5" y="7" width="6" height="2" rx="0.5" fill="white" />
              </svg>
            </div>
            <h1
              className="text-lg tracking-tight"
              style={{
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-playfair), Georgia, serif",
                fontWeight: 600,
              }}
            >
              FitCoach
            </h1>
          </div>

          <Button variant="ghost" onClick={handleNewConversation}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="mr-1.5"
            >
              <path
                d="M2 7H12M7 2V12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            New chat
          </Button>
        </header>

        {/* Gold accent line */}
        <div
          className="shrink-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent 0%, #C9A96E 30%, #9F7D55 70%, transparent 100%)",
          }}
        />

        {/* Main content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Chat area */}
          <div className="flex-1 min-w-0">
            <ChatPanel
              key={chatKey}
              sessionId={sessionId}
              onLevelUp={handleLevelUp}
            />
          </div>

          {/* Desktop & Mobile sidebar */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Mobile toggle */}
        <MobileSidebarToggle onClick={() => setSidebarOpen(true)} />

        {/* Level-up toast */}
        {levelUpToast !== null && (
          <LevelUpToast
            level={levelUpToast}
            onDismiss={() => setLevelUpToast(null)}
          />
        )}

        {/* First-visit onboarding */}
        <OnboardingTooltips onComplete={handleOnboardingComplete} />
      </div>
    </GamificationProvider>
  );
}

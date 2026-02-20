"use client";

import { useEffect, useState } from "react";
import { getLevelName } from "@/lib/gamification";

interface LevelUpToastProps {
  level: number;
  onDismiss: () => void;
}

export function LevelUpToast({ level, onDismiss }: LevelUpToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss after 3.5s
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 250);
    }, 3500);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const levelName = getLevelName(level);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-end justify-center pb-24 sm:pb-8">
      <div
        className="pointer-events-auto px-5 py-3.5 rounded-2xl shadow-lg flex items-center gap-3 transition-all duration-250"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(12px)",
        }}
      >
        {/* Level number badge */}
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, #C9A96E, #9F7D55)",
            color: "white",
            fontFamily: "Satoshi, var(--font-dm-sans), sans-serif",
          }}
        >
          {level + 1}
        </div>

        <div>
          <p
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            Level Up!
          </p>
          <p
            className="text-sm font-semibold leading-tight"
            style={{
              color: "var(--color-text-primary)",
              fontFamily: "Satoshi, var(--font-dm-sans), sans-serif",
            }}
          >
            {levelName}
          </p>
        </div>

        {/* Decorative sparkle */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="ml-1"
          style={{ color: "var(--color-accent)" }}
        >
          <path
            d="M10 2L11.5 7.5L17 6L12.5 10L17 14L11.5 12.5L10 18L8.5 12.5L3 14L7.5 10L3 6L8.5 7.5L10 2Z"
            fill="currentColor"
            opacity="0.2"
          />
          <path
            d="M10 5L10.9 8.1L14 7L11.5 10L14 13L10.9 11.9L10 15L9.1 11.9L6 13L8.5 10L6 7L9.1 8.1L10 5Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  );
}

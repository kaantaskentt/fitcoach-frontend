"use client";

import type { BadgeId, BadgeProgress, BadgeDefinition } from "@/types";

interface BadgeCardProps {
  definition: BadgeDefinition;
  progress: BadgeProgress;
}

const BADGE_ICONS: Record<BadgeId, { emoji: string; color: string }> = {
  strength: { emoji: "💪", color: "#7C3AED" },
  nutrition: { emoji: "🥗", color: "#059669" },
  cardio: { emoji: "🏃", color: "#DC2626" },
  flexibility: { emoji: "🧘", color: "#7C3AED" },
  recovery: { emoji: "😴", color: "#2563EB" },
  consistency: { emoji: "📋", color: "#D97706" },
};

export function BadgeCard({ definition, progress }: BadgeCardProps) {
  const { unlocked, messageCount } = progress;
  const icon = BADGE_ICONS[definition.id];
  const progressRatio = Math.min(messageCount / definition.requiredMessages, 1);

  return (
    <div
      className="relative flex flex-col items-center p-3 rounded-xl text-center transition-all duration-300"
      style={{
        background: unlocked ? "var(--color-surface)" : "var(--color-bg)",
        border: unlocked
          ? "1px solid var(--color-border)"
          : "1px solid transparent",
        boxShadow: unlocked ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
      }}
    >
      {/* Badge icon */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-full text-xl mb-2 transition-all duration-300"
        style={{
          background: unlocked ? `${icon.color}14` : "var(--color-border)",
          filter: unlocked ? "none" : "grayscale(1)",
          opacity: unlocked ? 1 : 0.5,
        }}
      >
        {icon.emoji}
      </div>

      {/* Name */}
      <p
        className="text-[11px] font-semibold leading-tight mb-1"
        style={{
          color: unlocked
            ? "var(--color-text-primary)"
            : "var(--color-text-tertiary)",
          fontFamily: "Satoshi, var(--font-dm-sans), sans-serif",
        }}
      >
        {definition.name}
      </p>

      {/* Progress or check */}
      {unlocked ? (
        <div className="flex items-center gap-1">
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
          >
            <path
              d="M2 5L4.5 7.5L8 3"
              stroke="var(--color-success)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="text-[10px]"
            style={{ color: "var(--color-success)" }}
          >
            Unlocked
          </span>
        </div>
      ) : (
        <div className="w-full">
          {/* Mini progress bar */}
          <div
            className="h-1 rounded-full overflow-hidden mb-1"
            style={{ background: "var(--color-border)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progressRatio * 100}%`,
                background: "var(--color-text-tertiary)",
                transition: "width 400ms ease-out",
              }}
            />
          </div>
          <span
            className="text-[10px] tabular-nums"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {messageCount}/{definition.requiredMessages}
          </span>
        </div>
      )}

      {/* Shimmer effect on recent unlock */}
      {unlocked && progress.unlockedAt && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(37, 99, 235, 0.06) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation:
              Date.now() - new Date(progress.unlockedAt).getTime() < 10000
                ? "shimmer 2s ease-in-out 1"
                : "none",
          }}
        />
      )}
    </div>
  );
}

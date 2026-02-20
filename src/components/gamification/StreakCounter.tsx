"use client";

import { useGamificationContext } from "@/context/GamificationContext";

export function StreakCounter() {
  const { profile } = useGamificationContext();
  const streak = profile.streak.current;
  const hasStreak = streak > 0;

  // Flame intensity scales with streak length
  const flameScale = hasStreak ? Math.min(1 + streak * 0.06, 1.5) : 1;
  const flameOpacity = hasStreak ? Math.min(0.6 + streak * 0.05, 1) : 0.3;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{
        background: hasStreak ? "var(--color-streak-light)" : "var(--color-bg)",
      }}
    >
      {/* Flame icon */}
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
        style={{
          background: hasStreak
            ? "linear-gradient(135deg, #FDBA74, #EA580C)"
            : "var(--color-border)",
          opacity: flameOpacity,
          transform: `scale(${flameScale})`,
          transition: "transform 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 1.5C9 1.5 6.5 5 6.5 8C6.5 8.83 6.7 9.6 7.05 10.28C6.4 9.8 6 9 6 8.1C6 7.1 4.5 5 4.5 5C4.5 5 2.5 8 2.5 10.5C2.5 14.09 5.41 17 9 17C12.59 17 15.5 14.09 15.5 10.5C15.5 6.5 9 1.5 9 1.5Z"
            fill="white"
          />
          <path
            d="M9 15C10.66 15 12 13.66 12 12C12 10.5 9 7.5 9 7.5C9 7.5 6 10.5 6 12C6 13.66 7.34 15 9 15Z"
            fill={hasStreak ? "#FDBA74" : "#E7E5E4"}
          />
        </svg>
      </div>

      {/* Counter */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold leading-tight"
          style={{
            color: hasStreak
              ? "var(--color-streak)"
              : "var(--color-text-tertiary)",
            fontFamily: "Satoshi, var(--font-dm-sans), sans-serif",
          }}
        >
          {hasStreak ? `${streak} day${streak !== 1 ? "s" : ""}` : "No streak"}
        </p>
        <p
          className="text-[11px] leading-tight mt-0.5"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {hasStreak
            ? streak >= 7
              ? "On fire! Keep going"
              : "Keep chatting daily"
            : "Send a message to start"}
        </p>
      </div>
    </div>
  );
}

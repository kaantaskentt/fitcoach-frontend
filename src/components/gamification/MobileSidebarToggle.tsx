"use client";

import { useGamificationContext } from "@/context/GamificationContext";

interface MobileSidebarToggleProps {
  onClick: () => void;
}

export function MobileSidebarToggle({ onClick }: MobileSidebarToggleProps) {
  const { profile, xpProgress } = useGamificationContext();

  // Circumference of the ring (radius 16, C = 2πr)
  const circumference = 2 * Math.PI * 16;
  const strokeDashoffset = circumference * (1 - xpProgress);

  return (
    <button
      onClick={onClick}
      className="md:hidden fixed bottom-20 right-4 z-40 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-transform duration-150 active:scale-95"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      }}
      aria-label="Open progress panel"
    >
      {/* Circular XP ring around the button content */}
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 48 48"
      >
        <circle
          cx="24"
          cy="24"
          r="16"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="2"
        />
        <circle
          cx="24"
          cy="24"
          r="16"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>

      {/* Level number */}
      <span
        className="relative text-xs font-bold tabular-nums"
        style={{
          color: "var(--color-accent)",
          fontFamily: "Satoshi, var(--font-dm-sans), sans-serif",
        }}
      >
        {profile.level + 1}
      </span>
    </button>
  );
}

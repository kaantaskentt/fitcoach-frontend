"use client";

import { useEffect, useRef, useState } from "react";
import { useGamificationContext } from "@/context/GamificationContext";
import { LEVELS } from "@/lib/gamification";

export function XPProgressBar() {
  const { profile, levelName, xpForCurrentLevel, xpForNextLevel, xpProgress } =
    useGamificationContext();
  const barRef = useRef<HTMLDivElement>(null);
  const [animatedWidth, setAnimatedWidth] = useState(0);

  const isMaxLevel = profile.level >= LEVELS.length - 1;

  useEffect(() => {
    // Delay the width transition slightly for a visible animation on mount
    const timer = setTimeout(() => {
      setAnimatedWidth(xpProgress * 100);
    }, 100);
    return () => clearTimeout(timer);
  }, [xpProgress]);

  return (
    <div className="space-y-3">
      {/* Level badge + name */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold tabular-nums"
            style={{
              background: "var(--color-accent)",
              color: "white",
              fontFamily: "Satoshi, var(--font-dm-sans), sans-serif",
            }}
          >
            {profile.level + 1}
          </div>
          <div>
            <p
              className="text-sm font-semibold leading-tight"
              style={{
                color: "var(--color-text-primary)",
                fontFamily: "Satoshi, var(--font-dm-sans), sans-serif",
              }}
            >
              {levelName}
            </p>
            <p
              className="text-[11px] leading-tight mt-0.5"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {profile.totalMessages} messages sent
            </p>
          </div>
        </div>
        <p
          className="text-xs tabular-nums font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {profile.xp} XP
        </p>
      </div>

      {/* Progress bar */}
      <div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "var(--color-border)" }}
        >
          <div
            ref={barRef}
            className="h-full rounded-full"
            style={{
              width: `${animatedWidth}%`,
              background: isMaxLevel
                ? "linear-gradient(90deg, var(--color-accent), #8B6E4B)"
                : "var(--color-accent)",
              transition: "width 600ms cubic-bezier(0.22, 1, 0.36, 1)",
              transformOrigin: "left",
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span
            className="text-[11px] tabular-nums"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {xpForCurrentLevel} XP
          </span>
          <span
            className="text-[11px] tabular-nums"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {isMaxLevel ? "MAX" : `${xpForNextLevel} XP`}
          </span>
        </div>
      </div>
    </div>
  );
}

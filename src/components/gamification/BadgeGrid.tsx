"use client";

import { useGamificationContext } from "@/context/GamificationContext";
import { BADGE_DEFINITIONS } from "@/lib/gamification";
import { BadgeCard } from "./BadgeCard";

export function BadgeGrid() {
  const { profile } = useGamificationContext();

  const unlockedCount = Object.values(profile.badges).filter(
    (b) => b.unlocked
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3
          className="text-xs font-semibold uppercase tracking-wider"
          style={{
            color: "var(--color-text-secondary)",
            fontFamily: "Satoshi, var(--font-dm-sans), sans-serif",
          }}
        >
          Topic Badges
        </h3>
        <span
          className="text-[11px] tabular-nums"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {unlockedCount}/{BADGE_DEFINITIONS.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {BADGE_DEFINITIONS.map((def) => (
          <BadgeCard
            key={def.id}
            definition={def}
            progress={profile.badges[def.id]}
          />
        ))}
      </div>
    </div>
  );
}

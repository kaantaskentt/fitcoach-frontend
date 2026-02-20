"use client";

import { createContext, useContext } from "react";
import type { GamificationState, GamificationActions } from "@/types";
import { useGamification } from "@/hooks/useGamification";

type GamificationContextType = GamificationState & GamificationActions;

const GamificationContext = createContext<GamificationContextType | null>(null);

export function GamificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const gamification = useGamification();

  return (
    <GamificationContext.Provider value={gamification}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamificationContext(): GamificationContextType {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error(
      "useGamificationContext must be used within a GamificationProvider"
    );
  }
  return ctx;
}

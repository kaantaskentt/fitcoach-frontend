"use client";

import { useState, useEffect, useCallback } from "react";
import type { GamificationState, GamificationActions, MessageResult } from "@/types";
import { processMessage, getLevelName, getXPProgress } from "@/lib/gamification";
import { storage } from "@/lib/storage";

function buildState(isReady: boolean): GamificationState {
  const profile = storage.getProfile();
  const xpInfo = getXPProgress(profile.xp, profile.level);

  return {
    profile,
    levelName: getLevelName(profile.level),
    xpForCurrentLevel: xpInfo.current,
    xpForNextLevel: xpInfo.required,
    xpProgress: xpInfo.progress,
    isReady,
  };
}

export function useGamification(): GamificationState & GamificationActions {
  const [state, setState] = useState<GamificationState>({
    profile: {
      version: 1,
      sessionId: "",
      userName: "",
      xp: 0,
      level: 0,
      streak: { current: 0, lastActiveDate: null },
      badges: {
        strength: { unlocked: false, unlockedAt: null, messageCount: 0 },
        nutrition: { unlocked: false, unlockedAt: null, messageCount: 0 },
        cardio: { unlocked: false, unlockedAt: null, messageCount: 0 },
        flexibility: { unlocked: false, unlockedAt: null, messageCount: 0 },
        recovery: { unlocked: false, unlockedAt: null, messageCount: 0 },
        consistency: { unlocked: false, unlockedAt: null, messageCount: 0 },
      },
      totalMessages: 0,
    },
    levelName: "Beginner",
    xpForCurrentLevel: 0,
    xpForNextLevel: 75,
    xpProgress: 0,
    isReady: false,
  });

  useEffect(() => {
    setState(buildState(true));
  }, []);

  const recordMessage = useCallback((userMessage: string): MessageResult => {
    const currentProfile = storage.getProfile();
    const { updatedProfile, result } = processMessage(currentProfile, userMessage);
    storage.setProfile(updatedProfile);
    setState(buildState(true));
    return result;
  }, []);

  const resetConversation = useCallback((): string => {
    const newSessionId = storage.clearConversation();
    setState(buildState(true));
    return newSessionId;
  }, []);

  return { ...state, recordMessage, resetConversation };
}

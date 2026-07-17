"use client";

import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const profile = storage.getProfile();
      setSessionId(profile.sessionId);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const resetSession = () => {
    const newId = storage.clearConversation();
    setSessionId(newId);
    return newId;
  };

  return { sessionId, resetSession };
}

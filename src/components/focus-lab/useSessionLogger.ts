"use client";

import { useCallback } from "react";
import { bumpNow } from "@/lib/focus-lab/hooks";
import { addSession } from "@/lib/focus-lab/store";
import type { SessionEntry } from "@/lib/focus-lab/types";
import { awardProfileXp } from "@/lib/focus-lab/xp";
import { useToast } from "./Toast";

interface LogOptions {
  title: string;
  detail?: string;
  xp?: number;
  tone?: "gold" | "teal";
  silent?: boolean;
}

/** Persists a session, awards FitCoach XP when earned and shows a toast. */
export function useSessionLogger() {
  const notify = useToast();
  return useCallback(
    (entry: SessionEntry, opts: LogOptions) => {
      addSession(entry);
      bumpNow();
      const awarded = opts.xp ? awardProfileXp(opts.xp) : false;
      if (opts.silent && !awarded) return;
      notify({
        title: opts.title,
        detail: opts.detail,
        xp: awarded ? opts.xp : undefined,
        tone: opts.tone,
      });
    },
    [notify],
  );
}

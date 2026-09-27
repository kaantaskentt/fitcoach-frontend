"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext, Soundscape } from "@/lib/focus-lab/audio";
import { useFocusLabData } from "@/lib/focus-lab/hooks";
import { setPrefs } from "@/lib/focus-lab/store";
import type { SoundscapeId } from "@/lib/focus-lab/types";

/**
 * Owns the ambient Soundscape engine. The AudioContext is created lazily
 * inside `choose` (a click handler) so browsers treat it as user-initiated.
 */
export function useSoundscape() {
  const volume = useFocusLabData().prefs.volume;
  const engineRef = useRef<Soundscape | null>(null);
  const [playing, setPlaying] = useState<SoundscapeId>("off");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const choose = useCallback(
    (id: SoundscapeId) => {
      let engine = engineRef.current;
      if (!engine || engine.ctx.state === "closed") {
        if (id === "off") {
          setPlaying("off");
          return;
        }
        const ctx = getAudioContext();
        if (!ctx) return;
        engine = new Soundscape(ctx);
        engine.setVolume(volume);
        engineRef.current = engine;
        setAnalyser(engine.analyser);
      } else if (engine.ctx.state === "suspended") {
        void engine.ctx.resume();
      }
      engine.play(id);
      setPlaying(id);
      setPrefs({ soundscape: id });
    },
    [volume],
  );

  const changeVolume = useCallback((v: number) => {
    setPrefs({ volume: v });
    engineRef.current?.setVolume(v);
  }, []);

  useEffect(
    () => () => {
      try {
        engineRef.current?.dispose();
      } catch {
        /* context may already be closed */
      }
      engineRef.current = null;
    },
    [],
  );

  return { playing, choose, volume, changeVolume, analyser };
}

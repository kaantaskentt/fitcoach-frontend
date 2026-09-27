"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { closeAudioContext } from "@/lib/focus-lab/audio";
import { isTypingTarget } from "@/lib/focus-lab/hooks";
import {
  getHashModule,
  getServerHashModule,
  MODULES,
  navigateToModule,
  subscribeHash,
} from "@/lib/focus-lab/modules";
import type { ModuleId } from "@/lib/focus-lab/types";
import { BreathLab } from "./breath/BreathLab";
import { DeepWork } from "./deep-work/DeepWork";
import { Hero, HeroBackdrop } from "./Hero";
import { ReactionLab } from "./reaction/ReactionLab";
import { SchulteGrid } from "./schulte/SchulteGrid";
import { StatsView } from "./stats/StatsView";
import { StroopChallenge } from "./stroop/StroopChallenge";
import { ToastProvider } from "./Toast";
import { TopBar } from "./TopBar";

export default function FocusLabApp() {
  const active = useSyncExternalStore(subscribeHash, getHashModule, getServerHashModule);
  const mainRef = useRef<HTMLElement>(null);

  const select = useCallback((id: ModuleId) => {
    navigateToModule(id);
    const main = mainRef.current;
    if (!main) return;
    // If the user scrolled past the module's top, bring it back into view.
    const top = main.getBoundingClientRect().top + window.scrollY - 120;
    if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
  }, []);

  // Global shortcuts 1–6 switch modules.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= MODULES.length) {
        select(MODULES[n - 1].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  // Release the shared AudioContext when leaving the lab.
  useEffect(() => () => closeAudioContext(), []);

  return (
    <ToastProvider>
      <div className="fl-root relative isolate font-sans">
        <div className="fl-grain" aria-hidden />
        <HeroBackdrop />
        <TopBar active={active} onSelect={select} />
        <Hero />

        <main
          ref={mainRef}
          className="relative mx-auto max-w-[1240px] px-4 pb-28 sm:px-6"
        >
          <div className="fl-hairline mb-10 sm:mb-14" aria-hidden />
          {MODULES.map((m) => {
            const isActive = m.id === active;
            return (
              <section
                key={m.id}
                id={`panel-${m.id}`}
                role="tabpanel"
                aria-labelledby={`tab-${m.id}`}
                hidden={!isActive}
                className={isActive ? "fl-anim-rise" : undefined}
              >
                {m.id === "deep-work" && <DeepWork meta={m} active={isActive} />}
                {m.id === "breath" && <BreathLab meta={m} active={isActive} />}
                {m.id === "reaction" && <ReactionLab meta={m} active={isActive} />}
                {m.id === "schulte" && <SchulteGrid meta={m} active={isActive} />}
                {m.id === "stroop" && <StroopChallenge meta={m} active={isActive} />}
                {m.id === "stats" && <StatsView meta={m} active={isActive} />}
              </section>
            );
          })}
        </main>

        <footer className="relative mx-auto flex max-w-[1240px] flex-col gap-2 border-t border-[rgba(201,169,110,0.08)] px-4 py-8 text-[12px] text-[#8A8072] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="fl-micro">FitCoach Focus Lab · stored on this device</span>
          <span className="fl-mono hidden sm:inline">
            Keys&nbsp; 1–6 modules · Space start · R reset
          </span>
        </footer>
      </div>
    </ToastProvider>
  );
}

"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { getAudioContext, peekAudioContext, playChime } from "@/lib/focus-lab/audio";
import {
  isInteractiveTarget,
  isTypingTarget,
  useCoarseNow,
  useFocusLabData,
  usePrefersReducedMotion,
} from "@/lib/focus-lab/hooks";
import type { ModuleMeta } from "@/lib/focus-lab/modules";
import { makeId, setPrefs } from "@/lib/focus-lab/store";
import { dayKey, formatClock, formatMinutes, MINUTE } from "@/lib/focus-lab/time";
import { XP_DEEP_WORK } from "@/lib/focus-lab/xp";
import { ParticleBurst } from "../ParticleBurst";
import { useToast } from "../Toast";
import { ChoiceGroup, MicroLabel, ModuleHeader } from "../ui";
import { useSessionLogger } from "../useSessionLogger";
import { AudioVisualizer } from "./AudioVisualizer";
import { SoundscapePanel } from "./SoundscapePanel";
import { TimerRing } from "./TimerRing";
import { useSoundscape } from "./useSoundscape";

type Status = "idle" | "running" | "paused" | "done";

interface TimerState {
  status: Status;
  plannedMs: number;
  /** Epoch ms at which the current running segment began. */
  startedAt: number | null;
  /** Elapsed ms accumulated before the current segment. */
  bankedMs: number;
  completed: boolean;
}

const IDLE: TimerState = {
  status: "idle",
  plannedMs: 0,
  startedAt: null,
  bankedMs: 0,
  completed: false,
};

const PRESETS = [25, 50, 90];
const DEFAULT_TITLE = "Focus Lab — FitCoach";

function elapsedAt(t: TimerState, at: number): number {
  const live = t.status === "running" && t.startedAt !== null ? Math.max(0, at - t.startedAt) : 0;
  return t.bankedMs + live;
}

export function DeepWork({ meta, active }: { meta: ModuleMeta; active: boolean }) {
  const data = useFocusLabData();
  const coarseNow = useCoarseNow();
  const reduced = usePrefersReducedMotion();
  const log = useSessionLogger();
  const notify = useToast();
  const sound = useSoundscape();

  const minutes = data.prefs.deepWorkMinutes;
  const [timer, setTimer] = useState<TimerState>(IDLE);
  const [now, setNow] = useState(0);
  const [intention, setIntention] = useState("");
  const [burst, setBurst] = useState(0);
  const [announce, setAnnounce] = useState("");

  const planned = timer.status === "idle" ? minutes * MINUTE : timer.plannedMs;
  const elapsed = Math.min(planned, elapsedAt(timer, now));
  const remaining = Math.max(0, planned - elapsed);
  const progress = planned > 0 ? elapsed / planned : 0;
  const clock = timer.status === "done" ? formatClock(elapsed) : formatClock(remaining);

  /* ─── transitions ─── */

  const complete = (completed: boolean, at: number) => {
    const total = Math.min(timer.plannedMs, elapsedAt(timer, at));
    setNow(at);
    if (!completed && total < MINUTE) {
      setTimer(IDLE);
      setAnnounce("Session discarded.");
      notify({ title: "Session discarded", detail: "Under a minute — nothing logged." });
      return;
    }
    setTimer({ ...timer, status: "done", startedAt: null, bankedMs: total, completed });
    const text = intention.trim();
    log(
      {
        kind: "deep-work",
        id: makeId(),
        at,
        durationMs: total,
        plannedMs: timer.plannedMs,
        completed,
        intention: text,
      },
      {
        title: completed ? "Deep work complete" : "Session logged",
        detail: `${formatMinutes(total)} · ${text || "Untitled focus"}`,
        xp: completed ? XP_DEEP_WORK : undefined,
      },
    );
    if (completed) {
      const ctx = peekAudioContext();
      if (ctx) playChime(ctx);
      setBurst((b) => b + 1);
      setAnnounce(`Session complete. ${formatMinutes(total)} of deep work logged.`);
    } else {
      setAnnounce(`Finished early. ${formatMinutes(total)} logged.`);
    }
  };

  const start = () => {
    const t = Date.now();
    getAudioContext(); // unlock audio on this gesture so the chime can play later
    setTimer({
      status: "running",
      plannedMs: minutes * MINUTE,
      startedAt: t,
      bankedMs: 0,
      completed: false,
    });
    setNow(t);
    setAnnounce(`Focus started. ${minutes} minutes.`);
  };

  const pause = () => {
    const t = Date.now();
    setTimer({ ...timer, status: "paused", startedAt: null, bankedMs: elapsedAt(timer, t) });
    setNow(t);
    setAnnounce("Paused.");
  };

  const resume = () => {
    const t = Date.now();
    setTimer({ ...timer, status: "running", startedAt: t });
    setNow(t);
    setAnnounce("Resumed.");
  };

  const reset = () => {
    setTimer(IDLE);
    setAnnounce("Timer reset.");
  };

  const toggle = () => {
    if (timer.status === "running") pause();
    else if (timer.status === "paused") resume();
    else start();
  };

  const setMinutes = (m: number) => {
    setPrefs({ deepWorkMinutes: Math.min(180, Math.max(5, m)) });
    if (timer.status === "done") setTimer(IDLE);
  };

  /* ─── clock ─── */

  const onTick = useEffectEvent(() => {
    if (timer.status !== "running") return;
    const t = Date.now();
    if (elapsedAt(timer, t) >= timer.plannedMs) complete(true, t);
    else setNow(t);
  });

  useEffect(() => {
    if (timer.status !== "running") return;
    const id = window.setInterval(() => onTick(), 250);
    const onVisible = () => onTick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [timer.status]);

  /* ─── document title ─── */

  const status = timer.status;
  const remainingLabel = formatClock(remaining);
  useEffect(() => {
    if (status === "running") document.title = `▶ ${remainingLabel} · Focus Lab`;
    else if (status === "paused") document.title = `❚❚ ${remainingLabel} · Focus Lab`;
    else document.title = DEFAULT_TITLE;
  }, [status, remainingLabel]);

  useEffect(() => () => void (document.title = DEFAULT_TITLE), []);

  /* ─── keyboard ─── */

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === "Space" || e.key === " ") {
      if (isInteractiveTarget(e.target)) return;
      e.preventDefault();
      toggle();
    } else if (e.key === "r" || e.key === "R") {
      if (isTypingTarget(e.target)) return;
      reset();
    }
  });

  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active]);

  /* ─── today summary ─── */

  const today = useMemo(() => {
    if (coarseNow === 0) return null;
    const key = dayKey(coarseNow);
    const list = data.sessions.filter((s) => s.kind === "deep-work" && dayKey(s.at) === key);
    const ms = list.reduce((sum, s) => (s.kind === "deep-work" ? sum + s.durationMs : sum), 0);
    return { count: list.length, ms };
  }, [data.sessions, coarseNow]);

  const phaseLabel =
    status === "running" ? "Focusing" : status === "paused" ? "Paused" : status === "done" ? (timer.completed ? "Complete" : "Logged") : "Ready";
  const locked = status === "running" || status === "paused";
  const soundOn = sound.playing !== "off";

  return (
    <div>
      <ModuleHeader meta={meta} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
        {/* ─── Ring stage ─── */}
        <div className="fl-panel relative flex flex-col items-center overflow-hidden px-4 pt-10 pb-8 sm:px-8 sm:pt-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
            style={{
              opacity: status === "running" ? 1 : 0.55,
              background:
                "radial-gradient(55% 45% at 50% 42%, rgba(201,169,110,0.13), transparent 70%)",
            }}
          />
          <div className="relative">
            <TimerRing progress={progress} running={status === "running"}>
              <MicroLabel
                className={`mb-3 ${status === "done" && timer.completed ? "fl-shimmer-text" : status === "running" ? "text-[#C9A96E]" : ""}`}
              >
                {phaseLabel}
              </MicroLabel>
              <p
                className={`fl-mono text-[clamp(46px,15vw,86px)] leading-none font-normal tracking-[-0.04em] text-[#F3ECDF] ${
                  status === "paused" ? "fl-anim-breathe" : ""
                }`}
                aria-hidden
              >
                {clock}
              </p>
              <p className="mt-4 line-clamp-2 max-w-[24ch] text-[13px] leading-snug text-[#B3A999]">
                {locked || status === "done" ? (
                  intention.trim() ? (
                    <span className="fl-serif text-[15px] text-[#D9CDB8] italic">“{intention.trim()}”</span>
                  ) : (
                    <span>of {formatClock(planned)} planned</span>
                  )
                ) : (
                  <span>
                    {minutes} min · deep work
                  </span>
                )}
              </p>
            </TimerRing>
            <ParticleBurst trigger={burst} className="-top-10 -left-10 h-[calc(100%+80px)] w-[calc(100%+80px)]" />
          </div>

          <div className="mt-5 flex h-8 items-center justify-center" title={soundOn ? "Live soundscape" : "Soundscape off"}>
            <AudioVisualizer analyser={sound.analyser} on={soundOn} reduced={reduced} />
          </div>

          <div className="mt-5 flex w-full max-w-[420px] flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={toggle}
              className="fl-btn fl-btn-gold min-w-[150px] px-7 text-[15px]"
            >
              {status === "running" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="currentColor">
                    <rect x="2.5" y="2" width="3" height="10" rx="1" />
                    <rect x="8.5" y="2" width="3" height="10" rx="1" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="currentColor">
                    <path d="M4 2.2v9.6a.6.6 0 00.9.5l7.4-4.8a.6.6 0 000-1L4.9 1.7a.6.6 0 00-.9.5z" />
                  </svg>
                  {status === "paused" ? "Resume" : status === "done" ? "Go again" : "Start focus"}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={status === "idle"}
              className="fl-btn fl-btn-ghost"
              aria-label="Reset timer"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M3 8a5 5 0 105-5H5" strokeLinecap="round" />
                <path d="M6.5 1L4.5 3l2 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">Reset</span>
            </button>
            {locked ? (
              <button type="button" onClick={() => complete(false, Date.now())} className="fl-btn fl-btn-ghost">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Finish early
              </button>
            ) : null}
          </div>
          <p className="fl-mono mt-5 hidden text-[11px] text-[#6F6659] sm:block" aria-hidden>
            SPACE {status === "running" ? "pause" : "start"} · R reset
          </p>
          <p className="sr-only" aria-live="polite">
            {announce}
          </p>
        </div>

        {/* ─── Controls column ─── */}
        <div className="flex flex-col gap-5">
          <div className="fl-panel p-5 sm:p-6">
            <label htmlFor="fl-intention" className="fl-micro block">
              Intention
            </label>
            <input
              id="fl-intention"
              type="text"
              value={intention}
              maxLength={120}
              onChange={(e) => setIntention(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !locked) {
                  e.preventDefault();
                  start();
                  e.currentTarget.blur();
                }
              }}
              placeholder="What deserves your focus?"
              className="fl-input fl-serif mt-3 text-[17px] italic"
              autoComplete="off"
            />
            <div className="mt-4 flex items-center justify-between text-[12.5px] text-[#8A8072]">
              <span>Logged with the session.</span>
              <span className="fl-mono">
                {today ? `${today.count} today · ${formatMinutes(today.ms)}` : "—"}
              </span>
            </div>
          </div>

          <div className="fl-panel p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <MicroLabel as="h3">Duration</MicroLabel>
              {locked ? <MicroLabel className="text-[#C9A96E]">Locked while running</MicroLabel> : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ChoiceGroup
                label="Preset duration"
                value={PRESETS.includes(minutes) ? minutes : -1}
                options={PRESETS.map((p) => ({ value: p, label: <span className="fl-mono">{p}′</span>, ariaLabel: `${p} minutes` }))}
                onChange={setMinutes}
                disabled={locked}
              />
              <div className="flex items-center rounded-full border border-[rgba(201,169,110,0.2)]" role="group" aria-label="Custom duration">
                <button
                  type="button"
                  aria-label="Decrease duration by 5 minutes"
                  disabled={locked || minutes <= 5}
                  onClick={() => setMinutes(minutes - 5)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] text-[#B3A999] transition-colors hover:text-[#F3E4C4] disabled:opacity-30"
                >
                  −
                </button>
                <output className="fl-mono w-14 text-center text-[15px] text-[#EDE6DA]" aria-live="polite">
                  {minutes}
                  <span className="text-[11px] text-[#8A8072]">m</span>
                </output>
                <button
                  type="button"
                  aria-label="Increase duration by 5 minutes"
                  disabled={locked || minutes >= 180}
                  onClick={() => setMinutes(minutes + 5)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] text-[#B3A999] transition-colors hover:text-[#F3E4C4] disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <SoundscapePanel
            playing={sound.playing}
            volume={sound.volume}
            onChoose={sound.choose}
            onVolume={sound.changeVolume}
          />
        </div>
      </div>
    </div>
  );
}

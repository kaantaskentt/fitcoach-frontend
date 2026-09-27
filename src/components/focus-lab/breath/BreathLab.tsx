"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  BREATH_TONE_HIGH,
  BREATH_TONE_LOW,
  BreathTone,
  getAudioContext,
  peekAudioContext,
  playChime,
} from "@/lib/focus-lab/audio";
import {
  BREATH_PATTERN_ORDER,
  BREATH_PATTERNS,
  breathPosition,
  cycleSeconds,
  type BreathPhase,
} from "@/lib/focus-lab/breath";
import { useFocusLabData, usePrefersReducedMotion } from "@/lib/focus-lab/hooks";
import type { ModuleMeta } from "@/lib/focus-lab/modules";
import { makeId, setPrefs } from "@/lib/focus-lab/store";
import { formatClock } from "@/lib/focus-lab/time";
import { XP_BREATH } from "@/lib/focus-lab/xp";
import { ChoiceGroup, CornerTicks, MicroLabel, ModuleHeader } from "../ui";
import { useSessionLogger } from "../useSessionLogger";
import { drawOrb, makeOrbParticles, type OrbFrame, type OrbParticle } from "./orbRenderer";

type Status = "idle" | "running" | "paused" | "done";

interface Run {
  status: Status;
  /** performance.now() when the current running segment began. */
  startedAt: number | null;
  bankedMs: number;
}

interface Display {
  phaseIndex: number;
  label: string;
  count: number;
  round: number;
}

const IDLE_RUN: Run = { status: "idle", startedAt: null, bankedMs: 0 };
const IDLE_DISPLAY: Display = { phaseIndex: -1, label: "Ready", count: 0, round: 0 };

export function BreathLab({ meta, active }: { meta: ModuleMeta; active: boolean }) {
  const { prefs } = useFocusLabData();
  const reduced = usePrefersReducedMotion();
  const log = useSessionLogger();
  const pattern = BREATH_PATTERNS[prefs.breathPattern];
  const target = prefs.breathRounds;

  const [run, setRun] = useState<Run>(IDLE_RUN);
  const [display, setDisplay] = useState<Display>(IDLE_DISPLAY);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<OrbParticle[] | null>(null);
  const toneRef = useRef<BreathTone | null>(null);

  const cycle = cycleSeconds(pattern);
  const locked = run.status === "running" || run.status === "paused";

  const stopTone = () => {
    toneRef.current?.stop();
    toneRef.current = null;
  };

  const ensureTone = () => {
    if (!prefs.breathTone || toneRef.current) return;
    const ctx = getAudioContext();
    if (ctx) toneRef.current = new BreathTone(ctx);
  };

  /* ─── effect events (read latest state from inside the rAF loop) ─── */

  const onPhase = useEffectEvent((phase: BreathPhase, remaining: number) => {
    const tone = toneRef.current;
    if (!tone) return;
    if (phase.kind === "inhale") tone.glide(BREATH_TONE_HIGH * (phase.to < 1 ? 0.94 : 1), remaining, 0.06);
    else if (phase.kind === "top-up") tone.glide(BREATH_TONE_HIGH * 1.06, remaining, 0.065);
    else if (phase.kind === "exhale") tone.glide(BREATH_TONE_LOW, remaining, 0.05);
    else if (phase.kind === "hold-in") tone.glide(BREATH_TONE_HIGH, 0.3, 0.03);
    else tone.glide(BREATH_TONE_LOW, 0.3, 0.018);
  });

  const onComplete = useEffectEvent(() => {
    stopTone();
    setRun({ status: "done", startedAt: null, bankedMs: 0 });
    setDisplay({ phaseIndex: -1, label: "Complete", count: 0, round: target });
    log(
      {
        kind: "breath",
        id: makeId(),
        at: Date.now(),
        pattern: pattern.id,
        rounds: target,
        targetRounds: target,
        durationMs: Math.round(target * cycle * 1000),
        completed: true,
      },
      {
        title: "Breath session complete",
        detail: `${pattern.name} · ${target} rounds`,
        xp: XP_BREATH,
        tone: "teal",
      },
    );
    const ctx = peekAudioContext();
    if (ctx) playChime(ctx, 0.12);
  });

  /* ─── render loop ─── */

  useEffect(() => {
    if (!active && run.status !== "running") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let size = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size = canvas.clientWidth;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    if (!particlesRef.current) particlesRef.current = makeOrbParticles();
    const particles = particlesRef.current;
    let lastKey = "";
    let lastT = performance.now();
    let raf = 0;

    const loop = (t: number) => {
      const dt = Math.min(64, t - lastT);
      lastT = t;
      let frame: OrbFrame;
      if (run.status === "running" || run.status === "paused") {
        const live = run.status === "running" && run.startedAt !== null ? t - run.startedAt : 0;
        const pos = breathPosition(pattern, (run.bankedMs + Math.max(0, live)) / 1000);
        if (run.status === "running" && pos.round >= target) {
          onComplete();
          return;
        }
        frame = {
          fullness: pos.fullness,
          phaseKind: pos.phase.kind,
          cycleProgress: pos.cycleProgress,
          active: true,
        };
        const count = Math.max(1, Math.ceil(pos.phaseRemaining - 0.001));
        const phaseKey = `${pos.round}|${pos.phaseIndex}`;
        const key = `${phaseKey}|${count}`;
        if (key !== lastKey) {
          const phaseChanged = !lastKey.startsWith(`${phaseKey}|`);
          lastKey = key;
          setDisplay({ phaseIndex: pos.phaseIndex, label: pos.phase.label, count, round: pos.round });
          if (phaseChanged && run.status === "running") onPhase(pos.phase, pos.phaseRemaining);
        }
      } else {
        frame = {
          fullness: run.status === "done" ? 0.62 + 0.04 * Math.sin(t / 1400) : 0.3 + 0.12 * Math.sin(t / 2300),
          phaseKind: "idle",
          cycleProgress: -1,
          active: false,
        };
      }
      if (size > 0) drawOrb(ctx, size, pattern, frame, particles, t, dt, reduced);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, run, pattern, target, reduced]);

  useEffect(
    () => () => {
      toneRef.current?.stop();
      toneRef.current = null;
    },
    [],
  );

  /* ─── handlers ─── */

  const start = () => {
    ensureTone();
    setDisplay({ phaseIndex: 0, label: pattern.phases[0].label, count: Math.ceil(pattern.phases[0].seconds), round: 0 });
    setRun({ status: "running", startedAt: performance.now(), bankedMs: 0 });
  };

  const pause = () => {
    stopTone();
    const live = run.startedAt !== null ? performance.now() - run.startedAt : 0;
    setRun({ status: "paused", startedAt: null, bankedMs: run.bankedMs + live });
  };

  const resume = () => {
    ensureTone();
    setRun({ ...run, status: "running", startedAt: performance.now() });
  };

  const end = () => {
    stopTone();
    const live = run.status === "running" && run.startedAt !== null ? performance.now() - run.startedAt : 0;
    const elapsedMs = run.bankedMs + live;
    const rounds = Math.floor(elapsedMs / 1000 / cycle);
    setRun(IDLE_RUN);
    setDisplay(IDLE_DISPLAY);
    if (rounds >= 1) {
      log(
        {
          kind: "breath",
          id: makeId(),
          at: Date.now(),
          pattern: pattern.id,
          rounds,
          targetRounds: target,
          durationMs: Math.round(elapsedMs),
          completed: false,
        },
        { title: "Breath logged", detail: `${pattern.name} · ${rounds} of ${target} rounds`, tone: "teal" },
      );
    }
  };

  const toggleTone = () => {
    const next = !prefs.breathTone;
    setPrefs({ breathTone: next });
    if (!next) stopTone();
    else if (run.status === "running") {
      const ctx = getAudioContext();
      if (ctx && !toneRef.current) toneRef.current = new BreathTone(ctx);
    }
  };

  const onPrimary = () => {
    if (run.status === "running") pause();
    else if (run.status === "paused") resume();
    else start();
  };
  const primaryLabel =
    run.status === "running" ? "Pause" : run.status === "paused" ? "Resume" : run.status === "done" ? "Breathe again" : "Begin";

  const roundShown = run.status === "done" ? target : Math.min(target, display.round + (locked ? 1 : 0));

  return (
    <div>
      <ModuleHeader meta={meta} tone="teal" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
        <div className="fl-panel relative flex flex-col items-center overflow-hidden px-4 pt-6 pb-8 sm:px-8">
          <CornerTicks tone="teal" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(50% 42% at 50% 40%, rgba(95,184,174,0.10), transparent 70%)",
            }}
          />
          <div className="relative flex w-full items-center justify-between px-2 pt-2">
            <MicroLabel className="text-[#8FCFC6]">
              {pattern.name} <span className="fl-mono ml-1 tracking-normal text-[#8A8072]">{pattern.short}</span>
            </MicroLabel>
            <p className="fl-mono text-[12px] text-[#B3A999]" aria-label={`Round ${roundShown} of ${target}`}>
              <span className="text-[#EDE6DA]">{String(roundShown).padStart(2, "0")}</span>
              <span className="text-[#6F6659]"> / {String(target).padStart(2, "0")}</span>
            </p>
          </div>

          <canvas
            ref={canvasRef}
            aria-hidden
            className="relative mt-2 aspect-square w-[min(84vw,440px)]"
          />

          <div className="relative -mt-2 flex min-h-[64px] items-baseline justify-center gap-4">
            <span
              className={`fl-serif text-[34px] font-semibold italic sm:text-[40px] ${
                run.status === "done" ? "fl-shimmer-text" : "text-[#E6F4F1]"
              }`}
            >
              {display.label}
            </span>
            {locked ? (
              <span className="fl-mono text-[34px] text-[#8FCFC6] sm:text-[40px]" aria-hidden>
                {display.count}
              </span>
            ) : null}
          </div>
          <p className="sr-only" aria-live="assertive">
            {locked || run.status === "done" ? display.label : ""}
          </p>

          <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button type="button" onClick={onPrimary} className="fl-btn fl-btn-teal min-w-[150px] px-7 text-[15px]">
              {primaryLabel}
            </button>
            {locked ? (
              <button type="button" onClick={end} className="fl-btn fl-btn-ghost">
                End session
              </button>
            ) : null}
          </div>

          <ol className="relative mt-7 flex flex-wrap justify-center gap-1.5" aria-label="Pattern phases">
            {pattern.phases.map((ph, i) => {
              const on = locked && display.phaseIndex === i;
              return (
                <li
                  key={`${ph.kind}-${i}`}
                  className={`fl-mono flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] transition-all duration-300 ${
                    on
                      ? "border-[rgba(95,184,174,0.6)] bg-[rgba(95,184,174,0.12)] text-[#CFF1EC]"
                      : "border-[rgba(201,169,110,0.12)] text-[#8A8072]"
                  }`}
                >
                  <span className="font-sans">{ph.label}</span>
                  <span>{ph.seconds}s</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex flex-col gap-5">
          <div className="fl-panel p-5 sm:p-6">
            <MicroLabel as="h3" className="mb-4">
              Pattern
            </MicroLabel>
            <div role="radiogroup" aria-label="Breathing pattern" className="flex flex-col gap-2">
              {BREATH_PATTERN_ORDER.map((id) => {
                const p = BREATH_PATTERNS[id];
                const on = p.id === pattern.id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={locked}
                    onClick={() => {
                      setPrefs({ breathPattern: id });
                      if (run.status === "done") setRun(IDLE_RUN);
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left transition-all duration-300 disabled:cursor-not-allowed ${
                      on
                        ? "border-[rgba(95,184,174,0.55)] bg-[rgba(95,184,174,0.07)]"
                        : "border-[rgba(201,169,110,0.1)] hover:border-[rgba(201,169,110,0.28)] disabled:opacity-40"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`text-[14.5px] font-medium ${on ? "text-[#E6F4F1]" : "text-[#D9CDB8]"}`}>{p.name}</span>
                      <span className={`fl-mono text-[11.5px] ${on ? "text-[#8FCFC6]" : "text-[#8A8072]"}`}>{p.short}</span>
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-[#8A8072]">{p.why}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="fl-panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <MicroLabel as="h3">Rounds</MicroLabel>
                <p className="fl-mono mt-2 text-[12px] text-[#8A8072]">
                  ≈ {formatClock(target * cycle * 1000)} total
                </p>
              </div>
              <ChoiceGroup
                label="Target rounds"
                value={target}
                tone="teal"
                disabled={locked}
                options={[4, 8, 12].map((n) => ({ value: n, label: <span className="fl-mono">{n}</span>, ariaLabel: `${n} rounds` }))}
                onChange={(n) => {
                  setPrefs({ breathRounds: n });
                  if (run.status === "done") setRun(IDLE_RUN);
                }}
              />
            </div>
            <div className="fl-hairline my-5" aria-hidden />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] text-[#EDE6DA]" id="fl-tone-label">Guidance tone</p>
                <p className="mt-0.5 text-[12.5px] text-[#8A8072]">Pitch rises on inhale, falls on exhale.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.breathTone}
                aria-labelledby="fl-tone-label"
                onClick={toggleTone}
                className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-300 ${
                  prefs.breathTone
                    ? "border-[rgba(95,184,174,0.7)] bg-[rgba(95,184,174,0.35)]"
                    : "border-[rgba(201,169,110,0.25)] bg-[rgba(255,255,255,0.03)]"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute top-1/2 left-1 h-5 w-5 -translate-y-1/2 rounded-full transition-transform duration-300 ${
                    prefs.breathTone ? "translate-x-5 bg-[#CFF1EC]" : "bg-[#8A8072]"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

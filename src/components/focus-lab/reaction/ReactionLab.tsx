"use client";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  mean,
  randomReactionDelay,
  rateReaction,
  REACTION_TRIALS_PER_RUN,
} from "@/lib/focus-lab/games";
import { isInteractiveTarget, useFocusLabData } from "@/lib/focus-lab/hooks";
import type { ModuleMeta } from "@/lib/focus-lab/modules";
import { addReactionTrials, makeId } from "@/lib/focus-lab/store";
import { MicroLabel, ModuleHeader, StatBlock } from "../ui";
import { useSessionLogger } from "../useSessionLogger";
import { ReactionHistogram } from "./ReactionHistogram";

type Phase = "idle" | "waiting" | "go" | "result" | "early" | "summary";

const TIER_COLORS = ["#B3A999", "#D9CDB8", "#E3C88F", "#F3E1B9"];

export function ReactionLab({ meta, active }: { meta: ModuleMeta; active: boolean }) {
  const data = useFocusLabData();
  const log = useSessionLogger();
  const [phase, setPhase] = useState<Phase>("idle");
  const [trials, setTrials] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const goAtRef = useRef(0);

  // Timestamp the frame in which gold is committed to the DOM (just before paint).
  useLayoutEffect(() => {
    if (phase === "go") goAtRef.current = performance.now();
  }, [phase]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  // Track visibility so a trial that fires while the module is hidden is voided.
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const beginWait = () => {
    setPhase("waiting");
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setPhase(activeRef.current && !document.hidden ? "go" : "idle");
    }, randomReactionDelay());
  };

  const press = (at: number) => {
    switch (phase) {
      case "idle":
      case "result":
      case "early":
        beginWait();
        return;
      case "summary":
        setTrials([]);
        setFalseStarts(0);
        beginWait();
        return;
      case "waiting":
        if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setFalseStarts((n) => n + 1);
        setPhase("early");
        return;
      case "go": {
        const rt = Math.max(1, Math.round(at - goAtRef.current));
        const next = [...trials, rt];
        setTrials(next);
        addReactionTrials([{ ms: rt, at: Date.now() }]);
        if (next.length >= REACTION_TRIALS_PER_RUN) {
          setPhase("summary");
          const avg = Math.round(mean(next));
          const best = Math.min(...next);
          log(
            { kind: "reaction", id: makeId(), at: Date.now(), trials: next, avgMs: avg, bestMs: best, falseStarts },
            { title: `Reaction · ${avg} ms average`, detail: `Best ${best} ms · ${rateReaction(avg).label}` },
          );
        } else {
          setPhase("result");
        }
      }
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const at = performance.now();
    e.preventDefault();
    press(at);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (!e.repeat) press(performance.now());
  };

  const onWindowKey = useEffectEvent((e: KeyboardEvent) => {
    if ((e.code !== "Space" && e.key !== " ") || e.repeat) return;
    if (e.metaKey || e.ctrlKey || e.altKey || isInteractiveTarget(e.target)) return;
    e.preventDefault();
    press(performance.now());
  });

  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => onWindowKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [active]);

  const last = trials[trials.length - 1];
  const avg = trials.length ? Math.round(mean(trials)) : null;
  const best = trials.length ? Math.min(...trials) : null;
  const rating = avg !== null ? rateReaction(avg) : null;
  const trialNo = Math.max(1, Math.min(REACTION_TRIALS_PER_RUN, trials.length + (phase === "summary" || phase === "result" ? 0 : 1)));

  const isGo = phase === "go";
  const panelTone =
    phase === "go"
      ? "bg-[linear-gradient(160deg,#F1DDB0_0%,#C9A96E_45%,#9F7D55_100%)] border-[rgba(243,225,185,0.8)]"
      : phase === "waiting"
        ? "bg-[#0D0B09] border-[rgba(201,169,110,0.08)]"
        : phase === "early"
          ? "bg-[radial-gradient(60%_60%_at_50%_45%,rgba(224,104,94,0.14),#12100E_75%)] border-[rgba(224,104,94,0.35)]"
          : "bg-[radial-gradient(60%_55%_at_50%_40%,rgba(201,169,110,0.1),#12100E_75%)] border-[rgba(201,169,110,0.14)]";

  return (
    <div>
      <ModuleHeader meta={meta} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        <button
          type="button"
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
          onClick={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Reaction test panel. Press Space or tap."
          aria-describedby="fl-reaction-status"
          className={`relative flex min-h-[380px] w-full touch-manipulation flex-col items-center justify-center overflow-hidden rounded-[28px] border px-6 py-10 text-center select-none sm:min-h-[480px] ${panelTone} ${
            isGo ? "" : "transition-[background-color,border-color] duration-300"
          }`}
        >
          <span aria-hidden className="absolute top-5 left-6 flex items-center gap-2">
            <span className={`fl-micro ${isGo ? "text-[#3A2C18]" : ""}`}>Trial</span>
            <span className={`fl-mono text-[12px] ${isGo ? "text-[#2A1F10]" : "text-[#B3A999]"}`}>
              {trialNo} / {REACTION_TRIALS_PER_RUN}
            </span>
          </span>
          <span aria-hidden className="absolute top-5 right-6 flex gap-1.5">
            {Array.from({ length: REACTION_TRIALS_PER_RUN }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 w-5 rounded-full transition-colors duration-300 ${
                  i < trials.length ? (isGo ? "bg-[#3A2C18]" : "bg-[#C9A96E]") : isGo ? "bg-[#3A2C18]/30" : "bg-[rgba(201,169,110,0.16)]"
                }`}
              />
            ))}
          </span>

          <span id="fl-reaction-status" aria-live="polite" className="flex flex-col items-center">
            {phase === "idle" && (
              <>
                <span className="fl-micro mb-5 text-[#C9A96E]">Ready</span>
                <span className="fl-serif max-w-[16ch] text-[30px] leading-tight font-semibold text-[#F3ECDF] sm:text-[42px]">
                  Click or press Space to start
                </span>
                <span className="mt-4 max-w-[36ch] text-[14px] text-[#B3A999]">
                  When the field floods gold, react instantly. Pressing early costs you a false start.
                </span>
              </>
            )}
            {phase === "waiting" && (
              <>
                <span aria-hidden className="fl-anim-breathe mb-6 h-2.5 w-2.5 rounded-full bg-[#C9A96E]/70 shadow-[0_0_24px_rgba(201,169,110,0.6)]" />
                <span className="fl-serif text-[30px] text-[#8A8072] italic sm:text-[40px]">Wait for gold…</span>
              </>
            )}
            {phase === "go" && (
              <span className="fl-serif text-[64px] leading-none font-bold tracking-tight text-[#17120A] sm:text-[96px]">
                Now
              </span>
            )}
            {phase === "result" && last !== undefined && (
              <>
                <span className="fl-micro mb-4">Reaction time</span>
                <span className="fl-mono text-[84px] leading-none tracking-[-0.05em] text-[#F3ECDF] sm:text-[128px]">
                  {last}
                  <span className="ml-2 text-[20px] tracking-normal text-[#8A8072] sm:text-[26px]">ms</span>
                </span>
                <span className="mt-6 text-[14px] text-[#B3A999]">Click or press Space for the next trial</span>
              </>
            )}
            {phase === "early" && (
              <>
                <span className="fl-micro mb-4 text-[#E0685E]">False start</span>
                <span className="fl-serif text-[40px] font-semibold text-[#F3ECDF] sm:text-[56px]">Too early</span>
                <span className="mt-4 text-[14px] text-[#B3A999]">
                  Penalty logged ({falseStarts}). Click or press Space to retry this trial.
                </span>
              </>
            )}
            {phase === "summary" && avg !== null && rating && (
              <>
                <span className="fl-micro mb-4">Run average</span>
                <span className="fl-mono text-[84px] leading-none tracking-[-0.05em] text-[#F3ECDF] sm:text-[128px]">
                  {avg}
                  <span className="ml-2 text-[20px] tracking-normal text-[#8A8072] sm:text-[26px]">ms</span>
                </span>
                <span className="fl-serif fl-shimmer-text mt-5 text-[30px] font-semibold italic">{rating.label}</span>
                <span className="mt-2 text-[14px] text-[#B3A999]">{rating.detail} Press Space to run again.</span>
              </>
            )}
          </span>
        </button>

        <div className="flex flex-col gap-5">
          <div className="fl-panel p-5 sm:p-6">
            <MicroLabel as="h3" className="mb-4">This run</MicroLabel>
            <ol className="grid grid-cols-5 gap-1.5" aria-label="Trial results">
              {Array.from({ length: REACTION_TRIALS_PER_RUN }, (_, i) => {
                const v = trials[i];
                const isBest = v !== undefined && v === best && trials.length > 1;
                return (
                  <li
                    key={i}
                    className={`fl-mono flex h-12 flex-col items-center justify-center rounded-xl border text-[14px] transition-all duration-500 ${
                      v === undefined
                        ? "border-dashed border-[rgba(201,169,110,0.16)] text-[#6F6659]"
                        : isBest
                          ? "border-[rgba(201,169,110,0.65)] bg-[rgba(201,169,110,0.1)] text-[#F3E1B9]"
                          : "border-[rgba(201,169,110,0.2)] text-[#EDE6DA]"
                    }`}
                  >
                    {v ?? "—"}
                    <span className="text-[9px] tracking-[0.15em] text-[#8A8072]">{v === undefined ? `T${i + 1}` : isBest ? "BEST" : "MS"}</span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <StatBlock label="Average" value={avg ?? "—"} unit={avg !== null ? "ms" : undefined} accent />
              <StatBlock label="Best" value={best ?? "—"} unit={best !== null ? "ms" : undefined} />
              <StatBlock label="Early" value={falseStarts} />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <MicroLabel>Benchmark</MicroLabel>
                <span className="text-[12.5px] font-medium" style={{ color: rating ? TIER_COLORS[rating.tier] : "#8A8072" }}>
                  {rating ? rating.label : "No data"}
                </span>
              </div>
              <BenchmarkScale avg={avg} />
            </div>
          </div>
          <ReactionHistogram trials={data.reactionTrials} />
        </div>
      </div>
    </div>
  );
}

function BenchmarkScale({ avg }: { avg: number | null }) {
  const lo = 150;
  const hi = 400;
  const pct = (ms: number) => ((Math.min(hi, Math.max(lo, ms)) - lo) / (hi - lo)) * 100;
  const marks = [
    { ms: 200, label: "200" },
    { ms: 250, label: "250" },
    { ms: 300, label: "300" },
  ];
  return (
    <div className="relative pt-1 pb-5">
      <div className="relative h-1.5 overflow-hidden rounded-full bg-[rgba(201,169,110,0.1)]">
        <div className="absolute inset-y-0 left-0 bg-[#E3C88F]/70" style={{ width: `${pct(200)}%` }} />
        <div className="absolute inset-y-0 bg-[#C9A96E]/45" style={{ left: `${pct(200)}%`, width: `${pct(250) - pct(200)}%` }} />
        <div className="absolute inset-y-0 bg-[#9F7D55]/35" style={{ left: `${pct(250)}%`, width: `${pct(300) - pct(250)}%` }} />
      </div>
      {marks.map((m) => (
        <span
          key={m.ms}
          className="fl-mono absolute top-4 -translate-x-1/2 text-[10px] text-[#8A8072]"
          style={{ left: `${pct(m.ms)}%` }}
        >
          {m.label}
        </span>
      ))}
      {avg !== null ? (
        <span
          aria-hidden
          className="absolute top-0 h-3.5 w-[3px] -translate-x-1/2 rounded-full bg-[#FBF0D6] shadow-[0_0_10px_rgba(243,225,185,0.9)] transition-[left] duration-700"
          style={{ left: `${pct(avg)}%` }}
        />
      ) : null}
    </div>
  );
}

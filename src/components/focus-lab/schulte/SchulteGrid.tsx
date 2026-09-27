"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { makeSchulteGrid } from "@/lib/focus-lab/games";
import { prefersReducedMotion, useFocusLabData } from "@/lib/focus-lab/hooks";
import type { ModuleMeta } from "@/lib/focus-lab/modules";
import { getSnapshot, makeId, recordSchulte, setPrefs } from "@/lib/focus-lab/store";
import { epochNow, formatSeconds, monotonicNow } from "@/lib/focus-lab/time";
import type { SchulteSize } from "@/lib/focus-lab/types";
import { ParticleBurst } from "../ParticleBurst";
import { ChoiceGroup, CornerTicks, MicroLabel, ModuleHeader } from "../ui";
import { useSessionLogger } from "../useSessionLogger";

type Status = "ready" | "playing" | "done";

interface Result {
  timeMs: number;
  mistakes: number;
  pb: boolean;
  prevPb: number | null;
}

const SIZES: SchulteSize[] = [4, 5, 6];
const CELL_FONT: Record<SchulteSize, string> = {
  4: "text-[30px] sm:text-[38px]",
  5: "text-[24px] sm:text-[32px]",
  6: "text-[19px] sm:text-[26px]",
};

export function SchulteGrid({ meta }: { meta: ModuleMeta; active: boolean }) {
  const data = useFocusLabData();
  const size = data.prefs.schulteSize;
  const total = size * size;
  const log = useSessionLogger();

  const [status, setStatus] = useState<Status>("ready");
  const [grid, setGrid] = useState<number[]>([]);
  const [next, setNext] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (status !== "playing") return;
    const id = window.setInterval(() => setNow(performance.now()), 47);
    return () => window.clearInterval(id);
  }, [status]);

  const start = (n: SchulteSize = size) => {
    const t = monotonicNow();
    setGrid(makeSchulteGrid(n));
    setNext(1);
    setMistakes(0);
    setResult(null);
    setStartedAt(t);
    setNow(t);
    setStatus("playing");
  };

  const changeSize = (n: SchulteSize) => {
    setPrefs({ schulteSize: n });
    setStatus("ready");
    setGrid([]);
    setResult(null);
  };

  const finish = (at: number) => {
    const timeMs = Math.round(at - startedAt);
    const prevPb = getSnapshot().schultePB[String(size) as "4" | "5" | "6"];
    const pb = recordSchulte(size, timeMs);
    setNow(at);
    setStatus("done");
    setResult({ timeMs, mistakes, pb, prevPb });
    if (pb) setBurst((b) => b + 1);
    log(
      { kind: "schulte", id: makeId(), at: epochNow(), size, timeMs, mistakes, personalBest: pb },
      {
        title: pb ? `New ${size}×${size} personal best` : `Schulte ${size}×${size} cleared`,
        detail: `${formatSeconds(timeMs)} s · ${mistakes} ${mistakes === 1 ? "mistake" : "mistakes"}`,
      },
    );
  };

  const tap = (value: number, e: MouseEvent<HTMLButtonElement>) => {
    if (status !== "playing" || value < next) return;
    const el = e.currentTarget;
    const reduced = prefersReducedMotion();
    if (value === next) {
      el.animate(
        [
          { backgroundColor: "rgba(201,169,110,0.6)", boxShadow: "0 0 28px rgba(201,169,110,0.55)", color: "#17120A" },
          { backgroundColor: "rgba(201,169,110,0.04)", boxShadow: "0 0 0 rgba(0,0,0,0)" },
        ],
        { duration: reduced ? 1 : 520, easing: "cubic-bezier(0.22,1,0.36,1)" },
      );
      if (value === total) finish(e.timeStamp || monotonicNow());
      else setNext(value + 1);
    } else {
      setMistakes((m) => m + 1);
      el.animate(
        reduced
          ? [{ borderColor: "rgba(224,104,94,0.9)" }, { borderColor: "rgba(224,104,94,0.9)" }]
          : [
              { transform: "translateX(0)", borderColor: "rgba(224,104,94,0.95)", backgroundColor: "rgba(224,104,94,0.18)" },
              { transform: "translateX(-5px)" },
              { transform: "translateX(5px)" },
              { transform: "translateX(-3px)" },
              { transform: "translateX(0)", borderColor: "rgba(201,169,110,0.12)", backgroundColor: "rgba(23,20,15,0)" },
            ],
        { duration: reduced ? 300 : 360, easing: "ease-in-out" },
      );
    }
  };

  const elapsed = status === "playing" ? now - startedAt : result?.timeMs ?? 0;
  const pbs = data.schultePB;
  const cells = status === "ready" ? Array.from({ length: total }, () => 0) : grid;

  return (
    <div>
      <ModuleHeader meta={meta} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        <div className="fl-panel relative flex flex-col items-center px-4 py-8 sm:px-8 sm:py-10">
          <CornerTicks />
          <div className="relative w-[min(86vw,500px)]">
            <div
              className="grid aspect-square w-full gap-1.5 sm:gap-2"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
              role="group"
              aria-label={`Schulte grid ${size} by ${size}`}
            >
              {cells.map((v, i) => {
                const found = status !== "ready" && v < next && status === "playing";
                const cleared = status === "done";
                return (
                  <button
                    key={`${i}-${v}`}
                    type="button"
                    disabled={status !== "playing"}
                    onClick={(e) => tap(v, e)}
                    aria-label={status === "ready" ? `Cell ${i + 1}` : found ? `${v}, found` : String(v)}
                    className={`fl-mono flex items-center justify-center rounded-xl border select-none ${CELL_FONT[size]} transition-[opacity,color,border-color,background-color] duration-500 disabled:cursor-default ${
                      found || cleared
                        ? "border-[rgba(201,169,110,0.08)] bg-[rgba(201,169,110,0.03)] text-[#C9A96E] opacity-30"
                        : "border-[rgba(201,169,110,0.12)] bg-[rgba(23,20,15,0.6)] text-[#EDE6DA] hover:border-[rgba(201,169,110,0.35)] active:bg-[rgba(201,169,110,0.08)]"
                    }`}
                  >
                    {status === "ready" ? "" : v}
                  </button>
                );
              })}
            </div>

            {/* Fixation point */}
            <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(233,211,166,0.55)]" />
              <span className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F3E1B9] shadow-[0_0_10px_rgba(243,225,185,0.9)]" />
            </span>

            {status === "ready" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-[rgba(11,10,9,0.72)] px-6 text-center backdrop-blur-[3px]">
                <MicroLabel className="mb-3 text-[#C9A96E]">{size} × {size} · 1 → {total}</MicroLabel>
                <p className="fl-serif max-w-[20ch] text-[24px] leading-snug text-[#F3ECDF] sm:text-[28px]">
                  Fix your gaze on the dot. Find every number in order.
                </p>
                <button type="button" onClick={() => start()} className="fl-btn fl-btn-gold mt-6 px-8">
                  Start grid
                </button>
              </div>
            ) : null}

            {status === "done" && result ? (
              <div className="fl-anim-rise absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-[rgba(11,10,9,0.82)] px-6 text-center backdrop-blur-[4px]" aria-live="polite">
                <MicroLabel className={`mb-3 ${result.pb ? "fl-shimmer-text" : ""}`}>
                  {result.pb ? (result.prevPb === null ? "First record set" : "New personal best") : "Grid cleared"}
                </MicroLabel>
                <p className="fl-mono text-[64px] leading-none tracking-[-0.04em] text-[#F3ECDF] sm:text-[80px]">
                  {formatSeconds(result.timeMs)}
                  <span className="ml-1 text-[18px] tracking-normal text-[#8A8072]">s</span>
                </p>
                <p className="mt-4 text-[14px] text-[#B3A999]">
                  {result.mistakes} {result.mistakes === 1 ? "mistake" : "mistakes"}
                  {result.prevPb !== null ? (
                    <>
                      {" · "}
                      <span className="fl-mono">
                        {result.pb ? "−" : "+"}
                        {formatSeconds(Math.abs(result.timeMs - result.prevPb))}s
                      </span>{" "}
                      vs {result.pb ? "old" : ""} PB
                    </>
                  ) : null}
                </p>
                <button type="button" onClick={() => start()} className="fl-btn fl-btn-gold mt-6 px-8">
                  Go again
                </button>
              </div>
            ) : null}
            <ParticleBurst trigger={burst} count={160} />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="fl-panel p-5 sm:p-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <MicroLabel>Time</MicroLabel>
                <p className="fl-mono mt-2 text-[26px] leading-none text-[#EDE6DA]">
                  {formatSeconds(elapsed, 1)}
                  <span className="ml-0.5 text-[12px] text-[#8A8072]">s</span>
                </p>
              </div>
              <div>
                <MicroLabel>Next</MicroLabel>
                <p className="fl-mono mt-2 text-[26px] leading-none text-[#E3C88F]" aria-live="polite">
                  {status === "playing" ? next : "—"}
                </p>
              </div>
              <div>
                <MicroLabel>Mistakes</MicroLabel>
                <p className={`fl-mono mt-2 text-[26px] leading-none ${mistakes > 0 && status !== "ready" ? "text-[#E0685E]" : "text-[#EDE6DA]"}`}>
                  {status === "ready" ? 0 : mistakes}
                </p>
              </div>
            </div>
            <div className="mt-5 h-[3px] overflow-hidden rounded-full bg-[rgba(201,169,110,0.1)]" aria-hidden>
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#9F7D55] to-[#E3C88F] transition-[width] duration-300"
                style={{ width: `${status === "done" ? 100 : status === "playing" ? ((next - 1) / total) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <ChoiceGroup
                label="Grid size"
                value={size}
                options={SIZES.map((n) => ({ value: n, label: <span className="fl-mono">{n}×{n}</span> }))}
                onChange={changeSize}
              />
              <button type="button" onClick={() => start()} className="fl-btn fl-btn-ghost min-h-[36px] px-4 text-[13px]" aria-label="Reshuffle and restart grid">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M1 4h3.5c3 0 4 8 7 8H15M12.5 9.5L15 12l-2.5 2.5M1 12h3.5c1.2 0 2-1.3 2.7-2.8M9 6.5C9.7 5.1 10.4 4 11.5 4H15M12.5 1.5L15 4l-2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Reshuffle
              </button>
            </div>
          </div>

          <div className="fl-panel p-5 sm:p-6">
            <MicroLabel as="h3" className="mb-4">Personal bests</MicroLabel>
            <dl className="grid grid-cols-3 gap-2">
              {SIZES.map((n) => {
                const pb = pbs[String(n) as "4" | "5" | "6"];
                return (
                  <div
                    key={n}
                    className={`rounded-xl border px-3 py-3 ${n === size ? "border-[rgba(201,169,110,0.45)] bg-[rgba(201,169,110,0.06)]" : "border-[rgba(201,169,110,0.1)]"}`}
                  >
                    <dt className="fl-mono text-[11px] text-[#8A8072]">{n}×{n}</dt>
                    <dd className="fl-mono mt-1.5 text-[18px] text-[#EDE6DA]">
                      {pb !== null ? formatSeconds(pb) : "—"}
                      {pb !== null ? <span className="text-[11px] text-[#8A8072]">s</span> : null}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <div className="fl-panel p-5 sm:p-6">
            <MicroLabel as="h3" className="mb-3">Why the dot</MicroLabel>
            <p className="text-[14px] leading-relaxed text-[#B3A999]">
              Keeping your eyes on the centre forces you to find numbers with
              peripheral vision — widening your attentional field and speeding
              visual search, the way athletes read the whole field at once.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

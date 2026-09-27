"use client";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  makeStroopTrials,
  mean,
  STROOP_COLORS,
  STROOP_TRIALS,
  summarizeStroop,
  type StroopAnswer,
  type StroopTrial,
} from "@/lib/focus-lab/games";
import { isInteractiveTarget, isTypingTarget } from "@/lib/focus-lab/hooks";
import type { ModuleMeta } from "@/lib/focus-lab/modules";
import { makeId } from "@/lib/focus-lab/store";
import type { StroopColorId } from "@/lib/focus-lab/types";
import { CornerTicks, MicroLabel, ModuleHeader, StatBlock } from "../ui";
import { useSessionLogger } from "../useSessionLogger";
import { StroopResults } from "./StroopResults";

type Status = "intro" | "playing" | "done";

const FEEDBACK_MS = 300;
const INK: Record<StroopColorId, string> = Object.fromEntries(
  STROOP_COLORS.map((c) => [c.id, c.ink]),
) as Record<StroopColorId, string>;
const WORD: Record<StroopColorId, string> = Object.fromEntries(
  STROOP_COLORS.map((c) => [c.id, c.word]),
) as Record<StroopColorId, string>;

export function StroopChallenge({ meta, active }: { meta: ModuleMeta; active: boolean }) {
  const log = useSessionLogger();
  const [status, setStatus] = useState<Status>("intro");
  const [trials, setTrials] = useState<StroopTrial[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<StroopAnswer[]>([]);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const shownAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  // Stimulus onset: stamp the frame the new word is committed.
  useLayoutEffect(() => {
    if (status === "playing" && feedback === null) shownAtRef.current = performance.now();
  }, [status, index, feedback]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const start = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setTrials(makeStroopTrials());
    setIndex(0);
    setAnswers([]);
    setFeedback(null);
    setStatus("playing");
  };

  const answer = (id: StroopColorId) => {
    if (status !== "playing" || feedback !== null) return;
    const trial = trials[index];
    if (!trial) return;
    const rtMs = Math.round(performance.now() - shownAtRef.current);
    const correct = id === trial.ink;
    const nextAnswers = [...answers, { trial, answer: id, rtMs, correct }];
    setAnswers(nextAnswers);
    setFeedback(correct);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setFeedback(null);
      if (index + 1 >= trials.length) {
        setStatus("done");
        const s = summarizeStroop(nextAnswers);
        log(
          {
            kind: "stroop",
            id: makeId(),
            at: Date.now(),
            accuracy: s.accuracy,
            meanRtMs: Math.round(s.meanRtMs),
            congruentRtMs: Math.round(s.congruentRtMs),
            incongruentRtMs: Math.round(s.incongruentRtMs),
            interferenceMs: Math.round(s.interferenceMs),
          },
          {
            title: `Stroop · ${Math.round(s.accuracy * 100)}% accuracy`,
            detail: `Interference cost ${Math.round(s.interferenceMs)} ms`,
          },
        );
      } else {
        setIndex(index + 1);
      }
    }, FEEDBACK_MS);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || isTypingTarget(e.target)) return;
    if (status === "playing") {
      const hit = STROOP_COLORS.find((c) => c.key.toLowerCase() === e.key.toLowerCase());
      if (hit) {
        e.preventDefault();
        answer(hit.id);
      }
    } else if ((e.key === " " || e.key === "Enter") && !isInteractiveTarget(e.target)) {
      e.preventDefault();
      start();
    }
  });

  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [active]);

  const trial = trials[index];
  const correctSoFar = answers.filter((a) => a.correct);
  const accuracy = answers.length ? Math.round((correctSoFar.length / answers.length) * 100) : null;
  const rtScale = Math.max(600, ...answers.map((a) => a.rtMs));
  const meanRt = correctSoFar.length ? Math.round(mean(correctSoFar.map((a) => a.rtMs))) : null;

  return (
    <div>
      <ModuleHeader meta={meta} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        <div className="fl-panel relative flex min-h-[460px] flex-col overflow-hidden px-4 py-6 sm:px-8 sm:py-8">
          <CornerTicks />
          {status === "done" ? (
            <StroopResults answers={answers} onAgain={start} />
          ) : (
            <>
              <div className="flex items-center justify-between px-2">
                <MicroLabel>
                  {status === "playing" ? (
                    <>
                      Trial <span className="fl-mono tracking-normal text-[#EDE6DA]">{index + 1}</span>
                      <span className="fl-mono tracking-normal"> / {STROOP_TRIALS}</span>
                    </>
                  ) : (
                    "Name the ink"
                  )}
                </MicroLabel>
                <span className="fl-mono text-[11px] text-[#8A8072]">keys R · G · B · Y</span>
              </div>
              <div className="mx-2 mt-3 h-[2px] overflow-hidden rounded-full bg-[rgba(201,169,110,0.1)]" aria-hidden>
                <div
                  className="h-full bg-gradient-to-r from-[#9F7D55] to-[#E3C88F] transition-[width] duration-300"
                  style={{ width: `${(answers.length / STROOP_TRIALS) * 100}%` }}
                />
              </div>

              <div className="relative flex flex-1 items-center justify-center py-10" aria-live="polite">
                {status === "intro" ? (
                  <div className="max-w-[440px] text-center">
                    <p className="text-[64px] leading-none font-bold tracking-[0.04em] sm:text-[88px]" style={{ color: INK.blue }} aria-label="Example: the word RED shown in blue ink">
                      RED
                    </p>
                    <p className="mt-6 text-[15px] leading-relaxed text-[#B3A999]">
                      Answer the <span className="text-[#EDE6DA]">ink colour</span>, not the word. Here the right
                      answer is <span style={{ color: INK.blue }} className="font-semibold">Blue</span>. Twenty trials —
                      speed and accuracy both count.
                    </p>
                    <button type="button" onClick={start} className="fl-btn fl-btn-gold mt-7 px-8">
                      Begin challenge
                    </button>
                  </div>
                ) : trial ? (
                  <>
                    <p
                      key={index}
                      className="text-[64px] leading-none font-bold tracking-[0.04em] transition-opacity duration-200 sm:text-[112px]"
                      style={{ color: INK[trial.ink], opacity: feedback === null ? 1 : 0.14 }}
                      aria-label={`Word ${WORD[trial.word]}`}
                    >
                      {WORD[trial.word]}
                    </p>
                    {feedback !== null ? (
                      <span
                        className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-[12px] font-medium tracking-[0.2em] uppercase ${
                          feedback ? "text-[#C9A96E]" : "text-[#E0685E]"
                        }`}
                      >
                        {feedback ? "Correct" : `Ink was ${WORD[trial.ink].toLowerCase()}`}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Ink colour answers">
                {STROOP_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={status !== "playing"}
                    onClick={() => answer(c.id)}
                    className="group flex h-14 items-center justify-between gap-2 rounded-2xl border border-[rgba(201,169,110,0.16)] bg-[rgba(11,10,9,0.4)] px-4 transition-all duration-200 hover:border-[rgba(201,169,110,0.4)] active:scale-[0.98] disabled:opacity-40"
                    aria-label={`${c.word.toLowerCase()} (key ${c.key})`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden className="h-3.5 w-3.5 rounded-full" style={{ background: c.ink, boxShadow: `0 0 12px ${c.ink}66` }} />
                      <span className="text-[14px] font-medium text-[#EDE6DA] capitalize">{c.word.toLowerCase()}</span>
                    </span>
                    <kbd className="fl-mono rounded-md border border-[rgba(201,169,110,0.2)] px-1.5 py-0.5 text-[11px] text-[#8A8072]">
                      {c.key}
                    </kbd>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="fl-panel p-5 sm:p-6">
            <MicroLabel as="h3" className="mb-5">Live</MicroLabel>
            <div className="grid grid-cols-3 gap-4">
              <StatBlock label="Answered" value={`${answers.length}`} unit={`/${STROOP_TRIALS}`} />
              <StatBlock label="Accuracy" value={accuracy ?? "—"} unit={accuracy !== null ? "%" : undefined} accent />
              <StatBlock label="Mean RT" value={meanRt ?? "—"} unit={meanRt !== null ? "ms" : undefined} />
            </div>
            <ol className="mt-6 flex h-10 items-end gap-[3px]" aria-label="Per-trial reaction times">
              {Array.from({ length: STROOP_TRIALS }, (_, i) => {
                const a = answers[i];
                const h = a ? Math.min(100, Math.max(12, (a.rtMs / rtScale) * 100)) : 8;
                return (
                  <li
                    key={i}
                    title={a ? `${a.rtMs} ms · ${a.trial.congruent ? "congruent" : "incongruent"} · ${a.correct ? "correct" : "wrong"}` : undefined}
                    className={`flex-1 rounded-sm transition-all duration-300 ${
                      !a
                        ? "bg-[rgba(201,169,110,0.08)]"
                        : !a.correct
                          ? "bg-[#E0685E]/80"
                          : a.trial.congruent
                            ? "border border-[#C9A96E]/70 bg-transparent"
                            : "bg-[#C9A96E]/85"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </ol>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#8A8072]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#C9A96E]/85" />incongruent</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] border border-[#C9A96E]/70" />congruent</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#E0685E]/80" />miss</span>
            </div>
          </div>
          <div className="fl-panel p-5 sm:p-6">
            <MicroLabel as="h3" className="mb-3">The effect</MicroLabel>
            <p className="text-[14px] leading-relaxed text-[#B3A999]">
              Reading is automatic; naming ink is not. When they conflict, your
              prefrontal cortex has to suppress the word — that extra time is
              the <span className="text-[#EDE6DA]">interference cost</span>, a
              clean read on inhibitory control under pressure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

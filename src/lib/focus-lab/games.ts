import type { SchulteSize, StroopColorId } from "./types";

/* ----------------------------- shared ----------------------------- */

export function shuffle<T>(input: readonly T[]): T[] {
  const a = input.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/* ----------------------------- reaction ---------------------------- */

export const REACTION_TRIALS_PER_RUN = 5;

export function randomReactionDelay(): number {
  return 1200 + Math.random() * 2800;
}

export interface ReactionRating {
  label: string;
  detail: string;
  tier: 0 | 1 | 2 | 3;
}

export function rateReaction(avgMs: number): ReactionRating {
  if (avgMs < 200) {
    return { label: "Elite", detail: "Sprinter-start territory.", tier: 3 };
  }
  if (avgMs < 250) {
    return { label: "Sharp", detail: "Faster than most people.", tier: 2 };
  }
  if (avgMs < 300) {
    return { label: "Average", detail: "Typical human baseline.", tier: 1 };
  }
  return { label: "Warm up", detail: "Breathe, blink, go again.", tier: 0 };
}

/* ----------------------------- schulte ----------------------------- */

export function makeSchulteGrid(size: SchulteSize): number[] {
  return shuffle(Array.from({ length: size * size }, (_, i) => i + 1));
}

/* ----------------------------- stroop ------------------------------ */

export interface StroopColor {
  id: StroopColorId;
  word: string;
  ink: string;
  key: string;
}

/** Inks tuned for separation + contrast on #0B0A09. */
export const STROOP_COLORS: StroopColor[] = [
  { id: "red", word: "RED", ink: "#F0645A", key: "R" },
  { id: "green", word: "GREEN", ink: "#5ED08B", key: "G" },
  { id: "blue", word: "BLUE", ink: "#6AA6FF", key: "B" },
  { id: "gold", word: "GOLD", ink: "#E8C170", key: "Y" },
];

export const STROOP_TRIALS = 20;
const CONGRUENT_SHARE = 0.3;

export interface StroopTrial {
  word: StroopColorId;
  ink: StroopColorId;
  congruent: boolean;
}

export function makeStroopTrials(count = STROOP_TRIALS): StroopTrial[] {
  const ids = STROOP_COLORS.map((c) => c.id);
  const congruentCount = Math.round(count * CONGRUENT_SHARE);
  const flags = shuffle(
    Array.from({ length: count }, (_, i) => i < congruentCount),
  );
  const trials: StroopTrial[] = [];
  for (const congruent of flags) {
    const prev = trials[trials.length - 1];
    // Avoid repeating the same word twice in a row — keeps attention honest.
    const wordChoices = ids.filter((id) => id !== prev?.word);
    const word = wordChoices[Math.floor(Math.random() * wordChoices.length)];
    let ink: StroopColorId = word;
    if (!congruent) {
      const inkChoices = ids.filter((id) => id !== word);
      ink = inkChoices[Math.floor(Math.random() * inkChoices.length)];
    }
    trials.push({ word, ink, congruent });
  }
  return trials;
}

export interface StroopAnswer {
  trial: StroopTrial;
  answer: StroopColorId;
  rtMs: number;
  correct: boolean;
}

export interface StroopSummary {
  accuracy: number; // 0..1
  meanRtMs: number;
  congruentRtMs: number;
  incongruentRtMs: number;
  interferenceMs: number;
}

/** RT means use correct answers only (standard in Stroop analysis). */
export function summarizeStroop(answers: readonly StroopAnswer[]): StroopSummary {
  const correct = answers.filter((a) => a.correct);
  const cong = correct.filter((a) => a.trial.congruent).map((a) => a.rtMs);
  const incong = correct.filter((a) => !a.trial.congruent).map((a) => a.rtMs);
  const congruentRtMs = mean(cong);
  const incongruentRtMs = mean(incong);
  return {
    accuracy: answers.length ? correct.length / answers.length : 0,
    meanRtMs: mean(correct.map((a) => a.rtMs)),
    congruentRtMs,
    incongruentRtMs,
    interferenceMs:
      cong.length && incong.length ? incongruentRtMs - congruentRtMs : 0,
  };
}

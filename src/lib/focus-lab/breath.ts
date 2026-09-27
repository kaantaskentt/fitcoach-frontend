import type { BreathPatternId } from "./types";

export type BreathPhaseKind = "inhale" | "top-up" | "hold-in" | "exhale" | "hold-out";

export interface BreathPhase {
  kind: BreathPhaseKind;
  seconds: number;
  label: string;
  /** Orb scale (0 = empty lungs, 1 = full) at the start and end of the phase. */
  from: number;
  to: number;
}

export interface BreathPattern {
  id: BreathPatternId;
  name: string;
  short: string;
  why: string;
  phases: BreathPhase[];
}

const inhale = (s: number, to = 1): BreathPhase => ({
  kind: "inhale",
  seconds: s,
  label: "Inhale",
  from: 0,
  to,
});
const exhale = (s: number): BreathPhase => ({
  kind: "exhale",
  seconds: s,
  label: "Exhale",
  from: 1,
  to: 0,
});
const holdIn = (s: number): BreathPhase => ({
  kind: "hold-in",
  seconds: s,
  label: "Hold",
  from: 1,
  to: 1,
});
const holdOut = (s: number): BreathPhase => ({
  kind: "hold-out",
  seconds: s,
  label: "Hold",
  from: 0,
  to: 0,
});

export const BREATH_PATTERNS: Record<BreathPatternId, BreathPattern> = {
  box: {
    id: "box",
    name: "Box",
    short: "4 · 4 · 4 · 4",
    why: "Equal sides steady CO₂ and heart rate — the Navy SEAL reset for calm under load.",
    phases: [inhale(4), holdIn(4), exhale(4), holdOut(4)],
  },
  "478": {
    id: "478",
    name: "4-7-8",
    short: "4 · 7 · 8",
    why: "A long hold and slower exhale bias the vagus nerve toward rest — ideal before sleep.",
    phases: [inhale(4), holdIn(7), exhale(8)],
  },
  sigh: {
    id: "sigh",
    name: "Physiological Sigh",
    short: "2 · 1 · 6",
    why: "A second top-up inhale re-inflates collapsed alveoli so the long exhale offloads CO₂ fastest.",
    phases: [
      inhale(2, 0.78),
      { kind: "top-up", seconds: 1, label: "Top-up", from: 0.78, to: 1 },
      exhale(6),
    ],
  },
  coherent: {
    id: "coherent",
    name: "Coherent",
    short: "5.5 · 5.5",
    why: "~5.5 breaths a minute aligns breath with heart-rate rhythms, maximising HRV.",
    phases: [inhale(5.5), exhale(5.5)],
  },
};

export const BREATH_PATTERN_ORDER: BreathPatternId[] = [
  "box",
  "478",
  "sigh",
  "coherent",
];

export function cycleSeconds(p: BreathPattern): number {
  return p.phases.reduce((sum, ph) => sum + ph.seconds, 0);
}

export interface BreathPosition {
  round: number; // 0-based completed rounds
  phaseIndex: number;
  phase: BreathPhase;
  phaseElapsed: number; // seconds
  phaseRemaining: number; // seconds
  phaseProgress: number; // 0..1
  cycleProgress: number; // 0..1
  /** Eased lung fullness 0..1. */
  fullness: number;
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/** Pure mapping from elapsed seconds to the position inside a pattern. */
export function breathPosition(p: BreathPattern, elapsedSec: number): BreathPosition {
  const cycle = cycleSeconds(p);
  const t = Math.max(0, elapsedSec);
  const round = Math.floor(t / cycle);
  let inCycle = t - round * cycle;
  const cycleProgress = inCycle / cycle;
  let phaseIndex = 0;
  for (; phaseIndex < p.phases.length - 1; phaseIndex++) {
    if (inCycle < p.phases[phaseIndex].seconds) break;
    inCycle -= p.phases[phaseIndex].seconds;
  }
  const phase = p.phases[phaseIndex];
  const phaseProgress = Math.min(1, inCycle / phase.seconds);
  const fullness = phase.from + (phase.to - phase.from) * easeInOutSine(phaseProgress);
  return {
    round,
    phaseIndex,
    phase,
    phaseElapsed: inCycle,
    phaseRemaining: Math.max(0, phase.seconds - inCycle),
    phaseProgress,
    cycleProgress,
    fullness,
  };
}

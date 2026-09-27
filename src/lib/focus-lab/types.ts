export type ModuleId =
  | "deep-work"
  | "breath"
  | "reaction"
  | "schulte"
  | "stroop"
  | "stats";

export type SoundscapeId = "off" | "brown" | "rain" | "ocean" | "gamma";

export type BreathPatternId = "box" | "478" | "sigh" | "coherent";

export type SchulteSize = 4 | 5 | 6;

export type StroopColorId = "red" | "green" | "blue" | "gold";

interface SessionBase {
  id: string;
  /** Epoch ms when the session ended. */
  at: number;
}

export interface DeepWorkSession extends SessionBase {
  kind: "deep-work";
  durationMs: number;
  plannedMs: number;
  completed: boolean;
  intention: string;
}

export interface BreathSession extends SessionBase {
  kind: "breath";
  pattern: BreathPatternId;
  rounds: number;
  targetRounds: number;
  durationMs: number;
  completed: boolean;
}

export interface ReactionSession extends SessionBase {
  kind: "reaction";
  trials: number[];
  avgMs: number;
  bestMs: number;
  falseStarts: number;
}

export interface SchulteSession extends SessionBase {
  kind: "schulte";
  size: SchulteSize;
  timeMs: number;
  mistakes: number;
  personalBest: boolean;
}

export interface StroopSession extends SessionBase {
  kind: "stroop";
  accuracy: number;
  meanRtMs: number;
  congruentRtMs: number;
  incongruentRtMs: number;
  interferenceMs: number;
}

export type SessionEntry =
  | DeepWorkSession
  | BreathSession
  | ReactionSession
  | SchulteSession
  | StroopSession;

export interface ReactionTrial {
  ms: number;
  at: number;
}

export interface FocusLabPrefs {
  deepWorkMinutes: number;
  soundscape: SoundscapeId;
  volume: number;
  breathPattern: BreathPatternId;
  breathRounds: number;
  breathTone: boolean;
  schulteSize: SchulteSize;
}

export interface FocusLabData {
  version: 1;
  sessions: SessionEntry[];
  reactionTrials: ReactionTrial[];
  schultePB: Record<"4" | "5" | "6", number | null>;
  prefs: FocusLabPrefs;
}

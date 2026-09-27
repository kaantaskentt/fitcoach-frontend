import type {
  BreathPatternId,
  FocusLabData,
  FocusLabPrefs,
  ReactionTrial,
  SchulteSize,
  SessionEntry,
  SoundscapeId,
} from "./types";

export const STORAGE_KEY = "fitcoach_focus_lab_v1";
const WRITE_DEBOUNCE_MS = 250;
const MAX_SESSIONS = 500;
const MAX_REACTION_TRIALS = 250;

export const DEFAULT_PREFS: FocusLabPrefs = {
  deepWorkMinutes: 25,
  soundscape: "off",
  volume: 0.5,
  breathPattern: "box",
  breathRounds: 8,
  breathTone: false,
  schulteSize: 5,
};

/** Frozen default used as the server snapshot so SSR + hydration are stable. */
export const DEFAULT_DATA: FocusLabData = Object.freeze({
  version: 1,
  sessions: [],
  reactionTrials: [],
  schultePB: { "4": null, "5": null, "6": null },
  prefs: DEFAULT_PREFS,
}) as FocusLabData;

/* ------------------------------------------------------------------ */
/* Schema coercion — tolerant reads so a malformed key never crashes.  */
/* ------------------------------------------------------------------ */

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function oneOf<T extends string | number>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

const SOUNDSCAPES: readonly SoundscapeId[] = [
  "off",
  "brown",
  "rain",
  "ocean",
  "gamma",
];
const PATTERNS: readonly BreathPatternId[] = ["box", "478", "sigh", "coherent"];
const SIZES: readonly SchulteSize[] = [4, 5, 6];
const SESSION_KINDS = [
  "deep-work",
  "breath",
  "reaction",
  "schulte",
  "stroop",
] as const;

function coercePrefs(v: unknown): FocusLabPrefs {
  if (!isRecord(v)) return { ...DEFAULT_PREFS };
  return {
    deepWorkMinutes: Math.min(
      180,
      Math.max(5, Math.round(num(v.deepWorkMinutes, DEFAULT_PREFS.deepWorkMinutes))),
    ),
    soundscape: oneOf(v.soundscape, SOUNDSCAPES, DEFAULT_PREFS.soundscape),
    volume: Math.min(1, Math.max(0, num(v.volume, DEFAULT_PREFS.volume))),
    breathPattern: oneOf(v.breathPattern, PATTERNS, DEFAULT_PREFS.breathPattern),
    breathRounds: oneOf(v.breathRounds, [4, 8, 12], DEFAULT_PREFS.breathRounds),
    breathTone: typeof v.breathTone === "boolean" ? v.breathTone : false,
    schulteSize: oneOf(v.schulteSize, SIZES, DEFAULT_PREFS.schulteSize),
  };
}

function coerceSession(v: unknown): SessionEntry | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== "string" || typeof v.at !== "number") return null;
  if (!SESSION_KINDS.includes(v.kind as (typeof SESSION_KINDS)[number])) {
    return null;
  }
  // Entries are written only by this module; a shallow shape check is enough.
  return v as unknown as SessionEntry;
}

function coerceData(raw: unknown): FocusLabData {
  if (!isRecord(raw) || raw.version !== 1) {
    return { ...DEFAULT_DATA, prefs: { ...DEFAULT_PREFS } };
  }
  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions
        .map(coerceSession)
        .filter((s): s is SessionEntry => s !== null)
    : [];
  const reactionTrials = Array.isArray(raw.reactionTrials)
    ? raw.reactionTrials.filter(
        (t): t is ReactionTrial =>
          isRecord(t) && typeof t.ms === "number" && typeof t.at === "number",
      )
    : [];
  const pb = isRecord(raw.schultePB) ? raw.schultePB : {};
  const pbVal = (k: string): number | null =>
    typeof pb[k] === "number" ? (pb[k] as number) : null;
  return {
    version: 1,
    sessions,
    reactionTrials,
    schultePB: { "4": pbVal("4"), "5": pbVal("5"), "6": pbVal("6") },
    prefs: coercePrefs(raw.prefs),
  };
}

/* ------------------------------------------------------------------ */
/* External store                                                      */
/* ------------------------------------------------------------------ */

let state: FocusLabData | null = null;
const listeners = new Set<() => void>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let lifecycleBound = false;
/** Only write when this tab has unsaved changes — never clobber other tabs. */
let dirty = false;

function load(): FocusLabData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? coerceData(JSON.parse(raw)) : coerceData(null);
  } catch {
    return coerceData(null);
  }
}

function flush(): void {
  if (writeTimer !== null) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  if (!dirty || state === null || typeof window === "undefined") return;
  dirty = false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — keep in-memory state */
  }
}

function scheduleWrite(): void {
  if (writeTimer !== null) clearTimeout(writeTimer);
  writeTimer = setTimeout(flush, WRITE_DEBOUNCE_MS);
}

function emit(): void {
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent): void {
  if (e.key !== STORAGE_KEY) return;
  state = load();
  emit();
}

function bindLifecycle(): void {
  if (lifecycleBound || typeof window === "undefined") return;
  lifecycleBound = true;
  window.addEventListener("pagehide", flush);
  window.addEventListener("storage", onStorage);
}

export function getSnapshot(): FocusLabData {
  if (state === null) state = load();
  return state;
}

export function getServerSnapshot(): FocusLabData {
  return DEFAULT_DATA;
}

export function subscribe(listener: () => void): () => void {
  bindLifecycle();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) flush();
  };
}

export function update(fn: (prev: FocusLabData) => FocusLabData): void {
  state = fn(getSnapshot());
  dirty = true;
  emit();
  scheduleWrite();
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function addSession(entry: SessionEntry): void {
  update((prev) => ({
    ...prev,
    sessions: [...prev.sessions, entry].slice(-MAX_SESSIONS),
  }));
}

export function addReactionTrials(trials: ReactionTrial[]): void {
  update((prev) => ({
    ...prev,
    reactionTrials: [...prev.reactionTrials, ...trials].slice(
      -MAX_REACTION_TRIALS,
    ),
  }));
}

/** Records a Schulte time; returns true when it is a new personal best. */
export function recordSchulte(size: SchulteSize, timeMs: number): boolean {
  const key = String(size) as "4" | "5" | "6";
  const prevPb = getSnapshot().schultePB[key];
  const isPb = prevPb === null || timeMs < prevPb;
  if (isPb) {
    update((prev) => ({
      ...prev,
      schultePB: { ...prev.schultePB, [key]: timeMs },
    }));
  }
  return isPb;
}

export function setPrefs(patch: Partial<FocusLabPrefs>): void {
  update((prev) => ({ ...prev, prefs: { ...prev.prefs, ...patch } }));
}

export function resetAll(): void {
  update((prev) => ({
    ...coerceData(null),
    prefs: prev.prefs,
  }));
  flush();
}

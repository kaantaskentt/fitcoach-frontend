import { clamp01, mean } from "./games";
import { dayKey, dayStartOffset, MINUTE } from "./time";
import type {
  FocusLabData,
  SchulteSession,
  SessionEntry,
  StroopSession,
} from "./types";

/*
 * ─── Focus Score (0–1000) ─────────────────────────────────────────────
 *
 * A composite of five normalised components. Each is clamped to [0, 1]
 * before weighting so that no single habit can dominate:
 *
 *   DEEP WORK   350 × clamp(minutes in the last 7 days / 300)
 *               → 5 focused hours a week earns the full share.
 *
 *   REACTION    200 × clamp((400 − avg of last 20 trials ms) / (400 − 180))
 *               → 180 ms average = full, 400 ms or slower = 0.
 *
 *   SCHULTE     150 × clamp((2.4 − best s-per-cell) / (2.4 − 0.6))
 *               → normalised per cell so 4×4, 5×5 and 6×6 PBs compare;
 *                 0.6 s/cell (≈15 s on 5×5) = full, 2.4 s/cell (≈60 s) = 0.
 *
 *   STROOP      150 × clamp((250 − interference ms) / (250 − 30)) × accuracy
 *               → mean of the last 3 runs; lower interference cost means
 *                 better inhibitory control, scaled by answer accuracy.
 *
 *   BREATH      150 × clamp(breath rounds in the last 7 days / 40)
 *
 * Components with no data score 0. The total is rounded and clamped to
 * [0, 1000].
 */
export interface ScoreComponent {
  id: "deep" | "reaction" | "schulte" | "stroop" | "breath";
  label: string;
  weight: number;
  ratio: number; // 0..1
  points: number;
  hint: string;
}

export interface FocusScore {
  total: number;
  components: ScoreComponent[];
}

const WEEK_WINDOW_DAYS = 7;

function inLastWeek(s: SessionEntry, now: number): boolean {
  return s.at >= dayStartOffset(now, WEEK_WINDOW_DAYS - 1);
}

export function computeFocusScore(data: FocusLabData, now: number): FocusScore {
  const week = data.sessions.filter((s) => inLastWeek(s, now));

  const deepMin =
    week.reduce(
      (sum, s) => (s.kind === "deep-work" ? sum + s.durationMs : sum),
      0,
    ) / MINUTE;
  const deepRatio = clamp01(deepMin / 300);

  const recent = data.reactionTrials.slice(-20).map((t) => t.ms);
  const reactAvg = mean(recent);
  const reactRatio = recent.length ? clamp01((400 - reactAvg) / 220) : 0;

  const perCell: number[] = [];
  (["4", "5", "6"] as const).forEach((k) => {
    const pb = data.schultePB[k];
    if (pb !== null) perCell.push(pb / 1000 / (Number(k) * Number(k)));
  });
  const bestPerCell = perCell.length ? Math.min(...perCell) : null;
  const schulteRatio =
    bestPerCell === null ? 0 : clamp01((2.4 - bestPerCell) / 1.8);

  const stroopRuns = data.sessions
    .filter((s): s is StroopSession => s.kind === "stroop")
    .slice(-3);
  const stroopRatio = stroopRuns.length
    ? clamp01((250 - mean(stroopRuns.map((r) => r.interferenceMs))) / 220) *
      mean(stroopRuns.map((r) => r.accuracy))
    : 0;

  const breathRounds = week.reduce(
    (sum, s) => (s.kind === "breath" ? sum + s.rounds : sum),
    0,
  );
  const breathRatio = clamp01(breathRounds / 40);

  const components: ScoreComponent[] = [
    {
      id: "deep",
      label: "Deep work",
      weight: 350,
      ratio: deepRatio,
      points: 0,
      hint: `${Math.round(deepMin)} / 300 min this week`,
    },
    {
      id: "reaction",
      label: "Reaction",
      weight: 200,
      ratio: reactRatio,
      points: 0,
      hint: recent.length ? `${Math.round(reactAvg)} ms avg` : "No trials yet",
    },
    {
      id: "schulte",
      label: "Schulte",
      weight: 150,
      ratio: schulteRatio,
      points: 0,
      hint:
        bestPerCell === null
          ? "No grids yet"
          : `${bestPerCell.toFixed(2)} s per cell`,
    },
    {
      id: "stroop",
      label: "Stroop",
      weight: 150,
      ratio: stroopRatio,
      points: 0,
      hint: stroopRuns.length
        ? `${Math.round(mean(stroopRuns.map((r) => r.interferenceMs)))} ms cost`
        : "No runs yet",
    },
    {
      id: "breath",
      label: "Breath",
      weight: 150,
      ratio: breathRatio,
      points: 0,
      hint: `${breathRounds} / 40 rounds this week`,
    },
  ].map((c) => ({ ...c, points: Math.round(c.weight * c.ratio) })) as ScoreComponent[];

  const total = Math.max(
    0,
    Math.min(
      1000,
      components.reduce((s, c) => s + c.points, 0),
    ),
  );
  return { total, components };
}

/* ─── Daily aggregates ──────────────────────────────────────────────── */

export interface DayBucket {
  key: string;
  start: number;
  label: string; // "Mon"
  minutes: number; // deep work + breath minutes
  sessions: number;
  isToday: boolean;
}

function focusMinutes(s: SessionEntry): number {
  if (s.kind === "deep-work" || s.kind === "breath") return s.durationMs / MINUTE;
  return 0;
}

export function lastSevenDays(data: FocusLabData, now: number): DayBucket[] {
  const buckets: DayBucket[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const start = dayStartOffset(now, offset);
    buckets.push({
      key: dayKey(start),
      start,
      label: new Date(start).toLocaleDateString("en", { weekday: "short" }),
      minutes: 0,
      sessions: 0,
      isToday: offset === 0,
    });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const s of data.sessions) {
    const i = index.get(dayKey(s.at));
    if (i === undefined) continue;
    buckets[i].minutes += focusMinutes(s);
    if (s.kind === "deep-work" || s.kind === "breath") buckets[i].sessions += 1;
  }
  return buckets;
}

export function todayMinutes(data: FocusLabData, now: number): number {
  const today = dayKey(now);
  return data.sessions.reduce(
    (sum, s) => (dayKey(s.at) === today ? sum + focusMinutes(s) : sum),
    0,
  );
}

/**
 * Consecutive days (ending today, or yesterday if today is still empty)
 * containing at least one completed deep-work or breath session.
 */
export function dayStreak(data: FocusLabData, now: number): number {
  const days = new Set(
    data.sessions
      .filter(
        (s) => (s.kind === "deep-work" || s.kind === "breath") && s.completed,
      )
      .map((s) => dayKey(s.at)),
  );
  let offset = days.has(dayKey(now)) ? 0 : 1;
  let streak = 0;
  while (days.has(dayKey(dayStartOffset(now, offset)))) {
    streak += 1;
    offset += 1;
  }
  return streak;
}

export interface PersonalBests {
  schulte: Record<"4" | "5" | "6", number | null>;
  reactionBestMs: number | null;
  reactionBestRunMs: number | null;
  stroopBestInterferenceMs: number | null;
  longestDeepWorkMs: number | null;
  totalFocusMs: number;
  lastSchulte: SchulteSession | null;
}

export function personalBests(data: FocusLabData): PersonalBests {
  let reactionBestRunMs: number | null = null;
  let stroopBest: number | null = null;
  let longest: number | null = null;
  let total = 0;
  let lastSchulte: SchulteSession | null = null;
  for (const s of data.sessions) {
    if (s.kind === "reaction") {
      reactionBestRunMs =
        reactionBestRunMs === null ? s.avgMs : Math.min(reactionBestRunMs, s.avgMs);
    } else if (s.kind === "stroop" && s.accuracy >= 0.8) {
      stroopBest =
        stroopBest === null ? s.interferenceMs : Math.min(stroopBest, s.interferenceMs);
    } else if (s.kind === "deep-work") {
      longest = longest === null ? s.durationMs : Math.max(longest, s.durationMs);
      total += s.durationMs;
    } else if (s.kind === "breath") {
      total += s.durationMs;
    } else if (s.kind === "schulte") {
      lastSchulte = s;
    }
  }
  const trials = data.reactionTrials.map((t) => t.ms);
  return {
    schulte: data.schultePB,
    reactionBestMs: trials.length ? Math.min(...trials) : null,
    reactionBestRunMs,
    stroopBestInterferenceMs: stroopBest,
    longestDeepWorkMs: longest,
    totalFocusMs: total,
    lastSchulte,
  };
}

export const MINUTE = 60_000;
export const DAY = 86_400_000;

/** 1500000 → "25:00"; 5400000 → "90:00". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** 12345 → "12.35" */
export function formatSeconds(ms: number, digits = 2): string {
  return (Math.max(0, ms) / 1000).toFixed(digits);
}

export function formatMinutes(ms: number): string {
  const min = Math.round(ms / MINUTE);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

/** Local-calendar day key, e.g. "2026-09-27". */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Start of the local day `offset` days before `now`'s day (DST-safe). */
export function dayStartOffset(now: number, offset: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d.getTime();
}

const rtf =
  typeof Intl !== "undefined"
    ? new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" })
    : null;

export function relativeTime(ts: number, now: number): string {
  const diff = ts - now;
  const abs = Math.abs(diff);
  if (abs < 45_000) return "just now";
  if (!rtf) return new Date(ts).toLocaleString();
  if (abs < 3_600_000) return rtf.format(Math.round(diff / MINUTE), "minute");
  if (abs < DAY) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 7 * DAY) return rtf.format(Math.round(diff / DAY), "day");
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Monotonic clock for event handlers (same timebase as event.timeStamp). */
export function monotonicNow(): number {
  return performance.now();
}

/** Wall-clock epoch ms for event handlers. */
export function epochNow(): number {
  return Date.now();
}

"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "./store";
import type { FocusLabData } from "./types";

/** Reactive, SSR-safe view of the persisted Focus Lab data. */
export function useFocusLabData(): FocusLabData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const noopSubscribe = () => () => {};

/** False on the server and during hydration, true afterwards. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(cb: () => void): () => void {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/** Imperative check for use inside event handlers / rAF loops. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(REDUCED_QUERY).matches
  );
}

/** True when a keyboard event originates from a text-entry or control element. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** True when the target is any interactive control that handles Space itself. */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (isTypingTarget(target)) return true;
  return target.closest("button, a, [role='slider'], [role='tab']") !== null;
}

/* ─── Shared coarse clock (SSR snapshot = 0) ───────────────────────── */

let nowValue = 0;
let nowTimer: ReturnType<typeof setInterval> | null = null;
const nowListeners = new Set<() => void>();

function subscribeNow(cb: () => void): () => void {
  nowListeners.add(cb);
  if (nowTimer === null) {
    nowTimer = setInterval(() => {
      nowValue = Date.now();
      nowListeners.forEach((l) => l());
    }, 20_000);
  }
  return () => {
    nowListeners.delete(cb);
    if (nowListeners.size === 0 && nowTimer !== null) {
      clearInterval(nowTimer);
      nowTimer = null;
    }
  };
}

function getNow(): number {
  if (nowValue === 0) nowValue = Date.now();
  return nowValue;
}

/** Epoch ms refreshed every ~20s; 0 on the server / during hydration. */
export function useCoarseNow(): number {
  return useSyncExternalStore(subscribeNow, getNow, () => 0);
}

/** Force the coarse clock forward (e.g. right after logging a session). */
export function bumpNow(): void {
  nowValue = Date.now();
  nowListeners.forEach((l) => l());
}

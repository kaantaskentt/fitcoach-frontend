import type { ModuleId } from "./types";

export interface ModuleMeta {
  id: ModuleId;
  label: string;
  index: string;
  title: string;
  tagline: string;
}

export const MODULES: ModuleMeta[] = [
  {
    id: "deep-work",
    label: "Deep Work",
    index: "01",
    title: "Deep Work",
    tagline: "One intention. One block of undivided attention.",
  },
  {
    id: "breath",
    label: "Breath",
    index: "02",
    title: "Breath Lab",
    tagline: "Down-regulate on command. Your exhale is the brake pedal.",
  },
  {
    id: "reaction",
    label: "Reaction",
    index: "03",
    title: "Reaction Lab",
    tagline: "Five trials. Pure signal-to-response latency.",
  },
  {
    id: "schulte",
    label: "Schulte",
    index: "04",
    title: "Schulte Grid",
    tagline: "Widen the aperture. Find every number without moving your eyes.",
  },
  {
    id: "stroop",
    label: "Stroop",
    index: "05",
    title: "Stroop Challenge",
    tagline: "Read the ink, not the word. Measure your inhibitory control.",
  },
  {
    id: "stats",
    label: "Stats",
    index: "06",
    title: "Focus Ledger",
    tagline: "Every rep of attention, accounted for.",
  },
];

export const DEFAULT_MODULE: ModuleId = "deep-work";

export function parseModuleHash(hash: string): ModuleId {
  const id = hash.replace(/^#/, "");
  return MODULES.some((m) => m.id === id) ? (id as ModuleId) : DEFAULT_MODULE;
}

/* ─── Hash-backed module store (useSyncExternalStore) ──────────────── */

const hashListeners = new Set<() => void>();

export function subscribeHash(cb: () => void): () => void {
  hashListeners.add(cb);
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  return () => {
    hashListeners.delete(cb);
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
  };
}

export function getHashModule(): ModuleId {
  return parseModuleHash(window.location.hash);
}

export function getServerHashModule(): ModuleId {
  return DEFAULT_MODULE;
}

/** Updates the hash without scrolling or adding a history entry per click. */
export function navigateToModule(id: ModuleId): void {
  if (parseModuleHash(window.location.hash) === id && window.location.hash) return;
  window.history.replaceState(null, "", `#${id}`);
  hashListeners.forEach((l) => l());
}

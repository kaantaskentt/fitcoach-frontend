// Deterministic motion primitives. Every frame of the film is a pure function
// of time, so live playback and the frame-by-frame MP4 export always agree.

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const DURATION = 15;
export const BPM = 120;
export const BEAT = 60 / BPM;

export const GOLD = "#C9A96E";
export const GOLD_DEEP = "#9F7D55";
export const GOLD_HOT = "#F3D9A4";
export const TEAL = "#5FB8AE";
export const INK = "#0A0908";

export interface Scene {
  id: string;
  label: string;
  start: number;
  end: number;
}

export const SCENES: Scene[] = [
  { id: "ignition", label: "Ignition", start: 0, end: 2 },
  { id: "slams", label: "Train · Move · Recover", start: 2, end: 5 },
  { id: "system", label: "The System", start: 5, end: 8 },
  { id: "coach", label: "The Coach", start: 8, end: 11 },
  { id: "warp", label: "No Excuses", start: 11, end: 13 },
  { id: "resolve", label: "Resolve", start: 13, end: 15 },
];

/** Big hits: cuts, slams and the logo snap. Drive shake, flashes and the soundtrack. */
export const IMPACTS = [2, 3, 4, 5, 8, 11, 11.5, 12, 12.5, 13.9];

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const fract = (v: number) => v - Math.floor(v);

export const ease = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  /** Damped spring settling at 1. */
  spring: (t: number, freq = 4.5, damp = 5) =>
    t <= 0 ? 0 : 1 - Math.exp(-damp * t) * Math.cos(freq * Math.PI * 2 * t * 0.5),
};

/** Progress of `t` through [start, start + dur], eased. */
export const prog = (t: number, start: number, dur: number, fn: (x: number) => number = (x) => x) =>
  fn(invLerp(start, start + dur, t));

/** Seeded PRNG (mulberry32) so particles are identical every render. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cheap deterministic hash noise in [-1, 1]. */
export const hash = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453) * 2 - 1;

/** Smooth 1D value noise in [-1, 1]. */
export function noise1(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u);
}

/** Sum of decaying pulses after each impact: 1 at the hit, ~0 after `decay`. */
export function impactEnergy(t: number, decay = 10) {
  let e = 0;
  for (const it of IMPACTS) {
    if (t >= it) e += Math.exp(-(t - it) * decay);
  }
  return Math.min(1.4, e);
}

export function sceneAt(t: number): Scene {
  return SCENES.find((s) => t >= s.start && t < s.end) ?? SCENES[SCENES.length - 1];
}

export function timecode(t: number) {
  const frames = Math.floor(t * FPS + 1e-6);
  const f = frames % FPS;
  const s = Math.floor(frames / FPS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `00:00:${pad(s)}:${pad(f)}`;
}

export type Ctx = CanvasRenderingContext2D;

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Wrap text into lines that fit maxWidth using the current ctx font. */
export function wrapLines(ctx: Ctx, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

/** Draw an image cover-fit into a rect with zoom and focal point (0..1). */
export function drawCover(
  ctx: Ctx,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
  zoom = 1,
  fx = 0.5,
  fy = 0.5,
) {
  const s = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh);
}

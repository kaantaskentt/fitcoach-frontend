import type { SoundscapeId } from "./types";

/*
 * Web Audio engine for Focus Lab. The AudioContext is only ever created
 * from a user gesture (Start button, soundscape pick, breath tone toggle)
 * and is shared between the soundscape, completion chime and breath tone.
 */

type AudioCtor = typeof AudioContext;

let sharedCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedCtx === null || sharedCtx.state === "closed") {
    const Ctor: AudioCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      sharedCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (sharedCtx.state === "suspended") void sharedCtx.resume();
  return sharedCtx;
}

/** Returns the context only if one was already unlocked by a gesture. */
export function peekAudioContext(): AudioContext | null {
  return sharedCtx && sharedCtx.state !== "closed" ? sharedCtx : null;
}

export function closeAudioContext(): void {
  if (sharedCtx && sharedCtx.state !== "closed") void sharedCtx.close();
  sharedCtx = null;
}

/* ─── Noise buffers (cached per context) ───────────────────────────── */

const bufferCache = new WeakMap<AudioContext, Map<string, AudioBuffer>>();

function cached(
  ctx: AudioContext,
  key: string,
  make: () => AudioBuffer,
): AudioBuffer {
  let map = bufferCache.get(ctx);
  if (!map) {
    map = new Map();
    bufferCache.set(ctx, map);
  }
  let buf = map.get(key);
  if (!buf) {
    buf = make();
    map.set(key, buf);
  }
  return buf;
}

function brownBuffer(ctx: AudioContext): AudioBuffer {
  return cached(ctx, "brown", () => {
    const len = ctx.sampleRate * 8;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.2;
      }
      // Cross-fade the loop seam so there is no click at the wrap point.
      const fade = Math.floor(ctx.sampleRate * 0.05);
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        d[len - fade + i] = d[len - fade + i] * (1 - t) + d[i] * t;
      }
    }
    return buf;
  });
}

function whiteBuffer(ctx: AudioContext): AudioBuffer {
  return cached(ctx, "white", () => {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return buf;
  });
}

function dropletBuffer(ctx: AudioContext): AudioBuffer {
  return cached(ctx, "drop", () => {
    const len = Math.floor(ctx.sampleRate * 0.045);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.exp(-i / (len * 0.12));
      d[i] = (Math.random() * 2 - 1) * env;
    }
    return buf;
  });
}

function loopSource(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  // Random offset so layers built from the same buffer don't phase.
  src.start(ctx.currentTime, Math.random() * buffer.duration);
  return src;
}

/* ─── Soundscape layers ────────────────────────────────────────────── */

interface Layer {
  out: GainNode;
  stop: () => void;
}

const FADE_IN = 1.2;
const FADE_OUT = 0.7;

function buildBrown(ctx: AudioContext, out: GainNode): () => void {
  const src = loopSource(ctx, brownBuffer(ctx));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const g = ctx.createGain();
  g.gain.value = 0.9;
  src.connect(lp).connect(g).connect(out);
  return () => {
    src.stop();
    src.disconnect();
  };
}

function buildRain(ctx: AudioContext, out: GainNode): () => void {
  // Body: band-passed white noise.
  const hiss = loopSource(ctx, whiteBuffer(ctx));
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2200;
  bp.Q.value = 0.45;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.22;
  hiss.connect(bp).connect(hissGain).connect(out);

  // Low rumble so it reads as weather, not static.
  const rumble = loopSource(ctx, brownBuffer(ctx));
  const rlp = ctx.createBiquadFilter();
  rlp.type = "lowpass";
  rlp.frequency.value = 380;
  const rGain = ctx.createGain();
  rGain.gain.value = 0.45;
  rumble.connect(rlp).connect(rGain).connect(out);

  // Randomised droplet clicks scheduled on the audio clock.
  const drop = dropletBuffer(ctx);
  const TICK = 0.12;
  let scheduledUntil = ctx.currentTime + 0.05;
  const scheduleDrops = () => {
    const horizon = ctx.currentTime + TICK * 2;
    while (scheduledUntil < horizon) {
      scheduledUntil += 0.012 + Math.random() * 0.09;
      const big = Math.random() < 0.12;
      const src = ctx.createBufferSource();
      src.buffer = drop;
      src.playbackRate.value = big ? 0.55 + Math.random() * 0.3 : 0.9 + Math.random() * 0.8;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = big ? 900 + Math.random() * 900 : 2600 + Math.random() * 4200;
      f.Q.value = 1.5 + Math.random() * 4;
      const g = ctx.createGain();
      g.gain.value = big ? 0.35 + Math.random() * 0.3 : 0.06 + Math.random() * 0.18;
      const p = ctx.createStereoPanner();
      p.pan.value = Math.random() * 1.8 - 0.9;
      src.connect(f).connect(g).connect(p).connect(out);
      src.onended = () => src.disconnect();
      src.start(scheduledUntil);
    }
  };
  scheduleDrops();
  const timer = window.setInterval(scheduleDrops, TICK * 1000);

  return () => {
    window.clearInterval(timer);
    hiss.stop();
    rumble.stop();
    hiss.disconnect();
    rumble.disconnect();
  };
}

function buildOcean(ctx: AudioContext, out: GainNode): () => void {
  const src = loopSource(ctx, brownBuffer(ctx));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 620;
  lp.Q.value = 0.6;
  const swell = ctx.createGain();
  swell.gain.value = 0.55;
  const pan = ctx.createStereoPanner();

  // Slow swell LFO (~11 s per wave) drives both filter cutoff and level.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.09;
  const cutoffDepth = ctx.createGain();
  cutoffDepth.gain.value = 440;
  const levelDepth = ctx.createGain();
  levelDepth.gain.value = 0.45;
  lfo.connect(cutoffDepth).connect(lp.frequency);
  lfo.connect(levelDepth).connect(swell.gain);

  const panLfo = ctx.createOscillator();
  panLfo.frequency.value = 0.037;
  const panDepth = ctx.createGain();
  panDepth.gain.value = 0.35;
  panLfo.connect(panDepth).connect(pan.pan);

  // Airy foam on the crest.
  const foam = loopSource(ctx, whiteBuffer(ctx));
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3000;
  const foamGain = ctx.createGain();
  foamGain.gain.value = 0;
  const foamDepth = ctx.createGain();
  foamDepth.gain.value = 0.03;
  lfo.connect(foamDepth).connect(foamGain.gain);
  foam.connect(hp).connect(foamGain).connect(pan);

  src.connect(lp).connect(swell).connect(pan).connect(out);
  lfo.start();
  panLfo.start();

  return () => {
    [src, foam].forEach((s) => {
      s.stop();
      s.disconnect();
    });
    lfo.stop();
    panLfo.stop();
    lfo.disconnect();
    panLfo.disconnect();
  };
}

function buildGamma(ctx: AudioContext, out: GainNode): () => void {
  // 200 Hz left / 240 Hz right → a 40 Hz binaural beat (headphones).
  const make = (freq: number, panValue: number) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const p = ctx.createStereoPanner();
    p.pan.value = panValue;
    const g = ctx.createGain();
    g.gain.value = 0.16;
    osc.connect(g).connect(p).connect(out);
    osc.start();
    return osc;
  };
  const left = make(200, -1);
  const right = make(240, 1);
  return () => {
    [left, right].forEach((o) => {
      o.stop();
      o.disconnect();
    });
  };
}

const BUILDERS: Record<Exclude<SoundscapeId, "off">, (ctx: AudioContext, out: GainNode) => () => void> = {
  brown: buildBrown,
  rain: buildRain,
  ocean: buildOcean,
  gamma: buildGamma,
};

export class Soundscape {
  readonly ctx: AudioContext;
  readonly analyser: AnalyserNode;
  private master: GainNode;
  private layer: Layer | null = null;
  private pending = new Set<number>();
  private volume = 0.5;
  current: SoundscapeId = "off";

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.82;
    this.master.connect(this.analyser);
    this.analyser.connect(ctx.destination);
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    // Squared curve feels perceptually linear on a slider.
    this.master.gain.setTargetAtTime(
      this.volume * this.volume * 0.9,
      this.ctx.currentTime,
      0.06,
    );
  }

  play(id: SoundscapeId): void {
    if (id === this.current) return;
    this.current = id;
    const t = this.ctx.currentTime;
    if (this.layer) {
      const old = this.layer;
      old.out.gain.cancelScheduledValues(t);
      old.out.gain.setValueAtTime(old.out.gain.value, t);
      old.out.gain.linearRampToValueAtTime(0, t + FADE_OUT);
      const handle = window.setTimeout(() => {
        this.pending.delete(handle);
        old.stop();
        old.out.disconnect();
      }, FADE_OUT * 1000 + 80);
      this.pending.add(handle);
      this.layer = null;
    }
    if (id === "off") return;
    this.setVolume(this.volume);
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(1, t + FADE_IN);
    out.connect(this.master);
    const stop = BUILDERS[id](this.ctx, out);
    this.layer = { out, stop };
  }

  dispose(): void {
    this.pending.forEach((h) => window.clearTimeout(h));
    this.pending.clear();
    if (this.layer) {
      this.layer.stop();
      this.layer.out.disconnect();
      this.layer = null;
    }
    this.master.disconnect();
    this.analyser.disconnect();
    this.current = "off";
  }
}

/* ─── Completion chime ─────────────────────────────────────────────── */

// Inharmonic partial ratios of a small struck bell, with relative level + decay.
const BELL_PARTIALS: ReadonlyArray<readonly [ratio: number, amp: number, decay: number]> = [
  [0.5, 0.35, 3.6],
  [1, 1, 3.2],
  [2.0, 0.42, 2.4],
  [2.76, 0.3, 1.8],
  [5.4, 0.14, 1.1],
  [8.93, 0.06, 0.7],
];

export function playChime(ctx: AudioContext, level = 0.22): void {
  const master = ctx.createGain();
  master.gain.value = level;
  master.connect(ctx.destination);
  const strike = (fundamental: number, at: number, velocity: number) => {
    for (const [ratio, amp, decay] of BELL_PARTIALS) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = fundamental * ratio;
      const g = ctx.createGain();
      const peak = Math.max(0.0002, amp * velocity * 0.3);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      osc.connect(g).connect(master);
      osc.start(at);
      osc.stop(at + decay + 0.05);
      osc.onended = () => {
        osc.disconnect();
        g.disconnect();
      };
    }
  };
  const t = ctx.currentTime + 0.02;
  strike(659.25, t, 1); // E5
  strike(987.77, t + 0.32, 0.7); // B5
  strike(1318.5, t + 0.64, 0.45); // E6
  window.setTimeout(() => master.disconnect(), 5000);
}

/* ─── Breath guidance tone ─────────────────────────────────────────── */

export const BREATH_TONE_LOW = 164.81; // E3
export const BREATH_TONE_HIGH = 246.94; // B3

export class BreathTone {
  private ctx: AudioContext;
  private osc: OscillatorNode;
  private sub: OscillatorNode;
  private out: GainNode;
  private stopped = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.osc = ctx.createOscillator();
    this.osc.type = "sine";
    this.osc.frequency.value = BREATH_TONE_LOW;
    this.sub = ctx.createOscillator();
    this.sub.type = "triangle";
    this.sub.frequency.value = BREATH_TONE_LOW / 2;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.25;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.osc.connect(lp);
    this.sub.connect(subGain).connect(lp);
    lp.connect(this.out).connect(ctx.destination);
    this.osc.start();
    this.sub.start();
  }

  /** Glide pitch to `freq` over `seconds` and settle level. */
  glide(freq: number, seconds: number, level: number): void {
    if (this.stopped) return;
    const t = this.ctx.currentTime;
    for (const [osc, f] of [
      [this.osc, freq],
      [this.sub, freq / 2],
    ] as const) {
      osc.frequency.cancelScheduledValues(t);
      osc.frequency.setValueAtTime(osc.frequency.value, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + Math.max(0.05, seconds));
    }
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(level, t + Math.min(0.6, seconds));
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + 0.4);
    this.osc.stop(t + 0.45);
    this.sub.stop(t + 0.45);
    this.osc.onended = () => {
      this.osc.disconnect();
      this.sub.disconnect();
      this.out.disconnect();
    };
  }
}

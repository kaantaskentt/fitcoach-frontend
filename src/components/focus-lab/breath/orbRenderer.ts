import type { BreathPattern, BreathPhaseKind } from "@/lib/focus-lab/breath";

export interface OrbFrame {
  fullness: number; // 0..1
  phaseKind: BreathPhaseKind | "idle";
  cycleProgress: number; // 0..1, <0 hides the progress arc
  active: boolean;
}

export interface OrbParticle {
  angle: number;
  speed: number;
  orbit: number;
  size: number;
  phase: number;
}

export function makeOrbParticles(n = 42): OrbParticle[] {
  return Array.from({ length: n }, () => ({
    angle: Math.random() * Math.PI * 2,
    speed: 0.00012 + Math.random() * 0.00032,
    orbit: 1.12 + Math.random() * 0.34,
    size: 0.6 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2,
  }));
}

const TAU = Math.PI * 2;
const TOP = -Math.PI / 2;

function segmentColor(kind: BreathPhaseKind): string {
  if (kind === "inhale" || kind === "top-up") return "rgba(95,184,174,0.34)";
  if (kind === "exhale") return "rgba(95,184,174,0.2)";
  return "rgba(201,169,110,0.3)";
}

/** Draws one frame of the breath orb. Pure canvas — no React involvement. */
export function drawOrb(
  ctx: CanvasRenderingContext2D,
  size: number,
  pattern: BreathPattern,
  frame: OrbFrame,
  particles: OrbParticle[],
  t: number,
  dt: number,
  reduced: boolean,
): void {
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);

  /* ── Outer segmented track ── */
  const trackR = size * 0.465;
  const total = pattern.phases.reduce((s, p) => s + p.seconds, 0);
  const gap = 0.035;
  let a = TOP;
  ctx.lineCap = "round";
  for (const ph of pattern.phases) {
    const sweep = (ph.seconds / total) * TAU;
    ctx.beginPath();
    ctx.strokeStyle = segmentColor(ph.kind);
    ctx.lineWidth = 2;
    ctx.arc(c, c, trackR, a + gap / 2, a + sweep - gap / 2);
    ctx.stroke();
    // Segment start tick.
    ctx.beginPath();
    ctx.strokeStyle = "rgba(201,169,110,0.45)";
    ctx.lineWidth = 1;
    ctx.moveTo(c + Math.cos(a) * (trackR - 9), c + Math.sin(a) * (trackR - 9));
    ctx.lineTo(c + Math.cos(a) * (trackR - 4), c + Math.sin(a) * (trackR - 4));
    ctx.stroke();
    a += sweep;
  }

  // Fine minute-style ticks inside the track.
  ctx.strokeStyle = "rgba(201,169,110,0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 72; i++) {
    const ang = (i / 72) * TAU;
    const r0 = trackR - (i % 6 === 0 ? 16 : 13);
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(ang) * r0, c + Math.sin(ang) * r0);
    ctx.lineTo(c + Math.cos(ang) * (trackR - 11), c + Math.sin(ang) * (trackR - 11));
    ctx.stroke();
  }

  if (frame.active && frame.cycleProgress >= 0) {
    const end = TOP + frame.cycleProgress * TAU;
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#8AD3CA");
    grad.addColorStop(1, "#C9A96E");
    ctx.save();
    ctx.shadowColor = "rgba(95,184,174,0.8)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.arc(c, c, trackR, TOP, Math.max(TOP + 0.001, end));
    ctx.stroke();
    ctx.restore();
    // Leading dot.
    ctx.beginPath();
    ctx.fillStyle = "#E9FBF8";
    ctx.arc(c + Math.cos(end) * trackR, c + Math.sin(end) * trackR, 3.5, 0, TAU);
    ctx.fill();
  }

  /* ── Orb ── */
  const rMin = size * 0.15;
  const rMax = size * 0.335;
  const holding = frame.phaseKind === "hold-in" || frame.phaseKind === "hold-out";
  let r: number;
  let alpha = 1;
  if (reduced) {
    r = (rMin + rMax) / 2;
    alpha = 0.3 + 0.7 * frame.fullness;
  } else {
    r = rMin + (rMax - rMin) * frame.fullness;
    if (holding) r += Math.sin(t / 260) * 1.2;
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  // Halo
  const halo = ctx.createRadialGradient(c, c, r * 0.6, c, c, r * 1.75);
  halo.addColorStop(0, "rgba(95,184,174,0.20)");
  halo.addColorStop(0.55, "rgba(201,169,110,0.06)");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(c, c, r * 1.75, 0, TAU);
  ctx.fill();

  // Body: teal core → gold rim
  const body = ctx.createRadialGradient(c - r * 0.18, c - r * 0.22, r * 0.05, c, c, r);
  body.addColorStop(0, "rgba(196,245,238,0.95)");
  body.addColorStop(0.28, "rgba(120,212,200,0.85)");
  body.addColorStop(0.62, "rgba(63,143,134,0.62)");
  body.addColorStop(0.86, "rgba(150,130,90,0.55)");
  body.addColorStop(0.97, "rgba(214,184,128,0.9)");
  body.addColorStop(1, "rgba(201,169,110,0)");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, TAU);
  ctx.fill();

  // Rim light + hold shimmer
  const shimmer = holding && !reduced ? 0.35 + 0.35 * Math.sin(t / 180) : 0.3;
  ctx.strokeStyle = `rgba(233,211,166,${0.35 + shimmer * 0.5})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(c, c, r - 0.6, 0, TAU);
  ctx.stroke();
  if (holding && !reduced) {
    const sweepStart = (t / 900) % TAU;
    ctx.strokeStyle = "rgba(246,230,194,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, r - 0.6, sweepStart, sweepStart + 0.7);
    ctx.stroke();
  }

  // Specular
  const spec = ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, 0, c - r * 0.35, c - r * 0.4, r * 0.45);
  spec.addColorStop(0, "rgba(255,255,255,0.22)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, TAU);
  ctx.fill();
  ctx.restore();

  /* ── Orbiting particles ── */
  if (reduced) return;
  const moving = frame.phaseKind === "inhale" || frame.phaseKind === "top-up" || frame.phaseKind === "exhale";
  const speedBoost = moving ? 1.8 : frame.phaseKind === "idle" ? 0.7 : 1;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    p.angle += p.speed * dt * speedBoost;
    const wobble = Math.sin(t / 900 + p.phase) * 0.05;
    const orbitR = r * (p.orbit + wobble) + 6;
    const x = c + Math.cos(p.angle) * orbitR;
    const y = c + Math.sin(p.angle) * orbitR;
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 400 + p.phase * 3));
    ctx.fillStyle = p.phase > Math.PI ? `rgba(233,211,166,${0.55 * tw})` : `rgba(143,222,212,${0.55 * tw})`;
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

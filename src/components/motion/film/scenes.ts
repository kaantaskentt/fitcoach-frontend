import { drawMark, drawWordmark, type FilmAssets } from "./assets";
import {
  BEAT,
  GOLD,
  GOLD_DEEP,
  GOLD_HOT,
  H,
  INK,
  TEAL,
  W,
  clamp,
  drawCover,
  ease,
  fract,
  hash,
  lerp,
  noise1,
  prog,
  rng,
  wrapLines,
  type Ctx,
} from "./core";

const CX = W / 2;
const CY = H / 2;

function font(weight: number | string, size: number, family: string) {
  return `${weight} ${size}px ${family}`;
}

function fillInk(ctx: Ctx, glow = 0, glowColor = "rgba(201,169,110,0.18)") {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  if (glow > 0) {
    const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, W * 0.6);
    g.addColorStop(0, glowColor.replace(/[\d.]+\)$/, `${0.18 * glow})`));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Micro-caps label with wide tracking. */
function microLabel(ctx: Ctx, a: FilmAssets, text: string, x: number, y: number, alpha: number, align: CanvasTextAlign = "left", size = 18, color = "255,255,255") {
  if (alpha <= 0) return;
  ctx.save();
  ctx.font = font(500, size, a.fonts.mono);
  ctx.letterSpacing = `${size * 0.32}px`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = `rgba(${color},${alpha})`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ───────────────────────── 01 · IGNITION (0–2s) ───────────────────────── */

// Heartbeat complexes placed so the scan head crosses them on beats 0.5 / 1.0 / 1.5.
const ECG_T0 = 0.2;
const ECG_T1 = 1.8;
const ECG_BEATS: [number, number][] = [
  [(0.5 - ECG_T0) / (ECG_T1 - ECG_T0), 0.42],
  [(1.0 - ECG_T0) / (ECG_T1 - ECG_T0), 1],
  [(1.5 - ECG_T0) / (ECG_T1 - ECG_T0), 0.62],
];

function ecg(u: number): number {
  let y = noise1(u * 90) * 0.012;
  for (const [c, amp] of ECG_BEATS) {
    const d = (u - c) * 40; // local units: ~1 per 2.5% of width
    const p = 0.08 * Math.exp(-Math.pow(d + 3.2, 2) * 1.2); // P wave
    const q = -0.12 * Math.exp(-Math.pow(d + 0.55, 2) * 18);
    const r = 1.0 * Math.exp(-Math.pow(d, 2) * 22);
    const s = -0.32 * Math.exp(-Math.pow(d - 0.5, 2) * 18);
    const tw = 0.16 * Math.exp(-Math.pow(d - 3.4, 2) * 0.9); // T wave
    y += (p + q + r + s + tw) * amp;
  }
  return y;
}

export function drawIgnition(ctx: Ctx, t: number, a: FilmAssets) {
  const head = clamp((t - ECG_T0) / (ECG_T1 - ECG_T0), 0, 1.05);
  // Glow swells right after the big central beat.
  const beatGlow = Math.max(0, ...[0.5, 1.0, 1.5].map((b, i) => (t >= b ? Math.exp(-(t - b) * 5) * [0.4, 1, 0.6][i] : 0)));
  fillInk(ctx, 0.5 + beatGlow * 1.6);

  const collapse = prog(t, 1.72, 0.28, ease.inExpo);
  const amp = 260 * (1 - collapse * 0.6);
  const x0 = 80;
  const x1 = W - 80;
  const toX = (u: number) => lerp(CX, lerp(x0, x1, u), 1 - collapse);
  const toY = (u: number) => CY - ecg(u) * amp;

  const tail = 0.62;
  const uStart = Math.max(0, head - tail);
  const uEnd = Math.min(1, head);

  if (uEnd > uStart) {
    const grad = ctx.createLinearGradient(toX(uStart), 0, toX(uEnd), 0);
    grad.addColorStop(0, "rgba(201,169,110,0)");
    grad.addColorStop(0.7, "rgba(201,169,110,0.65)");
    grad.addColorStop(1, GOLD_HOT);

    const path = new Path2D();
    const steps = 700;
    for (let i = 0; i <= steps; i++) {
      const u = lerp(uStart, uEnd, i / steps);
      const px = toX(u);
      const py = toY(u);
      if (i === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    }
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = grad;
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 38;
    ctx.lineWidth = 7;
    ctx.globalAlpha = 0.5;
    ctx.stroke(path);
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.stroke(path);
    ctx.restore();

    // Scan head.
    if (head <= 1) {
      const hx = toX(uEnd);
      const hy = toY(uEnd);
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 70);
      g.addColorStop(0, "rgba(255,240,210,0.95)");
      g.addColorStop(0.15, "rgba(243,217,164,0.6)");
      g.addColorStop(1, "rgba(201,169,110,0)");
      ctx.fillStyle = g;
      ctx.fillRect(hx - 70, hy - 70, 140, 140);
    }
  }

  // Shock ring off the central R-peak.
  const ring = prog(t, 1.0, 0.7, ease.outCubic);
  if (ring > 0 && ring < 1) {
    ctx.save();
    ctx.strokeStyle = `rgba(243,217,164,${0.5 * (1 - ring)})`;
    ctx.lineWidth = 2 + 6 * (1 - ring);
    ctx.beginPath();
    ctx.arc(CX, CY - amp * 0.9, 40 + ring * 520, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Collapse to a white-hot point before the cut.
  if (collapse > 0) {
    const r = 30 + collapse * 240;
    const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, r);
    g.addColorStop(0, `rgba(255,248,235,${collapse})`);
    g.addColorStop(1, "rgba(255,248,235,0)");
    ctx.fillStyle = g;
    ctx.fillRect(CX - r, CY - r, r * 2, r * 2);
  }

  const labelIn = prog(t, 0.25, 0.5, ease.outCubic) * (1 - prog(t, 1.55, 0.2));
  microLabel(ctx, a, "FITCOACH  PRESENTS", CX, CY - 330 + (1 - labelIn) * 12, labelIn * 0.55, "center", 20);
  const bpmIn = prog(t, 0.95, 0.3, ease.outCubic) * (1 - prog(t, 1.6, 0.15));
  if (bpmIn > 0) {
    const bpm = Math.round(lerp(62, 128, prog(t, 0.95, 0.6, ease.outCubic)));
    microLabel(ctx, a, `HEART RATE  ${bpm} BPM`, CX, CY + 330, bpmIn * 0.5, "center", 18, "243,217,164");
  }
}

/* ─────────────────── 02 · TRAIN · MOVE · RECOVER (2–5s) ─────────────────── */

interface Shot {
  word: string;
  plate: keyof FilmAssets["plates"];
  fx: number;
  fy: number;
  accent: string;
  tag: string;
  line: string;
}

const SHOTS: Shot[] = [
  { word: "TRAIN", plate: "dumbbell", fx: 0.35, fy: 0.42, accent: GOLD, tag: "01 — STRENGTH", line: "Progressive overload, planned for you." },
  { word: "MOVE", plate: "stretch", fx: 0.62, fy: 0.3, accent: GOLD, tag: "02 — MOBILITY", line: "Range of motion that actually sticks." },
  { word: "RECOVER", plate: "pool", fx: 0.5, fy: 0.55, accent: TEAL, tag: "03 — RECOVERY", line: "Rest is part of the program." },
];

function drawSlamWord(ctx: Ctx, a: FilmAssets, shot: Shot, x: number, y: number, size: number, fill: string | CanvasPattern | CanvasGradient) {
  ctx.font = font(700, size, a.fonts.sans);
  ctx.letterSpacing = `${-size * 0.045}px`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const wordW = ctx.measureText(shot.word).width;
  const dotW = ctx.measureText(".").width;
  const left = x - (wordW + dotW) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = fill;
  ctx.fillText(shot.word, left, y);
  ctx.fillStyle = shot.accent;
  ctx.fillText(".", left + wordW, y);
}

export function drawSlams(ctx: Ctx, t: number, a: FilmAssets) {
  const local = t - 2;
  const idx = Math.min(2, Math.floor(local));
  const shot = SHOTS[idx];
  const l = local - idx; // 0..1 inside this shot
  const plate = a.plates[shot.plate];
  const second = l >= 0.5; // offbeat: image moves *inside* the type

  const drift = (idx % 2 === 0 ? 1 : -1) * l * 40;
  const zoom = 1.22 - 0.12 * ease.outCubic(l) + 0.05 * Math.exp(-l * 14);

  const size = shot.word.length > 5 ? 300 : 360;
  const baseY = CY + size * 0.34;

  if (!second) {
    ctx.save();
    ctx.filter = "brightness(0.62) contrast(1.18) saturate(1.1)";
    drawCover(ctx, plate, drift - 20, 0, W + 40, H, zoom, shot.fx, shot.fy);
    ctx.restore();
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, "rgba(10,9,8,0.35)");
    shade.addColorStop(0.55, "rgba(10,9,8,0.15)");
    shade.addColorStop(1, "rgba(10,9,8,0.85)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);

    const inP = prog(l, 0, 0.2, ease.outExpo);
    const scale = lerp(1.7, 1, inP);
    // Motion-smear ghosts during the slam.
    for (let g = 3; g >= 0; g--) {
      const gs = g === 0 ? scale : lerp(scale, 1.7, g * 0.12);
      const ga = g === 0 ? clamp(l / 0.05) : 0.12 * (1 - inP);
      if (ga <= 0) continue;
      ctx.save();
      ctx.globalAlpha = ga;
      ctx.translate(CX, CY);
      ctx.scale(gs, gs);
      ctx.translate(-CX, -CY);
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 40;
      drawSlamWord(ctx, a, shot, CX, baseY, size, "#FFFFFF");
      ctx.restore();
    }
  } else {
    const l2 = (l - 0.5) * 2;
    fillInk(ctx, 0.6, shot.accent === TEAL ? "rgba(95,184,174,0.18)" : "rgba(201,169,110,0.18)");
    // Image-in-type: render the word to the buffer, then paint the plate inside it.
    const b = a.buffer.getContext("2d")!;
    b.save();
    b.clearRect(0, 0, W, H);
    const s = lerp(1.0, 1.06, ease.outCubic(l2));
    b.translate(CX, CY);
    b.scale(s, s);
    b.translate(-CX, -CY);
    drawSlamWord(b, a, shot, CX, baseY, size, "#fff");
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalCompositeOperation = "source-in";
    b.fillStyle = shot.accent === TEAL ? "#16302d" : "#3a2c1a";
    b.fillRect(0, 0, W, H);
    b.globalCompositeOperation = "source-atop";
    b.filter = "brightness(1.9) contrast(1.15) saturate(1.15)";
    drawCover(b, plate, -drift, 0, W, H, 1.05 + 0.1 * l2, shot.fx, shot.fy);
    b.restore();
    ctx.drawImage(a.buffer, 0, 0);

    // Outline echo expanding off the offbeat.
    const echo = ease.outCubic(l2);
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - echo);
    ctx.translate(CX, CY);
    ctx.scale(1 + echo * 0.35, 1 + echo * 0.35);
    ctx.translate(-CX, -CY);
    ctx.font = font(700, size, a.fonts.sans);
    ctx.letterSpacing = `${-size * 0.045}px`;
    ctx.textAlign = "center";
    ctx.strokeStyle = shot.accent;
    ctx.lineWidth = 2.5;
    ctx.strokeText(`${shot.word}.`, CX, baseY);
    ctx.restore();
  }

  // Lower-third captions persist across both halves.
  const capIn = prog(l, 0.08, 0.3, ease.outCubic);
  microLabel(ctx, a, shot.tag, 120, H - 236, 0.75 * capIn, "left", 18, shot.accent === TEAL ? "150,215,206" : "243,217,164");
  ctx.save();
  ctx.globalAlpha = capIn * 0.85;
  ctx.font = font(400, 34, a.fonts.display);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(shot.line, 120, H - 190 + (1 - capIn) * 14);
  ctx.restore();

  // Shot counter pips on the right.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === idx ? shot.accent : "rgba(255,255,255,0.25)";
    ctx.fillRect(W - 152 - (2 - i) * 44, H - 238, i === idx ? 32 : 20, 3);
  }
}

/* ───────────────────────── 03 · THE SYSTEM (5–8s) ───────────────────────── */

const LEVELS: [string, number][] = [
  ["Beginner", 0],
  ["Warm-Up", 75],
  ["Getting Strong", 200],
  ["Committed", 400],
  ["Dedicated", 700],
  ["Athlete", 1100],
  ["Advanced", 1600],
  ["Elite", 2200],
  ["Champion", 3000],
  ["Legend", 4000],
];

const BADGES = [
  { name: "Iron Will", icon: "dumbbell" },
  { name: "Fuel Master", icon: "drop" },
  { name: "Endurance Engine", icon: "pulse" },
  { name: "Bendy", icon: "arc" },
  { name: "Rest Day Pro", icon: "moon" },
  { name: "Consistency", icon: "flame" },
] as const;

function drawIcon(ctx: Ctx, kind: (typeof BADGES)[number]["icon"], x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.09;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  switch (kind) {
    case "dumbbell":
      ctx.roundRect(-s * 0.46, -s * 0.2, s * 0.16, s * 0.4, s * 0.04);
      ctx.roundRect(s * 0.3, -s * 0.2, s * 0.16, s * 0.4, s * 0.04);
      ctx.fill();
      ctx.fillRect(-s * 0.3, -s * 0.05, s * 0.6, s * 0.1);
      break;
    case "drop":
      ctx.moveTo(0, -s * 0.42);
      ctx.bezierCurveTo(s * 0.34, -s * 0.02, s * 0.34, s * 0.38, 0, s * 0.38);
      ctx.bezierCurveTo(-s * 0.34, s * 0.38, -s * 0.34, -s * 0.02, 0, -s * 0.42);
      ctx.stroke();
      break;
    case "pulse":
      ctx.moveTo(-s * 0.46, 0);
      ctx.lineTo(-s * 0.18, 0);
      ctx.lineTo(-s * 0.06, -s * 0.34);
      ctx.lineTo(s * 0.08, s * 0.3);
      ctx.lineTo(s * 0.2, 0);
      ctx.lineTo(s * 0.46, 0);
      ctx.stroke();
      break;
    case "arc":
      ctx.arc(0, s * 0.12, s * 0.36, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -s * 0.3, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "moon":
      ctx.arc(0, 0, s * 0.36, Math.PI * 0.3, Math.PI * 1.7);
      ctx.quadraticCurveTo(-s * 0.08, 0, s * 0.18, s * 0.29);
      ctx.stroke();
      break;
    case "flame":
      ctx.moveTo(0, -s * 0.44);
      ctx.bezierCurveTo(s * 0.38, -s * 0.06, s * 0.34, s * 0.4, 0, s * 0.4);
      ctx.bezierCurveTo(-s * 0.34, s * 0.4, -s * 0.3, s * 0.02, -s * 0.08, -s * 0.12);
      ctx.bezierCurveTo(-s * 0.02, s * 0.06, s * 0.1, -s * 0.2, 0, -s * 0.44);
      ctx.fill();
      break;
  }
  ctx.restore();
}

export function drawSystem(ctx: Ctx, t: number, a: FilmAssets) {
  const l = t - 5;
  const blow = prog(t, 7.7, 0.3, ease.inExpo);
  fillInk(ctx, 0.9 + blow);

  ctx.save();
  ctx.translate(CX, CY);
  const zs = 1 + blow * 2.2 + (1 - prog(l, 0, 0.5, ease.outExpo)) * -0.25;
  ctx.scale(zs, zs);
  ctx.globalAlpha = 1 - blow;

  // Outer bezel: 120 ticks sweeping in.
  const sweep = prog(l, 0, 0.7, ease.outCubic);
  const rot = t * 0.12;
  for (let i = 0; i < 120; i++) {
    const f = i / 120;
    if (f > sweep) break;
    const ang = rot + f * Math.PI * 2 - Math.PI / 2;
    const major = i % 10 === 0;
    const r0 = major ? 372 : 384;
    const r1 = 400;
    ctx.strokeStyle = major ? "rgba(243,217,164,0.8)" : "rgba(201,169,110,0.35)";
    ctx.lineWidth = major ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
    ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    ctx.stroke();
  }

  // Counter-rotating dashed inner ring.
  ctx.save();
  ctx.rotate(-t * 0.35);
  ctx.setLineDash([4, 14]);
  ctx.strokeStyle = `rgba(201,169,110,${0.35 * sweep})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 268, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // XP progress arc.
  const xpP = prog(l, 0.2, 2.1, ease.inOutCubic);
  const xp = Math.round(4000 * xpP);
  const trackR = 330;
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(0, 0, trackR, 0, Math.PI * 2);
  ctx.stroke();
  if (xpP > 0) {
    const end = -Math.PI / 2 + xpP * Math.PI * 2;
    const grad = ctx.createConicGradient(-Math.PI / 2, 0, 0);
    grad.addColorStop(0, GOLD_DEEP);
    grad.addColorStop(0.7, GOLD);
    grad.addColorStop(1, GOLD_HOT);
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(0, 0, trackR, -Math.PI / 2, end);
    ctx.stroke();
    ctx.restore();
    const hx = Math.cos(end) * trackR;
    const hy = Math.sin(end) * trackR;
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 46);
    g.addColorStop(0, "rgba(255,245,225,1)");
    g.addColorStop(1, "rgba(243,217,164,0)");
    ctx.fillStyle = g;
    ctx.fillRect(hx - 46, hy - 46, 92, 92);
  }

  // Center readout.
  const inC = prog(l, 0.1, 0.4, ease.outCubic);
  ctx.globalAlpha = (1 - blow) * inC;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font(500, 20, a.fonts.mono);
  ctx.letterSpacing = "8px";
  ctx.fillStyle = "rgba(243,217,164,0.7)";
  ctx.fillText("TOTAL XP", 4, -118);
  ctx.font = font(500, 150, a.fonts.mono);
  ctx.letterSpacing = "-4px";
  ctx.fillStyle = "#fff";
  ctx.fillText(xp.toLocaleString("en-US"), 0, -20);

  let li = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i][1]) li = i;
  // Time the level flipped, to animate the swap.
  const flipAt = 0.2 + 2.1 * invLerpInOutCubic(LEVELS[li][1] / 4000);
  const flip = li === 0 ? 1 : prog(l, flipAt, 0.18, ease.outCubic);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-400, 60, 800, 90);
  ctx.clip();
  ctx.font = font(600, 64, a.fonts.display);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = li === LEVELS.length - 1 ? GOLD_HOT : "#fff";
  ctx.fillText(LEVELS[li][0], 0, 104 + (1 - flip) * 60);
  if (li > 0 && flip < 1) {
    ctx.globalAlpha *= 1 - flip;
    ctx.fillStyle = "#fff";
    ctx.fillText(LEVELS[li - 1][0], 0, 104 - flip * 60);
  }
  ctx.restore();
  ctx.font = font(500, 16, a.fonts.mono);
  ctx.letterSpacing = "6px";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText(`LEVEL ${String(li + 1).padStart(2, "0")} / 10`, 3, 172);
  ctx.restore();

  // Orbiting badges, popping on eighth notes.
  BADGES.forEach((badge, i) => {
    const at = 5.75 + i * BEAT * 0.5;
    const p = prog(t, at, 0.35, ease.outBack);
    if (p <= 0) return;
    const ang = Math.PI * (1 / 6 + i / 3) - Math.PI / 2 + t * 0.06 + Math.PI / 6;
    const bx = CX + Math.cos(ang) * 610 * (1 + blow * 1.6);
    const by = CY + Math.sin(ang) * 395 * (1 + blow * 1.6);
    ctx.save();
    ctx.globalAlpha = clamp(p) * (1 - blow);
    ctx.translate(bx, by);
    ctx.scale(p, p);
    ctx.fillStyle = "rgba(23,20,15,0.95)";
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(201,169,110,0.55)";
    ctx.shadowBlur = 28 * Math.exp(-(t - at) * 3) + 8;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    drawIcon(ctx, badge.icon, 0, 0, 46, GOLD_HOT);
    // Shimmer sweep across the disc.
    const sh = prog(t, at + 0.05, 0.4);
    if (sh > 0 && sh < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.clip();
      const sx = lerp(-90, 90, sh);
      const sg = ctx.createLinearGradient(sx - 30, -48, sx + 30, 48);
      sg.addColorStop(0, "rgba(255,255,255,0)");
      sg.addColorStop(0.5, "rgba(255,255,255,0.55)");
      sg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(-48, -48, 96, 96);
      ctx.restore();
    }
    ctx.font = font(500, 19, a.fonts.sans);
    ctx.letterSpacing = "1px";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(badge.name, 0, 84);
    ctx.restore();
  });

  // Side statement.
  const lines = ["EVERY REP.", "COUNTED."];
  lines.forEach((txt, i) => {
    const p = prog(l, 0.15 + i * 0.25, 0.5, ease.outExpo) * (1 - blow);
    if (p <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(110, 236 + i * 78 - 60, 700, 80);
    ctx.clip();
    ctx.font = font(700, 68, a.fonts.sans);
    ctx.letterSpacing = "-2px";
    ctx.fillStyle = i === 1 ? GOLD : "#fff";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(txt, 120, 236 + i * 78 + (1 - p) * 80);
    ctx.restore();
  });

  // Streak counter top-right.
  const sIn = prog(l, 0.5, 0.4, ease.outCubic) * (1 - blow);
  if (sIn > 0) {
    const days = Math.round(30 * prog(l, 0.6, 1.8, ease.outCubic));
    ctx.save();
    ctx.globalAlpha = sIn;
    drawIcon(ctx, "flame", W - 330, 226, 54, "#E0A050");
    ctx.font = font(500, 60, a.fonts.mono);
    ctx.letterSpacing = "-2px";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(String(days).padStart(2, "0"), W - 290, 228);
    ctx.restore();
    microLabel(ctx, a, "DAY STREAK", W - 290, 284, 0.55 * sIn, "left", 16);
  }
}

function invLerpInOutCubic(y: number) {
  // Inverse of ease.inOutCubic, used to find when the XP counter crossed a level.
  if (y <= 0) return 0;
  if (y >= 1) return 1;
  return y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt(2 * (1 - y)) / 2;
}

/* ───────────────────────── 04 · THE COACH (8–11s) ───────────────────────── */

const PLAN = [
  ["MON", "Push", "Press · dips · triceps"],
  ["TUE", "Pull", "Rows · chin-ups · curls"],
  ["THU", "Legs", "Squat · RDL · walking lunge"],
  ["SAT", "Engine", "Sled pushes + 6×1′ intervals"],
];

export function drawCoach(ctx: Ctx, t: number, a: FilmAssets) {
  const l = t - 8;
  const out = prog(t, 10.75, 0.25, ease.inExpo);

  // Background: blurred gym plate, slow push.
  ctx.save();
  const bz = 1.04 + l * 0.02 + out * 0.3;
  ctx.translate(CX, CY);
  ctx.scale(bz, bz);
  ctx.translate(-CX, -CY);
  ctx.drawImage(a.gymBlur, 0, 0);
  ctx.restore();
  const shade = ctx.createLinearGradient(0, 0, W, 0);
  shade.addColorStop(0, "rgba(10,9,8,0.92)");
  shade.addColorStop(0.5, "rgba(10,9,8,0.55)");
  shade.addColorStop(1, "rgba(10,9,8,0.7)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  // Left headline.
  const heads = ["A coach that", "answers in", "seconds."];
  heads.forEach((txt, i) => {
    const p = prog(l, 0.1 + i * 0.12, 0.6, ease.outExpo) * (1 - out);
    if (p <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(120, 250 + i * 112 - 100, 900, 130);
    ctx.clip();
    ctx.font = font(600, 104, a.fonts.display);
    ctx.letterSpacing = "-3px";
    ctx.fillStyle = i === 2 ? GOLD : "#fff";
    ctx.fillText(txt, 130, 250 + i * 112 + (1 - p) * 120);
    ctx.restore();
  });
  const pills = ["TRAINING", "NUTRITION", "RECOVERY", "MOBILITY"];
  ctx.save();
  ctx.font = font(500, 17, a.fonts.mono);
  ctx.letterSpacing = "4px";
  let px = 132;
  pills.forEach((p, i) => {
    const pi = prog(l, 0.6 + i * 0.1, 0.4, ease.outCubic) * (1 - out);
    const w = ctx.measureText(p).width + 40;
    ctx.globalAlpha = pi;
    ctx.strokeStyle = "rgba(201,169,110,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px, 620 + (1 - pi) * 16, w, 46, 23);
    ctx.stroke();
    ctx.fillStyle = "rgba(243,217,164,0.9)";
    ctx.textBaseline = "middle";
    ctx.fillText(p, px + 22, 644 + (1 - pi) * 16);
    px += w + 14;
  });
  ctx.restore();
  const stat = prog(l, 1.3, 0.5, ease.outCubic) * (1 - out);
  if (stat > 0) {
    ctx.save();
    ctx.globalAlpha = stat;
    ctx.font = font(500, 64, a.fonts.mono);
    ctx.fillStyle = "#fff";
    ctx.letterSpacing = "-2px";
    ctx.fillText(`${(lerp(9.9, 1.8, prog(l, 1.3, 1.2, ease.outCubic))).toFixed(1)}s`, 130, 800);
    ctx.restore();
    microLabel(ctx, a, "AVERAGE TIME TO A FULL PLAN", 134, 850, 0.55 * stat, "left", 16);
  }

  // Chat card.
  const cardIn = prog(l, 0, 0.55, ease.outExpo);
  const cx = 1060;
  const cw = 700;
  const cy0 = 120 + (1 - cardIn) * 160 + Math.sin(t * 1.6) * 6;
  const ch = 840;
  ctx.save();
  ctx.globalAlpha = cardIn * (1 - out);
  ctx.translate(cx + cw / 2, cy0 + ch / 2);
  ctx.rotate((-2.2 + (1 - cardIn) * 6) * (Math.PI / 180));
  ctx.scale(1 + out * 0.4, 1 + out * 0.4);
  ctx.translate(-cw / 2, -ch / 2);

  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 80;
  ctx.shadowOffsetY = 30;
  ctx.fillStyle = "rgba(20,18,15,0.94)";
  ctx.beginPath();
  ctx.roundRect(0, 0, cw, ch, 44);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(201,169,110,0.28)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header.
  drawMark(ctx, 36, 30, 56);
  ctx.font = font(600, 30, a.fonts.display);
  ctx.fillStyle = "#fff";
  ctx.letterSpacing = "0px";
  ctx.textBaseline = "middle";
  ctx.fillText("FitCoach", 110, 50);
  ctx.fillStyle = "#6FBF8A";
  ctx.beginPath();
  ctx.arc(116, 78, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = font(400, 17, a.fonts.sans);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("Online · replies instantly", 130, 79);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, 116, cw, 1);

  // User bubble.
  const u = prog(l, 0.45, 0.35, ease.outBack);
  if (u > 0) {
    ctx.save();
    const msg = "Build me a 4-day split. 45 minutes max.";
    ctx.font = font(500, 24, a.fonts.sans);
    const bw = ctx.measureText(msg).width + 52;
    ctx.translate(cw - 32 - bw, 150);
    ctx.globalAlpha *= clamp(u);
    ctx.translate(bw, 34);
    ctx.scale(u, u);
    ctx.translate(-bw, -34);
    const bg = ctx.createLinearGradient(0, 0, bw, 68);
    bg.addColorStop(0, GOLD);
    bg.addColorStop(1, GOLD_DEEP);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, bw, 68, [28, 28, 8, 28]);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(msg, 26, 35);
    ctx.restore();
  }

  // Typing indicator.
  if (l > 0.85 && l < 1.3) {
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.roundRect(32, 250, 110, 56, [28, 28, 28, 8]);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const b = Math.sin((l * 9 - i * 0.7) * Math.PI) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(243,217,164,${0.35 + b * 0.6})`;
      ctx.beginPath();
      ctx.arc(64 + i * 22, 278 - b * 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Streaming coach reply.
  if (l >= 1.3) {
    const full = "Here's your week — built to finish in 45 minutes flat:";
    const chars = Math.floor(full.length * prog(l, 1.3, 0.55));
    ctx.font = font(400, 25, a.fonts.sans);
    const lines = wrapLines(ctx, full.slice(0, Math.max(1, chars)), cw - 130);
    const bh = 32 + lines.length * 36;
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.roundRect(32, 250, cw - 90, bh + (l > 1.6 ? 360 : 0) * prog(l, 1.6, 0.4, ease.outCubic), [28, 28, 28, 8]);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textBaseline = "middle";
    lines.forEach((ln, i) => ctx.fillText(ln, 58, 284 + i * 36));
    if (chars < full.length && Math.floor(l * 8) % 2 === 0) {
      const lastW = ctx.measureText(lines[lines.length - 1]).width;
      ctx.fillStyle = GOLD;
      ctx.fillRect(60 + lastW, 270 + (lines.length - 1) * 36, 3, 28);
    }

    // Plan rows.
    PLAN.forEach(([day, name, detail], i) => {
      const p = prog(l, 1.72 + i * 0.14, 0.4, ease.outExpo);
      if (p <= 0) return;
      const ry = 356 + i * 84;
      ctx.save();
      ctx.globalAlpha *= p;
      ctx.translate((1 - p) * 60, 0);
      ctx.fillStyle = "rgba(10,9,8,0.55)";
      ctx.beginPath();
      ctx.roundRect(56, ry, cw - 138, 70, 16);
      ctx.fill();
      ctx.fillStyle = i === 3 ? TEAL : GOLD;
      ctx.fillRect(56, ry + 16, 4, 38);
      ctx.font = font(500, 17, a.fonts.mono);
      ctx.letterSpacing = "3px";
      ctx.fillStyle = "rgba(243,217,164,0.85)";
      ctx.fillText(day, 82, ry + 36);
      ctx.letterSpacing = "0px";
      ctx.font = font(700, 25, a.fonts.sans);
      ctx.fillStyle = "#fff";
      ctx.fillText(name, 150, ry + 36);
      ctx.font = font(400, 21, a.fonts.sans);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(detail, 262, ry + 37);
      ctx.restore();
    });
  }

  // XP toast.
  const toast = prog(l, 2.4, 0.4, ease.outBack);
  if (toast > 0) {
    ctx.save();
    ctx.globalAlpha *= clamp(toast);
    ctx.translate(cw / 2, ch - 90 + (1 - toast) * 40);
    ctx.fillStyle = "rgba(201,169,110,0.14)";
    ctx.strokeStyle = "rgba(201,169,110,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-230, -34, 460, 68, 34);
    ctx.fill();
    ctx.stroke();
    drawIcon(ctx, "dumbbell", -186, 0, 34, GOLD_HOT);
    ctx.font = font(700, 23, a.fonts.sans);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("Iron Will unlocked", -152, 1);
    ctx.font = font(500, 21, a.fonts.mono);
    ctx.fillStyle = GOLD_HOT;
    ctx.textAlign = "right";
    ctx.fillText("+25 XP", 204, 1);
    ctx.restore();
  }
  ctx.restore();
}

/* ─────────────────────── 05 · WARP (11–13s) & particles ─────────────────────── */

const STAR_COUNT = 2600;
const stars = (() => {
  const r = rng(7);
  const out = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const ang = r() * Math.PI * 2;
    const rad = 0.08 + Math.pow(r(), 0.7) * 1.9;
    out[i * 3] = Math.cos(ang) * rad * 1.5;
    out[i * 3 + 1] = Math.sin(ang) * rad;
    out[i * 3 + 2] = r();
  }
  return out;
})();

/** Distance travelled through the starfield by time t (integral of the speed ramp). */
function travel(t: number) {
  const d = Math.max(0, t - 10.8);
  const warpEnd = 13 - 10.8;
  if (t <= 13) return 0.22 * d + 0.2 * d * d * d;
  // After 13s the field decelerates exponentially.
  const base = 0.22 * warpEnd + 0.2 * warpEnd * warpEnd * warpEnd;
  const v0 = 0.22 + 0.6 * warpEnd * warpEnd;
  const k = 5;
  return base + (v0 / k) * (1 - Math.exp(-k * (t - 13)));
}

function speed(t: number) {
  return (travel(t + 0.004) - travel(t - 0.004)) / 0.008;
}

const FOCAL = 520;

function starScreen(i: number, t: number, zOffset = 0): [number, number, number] {
  const x = stars[i * 3];
  const y = stars[i * 3 + 1];
  const z = 0.04 + fract(stars[i * 3 + 2] - travel(t) * 0.55) * 1.2 + zOffset;
  return [CX + (x / z) * FOCAL, CY + (y / z) * FOCAL, z];
}

function drawStarfield(ctx: Ctx, t: number, alpha: number, skip = 0) {
  const v = speed(t);
  const trail = Math.min(0.5, 0.012 + v * 0.1);
  ctx.save();
  ctx.lineCap = "round";
  for (let i = skip; i < STAR_COUNT; i++) {
    const [sx, sy, z] = starScreen(i, t);
    const [ex, ey, z2] = starScreen(i, t, trail);
    if (z2 < z) continue;
    if (sx < -200 || sx > W + 200 || sy < -200 || sy > H + 200) continue;
    const bright = clamp((1.3 - z) / 1.2) * alpha;
    if (bright <= 0.02) continue;
    ctx.strokeStyle = z < 0.35 ? `rgba(255,244,222,${bright})` : `rgba(201,169,110,${bright * 0.8})`;
    ctx.lineWidth = clamp(2.8 / (z * 2.2), 0.6, 4.5);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(sx, sy);
    ctx.stroke();
  }
  ctx.restore();
}

const WARP_WORDS: { text: string; at: number; gold?: boolean; size: number }[] = [
  { text: "NO EXCUSES.", at: 11, size: 200 },
  { text: "NO GUESSWORK.", at: 11.5, size: 188 },
  { text: "JUST", at: 12, size: 240 },
  { text: "RESULTS.", at: 12.5, size: 280, gold: true },
];

export function drawWarp(ctx: Ctx, t: number, a: FilmAssets) {
  fillInk(ctx, 0.4);
  const tunnel = ctx.createRadialGradient(CX, CY, 0, CX, CY, 900);
  const hot = prog(t, 12.6, 0.4, ease.inCubic);
  tunnel.addColorStop(0, `rgba(243,217,164,${0.08 + hot * 0.5})`);
  tunnel.addColorStop(0.4, "rgba(159,125,85,0.06)");
  tunnel.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = tunnel;
  ctx.fillRect(0, 0, W, H);

  drawStarfield(ctx, t, prog(t, 11, 0.2));

  const word = [...WARP_WORDS].reverse().find((w) => t >= w.at);
  if (!word) return;
  const l = t - word.at;
  const p = prog(l, 0, 0.16, ease.outExpo);
  const s = lerp(1.35, 1, p) + l * 0.06;
  const split = 26 * Math.exp(-l * 9) + 3;
  ctx.save();
  ctx.translate(CX, CY);
  ctx.scale(s, s);
  ctx.font = font(700, word.size, a.fonts.sans);
  ctx.letterSpacing = `${-word.size * 0.04}px`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = clamp(l / 0.04);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(255,60,60,0.55)";
  ctx.fillText(word.text, -split, 0);
  ctx.fillStyle = "rgba(60,220,255,0.45)";
  ctx.fillText(word.text, split, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = word.gold ? GOLD_HOT : "#fff";
  ctx.shadowColor = word.gold ? GOLD : "rgba(255,255,255,0.4)";
  ctx.shadowBlur = word.gold ? 50 : 20;
  ctx.fillText(word.text, 0, 0);
  ctx.restore();
}

/* ───────────────────────── 06 · RESOLVE (13–15s) ───────────────────────── */

const SNAP = 13.9;

export function drawResolve(ctx: Ctx, t: number, a: FilmAssets) {
  const { logo } = a;
  fillInk(ctx, 0.7);

  const n = a.logoPoints.length / 2;
  const snapped = prog(t, SNAP, 0.12, ease.outCubic);

  // Remaining field decelerates and dissolves.
  drawStarfield(ctx, t, 1 - prog(t, 13, 0.7), n);

  // Particles: warp positions at 13.0 → logo sample points.
  const partAlpha = 1 - prog(t, SNAP + 0.05, 0.4);
  if (partAlpha > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const [sx0, sy0] = starScreen(i, 13);
      const sx = clamp(sx0, -300, W + 300);
      const sy = clamp(sy0, -300, H + 300);
      const tx = a.logoPoints[i * 2];
      const ty = a.logoPoints[i * 2 + 1];
      const delay = (hash(i) * 0.5 + 0.5) * 0.22;
      const p = prog(t, 13 + delay, SNAP - 13 - delay, ease.inOutCubic);
      const pPrev = prog(t - 1 / 30, 13 + delay, SNAP - 13 - delay, ease.inOutCubic);
      // Curved flight: bow each path sideways.
      const bow = Math.sin(Math.PI * p) * 140 * hash(i * 3.1);
      const bowPrev = Math.sin(Math.PI * pPrev) * 140 * hash(i * 3.1);
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const x = lerp(sx, tx, p) + nx * bow;
      const y = lerp(sy, ty, p) + ny * bow;
      let xp = lerp(sx, tx, pPrev) + nx * bowPrev;
      let yp = lerp(sy, ty, pPrev) + ny * bowPrev;
      const tl = Math.hypot(x - xp, y - yp);
      if (tl > 34) {
        xp = x + ((xp - x) / tl) * 34;
        yp = y + ((yp - y) / tl) * 34;
      }
      const settle = p >= 1 ? 1 : 0;
      const sparkle = settle ? 0.5 + 0.5 * Math.sin(t * 40 + i) : 1;
      ctx.strokeStyle = `rgba(243,217,164,${0.7 * partAlpha * sparkle})`;
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(xp, yp);
      ctx.lineTo(x + 0.01, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Shockwave from the lockup at the snap.
  const sw = prog(t, SNAP, 0.8, ease.outCubic);
  if (sw > 0 && sw < 1) {
    ctx.save();
    ctx.strokeStyle = `rgba(243,217,164,${0.6 * (1 - sw)})`;
    ctx.lineWidth = 3 + 10 * (1 - sw);
    ctx.beginPath();
    ctx.ellipse(CX, logo.textY, 200 + sw * 1100, 80 + sw * 520, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (snapped > 0) {
    // Soft bloom behind the lockup.
    const bloom = ctx.createRadialGradient(CX, logo.textY, 0, CX, logo.textY, 700);
    bloom.addColorStop(0, `rgba(201,169,110,${0.22 * snapped})`);
    bloom.addColorStop(1, "rgba(201,169,110,0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, W, H);

    drawMark(ctx, logo.markX, logo.markY, logo.markSize, snapped);

    // Wordmark with a travelling light sweep.
    const sweep = prog(t, 14.05, 0.75, ease.inOutCubic);
    const left = logo.textX;
    const right = logo.textX + 780;
    const bx = lerp(left - 300, right + 300, sweep);
    const g = ctx.createLinearGradient(bx - 220, 0, bx + 220, 0);
    g.addColorStop(0, "#FFFFFF");
    g.addColorStop(0.5, sweep > 0 && sweep < 1 ? GOLD_HOT : "#FFFFFF");
    g.addColorStop(1, "#FFFFFF");
    ctx.save();
    ctx.globalAlpha = snapped;
    drawWordmark(ctx, a.fonts, logo, g);
    ctx.restore();

    // Sheen over the mark.
    if (sweep > 0 && sweep < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(logo.markX, logo.markY, logo.markSize, logo.markSize, logo.markSize * 0.26);
      ctx.clip();
      const mx = lerp(logo.markX - 200, logo.markX + logo.markSize + 200, clamp(sweep * 1.6));
      const mg = ctx.createLinearGradient(mx - 60, logo.markY, mx + 60, logo.markY + logo.markSize);
      mg.addColorStop(0, "rgba(255,255,255,0)");
      mg.addColorStop(0.5, "rgba(255,255,255,0.5)");
      mg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = mg;
      ctx.fillRect(logo.markX, logo.markY, logo.markSize, logo.markSize);
      ctx.restore();
    }

    // Hairline + tagline.
    const hl = prog(t, 14.1, 0.5, ease.outExpo);
    const lineY = logo.markY + logo.markSize + 86;
    ctx.fillStyle = `rgba(201,169,110,${0.8 * hl})`;
    ctx.fillRect(CX - 260 * hl, lineY, 520 * hl, 1.5);
    const tg = prog(t, 14.2, 0.5, ease.outCubic);
    ctx.save();
    ctx.globalAlpha = tg;
    ctx.font = font(500, 30, a.fonts.sans);
    ctx.letterSpacing = "12px";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("TRAIN SMARTER · STARTING NOW", CX + 6, lineY + 58 + (1 - tg) * 14);
    ctx.restore();
    microLabel(ctx, a, "YOUR AI FITNESS COACH", CX, lineY + 120, 0.45 * prog(t, 14.35, 0.4), "center", 16, "243,217,164");
  }
}

export const SCENE_DRAWERS: Record<string, (ctx: Ctx, t: number, a: FilmAssets) => void> = {
  ignition: drawIgnition,
  slams: drawSlams,
  system: drawSystem,
  coach: drawCoach,
  warp: drawWarp,
  resolve: drawResolve,
};

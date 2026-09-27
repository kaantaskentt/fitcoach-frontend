import type { FilmAssets } from "./assets";
import {
  DURATION,
  FPS,
  H,
  IMPACTS,
  W,
  clamp,
  hash,
  impactEnergy,
  noise1,
  prog,
  sceneAt,
  SCENES,
  timecode,
  type Ctx,
} from "./core";
import { SCENE_DRAWERS } from "./scenes";

/** Hard cuts that get a white flash frame and RGB glitch slicing. */
const CUTS = new Set([2, 3, 4, 5, 8, 11, 12.5, 13.9]);

function glitch(ctx: Ctx, a: FilmAssets, t: number, amount: number) {
  if (amount < 0.02) return;
  const b = a.buffer.getContext("2d")!;
  b.globalCompositeOperation = "copy";
  b.drawImage(ctx.canvas, 0, 0);
  b.globalCompositeOperation = "source-over";
  const seed = Math.floor(t * FPS);
  const slices = 7;
  for (let i = 0; i < slices; i++) {
    const y = Math.floor((hash(seed * 13 + i) * 0.5 + 0.5) * H);
    const h = 6 + Math.floor((hash(seed * 7 + i * 3) * 0.5 + 0.5) * 70);
    const dx = hash(seed * 3 + i * 11) * 90 * amount;
    ctx.drawImage(a.buffer, 0, y, W, h, dx, y, W, h);
  }
  // Colour fringe: offset tinted copies.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.28 * amount;
  ctx.drawImage(a.buffer, 14 * amount, 0);
  ctx.globalAlpha = 0.22 * amount;
  ctx.drawImage(a.buffer, -14 * amount, 0);
  ctx.restore();
}

function hud(ctx: Ctx, a: FilmAssets, t: number) {
  const alpha = prog(t, 0.2, 0.4) * (1 - prog(t, 13.4, 0.4));
  if (alpha <= 0) return;
  const m = 56;
  const arm = 34;
  ctx.save();
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = "rgba(243,217,164,0.9)";
  ctx.lineWidth = 2;
  const corners: [number, number, number, number][] = [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y + arm * sy);
    ctx.lineTo(x, y);
    ctx.lineTo(x + arm * sx, y);
    ctx.stroke();
  }
  ctx.font = `500 15px ${a.fonts.mono}`;
  ctx.letterSpacing = "4px";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.textBaseline = "middle";
  const scene = sceneAt(t);
  const idx = SCENES.indexOf(scene) + 1;
  ctx.fillText("FITCOACH — FILM 01", m + 20, m + 50);
  ctx.textAlign = "right";
  ctx.fillText(`${String(idx).padStart(2, "0")} / ${scene.label.toUpperCase()}`, W - m - 20, m + 50);
  ctx.fillText("120 BPM · 1920×1080 · 30P", W - m - 20, H - m - 50);
  ctx.textAlign = "left";
  // Recording dot blinks on the beat.
  const beatPulse = Math.exp(-((t * 2) % 1) * 5);
  ctx.fillStyle = `rgba(214,92,76,${0.5 + 0.5 * beatPulse})`;
  ctx.beginPath();
  ctx.arc(m + 26, H - m - 50, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(timecode(t), m + 44, H - m - 50);
  // Progress hairline.
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(m + 20, H - m - 22, 260, 2);
  ctx.fillStyle = "rgba(243,217,164,0.9)";
  ctx.fillRect(m + 20, H - m - 22, 260 * clamp(t / DURATION), 2);
  ctx.restore();
}

function grainAndVignette(ctx: Ctx, a: FilmAssets, t: number) {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  const tile = a.grain[Math.floor(t * FPS) % a.grain.length];
  const pat = ctx.createPattern(tile, "repeat");
  if (pat) {
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/** Render one frame of the film at time `t` (seconds). Pure w.r.t. `t`. */
export function renderFrame(ctx: Ctx, a: FilmAssets, rawT: number) {
  const t = clamp(rawT, 0, DURATION - 1e-4);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.clearRect(0, 0, W, H);

  // Camera: shake + zoom punch driven by impact energy.
  const e = impactEnergy(t, 9);
  const shakeX = noise1(t * 38) * 16 * e;
  const shakeY = noise1(t * 41 + 50) * 12 * e;
  const punch = 1 + 0.025 * e;
  ctx.save();
  ctx.translate(W / 2 + shakeX, H / 2 + shakeY);
  ctx.scale(punch, punch);
  ctx.rotate(noise1(t * 17 + 9) * 0.004 * e);
  ctx.translate(-W / 2, -H / 2);
  const scene = sceneAt(t);
  SCENE_DRAWERS[scene.id](ctx, t, a);
  ctx.restore();

  // Glitch right on the cuts.
  let g = 0;
  for (const c of CUTS) if (t >= c && t < c + 0.12) g = Math.max(g, 1 - (t - c) / 0.12);
  glitch(ctx, a, t, g);

  grainAndVignette(ctx, a, t);
  hud(ctx, a, t);

  // Flash frames on cuts.
  let flash = 0;
  for (const c of IMPACTS) {
    if (!CUTS.has(c) || t < c) continue;
    const strength = c === 2 || c === 13.9 ? 0.95 : 0.45;
    flash = Math.max(flash, strength * Math.exp(-(t - c) * 22));
  }
  if (flash > 0.01) {
    ctx.fillStyle = `rgba(255,247,232,${flash})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Fade in from / out to black so the film loops seamlessly.
  const black = Math.max(1 - prog(t, 0, 0.18), prog(t, 14.72, 0.28));
  if (black > 0) {
    ctx.fillStyle = `rgba(0,0,0,${black})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

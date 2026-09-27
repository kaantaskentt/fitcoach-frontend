import { GOLD, GOLD_DEEP, H, W, rng } from "./core";

export interface Fonts {
  display: string;
  sans: string;
  mono: string;
}

export interface LogoLayout {
  markX: number;
  markY: number;
  markSize: number;
  textX: number;
  textY: number;
  textSize: number;
}

export interface FilmAssets {
  plates: {
    gym: HTMLImageElement;
    stretch: HTMLImageElement;
    dumbbell: HTMLImageElement;
    pool: HTMLImageElement;
  };
  fonts: Fonts;
  grain: HTMLCanvasElement[];
  /** Points sampled from the final logo lockup — the particles' destination. */
  logoPoints: Float32Array;
  logo: LogoLayout;
  /** Scratch buffer used for glitch slicing and image-in-type. */
  buffer: HTMLCanvasElement;
  /** Gym plate pre-blurred once so the coach scene stays cheap per frame. */
  gymBlur: HTMLCanvasElement;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function cssFamily(varName: string, fallback: string) {
  const v = getComputedStyle(document.body).getPropertyValue(varName).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function makeGrain(seed: number, size = 384) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const data = g.createImageData(size, size);
  const r = rng(seed);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(r() * 255);
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  return c;
}

/** The FitCoach mark: gold rounded square with the dumbbell glyph (matches the app). */
export function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const grad = ctx.createLinearGradient(x, y, x + size, y + size);
  grad.addColorStop(0, GOLD);
  grad.addColorStop(1, GOLD_DEEP);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.26);
  ctx.fill();
  // Glyph lives in a 16×16 box, scaled to ~43% of the tile like the app's 24px-in-56px.
  const g = size * 0.43;
  const u = g / 16;
  const ox = x + (size - g) / 2;
  const oy = y + (size - g) / 2;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(ox + 2 * u, oy + 6 * u, 3 * u, 4 * u, 0.75 * u);
  ctx.roundRect(ox + 11 * u, oy + 6 * u, 3 * u, 4 * u, 0.75 * u);
  ctx.roundRect(ox + 5 * u, oy + 7 * u, 6 * u, 2 * u, 0.5 * u);
  ctx.fill();
  ctx.restore();
}

function layoutLogo(fonts: Fonts): LogoLayout {
  const c = document.createElement("canvas").getContext("2d")!;
  const textSize = 176;
  c.font = `600 ${textSize}px ${fonts.display}`;
  const textW = c.measureText("FitCoach").width;
  const markSize = 168;
  const gap = 56;
  const total = markSize + gap + textW;
  const markX = (W - total) / 2;
  const cy = H / 2 - 40;
  return {
    markX,
    markY: cy - markSize / 2,
    markSize,
    textX: markX + markSize + gap,
    textY: cy,
    textSize,
  };
}

export function drawWordmark(ctx: CanvasRenderingContext2D, fonts: Fonts, logo: LogoLayout, fill: string | CanvasGradient) {
  ctx.save();
  ctx.font = `600 ${logo.textSize}px ${fonts.display}`;
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "-3px";
  ctx.fillStyle = fill;
  ctx.fillText("FitCoach", logo.textX, logo.textY + 6);
  ctx.restore();
}

function sampleLogo(fonts: Fonts, logo: LogoLayout): Float32Array {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  drawMark(g, logo.markX, logo.markY, logo.markSize);
  drawWordmark(g, fonts, logo, "#fff");
  const { data } = g.getImageData(0, 0, W, H);
  const pts: number[] = [];
  const step = 5;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      if (data[(y * W + x) * 4 + 3] > 140) pts.push(x, y);
    }
  }
  // Deterministic shuffle, then cap so the effect stays dense but fast.
  const r = rng(99);
  const n = pts.length / 2;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const ax = pts[i * 2], ay = pts[i * 2 + 1];
    pts[i * 2] = pts[j * 2];
    pts[i * 2 + 1] = pts[j * 2 + 1];
    pts[j * 2] = ax;
    pts[j * 2 + 1] = ay;
  }
  return new Float32Array(pts.slice(0, Math.min(n, 3200) * 2));
}

export async function loadFilmAssets(base = "/motion"): Promise<FilmAssets> {
  const fonts: Fonts = {
    display: cssFamily("--font-playfair", "Georgia, serif"),
    sans: cssFamily("--font-dm-sans", "system-ui, sans-serif"),
    mono: cssFamily("--font-jetbrains", "ui-monospace, monospace"),
  };
  await Promise.all([
    document.fonts.load(`600 100px ${fonts.display}`),
    document.fonts.load(`700 100px ${fonts.display}`),
    document.fonts.load(`400 100px ${fonts.display}`),
    document.fonts.load(`700 100px ${fonts.sans}`),
    document.fonts.load(`500 100px ${fonts.sans}`),
    document.fonts.load(`400 100px ${fonts.sans}`),
    document.fonts.load(`500 100px ${fonts.mono}`),
    document.fonts.load(`400 100px ${fonts.mono}`),
  ]).catch(() => undefined);
  await document.fonts.ready;

  const [gym, stretch, dumbbell, pool] = await Promise.all([
    loadImage(`${base}/01_onboarding_bg.jpg`),
    loadImage(`${base}/02_chat_hero.jpg`),
    loadImage(`${base}/03_coach_card.jpg`),
    loadImage(`${base}/04_sidebar_accent.jpg`),
  ]);
  await Promise.all([gym, stretch, dumbbell, pool].map((i) => i.decode().catch(() => undefined)));

  const logo = layoutLogo(fonts);
  const buffer = document.createElement("canvas");
  buffer.width = W;
  buffer.height = H;

  const gymBlur = document.createElement("canvas");
  gymBlur.width = W;
  gymBlur.height = H;
  const gb = gymBlur.getContext("2d")!;
  gb.filter = "blur(16px) brightness(0.55) saturate(1.1)";
  const s = Math.max(W / gym.width, H / gym.height) * 1.08;
  gb.drawImage(gym, (W - gym.width * s) / 2, (H - gym.height * s) / 2, gym.width * s, gym.height * s);

  return {
    plates: { gym, stretch, dumbbell, pool },
    gymBlur,
    fonts,
    grain: Array.from({ length: 6 }, (_, i) => makeGrain(1000 + i)),
    logoPoints: sampleLogo(fonts, logo),
    logo,
    buffer,
  };
}

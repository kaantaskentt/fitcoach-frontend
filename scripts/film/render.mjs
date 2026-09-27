#!/usr/bin/env node
/**
 * Frame-perfect export of Film 01.
 *
 * Drives /motion?capture=1 in headless Chromium, renders all 450 frames through
 * the same engine the live player uses, pipes PNGs into ffmpeg and muxes the
 * synthesized score. Needs: a running app, Playwright + Chromium, ffmpeg.
 *
 *   npm run build && npx next start -p 3200 &
 *   python3 scripts/film/soundtrack.py public/motion/fitcoach-film.wav
 *   node scripts/film/render.mjs --url http://localhost:3200 [--ffmpeg /path/to/ffmpeg]
 */
import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => (cur.startsWith("--") ? [...acc, [cur.slice(2), arr[i + 1]]] : acc), []),
);
const BASE = args.url ?? "http://localhost:3200";
const FFMPEG = args.ffmpeg ?? process.env.FFMPEG ?? "ffmpeg";
const OUT_DIR = path.resolve(args.out ?? "public/motion");
const WAV = path.join(OUT_DIR, "fitcoach-film.wav");

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require("playwright");
  } catch {
    const globalRoot = execSync("npm root -g").toString().trim();
    return require(path.join(globalRoot, "playwright"));
  }
}

function run(cmd, argv, stdin) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: [stdin ? "pipe" : "ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`))));
    if (stdin) stdin(p.stdin);
  });
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--disable-gpu-vsync"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.goto(`${BASE}/motion?capture=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.filmReady === "1", null, { timeout: 60000 });
const { duration, fps } = await page.evaluate(() => ({ duration: window.__film.duration, fps: window.__film.fps }));
const total = Math.round(duration * fps);

const silent = path.join(OUT_DIR, "fitcoach-film.silent.mp4");
const started = Date.now();
await run(
  FFMPEG,
  ["-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-tune", "film", "-movflags", "+faststart", silent],
  async (stdin) => {
    for (let i = 0; i < total; i++) {
      const b64 = await page.evaluate((t) => {
        window.__film.renderAt(t);
        return document.querySelector("canvas").toDataURL("image/png").split(",")[1];
      }, i / fps);
      if (!stdin.write(Buffer.from(b64, "base64"))) await new Promise((r) => stdin.once("drain", r));
      if (i % 30 === 0) process.stdout.write(`\rframe ${i + 1}/${total}`);
    }
    stdin.end();
  },
);
process.stdout.write(`\rrendered ${total} frames in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);

// Poster from the logo resolve.
const posterB64 = await page.evaluate(() => {
  window.__film.renderAt(14.45);
  return document.querySelector("canvas").toDataURL("image/jpeg", 0.9).split(",")[1];
});
await browser.close();
const { writeFileSync } = await import("node:fs");
writeFileSync(path.join(OUT_DIR, "fitcoach-film-poster.jpg"), Buffer.from(posterB64, "base64"));

if (!existsSync(WAV)) throw new Error(`Missing ${WAV} — run scripts/film/soundtrack.py first`);
await run(FFMPEG, ["-y", "-i", silent, "-i", WAV, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", path.join(OUT_DIR, "fitcoach-film.mp4")]);
await run(FFMPEG, ["-y", "-i", WAV, "-c:a", "aac", "-b:a", "192k", path.join(OUT_DIR, "fitcoach-film.m4a")]);
rmSync(silent);
console.log(`wrote ${path.join(OUT_DIR, "fitcoach-film.mp4")}`);

"use client";

import { useEffect, useRef } from "react";

const BARS = 32;

/** Tiny live spectrum bars driven by an AnalyserNode. */
export function AudioVisualizer({
  analyser,
  on,
  reduced,
}: {
  analyser: AnalyserNode | null;
  on: boolean;
  reduced: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const levels = new Float32Array(BARS);
    const gap = 3;
    const bw = (w - gap * (BARS - 1)) / BARS;
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, "rgba(159,125,85,0.6)");
    grad.addColorStop(1, "rgba(243,225,185,0.95)");

    let raf = 0;
    let frame = 0;
    const draw = () => {
      frame++;
      // Reduced motion: refresh at ~15fps instead of 60.
      if (reduced && frame % 4 !== 0) {
        raf = requestAnimationFrame(draw);
        return;
      }
      if (analyser && bins && on) analyser.getByteFrequencyData(bins);
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < BARS; i++) {
        // Mirror so the spectrum blooms from the centre outwards.
        const dist = Math.abs(i - (BARS - 1) / 2) / (BARS / 2);
        const bin = bins ? Math.min(bins.length - 1, Math.floor(dist * bins.length * 0.7)) : 0;
        const target = on && bins ? Math.pow(bins[bin] / 255, 1.4) : 0;
        levels[i] += (target - levels[i]) * (reduced ? 0.6 : 0.25);
        const bh = Math.max(1.5, levels[i] * h);
        ctx.fillStyle = on ? grad : "rgba(201,169,110,0.22)";
        const x = i * (bw + gap);
        ctx.beginPath();
        ctx.roundRect(x, (h - bh) / 2, bw, bh, 1);
        ctx.fill();
      }
      const settled = !on && levels.every((l) => l < 0.005);
      if (on || !settled) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser, on, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="h-7 w-[184px] transition-opacity duration-500"
      style={{ opacity: on ? 1 : 0.55 }}
    />
  );
}

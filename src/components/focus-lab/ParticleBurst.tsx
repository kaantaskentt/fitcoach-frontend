"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/focus-lab/hooks";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  hue: number;
  spark: boolean;
}

const COLORS = ["#F6E6C2", "#E3C88F", "#C9A96E", "#B8956A", "#9F7D55"];

/**
 * Canvas overlay that emits a gold particle burst each time `trigger`
 * increments. Purely imperative: no React state during the animation.
 */
export function ParticleBurst({
  trigger,
  className = "",
  count = 140,
}: {
  trigger: number;
  className?: string;
  count?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (trigger === 0 || prefersReducedMotion()) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.38;
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1.4 + Math.random() * 4.2;
      const fromRing = Math.random() < 0.65;
      return {
        x: cx + (fromRing ? Math.cos(a) * radius : 0),
        y: cy + (fromRing ? Math.sin(a) * radius : 0),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - (fromRing ? 0.6 : 1.2),
        life: 0,
        max: 60 + Math.random() * 70,
        size: 0.8 + Math.random() * 2.4,
        hue: Math.floor(Math.random() * COLORS.length),
        spark: Math.random() < 0.3,
      };
    });

    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(2.5, (t - last) / 16.67);
      last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      let alive = 0;
      for (const p of particles) {
        if (p.life >= p.max) continue;
        alive++;
        p.life += dt;
        p.vx *= Math.pow(0.975, dt);
        p.vy = p.vy * Math.pow(0.975, dt) + 0.045 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = 1 - p.life / p.max;
        ctx.globalAlpha = Math.max(0, k * k);
        ctx.fillStyle = COLORS[p.hue];
        if (p.spark) {
          ctx.strokeStyle = COLORS[p.hue];
          ctx.lineWidth = p.size * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.6 + k * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (alive > 0) raf = requestAnimationFrame(step);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, w, h);
    };
  }, [trigger, count]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute ${className || "inset-0 h-full w-full"}`}
    />
  );
}

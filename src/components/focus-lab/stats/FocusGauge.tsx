"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/focus-lab/hooks";
import type { ScoreComponent } from "@/lib/focus-lab/score";
import { MicroLabel } from "../ui";

const SIZE = 300;
const C = SIZE / 2;
const R = 118;
const SWEEP = 270;
const START = 135; // degrees, measured clockwise from +x axis

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  // Rounded so server (Node) and client (browser) trig results serialize identically.
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return [round(C + r * Math.cos(rad)), round(C + r * Math.sin(rad))];
}

function arcPath(r: number, from: number, to: number): string {
  const [x0, y0] = polar(r, from);
  const [x1, y1] = polar(r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

const ARC_LEN = (2 * Math.PI * R * SWEEP) / 360;

function tier(score: number): string {
  if (score >= 850) return "Locked in";
  if (score >= 650) return "Sharp";
  if (score >= 400) return "Building";
  if (score >= 150) return "Warming up";
  return "Baseline";
}

export function FocusGauge({
  score,
  components,
  active,
  ready,
}: {
  score: number;
  components: ScoreComponent[];
  active: boolean;
  ready: boolean;
}) {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  // Count up/down to the target with an ease-out curve (rAF, no effect setState).
  useEffect(() => {
    if (!active || !ready) return;
    const from = shownRef.current;
    const to = score;
    if (from === to) return;
    if (prefersReducedMotion()) {
      const id = requestAnimationFrame(() => {
        shownRef.current = to;
        setShown(to);
      });
      return () => cancelAnimationFrame(id);
    }
    const dur = 1400;
    let raf = 0;
    let t0 = 0;
    const step = (t: number) => {
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 4);
      const v = Math.round(from + (to - from) * eased);
      shownRef.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score, active, ready]);

  const p = shown / 1000;
  const [hx, hy] = polar(R, START + SWEEP * p);

  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-10">
      <div className="relative w-[min(78vw,300px)] shrink-0">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full overflow-visible" role="img" aria-label={`Focus score ${score} of 1000`}>
          <defs>
            <linearGradient id="fl-gauge-gold" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#9F7D55" />
              <stop offset="60%" stopColor="#C9A96E" />
              <stop offset="100%" stopColor="#F1DDB0" />
            </linearGradient>
            <filter id="fl-gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="fl-gauge-core" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="rgba(201,169,110,0.12)" />
              <stop offset="100%" stopColor="rgba(201,169,110,0)" />
            </radialGradient>
          </defs>
          <circle cx={C} cy={C} r={R - 14} fill="url(#fl-gauge-core)" />
          {Array.from({ length: 41 }, (_, i) => {
            const deg = START + (SWEEP * i) / 40;
            const major = i % 10 === 0;
            const [x0, y0] = polar(R + 12, deg);
            const [x1, y1] = polar(R + (major ? 22 : 17), deg);
            const lit = i / 40 <= p + 1e-6 && p > 0;
            return (
              <line
                key={i}
                x1={x0}
                y1={y0}
                x2={x1}
                y2={y1}
                stroke={lit ? "rgba(227,200,143,0.9)" : major ? "rgba(201,169,110,0.35)" : "rgba(201,169,110,0.16)"}
                strokeWidth={major ? 1.6 : 1}
                strokeLinecap="round"
              />
            );
          })}
          {[0, 250, 500, 750, 1000].map((v) => {
            const [x, y] = polar(R + 36, START + (SWEEP * v) / 1000);
            return (
              <text key={v} x={x} y={y + 3} textAnchor="middle" fontSize="9" fill="#8A8072" className="fl-mono">
                {v}
              </text>
            );
          })}
          <path d={arcPath(R, START, START + SWEEP)} fill="none" stroke="rgba(201,169,110,0.1)" strokeWidth={8} strokeLinecap="round" />
          <path
            d={arcPath(R, START, START + SWEEP)}
            fill="none"
            stroke="url(#fl-gauge-gold)"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={ARC_LEN}
            strokeDashoffset={ARC_LEN * (1 - p)}
            filter="url(#fl-gauge-glow)"
            opacity={p > 0.002 ? 1 : 0}
          />
          {p > 0.002 ? <circle cx={hx} cy={hy} r={5} fill="#FBF0D6" filter="url(#fl-gauge-glow)" /> : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <MicroLabel>Focus score</MicroLabel>
          <p className="fl-mono mt-2 text-[64px] leading-none tracking-[-0.05em] text-[#F3ECDF]" aria-hidden>
            {ready ? shown : "—"}
          </p>
          <p className="fl-serif mt-2 text-[16px] text-[#E3C88F] italic">{ready ? tier(score) : " "}</p>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-3.5">
        {components.map((c) => (
          <li key={c.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[13.5px] text-[#D9CDB8]">{c.label}</span>
              <span className="fl-mono text-[12px] text-[#8A8072]">
                <span className="text-[#EDE6DA]">{ready ? c.points : "—"}</span> / {c.weight}
              </span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-[rgba(201,169,110,0.1)]">
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ease-out ${
                  c.id === "breath" ? "bg-gradient-to-r from-[#3F8F86] to-[#8AD3CA]" : "bg-gradient-to-r from-[#9F7D55] to-[#E3C88F]"
                }`}
                style={{ width: `${ready ? c.ratio * 100 : 0}%` }}
              />
            </div>
            <p className="mt-1 text-[11.5px] text-[#8A8072]">{c.hint}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

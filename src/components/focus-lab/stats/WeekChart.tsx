"use client";

import { useState } from "react";
import type { DayBucket } from "@/lib/focus-lab/score";

const W = 420;
const H = 190;
const PAD_T = 18;
const PAD_B = 26;
const PAD_L = 30;

function niceMax(v: number): number {
  const steps = [30, 60, 90, 120, 180, 240, 300, 480, 600];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 120) * 120;
}

export function WeekChart({ days }: { days: DayBucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...days.map((d) => d.minutes), 1));
  const plotW = W - PAD_L;
  const plotH = H - PAD_T - PAD_B;
  const slot = plotW / days.length;
  const bw = Math.min(30, slot * 0.46);
  const grid = [0, 0.5, 1];
  const hovered = hover !== null ? days[hover] : null;

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="group" aria-label="Focus minutes over the last seven days">
        <defs>
          <linearGradient id="fl-bar-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E9D3A6" />
            <stop offset="100%" stopColor="#9F7D55" />
          </linearGradient>
          <linearGradient id="fl-bar-today" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBF0D6" />
            <stop offset="100%" stopColor="#C9A96E" />
          </linearGradient>
          <filter id="fl-bar-glow" x="-50%" y="-20%" width="200%" height="140%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {grid.map((g) => {
          const y = PAD_T + plotH * (1 - g);
          return (
            <g key={g}>
              <line x1={PAD_L} x2={W} y1={y} y2={y} stroke="rgba(201,169,110,0.1)" strokeDasharray={g === 0 ? undefined : "2 4"} />
              <text x={PAD_L - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#8A8072" className="fl-mono">
                {Math.round(max * g)}
              </text>
            </g>
          );
        })}
        {days.map((d, i) => {
          const h = (d.minutes / max) * plotH;
          const x = PAD_L + slot * i + (slot - bw) / 2;
          const y = PAD_T + plotH - h;
          const isHover = hover === i;
          return (
            <g key={d.key}>
              {d.minutes > 0 ? (
                <rect
                  x={x}
                  y={y}
                  width={bw}
                  height={h}
                  rx={3}
                  fill={d.isToday ? "url(#fl-bar-today)" : "url(#fl-bar-gold)"}
                  opacity={d.isToday || isHover ? 1 : 0.55}
                  filter={d.isToday ? "url(#fl-bar-glow)" : undefined}
                  style={{ transition: "opacity 250ms, y 700ms cubic-bezier(0.22,1,0.36,1), height 700ms cubic-bezier(0.22,1,0.36,1)" }}
                />
              ) : (
                <rect x={x} y={PAD_T + plotH - 2} width={bw} height={2} rx={1} fill="rgba(201,169,110,0.22)" />
              )}
              <text
                x={x + bw / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize="10"
                fill={d.isToday ? "#E3C88F" : "#8A8072"}
                className="fl-mono"
                letterSpacing="0.5"
              >
                {d.isToday ? "TODAY" : d.label.toUpperCase()}
              </text>
              <rect
                x={PAD_L + slot * i}
                y={PAD_T}
                width={slot}
                height={plotH + PAD_B}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${d.isToday ? "Today" : d.label}: ${Math.round(d.minutes)} focus minutes, ${d.sessions} sessions`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="cursor-default outline-none"
              />
            </g>
          );
        })}
      </svg>
      {hovered && hover !== null ? (
        <div
          className={`pointer-events-none absolute z-10 -translate-y-full rounded-xl ${
            hover === days.length - 1 ? "-translate-x-[88%]" : hover === 0 ? "-translate-x-[12%]" : "-translate-x-1/2"
          } border border-[rgba(201,169,110,0.3)] bg-[rgba(23,20,15,0.96)] px-3 py-2 whitespace-nowrap shadow-[0_12px_30px_-10px_rgba(0,0,0,0.9)]`}
          style={{
            left: `${((PAD_L + slot * hover + slot / 2) / W) * 100}%`,
            top: `${((PAD_T + plotH - (hovered.minutes / max) * plotH - 8) / H) * 100}%`,
          }}
          role="tooltip"
        >
          <p className="text-[11px] text-[#8A8072]">
            {new Date(hovered.start).toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
          </p>
          <p className="fl-mono text-[13px] text-[#F3ECDF]">
            {Math.round(hovered.minutes)} min
            <span className="text-[#8A8072]"> · {hovered.sessions} {hovered.sessions === 1 ? "session" : "sessions"}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

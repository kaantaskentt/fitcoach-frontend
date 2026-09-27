import type { ReactNode } from "react";

const SIZE = 400;
const C = SIZE / 2;
const ARC_R = 166;
const CIRC = 2 * Math.PI * ARC_R;
const TICKS = 60;

export function TimerRing({
  progress,
  running,
  children,
}: {
  progress: number;
  running: boolean;
  children: ReactNode;
}) {
  const p = Math.min(1, Math.max(0, progress));
  const lit = Math.floor(p * TICKS + 1e-6);
  const deg = p * 360;
  const transition = running ? "400ms linear" : "700ms cubic-bezier(0.22,1,0.36,1)";

  return (
    <div className="relative aspect-square w-[min(80vw,420px)]">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id="fl-ring-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F1DDB0" />
            <stop offset="50%" stopColor="#C9A96E" />
            <stop offset="100%" stopColor="#9F7D55" />
          </linearGradient>
          <radialGradient id="fl-ring-core" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="rgba(201,169,110,0.10)" />
            <stop offset="60%" stopColor="rgba(201,169,110,0.025)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <radialGradient id="fl-comet-glow">
            <stop offset="0%" stopColor="rgba(243,225,185,0.9)" />
            <stop offset="35%" stopColor="rgba(201,169,110,0.45)" />
            <stop offset="100%" stopColor="rgba(201,169,110,0)" />
          </radialGradient>
          <filter id="fl-arc-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Core spotlight + inner hairlines */}
        <circle cx={C} cy={C} r={150} fill="url(#fl-ring-core)" />
        <circle cx={C} cy={C} r={138} fill="none" stroke="rgba(201,169,110,0.07)" />
        {[0, 90, 180, 270].map((a) => (
          <line
            key={a}
            x1={C}
            y1={C - 138}
            x2={C}
            y2={C - 130}
            stroke="rgba(201,169,110,0.35)"
            strokeWidth={1}
            transform={`rotate(${a} ${C} ${C})`}
          />
        ))}

        {/* 60 minute-style ticks that light as time passes */}
        {Array.from({ length: TICKS }, (_, i) => {
          const major = i % 5 === 0;
          const on = i < lit;
          const head = running && i === lit - 1;
          return (
            <line
              key={i}
              x1={C}
              y1={major ? 6 : 10}
              x2={C}
              y2={20}
              strokeWidth={major ? 2 : 1.25}
              strokeLinecap="round"
              transform={`rotate(${i * 6} ${C} ${C})`}
              style={{
                stroke: head
                  ? "#F6E6C2"
                  : on
                    ? "rgba(214,184,128,0.95)"
                    : major
                      ? "rgba(201,169,110,0.28)"
                      : "rgba(201,169,110,0.14)",
                transition: "stroke 600ms ease",
              }}
            />
          );
        })}

        {/* Track */}
        <circle cx={C} cy={C} r={ARC_R} fill="none" stroke="rgba(201,169,110,0.1)" strokeWidth={2} />

        {/* Progress arc */}
        <circle
          cx={C}
          cy={C}
          r={ARC_R}
          fill="none"
          stroke="url(#fl-ring-gold)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          filter="url(#fl-arc-glow)"
          transform={`rotate(-90 ${C} ${C})`}
          style={{
            strokeDashoffset: CIRC * (1 - p),
            opacity: p > 0.001 ? 1 : 0,
            transition: `stroke-dashoffset ${transition}, opacity 400ms`,
          }}
        />

        {/* Comet — rotated around the centre so large jumps still follow the arc */}
        <g
          style={{
            opacity: p > 0.001 && p < 0.999 ? 1 : 0,
            transform: `rotate(${deg}deg)`,
            transformOrigin: `${C}px ${C}px`,
            transition: `transform ${transition}, opacity 400ms`,
          }}
        >
          <circle
            cx={C}
            cy={C - ARC_R}
            r={running ? 18 : 13}
            fill="url(#fl-comet-glow)"
            style={{ transition: "r 600ms" }}
          />
          <circle cx={C} cy={C - ARC_R} r={4.5} fill="#FBF0D6" />
        </g>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-[14%] text-center">
        {children}
      </div>
    </div>
  );
}

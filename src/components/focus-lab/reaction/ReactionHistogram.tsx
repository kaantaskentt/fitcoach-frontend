import type { ReactionTrial } from "@/lib/focus-lab/types";
import { MicroLabel } from "../ui";

const MIN = 125;
const STEP = 25;
const BINS = 15; // 125 … 500+

const W = 320;
const H = 120;
const PAD_B = 18;

/** Distribution of the last 50 valid reaction trials across all runs. */
export function ReactionHistogram({ trials }: { trials: ReactionTrial[] }) {
  const recent = trials.slice(-50);
  const counts = new Array<number>(BINS).fill(0);
  for (const t of recent) {
    const i = Math.min(BINS - 1, Math.max(0, Math.floor((t.ms - MIN) / STEP)));
    counts[i] += 1;
  }
  const max = Math.max(1, ...counts);
  const bw = W / BINS;
  const plotH = H - PAD_B;
  const median =
    recent.length > 0
      ? recent.map((t) => t.ms).sort((a, b) => a - b)[Math.floor(recent.length / 2)]
      : null;
  const xFor = (ms: number) => ((Math.min(ms, MIN + STEP * BINS) - MIN) / (STEP * BINS)) * W;

  return (
    <figure className="fl-panel p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <MicroLabel as="h3">Distribution</MicroLabel>
        <span className="fl-mono text-[11px] text-[#8A8072]">
          last {recent.length} {recent.length === 1 ? "trial" : "trials"}
          {median !== null ? ` · median ${Math.round(median)}ms` : ""}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={
          recent.length
            ? `Histogram of ${recent.length} reaction times, median ${Math.round(median ?? 0)} milliseconds`
            : "No reaction trials recorded yet"
        }
      >
        <defs>
          <linearGradient id="fl-hist-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E9D3A6" />
            <stop offset="100%" stopColor="#9F7D55" />
          </linearGradient>
        </defs>
        {/* Benchmark zones */}
        {[
          { from: MIN, to: 200, label: "elite" },
          { from: 200, to: 250, label: "sharp" },
          { from: 250, to: 300, label: "avg" },
        ].map((z, i) => (
          <g key={z.label}>
            <rect
              x={xFor(z.from)}
              y={0}
              width={xFor(z.to) - xFor(z.from)}
              height={plotH}
              fill={`rgba(201,169,110,${0.07 - i * 0.02})`}
            />
            <text x={xFor(z.from) + 4} y={10} className="fl-mono" fontSize="7.5" fill="#8A8072" letterSpacing="1">
              {z.label.toUpperCase()}
            </text>
          </g>
        ))}
        {counts.map((c, i) => {
          const h = (c / max) * (plotH - 16);
          return (
            <rect
              key={i}
              x={i * bw + 2}
              y={plotH - h}
              width={bw - 4}
              height={Math.max(0, h)}
              rx={1.5}
              fill="url(#fl-hist-gold)"
              opacity={c ? 0.95 : 0}
              style={{ transition: "y 500ms cubic-bezier(0.22,1,0.36,1), height 500ms cubic-bezier(0.22,1,0.36,1)" }}
            />
          );
        })}
        <line x1={0} y1={plotH + 0.5} x2={W} y2={plotH + 0.5} stroke="rgba(201,169,110,0.3)" />
        {[150, 200, 250, 300, 350, 400, 450].map((ms) => (
          <g key={ms}>
            <line x1={xFor(ms)} y1={plotH} x2={xFor(ms)} y2={plotH + 3} stroke="rgba(201,169,110,0.4)" />
            <text x={xFor(ms)} y={H - 2} textAnchor="middle" className="fl-mono" fontSize="8" fill="#8A8072">
              {ms}
            </text>
          </g>
        ))}
        {median !== null ? (
          <line
            x1={xFor(median)}
            x2={xFor(median)}
            y1={4}
            y2={plotH}
            stroke="#F3E1B9"
            strokeDasharray="2 3"
            strokeWidth={1}
          />
        ) : null}
        {recent.length === 0 ? (
          <text x={W / 2} y={plotH / 2 + 4} textAnchor="middle" fontSize="10" fill="#8A8072">
            Your trials will build a curve here
          </text>
        ) : null}
      </svg>
    </figure>
  );
}

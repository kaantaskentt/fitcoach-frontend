import { summarizeStroop, type StroopAnswer } from "@/lib/focus-lab/games";
import { MicroLabel } from "../ui";

function verdict(ms: number): string {
  if (ms < 40) return "Near-immune to the word — exceptional inhibitory control.";
  if (ms < 100) return "Strong control. The word barely slows you down.";
  if (ms < 180) return "Typical interference. Trainable with repetition.";
  return "The word is winning. Slow down slightly and prioritise accuracy.";
}

export function StroopResults({
  answers,
  onAgain,
}: {
  answers: StroopAnswer[];
  onAgain: () => void;
}) {
  const s = summarizeStroop(answers);
  const max = Math.max(s.congruentRtMs, s.incongruentRtMs, 1);
  const rows = [
    { label: "Congruent", ms: s.congruentRtMs, hollow: true },
    { label: "Incongruent", ms: s.incongruentRtMs, hollow: false },
  ];

  return (
    <div className="fl-anim-rise flex flex-1 flex-col px-2 py-2" aria-live="polite">
      <MicroLabel className="text-[#C9A96E]">Results</MicroLabel>
      <div className="mt-4 grid grid-cols-3 gap-4 sm:gap-8">
        <div>
          <MicroLabel>Accuracy</MicroLabel>
          <p className="fl-mono mt-2 text-[36px] leading-none text-[#F3ECDF] sm:text-[48px]">
            {Math.round(s.accuracy * 100)}
            <span className="text-[14px] text-[#8A8072]">%</span>
          </p>
        </div>
        <div>
          <MicroLabel>Mean RT</MicroLabel>
          <p className="fl-mono mt-2 text-[36px] leading-none text-[#F3ECDF] sm:text-[48px]">
            {Math.round(s.meanRtMs)}
            <span className="text-[14px] text-[#8A8072]">ms</span>
          </p>
        </div>
        <div>
          <MicroLabel>Interference</MicroLabel>
          <p className="fl-mono fl-gold-text mt-2 text-[36px] leading-none sm:text-[48px]">
            {s.interferenceMs >= 0 ? "+" : "−"}
            {Math.abs(Math.round(s.interferenceMs))}
            <span className="text-[14px]">ms</span>
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[96px_1fr_64px] items-center gap-3 sm:grid-cols-[110px_1fr_72px]">
            <span className="text-[13px] text-[#B3A999]">{r.label}</span>
            <span className="relative h-2.5 overflow-hidden rounded-full bg-[rgba(201,169,110,0.08)]">
              <span
                className={`absolute inset-y-0 left-0 rounded-full ${
                  r.hollow ? "border border-[#C9A96E]/80" : "bg-gradient-to-r from-[#9F7D55] to-[#E3C88F]"
                }`}
                style={{ width: `${(r.ms / max) * 100}%` }}
              />
            </span>
            <span className="fl-mono text-right text-[13px] text-[#EDE6DA]">{r.ms ? Math.round(r.ms) : "—"} ms</span>
          </div>
        ))}
      </div>

      <p className="mt-7 max-w-[56ch] text-[14px] leading-relaxed text-[#B3A999]">
        <span className="text-[#EDE6DA]">{verdict(s.interferenceMs)}</span> Interference cost is your
        incongruent minus congruent mean — the milliseconds spent overriding the urge to read.
      </p>

      <div className="mt-auto pt-8">
        <button type="button" onClick={onAgain} className="fl-btn fl-btn-gold px-8">
          Run it again
        </button>
      </div>
    </div>
  );
}

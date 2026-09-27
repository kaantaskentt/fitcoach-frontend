import type { CSSProperties, ReactNode } from "react";
import type { SoundscapeId } from "@/lib/focus-lab/types";
import { MicroLabel } from "../ui";

const Glyph = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    aria-hidden
  >
    {children}
  </svg>
);

const SCAPES: {
  id: Exclude<SoundscapeId, "off">;
  name: string;
  note: string;
  glyph: ReactNode;
}[] = [
  {
    id: "brown",
    name: "Brown",
    note: "Deep, even hush",
    glyph: (
      <Glyph>
        <path d="M2 13c3-4 5 4 8 0s5 4 8 0 3-2 4-1" />
      </Glyph>
    ),
  },
  {
    id: "rain",
    name: "Rain",
    note: "Soft patter",
    glyph: (
      <Glyph>
        <path d="M7 5l-2 5M13 4l-2 5M19 5l-2 5M10 12l-2 5M16 12l-2 5M6 17l-1 2M18 16l-1 2" />
      </Glyph>
    ),
  },
  {
    id: "ocean",
    name: "Ocean",
    note: "Slow swell",
    glyph: (
      <Glyph>
        <path d="M2 10c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1" />
        <path d="M2 16c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1" opacity=".55" />
      </Glyph>
    ),
  },
  {
    id: "gamma",
    name: "40 Hz",
    note: "Gamma · headphones",
    glyph: (
      <Glyph>
        <path d="M4 14v-2a8 8 0 0116 0v2" />
        <rect x="3" y="14" width="4" height="6" rx="1.5" />
        <rect x="17" y="14" width="4" height="6" rx="1.5" />
      </Glyph>
    ),
  },
];

export function SoundscapePanel({
  playing,
  volume,
  onChoose,
  onVolume,
}: {
  playing: SoundscapeId;
  volume: number;
  onChoose: (id: SoundscapeId) => void;
  onVolume: (v: number) => void;
}) {
  const pct = Math.round(volume * 100);
  return (
    <div className="fl-panel p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <MicroLabel as="h3">Soundscape</MicroLabel>
        <button
          type="button"
          onClick={() => onChoose("off")}
          aria-pressed={playing === "off"}
          className="fl-chip min-h-[30px] px-3 text-[12px]"
        >
          {playing === "off" ? "Silent" : "Turn off"}
        </button>
      </div>

      <div role="radiogroup" aria-label="Ambient soundscape" className="grid grid-cols-2 gap-2">
        {SCAPES.map((s) => {
          const on = playing === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChoose(on ? "off" : s.id)}
              className={`group relative flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-300 ${
                on
                  ? "border-[rgba(201,169,110,0.6)] bg-[rgba(201,169,110,0.09)] text-[#F3E4C4] shadow-[0_0_30px_-12px_rgba(201,169,110,0.6)]"
                  : "border-[rgba(201,169,110,0.12)] text-[#B3A999] hover:border-[rgba(201,169,110,0.3)] hover:text-[#EDE6DA]"
              }`}
            >
              <span className={on ? "text-[#E3C88F]" : "text-[#8A8072] group-hover:text-[#C9A96E]"}>
                {s.glyph}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-medium">{s.name}</span>
                <span className="block truncate text-[11.5px] text-[#8A8072]">{s.note}</span>
              </span>
              {on ? (
                <span aria-hidden className="fl-live-dot absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-[#E3C88F]" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8A8072" strokeWidth="1.5" aria-hidden>
          <path d="M4 10v4h4l5 4V6L8 10H4z" strokeLinejoin="round" />
          <path d="M16.5 9a4 4 0 010 6" strokeLinecap="round" opacity={volume > 0.05 ? 1 : 0.3} />
          <path d="M19 6.5a7.5 7.5 0 010 11" strokeLinecap="round" opacity={volume > 0.5 ? 1 : 0.3} />
        </svg>
        <label htmlFor="fl-volume" className="sr-only">
          Soundscape volume
        </label>
        <input
          id="fl-volume"
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => onVolume(Number(e.target.value) / 100)}
          className="fl-range"
          style={{ "--fl-fill": `${pct}%` } as CSSProperties}
          aria-valuetext={`${pct} percent`}
        />
        <span className="fl-mono w-9 text-right text-[12px] text-[#B3A999]">{pct}</span>
      </div>
    </div>
  );
}

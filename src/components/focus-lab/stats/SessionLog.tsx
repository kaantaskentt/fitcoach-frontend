import { BREATH_PATTERNS } from "@/lib/focus-lab/breath";
import { formatMinutes, formatSeconds, relativeTime } from "@/lib/focus-lab/time";
import type { SessionEntry } from "@/lib/focus-lab/types";
import { MicroLabel } from "../ui";

const KIND_LABEL: Record<SessionEntry["kind"], string> = {
  "deep-work": "Deep work",
  breath: "Breath",
  reaction: "Reaction",
  schulte: "Schulte",
  stroop: "Stroop",
};

function describe(s: SessionEntry): { title: string; result: string; italic: boolean; badge?: string } {
  switch (s.kind) {
    case "deep-work":
      return {
        title: s.intention ? `“${s.intention}”` : "Untitled focus block",
        result: formatMinutes(s.durationMs),
        italic: Boolean(s.intention),
        badge: s.completed ? undefined : "early",
      };
    case "breath":
      return {
        title: `${BREATH_PATTERNS[s.pattern]?.name ?? "Breath"} breathing`,
        result: `${s.rounds} ${s.rounds === 1 ? "round" : "rounds"}`,
        italic: false,
        badge: s.completed ? undefined : "partial",
      };
    case "reaction":
      return { title: `${s.trials.length} trials · best ${s.bestMs} ms`, result: `${s.avgMs} ms`, italic: false };
    case "schulte":
      return {
        title: `${s.size}×${s.size} grid · ${s.mistakes} ${s.mistakes === 1 ? "mistake" : "mistakes"}`,
        result: `${formatSeconds(s.timeMs)} s`,
        italic: false,
        badge: s.personalBest ? "PB" : undefined,
      };
    case "stroop":
      return {
        title: `${Math.round(s.accuracy * 100)}% accuracy · ${s.meanRtMs} ms mean`,
        result: `${s.interferenceMs} ms`,
        italic: false,
      };
  }
}

export function SessionLog({ sessions, now }: { sessions: SessionEntry[]; now: number }) {
  const recent = sessions.slice(-10).reverse();
  return (
    <div className="fl-panel p-5 sm:p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <MicroLabel as="h3">Recent sessions</MicroLabel>
        <span className="fl-mono text-[11px] text-[#8A8072]">{sessions.length} total</span>
      </div>
      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(201,169,110,0.16)] px-6 py-12 text-center">
          <p className="fl-serif text-[20px] text-[#D9CDB8] italic">Nothing logged yet.</p>
          <p className="mt-2 max-w-[34ch] text-[13.5px] text-[#8A8072]">
            Complete a deep work block or any drill and it will be recorded here.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-[rgba(201,169,110,0.08)]">
          {recent.map((s) => {
            const d = describe(s);
            const teal = s.kind === "breath";
            return (
              <li key={s.id} className="flex items-center gap-3.5 py-3">
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    teal ? "bg-[#5FB8AE] shadow-[0_0_10px_rgba(95,184,174,0.6)]" : "bg-[#C9A96E] shadow-[0_0_10px_rgba(201,169,110,0.5)]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[14px] text-[#EDE6DA] ${d.italic ? "fl-serif text-[15px] italic" : ""}`}>{d.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11.5px] text-[#8A8072]">
                    <span className="tracking-[0.14em] uppercase">{KIND_LABEL[s.kind]}</span>
                    <span aria-hidden>·</span>
                    <span>{now ? relativeTime(s.at, now) : ""}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {d.badge ? (
                    <span
                      className={`fl-mono rounded-full border px-1.5 py-0.5 text-[9.5px] tracking-[0.12em] uppercase ${
                        d.badge === "PB" ? "border-[#C9A96E]/60 text-[#E3C88F]" : "border-[rgba(201,169,110,0.2)] text-[#8A8072]"
                      }`}
                    >
                      {d.badge}
                    </span>
                  ) : null}
                  <span className={`fl-mono text-[14px] ${teal ? "text-[#8FCFC6]" : "text-[#E3C88F]"}`}>{d.result}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

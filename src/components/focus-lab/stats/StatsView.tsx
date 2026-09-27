"use client";

import { useMemo, useState } from "react";
import { useCoarseNow, useFocusLabData } from "@/lib/focus-lab/hooks";
import type { ModuleMeta } from "@/lib/focus-lab/modules";
import {
  computeFocusScore,
  dayStreak,
  lastSevenDays,
  personalBests,
  todayMinutes,
} from "@/lib/focus-lab/score";
import { resetAll } from "@/lib/focus-lab/store";
import { formatMinutes, formatSeconds } from "@/lib/focus-lab/time";
import { useToast } from "../Toast";
import { MicroLabel, ModuleHeader } from "../ui";
import { FocusGauge } from "./FocusGauge";
import { SessionLog } from "./SessionLog";
import { WeekChart } from "./WeekChart";

export function StatsView({ meta, active }: { meta: ModuleMeta; active: boolean }) {
  const data = useFocusLabData();
  const now = useCoarseNow();
  const notify = useToast();
  const [confirming, setConfirming] = useState(false);
  const ready = now !== 0;
  const t = ready ? now : 0;

  const score = useMemo(() => computeFocusScore(data, t), [data, t]);
  const week = useMemo(() => lastSevenDays(data, t), [data, t]);
  const today = useMemo(() => todayMinutes(data, t), [data, t]);
  const streak = useMemo(() => dayStreak(data, t), [data, t]);
  const pbs = useMemo(() => personalBests(data), [data]);
  const weekTotal = week.reduce((s, d) => s + d.minutes, 0);

  const bestTiles: { label: string; value: string; unit?: string }[] = [
    { label: "Longest focus", value: pbs.longestDeepWorkMs ? formatMinutes(pbs.longestDeepWorkMs) : "—" },
    { label: "Total focus", value: pbs.totalFocusMs ? formatMinutes(pbs.totalFocusMs) : "—" },
    { label: "Fastest reaction", value: pbs.reactionBestMs !== null ? String(pbs.reactionBestMs) : "—", unit: pbs.reactionBestMs !== null ? "ms" : undefined },
    { label: "Best reaction run", value: pbs.reactionBestRunMs !== null ? String(pbs.reactionBestRunMs) : "—", unit: pbs.reactionBestRunMs !== null ? "ms" : undefined },
    ...(["4", "5", "6"] as const).map((k) => ({
      label: `Schulte ${k}×${k}`,
      value: pbs.schulte[k] !== null ? formatSeconds(pbs.schulte[k] ?? 0) : "—",
      unit: pbs.schulte[k] !== null ? "s" : undefined,
    })),
    {
      label: "Stroop cost",
      value: pbs.stroopBestInterferenceMs !== null ? String(pbs.stroopBestInterferenceMs) : "—",
      unit: pbs.stroopBestInterferenceMs !== null ? "ms" : undefined,
    },
  ];

  return (
    <div>
      <ModuleHeader meta={meta} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-6">
        <div className="fl-panel p-5 sm:p-8">
          <FocusGauge score={score.total} components={score.components} active={active} ready={ready} />
        </div>

        <div className="fl-panel flex flex-col p-5 sm:p-8">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <MicroLabel>Today</MicroLabel>
              <p className="fl-mono mt-2 text-[30px] leading-none text-[#F3ECDF]">
                {ready ? Math.round(today) : "—"}
                <span className="ml-1 text-[12px] text-[#8A8072]">min</span>
              </p>
            </div>
            <div>
              <MicroLabel>Streak</MicroLabel>
              <p className="fl-mono mt-2 flex items-baseline text-[30px] leading-none text-[#F3ECDF]">
                {ready ? streak : "—"}
                <span className="ml-1 text-[12px] text-[#8A8072]">{streak === 1 ? "day" : "days"}</span>
                {streak >= 3 ? (
                  <svg className="ml-2 self-center" width="14" height="16" viewBox="0 0 14 16" aria-hidden>
                    <path d="M7 0c1 3 5 4.5 5 9a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z" fill="#C9A96E" />
                  </svg>
                ) : null}
              </p>
            </div>
            <div>
              <MicroLabel>7 days</MicroLabel>
              <p className="fl-mono mt-2 text-[30px] leading-none text-[#F3ECDF]">
                {ready ? Math.round(weekTotal) : "—"}
                <span className="ml-1 text-[12px] text-[#8A8072]">min</span>
              </p>
            </div>
          </div>
          <div className="fl-hairline my-6" aria-hidden />
          <div className="mb-3 flex items-baseline justify-between">
            <MicroLabel as="h3">Focus minutes</MicroLabel>
            <span className="text-[11.5px] text-[#8A8072]">Deep work + breath</span>
          </div>
          <div className="mt-auto">{ready ? <WeekChart days={week} /> : <div className="aspect-[420/190]" />}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-6">
        <div className="fl-panel p-5 sm:p-6">
          <MicroLabel as="h3" className="mb-4">Personal bests</MicroLabel>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {bestTiles.map((b) => (
              <div key={b.label} className="rounded-2xl border border-[rgba(201,169,110,0.1)] bg-[rgba(11,10,9,0.35)] px-3.5 py-3.5">
                <dt className="text-[11px] leading-tight text-[#8A8072]">{b.label}</dt>
                <dd className="fl-mono mt-2 text-[19px] leading-none text-[#EDE6DA]">
                  {b.value}
                  {b.unit ? <span className="ml-0.5 text-[11px] text-[#8A8072]">{b.unit}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <SessionLog sessions={data.sessions} now={t} />
      </div>

      <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-[rgba(201,169,110,0.08)] pt-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-[14px] text-[#D9CDB8]">Your data never leaves this device.</p>
          <p className="mt-0.5 text-[12.5px] text-[#8A8072]">Stored locally under one versioned key. Preferences are kept on reset.</p>
        </div>
        {confirming ? (
          <div className="fl-anim-rise flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirm reset">
            <span className="mr-1 text-[13px] text-[#E0685E]">Erase every session, PB and trial?</span>
            <button type="button" onClick={() => setConfirming(false)} className="fl-btn fl-btn-ghost min-h-[38px] text-[13px]" autoFocus>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                resetAll();
                setConfirming(false);
                notify({ title: "Focus Lab data erased", detail: "A clean slate." });
              }}
              className="fl-btn min-h-[38px] border border-[#E0685E]/60 bg-[#E0685E]/12 text-[13px] text-[#F4B3AC] hover:bg-[#E0685E]/20"
            >
              Erase everything
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="fl-btn fl-btn-ghost min-h-[38px] text-[13px] text-[#B3A999]">
            Reset all data
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useCoarseNow, useFocusLabData } from "@/lib/focus-lab/hooks";
import { computeFocusScore, dayStreak, todayMinutes } from "@/lib/focus-lab/score";
import { MicroLabel } from "./ui";

export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[720px] overflow-hidden">
      <Image
        src="/images/01_onboarding_bg.jpg"
        alt=""
        fill
        sizes="100vw"
        quality={55}
        className="object-cover object-[72%_35%] opacity-[0.32]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,10,9,0.55)_0%,rgba(11,10,9,0.72)_45%,#0B0A09_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_78%_8%,rgba(201,169,110,0.16),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(40%_40%_at_10%_60%,rgba(201,169,110,0.05),transparent_70%)]" />
    </div>
  );
}

export function Hero() {
  const data = useFocusLabData();
  const now = useCoarseNow();

  const stats = useMemo(() => {
    if (now === 0) return null;
    return {
      today: Math.round(todayMinutes(data, now)),
      streak: dayStreak(data, now),
      score: computeFocusScore(data, now).total,
    };
  }, [data, now]);

  const cells: { label: string; value: string; unit: string }[] = [
    { label: "Today", value: stats ? String(stats.today) : "—", unit: "min" },
    { label: "Streak", value: stats ? String(stats.streak) : "—", unit: stats?.streak === 1 ? "day" : "days" },
    { label: "Score", value: stats ? String(stats.score) : "—", unit: "/1000" },
  ];

  return (
    <section className="relative mx-auto max-w-[1240px] px-4 pt-9 pb-8 sm:px-6 sm:pt-20 sm:pb-14">
      <div className="flex flex-col gap-7 sm:gap-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="fl-anim-rise max-w-[640px]">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9A96E] fl-live-dot" aria-hidden />
            <MicroLabel as="span" className="text-[#B3A999]">
              FitCoach · Cognitive conditioning
            </MicroLabel>
          </div>
          <h1 className="fl-serif text-[38px] leading-[1.04] font-semibold tracking-[-0.02em] text-[#F3ECDF] sm:text-[64px]">
            Train the mind
            <br />
            that <span className="fl-gold-text italic">moves the weight.</span>
          </h1>
          <p className="mt-5 hidden max-w-[48ch] text-[15.5px] sm:block leading-relaxed text-[#B3A999]">
            Six instruments for attention: timed deep work, guided breath,
            reflex, peripheral vision and inhibitory control — measured to the
            millisecond, kept on your device.
          </p>
        </div>

        <dl className="fl-anim-rise grid grid-cols-3 overflow-hidden rounded-2xl border border-[rgba(201,169,110,0.14)] bg-[rgba(18,16,14,0.6)] backdrop-blur-md [animation-delay:120ms] lg:min-w-[420px]">
          {cells.map((c, i) => (
            <div
              key={c.label}
              className={`px-4 py-4 sm:px-6 sm:py-5 ${i > 0 ? "border-l border-[rgba(201,169,110,0.1)]" : ""}`}
            >
              <MicroLabel as="dt">{c.label}</MicroLabel>
              <dd className="fl-mono mt-2.5 flex items-baseline gap-1 text-[24px] leading-none text-[#EDE6DA] sm:text-[30px]">
                {c.value}
                <span className="text-[11px] text-[#8A8072]">{c.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

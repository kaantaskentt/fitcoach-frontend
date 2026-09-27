import Link from "next/link";
import type { ModuleId } from "@/lib/focus-lab/types";
import { ModuleNav } from "./ModuleNav";

export function FitCoachMark({ size = 30 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-b from-[#C9A96E] to-[#9F7D55] shadow-[0_0_0_1px_rgba(233,211,166,0.35)_inset,0_6px_18px_-6px_rgba(201,169,110,0.6)]"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 16 16" fill="white">
        <rect x="2" y="6" width="3" height="4" rx=".75" />
        <rect x="11" y="6" width="3" height="4" rx=".75" />
        <rect x="5" y="7" width="6" height="2" rx=".5" />
      </svg>
    </span>
  );
}

export function TopBar({
  active,
  onSelect,
}: {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(201,169,110,0.1)] bg-[rgba(11,10,9,0.78)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2.5 px-4 pt-3 pb-3 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:py-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg"
          aria-label="FitCoach home"
        >
          <FitCoachMark />
          <span className="flex items-baseline gap-2">
            <span className="text-[14px] font-semibold tracking-tight text-[#EDE6DA]">
              FitCoach
            </span>
            <span aria-hidden className="text-[#6F6659]">
              /
            </span>
            <span className="fl-serif text-[17px] font-semibold text-[#E3C88F] italic">
              Focus Lab
            </span>
          </span>
        </Link>

        <nav
          aria-label="FitCoach"
          className="flex items-center justify-end gap-1 lg:col-start-3"
        >
          <Link
            href="/"
            className="rounded-full px-3 py-2 text-[13px] text-[#B3A999] transition-colors hover:text-[#EDE6DA]"
          >
            Coach
          </Link>
          <Link
            href="/motion"
            className="rounded-full border border-[rgba(201,169,110,0.2)] px-3 py-1.5 text-[13px] text-[#B3A999] transition-colors hover:border-[rgba(201,169,110,0.45)] hover:text-[#EDE6DA]"
          >
            Film
          </Link>
        </nav>

        <div className="col-span-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <ModuleNav active={active} onSelect={onSelect} />
        </div>
      </div>
    </header>
  );
}

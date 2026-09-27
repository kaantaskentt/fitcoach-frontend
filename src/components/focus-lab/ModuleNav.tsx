"use client";

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { MODULES } from "@/lib/focus-lab/modules";
import type { ModuleId } from "@/lib/focus-lab/types";

export function ModuleNav({
  active,
  onSelect,
}: {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  // Slide the gold indicator under the active tab (DOM write, no re-render).
  useLayoutEffect(() => {
    const place = () => {
      const list = listRef.current;
      const ind = indicatorRef.current;
      if (!list || !ind) return;
      const btn = list.querySelector<HTMLButtonElement>(`[data-module="${active}"]`);
      if (!btn) return;
      ind.style.width = `${btn.offsetWidth}px`;
      ind.style.transform = `translateX(${btn.offsetLeft}px)`;
      ind.style.opacity = "1";
    };
    place();
    const ro = new ResizeObserver(place);
    if (listRef.current) ro.observe(listRef.current);
    return () => ro.disconnect();
  }, [active]);

  // Keep the active pill visible in the horizontally-scrolling mobile nav.
  useEffect(() => {
    const list = listRef.current;
    const btn = list?.querySelector<HTMLButtonElement>(`[data-module="${active}"]`);
    const scroller = list?.parentElement;
    if (!btn || !scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    const target = btn.offsetLeft - scroller.clientWidth / 2 + btn.offsetWidth / 2;
    scroller.scrollTo({ left: target, behavior: "smooth" });
  }, [active]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") {
      return;
    }
    e.preventDefault();
    const i = MODULES.findIndex((m) => m.id === active);
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % MODULES.length;
    if (e.key === "ArrowLeft") next = (i - 1 + MODULES.length) % MODULES.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = MODULES.length - 1;
    onSelect(MODULES[next].id);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-module="${MODULES[next].id}"]`)
      ?.focus();
  };

  return (
    <div className="fl-scroll-x -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Focus Lab modules"
        onKeyDown={onKeyDown}
        className="relative inline-flex min-w-max items-center gap-1 rounded-full border border-[rgba(201,169,110,0.14)] bg-[rgba(18,16,14,0.7)] p-1"
      >
        <span
          ref={indicatorRef}
          aria-hidden
          className="absolute top-1 bottom-1 left-0 rounded-full border border-[rgba(201,169,110,0.45)] bg-[linear-gradient(180deg,rgba(201,169,110,0.2),rgba(159,125,85,0.1))] opacity-0 shadow-[0_0_24px_-6px_rgba(201,169,110,0.5)] transition-[transform,width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
        {MODULES.map((m, i) => {
          const selected = m.id === active;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              id={`tab-${m.id}`}
              data-module={m.id}
              aria-selected={selected}
              aria-controls={`panel-${m.id}`}
              tabIndex={selected ? 0 : -1}
              aria-keyshortcuts={String(i + 1)}
              onClick={() => onSelect(m.id)}
              className={`relative z-[1] flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-300 sm:px-4 ${
                selected ? "text-[#F3E4C4]" : "text-[#A69C8C] hover:text-[#EDE6DA]"
              }`}
            >
              <span
                className={`fl-mono hidden text-[10px] sm:inline ${
                  selected ? "text-[#C9A96E]" : "text-[#6F6659]"
                }`}
              >
                {i + 1}
              </span>
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

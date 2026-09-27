import type { ReactNode } from "react";
import type { ModuleMeta } from "@/lib/focus-lab/modules";

export function MicroLabel({
  children,
  className = "",
  as: Tag = "p",
}: {
  children: ReactNode;
  className?: string;
  as?: "p" | "span" | "h3" | "dt" | "legend";
}) {
  return <Tag className={`fl-micro ${className}`}>{children}</Tag>;
}

export function ModuleHeader({
  meta,
  aside,
  tone = "gold",
}: {
  meta: ModuleMeta;
  aside?: ReactNode;
  tone?: "gold" | "teal";
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-3 flex items-center gap-3">
          <span
            className={`fl-mono text-[11px] ${
              tone === "teal" ? "text-[#5FB8AE]" : "text-[#C9A96E]"
            }`}
          >
            {meta.index}
          </span>
          <span
            aria-hidden
            className={`h-px w-8 ${
              tone === "teal" ? "bg-[#5FB8AE]/50" : "bg-[#C9A96E]/50"
            }`}
          />
          <MicroLabel as="span">{meta.label}</MicroLabel>
        </div>
        <h2 className="fl-serif text-[34px] leading-[1.05] font-semibold tracking-[-0.01em] text-[#F3ECDF] sm:text-[44px]">
          {meta.title}
        </h2>
        <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-[#B3A999]">
          {meta.tagline}
        </p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </header>
  );
}

export function StatBlock({
  label,
  value,
  unit,
  accent = false,
  className = "",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <MicroLabel>{label}</MicroLabel>
      <p
        className={`fl-mono mt-2 text-[22px] leading-none ${
          accent ? "text-[#E3C88F]" : "text-[#EDE6DA]"
        }`}
      >
        {value}
        {unit ? (
          <span className="ml-1 text-[12px] text-[#8A8072]">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: ReactNode;
  ariaLabel?: string;
}

/** Radio-group of pill chips. */
export function ChoiceGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  tone = "gold",
  className = "",
}: {
  label: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (v: T) => void;
  disabled?: boolean;
  tone?: "gold" | "teal";
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.ariaLabel}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`fl-chip ${tone === "teal" ? "fl-chip-teal" : ""} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Small corner tick ornaments for panels — the "instrument" detail. */
export function CornerTicks({ tone = "gold" }: { tone?: "gold" | "teal" }) {
  const c = tone === "teal" ? "border-[#5FB8AE]/40" : "border-[#C9A96E]/40";
  return (
    <span aria-hidden className="pointer-events-none absolute inset-3">
      <span className={`absolute top-0 left-0 h-2.5 w-2.5 border-t border-l ${c}`} />
      <span className={`absolute top-0 right-0 h-2.5 w-2.5 border-t border-r ${c}`} />
      <span className={`absolute bottom-0 left-0 h-2.5 w-2.5 border-b border-l ${c}`} />
      <span className={`absolute right-0 bottom-0 h-2.5 w-2.5 border-r border-b ${c}`} />
    </span>
  );
}

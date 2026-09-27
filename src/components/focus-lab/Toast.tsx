"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ToastItem {
  id: number;
  title: string;
  detail?: string;
  xp?: number;
  tone: "gold" | "teal";
}

type NotifyInput = Omit<ToastItem, "id" | "tone"> & { tone?: ToastItem["tone"] };

const ToastContext = createContext<(t: NotifyInput) => void>(() => {});

export function useToast(): (t: NotifyInput) => void {
  return useContext(ToastContext);
}

const TOAST_MS = 3600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const notify = useCallback((t: NotifyInput) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-2), { tone: "gold", ...t, id }]);
    const handle = setTimeout(() => {
      timers.current.delete(handle);
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, TOAST_MS);
    timers.current.add(handle);
  }, []);

  useEffect(() => {
    const set = timers.current;
    return () => set.forEach((h) => clearTimeout(h));
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="fl-anim-toast pointer-events-auto flex min-w-[240px] max-w-[92vw] items-center gap-3 rounded-2xl border border-[rgba(201,169,110,0.28)] bg-[rgba(23,20,15,0.94)] py-3 pr-4 pl-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md"
          >
            {t.xp ? (
              <span className="fl-mono flex h-10 min-w-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#D8BC86] to-[#9F7D55] px-2 text-[13px] font-medium text-[#17120A]">
                +{t.xp}
              </span>
            ) : (
              <span
                aria-hidden
                className={`h-2 w-2 shrink-0 rounded-full ${
                  t.tone === "teal" ? "bg-[#5FB8AE]" : "bg-[#C9A96E]"
                } fl-live-dot`}
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[#EDE6DA]">
                {t.title}
                {t.xp ? (
                  <span className="fl-mono ml-2 text-[12px] font-medium text-[#C9A96E]">
                    +{t.xp} XP
                  </span>
                ) : null}
              </p>
              {t.detail ? (
                <p className="truncate text-[12.5px] text-[#B3A999]">{t.detail}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

"use client";

import { Avatar } from "@/components/ui/Avatar";

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <Avatar type="coach" />
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-1.5"
        style={{ background: "var(--color-surface)" }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full"
            style={{
              background: "var(--color-text-tertiary)",
              animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

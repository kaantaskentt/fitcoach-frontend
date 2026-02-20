"use client";

import { storage } from "@/lib/storage";

interface AvatarProps {
  type: "user" | "coach";
  size?: "sm" | "md";
}

export function Avatar({ type, size = "md" }: AvatarProps) {
  const dimensions = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  if (type === "coach") {
    return (
      <div
        className={`${dimensions} rounded-full flex items-center justify-center shrink-0`}
        style={{ background: "linear-gradient(135deg, #C9A96E, #9F7D55)" }}
      >
        <svg
          width={size === "sm" ? 14 : 16}
          height={size === "sm" ? 14 : 16}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Minimal dumbbell icon */}
          <rect x="2" y="6" width="3" height="4" rx="0.75" fill="white" />
          <rect x="11" y="6" width="3" height="4" rx="0.75" fill="white" />
          <rect x="5" y="7" width="6" height="2" rx="0.5" fill="white" />
        </svg>
      </div>
    );
  }

  const userName = typeof window !== "undefined" ? storage.getName() : "";
  const initial = userName ? userName.charAt(0).toUpperCase() : "U";

  return (
    <div
      className={`${dimensions} rounded-full flex items-center justify-center shrink-0 ${textSize} font-semibold`}
      style={{
        background: "var(--color-accent-light)",
        color: "var(--color-accent)",
      }}
    >
      {initial}
    </div>
  );
}

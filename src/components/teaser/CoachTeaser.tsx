"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const STORAGE_KEY = "fitcoach_teaser_emails";

export function CoachTeaser() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSubmitted(true);
    }
  }, []);

  const handleSubmit = () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) return;

    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    existing.push({ email: trimmed, timestamp: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    setSubmitted(true);
    setEmail("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ minHeight: "180px" }}>
      {/* Background image */}
      <Image
        src="/images/03_coach_card.jpg"
        alt=""
        fill
        className="object-cover"
        quality={75}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.25) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-4 flex flex-col justify-end h-full" style={{ minHeight: "180px" }}>
        {/* Coming Soon pill */}
        <div className="mb-2">
          <span
            className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{
              background: "rgba(201, 169, 110, 0.25)",
              color: "#C9A96E",
              backdropFilter: "blur(4px)",
            }}
          >
            Coming Soon
          </span>
        </div>

        {/* Heading */}
        <h3
          className="text-base mb-1 leading-snug text-white"
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontWeight: 600,
          }}
        >
          Speak with a Fit Coach
        </h3>
        <p
          className="text-[12px] leading-relaxed mb-3"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Live voice coaching is on the way.
        </p>

        {submitted ? (
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7L6 10L11 4"
                stroke="#C9A96E"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-xs font-medium" style={{ color: "#C9A96E" }}>
              You&apos;re on the list
            </span>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="your@email.com"
              className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-xs border outline-none transition-colors"
              style={{
                borderColor: "rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontFamily: "inherit",
                backdropFilter: "blur(4px)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(201, 169, 110, 0.5)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!email.trim() || !email.includes("@")}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #C9A96E, #9F7D55)" }}
            >
              Notify Me
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

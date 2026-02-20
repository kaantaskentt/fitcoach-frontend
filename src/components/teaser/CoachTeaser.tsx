"use client";

import { useState, useEffect } from "react";

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

    // Save to localStorage (no backend yet)
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
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--color-accent-light)",
        border: "1px solid var(--color-accent-subtle)",
      }}
    >
      {/* Coming Soon pill */}
      <div className="mb-3">
        <span
          className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
          style={{
            background: "var(--color-accent-subtle)",
            color: "var(--color-accent)",
          }}
        >
          Coming Soon
        </span>
      </div>

      {/* Heading */}
      <h3
        className="text-base mb-1 leading-snug"
        style={{
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontWeight: 600,
        }}
      >
        Speak with a Fit Coach
      </h3>
      <p
        className="text-[12px] leading-relaxed mb-3"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Live voice coaching is on the way. Be the first to experience it.
      </p>

      {submitted ? (
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7L6 10L11 4"
              stroke="var(--color-success)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="text-xs font-medium"
            style={{ color: "var(--color-success)" }}
          >
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
              borderColor: "var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text-primary)",
              fontFamily: "inherit",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!email.trim() || !email.includes("@")}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-40"
            style={{ background: "var(--color-accent)" }}
          >
            Notify Me
          </button>
        </div>
      )}
    </div>
  );
}

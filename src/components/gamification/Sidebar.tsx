"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { XPProgressBar } from "./XPProgressBar";
import { StreakCounter } from "./StreakCounter";
import { BadgeGrid } from "./BadgeGrid";
import { CoachTeaser } from "@/components/teaser/CoachTeaser";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!isOpen) setIsMounted(false);
  };

  const content = (
    <div className="space-y-6 p-5">
      {/* Sidebar accent image */}
      <div className="relative rounded-xl overflow-hidden" style={{ height: "100px" }}>
        <Image
          src="/images/04_sidebar_accent.jpg"
          alt=""
          fill
          className="object-cover"
          quality={75}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.5) 100%)",
          }}
        />
        <div className="relative z-10 flex items-center justify-center h-full">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "rgba(201, 169, 110, 0.9)" }}
          >
            Elevate Your Fitness
          </p>
        </div>
      </div>

      {/* Section: Progress */}
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-playfair), Georgia, serif",
            letterSpacing: "0.1em",
          }}
        >
          Your Progress
        </h2>
        <div className="space-y-4">
          <XPProgressBar />
          <StreakCounter />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: "var(--color-border)" }} />

      {/* Section: Badges */}
      <BadgeGrid />

      {/* Divider */}
      <div className="h-px" style={{ background: "var(--color-border)" }} />

      {/* Teaser: Speak with a Fit Coach */}
      <CoachTeaser />
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:block w-[320px] shrink-0 border-l overflow-y-auto"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-bg)",
        }}
      >
        {content}
      </aside>

      {/* Mobile bottom sheet */}
      {isMounted && (
        <div
          className="md:hidden fixed inset-0 z-50"
          onTransitionEnd={handleTransitionEnd}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 backdrop-blur-light transition-opacity duration-300"
            style={{
              background: "rgba(28, 25, 23, 0.2)",
              opacity: isOpen ? 1 : 0,
            }}
            onClick={onClose}
          />

          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl transition-transform duration-300 ease-out"
            style={{
              background: "var(--color-bg)",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.08)",
              transform: isOpen ? "translateY(0)" : "translateY(100%)",
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="w-8 h-1 rounded-full"
                style={{ background: "var(--color-border)" }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-2">
              <h2
                className="text-base font-semibold"
                style={{
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-playfair), Georgia, serif",
                }}
              >
                Progress
              </h2>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M4 4L12 12M12 4L4 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {content}

            {/* Safe area padding for mobile */}
            <div className="h-6" />
          </div>
        </div>
      )}
    </>
  );
}

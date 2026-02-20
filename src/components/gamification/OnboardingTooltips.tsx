"use client";

import { useState, useEffect, useRef } from "react";
import { storage } from "@/lib/storage";

const TOOLTIP_STEPS = [
  {
    title: "Track your XP",
    description:
      "Every message earns you XP. Level up from Beginner to Legend as you chat with your coach.",
  },
  {
    title: "Build streaks",
    description:
      "Chat daily to build your streak. Consecutive days earn bonus XP and keep your momentum going.",
  },
  {
    title: "Earn badges",
    description:
      "Ask about different topics — strength, nutrition, cardio, and more — to unlock topic badges.",
  },
];

const TOTAL_STEPS = TOOLTIP_STEPS.length + 1; // +1 for name entry

interface OnboardingTooltipsProps {
  onComplete?: (name: string) => void;
}

export function OnboardingTooltips({ onComplete }: OnboardingTooltipsProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [shouldShow, setShouldShow] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!storage.hasOnboarded()) {
      const timer = setTimeout(() => {
        setShouldShow(true);
        setCurrentStep(0);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-focus name input when reaching that step
  useEffect(() => {
    if (currentStep === TOOLTIP_STEPS.length) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleFinish = () => {
    const trimmedName = nameValue.trim();
    if (!trimmedName) return;

    storage.setName(trimmedName);
    storage.setOnboarded();
    setShouldShow(false);
    setCurrentStep(-1);
    onComplete?.(trimmedName);
  };

  const handleSkip = () => {
    storage.setOnboarded();
    if (nameValue.trim()) {
      storage.setName(nameValue.trim());
      onComplete?.(nameValue.trim());
    } else {
      onComplete?.("");
    }
    setShouldShow(false);
    setCurrentStep(-1);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFinish();
    }
  };

  if (!shouldShow || currentStep < 0) return null;

  const isNameStep = currentStep === TOOLTIP_STEPS.length;
  const isTooltipStep = currentStep < TOOLTIP_STEPS.length;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* Overlay */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: "rgba(28, 25, 23, 0.15)" }}
        onClick={handleSkip}
      />

      {/* Card */}
      <div
        className="pointer-events-auto absolute animate-fade-in"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className="w-[320px] p-5 rounded-2xl shadow-xl"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow:
              "0 16px 48px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          {/* Step indicator dots */}
          <div className="flex gap-1.5 mb-3">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === currentStep ? "20px" : "8px",
                  background:
                    i === currentStep
                      ? "var(--color-accent)"
                      : i < currentStep
                        ? "var(--color-accent-subtle)"
                        : "var(--color-border)",
                }}
              />
            ))}
          </div>

          {/* Tooltip step content */}
          {isTooltipStep && (
            <>
              <h3
                className="text-sm font-semibold mb-1"
                style={{
                  color: "var(--color-text-primary)",
                  fontFamily: "Satoshi, var(--font-dm-sans), sans-serif",
                }}
              >
                {TOOLTIP_STEPS[currentStep].title}
              </h3>
              <p
                className="text-[13px] leading-relaxed mb-4"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {TOOLTIP_STEPS[currentStep].description}
              </p>
            </>
          )}

          {/* Name entry step */}
          {isNameStep && (
            <>
              <h3
                className="text-sm font-semibold mb-1"
                style={{
                  color: "var(--color-text-primary)",
                  fontFamily: "Satoshi, var(--font-dm-sans), sans-serif",
                }}
              >
                What should we call you?
              </h3>
              <p
                className="text-[13px] leading-relaxed mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Your coach will use your name to personalize the conversation.
              </p>
              <input
                ref={nameInputRef}
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={handleNameKeyDown}
                placeholder="Enter your name"
                maxLength={30}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors mb-4"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-bg)",
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
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-xs transition-colors"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Skip
            </button>

            {isTooltipStep && (
              <button
                onClick={handleNext}
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                style={{ background: "var(--color-accent)" }}
              >
                Next
              </button>
            )}

            {isNameStep && (
              <button
                onClick={handleFinish}
                disabled={!nameValue.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-40"
                style={{ background: "var(--color-accent)" }}
              >
                Let&apos;s go
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

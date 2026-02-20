"use client";

import { useState } from "react";
import Image from "next/image";

interface WelcomePageProps {
  onEnter: () => void;
}

export function WelcomePage({ onEnter }: WelcomePageProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleEnter = () => {
    setIsExiting(true);
    // Wait for zoom animation to complete before unmounting
    setTimeout(onEnter, 800);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{
        transition: "transform 800ms cubic-bezier(0.76, 0, 0.24, 1), opacity 600ms ease-out",
        transform: isExiting ? "scale(1.5)" : "scale(1)",
        opacity: isExiting ? 0 : 1,
      }}
    >
      {/* Background image */}
      <Image
        src="/images/01_onboarding_bg.jpg"
        alt=""
        fill
        className="object-cover"
        priority
        quality={85}
      />

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center text-center px-6"
        style={{
          animation: "welcome-fade-in 1s ease-out forwards",
        }}
      >
        {/* Logo mark */}
        <div
          className="flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
          style={{ background: "linear-gradient(135deg, #C9A96E, #9F7D55)" }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="2" y="6" width="3" height="4" rx="0.75" fill="white" />
            <rect x="11" y="6" width="3" height="4" rx="0.75" fill="white" />
            <rect x="5" y="7" width="6" height="2" rx="0.5" fill="white" />
          </svg>
        </div>

        {/* Title */}
        <h1
          className="text-4xl sm:text-5xl mb-3 text-white"
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          FitCoach
        </h1>

        {/* Subtitle */}
        <p
          className="text-sm sm:text-base mb-10 max-w-xs leading-relaxed"
          style={{ color: "rgba(255,255,255,0.65)" }}
        >
          Your personal AI fitness coach.
          <br />
          Training. Nutrition. Recovery.
        </p>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          className="group relative px-8 py-3 rounded-full text-sm font-medium text-white overflow-hidden transition-all duration-300 hover:shadow-lg"
          style={{
            background: "linear-gradient(135deg, #C9A96E, #9F7D55)",
            boxShadow: "0 4px 24px rgba(184, 149, 106, 0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(184, 149, 106, 0.5)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 24px rgba(184, 149, 106, 0.3)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Begin Your Journey
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="inline-block ml-2 transition-transform duration-300 group-hover:translate-x-0.5"
          >
            <path
              d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Subtle tagline */}
        <p
          className="mt-8 text-[11px] tracking-wider uppercase"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          Powered by AI
        </p>
      </div>
    </div>
  );
}

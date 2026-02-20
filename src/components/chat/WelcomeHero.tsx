"use client";

import Image from "next/image";

export function WelcomeHero() {
  return (
    <div className="flex flex-col items-center text-center px-6 pt-8 pb-4 animate-fade-in">
      {/* Hero image */}
      <div
        className="relative w-full max-w-sm h-48 sm:h-56 rounded-2xl overflow-hidden mb-6"
        style={{
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}
      >
        <Image
          src="/images/02_chat_hero.jpg"
          alt="Fitness coaching"
          fill
          className="object-cover"
          quality={80}
        />
        {/* Warm overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(26,26,26,0.4) 0%, transparent 60%)",
          }}
        />
        {/* Floating tagline on image */}
        <div className="absolute bottom-4 left-4 right-4">
          <p
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            Your journey starts here
          </p>
        </div>
      </div>

      {/* Text beneath */}
      <p
        className="text-sm leading-relaxed max-w-xs"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Ask about training plans, nutrition, recovery, mobility — your coach is ready.
      </p>
    </div>
  );
}

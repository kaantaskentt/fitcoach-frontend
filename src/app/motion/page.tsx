import type { Metadata } from "next";
import Link from "next/link";
import { MotionPlayer } from "@/components/motion/MotionPlayer";
import "./motion.css";

export const metadata: Metadata = {
  title: "Film 01 — FitCoach",
  description: "A 15-second FitCoach brand film, rendered live in the browser from a deterministic canvas engine.",
};

const SPECS = [
  ["1920×1080", "Native canvas"],
  ["30 fps", "450 frames"],
  ["120 BPM", "Cuts on the beat"],
  ["2,600", "Warp particles"],
  ["0", "Video decoders"],
  ["0", "Motion libraries"],
];

export default async function MotionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  if (params.capture === "1") {
    return (
      <main style={{ background: "#000", width: 1920, height: 1080, overflow: "hidden" }}>
        <MotionPlayer capture />
      </main>
    );
  }

  return (
    <main className="mp-page">
      <div className="mp-grain" aria-hidden />
      <header className="mp-header">
        <Link href="/" className="mp-brand" aria-label="FitCoach home">
          <span className="mp-mark">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="2" y="6" width="3" height="4" rx="0.75" fill="white" />
              <rect x="11" y="6" width="3" height="4" rx="0.75" fill="white" />
              <rect x="5" y="7" width="6" height="2" rx="0.5" fill="white" />
            </svg>
          </span>
          <span className="mp-brand-name">FitCoach</span>
          <span className="mp-brand-sub">Film 01</span>
        </Link>
        <nav className="mp-nav" aria-label="Primary">
          <Link href="/">Coach</Link>
          <Link href="/focus-lab">Focus Lab</Link>
          <span aria-current="page">Film</span>
        </nav>
      </header>

      <section className="mp-hero">
        <p className="mp-kicker">
          <span className="mp-dot" /> 15 seconds · rendered live
        </p>
        <h1>
          Train smarter.
          <br />
          <em>Starting now.</em>
        </h1>
        <p className="mp-lede">
          Six scenes, ten impacts and one heartbeat. Everything below is drawn frame by frame in your browser. Each frame is
          a pure function of time, so scrub it, slow it to 0.25×, or step through it frame by frame.
        </p>
      </section>

      <MotionPlayer />

      <section className="mp-specs" aria-label="Film specifications">
        {SPECS.map(([v, k]) => (
          <div key={k}>
            <strong>{v}</strong>
            <span>{k}</span>
          </div>
        ))}
      </section>

      <section className="mp-keys" aria-label="Keyboard shortcuts">
        {[
          ["Space", "Play / pause"],
          ["← →", "Step one frame"],
          ["⇧ + ← →", "Jump one second"],
          ["1 – 6", "Jump to scene"],
          ["M", "Mute"],
          ["F", "Fullscreen"],
        ].map(([k, v]) => (
          <span key={k}>
            <kbd>{k}</kbd> {v}
          </span>
        ))}
      </section>

      <footer className="mp-footer">
        <span>Score synthesized from scratch · no samples</span>
        <Link href="/focus-lab">Enter the Focus Lab →</Link>
      </footer>
    </main>
  );
}

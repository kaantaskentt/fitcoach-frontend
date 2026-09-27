"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadFilmAssets, type FilmAssets } from "./film/assets";
import { BEAT, DURATION, FPS, H, IMPACTS, SCENES, W, clamp, timecode } from "./film/core";
import { renderFrame } from "./film/render";

const AUDIO_SRC = "/motion/fitcoach-film.m4a";
const VIDEO_SRC = "/motion/fitcoach-film.mp4";
const SPEEDS = [1, 0.5, 0.25] as const;

type Status = "loading" | "ready" | "error";

interface Clock {
  playing: boolean;
  t: number;
  /** performance.now() at which t was last anchored. */
  anchor: number;
  speed: number;
  loop: boolean;
}

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  play: "M7 4.5v15l12-7.5z",
  pause: "M8 5v14M16 5v14",
  restart: "M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5",
  prev: "M15 6l-6 6 6 6",
  next: "M9 6l6 6-6 6",
  loop: "M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4",
  sound: "M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12",
  mute: "M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6",
  full: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};

export function MotionPlayer({ capture = false }: { capture?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const assetsRef = useRef<FilmAssets | null>(null);
  const clockRef = useRef<Clock>({ playing: false, t: 0, anchor: 0, speed: 1, loop: true });
  const scrubbingRef = useRef(false);

  const [status, setStatus] = useState<Status>("loading");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [frameMs, setFrameMs] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);

  const draw = useCallback((t: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    const a = assetsRef.current;
    if (!ctx || !a) return 0;
    const t0 = performance.now();
    renderFrame(ctx, a, t);
    return performance.now() - t0;
  }, []);

  // Load assets once, render the first frame, expose the capture hook.
  useEffect(() => {
    let cancelled = false;
    loadFilmAssets()
      .then((a) => {
        if (cancelled) return;
        assetsRef.current = a;
        if (capture) {
          window.__film = {
            duration: DURATION,
            fps: FPS,
            renderAt: (t: number) => {
              draw(t);
            },
          };
          document.documentElement.dataset.filmReady = "1";
        }
        draw(capture ? 0 : 14.4);
        setTime(capture ? 0 : 14.4);
        clockRef.current.t = capture ? 0 : 14.4;
        setStatus("ready");
        if (!capture) {
          // Chapter thumbnails, rendered from the same engine.
          const small = document.createElement("canvas");
          small.width = W;
          small.height = H;
          const sctx = small.getContext("2d")!;
          const thumb = document.createElement("canvas");
          thumb.width = 384;
          thumb.height = 216;
          const tctx = thumb.getContext("2d")!;
          const picks = [1.1, 2.3, 6.6, 10.3, 12.62, 14.4];
          setThumbs(
            picks.map((pt) => {
              renderFrame(sctx, a, pt);
              tctx.drawImage(small, 0, 0, 384, 216);
              return thumb.toDataURL("image/jpeg", 0.8);
            }),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [capture, draw]);

  const seek = useCallback(
    (t: number) => {
      const c = clockRef.current;
      c.t = clamp(t, 0, DURATION - 1 / FPS / 2);
      c.anchor = performance.now();
      const audio = audioRef.current;
      if (audio && Math.abs(audio.currentTime - c.t) > 0.03) audio.currentTime = c.t;
      draw(c.t);
      setTime(c.t);
    },
    [draw],
  );

  const setPlay = useCallback(
    (next: boolean) => {
      const c = clockRef.current;
      const audio = audioRef.current;
      if (next && c.t >= DURATION - 0.05) c.t = 0;
      c.playing = next;
      c.anchor = performance.now();
      setPlaying(next);
      if (!audio) return;
      if (next) {
        audio.currentTime = c.t;
        audio.playbackRate = c.speed;
        audio.play().catch(() => undefined);
      } else {
        audio.pause();
      }
    },
    [],
  );

  // Render loop: our own clock is master, softly corrected by the audio clock.
  useEffect(() => {
    if (status !== "ready" || capture) return;
    let raf = 0;
    let lastUi = 0;
    let msAvg = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const c = clockRef.current;
      if (!c.playing || scrubbingRef.current) return;
      let t = c.t + ((now - c.anchor) / 1000) * c.speed;
      const audio = audioRef.current;
      if (audio && !audio.paused && Math.abs(audio.currentTime - t) > 0.06) t = audio.currentTime;
      if (t >= DURATION) {
        if (c.loop) {
          t = 0;
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => undefined);
          }
        } else {
          t = DURATION - 1 / FPS / 2;
          c.t = t;
          c.playing = false;
          setPlaying(false);
          draw(t);
          setTime(t);
          return;
        }
      }
      c.t = t;
      c.anchor = now;
      const ms = draw(t);
      msAvg = msAvg * 0.9 + ms * 0.1;
      if (now - lastUi > 50) {
        lastUi = now;
        setTime(t);
        setFrameMs(msAvg);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, capture, draw]);

  useEffect(() => {
    clockRef.current.loop = loop;
  }, [loop]);

  useEffect(() => {
    const c = clockRef.current;
    c.t = c.t + (c.playing ? ((performance.now() - c.anchor) / 1000) * c.speed : 0);
    c.anchor = performance.now();
    c.speed = speed;
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const fullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else el.requestFullscreen().catch(() => undefined);
  }, []);

  const snapshot = useCallback(() => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fitcoach-film-${timecode(clockRef.current.t).replace(/:/g, "-")}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }, []);

  // Keyboard transport.
  useEffect(() => {
    if (capture) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const c = clockRef.current;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          setPlay(!c.playing);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (c.playing) setPlay(false);
          seek(c.t - (e.shiftKey ? 1 : 1 / FPS));
          break;
        case "ArrowRight":
          e.preventDefault();
          if (c.playing) setPlay(false);
          seek(c.t + (e.shiftKey ? 1 : 1 / FPS));
          break;
        case "m":
          setMuted((m) => !m);
          break;
        case "f":
          fullscreen();
          break;
        case "l":
          setLoop((l) => !l);
          break;
        case "0":
        case "Home":
          seek(0);
          break;
        default:
          if (/^[1-6]$/.test(e.key)) seek(SCENES[Number(e.key) - 1].start);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [capture, fullscreen, seek, setPlay]);

  // Scrubbing.
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubTo = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    seek(((clientX - r.left) / r.width) * DURATION);
  };
  const wasPlaying = useRef(false);
  const onScrubStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubbingRef.current = true;
    wasPlaying.current = clockRef.current.playing;
    audioRef.current?.pause();
    scrubTo(e.clientX);
  };
  const onScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubbingRef.current) scrubTo(e.clientX);
  };
  const onScrubEnd = () => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    clockRef.current.anchor = performance.now();
    if (wasPlaying.current) setPlay(true);
  };

  if (capture) {
    return <canvas ref={canvasRef} width={W} height={H} style={{ display: "block", width: W, height: H }} />;
  }

  const activeScene = SCENES.findIndex((s) => time >= s.start && time < s.end);

  return (
    <div className="mp-root">
      <div ref={stageRef} className="mp-stage group">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="mp-canvas"
          onClick={() => status === "ready" && setPlay(!clockRef.current.playing)}
          aria-label="FitCoach 15 second film, rendered live"
          role="img"
        />
        {status !== "ready" && (
          <div className="mp-overlay">
            {status === "loading" ? (
              <>
                <div className="mp-spinner" />
                <p className="mp-micro">Loading plates, fonts &amp; particles</p>
              </>
            ) : (
              <p className="mp-micro">Couldn&apos;t load film assets. Refresh to retry.</p>
            )}
          </div>
        )}
        {status === "ready" && !playing && (
          <button className="mp-bigplay" onClick={() => setPlay(true)} aria-label="Play film">
            <span className="mp-bigplay-disc">
              <Icon d={ICONS.play} size={20} />
            </span>
            Play film · 0:15
          </button>
        )}
        <audio ref={audioRef} src={AUDIO_SRC} preload="auto" />
      </div>

      {/* Timeline */}
      <div className="mp-transport">
        <div
          ref={trackRef}
          className="mp-track"
          onPointerDown={onScrubStart}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubEnd}
          onPointerCancel={onScrubEnd}
          role="slider"
          aria-label="Film position"
          aria-valuemin={0}
          aria-valuemax={DURATION}
          aria-valuenow={Number(time.toFixed(2))}
          aria-valuetext={timecode(time)}
          tabIndex={0}
        >
          {SCENES.map((s, i) => (
            <div
              key={s.id}
              className={`mp-seg ${i === activeScene ? "is-active" : ""}`}
              style={{ left: `${(s.start / DURATION) * 100}%`, width: `${((s.end - s.start) / DURATION) * 100}%` }}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
            </div>
          ))}
          {Array.from({ length: Math.round(DURATION / BEAT) + 1 }, (_, i) => (
            <i key={i} className={`mp-beat ${i % 4 === 0 ? "is-bar" : ""}`} style={{ left: `${((i * BEAT) / DURATION) * 100}%` }} />
          ))}
          {IMPACTS.map((it) => (
            <b key={it} className="mp-impact" style={{ left: `${(it / DURATION) * 100}%` }} />
          ))}
          <div className="mp-fill" style={{ width: `${(time / DURATION) * 100}%` }} />
          <div className="mp-head" style={{ left: `${(time / DURATION) * 100}%` }} />
        </div>

        <div className="mp-controls">
          <div className="mp-group">
            <button className="mp-btn mp-primary" onClick={() => setPlay(!playing)} disabled={status !== "ready"} aria-label={playing ? "Pause" : "Play"}>
              <Icon d={playing ? ICONS.pause : ICONS.play} />
            </button>
            <button className="mp-btn" onClick={() => seek(0)} aria-label="Restart">
              <Icon d={ICONS.restart} />
            </button>
            <button className="mp-btn" onClick={() => { setPlay(false); seek(time - 1 / FPS); }} aria-label="Previous frame">
              <Icon d={ICONS.prev} />
            </button>
            <button className="mp-btn" onClick={() => { setPlay(false); seek(time + 1 / FPS); }} aria-label="Next frame">
              <Icon d={ICONS.next} />
            </button>
            <span className="mp-tc" aria-live="off">
              {timecode(time)}
              <em>/ {timecode(DURATION - 1 / FPS)}</em>
            </span>
          </div>
          <div className="mp-group">
            <span className="mp-perf" title="Average render time per frame">
              {frameMs > 0 ? `${frameMs.toFixed(1)} ms/frame` : "live canvas"}
            </span>
            <div className="mp-speed" role="group" aria-label="Playback speed">
              {SPEEDS.map((s) => (
                <button key={s} className={s === speed ? "is-on" : ""} onClick={() => setSpeed(s)} aria-pressed={s === speed}>
                  {s}×
                </button>
              ))}
            </div>
            <button className={`mp-btn ${loop ? "is-on" : ""}`} onClick={() => setLoop(!loop)} aria-label="Toggle loop" aria-pressed={loop}>
              <Icon d={ICONS.loop} />
            </button>
            <button className="mp-btn" onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute" : "Mute"}>
              <Icon d={muted ? ICONS.mute : ICONS.sound} />
            </button>
            <button className="mp-btn" onClick={snapshot} aria-label="Save current frame as PNG" disabled={status !== "ready"}>
              <Icon d={ICONS.camera} />
            </button>
            <button className="mp-btn" onClick={fullscreen} aria-label="Fullscreen">
              <Icon d={ICONS.full} />
            </button>
            <a className="mp-download" href={VIDEO_SRC} download="fitcoach-film.mp4">
              <Icon d={ICONS.download} size={16} />
              MP4
            </a>
          </div>
        </div>
      </div>

      {/* Chapters */}
      <ol className="mp-chapters">
        {SCENES.map((s, i) => (
          <li key={s.id}>
            <button className={i === activeScene ? "is-active" : ""} onClick={() => seek(s.start + 0.001)}>
              <span className="mp-thumb">
                {thumbs[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbs[i]} alt="" />
                ) : (
                  <span className="mp-thumb-empty" />
                )}
                <span className="mp-thumb-bar" style={{ transform: `scaleX(${i === activeScene ? (time - s.start) / (s.end - s.start) : i < activeScene ? 1 : 0})` }} />
              </span>
              <span className="mp-chapter-meta">
                <span>{String(i + 1).padStart(2, "0")} · {s.start.toFixed(1)}s</span>
                <strong>{s.label}</strong>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

declare global {
  interface Window {
    __film?: { duration: number; fps: number; renderAt: (t: number) => void };
  }
}

"""Synthesize the 15s FitCoach film score, sample-locked to the visual timeline.

120 BPM, A minor. Every hit lines up with an IMPACT / beat in
src/components/motion/film/core.ts. Pure numpy, no samples, fully deterministic.

    python3 scripts/film/soundtrack.py public/motion/fitcoach-film.wav
"""

import sys
import wave

import numpy as np

SR = 48000
DUR = 15.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(42)

L = np.zeros(N)
R = np.zeros(N)
SEND_L = np.zeros(N)  # reverb send
SEND_R = np.zeros(N)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def place(sig, t0, gain=1.0, pan=0.0, send=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N:
        return
    if i0 < 0:
        sig = sig[-i0:]
        i0 = 0
    sig = sig[: N - i0]
    gl = gain * np.sqrt(0.5 * (1 - pan))
    gr = gain * np.sqrt(0.5 * (1 + pan))
    L[i0 : i0 + len(sig)] += sig * gl
    R[i0 : i0 + len(sig)] += sig * gr
    if send:
        SEND_L[i0 : i0 + len(sig)] += sig * gl * send
        SEND_R[i0 : i0 + len(sig)] += sig * gr * send


def tvec(d):
    return np.arange(int(d * SR)) / SR


def onepole_lp(x, cutoff):
    """Time-varying one-pole low-pass. cutoff: scalar or array (Hz)."""
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def hp(x, cutoff):
    return x - onepole_lp(x, cutoff)


# ── instruments ──────────────────────────────────────────────────────────────


def kick(d=0.45, f0=150, f1=44, punch=1.0):
    t = tvec(d)
    f = f1 + (f0 - f1) * np.exp(-t * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.35 * punch
    return np.tanh((body + click) * 1.6)


def boom(d=2.2, f0=90, f1=34):
    t = tvec(d)
    f = f1 + (f0 - f1) * np.exp(-t * 9)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(ph) * np.exp(-t * 2.2)
    crash = hp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 3.2) * 0.55
    thump = rng.standard_normal(len(t)) * np.exp(-t * 60) * 0.6
    return np.tanh((sub * 1.2 + crash + thump) * 1.3)


def hat(d=0.06, bright=7000):
    t = tvec(d)
    return hp(rng.standard_normal(len(t)), bright) * np.exp(-t * 70)


def clap(d=0.35):
    t = tvec(d)
    n = rng.standard_normal(len(t))
    env = np.exp(-t * 24)
    # three micro-bursts like a real clap
    for k in (0.008, 0.017):
        env += np.exp(-np.maximum(t - k, 0) * 90) * (t >= k) * 0.6
    band = hp(onepole_lp(n, 3200), 900)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.3
    return band * env + tone


def heartbeat():
    t = tvec(0.35)
    f = 38 + 50 * np.exp(-t * 25)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    return onepole_lp(s, 300) * 2.2


def blip(freq=1800, d=0.09, up=1.0):
    t = tvec(d)
    f = freq * (1 + up * 0.6 * (1 - np.exp(-t * 60)))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45)


def tick(d=0.018):
    t = tvec(d)
    return hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 300)


def saw(freq, t):
    ph = (freq * t) % 1.0
    return 2 * ph - 1


def bass_note(note, d=0.24, cutoff=900):
    t = tvec(d)
    f = midi(note)
    s = saw(f, t) * 0.6 + saw(f * 1.006, t) * 0.4 + np.sin(2 * np.pi * f / 2 * t) * 0.7
    env = np.minimum(1, t * 400) * np.exp(-t * 7)
    cut = cutoff * (0.35 + 0.65 * np.exp(-t * 14)) + 80
    return onepole_lp(s * env, cut)


def pad(notes, d, cutoff=1400, detune=0.004):
    t = tvec(d)
    s = np.zeros(len(t))
    for n in notes:
        f = midi(n)
        for dt in (-detune, 0, detune):
            s += saw(f * (1 + dt), t + rng.random())
    s /= len(notes) * 3
    att = np.minimum(1, t / 0.35)
    rel = np.minimum(1, (d - t) / 0.5)
    return onepole_lp(s * att * rel, cutoff)


def whoosh(d=0.45, rev=False):
    t = tvec(d)
    n = rng.standard_normal(len(t))
    env = (t / d) ** 2.2
    cut = 300 + 7000 * (t / d) ** 2
    s = onepole_lp(n, cut) * env
    return s[::-1] if rev else s


def riser(d):
    t = tvec(d)
    n = rng.standard_normal(len(t))
    p = t / d
    s = hp(onepole_lp(n, 400 + 9000 * p**2), 200 + 1500 * p) * p**1.8
    tone = saw(110 * 2 ** (p * 2.5), t) * p**2.5 * 0.25
    return s + onepole_lp(tone, 2500)


# ── arrangement ──────────────────────────────────────────────────────────────

# 0–2 · Ignition: heartbeat on the scan-head beats, riser into the first cut.
for b, g in ((0.5, 0.55), (1.0, 1.0), (1.5, 0.7)):
    place(heartbeat(), b, 0.6 * g)
    place(heartbeat(), b + 0.17, 0.38 * g)
place(pad([45, 52, 57], 2.0, cutoff=500), 0.0, 0.35, send=0.4)
place(riser(1.2), 0.8, 0.5, send=0.3)
place(whoosh(0.5), 1.5, 0.45)

# Impacts on every hard cut.
for t0, g in ((2, 1.0), (3, 0.7), (4, 0.75), (5, 0.8), (8, 0.55), (11, 0.8)):
    place(boom(), t0, g, send=0.35)

# 2–5 · Slams: four-on-the-floor, whooshes into each word, offbeat hits.
for i in range(6):
    place(kick(), 2 + i * BEAT, 0.95)
for i in range(12):
    place(hat(), 2 + i * 0.25 + 0.125, 0.18, pan=0.4 if i % 2 else -0.4)
for t0 in (2.5, 3.5, 4.5):
    place(clap(), t0, 0.5, send=0.5)
for t0 in (2.62, 3.62):
    place(whoosh(0.38), t0, 0.5, pan=0.2)
for t0, n in ((2, 33), (3, 36), (4, 31)):
    place(bass_note(n, 0.95, 500), t0, 0.55)

# 5–8 · The System: full groove + 16th bass arp + UI ticks.
for i in range(6):
    place(kick(), 5 + i * BEAT, 1.0)
for t0 in (5.5, 6.5, 7.5):
    place(clap(), t0, 0.6, send=0.5)
for i in range(24):
    place(hat(0.05 if i % 2 else 0.09), 5 + i * 0.125, 0.16 if i % 2 else 0.22, pan=0.35 if i % 4 < 2 else -0.35)
arp = [33, 33, 45, 33, 36, 33, 43, 33, 31, 31, 43, 31, 36, 38, 40, 43]
for i in range(24):
    cut = 500 + 2600 * (i / 24)
    place(bass_note(arp[i % 16], 0.2, cut), 5 + i * 0.125, 0.42)
levels = [75, 200, 400, 700, 1100, 1600, 2200, 3000, 4000]


def inv_in_out_cubic(y):
    return (y / 4) ** (1 / 3) if y < 0.5 else 1 - (2 * (1 - y)) ** (1 / 3) / 2


for xp in levels:
    t0 = 5 + 0.2 + 2.1 * inv_in_out_cubic(xp / 4000)
    place(tick(), t0, 0.35, pan=0.2)
    place(blip(2400, 0.05, 0.3), t0, 0.06)
for i in range(6):
    place(blip(880 * 2 ** ([0, 3, 7, 10, 12, 15][i] / 12), 0.22, 0.2), 5.75 + i * 0.25, 0.22, pan=-0.5 + i * 0.2, send=0.5)
place(whoosh(0.35), 7.65, 0.5)

# 8–11 · The Coach: half-time, warm pad, typing and message UI.
place(pad([45, 52, 55, 59, 60, 64], 3.0, cutoff=1600), 8.0, 0.55, send=0.5)
for t0 in (8.0, 9.0, 9.75, 10.0):
    place(kick(0.5, 120, 42, 0.5), t0, 0.7)
for t0 in (8.5, 9.5, 10.5):
    place(clap(), t0, 0.32, send=0.6)
for i in range(12):
    place(hat(0.04, 9000), 8 + i * 0.25 + 0.125, 0.1, pan=0.5 if i % 2 else -0.5)
place(blip(1320, 0.12, 0.4), 8.45, 0.22, pan=0.4, send=0.4)  # user message sent
for i in range(10):
    place(tick(0.012), 8.9 + i * 0.045 + 0.01 * (i % 3), 0.12, pan=-0.3)  # typing
for i in range(26):
    place(tick(0.008), 9.3 + i * 0.021, 0.07, pan=-0.2)  # streaming text
for i in range(4):
    place(blip(660 * 2 ** ([0, 5, 7, 12][i] / 12), 0.1, 0.1), 9.72 + i * 0.14, 0.14, pan=0.3, send=0.4)
place(blip(1760, 0.3, 0.5), 10.4, 0.2, send=0.6)  # XP toast
place(riser(0.6), 10.4, 0.45)

# 11–13 · Warp: stutter slams, accelerating snare roll, big riser.
for t0 in (11, 11.5, 12, 12.5):
    place(kick(0.4, 180, 46, 1.2), t0, 1.0)
    place(clap(), t0, 0.5, send=0.4)
    place(bass_note(33, 0.45, 1400), t0, 0.5)
roll = []
t0 = 11.75
step = 0.125
while t0 < 12.95:
    roll.append(t0)
    t0 += step
    if t0 > 12.25:
        step = 0.0625
    if t0 > 12.7:
        step = 0.03125
for k, rt in enumerate(roll):
    place(clap(0.12), rt, 0.12 + 0.3 * k / len(roll), pan=0.2 if k % 2 else -0.2)
place(riser(2.0), 11.0, 0.7, send=0.2)

# 13–15 · Resolve: breath of silence, reverse swell, the drop, shimmer tail.
place(whoosh(0.85, rev=False), 13.05, 0.55, send=0.5)
place(boom(2.5, 110, 30), 13.9, 1.25, send=0.7)
place(kick(0.6, 200, 40, 1.5), 13.9, 1.0)
place(pad([57, 64, 67, 71, 72, 76, 81], 1.1, cutoff=4200, detune=0.006), 13.9, 0.5, send=0.9)
for i, n in enumerate((81, 84, 88, 91, 93)):
    place(blip(midi(n), 0.9, 0.0), 14.0 + i * 0.09, 0.08, pan=-0.6 + i * 0.3, send=1.0)

# ── reverb (FFT convolution with a decaying noise IR) ────────────────────────


def reverb(x, seed, decay=1.8, length=2.2):
    r = np.random.default_rng(seed)
    t = tvec(length)
    ir = r.standard_normal(len(t)) * np.exp(-t * (6.9 / decay))
    ir = onepole_lp(ir, 5000)
    ir[: int(0.012 * SR)] = 0  # pre-delay
    n = len(x) + len(ir)
    size = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return y / (np.max(np.abs(ir)) * 30)


L += reverb(SEND_L, 1)
R += reverb(SEND_R, 2)

# ── master ───────────────────────────────────────────────────────────────────
tt = np.arange(N) / SR
fade = np.clip((15.0 - tt) / 0.3, 0, 1) * np.clip(tt / 0.05, 0, 1)
L *= fade
R *= fade
peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
drive = 1.6
L = np.tanh(L / peak * drive) / np.tanh(drive)
R = np.tanh(R / peak * drive) / np.tanh(drive)
L *= 0.89
R *= 0.89

out = sys.argv[1] if len(sys.argv) > 1 else "fitcoach-film.wav"
pcm = (np.stack([L, R], axis=1) * 32767).astype("<i2")
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {out} ({DUR}s, {SR}Hz stereo)")

const PROFILE_KEY = "fitcoach_profile";

export const XP_DEEP_WORK = 20;
export const XP_BREATH = 10;

/**
 * Adds XP to the main FitCoach profile if (and only if) it already exists.
 * Only the `xp` field is modified; every other field round-trips untouched.
 * Returns true when XP was actually awarded.
 */
export function awardProfileXp(amount: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return false;
    }
    const profile = parsed as Record<string, unknown>;
    const current = typeof profile.xp === "number" ? profile.xp : 0;
    window.localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ ...profile, xp: current + amount }),
    );
    return true;
  } catch {
    return false;
  }
}

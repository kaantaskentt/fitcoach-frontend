import type { ChatMessage, UserProfile, BadgeId } from "@/types";

const PROFILE_KEY = "fitcoach_profile";
const MESSAGES_KEY = "fitcoach_messages";
const ONBOARDED_KEY = "fitcoach_onboarded";
const MAX_MESSAGES = 200;

function createDefaultProfile(): UserProfile {
  return {
    version: 1,
    sessionId: crypto.randomUUID(),
    userName: "",
    xp: 0,
    level: 0,
    streak: { current: 0, lastActiveDate: null },
    badges: {
      strength: { unlocked: false, unlockedAt: null, messageCount: 0 },
      nutrition: { unlocked: false, unlockedAt: null, messageCount: 0 },
      cardio: { unlocked: false, unlockedAt: null, messageCount: 0 },
      flexibility: { unlocked: false, unlockedAt: null, messageCount: 0 },
      recovery: { unlocked: false, unlockedAt: null, messageCount: 0 },
      consistency: { unlocked: false, unlockedAt: null, messageCount: 0 },
    },
    totalMessages: 0,
  };
}

export const storage = {
  getProfile(): UserProfile {
    if (typeof window === "undefined") return createDefaultProfile();
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) {
        const profile = createDefaultProfile();
        this.setProfile(profile);
        return profile;
      }
      return JSON.parse(raw) as UserProfile;
    } catch {
      const profile = createDefaultProfile();
      this.setProfile(profile);
      return profile;
    }
  },

  setProfile(profile: UserProfile): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },

  getMessages(): ChatMessage[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(MESSAGES_KEY);
      return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  },

  setMessages(messages: ChatMessage[]): void {
    if (typeof window === "undefined") return;
    const trimmed =
      messages.length > MAX_MESSAGES
        ? messages.slice(messages.length - MAX_MESSAGES)
        : messages;
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(trimmed));
  },

  hasOnboarded(): boolean {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(ONBOARDED_KEY) === "true";
  },

  setOnboarded(): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(ONBOARDED_KEY, "true");
  },

  getName(): string {
    const profile = this.getProfile();
    return profile.userName || "";
  },

  setName(name: string): void {
    const profile = this.getProfile();
    profile.userName = name;
    this.setProfile(profile);
  },

  profileExists(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PROFILE_KEY) !== null;
  },

  clearConversation(): string {
    const profile = this.getProfile();
    const newSessionId = crypto.randomUUID();
    profile.sessionId = newSessionId;
    this.setProfile(profile);
    localStorage.removeItem(MESSAGES_KEY);
    return newSessionId;
  },

  clearAll(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(MESSAGES_KEY);
    localStorage.removeItem(ONBOARDED_KEY);
  },

  getAllBadgeIds(): BadgeId[] {
    return [
      "strength",
      "nutrition",
      "cardio",
      "flexibility",
      "recovery",
      "consistency",
    ];
  },
};

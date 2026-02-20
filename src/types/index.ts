export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  status: "sending" | "sent" | "error";
  errorMessage?: string;
}

export type BadgeId =
  | "strength"
  | "nutrition"
  | "cardio"
  | "flexibility"
  | "recovery"
  | "consistency";

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  keywords: string[];
  requiredMessages: number;
}

export interface BadgeProgress {
  unlocked: boolean;
  unlockedAt: string | null;
  messageCount: number;
}

export interface StreakData {
  current: number;
  lastActiveDate: string | null;
}

export interface UserProfile {
  version: 1;
  sessionId: string;
  userName: string;
  xp: number;
  level: number;
  streak: StreakData;
  badges: Record<BadgeId, BadgeProgress>;
  totalMessages: number;
}

export interface GamificationState {
  profile: UserProfile;
  levelName: string;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpProgress: number;
  isReady: boolean;
}

export interface MessageResult {
  xpGained: number;
  leveledUp: boolean;
  newLevel: number | null;
  newBadges: BadgeId[];
  isNewDay: boolean;
}

export interface GamificationActions {
  recordMessage: (userMessage: string) => MessageResult;
  resetConversation: () => string;
}

export interface N8nResponse {
  success: boolean;
  data?: {
    message: string;
    sessionId: string;
  };
  error?: string;
}

import type { BadgeDefinition, BadgeId, UserProfile, MessageResult } from "@/types";

export const XP_PER_MESSAGE = 15;
export const XP_FIRST_MESSAGE_BONUS = 10;
export const XP_BADGE_UNLOCK_BONUS = 25;

export const LEVELS = [
  { name: "Beginner", xpRequired: 0 },
  { name: "Warm-Up", xpRequired: 75 },
  { name: "Getting Strong", xpRequired: 200 },
  { name: "Committed", xpRequired: 400 },
  { name: "Dedicated", xpRequired: 700 },
  { name: "Athlete", xpRequired: 1100 },
  { name: "Advanced", xpRequired: 1600 },
  { name: "Elite", xpRequired: 2200 },
  { name: "Champion", xpRequired: 3000 },
  { name: "Legend", xpRequired: 4000 },
] as const;

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "strength",
    name: "Iron Will",
    description: "Ask about strength training",
    keywords: [
      "squat", "deadlift", "bench press", "weightlifting", "barbell",
      "dumbbell", "strength", "muscle", "hypertrophy", "bulk",
      "lift", "press", "curl", "row", "pull-up", "pullup", "pushup",
      "push-up", "compound", "isolation", "reps", "sets",
      "personal record", "one rep max", "1rm",
    ],
    requiredMessages: 3,
  },
  {
    id: "nutrition",
    name: "Fuel Master",
    description: "Ask about nutrition",
    keywords: [
      "protein", "carb", "fat", "calorie", "diet", "nutrition",
      "meal", "eat", "food", "macro", "supplement", "vitamin",
      "creatine", "whey", "chicken", "rice", "vegetable",
      "fruit", "fiber", "sugar", "hydration", "water intake",
    ],
    requiredMessages: 3,
  },
  {
    id: "cardio",
    name: "Endurance Engine",
    description: "Ask about cardio",
    keywords: [
      "cardio", "running", "run ", "jog", "sprint", "hiit",
      "cycling", "bike", "swim", "rowing", "jump rope",
      "treadmill", "elliptical", "heart rate", "vo2", "endurance",
      "aerobic", "anaerobic", "interval", "marathon", "pace",
    ],
    requiredMessages: 3,
  },
  {
    id: "flexibility",
    name: "Bendy",
    description: "Ask about flexibility & yoga",
    keywords: [
      "stretch", "flexibility", "yoga", "mobility", "foam roll",
      "warm up", "cool down", "hamstring", "hip opener", "splits",
      "range of motion", "dynamic stretch", "static stretch",
      "pigeon pose", "downward dog", "sun salutation", "vinyasa",
    ],
    requiredMessages: 3,
  },
  {
    id: "recovery",
    name: "Rest Day Pro",
    description: "Ask about recovery",
    keywords: [
      "recovery", "rest day", "sleep", "soreness", "doms", "deload",
      "overtraining", "fatigue", "injury", "pain", "rehab",
      "ice bath", "massage", "foam roll", "active recovery", "burnout",
    ],
    requiredMessages: 3,
  },
  {
    id: "consistency",
    name: "Routine Builder",
    description: "Ask about workout plans & routines",
    keywords: [
      "routine", "program", "plan", "schedule", "split",
      "workout plan", "training plan", "weekly", "ppl",
      "push pull", "upper lower", "full body", "bro split",
      "periodization", "progression", "habit", "consistent",
      "frequency", "how often",
    ],
    requiredMessages: 3,
  },
];

export function calculateLevel(xp: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) return i;
  }
  return 0;
}

export function getLevelName(level: number): string {
  return LEVELS[Math.min(level, LEVELS.length - 1)].name;
}

export function getXPProgress(xp: number, level: number): {
  current: number;
  required: number;
  progress: number;
} {
  const currentThreshold = LEVELS[level].xpRequired;
  const nextThreshold =
    level < LEVELS.length - 1
      ? LEVELS[level + 1].xpRequired
      : LEVELS[level].xpRequired;

  if (level >= LEVELS.length - 1) {
    return { current: xp - currentThreshold, required: 0, progress: 1 };
  }

  const range = nextThreshold - currentThreshold;
  const filled = xp - currentThreshold;
  return {
    current: filled,
    required: range,
    progress: range > 0 ? filled / range : 1,
  };
}

export function detectTopics(message: string): BadgeId[] {
  const lower = message.toLowerCase();
  return BADGE_DEFINITIONS
    .filter((badge) => badge.keywords.some((kw) => lower.includes(kw)))
    .map((badge) => badge.id);
}

function getTodayString(): string {
  return new Date().toLocaleDateString("en-CA");
}

function getYesterday(today: string): string {
  const d = new Date(today + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA");
}

export function calculateStreak(
  currentStreak: number,
  lastActiveDate: string | null
): { streak: number; isNewDay: boolean } {
  const today = getTodayString();

  if (!lastActiveDate) {
    return { streak: 1, isNewDay: true };
  }
  if (lastActiveDate === today) {
    return { streak: currentStreak, isNewDay: false };
  }
  const yesterday = getYesterday(today);
  if (lastActiveDate === yesterday) {
    return { streak: currentStreak + 1, isNewDay: true };
  }
  return { streak: 1, isNewDay: true };
}

export function processMessage(
  profile: UserProfile,
  userMessage: string
): { updatedProfile: UserProfile; result: MessageResult } {
  const updated = structuredClone(profile);
  let xpGained = XP_PER_MESSAGE;

  // Streak
  const { streak, isNewDay } = calculateStreak(
    updated.streak.current,
    updated.streak.lastActiveDate
  );
  updated.streak.current = streak;
  updated.streak.lastActiveDate = getTodayString();

  if (isNewDay) {
    xpGained += XP_FIRST_MESSAGE_BONUS;
  }

  // Badge detection
  const detectedTopics = detectTopics(userMessage);
  const newBadges: BadgeId[] = [];

  for (const topicId of detectedTopics) {
    const badge = updated.badges[topicId];
    if (!badge.unlocked) {
      badge.messageCount += 1;
      const definition = BADGE_DEFINITIONS.find((b) => b.id === topicId);
      if (definition && badge.messageCount >= definition.requiredMessages) {
        badge.unlocked = true;
        badge.unlockedAt = new Date().toISOString();
        newBadges.push(topicId);
        xpGained += XP_BADGE_UNLOCK_BONUS;
      }
    }
  }

  // XP and level
  const previousLevel = updated.level;
  updated.xp += xpGained;
  updated.level = calculateLevel(updated.xp);
  updated.totalMessages += 1;

  const leveledUp = updated.level > previousLevel;

  return {
    updatedProfile: updated,
    result: {
      xpGained,
      leveledUp,
      newLevel: leveledUp ? updated.level : null,
      newBadges,
      isNewDay,
    },
  };
}

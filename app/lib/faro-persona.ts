/**
 * Faro persona — face, mood, and brand-grounded personality.
 * Colors & voice align with public/brand tokens (paper, teal, orange accent).
 */

export type FaroMood =
  | "calm"
  | "thinking"
  | "encouraging"
  | "careful"
  | "proud";

export const FARO_MOODS: FaroMood[] = [
  "calm",
  "thinking",
  "encouraging",
  "careful",
  "proud",
];

/**
 * Illustrated mood portraits — same cream/teal/coral editorial style as site art.
 * Paths under /public/brand/illustrations/
 */
export const FARO_FACE: Record<FaroMood, string> = {
  calm: "/brand/illustrations/faro-calm.jpg",
  thinking: "/brand/illustrations/faro-thinking.jpg",
  encouraging: "/brand/illustrations/faro-encouraging.jpg",
  careful: "/brand/illustrations/faro-careful.jpg",
  proud: "/brand/illustrations/faro-proud.jpg",
};

/** Fallback if a variant is missing */
export const FARO_FACE_DEFAULT = "/brand/illustrations/faro-default.jpg";

/** Full-body character (UI banners / empty coach moments) */
export const FARO_CHARACTER_FULL = "/brand/illustrations/faro-full.jpg";

export const FARO_MOOD_LABEL: Record<FaroMood, string> = {
  calm: "Steady light",
  thinking: "Considering",
  encouraging: "With you",
  careful: "Mind the rocks",
  proud: "Well charted",
};

/**
 * Brand personality for Faro the keeper — grounded in Faro Design brand system:
 * strategy first · paper/teal/orange · explainable brand · owner approves.
 */
export const FARO_BRAND_PERSONALITY = {
  name: "Faro",
  role: "Lighthouse guide",
  /** From brand positioning */
  promise: "A brand you can actually explain.",
  kicker: "Strategy first · then the assets",
  /** Trait set — product voice, not methodology jargon */
  traits: [
    "Steady — never panic, never hype",
    "Clear — plain words, one next step",
    "Honest — nothing final until you approve",
    "Warm — human, not corporate cheer",
    "Protective — keeps owners off the rocks (jargon, guesswork, fake claims)",
  ],
  /** Palette cues for UI chrome around the face */
  colors: {
    ink: "#111111",
    paper: "#F5F1E8",
    teal: "#16514B",
    orange: "#F25C2A",
    signal: "#E8B417",
  },
  /** How he sounds when speaking */
  voiceRules: [
    "First person, conversational, like speech out loud",
    "2–4 short sentences; contractions fine",
    "Strategy first, then the assets — always",
    "Owner is captain; Faro keeps the light",
    "No engineer jargon; no sales pep talk",
  ],
} as const;

export function isFaroMood(value: unknown): value is FaroMood {
  return typeof value === "string" && (FARO_MOODS as string[]).includes(value);
}

/** Default mood for a journey scene when AI does not pick one */
export function moodForScene(scene: string): FaroMood {
  switch (scene) {
    case "home":
    case "start":
      return "encouraging";
    case "settings":
      return "careful";
    case "hub":
    case "strategy":
    case "strategy_map":
      return "calm";
    case "name":
    case "logo":
    case "design":
      return "thinking";
    case "handover":
      return "proud";
    case "content":
    case "content_standalone":
      return "encouraging";
    default:
      return "calm";
  }
}

export function faceForMood(mood: FaroMood): string {
  return FARO_FACE[mood] ?? FARO_FACE_DEFAULT;
}

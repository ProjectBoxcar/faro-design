/**
 * Faro persona — face, mood, and brand-grounded personality.
 * Colors & voice align with public/brand tokens (paper, teal, orange accent).
 * Living agent UI uses the robot SVG (FaroPersona), not portrait photos.
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

/** Portrait paths under /public/brand */
export const FARO_FACE: Record<FaroMood, string> = {
  calm: "/brand/faro-persona-calm.jpg",
  thinking: "/brand/faro-persona-thinking.jpg",
  encouraging: "/brand/faro-persona-encouraging.jpg",
  careful: "/brand/faro-persona-careful.jpg",
  proud: "/brand/faro-persona-proud.jpg",
};

/** Fallback if a variant is missing */
export const FARO_FACE_DEFAULT = "/brand/faro-persona.jpg";

/** English defaults; UI should prefer t("coach.mood*") via moodLabelKey() */
export const FARO_MOOD_LABEL: Record<FaroMood, string> = {
  calm: "Steady light",
  thinking: "Considering",
  encouraging: "With you",
  careful: "Mind the rocks",
  proud: "Well charted",
};

/** i18n catalog key for a mood badge */
export function moodLabelKey(mood: FaroMood): string {
  const map: Record<FaroMood, string> = {
    calm: "coach.moodCalm",
    thinking: "coach.moodThinking",
    encouraging: "coach.moodEncouraging",
    careful: "coach.moodCareful",
    proud: "coach.moodProud",
  };
  return map[mood];
}

/**
 * Brand personality for Faro the keeper ΓÇö grounded in Faro Design brand system:
 * strategy first ┬╖ paper/teal/orange ┬╖ explainable brand ┬╖ owner approves.
 */
export const FARO_BRAND_PERSONALITY = {
  name: "Faro",
  role: "Lighthouse guide",
  /** From brand positioning */
  promise: "A brand you can actually explain.",
  kicker: "Strategy first ┬╖ then the assets",
  /** Trait set ΓÇö product voice, not methodology jargon */
  traits: [
    "Steady ΓÇö never panic, never hype",
    "Clear ΓÇö plain words, one next step",
    "Honest ΓÇö nothing final until you approve",
    "Warm ΓÇö human, not corporate cheer",
    "Protective ΓÇö keeps owners off the rocks (jargon, guesswork, fake claims)",
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
    "2ΓÇô4 short sentences; contractions fine",
    "Strategy first, then the assets ΓÇö always",
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
    case "call":
      return "calm";
    default:
      return "calm";
  }
}

export function faceForMood(mood: FaroMood): string {
  return FARO_FACE[mood] ?? FARO_FACE_DEFAULT;
}

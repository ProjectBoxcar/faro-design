/**
 * Classify AI/provider failures for UI and resume.
 * Never suggests switching engines (e.g. Design Studio → OpenAI).
 * @see docs/11-ai-lanes.md
 */

import type { AiLaneId } from "@/lib/ai-lanes";
import { AI_LANES } from "@/lib/ai-lanes";

export type AiFailureCode =
  | "cancelled"
  | "rate_limit"
  | "missing_strategy_key"
  | "missing_logo_key"
  | "missing_design_key"
  | "open_design_down"
  | "auth"
  | "invalid_output"
  | "blocked"
  | "unknown";

export type ClassifiedAiFailure = {
  code: AiFailureCode;
  /** Lane that was running when it failed (if known) */
  lane: AiLaneId | null;
  /** Owner-facing error line */
  message: string;
  /** What to do next — never "use a different engine" */
  hint: string;
  /** Safe to retry same engine after a wait */
  retriable: boolean;
};

function rawMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "Unknown error");
}

/**
 * Classify a thrown error for strategy / logo / design lanes.
 * Hints stay within the failed lane.
 */
export function classifyAiFailure(
  error: unknown,
  lane: AiLaneId | null = null
): ClassifiedAiFailure {
  const msg = rawMessage(error);
  const lower = msg.toLowerCase();
  const laneName = lane ? AI_LANES[lane].name : "AI";

  if (
    error instanceof Error &&
    (error.name === "GenerationCancelled" ||
      error.name === "DesignGenerationCancelled" ||
      /generation stopped|stopped by owner/i.test(msg))
  ) {
    return {
      code: "cancelled",
      lane,
      message: "Generation stopped.",
      hint: "Progress so far is kept. Resume when ready — same engine, from the last unfinished step.",
      retriable: true,
    };
  }

  if (/429|rate limit|overloaded|quota|billing|insufficient/i.test(msg)) {
    return {
      code: "rate_limit",
      lane,
      message: msg.length < 200 ? msg : `${laneName} hit a rate limit or quota.`,
      hint:
        lane === "logo"
          ? "Wait and retry Logo Workshop (OpenAI). If OpenAI is exhausted, Gemini fallback may already apply when configured — do not use Design Studio or strategy keys for logos."
          : lane === "design"
            ? "Wait and retry Design Studio (Open Design + Anthropic). Do not switch to OpenAI for identity systems or mockups."
            : "Wait a minute and resume strategy drafting. Do not use logo or Open Design keys for strategy.",
      retriable: true,
    };
  }

  if (/open design daemon is not running|daemon is not running|port 7456|od engine/i.test(msg)) {
    return {
      code: "open_design_down",
      lane: lane ?? "design",
      message: "Design helper isn’t running.",
      hint: "Restart Faro with start.bat so the design helper can start (Open Design on port 7456). Design Studio will not fall back to OpenAI or Gemini.",
      retriable: true,
    };
  }

  if (
    /no strategy api key|no strategy key|strategy api key configured/i.test(msg) ||
    (/no .*api key/i.test(msg) && lane === "strategy")
  ) {
    return {
      code: "missing_strategy_key",
      lane: "strategy",
      message: "Strategy AI key is missing.",
      hint: "Add Anthropic (recommended) under Settings → Strategy AI. Logo and Open Design keys are not used for strategy.",
      retriable: false,
    };
  }

  if (
    /no openai logo key|no logo ai key|logo workshop/i.test(msg) ||
    (/no .*api key/i.test(msg) && lane === "logo")
  ) {
    return {
      code: "missing_logo_key",
      lane: "logo",
      message: "Logo AI key is missing.",
      hint: "Add OpenAI under Settings → Logo Workshop, or GEMINI_API_KEY as fallback. Strategy Anthropic and Open Design are not used for logos.",
      retriable: false,
    };
  }

  if (
    /design studio needs an anthropic|anthropic api key for open design|byok/i.test(msg) ||
    (/no .*api key/i.test(msg) && lane === "design")
  ) {
    return {
      code: "missing_design_key",
      lane: "design",
      message: "Design Studio needs Anthropic for Open Design.",
      hint: "Save Anthropic in Strategy Settings (or an sk-ant graphics key / OPEN_DESIGN_API_KEY). Do not use OpenAI for identity systems or mockups.",
      retriable: false,
    };
  }

  if (/401|403|invalid.?api.?key|incorrect api key|authentication|unauthorized/i.test(msg)) {
    return {
      code: "auth",
      lane,
      message: msg.length < 220 ? msg : `${laneName} rejected the API key.`,
      hint:
        lane === "design"
          ? "Check the Anthropic key used for Open Design BYOK in Settings."
          : lane === "logo"
            ? "Check the OpenAI (or Gemini) logo key — not the strategy key."
            : "Check the strategy API key in Settings.",
      retriable: false,
    };
  }

  if (
    /no usable candidates|returned no|empty response|could not parse|invalid json|extractjson/i.test(
      lower
    )
  ) {
    return {
      code: "invalid_output",
      lane,
      message: msg.length < 220 ? msg : `${laneName} returned unusable output.`,
      hint: "Retry the same step. If it keeps failing, simplify the brief inputs — do not switch engines.",
      retriable: true,
    };
  }

  if (/viability|blocked|approve a logo|design system is required|missing their inputs/i.test(msg)) {
    return {
      code: "blocked",
      lane,
      message: msg.length < 280 ? msg : "This step is blocked until prerequisites are met.",
      hint: "Fix the prerequisite named in the error, then resume.",
      retriable: false,
    };
  }

  return {
    code: "unknown",
    lane,
    message: msg.length < 280 ? msg : `${laneName} failed.`,
    hint:
      lane === "design"
        ? "Try design generation again. If it fails, open Settings and check your Claude key."
        : lane === "logo"
          ? "Try logos again. If it fails, open Settings and check your OpenAI key."
          : "Resume strategy drafting. If it fails, open Settings and check your Claude key.",
    retriable: true,
  };
}

/** Single string for DB `error` columns and simple UI. */
export function formatClassifiedFailure(c: ClassifiedAiFailure): string {
  if (c.hint && !c.message.includes(c.hint.slice(0, 40))) {
    return `${c.message} — ${c.hint}`;
  }
  return c.message;
}

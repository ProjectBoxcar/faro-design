import Anthropic from "@anthropic-ai/sdk";
import { getApiKey } from "@/lib/settings";

export const MODELS = {
  // Synthesis (Brief, Concept, Manifesto, Strategic Document, Communication block,
  // Identity↔Image contrast, Design Plan). Synthesis quality is the product, and this
  // is a single-user tool, so the strongest model is the right default.
  reasoning: "claude-opus-4-8",
  // Mechanical derivation (Identity claims → survey questions, pattern tabulation).
  // Fast + cheap is the right tradeoff for low-judgment work.
  parsing: "claude-haiku-4-5-20251001",
} as const;

// True when a key is available (from the in-app Settings page or the env var).
export function hasApiKey(): boolean {
  return Boolean(getApiKey());
}

// Build a client using the resolved key. Throws if none is configured — callers
// should check hasApiKey() first and show a friendly "set it in Settings" message.
export function getClient(): Anthropic {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No Anthropic API key configured");
  return new Anthropic({ apiKey });
}

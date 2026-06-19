import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "[anthropic] ANTHROPIC_API_KEY is not set — AI-draft features will fail until you add it to .env.local"
  );
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODELS = {
  // Synthesis (Brief, Concept, Manifesto, Strategic Document, Communication block,
  // Identity↔Image contrast, Design Plan). Synthesis quality is the product, and this
  // is a single-user tool, so the strongest model is the right default.
  reasoning: "claude-opus-4-8",
  // Mechanical derivation (Identity claims → survey questions, pattern tabulation).
  // Fast + cheap is the right tradeoff for low-judgment work.
  parsing: "claude-haiku-4-5-20251001",
} as const;

export const hasApiKey = () => Boolean(process.env.ANTHROPIC_API_KEY);

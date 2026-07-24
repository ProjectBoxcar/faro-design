// Specialized synthesis prompts for flagship sections. Generic generation falls
// back when no specialist is registered.

export type SectionPromptAddon = {
  /** Extra system guidance appended after the shared Finisterra role. */
  systemAddon: string;
  /** Prefer Haiku for mechanical work when true. */
  useParsingModel?: boolean;
};

const CENTRAL_PATTERN = `
CENTRAL PATTERN OUTPUT CONTRACT:
- Return the "pattern" field as one concrete word, or at most a four-word phrase.
- Return only the pattern itself in that field. No rationale, evidence, preamble, colon, or "in one word" explanation.
- It must name the recurring truth across Reality and Identity, not a generic value such as quality or innovation.
`.trim();

const BRIEF_FIELDS = `
STRATEGIC BRIEF QUALITY BAR:
- Each field is a design compass entry, not a marketing slogan.
- Central Pattern: the single recurring truth across Reality and Identity — specific, not abstract.
- Main Tension: the conflict the brand must resolve; classification must be ability | visibility | coherence | other.
- Constraint: the real limit the design cannot ignore (budget, category, audience, medium).
- Emotional Territory: how the brand should feel when it works — sensory and human, not buzzwords.
- Must Resolve: the one design obligation the concept is judged against.
- Stay faithful to upstream facts; sharpen, don't invent commercial claims.
`.trim();

const CONCEPT_ADDON = `
BRAND CONCEPT QUALITY BAR:
- The concept is one guiding idea the whole brand is measured against.
- "statement": a short memorable phrase (not a paragraph).
- "description": 2–4 sentences that explain how the statement holds the strategy together.
- When filling eval-against-brief / filter-test tables, score honestly against each Brief field — note gaps, don't rubber-stamp.
- recognition-test: would a stranger grasp the idea in one read? Write the test answer, not fluff.
- Distillation notes can be brief process bullets; the statement + description are the product.
`.trim();

const MANIFESTO_ADDON = `
MANIFESTO QUALITY BAR:
- First-person brand voice (we/I as the brand), not a third-person brand description.
- Short, speakable, emotionally true to Personality + Tone + Concept.
- "text" is the manifesto itself. "construction" and "evaluation" are internal notes (method, not client copy).
- No generic startup poetry; every line should only be true for THIS brand.
`.trim();

const COMM_PURPOSE = `
PURPOSE: one clear sentence of why the brand exists for people (not "to make money").
Derive from the Golden Circle. Concrete verbs; no mission-statement sludge.
`.trim();

const COMM_VALUES = `
VALUES: 3–5 ordered values the brand actually lives. Table rows with clear value names and short proofs.
Prefer values backed by concrete evidence from the owner's answers; otherwise mark honestly.
`.trim();

const COMM_PERSONALITY = `
PERSONALITY: human traits the brand would have if it were a person. Specific adjectives + brief behavioral notes.
Avoid "innovative / passionate / professional" unless the upstream forces them with evidence.
`.trim();

const COMM_TONE = `
TONE OF VOICE: how the brand sounds in writing and speech. Dos and don'ts, sample phrases if fields allow.
Must be consistent with Personality and usable by a designer or copywriter tomorrow.
`.trim();

const COMM_PROMISE = `
BRAND PROMISE: the single commitment customers can hold the brand to. One sentence, testable, not a tagline contest entry.
`.trim();

const BY_KEY: Record<string, SectionPromptAddon> = {
  "brief.central-pattern": { systemAddon: `${BRIEF_FIELDS}\n\n${CENTRAL_PATTERN}` },
  "brief.main-tension": { systemAddon: BRIEF_FIELDS },
  "brief.constraint": { systemAddon: BRIEF_FIELDS },
  "brief.emotional-territory": { systemAddon: BRIEF_FIELDS },
  "brief.must-resolve": { systemAddon: BRIEF_FIELDS },
  concept: { systemAddon: CONCEPT_ADDON },
  manifesto: { systemAddon: MANIFESTO_ADDON },
  "communication.purpose": { systemAddon: COMM_PURPOSE },
  "communication.values": { systemAddon: COMM_VALUES },
  "communication.personality": { systemAddon: COMM_PERSONALITY },
  "communication.tone": { systemAddon: COMM_TONE },
  "communication.promise": { systemAddon: COMM_PROMISE },
};

export function getSectionPrompt(sectionKey: string): SectionPromptAddon | null {
  return BY_KEY[sectionKey] ?? null;
}

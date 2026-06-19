# 05 — AI Architecture

## Principle: hybrid, never autonomous

The methodology assigns synthesis to "the designer". The app lets Claude **draft** those sections;
the designer always reviews and edits. AI output is never auto-committed and never shown to the
client until the designer accepts it.

## Model choice

| Use | Model | Why |
|---|---|---|
| Synthesis (Brief, Concept, Manifesto, Strategic Document, Communication block, Contrast, Design Plan) | **Claude Opus 4.8** `claude-opus-4-8` | This is the product. Strategy writing rewards the strongest model; single-user volume makes per-call cost irrelevant. |
| Mechanical derivation (Identity claims → survey questions; pattern frequency tabulation) | **Haiku 4.5** `claude-haiku-4-5-20251001` | Cheap, fast, low-judgment. |

Default lives in `settings.default_model` and `lib/anthropic.ts` `MODELS` (mirrors Gut's wrapper).
Configurable per call. Use the official `@anthropic-ai/sdk`. **Always read `claude-api` skill
reference before touching model ids / params** — don't hardcode from memory.

## Prompt structure

Each synthesis section has a prompt module in `lib/prompts/<section>.ts` returning a system prompt +
a user message builder. Shared scaffolding:

1. **Static system prompt** (cached): the Finisterra methodology definition for this section — what it
   is, the resolver, the quality bar, the exact output fields, and the relevant evaluation framework
   (e.g. the Brief prompt embeds "the Concept will be scored against these 5 fields"). This is large
   and identical across projects ⇒ **prompt caching enabled** (`cache_control` on the system block).
2. **Dynamic user message**: the upstream section values this draft `reads` (per the dependency graph
   in `02-methodology-model.md`), serialized as labeled context. Only the declared `reads` are sent —
   this enforces provenance and keeps the client/designer boundary clean.
3. **Output contract**: structured (Zod-validated where the section has discrete fields, e.g. the
   Brief's 5 fields, the Concept's sub-objects). Free-prose sections (Manifesto) return text.

## Provenance & traceability

Every generation records its `reads` (the upstream section ids) in `ai_generations`. The UI shows
"Drafted from: Identity, Image contrast, Brief" so the designer can trace and trust a draft. This
mirrors the methodology's rule that synthesis must be **traceable** back to the pillars.

## Guardrails

- **Dependency check before generate.** A section's "Generate draft" button is disabled until its
  `reads` are non-empty. No fabricating upstream content.
- **No client exposure.** Designer-internal sections (viability gate) are never sent to the client
  share view and never used as client-facing context.
- **Editable + diffable.** Accepting a draft writes to `sections.value` and sets `ai_generated=true`;
  a manual edit clears the flag. Prior drafts remain in `ai_generations` for compare/regenerate.
- **Conversational concept distillation (later).** The Brand Concept's 6-step distillation is a good
  fit for a short guided chat rather than one-shot generation — deferred to after v1 core. See roadmap.

## Cost

Single-user. Estimated a few dollars per full engagement on Opus. No batching needed.

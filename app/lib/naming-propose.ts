/**
 * Brand name workshop — after strategy, before logos.
 * Working titles from Start are fine; we only propose when the name looks temporary.
 */
import "server-only";
// Strategy lane only (Anthropic / Settings strategy key) — same as Express.
// Never logo OpenAI or Open Design. See docs/11-ai-lanes.md
import { generateStrategyText, MODELS, hasApiKey } from "@/lib/ai";
import { extractJson } from "@/lib/json";
import {
  getProject,
  getSectionRow,
  insertEvaluation,
  listEvaluations,
  saveSection,
} from "@/lib/queries";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isGenericBrandName } from "@/lib/naming-generic";

export { isGenericBrandName } from "@/lib/naming-generic";

export function hasConfirmedBrandName(projectId: string): boolean {
  return listEvaluations(projectId, "naming").some(
    (e) => e.verdict === "pass" && Boolean(e.subject?.trim())
  );
}

/** Show name workshop only when name looks temporary and owner hasn't confirmed one yet. */
export function needsNameWorkshop(projectId: string): boolean {
  if (hasConfirmedBrandName(projectId)) return false;
  const name = getProject(projectId)?.name?.trim() || "";
  return isGenericBrandName(name);
}

function fieldString(value: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!value) return "";
  for (const k of keys) {
    const v = value[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function namingContext(projectId: string): string {
  const keys = [
    "concept",
    "brief.central-pattern",
    "brief.main-tension",
    "brief.emotional-territory",
    "brief.must-resolve",
    "reality.differentiator",
    "reality.ideal-client",
    "reality.service",
    "communication.personality",
    "communication.promise",
  ] as const;
  const parts: string[] = [];
  for (const key of keys) {
    const row = getSectionRow(projectId, key);
    if (!row?.value) continue;
    if (row.status === "empty") continue;
    parts.push(`### ${key}\n${JSON.stringify(row.value)}`);
  }
  return parts.join("\n\n");
}

export type NameCandidate = {
  name: string;
  why: string;
  style: string;
};

export async function proposeBrandNames(projectId: string): Promise<NameCandidate[]> {
  const project = getProject(projectId);
  if (!project) throw new Error("Project not found");
  if (!hasApiKey()) {
    throw new Error(
      "Add your Claude key in Settings (Brand strategy) before suggesting names. Logos use a different key."
    );
  }

  const working = project.name.trim();
  const context = namingContext(projectId);
  const concept = fieldString(
    getSectionRow(projectId, "concept")?.value as Record<string, unknown>,
    "statement",
    "description"
  );

  const system = `You are a brand naming strategist. Propose distinctive, speakable brand names grounded in a finished strategy.
Rules:
- Names must fit the concept and emotional territory, not generic category labels.
- Prefer 1–3 words, easy to say and spell, not awkward portmanteaus unless brilliant.
- Avoid generic words alone (Studio, Labs, Solutions, Digital, Pro, Hub) as the whole name.
- Avoid copying famous brands.
- Respond with ONLY one JSON object.`;

  const user = `Working title the owner used: "${working}" (treat as temporary — do not just polish it unless a small tweak makes it excellent).

CONCEPT SIGNAL: ${concept || "(see context)"}

STRATEGY CONTEXT:
${context || "(minimal context — still propose from what exists)"}

Propose EXACTLY 5 candidates:
{"candidates":[{"name":"...","why":"one sentence why it fits this strategy","style":"short label e.g. invented word | compound | real word | phrase"}]}`;

  // Same provider + model as strategy synthesis (default Claude / strategy Settings).
  const { text } = await generateStrategyText({
    model: MODELS.reasoning,
    maxTokens: 2048,
    system,
    messages: [{ role: "user", content: user }],
    cacheSystem: false,
  });

  const parsed = extractJson(text) as { candidates?: NameCandidate[] };
  const list = (parsed.candidates ?? [])
    .map((c) => ({
      name: String(c?.name ?? "").trim(),
      why: String(c?.why ?? "").trim(),
      style: String(c?.style ?? "").trim(),
    }))
    .filter((c) => c.name.length >= 2)
    .slice(0, 5);

  if (list.length === 0) {
    throw new Error("Couldn't propose usable names — try again.");
  }

  // Cache proposals on the methodology section for the page to re-read.
  saveSection({
    projectId,
    key: "naming.exploration",
    value: {
      candidates: list.map((c) => ({
        name: c.name,
        rationale: c.why,
        style: c.style,
      })),
      workingTitle: working,
    },
    status: "draft",
    aiGenerated: true,
  });

  return list;
}

export function readCachedNameProposals(projectId: string): NameCandidate[] {
  const row = getSectionRow(projectId, "naming.exploration");
  const v = row?.value as Record<string, unknown> | undefined;
  const raw = v?.candidates;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const o = item as Record<string, unknown>;
      return {
        name: String(o.name ?? "").trim(),
        why: String(o.rationale ?? o.why ?? "").trim(),
        style: String(o.style ?? "").trim(),
      };
    })
    .filter((c) => c.name.length >= 2);
}

/** Confirm a brand name for logos (updates project + naming evaluation). */
export function confirmBrandName(
  projectId: string,
  name: string,
  source: "chosen" | "kept_working_title"
): { name: string } {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 2) throw new Error("Pick a name with at least two characters.");

  const project = getProject(projectId);
  if (!project) throw new Error("Project not found");

  db.update(projects)
    .set({ name: clean, updated_at: new Date() })
    .where(eq(projects.id, projectId))
    .run();

  insertEvaluation({
    projectId,
    type: "naming",
    subject: clean,
    scores: [
      {
        key: "source",
        label: "How it was set",
        result: "pass",
        notes:
          source === "kept_working_title"
            ? "Owner kept the working title for logos."
            : "Owner chose this name after strategy.",
      },
    ],
    verdict: "pass",
  });

  saveSection({
    projectId,
    key: "naming.presentation",
    value: {
      chosen: clean,
      source,
      workingTitle: project.name,
    },
    status: "complete",
    aiGenerated: false,
  });

  return { name: clean };
}

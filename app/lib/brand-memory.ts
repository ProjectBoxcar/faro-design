import "server-only";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { brand_memory, assets as assetsTable } from "@/lib/db/schema";
import { getProject, getSectionRow, listStudioAssets } from "@/lib/queries";
import { listAssets } from "@/lib/design";

export type MemoryEngine = "strategy" | "logo" | "design" | "all";
export type MemoryKind =
  | "strategy_outcome"
  | "logo_preference"
  | "design_preference"
  | "taste"
  | "package";

export type BrandMemoryRow = typeof brand_memory.$inferSelect;

function firstString(value: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!value) return "";
  for (const k of keys) {
    const v = value[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function sectionSnippet(projectId: string, key: string, max = 280): string {
  const row = getSectionRow(projectId, key);
  if (!row?.value) return "";
  const v = row.value as Record<string, unknown>;
  const text =
    firstString(v, "statement", "text", "summary", "description", "concept", "pattern", "taste") ||
    JSON.stringify(v).slice(0, max);
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function insertMemory(input: {
  projectId: string;
  projectName: string;
  engine: MemoryEngine;
  kind: MemoryKind;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
  weight?: number;
}): void {
  const body = input.body.trim();
  if (!body) return;

  // De-dupe same project + kind + engine (refresh on re-approve).
  db.delete(brand_memory)
    .where(
      and(
        eq(brand_memory.project_id, input.projectId),
        eq(brand_memory.kind, input.kind),
        eq(brand_memory.engine, input.engine)
      )
    )
    .run();

  db.insert(brand_memory)
    .values({
      id: nanoid(),
      project_id: input.projectId,
      project_name: input.projectName,
      engine: input.engine,
      kind: input.kind,
      title: input.title.slice(0, 200),
      body: body.slice(0, 4000),
      meta: input.meta ?? {},
      weight: input.weight ?? 1,
    })
    .run();
}

/** After strategy approve: remember concept, brief, and design taste. */
export function recordStrategyLearning(projectId: string): void {
  const project = getProject(projectId);
  if (!project) return;

  const concept = sectionSnippet(projectId, "concept", 400);
  const pattern = sectionSnippet(projectId, "brief.central-pattern", 220);
  const territory = sectionSnippet(projectId, "brief.emotional-territory", 220);
  const tension = sectionSnippet(projectId, "brief.main-tension", 180);
  const plan = sectionSnippet(projectId, "design-plan", 300);
  const tasteRow = getSectionRow(projectId, "intake.taste");
  const taste =
    firstString(tasteRow?.value as Record<string, unknown> | undefined, "taste") ||
    sectionSnippet(projectId, "system.color", 160);

  const parts = [
    concept && `Concept: ${concept}`,
    pattern && `Central pattern: ${pattern}`,
    territory && `Emotional territory: ${territory}`,
    tension && `Main tension: ${tension}`,
    plan && `Design plan: ${plan}`,
  ].filter(Boolean);

  if (parts.length === 0) return;

  insertMemory({
    projectId,
    projectName: project.name,
    engine: "strategy",
    kind: "strategy_outcome",
    title: `${project.name} — strategy that shipped`,
    body: parts.join("\n"),
    meta: { concept, pattern, territory },
    weight: 3,
  });

  if (taste.trim()) {
    insertMemory({
      projectId,
      projectName: project.name,
      engine: "all",
      kind: "taste",
      title: `${project.name} — design taste`,
      body: `Owner taste preferences that guided the brand: ${taste.trim()}`,
      meta: { taste: taste.trim() },
      weight: 2,
    });
  }
}

/** After logo approve: remember direction, label, and critic verdict. */
export function recordLogoLearning(projectId: string, assetId: string): void {
  const project = getProject(projectId);
  if (!project) return;
  const asset = listStudioAssets(projectId, "logo").find((a) => a.id === assetId);
  if (!asset) return;

  const direction = asset.direction?.trim() || "";
  const label = asset.label?.trim() || "Approved logo";
  const fonts = ((asset.payload?.tokens as { fonts?: string[] } | undefined)?.fonts ?? []).slice(
    0,
    4
  );

  const body = [
    `Approved logo for ${project.name}: “${label}”.`,
    direction && `Direction: ${direction}`,
    fonts.length && `Lettering fonts: ${fonts.join(", ")}`,
    "Prefer marks in this spirit for similar businesses: clear, strategy-led, not generic AI chrome.",
  ]
    .filter(Boolean)
    .join(" ");

  insertMemory({
    projectId,
    projectName: project.name,
    engine: "logo",
    kind: "logo_preference",
    title: `${project.name} — approved logo “${label}”`,
    body,
    meta: { label, direction, fonts, assetId },
    weight: 4,
  });
}

/** After choosing a final design system / application. */
export function recordDesignLearning(
  projectId: string,
  assetId: string,
  kind: "design_system" | "landing_page" | "deck" = "design_system"
): void {
  const project = getProject(projectId);
  if (!project) return;
  const asset = listAssets(projectId).find((a) => a.id === assetId);
  if (!asset) return;

  const html = asset.html ?? "";
  const hexes = [...html.matchAll(/#([0-9a-fA-F]{6})\b/g)]
    .map((m) => `#${m[1].toUpperCase()}`)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 8);
  const fonts = [...html.matchAll(/font-family:\s*([^;}{]+)/gi)]
    .map((m) => m[1].replace(/['"]/g, "").split(",")[0].trim())
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .slice(0, 4);

  const body = [
    `Owner selected ${kind.replace(/_/g, " ")} proposal ${asset.variant ?? ""} for ${project.name}.`,
    hexes.length && `Palette signals: ${hexes.join(", ")}`,
    fonts.length && `Type signals: ${fonts.join(", ")}`,
    "Use similar restraint and system clarity for related categories; stay brief-faithful.",
  ]
    .filter(Boolean)
    .join(" ");

  insertMemory({
    projectId,
    projectName: project.name,
    engine: "design",
    kind: "design_preference",
    title: `${project.name} — selected ${kind} ${asset.variant ?? ""}`.trim(),
    body,
    meta: { kind, variant: asset.variant, hexes, fonts, assetId },
    weight: kind === "design_system" ? 4 : 2,
  });
}

/** After full package publish: high-weight package-level learning. */
export function recordPackageLearning(projectId: string): void {
  const project = getProject(projectId);
  if (!project) return;

  const concept = sectionSnippet(projectId, "concept", 240);
  const logo = listStudioAssets(projectId, "logo").find((a) => a.status === "approved");
  const identity = listAssets(projectId).find(
    (a) => a.kind === "design_system" && a.selected
  );

  const body = [
    `Finished brand package for ${project.name}.`,
    concept && `Strategy spine: ${concept}`,
    logo && `Logo: “${logo.label}”${logo.direction ? ` — ${logo.direction}` : ""}`,
    identity && `Identity system variant ${identity.variant ?? "final"} selected.`,
    "Treat this as a successful end-to-end reference for similar offerings and tastes.",
  ]
    .filter(Boolean)
    .join(" ");

  insertMemory({
    projectId,
    projectName: project.name,
    engine: "all",
    kind: "package",
    title: `${project.name} — finished brand package`,
    body,
    meta: {
      logoId: logo?.id,
      logoLabel: logo?.label,
      identityId: identity?.id,
      identityVariant: identity?.variant,
    },
    weight: 5,
  });

  // Also refresh engine-specific snapshots if present.
  recordStrategyLearning(projectId);
  if (logo) recordLogoLearning(projectId, logo.id);
  if (identity) recordDesignLearning(projectId, identity.id, "design_system");
}

/** Fetch ranked learnings for an engine, excluding the current project. */
export function listBrandMemory(
  engine: MemoryEngine,
  opts: { excludeProjectId?: string; limit?: number } = {}
): BrandMemoryRow[] {
  const limit = opts.limit ?? 8;
  try {
    const rows = db
      .select()
      .from(brand_memory)
      .where(
        and(
          or(eq(brand_memory.engine, engine), eq(brand_memory.engine, "all")),
          opts.excludeProjectId
            ? or(
                sql`${brand_memory.project_id} IS NULL`,
                ne(brand_memory.project_id, opts.excludeProjectId)
              )
            : undefined
        )
      )
      .orderBy(desc(brand_memory.weight), desc(brand_memory.created_at))
      .limit(limit * 2)
      .all();

    // Soft rank: weight then recency already applied; cap.
    return rows.slice(0, limit);
  } catch (e) {
    // Table may not exist until migration runs.
    console.warn("[brand-memory] list failed:", e);
    return [];
  }
}

/** Prompt block for generation — empty string when no memory yet. */
export function formatMemoryForPrompt(
  engine: MemoryEngine,
  opts: { excludeProjectId?: string; limit?: number } = {}
): string {
  const rows = listBrandMemory(engine, opts);
  if (rows.length === 0) return "";

  const lines = rows.map((r, i) => {
    const name = r.project_name ? ` (${r.project_name})` : "";
    return `${i + 1}. [${r.kind}${name}] ${r.title}\n   ${r.body}`;
  });

  return [
    "LEARNINGS FROM PAST PROJECTS (owner-approved outcomes — use as soft guidance, never invent facts about the CURRENT brand):",
    ...lines,
    "Prefer patterns that matched owner taste and strategy fidelity. Do not copy prior brand names or claims into this project.",
  ].join("\n");
}

export function brandMemoryStats(): { total: number; byEngine: Record<string, number> } {
  try {
    const total =
      (db.select({ c: sql<number>`count(*)` }).from(brand_memory).get()?.c as number) ?? 0;
    const byEngine: Record<string, number> = {};
    for (const eng of ["strategy", "logo", "design", "all"] as MemoryEngine[]) {
      byEngine[eng] =
        (db
          .select({ c: sql<number>`count(*)` })
          .from(brand_memory)
          .where(eq(brand_memory.engine, eng))
          .get()?.c as number) ?? 0;
    }
    return { total, byEngine };
  } catch {
    return { total: 0, byEngine: {} };
  }
}

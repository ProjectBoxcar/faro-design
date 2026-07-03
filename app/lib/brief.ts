import "server-only";
import { getSectionRow, listEvaluations, type Project } from "@/lib/queries";
import { getSection, type Section, type Field } from "@/lib/methodology";

// The handover brief compiled for a project: grouped, complete-only, no internal
// sections. Single source for the share page and every download format.

export const GROUPS: { heading: string; keys: string[] }[] = [
  { heading: "Brand Concept", keys: ["concept"] },
  {
    heading: "Strategic Brief",
    keys: [
      "brief.central-pattern",
      "brief.main-tension",
      "brief.constraint",
      "brief.emotional-territory",
      "brief.must-resolve",
    ],
  },
  { heading: "Manifesto", keys: ["manifesto"] },
  {
    // The voice the designer must design FOR — it belongs before the plan that
    // tells them what to build.
    heading: "How the brand speaks",
    keys: [
      "communication.purpose",
      "communication.values",
      "communication.personality",
      "communication.tone",
      "communication.promise",
      "image.key-finding",
    ],
  },
  {
    // The concrete scope a designer needs that the strategic brief omits:
    // what's offered (and how broad), pricing tier, where it lives, and what exists.
    heading: "Practical scope",
    keys: [
      "reality.ideal-client",
      "reality.service",
      "reality.service-structure",
      "reality.acquisition-channels",
      "reality.brand-architecture",
      "audit",
    ],
  },
  // The actionable conclusion — the handoff ends on what to do.
  { heading: "Design Plan", keys: ["design-plan"] },
];

export type Value = Record<string, unknown>;
export type CompiledSection = { section: Section; value: Value };
export type CompiledGroup = { heading: string; sections: CompiledSection[] };

export function isNonEmptyValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) {
    if (v.length === 0) return false;
    return v.some((item) => {
      if (typeof item === "string") return item.trim().length > 0;
      if (item && typeof item === "object") {
        return Object.values(item as Record<string, unknown>).some(
          (cell) => typeof cell === "string" && cell.trim().length > 0
        );
      }
      return false;
    });
  }
  return false;
}

// A section is part of the brief only if visible, has fields, and at least one is non-empty.
function hasContent(section: Section, value: Value): boolean {
  return (section.fields ?? []).some((f) => isNonEmptyValue(value[f.id]));
}

// The brief is the deliverable, not the working file. Methodology process —
// self-evaluations, construction rationale, survey evidence columns, authoring
// hints in labels like "(3-5, ordered by survey)" — stays in the app.
const BRIEF_OMIT_FIELDS: Record<string, string[]> = {
  concept: ["distillation", "eval-against-brief", "filter-test", "recognition-test"],
  manifesto: ["construction", "evaluation"],
  "brief.main-tension": ["classification"],
};
const BRIEF_OMIT_COLUMNS: Record<string, Record<string, string[]>> = {
  "communication.values": { values: ["confirmed-by"] },
};

// "Concept statement (the phrase)" → "Concept statement": trailing parentheses
// are authoring instructions, not content.
const stripHint = (label: string) => label.replace(/\s*\([^)]*\)\s*$/, "");

function trimForBrief(section: Section): Section {
  const omit = new Set(BRIEF_OMIT_FIELDS[section.id] ?? []);
  const colOmit = BRIEF_OMIT_COLUMNS[section.id] ?? {};
  return {
    ...section,
    name: stripHint(section.name),
    fields: (section.fields ?? [])
      .filter((f) => !omit.has(f.id))
      .map((f) => ({
        ...f,
        label: stripHint(f.label),
        columns: f.columns?.filter((c) => !(colOmit[f.id] ?? []).includes(c.id)),
      })),
  };
}

// Only reviewed steps reach the designer — a half-finished draft is worse than
// an absent section (08-handover-spec).
export function compileBrief(project: Project): CompiledGroup[] {
  const compileKeys = (keys: string[]) =>
    keys
      .map((key) => {
        const section = getSection(key);
        if (!section || section.internal) return null;
        const row = getSectionRow(project.id, key);
        if (!row || row.status !== "complete") return null;
        const value = (row.value ?? {}) as Value;
        const trimmed = trimForBrief(section);
        if (!hasContent(trimmed, value)) return null;
        return { section: trimmed, value };
      })
      .filter((x): x is CompiledSection => x !== null);

  const groups: CompiledGroup[] = GROUPS.map((g) => ({
    heading: g.heading,
    sections: compileKeys(g.keys),
  }));

  annotatePlanWithSuggestions(project, groups);
  return groups;
}

// ---- Inline suggestions -----------------------------------------------------
// Design-phase results the owner reached (chosen name, territory, palette…)
// are folded into the Design Plan's own rows — "Name | Does not exist.
// App suggestion: 'Faro' … | create | High" — so the plan stays one document:
// what to create, and the direction already explored. Short summaries only;
// the full working detail stays in the app.

const cap = (s: string, n = 260) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const firstSentence = (s: string) => cap((s.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0] ?? s).trim());

// Summarize a completed result section into one line: first sentence of the
// named text field, or "first col (+ second col)" of the named table's rows.
function summarize(project: Project, key: string, field: string, secondCol = false): string | null {
  const row = getSectionRow(project.id, key);
  if (!row || row.status !== "complete" || !row.value) return null;
  const v = (row.value as Value)[field];
  if (typeof v === "string") return v.trim() ? firstSentence(v) : null;
  if (Array.isArray(v)) {
    const cols = getSection(key)?.fields?.find((f) => f.id === field)?.columns ?? [];
    if (!cols.length) return null;
    const items = (v as Record<string, string>[])
      .map((r) => {
        const a = String(r[cols[0].id] ?? "").trim();
        const b = secondCol && cols[1] ? String(r[cols[1].id] ?? "").trim() : "";
        return [a, b].filter(Boolean).join(" ");
      })
      .filter(Boolean);
    return items.length ? cap(items.join("; ")) : null;
  }
  return null;
}

function annotatePlanWithSuggestions(project: Project, groups: CompiledGroup[]): void {
  const plan = groups
    .find((g) => g.heading === "Design Plan")
    ?.sections.find((s) => s.section.id === "design-plan");
  if (!plan) return;

  // Chosen name folds in its availability verdict, so "create a name" carries
  // both the direction and its reality check in one cell.
  let name = summarize(project, "naming.presentation", "chosen");
  if (name) {
    const check = listEvaluations(project.id, "naming").find((e) => e.subject && name!.includes(e.subject));
    if (check) {
      const note = check.scores?.find((s) => s.key === "summary")?.notes;
      name += ` Availability check: ${check.verdict}${note ? ` — ${firstSentence(note)}` : ""}.`;
    }
  }

  const suggestions: { rowMatch: RegExp; text: string | null }[] = [
    { rowMatch: /^name\b/i, text: name },
    { rowMatch: /^logo\b/i, text: summarize(project, "system.logo-definition", "versions", true) },
    { rowMatch: /^color/i, text: summarize(project, "system.color", "palette", true) },
    { rowMatch: /^typography/i, text: summarize(project, "system.typography", "families") },
    { rowMatch: /^system elements/i, text: summarize(project, "system.visual-elements", "elements") },
    { rowMatch: /^photography/i, text: summarize(project, "system.photography", "direction") },
  ];
  const territory = summarize(project, "territory.definition", "chosen");

  // Never mutate the row object drizzle handed us — annotate a deep copy.
  const value = structuredClone(plan.value) as Record<string, unknown>;
  const tables = (getSection("design-plan")?.fields ?? []).filter((f) => f.type === "table");
  for (const field of tables) {
    const rows = value[field.id];
    if (!Array.isArray(rows)) continue;
    const stateCol = (field.columns ?? []).find((c) => c.id === "auditState" || c.id === "state")?.id;
    if (!stateCol) continue;
    const firstCol = field.columns![0].id;
    for (const r of rows as Record<string, string>[]) {
      const label = String(r[firstCol] ?? "");
      const hit = suggestions.find((s) => s.text && s.rowMatch.test(label));
      if (hit) {
        const state = String(r[stateCol] ?? "").trim();
        r[stateCol] = `${state ? state.replace(/\.?$/, ". ") : ""}App suggestion: ${hit.text}`;
      }
    }
    // The territory has no plan row of its own — it frames all visual work, so
    // it leads the visual-identity table as an explicitly suggested row.
    if (field.id === "visual-identity" && territory) {
      (rows as Record<string, string>[]).unshift({
        component: "Visual territory",
        auditState: `App suggestion: ${territory}`,
        action: "create",
        priority: "High",
      });
    }
  }
  plan.value = value as Value;
}

// ---- Markdown ----

function fieldToMarkdown(field: Field, value: unknown): string {
  if (field.type === "list") {
    const items = Array.isArray(value)
      ? value.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
    return `**${field.label}**\n${items.map((i) => `- ${i}`).join("\n")}`;
  }
  if (field.type === "table") {
    const cols = field.columns ?? [];
    const rows = Array.isArray(value)
      ? value.filter(
          (x): x is Record<string, string> =>
            Boolean(x) && typeof x === "object" && !Array.isArray(x)
        )
      : [];
    const header = `| ${cols.map((c) => c.label).join(" | ")} |`;
    const divider = `| ${cols.map(() => "---").join(" | ")} |`;
    const body = rows
      .map((row) => `| ${cols.map((c) => String(row[c.id] ?? "").replace(/\n/g, " ")).join(" | ")} |`)
      .join("\n");
    return `**${field.label}**\n${header}\n${divider}\n${body}`;
  }
  const text = typeof value === "string" ? value.trim() : "";
  return `**${field.label}**\n${text}`;
}

export function buildMarkdown(project: Project, compiled: CompiledGroup[]): string {
  const lines: string[] = [`# ${project.name}`];
  if (project.client_name) lines.push(`_Prepared for ${project.client_name}_`);
  lines.push("A brand brief prepared for the design team.");

  for (const group of compiled) {
    if (group.sections.length === 0) continue;
    lines.push("", `# ${group.heading}`);
    for (const { section, value } of group.sections) {
      lines.push("", `## ${section.name}`);
      for (const field of section.fields ?? []) {
        if (!isNonEmptyValue(value[field.id])) continue;
        lines.push("", fieldToMarkdown(field, value[field.id]));
      }
    }
  }
  return lines.join("\n");
}

// ---- Standalone HTML (also what the Word download wraps) ----

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fieldToHtml(field: Field, value: unknown): string {
  const label = `<div class="label">${esc(field.label)}</div>`;
  if (field.type === "list") {
    const items = Array.isArray(value)
      ? value.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
    return `${label}<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  }
  if (field.type === "table") {
    const cols = field.columns ?? [];
    const rows = Array.isArray(value)
      ? value.filter(
          (x): x is Record<string, string> =>
            Boolean(x) && typeof x === "object" && !Array.isArray(x)
        )
      : [];
    return `${label}<table><thead><tr>${cols.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${rows
      .map((r) => `<tr>${cols.map((c) => `<td>${esc(String(r[c.id] ?? ""))}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>`;
  }
  const text = typeof value === "string" ? value.trim() : "";
  return `${label}${text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`)
    .join("")}`;
}

export function buildHtml(project: Project, compiled: CompiledGroup[]): string {
  const body = compiled
    .filter((g) => g.sections.length > 0)
    .map(
      (g) =>
        `<section><h2>${esc(g.heading)}</h2>${g.sections
          .map(
            ({ section, value }) =>
              `<article><h3>${esc(section.name)}</h3>${(section.fields ?? [])
                .filter((f) => isNonEmptyValue(value[f.id]))
                .map((f) => fieldToHtml(f, value[f.id]))
                .join("")}</article>`
          )
          .join("")}</section>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(project.name)} — Brand Brief</title>
<style>
body{font-family:Georgia,'Times New Roman',serif;max-width:46rem;margin:0 auto;padding:3rem 1.5rem;color:#1a1a1a;line-height:1.6}
header{border-bottom:1px solid #ddd;padding-bottom:1.5rem;margin-bottom:2rem}
h1{font-size:2.6rem;margin:0 0 .3rem;font-weight:500}
h2{font-size:.8rem;text-transform:uppercase;letter-spacing:.12em;color:#888;margin:2.6rem 0 1rem;font-family:Arial,Helvetica,sans-serif}
h3{font-size:1.4rem;margin:1.6rem 0 .5rem;font-weight:500}
.label{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#999;margin:1rem 0 .25rem;font-family:Arial,Helvetica,sans-serif}
.sub{color:#777;margin:0}
table{border-collapse:collapse;width:100%;font-size:.9rem;font-family:Arial,Helvetica,sans-serif}
th,td{border:1px solid #ddd;padding:.45rem .6rem;text-align:left;vertical-align:top}
th{background:#f6f6f4;font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:#777}
ul{margin:.3rem 0;padding-left:1.3rem}
p{margin:.3rem 0}
</style></head><body>
<header><h1>${esc(project.name)}</h1>${project.client_name ? `<p class="sub">${esc(project.client_name)}</p>` : ""}<p class="sub">A brand brief prepared for the design team.</p></header>
${body}
</body></html>`;
}

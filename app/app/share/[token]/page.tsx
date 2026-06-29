import { notFound } from "next/navigation";
import { getProjectByShareToken, getSectionRow } from "@/lib/queries";
import { getSection, type Section, type Field } from "@/lib/methodology";
import { SectionReadout } from "@/components/SectionReadout";
import { CopyMarkdownButton } from "@/components/CopyMarkdownButton";

export const dynamic = "force-dynamic";

// The handover brief, grouped. Each entry is a section group with its member keys.
const GROUPS: { heading: string; keys: string[] }[] = [
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
  { heading: "Design Plan", keys: ["design-plan"] },
  {
    heading: "The strategy behind it",
    keys: [
      "communication.purpose",
      "communication.values",
      "communication.personality",
      "communication.tone",
      "communication.promise",
      "image.key-finding",
    ],
  },
];

type Value = Record<string, unknown>;

function isNonEmptyValue(v: unknown): boolean {
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

// ---- Markdown rendering (built server-side, mirrors the visual readout) ----

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
      .map((row) => `| ${cols.map((c) => (row[c.id] ?? "").replace(/\n/g, " ")).join(" | ")} |`)
      .join("\n");
    return `**${field.label}**\n${header}\n${divider}\n${body}`;
  }
  const text = typeof value === "string" ? value.trim() : "";
  return `**${field.label}**\n${text}`;
}

function buildMarkdown(
  brandName: string,
  clientName: string | null,
  compiled: { heading: string; sections: { section: Section; value: Value }[] }[]
): string {
  const lines: string[] = [`# ${brandName}`];
  if (clientName) lines.push(`_Prepared for ${clientName}_`);
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

export default async function ShareBriefPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = getProjectByShareToken(token);
  if (!project || !project.share_token) notFound();

  // Compile each group's renderable sections (visible, non-internal, non-empty).
  const compiled = GROUPS.map((group) => {
    const sections = group.keys
      .map((key) => {
        const section = getSection(key);
        if (!section || section.internal) return null;
        const row = getSectionRow(project.id, key);
        const value = (row?.value ?? {}) as Value;
        if (!hasContent(section, value)) return null;
        return { section, value };
      })
      .filter((x): x is { section: Section; value: Value } => x !== null);
    return { heading: group.heading, sections };
  });

  const hasAnything = compiled.some((g) => g.sections.length > 0);
  const markdown = buildMarkdown(project.name, project.client_name, compiled);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 lg:px-8 lg:py-16 2xl:max-w-4xl">
      <header className="mb-10 border-b border-[var(--border)] pb-8">
        <div className="mb-5 flex justify-end print:hidden">
          <CopyMarkdownButton markdown={markdown} />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          Brand brief
        </p>
        <h1 className="font-serif text-6xl font-medium leading-[1.0] tracking-tight lg:text-7xl">
          {project.name}
        </h1>
        {project.client_name && (
          <p className="mt-3 text-lg text-[var(--muted)]">{project.client_name}</p>
        )}
        <p className="mt-2 text-sm text-[var(--subtle)]">Prepared for the design team.</p>
      </header>

      {!hasAnything ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-12 text-center">
          <p className="text-[var(--muted)]">This brief is still being prepared.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {compiled.map((group) =>
            group.sections.length === 0 ? null : (
              <section key={group.heading}>
                <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
                  {group.heading}
                </h2>
                <div className="space-y-8">
                  {group.sections.map(({ section, value }) => (
                    <article key={section.id}>
                      <h3 className="mb-3 font-serif text-3xl font-medium tracking-tight">
                        {section.name}
                      </h3>
                      <SectionReadout section={section} value={value} />
                    </article>
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      )}

      <footer className="mt-16 border-t border-[var(--border)] pt-6 text-center text-xs text-[var(--subtle)] print:hidden">
        Read-only brand brief.
      </footer>
    </main>
  );
}

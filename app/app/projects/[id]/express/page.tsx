import { notFound } from "next/navigation";
import { getProject, getSectionRow } from "@/lib/queries";
import { getSection } from "@/lib/methodology";
import { expressStatus } from "@/lib/express";
import { ExpressJourney, type ExpressSection } from "@/components/ExpressJourney";

export const dynamic = "force-dynamic";

// The sections the express review shows (essentials up front, detail collapsed).
const REVIEW_SECTIONS = [
  "concept",
  "brief.central-pattern",
  "brief.main-tension",
  "brief.constraint",
  "brief.emotional-territory",
  "brief.must-resolve",
  "manifesto",
  "design-plan",
  "strategic-document.reality",
  "strategic-document.identity",
  "strategic-document.communication",
  "strategic-document.direction",
];

function toDto(projectId: string, id: string): ExpressSection | null {
  const section = getSection(id);
  if (!section) return null;
  const row = getSectionRow(projectId, id);
  return {
    id,
    name: section.name,
    value: (row?.value as Record<string, unknown>) ?? null,
    fields: (section.fields ?? []).map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      columns: (f.columns ?? []).map((c) => ({ id: c.id, label: c.label })),
      options: f.options,
    })),
  };
}

export default async function ExpressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const sections: Record<string, ExpressSection> = {};
  for (const key of REVIEW_SECTIONS) {
    const dto = toDto(id, key);
    if (dto) sections[key] = dto;
  }

  return (
    <ExpressJourney
      projectId={id}
      projectName={project.name}
      initialState={expressStatus(id)}
      sections={sections}
      approved={Boolean(project.published_at)}
    />
  );
}

import methodologyJson from "@/data/methodology.json";

// ---- Types mirroring data/methodology.json (see 02-methodology-model.md) ----

export type Resolver = "client" | "designer" | "collab" | "designer-client";
export type SectionKind = "input" | "synthesis" | "eval" | "partial";
export type FieldType = "text" | "textarea" | "enum" | "list" | "table";

export type FieldColumn = {
  id: string;
  label: string;
  type: "text" | "textarea" | "enum";
  options?: string[];
};

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  options?: string[]; // for enum
  columns?: FieldColumn[]; // for table
  items?: Record<string, string>[]; // seeded rows (e.g. the 12 viability criteria)
  placeholder?: string;
};

export type Section = {
  id: string;
  name: string;
  resolver: Resolver;
  kind: SectionKind;
  internal?: boolean; // never shown to client/handover views
  optional?: boolean; // not required to finish a phase / the journey
  reads?: string[];
  helpText?: string;
  triggerQuestions?: string[];
  fields?: Field[];
};

export type Pillar = {
  id: string;
  name: string;
  tagline?: string;
  sections: Section[];
};

export type Phase = {
  id: string;
  name: string;
  pillars: Pillar[];
};

export type Methodology = {
  version: number;
  phases: Phase[];
};

export const methodology = methodologyJson as unknown as Methodology;

// ---- Lookup helpers ----

const sectionIndex = new Map<string, Section>();
const phaseOfSection = new Map<string, Phase>();
const pillarOfSection = new Map<string, Pillar>();

for (const phase of methodology.phases) {
  for (const pillar of phase.pillars) {
    for (const section of pillar.sections) {
      sectionIndex.set(section.id, section);
      phaseOfSection.set(section.id, phase);
      pillarOfSection.set(section.id, pillar);
    }
  }
}

export function getSection(id: string): Section | undefined {
  return sectionIndex.get(id);
}

export function getPhaseOf(sectionId: string): Phase | undefined {
  return phaseOfSection.get(sectionId);
}

export function getPillarOf(sectionId: string): Pillar | undefined {
  return pillarOfSection.get(sectionId);
}

export function allSections(): Section[] {
  return [...sectionIndex.values()];
}

export function methodologyDependencyCycles(): string[][] {
  const visited = new Set<string>();
  const active = new Set<string>();
  const cycles: string[][] = [];
  const visit = (sectionId: string, path: string[]) => {
    if (active.has(sectionId)) {
      const start = path.indexOf(sectionId);
      cycles.push([...path.slice(start), sectionId]);
      return;
    }
    if (visited.has(sectionId)) return;
    active.add(sectionId);
    const nextPath = [...path, sectionId];
    for (const dependency of getSection(sectionId)?.reads ?? []) visit(dependency, nextPath);
    active.delete(sectionId);
    visited.add(sectionId);
  };
  for (const section of allSections()) visit(section.id, []);
  return cycles;
}

// Sections this one depends on (its declared upstream inputs).
export function readsOf(sectionId: string): Section[] {
  const s = getSection(sectionId);
  if (!s?.reads) return [];
  return s.reads.map((id) => getSection(id)).filter((x): x is Section => Boolean(x));
}

// A synthesis section can be generated once its hard dependencies exist.
// `filledKeys` is the set of section_keys that are at least `draft`/`complete`.
//
// A declared read is WAIVED when that upstream step is still empty and is
// either optional or an owner-answered input — the journey must not dead-end
// because the owner skipped an optional step or had nothing to say for an
// input, and the brief should still draft from what exists. One guard keeps
// this honest: at least one declared read must actually be filled.
export function canGenerate(sectionId: string, filledKeys: Set<string>): boolean {
  const s = getSection(sectionId);
  if (!s || (s.kind !== "synthesis" && s.kind !== "partial")) return false;
  const reads = s.reads ?? [];
  if (reads.length === 0) return true;
  const hard = reads.filter((id) => {
    if (filledKeys.has(id)) return true;
    const upstream = getSection(id);
    return !(upstream?.optional || upstream?.kind === "input");
  });
  return hard.every((id) => filledKeys.has(id)) && reads.some((id) => filledKeys.has(id));
}

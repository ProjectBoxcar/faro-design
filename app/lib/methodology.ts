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

// Sections this one depends on (its declared upstream inputs).
export function readsOf(sectionId: string): Section[] {
  const s = getSection(sectionId);
  if (!s?.reads) return [];
  return s.reads.map((id) => getSection(id)).filter((x): x is Section => Boolean(x));
}

// A synthesis section can be generated only once all its `reads` exist.
// `filledKeys` is the set of section_keys that are at least `draft`/`complete`.
export function canGenerate(sectionId: string, filledKeys: Set<string>): boolean {
  const s = getSection(sectionId);
  if (!s || (s.kind !== "synthesis" && s.kind !== "partial")) return false;
  return (s.reads ?? []).every((id) => filledKeys.has(id));
}

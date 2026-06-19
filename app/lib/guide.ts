import guideJson from "@/data/guide.json";
import { getSection } from "@/lib/methodology";

// Plain-language, beginner-facing copy that wraps the methodology. Lives in
// data/guide.json (authored separately) and is merged in by id. Everything here
// degrades gracefully: if a key is missing, callers fall back to methodology helpText.

export type PhaseOverview = {
  id: string;
  name: string;
  oneLiner: string;
  produces: string;
};

export type Overview = {
  title: string;
  tagline: string;
  summary: string;
  phases: PhaseOverview[];
};

export type SectionGuide = {
  whatItIs?: string;
  whyItMatters?: string;
  takeaway?: string;
};

type Guide = {
  overview: Overview;
  phases: Record<string, { intro?: string }>;
  pillars: Record<string, { intro?: string }>;
  sections: Record<string, SectionGuide>;
};

const guide = guideJson as unknown as Guide;

export function overview(): Overview {
  return guide.overview;
}

export function phaseIntro(phaseId: string): string | undefined {
  return guide.phases?.[phaseId]?.intro;
}

export function pillarIntro(pillarId: string): string | undefined {
  return guide.pillars?.[pillarId]?.intro;
}

export function sectionGuide(sectionId: string): SectionGuide {
  const g = guide.sections?.[sectionId] ?? {};
  // Fall back to the methodology's own helpText so the UI always has something.
  if (!g.whatItIs) {
    const s = getSection(sectionId);
    if (s?.helpText) return { ...g, whatItIs: s.helpText };
  }
  return g;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProject, getSectionRow, getSections } from "@/lib/queries";
import { getSection, canGenerate, readsOf } from "@/lib/methodology";
import {
  getReviewPillar,
  reviewPillarPosition,
  nextReviewPillarId,
  type StatusMap,
} from "@/lib/flow";
import { pillarIntro, sectionGuide } from "@/lib/guide";
import { SectionEditor } from "@/components/SectionEditor";
import { PillarReviewFooter } from "@/components/PillarReviewFooter";

export const dynamic = "force-dynamic";

export default async function PillarReviewPage({
  params,
}: {
  params: Promise<{ id: string; pillar: string }>;
}) {
  const { id, pillar: pillarId } = await params;
  const project = getProject(id);
  const pillar = getReviewPillar(pillarId);
  if (!project || !pillar) notFound();

  const statusMap: StatusMap = new Map(getSections(id).map((r) => [r.section_key, r.status]));
  const filled = new Set([...statusMap].filter(([, s]) => s !== "empty").map(([k]) => k));
  const { pos, total } = reviewPillarPosition(pillarId);
  const intro = pillarIntro(pillarId);
  const inFoundation = pillarId === "reality" || pillarId === "identity";

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-12 lg:py-12">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} /> Back to overview
      </Link>

      <header className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          Part {pos} of {total}
        </div>
        <h1 className="mt-2 font-serif text-5xl font-medium leading-[1.05] tracking-tight">{pillar.name}</h1>
        {intro && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">{intro}</p>}
      </header>

      <div className="space-y-10">
        {pillar.sectionIds.map((sid) => {
          const section = getSection(sid);
          if (!section) return null;
          const row = getSectionRow(id, sid);
          const guide = sectionGuide(sid);
          const isSynthesis = section.kind === "synthesis" || section.kind === "partial";
          const empty = !row?.value || Object.keys(row.value as Record<string, unknown>).length === 0;
          const autoDraft = isSynthesis && empty && (inFoundation || canGenerate(sid, filled));
          const awaiting = isSynthesis && empty && !autoDraft;
          const missingReads = awaiting ? readsOf(sid).filter((r) => !filled.has(r.id)) : [];

          return (
            <section key={sid} className="border-t border-[var(--border)] pt-8 first:border-0 first:pt-0">
              <h2 className="font-serif text-2xl font-medium tracking-tight">{section.name}</h2>
              {guide.whatItIs && <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">{guide.whatItIs}</p>}

              {awaiting && (
                <div className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                  We&apos;ll write this for you too — it builds on things that come a little later
                  {missingReads.length > 0 && (
                    <>
                      , like{" "}
                      <span className="text-[var(--foreground)]">{missingReads.map((r) => r.name).join(", ")}</span>
                    </>
                  )}
                  . It fills in automatically once those are ready.
                </div>
              )}

              <div className="mt-4">
                <SectionEditor
                  projectId={id}
                  section={section}
                  initialValue={(row?.value as Record<string, unknown>) ?? {}}
                  initialStatus={row?.status ?? "empty"}
                  aiGenerated={row?.ai_generated ?? false}
                  autoDraft={autoDraft}
                  embedded
                />
              </div>
            </section>
          );
        })}
      </div>

      <PillarReviewFooter projectId={id} pillarId={pillarId} isLast={nextReviewPillarId(pillarId) === null} />
    </div>
  );
}

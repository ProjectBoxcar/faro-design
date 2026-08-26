import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProject, getSectionRow, getSections } from "@/lib/queries";
import { getSection, readsOf, canGenerate } from "@/lib/methodology";
import {
  getReviewGroup,
  reviewGroupPosition,
  nextReviewGroupId,
  prevReviewGroupId,
  type StatusMap,
} from "@/lib/flow";
import { sectionGuide } from "@/lib/guide";
import { PillarReview, type ReviewStep } from "@/components/PillarReview";

export const dynamic = "force-dynamic";

export default async function ReviewGroupPage({
  params,
}: {
  params: Promise<{ id: string; group: string }>;
}) {
  const { id, group: groupId } = await params;
  const project = getProject(id);
  const group = getReviewGroup(groupId);
  if (!project || !group) notFound();

  const statusMap: StatusMap = new Map(getSections(id).map((r) => [r.section_key, r.status]));
  const filled = new Set([...statusMap].filter(([, s]) => s !== "empty").map(([k]) => k));
  // Reality/Identity foundation steps may draft from partial upstream (the
  // owner's own intake answers); everything else follows the dependency
  // pipeline — same rule the /api/generate gate enforces.
  const foundation = groupId === "reality" || groupId === "identity";
  const { pos, total } = reviewGroupPosition(groupId);

  const steps = group.sectionIds
    .map((sid): ReviewStep | null => {
      const section = getSection(sid);
      if (!section) return null;
      const row = getSectionRow(id, sid);
      const isSynthesis = section.kind === "synthesis" || section.kind === "partial";
      const empty = !row?.value || Object.keys(row.value as Record<string, unknown>).length === 0;
      const autoDraft =
        isSynthesis &&
        empty &&
        (canGenerate(sid, filled) || (foundation && readsOf(sid).some((r) => filled.has(r.id))));
      return {
        section,
        initialValue: (row?.value as Record<string, unknown>) ?? {},
        initialStatus: row?.status ?? "empty",
        aiGenerated: row?.ai_generated ?? false,
        autoDraft,
        whatItIs: sectionGuide(sid).whatItIs,
        missingReadNames: empty ? readsOf(sid).filter((r) => !filled.has(r.id)).map((r) => r.name) : [],
      };
    })
    .filter((x): x is ReviewStep => x !== null);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-5 lg:px-6 lg:py-6">
      <Link
        href={`/projects/${id}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} /> Back to overview
      </Link>

      <header className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          Part {pos} of {total}
        </div>
        <h1 className="mt-1.5 font-serif text-2xl font-medium leading-[1.05] tracking-tight lg:text-3xl">{group.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{group.blurb}</p>
      </header>

      <PillarReview
        projectId={id}
        groupId={groupId}
        steps={steps}
        prevId={prevReviewGroupId(groupId)}
        isLast={nextReviewGroupId(groupId) === null}
      />
    </div>
  );
}

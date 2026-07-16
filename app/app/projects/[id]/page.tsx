import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getProject, getSections, listEvaluations } from "@/lib/queries";
import { methodology } from "@/lib/methodology";
import {
  phaseProgress,
  phaseUnlocked,
  sectionLock,
  currentPhaseId,
  firstIncompleteReviewGroup,
  getReviewGroup,
  reviewGroupPosition,
  reviewGroupDone,
  reviewProgress,
  type StatusMap,
} from "@/lib/flow";
import { phaseIntro, pillarIntro } from "@/lib/guide";
import { UpNextCard, type UpNext } from "@/components/UpNextCard";
import { type PhaseItem } from "@/components/PhaseList";
import { FullPlan } from "@/components/FullPlan";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";
import { PublishPanel } from "@/components/PublishPanel";
import { ViabilityPanel } from "@/components/ViabilityPanel";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectHub({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ plan?: string; drafted?: string }>;
}) {
  const { id } = await params;
  const { plan, drafted } = await searchParams;
  const project = getProject(id);
  if (!project) notFound();

  const rows = getSections(id);
  const statusMap: StatusMap = new Map(rows.map((r) => [r.section_key, r.status]));
  // Did the Quick Start interview structure pasted customer feedback (vs. only prep a survey)?
  const gaveFeedback = rows.some((r) => r.section_key === "image.results" && r.status !== "empty");
  const latestViabilityEval = listEvaluations(id, "viability")[0] ?? null;

  const currentPhase = currentPhaseId(statusMap);
  const overall = reviewProgress(statusMap);
  // The hand-off is meaningful once the brief & concept are reviewed — not on a
  // fresh project where there's nothing to hand off yet.
  const handoffReady = reviewGroupDone("brief", statusMap);

  // Up-next card — points at the next review GROUP (one of four screens).
  const reviewGroupId = firstIncompleteReviewGroup(statusMap);
  let next: UpNext | null = null;
  if (reviewGroupId) {
    const g = getReviewGroup(reviewGroupId)!;
    const { pos, total } = reviewGroupPosition(reviewGroupId);
    next = {
      projectId: id,
      href: `/projects/${id}/review/${reviewGroupId}`,
      name: g.name,
      label: `Part ${pos} of ${total}`,
      whatItIs: g.blurb,
      overall,
    };
  }

  // Phase accordion
  const phaseItems: PhaseItem[] = methodology.phases.map((phase) => {
    const prog = phaseProgress(phase.id, statusMap);
    return {
      id: phase.id,
      name: phase.name,
      intro: phaseIntro(phase.id),
      done: prog.done,
      total: prog.total,
      unlocked: phaseUnlocked(phase.id, statusMap),
      isCurrent: phase.id === currentPhase,
      pillars: phase.pillars.map((pillar) => ({
        id: pillar.id,
        name: pillar.name,
        intro: pillarIntro(pillar.id),
        sections: pillar.sections.filter((s) => !s.internal).map((s) => {
          const lock = sectionLock(s.id, statusMap);
          return {
            id: s.id,
            name: s.name,
            status: statusMap.get(s.id) ?? "empty",
            locked: lock.locked,
            lockReason: lock.reason,
            kind: s.kind,
            internal: s.internal,
          };
        }),
      })),
    };
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-12 lg:py-12 2xl:max-w-[104rem]">
      {drafted === "1" && (
        <div className="mb-8 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-6 py-6">
          <h2 className="font-serif text-2xl font-medium tracking-tight">Your first draft is ready ✨</h2>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            We turned your answers into the first drafts of your brand. Now we&apos;ll walk you through your strategy{" "}
            <strong className="text-[var(--foreground)]">one step at a time</strong>. Every step is written for you from
            what you told us — you just read it and tweak anything that&apos;s off. A few later steps fill in
            automatically once you add your customer survey. Your progress saves as you go, and you can stop and come
            back anytime.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            {gaveFeedback
              ? "The feedback you pasted is organized under the Image step, further along."
              : "We also prepared a short customer survey under the Image step, for you to send when you're ready."}
          </p>
          {reviewGroupId && (
            <Link
              href={`/projects/${id}/review/${reviewGroupId}`}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
            >
              Start reviewing <ArrowRight size={16} />
            </Link>
          )}
          <p className="mt-3 text-xs text-[var(--subtle)]">
            Prefer the map? The full list of steps is further down under “View all steps.”
          </p>
        </div>
      )}

      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium tracking-tight lg:text-4xl">{project.name}</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Continue where you left off, or revisit any step anytime.
        </p>
        {/* Internal viability gate — never on the public share link. */}
        <ViabilityPanel
          projectId={id}
          viability={project.viability}
          overrideNote={project.viability_override_note}
          scores={latestViabilityEval?.scores ?? null}
          personal={project.personal}
        />
      </div>

      {/* The finish line, front and center once the brief pillar is reviewed:
          view the brief, copy the link, download in any format. */}
      {handoffReady && (
        <div className="mb-8">
          <PublishPanel projectId={id} initialToken={project.share_token} prominent />
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5" id="plan">
          <UpNextCard next={next} />
          <FullPlan projectId={id} phases={phaseItems} defaultOpen={plan === "open"} />
        </div>

        <aside className="mt-10 space-y-6 lg:mt-0 lg:sticky lg:top-8 lg:self-start">
          {!handoffReady && (
            <>
              <h2 className="mb-3 font-serif text-lg font-semibold tracking-tight">
                Hand off to your designer
              </h2>
              {project.share_token ? (
                <PublishPanel projectId={id} initialToken={project.share_token} />
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
                  This is the finish line. Once you&apos;ve worked through your strategy, you&apos;ll create a private,
                  read-only brief to share with your designer right here — there&apos;s nothing to hand off until then.
                </div>
              )}
            </>
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow">
            <h2 className="mb-2 font-serif text-lg font-semibold tracking-tight">Design Studio</h2>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Turn the finished brief into real brand assets: identity system, landing page, and deck.
            </p>
            <Link
              href={`/projects/${id}/design`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
            >
              <Sparkles size={16} /> Open Design Studio
            </Link>
          </div>
        </aside>
      </div>

      <div className="mt-12 border-t border-[var(--border)] pt-6">
        <DeleteProjectButton projectId={id} projectName={project.name} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { getProject, getSections, listEvaluations } from "@/lib/queries";
import { methodology } from "@/lib/methodology";
import {
  phaseProgress,
  phaseUnlocked,
  sectionLock,
  currentPhaseId,
  reviewGroupDone,
  type StatusMap,
} from "@/lib/flow";
import { phaseIntro, pillarIntro } from "@/lib/guide";
import { UpNextCard, type UpNext } from "@/components/UpNextCard";
import { type PhaseItem } from "@/components/PhaseList";
import { FullPlan } from "@/components/FullPlan";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";
import { PublishPanel } from "@/components/PublishPanel";
import { ViabilityPanel } from "@/components/ViabilityPanel";
import { listAssets } from "@/lib/design";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import { getCurrentSnapshotForProject } from "@/lib/publish-snapshot";
import { primaryActionFromJourney } from "@/lib/sidebar-journey";

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
  const latestViabilityEval = listEvaluations(id, "viability")[0] ?? null;

  const currentPhase = currentPhaseId(statusMap);
  const handoffReady = reviewGroupDone("brief", statusMap);
  const designPackageReady = finalDeliverableIssue(listAssets(id)) === null;
  const snap = getCurrentSnapshotForProject(id);
  const snapshotPackageReady = snap?.payload?.package?.ready ?? null;

  // Single source of truth for “what’s next” — six-stage journey
  const primary = primaryActionFromJourney(id);
  const next: UpNext | null = primary
    ? {
        projectId: id,
        href: primary.href,
        name: primary.name,
        label: primary.label,
        whatItIs: primary.detail,
        overall: primary.overall,
      }
    : null;

  // Strategy brief publish only early (before design package is the main finish line)
  const showStrategyBriefPublish =
    handoffReady && primary?.stageId !== "handover" && primary?.stageId !== "content" && !designPackageReady;

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
        sections: pillar.sections
          .filter((s) => !s.internal)
          .map((s) => {
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
      {drafted === "1" && primary ? (
        <div className="mb-8 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-6 py-6">
          <h2 className="font-serif text-2xl font-medium tracking-tight">
            Your first draft is ready
          </h2>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            We turned your answers into first drafts. Continue with{" "}
            <strong className="text-[var(--foreground)]">{primary.name}</strong>
            — tweak anything that&apos;s off. Progress saves as you go.
          </p>
          <Link
            href={primary.href}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
          >
            Continue · {primary.name} <ArrowRight size={16} />
          </Link>
          <p className="mt-3 text-xs text-[var(--subtle)]">
            Prefer the full map? Open “View all steps” below.
          </p>
        </div>
      ) : null}

      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium tracking-tight lg:text-4xl">
          {project.name}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          One next step at a time — use the journey rail (or Stages on mobile) anytime.
        </p>
        <ViabilityPanel
          projectId={id}
          viability={project.viability}
          overrideNote={project.viability_override_note}
          scores={latestViabilityEval?.scores ?? null}
          personal={project.personal}
        />
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5" id="plan">
          <UpNextCard next={next} />
          <FullPlan projectId={id} phases={phaseItems} defaultOpen={plan === "open"} />
        </div>

        <aside className="mt-10 space-y-6 lg:mt-0 lg:sticky lg:top-8 lg:self-start">
          {primary && primary.stageId === "design" ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={18} className="text-[var(--accent)]" />
                <h2 className="font-serif text-lg font-semibold tracking-tight">Design Studio</h2>
              </div>
              <p className="mb-4 text-sm text-[var(--muted)]">
                Generate identity, pick a direction, then landing page and deck. Package downloads
                live in Brand Handover when finals are ready.
              </p>
              <Link
                href={primary.href}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
              >
                Continue Design Studio <ArrowRight size={16} />
              </Link>
            </div>
          ) : null}

          {primary && (primary.stageId === "handover" || designPackageReady) ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow">
              <h2 className="font-serif text-lg font-semibold tracking-tight">Brand Handover</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Download the package or publish the frozen client share link — the finish line for
                the brand package.
              </p>
              <Link
                href={`/projects/${id}/handover`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
              >
                Open Brand Handover <ArrowRight size={16} />
              </Link>
            </div>
          ) : null}

          {showStrategyBriefPublish ? (
            <div>
              <h2 className="mb-3 font-serif text-lg font-semibold tracking-tight">
                Strategy brief (optional)
              </h2>
              <p className="mb-3 text-xs text-[var(--muted)]">
                Share a read-only strategy brief. This is not the full brand package — that comes
                after Design Studio in Brand Handover.
              </p>
              <PublishPanel
                projectId={id}
                initialToken={project.share_token}
                initialPackageReady={designPackageReady}
                initialSnapshotPackageReady={snapshotPackageReady}
                initialVersion={snap?.version ?? null}
              />
            </div>
          ) : !handoffReady ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
              Finish strategy drafts first. Then you can share a brief, confirm a name, and build
              the brand package step by step.
            </div>
          ) : null}
        </aside>
      </div>

      <div className="mt-12 border-t border-[var(--border)] pt-6">
        <DeleteProjectButton projectId={id} projectName={project.name} />
      </div>
    </div>
  );
}

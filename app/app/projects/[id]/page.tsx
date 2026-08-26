import Link from "next/link";
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
  searchParams: Promise<{ plan?: string; drafted?: string; aiSkipped?: string; msg?: string }>;
}) {
  const { id } = await params;
  const { plan, drafted, aiSkipped, msg } = await searchParams;
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
        stageId: primary.stageId ?? null,
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

  // When drafted=1, Up next is the only primary CTA (banner copy only, no second button)
  const draftedBanner = drafted === "1" && primary;
  const aiSkippedBanner = aiSkipped === "1";
  const aiSkippedMsg =
    typeof msg === "string" && msg.trim()
      ? msg.trim().slice(0, 200)
      : "Your answers are saved. Add a Claude key in Settings (Brand strategy) to draft the strategy automatically.";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 lg:px-6 lg:py-6">
      {aiSkippedBanner ? (
        <div
          role="status"
          className="mb-5 rounded-2xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-4 py-3"
        >
          <p className="text-sm font-medium text-[var(--foreground)]">Strategy drafting needs an API key</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{aiSkippedMsg}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            <Link
              href="/settings"
              className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Open Settings
            </Link>
            {" · "}
            <Link
              href={`/projects/${id}/express`}
              className="font-medium text-[var(--foreground)] underline-offset-2 hover:underline"
            >
              Continue to strategy
            </Link>
            {" when the key is saved."}
          </p>
        </div>
      ) : null}
      {draftedBanner ? (
        <div className="mb-5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--foreground)]">Your first draft is ready</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Use the single Continue control below — progress saves as you go.
          </p>
        </div>
      ) : null}

      <div className="mb-6">
        <h1 className="font-serif text-xl font-medium tracking-tight lg:text-2xl">
          {project.name}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          One next step at a time — use the journey rail (or Stages on mobile) anytime.
        </p>
        <ViabilityPanel
          projectId={id}
          viability={project.viability}
          overrideNote={project.viability_override_note}
          scores={latestViabilityEval?.scores ?? null}
          personal={project.personal}
          forceShow={project.viability === "pending" || project.viability === "fail"}
        />
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
        <div className="min-w-0 space-y-5" id="plan">
          {/* Single primary accent CTA on the hub */}
          <UpNextCard next={next} />
          <FullPlan projectId={id} phases={phaseItems} defaultOpen={plan === "open"} />
        </div>

        <aside className="mt-10 space-y-4 text-sm lg:mt-0 lg:sticky lg:top-8 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
            Also available
          </p>
          <ul className="space-y-2 text-[var(--muted)]">
            {primary?.stageId === "design" ? (
              <li>
                <Link href={primary.href} className="text-[var(--foreground)] underline-offset-2 hover:underline">
                  Design Studio
                </Link>
                <span className="text-[var(--subtle)]"> — create &amp; select finals</span>
              </li>
            ) : null}
            {primary?.stageId === "handover" || designPackageReady ? (
              <li>
                <Link
                  href={`/projects/${id}/handover`}
                  className="text-[var(--foreground)] underline-offset-2 hover:underline"
                >
                  Brand Handover
                </Link>
                <span className="text-[var(--subtle)]"> — package &amp; client link</span>
              </li>
            ) : null}
            {showStrategyBriefPublish ? (
              <li>
                <span className="text-[var(--subtle)]">Optional strategy brief share below</span>
              </li>
            ) : !handoffReady ? (
              <li className="text-[var(--subtle)]">Finish strategy drafts to unlock brief share</li>
            ) : null}
          </ul>

          {showStrategyBriefPublish ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-4">
              <p className="mb-2 text-xs text-[var(--muted)]">
                Optional: share a strategy brief (not the full brand package).
              </p>
              <PublishPanel
                projectId={id}
                initialToken={project.share_token}
                initialPackageReady={designPackageReady}
                initialSnapshotPackageReady={snapshotPackageReady}
                initialVersion={snap?.version ?? null}
              />
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

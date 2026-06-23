import { notFound } from "next/navigation";
import { getProject, getSections } from "@/lib/queries";
import { methodology, getPillarOf, getPhaseOf } from "@/lib/methodology";
import {
  overallProgress,
  phaseProgress,
  phaseUnlocked,
  sectionLock,
  upNext,
  currentPhaseId,
  type StatusMap,
} from "@/lib/flow";
import { overview, phaseIntro, pillarIntro, sectionGuide } from "@/lib/guide";
import { UpNextCard, type UpNext } from "@/components/UpNextCard";
import { StrategyArc, type ArcPhase } from "@/components/StrategyArc";
import { type PhaseItem } from "@/components/PhaseList";
import { FullPlan } from "@/components/FullPlan";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";
import { PublishPanel } from "@/components/PublishPanel";

export const dynamic = "force-dynamic";

export default async function ProjectHub({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { id } = await params;
  const { plan } = await searchParams;
  const project = getProject(id);
  if (!project) notFound();

  const rows = getSections(id);
  const statusMap: StatusMap = new Map(rows.map((r) => [r.section_key, r.status]));

  const ov = overview();
  const currentPhase = currentPhaseId(statusMap);
  const overall = overallProgress(statusMap);

  // Up-next card
  const nextId = upNext(statusMap);
  let next: UpNext | null = null;
  if (nextId) {
    const lock = sectionLock(nextId, statusMap);
    const phase = getPhaseOf(nextId)!;
    const pillar = getPillarOf(nextId)!;
    const sec = pillar.sections.find((s) => s.id === nextId)!;
    const pp = phaseProgress(phase.id, statusMap);
    next = {
      projectId: id,
      sectionId: nextId,
      name: sec.name,
      pillarName: pillar.name,
      phaseName: phase.name,
      whatItIs: sectionGuide(nextId).whatItIs,
      phasePercent: pp.total === 0 ? 0 : Math.round((pp.done / pp.total) * 100),
      overall,
      locked: lock.locked,
      lockReason: lock.reason,
    };
  }

  // Big-picture tracker
  const tracker: ArcPhase[] = methodology.phases.map((phase) => {
    const prog = phaseProgress(phase.id, statusMap);
    const ovPhase = ov.phases?.find((p) => p.id === phase.id);
    return {
      id: phase.id,
      name: phase.name,
      oneLiner: ovPhase?.oneLiner ?? "",
      produces: ovPhase?.produces ?? "",
      done: prog.done,
      total: prog.total,
      unlocked: phaseUnlocked(phase.id, statusMap),
      isCurrent: phase.id === currentPhase,
    };
  });

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
      <section className="mb-8">
        <h2 className="font-serif text-4xl font-medium leading-[1.05] tracking-tight lg:text-5xl">
          The path to your brand
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{ov.tagline}</p>
        <div className="mt-4">
          <StrategyArc phases={tracker} />
        </div>
      </section>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5" id="plan">
          <UpNextCard next={next} />
          <FullPlan projectId={id} phases={phaseItems} defaultOpen={plan === "open"} />
        </div>

        <aside className="mt-10 lg:mt-0 lg:sticky lg:top-8 lg:self-start">
          <h2 className="mb-3 font-serif text-lg font-semibold tracking-tight">
            Hand off to your designer
          </h2>
          <PublishPanel projectId={id} initialToken={project.share_token} />
        </aside>
      </div>

      <div className="mt-12 border-t border-[var(--border)] pt-6">
        <DeleteProjectButton projectId={id} projectName={project.name} />
      </div>
    </div>
  );
}

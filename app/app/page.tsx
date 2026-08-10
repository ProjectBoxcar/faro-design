import { listProjects, getSections } from "@/lib/queries";
import { methodology, getSection } from "@/lib/methodology";
import { flowSteps, type StatusMap } from "@/lib/flow";
import { hasApprovedLogo, studioBlockedReason } from "@/lib/studio";
import type { JourneyStep } from "@/components/JourneyProgress";
import { primaryActionFromJourney, buildProjectJourney } from "@/lib/sidebar-journey";
import { getAiLaneHealthSnapshot } from "@/lib/settings";
import { isOpenDesignDaemonUp } from "@/lib/open-design-engine";
import { SetupReadinessBanner } from "@/components/SetupReadinessBanner";
import { HomeBodySections, HomeHeroActions, HomeNav } from "@/components/HomeChrome";

export const dynamic = "force-dynamic";

function isFilled(status: string | undefined): boolean {
  return status === "draft" || status === "complete" || status === "client_submitted";
}

function isComplete(status: string | undefined): boolean {
  return status === "complete";
}

export default async function Home() {
  let daemonUp: boolean | null = null;
  try {
    daemonUp = await isOpenDesignDaemonUp();
  } catch {
    daemonUp = false;
  }
  const setup = getAiLaneHealthSnapshot(daemonUp);
  const projects = listProjects();
  const requiredByPhase = new Map<string, string[]>();
  for (const step of flowSteps()) {
    const section = getSection(step.sectionId);
    if (!section || section.optional) continue;
    const list = requiredByPhase.get(step.phaseId) ?? [];
    list.push(step.sectionId);
    requiredByPhase.set(step.phaseId, list);
  }

  const cards = projects.map((p) => {
    const map: StatusMap = new Map(getSections(p.id).map((r) => [r.section_key, r.status]));
    const strategyIds = [...requiredByPhase.entries()]
      .filter(([phaseId]) => phaseId !== "design")
      .flatMap(([, ids]) => ids);
    const strategyFilled = strategyIds.filter((id) => isFilled(map.get(id))).length;
    const strategyComplete = strategyIds.filter((id) => isComplete(map.get(id))).length;
    const designPlan = map.get("design-plan");
    const logoWorkshopReady = !studioBlockedReason(p.id, "logo");
    const logoApproved = hasApprovedLogo(p.id);
    const strategyJourneyDone =
      Boolean(p.published_at) ||
      p.current_phase === "planning" ||
      p.current_phase === "design" ||
      p.current_phase === "finished" ||
      logoWorkshopReady ||
      logoApproved ||
      (strategyIds.length > 0 && strategyFilled >= strategyIds.length);
    const expressReady = isFilled(designPlan) && !strategyJourneyDone;

    // Align card progress with the six-stage project rail
    const journey = buildProjectJourney(p.id);
    const primary = primaryActionFromJourney(p.id);
    const steps: JourneyStep[] = journey.stages.map((s) => ({
      id: s.id,
      label: s.name.replace(/^\d+\.\s*/, ""),
      short: s.name.replace(/^\d+\.\s*/, "").split(" ")[0] || s.id,
      done: s.status === "done" ? 1 : 0,
      total: 1,
    }));

    return {
      id: p.id,
      name: p.name,
      clientName: p.client_name ?? null,
      status: p.status,
      phase: p.current_phase,
      steps,
      strategyFilled,
      strategyTotal: strategyIds.length,
      strategyComplete,
      published: Boolean(p.published_at),
      expressReady,
      logoWorkshopReady,
      logoApproved,
      continueHref: primary?.href ?? `/projects/${p.id}`,
      continueLabel: primary?.name ?? "Open project",
      journeyDone: journey.overall.done,
      journeyTotal: journey.overall.total,
    };
  });

  return (
    <main className="min-h-full">
      <HomeNav />
      <HomeHeroActions showProjects={cards.length > 0} />
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-12 2xl:max-w-[110rem]">
        <SetupReadinessBanner lanes={setup.lanes} daemonUp={daemonUp} />
      </div>
      <HomeBodySections projects={cards} />
    </main>
  );
}

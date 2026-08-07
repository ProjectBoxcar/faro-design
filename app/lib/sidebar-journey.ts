import "server-only";
import { listAssets as listDesignAssets } from "@/lib/design";
import {
  firstIncompleteReviewGroup,
  journeyGroupProgress,
  journeyProgress,
  reviewGroups,
  type StatusMap,
} from "@/lib/flow";
import { methodology } from "@/lib/methodology";
import { getProject, getSections, listStudioAssets } from "@/lib/queries";
import { designStudioBlockedReason, hasApprovedLogo, studioBlockedReason } from "@/lib/studio";
import { hasConfirmedBrandName, needsNameWorkshop } from "@/lib/naming-propose";
import { contentStudioBlockedReason } from "@/lib/content-studio/gates";
import { latestCalendarForProject, listProfilesForProject } from "@/lib/content-studio/store";

/** Shared stage state for every journey item (strategy, logo, design, handover). */
export type StageStatus = "locked" | "todo" | "current" | "done";

export type JourneyStepItem = {
  id: string;
  name: string;
  href: string;
  status: StageStatus;
  detail: string;
};

export type JourneyStageItem = {
  id: string;
  name: string;
  href: string;
  status: StageStatus;
  detail: string;
  /** Optional nested steps (strategy pillars or design outputs). */
  steps?: JourneyStepItem[];
};

export type ProjectJourney = {
  stages: JourneyStageItem[];
  /** Equal-weight stages for the top progress bar. */
  overall: { done: number; total: number };
};

function statusLabel(status: StageStatus, detail: string): string {
  if (status === "locked") return detail || "Locked";
  if (status === "done") return detail || "Done";
  if (status === "current") return detail || "Up next";
  return detail || "Ready to start";
}

/**
 * One ordered journey for the left rail. Every major stage uses the same
 * status model: locked → todo → current → done.
 */
export function buildProjectJourney(projectId: string): ProjectJourney {
  const project = getProject(projectId);
  if (!project) {
    return { stages: [], overall: { done: 0, total: 0 } };
  }

  const statusMap: StatusMap = new Map(getSections(projectId).map((r) => [r.section_key, r.status]));
  const strategyProgress = journeyProgress(statusMap);
  const nextReviewGroup = firstIncompleteReviewGroup(statusMap);
  const designAssets = listDesignAssets(projectId);

  // Palette gate = strategy content only (concept/plan/brief). Logo gate also
  // requires name confirm for first-time generation.
  const strategyContentBlocked = studioBlockedReason(projectId, "palette");
  const logoBlocked = studioBlockedReason(projectId, "logo");
  const logoUnlocked = !logoBlocked;
  const logoApproved = hasApprovedLogo(projectId);
  const logoHasWork = listStudioAssets(projectId, "logo").some((a) => a.status !== "discarded");
  // Once the owner has entered naming or logos, never hard-lock those rows —
  // they must be able to come back like Strategy.
  const nameConfirmed = hasConfirmedBrandName(projectId);
  const nameStillNeeded = needsNameWorkshop(projectId);
  const strategyContentReady = !strategyContentBlocked;
  const designBlocked = designStudioBlockedReason(projectId);
  const designUnlocked = !designBlocked;

  const identityOk = designAssets.some((a) => a.kind === "design_system" && a.selected);
  const landingOk = designAssets.some(
    (a) => a.kind === "landing_page" && a.selected && a.design_system_id
  );
  const deckOk = designAssets.some((a) => a.kind === "deck" && a.selected && a.design_system_id);
  const designDone = identityOk && landingOk && deckOk;
  const handoverUnlocked = designUnlocked; // open once design is available
  const handoverDone = designDone; // package complete when all finals chosen
  const contentBlocked = contentStudioBlockedReason(projectId);
  const contentUnlocked = !contentBlocked;
  let contentHasWork = false;
  try {
    contentHasWork =
      listProfilesForProject(projectId).length > 0 || Boolean(latestCalendarForProject(projectId));
  } catch {
    /* tables may not exist until migrate */
  }
  const contentDone = Boolean(latestCalendarForProject(projectId)?.posts?.length);

  // Strategy is complete when strategy content is ready (name/logo gates are separate).
  const strategyDone =
    strategyContentReady ||
    logoUnlocked ||
    logoApproved ||
    designUnlocked ||
    designDone ||
    project.current_phase === "planning" ||
    project.current_phase === "design" ||
    project.current_phase === "finished";

  // Strategy pillar steps (same status rules)
  const groupById = new Map(reviewGroups().map((g) => [g.id, g]));
  const strategySteps: JourneyStepItem[] = [];
  for (const phase of methodology.phases) {
    for (const pillar of phase.pillars) {
      if (!groupById.has(pillar.id)) continue;
      const pr = journeyGroupProgress(pillar.id, statusMap);
      const stepDone = pr.total > 0 && pr.done >= pr.total;
      let status: StageStatus;
      if (!strategyDone && stepDone) status = "done";
      else if (strategyDone) status = "done";
      else if (pillar.id === nextReviewGroup) status = "current";
      else if (pr.done > 0) status = "todo";
      else status = strategyDone ? "done" : "todo";
      // If whole strategy is done, all pillars done
      if (strategyDone) status = "done";
      strategySteps.push({
        id: pillar.id,
        name: groupById.get(pillar.id)!.name,
        href: `/projects/${projectId}/review/${pillar.id}`,
        status,
        detail: statusLabel(
          status,
          status === "done"
            ? "Complete"
            : status === "current"
              ? "Continue here"
              : pr.total > 0
                ? `${Math.min(pr.done, pr.total)} of ${pr.total}`
                : "Optional"
        ),
      });
    }
  }

  // Design substeps
  const designKinds = [
    {
      id: "identity-system",
      name: "Brand identity",
      kind: "design_system" as const,
      href: `/projects/${projectId}/design#identity-system`,
      unlocked: designUnlocked,
      done: identityOk,
      lockHint: "Approve a logo first",
    },
    {
      id: "landing-page",
      name: "Landing page",
      kind: "landing_page" as const,
      href: `/projects/${projectId}/design#application-mockups`,
      unlocked: identityOk,
      done: landingOk,
      lockHint: "Choose an identity first",
    },
    {
      id: "brand-deck",
      name: "Brand deck",
      kind: "deck" as const,
      href: `/projects/${projectId}/design#application-mockups`,
      unlocked: identityOk,
      done: deckOk,
      lockHint: "Choose an identity first",
    },
  ];

  const designSteps: JourneyStepItem[] = designKinds.map((step) => {
    const proposals = designAssets.filter((a) => a.kind === step.kind);
    let status: StageStatus;
    if (!step.unlocked) status = "locked";
    else if (step.done) status = "done";
    else if (proposals.length > 0) status = "todo";
    else status = "todo";
    const detail =
      status === "locked"
        ? step.lockHint
        : status === "done"
          ? "Final chosen"
          : proposals.length > 0
            ? `${proposals.length} to review — choose final`
            : "Not started";
    return {
      id: step.id,
      name: step.name,
      href: step.href,
      status,
      detail,
    };
  });
  // Mark first incomplete design step as current when design is the active stage
  if (designUnlocked && !designDone) {
    const firstOpen = designSteps.find((s) => s.status === "todo" || s.status === "current");
    if (firstOpen && firstOpen.status === "todo") {
      firstOpen.status = "current";
      if (firstOpen.detail === "Not started") firstOpen.detail = "Up next";
    }
  }

  // Major stages — same status rules
  type Major = {
    id: string;
    name: string;
    href: string;
    locked: boolean;
    done: boolean;
    lockHint: string;
    doneDetail: string;
    todoDetail: string;
    steps?: JourneyStepItem[];
  };

  const majors: Major[] = [
    {
      id: "strategy",
      name: "1. Strategy",
      href: `/projects/${projectId}/express`,
      locked: false,
      done: strategyDone,
      lockHint: "",
      doneDetail:
        strategyProgress.total > 0
          ? `Complete · ${strategyProgress.done}/${strategyProgress.total} steps`
          : "Complete",
      todoDetail:
        strategyProgress.total > 0
          ? `${strategyProgress.done} of ${strategyProgress.total} steps`
          : "Start with Quick Start",
      steps: strategySteps,
    },
    {
      id: "name",
      name: "2. Brand name",
      href: `/projects/${projectId}/name`,
      // Open when strategy content is ready (not when logo generate is fully unblocked).
      locked: !strategyContentReady && !logoHasWork && !logoApproved && !nameConfirmed,
      // Only confirmed (or logo already approved as legacy escape) counts as done.
      done: nameConfirmed || logoApproved,
      lockHint: strategyContentBlocked ?? "Finish strategy first",
      doneDetail: "Name confirmed for logos",
      todoDetail: nameStillNeeded
        ? "Confirm this name or pick another"
        : "Confirm name for logos",
    },
    {
      id: "logo",
      name: "3. Logo Workshop",
      // Always go to studio when clickable. Name gate is a soft page redirect only
      // on first entry (no logo work yet) — never freeze this stage forever.
      href: `/projects/${projectId}/studio`,
      locked: !logoUnlocked && !logoHasWork && !logoApproved,
      done: logoApproved,
      lockHint: logoBlocked ?? "Finish strategy first",
      doneDetail: "Logo approved",
      todoDetail: logoHasWork
        ? "Choose and approve a logo"
        : nameStillNeeded
          ? "Confirm name first, then generate logos"
          : "Generate logo candidates",
    },
    {
      id: "design",
      name: "4. Design Studio",
      href: `/projects/${projectId}/design`,
      locked: !designUnlocked,
      done: designDone,
      lockHint: designBlocked ?? "Approve a logo first",
      doneDetail: "Identity + mockups final",
      todoDetail: identityOk
        ? "Finish landing page & deck"
        : "Build identity, then mockups",
      steps: designSteps,
    },
    {
      id: "handover",
      name: "5. Brand Handover",
      href: `/projects/${projectId}/handover`,
      locked: !handoverUnlocked,
      done: handoverDone,
      lockHint: "Unlocks with Design Studio",
      doneDetail: project.share_token
        ? "Package ready · brand package published"
        : "Package ready · download or publish",
      todoDetail: designUnlocked
        ? designDone
          ? project.share_token
            ? "Update freeze or download package"
            : "Publish brand package or download"
          : "Finish Design Studio finals"
        : "Complete design first",
    },
    {
      id: "content",
      name: "6. Content Studio",
      href: `/projects/${projectId}/content`,
      locked: !contentUnlocked && !contentHasWork,
      done: contentDone,
      lockHint: contentBlocked ?? "Finish brand package first",
      doneDetail: "Content calendar ready",
      todoDetail: contentHasWork
        ? "Continue calendar & approve posts"
        : "Lock brand profile and generate social content",
    },
  ];

  // Assign current = first unlocked incomplete stage
  let currentAssigned = false;
  const stages: JourneyStageItem[] = majors.map((m) => {
    let status: StageStatus;
    if (m.locked) status = "locked";
    else if (m.done) status = "done";
    else if (!currentAssigned) {
      status = "current";
      currentAssigned = true;
    } else status = "todo";

    return {
      id: m.id,
      name: m.name,
      href: m.href,
      status,
      detail: statusLabel(
        status,
        status === "locked" ? m.lockHint : status === "done" ? m.doneDetail : m.todoDetail
      ),
      steps: m.steps,
    };
  });

  // Strategy substeps: if strategy is current, ensure one pillar is current
  const strategyStage = stages.find((s) => s.id === "strategy");
  if (strategyStage?.status === "current" && strategyStage.steps?.length) {
    const hasCurrent = strategyStage.steps.some((s) => s.status === "current");
    if (!hasCurrent) {
      const firstTodo = strategyStage.steps.find((s) => s.status === "todo");
      if (firstTodo) {
        firstTodo.status = "current";
        firstTodo.detail = "Continue here";
      }
    }
  }

  const overallDone = stages.filter((s) => s.status === "done").length;

  return {
    stages,
    overall: { done: overallDone, total: stages.length },
  };
}

/** First stage the owner should act on (current, else first unlocked todo). */
export function primaryJourneyStage(
  stages: JourneyStageItem[]
): JourneyStageItem | null {
  return (
    stages.find((s) => s.status === "current") ??
    stages.find((s) => s.status === "todo") ??
    null
  );
}

/** Hub / list CTA derived from the six-stage journey (single source of truth). */
export function primaryActionFromJourney(projectId: string): {
  href: string;
  name: string;
  label: string;
  detail: string;
  stageId: string;
  overall: { done: number; total: number };
} | null {
  const journey = buildProjectJourney(projectId);
  const stage = primaryJourneyStage(journey.stages);
  if (!stage) return null;
  // Prefer nested current step (e.g. strategy pillar, design substep)
  const nested = stage.steps?.find((s) => s.status === "current");
  const href = nested?.href ?? stage.href;
  const name = nested?.name ?? stage.name.replace(/^\d+\.\s*/, "");
  return {
    href,
    name,
    label: stage.status === "current" ? "Up next" : "Continue",
    detail: nested?.detail ?? stage.detail,
    stageId: stage.id,
    overall: journey.overall,
  };
}

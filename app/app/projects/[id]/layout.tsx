import { notFound } from "next/navigation";
import { getProject, getSections, listStudioAssets } from "@/lib/queries";
import { listAssets as listDesignAssets } from "@/lib/design";
import { methodology } from "@/lib/methodology";
import {
  reviewGroups,
  reviewGroupProgress,
  currentReviewGroupId,
  reviewProgress,
  type StatusMap,
} from "@/lib/flow";
import { ProjectSidebar, type SidebarPhase, type SidebarAssetStudio } from "@/components/ProjectSidebar";
import { ProjectMobileBar } from "@/components/ProjectMobileBar";
import { studioBlockedReason } from "@/lib/studio";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const statusMap: StatusMap = new Map(getSections(id).map((r) => [r.section_key, r.status]));
  const overall = reviewProgress(statusMap);
  const current = currentReviewGroupId(statusMap);
  const designAssets = listDesignAssets(id);
  const identitySelected = designAssets.some((asset) => asset.kind === "design_system" && asset.selected);
  const studioSteps = [
    { id: "identity-system", name: "Brand Identity System", kind: "design_system" as const, unlocked: true },
    { id: "landing-page", name: "Landing Page", kind: "landing_page" as const, unlocked: identitySelected },
    { id: "brand-deck", name: "Brand Deck", kind: "deck" as const, unlocked: identitySelected },
  ].map((step) => {
    const proposals = designAssets.filter((asset) => asset.kind === step.kind);
    return {
      id: step.id,
      name: step.name,
      proposals: proposals.length,
      status: proposals.some((asset) => asset.selected)
        ? "selected" as const
        : proposals.length > 0
        ? "review" as const
        : step.unlocked
        ? "not-started" as const
        : "locked" as const,
    };
  });
  // The sidebar follows one journey: methodology review and brief first, then
  // the generated artifact studio as the final stage.
  const groupById = new Map(reviewGroups().map((g) => [g.id, g]));
  const phases: SidebarPhase[] = methodology.phases
    .map((phase) => {
      const groups = phase.pillars
        .filter((p) => groupById.has(p.id))
        .map((p) => {
          const pr = reviewGroupProgress(p.id, statusMap);
          return {
            id: p.id,
            name: groupById.get(p.id)!.name,
            done: pr.done,
            total: pr.total,
            isCurrent: p.id === current,
          };
        });
      const done = groups.reduce((sum, g) => sum + g.done, 0);
      const total = groups.reduce((sum, g) => sum + g.total, 0);
      return {
        id: phase.id,
        name: phase.name,
        done,
        total,
        isCurrent: groups.some((g) => g.isCurrent),
        groups,
      };
    })
    .filter((p) => p.groups.length > 0);

  // Studio (phase 2): locked until the strategy it builds on is finished.
  // Strategy-completeness only — the logo's naming gate is shown in the Studio.
  const studioBlocked = studioBlockedReason(id, "palette");
  const approvedAssets = listStudioAssets(id).filter((asset) => asset.status === "approved").length;
  const assetStudio: SidebarAssetStudio = {
    locked: Boolean(studioBlocked) && approvedAssets === 0,
    hint: studioBlocked
      ? "Unlocks when your strategy is done"
      : approvedAssets > 0
        ? `${approvedAssets} asset${approvedAssets === 1 ? "" : "s"} approved`
        : "Turn strategy into your brand",
  };

  return (
    <div className="flex min-h-screen">
      <ProjectSidebar
        projectId={id}
        projectName={project.name}
        clientName={project.client_name}
        greenfield={project.greenfield}
        overall={overall}
        phases={phases}
        studioSteps={studioSteps}
        assetStudio={assetStudio}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ProjectMobileBar
          projectId={id}
          projectName={project.name}
          overall={overall}
          assetStudioUnlocked={!assetStudio.locked}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

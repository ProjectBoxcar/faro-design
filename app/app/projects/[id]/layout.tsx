import { notFound } from "next/navigation";
import { getProject, getSections, listStudioAssets } from "@/lib/queries";
import { listAssets as listDesignAssets } from "@/lib/design";
import { methodology } from "@/lib/methodology";
import {
  reviewGroups,
  journeyGroupProgress,
  journeyProgress,
  firstIncompleteReviewGroup,
  type StatusMap,
} from "@/lib/flow";
import { ProjectSidebar, type SidebarPhase, type SidebarAssetStudio } from "@/components/ProjectSidebar";
import { ProjectMobileBar } from "@/components/ProjectMobileBar";
import { designStudioBlockedReason, hasApprovedLogo, studioBlockedReason } from "@/lib/studio";

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
  // Sidebar progress counts drafted content (express pipeline) not only
  // "complete" — otherwise Design Studio can open while Progress stuck ~30%.
  const overall = journeyProgress(statusMap);
  const nextReviewGroup = firstIncompleteReviewGroup(statusMap);
  const designAssets = listDesignAssets(id);
  const identitySelected = designAssets.some((asset) => asset.kind === "design_system" && asset.selected);
  // Order after strategy: Logo Workshop first, then Design Studio.
  const logoWorkshopBlocked = studioBlockedReason(id, "logo");
  const logoWorkshopUnlocked = !logoWorkshopBlocked;
  const designStudioBlocked = designStudioBlockedReason(id);
  const designStudioUnlocked = !designStudioBlocked;
  const logoApproved = hasApprovedLogo(id);

  const studioSteps = [
    {
      id: "identity-system",
      name: "Brand Identity System",
      kind: "design_system" as const,
      unlocked: designStudioUnlocked,
    },
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
  // When logo workshop (or later) is open, stop highlighting early strategy steps.
  const pastStrategy = logoWorkshopUnlocked;
  const groupById = new Map(reviewGroups().map((g) => [g.id, g]));
  const phases: SidebarPhase[] = methodology.phases
    .map((phase) => {
      const groups = phase.pillars
        .filter((p) => groupById.has(p.id))
        .map((p) => {
          const pr = journeyGroupProgress(p.id, statusMap);
          const isCurrent = !pastStrategy && p.id === nextReviewGroup;
          return {
            id: p.id,
            name: groupById.get(p.id)!.name,
            done: pr.done,
            total: pr.total,
            isCurrent,
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

  const approvedAssets = listStudioAssets(id).filter((asset) => asset.status === "approved").length;
  const assetStudio: SidebarAssetStudio = {
    locked: !logoWorkshopUnlocked,
    hint: logoWorkshopBlocked
      ? "Unlocks when strategy is ready"
      : logoApproved
        ? "Logo approved — next: Design Studio"
        : approvedAssets > 0
          ? `${approvedAssets} logo candidate${approvedAssets === 1 ? "" : "s"} in play`
          : "Next: design and approve your logo",
  };
  const designStudio: SidebarAssetStudio = {
    locked: !designStudioUnlocked,
    hint: designStudioBlocked
      ? logoWorkshopUnlocked
        ? "Unlocks when you approve a logo"
        : "Finish strategy, then the Logo Workshop"
      : "Color, type, components & mockups",
  };

  const identityOk = designAssets.some((a) => a.kind === "design_system" && a.selected);
  const landingOk = designAssets.some(
    (a) => a.kind === "landing_page" && a.selected && a.design_system_id
  );
  const deckOk = designAssets.some((a) => a.kind === "deck" && a.selected && a.design_system_id);
  const handoverReady = identityOk && landingOk && deckOk;
  const brandHandover = {
    // Always openable once Design Studio is unlocked — page shows checklist if incomplete.
    locked: !designStudioUnlocked,
    ready: handoverReady,
    hint: !designStudioUnlocked
      ? "Unlocks after you approve a logo"
      : handoverReady
        ? project.share_token
          ? "Open package · published"
          : "Open final package"
        : "Open checklist · finish finals",
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
        designStudio={designStudio}
        brandHandover={brandHandover}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ProjectMobileBar
          projectId={id}
          projectName={project.name}
          overall={overall}
          assetStudioUnlocked={logoWorkshopUnlocked}
          designStudioUnlocked={designStudioUnlocked}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

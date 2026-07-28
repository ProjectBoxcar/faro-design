import { notFound } from "next/navigation";
import { getProject } from "@/lib/queries";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { ProjectMobileBar } from "@/components/ProjectMobileBar";
import { buildProjectJourney } from "@/lib/sidebar-journey";
import { designStudioBlockedReason, studioBlockedReason } from "@/lib/studio";

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

  const journey = buildProjectJourney(id);
  const logoWorkshopUnlocked = !studioBlockedReason(id, "logo");
  const designStudioUnlocked = !designStudioBlockedReason(id);

  return (
    <div className="flex min-h-screen">
      <ProjectSidebar
        projectId={id}
        projectName={project.name}
        clientName={project.client_name}
        greenfield={project.greenfield}
        stages={journey.stages}
        overall={journey.overall}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ProjectMobileBar
          projectId={id}
          projectName={project.name}
          overall={journey.overall}
          assetStudioUnlocked={logoWorkshopUnlocked}
          designStudioUnlocked={designStudioUnlocked}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

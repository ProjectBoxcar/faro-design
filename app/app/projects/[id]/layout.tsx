import { notFound } from "next/navigation";
import { getProject, getSections } from "@/lib/queries";
import { methodology } from "@/lib/methodology";
import {
  phaseProgress,
  phaseUnlocked,
  overallProgress,
  currentPhaseId,
  type StatusMap,
} from "@/lib/flow";
import { ProjectSidebar, type SidebarPhase } from "@/components/ProjectSidebar";
import { ProjectMobileBar } from "@/components/ProjectMobileBar";

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
  const overall = overallProgress(statusMap);
  const current = currentPhaseId(statusMap);
  const phases: SidebarPhase[] = methodology.phases.map((p) => {
    const pr = phaseProgress(p.id, statusMap);
    return {
      id: p.id,
      name: p.name,
      done: pr.done,
      total: pr.total,
      unlocked: phaseUnlocked(p.id, statusMap),
      isCurrent: p.id === current,
    };
  });

  return (
    <div className="flex min-h-screen">
      <ProjectSidebar
        projectId={id}
        projectName={project.name}
        clientName={project.client_name}
        greenfield={project.greenfield}
        overall={overall}
        phases={phases}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ProjectMobileBar projectId={id} projectName={project.name} overall={overall} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

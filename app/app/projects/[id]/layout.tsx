import { notFound } from "next/navigation";
import { getProject, getSections } from "@/lib/queries";
import {
  reviewGroups,
  reviewGroupProgress,
  currentReviewGroupId,
  reviewProgress,
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
  const overall = reviewProgress(statusMap);
  const current = currentReviewGroupId(statusMap);
  // The sidebar reflects the owner's real journey: the four review screens.
  const phases: SidebarPhase[] = reviewGroups().map((g) => {
    const pr = reviewGroupProgress(g.id, statusMap);
    return {
      id: g.id,
      name: g.name,
      done: pr.done,
      total: pr.total,
      unlocked: true,
      isCurrent: g.id === current,
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

import { notFound, redirect } from "next/navigation";
import { getProject } from "@/lib/queries";
import {
  hasConfirmedBrandName,
  needsNameWorkshop,
  readCachedNameProposals,
} from "@/lib/naming-propose";
import { studioBlockedReason } from "@/lib/studio";
import { NameWorkshop } from "@/components/NameWorkshop";

export const dynamic = "force-dynamic";

export default async function NameWorkshopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  // Strategy not ready → back to project hub
  const strategyBlocked = studioBlockedReason(id, "logo");
  if (strategyBlocked) {
    redirect(`/projects/${id}`);
  }

  // If name is already fine / confirmed, send people who landed here toward logos —
  // but allow ?edit=1 later if we add rename. Default: continue the journey.
  if (hasConfirmedBrandName(id) || !needsNameWorkshop(id)) {
    redirect(`/projects/${id}/studio`);
  }

  const candidates = readCachedNameProposals(id);

  return (
    <NameWorkshop
      projectId={id}
      workingName={project.name}
      initialCandidates={candidates}
    />
  );
}

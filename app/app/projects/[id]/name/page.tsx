import { notFound, redirect } from "next/navigation";
import { getProject } from "@/lib/queries";
import {
  hasConfirmedBrandName,
  isGenericBrandName,
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

  // Name page needs strategy content only — logo kind also blocks on unconfirmed name,
  // so use palette (same content gates, no name confirm).
  const strategyOnlyBlocked = studioBlockedReason(id, "palette");
  if (strategyOnlyBlocked) {
    redirect(`/projects/${id}`);
  }

  // Already confirmed → continue to logos (still allow re-entry later via ?edit if added).
  if (hasConfirmedBrandName(id)) {
    redirect(`/projects/${id}/studio`);
  }

  const candidates = readCachedNameProposals(id);

  return (
    <NameWorkshop
      projectId={id}
      workingName={project.name}
      initialCandidates={candidates}
      isGenericWorkingTitle={isGenericBrandName(project.name)}
    />
  );
}

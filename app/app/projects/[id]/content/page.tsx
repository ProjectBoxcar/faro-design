import { notFound } from "next/navigation";
import { getProject } from "@/lib/queries";
import { contentStudioBlockedReason } from "@/lib/content-studio/gates";
import {
  getContentProfile,
  latestCalendarForProject,
  listProfilesForProject,
  listRawAssets,
} from "@/lib/content-studio/store";
import type { BrandProfile } from "@/lib/content-studio/types";
import { ContentStudioWorkspace } from "@/components/content-studio/ContentStudioWorkspace";

export const dynamic = "force-dynamic";

export default async function ProjectContentStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const blocked = contentStudioBlockedReason(id);
  const profiles = listProfilesForProject(id);
  const latestProfile = profiles[0] ? getContentProfile(profiles[0].id) : null;
  const calendar = latestCalendarForProject(id);
  const assets = latestProfile ? listRawAssets(latestProfile.id) : [];

  return (
    <ContentStudioWorkspace
      mode="project"
      projectId={id}
      initialBlockedReason={blocked}
      initialProfileId={latestProfile?.id ?? null}
      initialProfile={(latestProfile?.payload as BrandProfile | undefined) ?? null}
      initialAssets={assets}
      initialCalendar={calendar}
    />
  );
}

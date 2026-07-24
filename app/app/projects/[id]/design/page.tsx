import { notFound } from "next/navigation";
import { getProject } from "@/lib/queries";
import { buildBriefContext, listAssets } from "@/lib/design";
import { designSystemBlockedReason } from "@/lib/design-gates";
import { hasApprovedLogo } from "@/lib/studio";
import { designApiKeyStatus } from "@/lib/settings";
import { DesignStudio } from "@/components/DesignStudio";
import { getActiveDesignJob, serializeDesignJob, startDesignJob } from "@/lib/design-jobs";
import { viabilityActionBlockedReason } from "@/lib/project-gates";

export const dynamic = "force-dynamic";

export default async function DesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const assets = listAssets(id);
  const openDesign = designApiKeyStatus();
  const activeJob = getActiveDesignJob(id);
  if (activeJob) void startDesignJob(activeJob.id);

  return (
    <DesignStudio
      projectId={id}
      projectName={project.name}
      initialAssets={assets}
      initialJob={activeJob ? serializeDesignJob(activeJob) : null}
      initialShareToken={project.share_token}
      generationBlockedReason={
        viabilityActionBlockedReason(project, "design")
          ?? designSystemBlockedReason(buildBriefContext(id), {
            hasApprovedLogo: hasApprovedLogo(id),
          })
      }
      apiKeyConfigured={openDesign.configured}
    />
  );
}

import { notFound } from "next/navigation";
import { getProject } from "@/lib/queries";
import { listAssets } from "@/lib/design";
import { canEnterDesignStudio } from "@/lib/studio";
import { designApiKeyStatus } from "@/lib/settings";
import { DesignStudio } from "@/components/DesignStudio";
import { getActiveDesignJob, serializeDesignJob, startDesignJob } from "@/lib/design-jobs";
import { ensureOpenDesignDaemon } from "@/lib/open-design-ensure";

export const dynamic = "force-dynamic";

export default async function DesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  // Best-effort: wake OD when the owner opens Design Studio.
  void ensureOpenDesignDaemon().catch(() => undefined);

  const assets = listAssets(id);
  const openDesign = designApiKeyStatus();
  const activeJob = getActiveDesignJob(id);
  // Always resume — never wipe proposals that landed before a refresh/restart.
  if (activeJob) void startDesignJob(activeJob.id, { resume: true });

  const enter = canEnterDesignStudio(id);

  return (
    <DesignStudio
      projectId={id}
      projectName={project.name}
      initialAssets={assets}
      initialJob={activeJob ? serializeDesignJob(activeJob) : null}
      initialShareToken={project.share_token}
      generationBlockedReason={enter.reason}
      apiKeyConfigured={openDesign.configured}
    />
  );
}

import { notFound } from "next/navigation";
import { getProject } from "@/lib/queries";
import { listAssets } from "@/lib/design";
import { apiKeyStatus } from "@/lib/settings";
import { DesignStudio } from "@/components/DesignStudio";

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
  const keyStatus = apiKeyStatus();

  return (
    <DesignStudio
      projectId={id}
      projectName={project.name}
      initialAssets={assets}
      apiKeyConfigured={keyStatus.configured}
    />
  );
}

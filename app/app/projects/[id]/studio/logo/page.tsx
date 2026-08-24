import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProject } from "@/lib/queries";
import { logoWorkspace, studioBlockedReason } from "@/lib/studio";
import { needsNameWorkshop } from "@/lib/naming-propose";
import { StudioLogoWorkspace, type WorkspaceAsset } from "@/components/StudioLogoWorkspace";

export const dynamic = "force-dynamic";

export default async function LogoWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const ws = logoWorkspace(id);
  // Soft name gate only before any logo work exists.
  if (
    needsNameWorkshop(id) &&
    !studioBlockedReason(id, "logo") &&
    ws.assets.length === 0
  ) {
    redirect(`/projects/${id}/name`);
  }
  // Serialize for the client component: dates → ISO, evaluation → verdict+scores only.
  const assets: WorkspaceAsset[] = ws.assets.map((a) => {
    const payload = a.payload ?? {};
    const tokens = payload.tokens ?? {};
    return {
      id: a.id,
      label: a.label,
      direction: a.direction,
      status: a.status,
      payload,
      approvedAt: a.approved_at ? a.approved_at.toISOString() : null,
      verdict: a.evaluation?.verdict ?? null,
      scores: a.evaluation?.scores ?? [],
      refinedFrom: typeof tokens.refinedFrom === "string" ? tokens.refinedFrom : null,
      refinedFromLabel: typeof tokens.refinedFromLabel === "string" ? tokens.refinedFromLabel : null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 lg:px-12 lg:py-8">
      <Link
        href={`/projects/${id}/studio`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} /> Studio
      </Link>
      <StudioLogoWorkspace projectId={id} initialBlocked={ws.blocked} name={ws.name} initialAssets={assets} />
    </div>
  );
}

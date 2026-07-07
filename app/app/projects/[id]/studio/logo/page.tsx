import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProject } from "@/lib/queries";
import { logoWorkspace } from "@/lib/studio";
import { StudioLogoWorkspace, type WorkspaceAsset } from "@/components/StudioLogoWorkspace";

export const dynamic = "force-dynamic";

export default async function LogoWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const ws = logoWorkspace(id);
  // Serialize for the client component: dates → ISO, evaluation → verdict+scores only.
  const assets: WorkspaceAsset[] = ws.assets.map((a) => ({
    id: a.id,
    label: a.label,
    direction: a.direction,
    status: a.status,
    payload: a.payload ?? {},
    approvedAt: a.approved_at ? a.approved_at.toISOString() : null,
    verdict: a.evaluation?.verdict ?? null,
    scores: a.evaluation?.scores ?? [],
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 lg:px-12 lg:py-12">
      <Link
        href={`/projects/${id}/studio`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} /> Studio
      </Link>
      <StudioLogoWorkspace projectId={id} initialBlocked={ws.blocked} name={ws.name} initialAssets={assets} />
    </div>
  );
}

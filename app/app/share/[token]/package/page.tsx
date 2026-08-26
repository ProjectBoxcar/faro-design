import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageX } from "lucide-react";
import { FinalPackageViewer } from "@/components/FinalPackageViewer";
import {
  finalDeliverableIssue,
  FINAL_DESIGN_KINDS,
  type FinalDesignKind,
} from "@/lib/design-deliverable";
import { listAssets } from "@/lib/design";
import { getProjectByShareToken } from "@/lib/queries";
import { getCurrentSnapshotByToken } from "@/lib/publish-snapshot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private final brand package",
  robots: { index: false, follow: false, nocache: true },
};

const LABELS: Record<FinalDesignKind, string> = {
  design_system: "Brand Identity System",
  landing_page: "Landing Page",
  deck: "Brand Deck",
};

export default async function SharePackagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = getProjectByShareToken(token);
  if (!project?.share_token) notFound();

  const snapshot = getCurrentSnapshotByToken(token);

  if (snapshot) {
    if (!snapshot.payload.package.ready) {
      return notReady(token, "This package was not complete when the brief was published.");
    }
    const outputs = FINAL_DESIGN_KINDS.map((kind) => {
      const asset = snapshot.payload.package.assets.find((a) => a.kind === kind);
      return {
        kind,
        label: LABELS[kind],
        variant: asset?.variant ?? "Final",
      };
    });
    return (
      <FinalPackageViewer
        token={token}
        projectName={snapshot.payload.project.name}
        clientName={snapshot.payload.project.client_name}
        outputs={outputs}
        snapshotVersion={snapshot.version}
      />
    );
  }

  const assets = listAssets(project.id);
  const issue = finalDeliverableIssue(assets);
  if (issue) return notReady(token, issue);

  const outputs = FINAL_DESIGN_KINDS.map((kind) => {
    const asset = assets.find((candidate) => candidate.kind === kind && candidate.selected)!;
    return {
      kind,
      label: LABELS[kind],
      variant: asset.variant ?? "Final",
    };
  });

  return (
    <FinalPackageViewer
      token={token}
      projectName={project.name}
      clientName={project.client_name}
      outputs={outputs}
    />
  );
}

function notReady(token: string, issue: string) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-12 text-center">
      <div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--muted)]">
        <PackageX size={20} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--subtle)]">
        Private final package
      </p>
      <h1 className="mt-2 font-serif text-xl font-medium tracking-tight">
        This package is not ready yet
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[var(--muted)]">{issue}</p>
      <Link
        href={`/share/${token}`}
        className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--surface-2)]"
      >
        <ArrowLeft size={15} /> View the strategic brief
      </Link>
    </main>
  );
}

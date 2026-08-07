import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectByShareToken } from "@/lib/queries";
import { compileBrief, buildMarkdown } from "@/lib/brief";
import { SectionReadout } from "@/components/SectionReadout";
import { BriefDownloadBar } from "@/components/BriefDownloadBar";
import { PackageCheck } from "lucide-react";
import { listAssets } from "@/lib/design";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import {
  getCurrentSnapshotByToken,
  groupsFromSnapshot,
  buildMarkdownFromSnapshot,
} from "@/lib/publish-snapshot";
import type { Section } from "@/lib/methodology";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function ShareBriefPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = getProjectByShareToken(token);
  if (!project || !project.share_token) notFound();

  const snapshot = getCurrentSnapshotByToken(token);
  const fromSnapshot = Boolean(snapshot);

  const compiled = snapshot
    ? groupsFromSnapshot(snapshot.payload.brief.groups)
    : compileBrief(project);
  const hasAnything = compiled.some((g) => g.sections.length > 0);
  const markdown = snapshot
    ? buildMarkdownFromSnapshot(snapshot.payload)
    : buildMarkdown(project, compiled);
  const packageReady = snapshot
    ? snapshot.payload.package.ready
    : finalDeliverableIssue(listAssets(project.id)) === null;

  const displayName = snapshot?.payload.project.name ?? project.name;
  const displayClient = snapshot?.payload.project.client_name ?? project.client_name;
  const version = snapshot?.version;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 lg:px-8 lg:py-16 2xl:max-w-4xl">
      <header className="mb-10 border-b border-[var(--border)] pb-8">
        <div className="mb-5 flex flex-wrap items-center justify-end gap-2 print:hidden">
          {packageReady && (
            <Link
              href={`/share/${token}/package`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)]"
            >
              <PackageCheck size={13} /> View final package
            </Link>
          )}
          <BriefDownloadBar token={token} markdown={markdown} />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          Brand brief
          {version != null ? ` · v${version}` : ""}
          {fromSnapshot ? " · as shared" : ""}
        </p>
        <h1 className="font-serif text-6xl font-medium leading-[1.0] tracking-tight lg:text-7xl">
          {displayName}
        </h1>
        {displayClient && (
          <p className="mt-3 text-lg text-[var(--muted)]">{displayClient}</p>
        )}
        <p className="mt-2 text-sm text-[var(--subtle)]">
          Prepared for the design team.
          {fromSnapshot && snapshot?.payload.publishedAt
            ? ` Published ${new Date(snapshot.payload.publishedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}.`
            : null}
        </p>
      </header>

      {!hasAnything ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-12 text-center">
          <p className="text-[var(--muted)]">This brief is still being prepared.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {compiled.map((group) =>
            group.sections.length === 0 ? null : (
              <section key={group.heading}>
                <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
                  {group.heading}
                </h2>
                <div className="space-y-8">
                  {group.sections.map(({ section, value }) => (
                    <article key={section.id}>
                      <h3 className="mb-3 font-serif text-3xl font-medium tracking-tight">
                        {section.name}
                      </h3>
                      <SectionReadout section={section as Section} value={value} />
                    </article>
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      )}

      <footer className="mt-16 border-t border-[var(--border)] pt-6 text-center text-xs text-[var(--subtle)] print:hidden">
        {fromSnapshot
          ? "Read-only brand brief — fixed when shared. Later edits in Faro do not change this page until you share again."
          : "Read-only brand brief."}
      </footer>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, LockKeyhole, PackageX } from "lucide-react";
import { FinalPackageViewer } from "@/components/FinalPackageViewer";
import { BrandHandoverActions } from "@/components/BrandHandoverActions";
import {
  FINAL_DESIGN_KINDS,
  finalDeliverableIssue,
  type FinalDesignKind,
} from "@/lib/design-deliverable";
import { listAssets } from "@/lib/design";
import { getProject } from "@/lib/queries";
import { designStudioBlockedReason } from "@/lib/studio";
import { getCurrentSnapshotForProject } from "@/lib/publish-snapshot";
import { CHANNEL_ASSET_KINDS } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const LABELS: Record<FinalDesignKind, string> = {
  design_system: "Brand Identity System",
  landing_page: "Landing Page",
  deck: "Brand Deck",
};

const CHANNEL_LABELS: Record<(typeof CHANNEL_ASSET_KINDS)[number], string> = {
  sms: "SMS template",
  email: "Email template",
  ad: "Ad mockups",
  print: "Print collateral",
};

export default async function BrandHandoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const studioBlocked = designStudioBlockedReason(id);
  const assets = listAssets(id);
  const issue = finalDeliverableIssue(assets);

  const checklist = FINAL_DESIGN_KINDS.map((kind) => {
    const selected = assets.find((a) => a.kind === kind && a.selected && a.html?.trim());
    return {
      kind,
      label: LABELS[kind],
      ready: Boolean(selected),
      variant: selected?.variant ?? null,
    };
  });

  const identityId =
    assets.find((a) => a.kind === "design_system" && a.selected)?.id ?? null;
  const channelChecklist = CHANNEL_ASSET_KINDS.map((kind) => {
    const selected = assets.find(
      (a) =>
        a.kind === kind &&
        a.selected &&
        a.html?.trim() &&
        (!identityId || a.design_system_id === identityId)
    );
    return {
      kind,
      label: CHANNEL_LABELS[kind],
      ready: Boolean(selected),
    };
  });
  const channelsReadyCount = channelChecklist.filter((c) => c.ready).length;

  const outputs = checklist
    .filter((item) => item.ready)
    .map((item) => ({
      kind: item.kind,
      label: item.label,
      variant: item.variant ?? "Final",
    }));

  const packageReady = !issue && outputs.length === FINAL_DESIGN_KINDS.length;
  const snap = getCurrentSnapshotForProject(id);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-12 lg:py-10">
      <Link
        href={`/projects/${id}/design`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} /> Design Studio
      </Link>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--subtle)]">
            Finish
          </p>
          <h1 className="mt-1.5 font-serif text-2xl font-medium tracking-tight lg:text-3xl">
            Brand Handover
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
            Everything you approved in one place—identity, landing page, and deck. Download files for{" "}
            <strong className="font-medium text-[var(--foreground)]">product teams</strong>, present
            full screen, or share a private client link.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/illustrations/stage-handover.jpg"
          alt=""
          width={96}
          height={96}
          className="h-20 w-20 shrink-0 rounded-[var(--radius-lg)] border border-[var(--border)] object-cover shadow-[var(--shadow-card)] sm:h-24 sm:w-24"
        />
      </header>

      {studioBlocked ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-8 text-sm text-[var(--muted)]">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)]">
            <LockKeyhole size={18} />
          </div>
          <p className="font-medium text-[var(--foreground)]">Design Studio is still locked</p>
          <p className="mt-1.5">{studioBlocked}</p>
          <Link
            href={`/projects/${id}/studio/logo`}
            className="mt-4 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Open Logo Workshop
          </Link>
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="font-serif text-lg font-medium tracking-tight">Package checklist</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {checklist.map((item) => (
                    <li
                      key={item.kind}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                        item.ready
                          ? "bg-[var(--ok)]/15 text-[var(--ok)]"
                          : "bg-[var(--surface-2)] text-[var(--muted)]"
                      }`}
                    >
                      {item.ready ? (
                        <Check size={13} />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />
                      )}
                      {item.label}
                      {item.ready && item.variant ? ` · ${item.variant}` : " · needed"}
                    </li>
                  ))}
                  {channelChecklist.map((item) => (
                    <li
                      key={item.kind}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                        item.ready
                          ? "bg-[var(--ok)]/15 text-[var(--ok)]"
                          : "bg-[var(--surface-2)] text-[var(--muted)]"
                      }`}
                      title="Optional channel template from Design Studio"
                    >
                      {item.ready ? (
                        <Check size={13} />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />
                      )}
                      {item.label}
                      {item.ready ? "" : " · optional"}
                    </li>
                  ))}
                  {channelsReadyCount > 0 && channelsReadyCount < CHANNEL_ASSET_KINDS.length ? (
                    <li className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
                      Channels {channelsReadyCount}/{CHANNEL_ASSET_KINDS.length}
                    </li>
                  ) : null}
                  <li
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                      packageReady
                        ? "bg-[var(--ok)]/15 text-[var(--ok)]"
                        : "bg-[var(--surface-2)] text-[var(--muted)]"
                    }`}
                  >
                    {packageReady ? <Check size={13} /> : <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />}
                    Files for product teams
                    {packageReady ? " · ready to download" : " · after finals"}
                  </li>
                </ul>
                {issue && (
                  <p className="mt-3 flex items-start gap-2 text-sm text-[var(--muted)]">
                    <PackageX size={16} className="mt-0.5 shrink-0" />
                    {issue}
                  </p>
                )}
              </div>
              <BrandHandoverActions
                projectId={id}
                initialShareToken={project.share_token}
                packageReady={packageReady}
                initialSnapshotPackageReady={snap?.payload?.package?.ready ?? null}
                initialVersion={snap?.version ?? null}
              />
            </div>
          </section>

          {packageReady ? (
            <FinalPackageViewer
              embedded
              projectId={id}
              projectName={project.name}
              clientName={project.client_name}
              token={project.share_token}
              previewBase={`/api/projects/${id}/package`}
              briefHref={project.share_token ? `/share/${project.share_token}` : undefined}
              outputs={outputs}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-10 text-center">
              <p className="font-medium text-[var(--foreground)]">Package not complete yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
                Finish selecting finals in Design Studio. When identity, landing page, and deck are
                all chosen, the full handover preview appears here.
              </p>
              <Link
                href={`/projects/${id}/design`}
                className="mt-5 inline-flex rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
              >
                Continue in Design Studio
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

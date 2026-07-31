"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, ExternalLink, Loader2, Package, RefreshCw, Share2 } from "lucide-react";

export function BrandHandoverActions({
  projectId,
  initialShareToken,
  packageReady,
  initialSnapshotPackageReady = null,
  initialVersion = null,
}: {
  projectId: string;
  initialShareToken: string | null;
  packageReady: boolean;
  /** Whether the current freeze already includes the design package. */
  initialSnapshotPackageReady?: boolean | null;
  initialVersion?: number | null;
}) {
  const router = useRouter();
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [version, setVersion] = useState<number | null>(initialVersion);
  const [snapshotPackageReady, setSnapshotPackageReady] = useState<boolean | null>(
    initialSnapshotPackageReady
  );
  const [busy, setBusy] = useState(false);
  const [packBusy, setPackBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

  const needsPackageUpdate =
    Boolean(shareToken) && packageReady && snapshotPackageReady === false;

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, action: "publish" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not publish");
      const token = (data.token as string | undefined) ?? null;
      if (token) setShareToken(token);
      setVersion((data.version as number | null | undefined) ?? null);
      const ready = Boolean((data.packageReady as boolean | undefined));
      setSnapshotPackageReady(ready);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!shareToken) return;
    try {
      const path =
        packageReady && snapshotPackageReady !== false
          ? `/share/${shareToken}/package`
          : `/share/${shareToken}`;
      await navigator.clipboard.writeText(`${origin}${path}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }

  async function downloadBrandPack() {
    if (!packageReady || packBusy) return;
    setPackBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/brand-pack`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not build brand pack");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      const filename =
        cd?.match(/filename="([^"]+)"/)?.[1] ?? "brand-implement-pack.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download brand pack");
    } finally {
      setPackBusy(false);
    }
  }

  const statusLine = !packageReady
    ? "Finish all three finals to unlock export"
    : !shareToken
      ? "Ready to publish the brand package (freezes snapshot) or download the implement pack"
      : needsPackageUpdate
        ? `Strategy brief shared${version != null ? ` v${version}` : ""} — package not frozen yet`
        : snapshotPackageReady
          ? `Brand package published${version != null ? ` v${version}` : ""} — frozen share link`
          : `Strategy brief shared${version != null ? ` v${version}` : ""}`;

  return (
    <div className="shrink-0 space-y-3 lg:text-right">
      <p className="text-xs font-medium text-[var(--muted)]">{statusLine}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
        <button
          type="button"
          onClick={() => void downloadBrandPack()}
          disabled={!packageReady || packBusy}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          title="tokens.css, logos, icons, copy.json, IMPLEMENT.md"
        >
          {packBusy ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />}
          {packBusy ? "Building pack…" : "Download implement pack"}
        </button>
        {shareToken ? (
          <>
            {needsPackageUpdate && (
              <button
                type="button"
                onClick={() => void publish()}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                {busy ? "Updating…" : "Update package freeze"}
              </button>
            )}
            <a
              href={
                packageReady && snapshotPackageReady !== false
                  ? `/share/${shareToken}/package`
                  : `/share/${shareToken}`
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--surface-2)]"
            >
              <ExternalLink size={15} />{" "}
              {packageReady && snapshotPackageReady !== false
                ? "Open package link"
                : "Open strategy brief"}
            </a>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--surface-2)]"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy client link"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void publish()}
            disabled={!packageReady || busy}
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
            {busy ? "Publishing…" : "Publish brand package"}
          </button>
        )}
      </div>
      <p className="text-[11px] leading-snug text-[var(--subtle)]">
        <Download size={11} className="mr-1 inline" />
        Implement pack = tokens, logo, icons, copy, and a short how-to for product UI.
        {shareToken && !packageReady
          ? " A strategy brief is already shared; the full package freezes after Design Studio finals."
          : null}
      </p>
      <Link
        href={`/projects/${projectId}/design`}
        className="inline-flex text-xs text-[var(--subtle)] underline-offset-2 hover:underline"
      >
        Back to Design Studio
      </Link>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

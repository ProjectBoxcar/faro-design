"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, ExternalLink, Loader2, Package, Share2 } from "lucide-react";

export function BrandHandoverActions({
  projectId,
  initialShareToken,
  packageReady,
}: {
  projectId: string;
  initialShareToken: string | null;
  packageReady: boolean;
}) {
  const router = useRouter();
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [busy, setBusy] = useState(false);
  const [packBusy, setPackBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

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
      await navigator.clipboard.writeText(`${origin}/share/${shareToken}/package`);
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

  return (
    <div className="shrink-0 space-y-3 lg:text-right">
      <p className="text-xs font-medium text-[var(--muted)]">
        {packageReady
          ? shareToken
            ? "Published — share, present, or implement"
            : "Ready to publish or download the implement pack"
          : "Finish all three finals to unlock export"}
      </p>
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
            <a
              href={`/share/${shareToken}/package`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--surface-2)]"
            >
              <ExternalLink size={15} /> Open private link
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
            {busy ? "Publishing…" : "Publish private link"}
          </button>
        )}
      </div>
      <p className="text-[11px] leading-snug text-[var(--subtle)]">
        <Download size={11} className="mr-1 inline" />
        Implement pack = tokens, logo, icons, copy, and a short how-to for product UI.
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

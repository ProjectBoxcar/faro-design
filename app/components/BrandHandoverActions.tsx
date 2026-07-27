"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, Share2 } from "lucide-react";

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

  return (
    <div className="shrink-0 space-y-2 lg:text-right">
      <p className="text-xs font-medium text-[var(--muted)]">
        {packageReady
          ? shareToken
            ? "Published — share or present"
            : "Ready to publish a private client link"
          : "Finish all three finals to publish"}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
        {shareToken ? (
          <>
            <a
              href={`/share/${shareToken}/package`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--surface-2)]"
            >
              <ExternalLink size={15} /> Open private link
            </a>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--surface-2)]"
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
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
            {busy ? "Publishing…" : "Publish private link"}
          </button>
        )}
      </div>
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

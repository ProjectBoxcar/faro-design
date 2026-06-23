"use client";

import { useEffect, useState } from "react";
import { Share2, Copy, Check, Link2Off } from "lucide-react";

// Publish/unpublish the read-only handover brief and surface the shareable link.
export function PublishPanel({
  projectId,
  initialToken,
}: {
  projectId: string;
  initialToken: string | null;
}) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = token ? `${origin}/share/${token}` : "";

  async function publish() {
    setBusy(true);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, action: "publish" }),
    });
    if (res.ok) {
      const data = (await res.json()) as { token: string };
      setToken(data.token);
    }
    setBusy(false);
  }

  async function unpublish() {
    setBusy(true);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, action: "unpublish" }),
    });
    if (res.ok) setToken(null);
    setBusy(false);
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow">
      {!token ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--muted)]">
            Generate a private link to a clean, read-only brief your designer can open in any
            browser.
          </p>
          <div>
            <button
              onClick={publish}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Share2 size={15} />
              {busy ? "Publishing…" : "Publish & get share link"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--muted)]">
            This brief is live. Anyone with the link can view it (read-only).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--foreground)]"
            />
            <button
              onClick={copyUrl}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div>
            <button
              onClick={unpublish}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
            >
              <Link2Off size={15} />
              {busy ? "Unpublishing…" : "Unpublish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

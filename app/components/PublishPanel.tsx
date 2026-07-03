"use client";

import { useEffect, useState } from "react";
import { Share2, Copy, Check, Link2Off, ExternalLink, FileDown } from "lucide-react";

// Publish/unpublish the read-only handover brief and surface the shareable link.
// `prominent` is the finish-line version shown when the strategy is reviewed:
// bigger, with view + download actions alongside the link.
export function PublishPanel({
  projectId,
  initialToken,
  prominent = false,
}: {
  projectId: string;
  initialToken: string | null;
  prominent?: boolean;
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

  const dl = token ? `/share/${token}/download` : "";
  const dlLink =
    "inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3.5 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]";

  if (prominent) {
    return (
      <div className="card-shadow rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-6 lg:p-8">
        <h2 className="font-serif text-3xl font-medium tracking-tight">
          {token ? "Your brief is ready 🎉" : "Hand off to your designer"}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          {token
            ? "Read it over, send your designer the link, or download it in the format they prefer."
            : "Your strategy is reviewed. Publish it as a clean, read-only brief your designer can open in any browser."}
        </p>

        {!token ? (
          <button
            onClick={publish}
            disabled={busy}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            <Share2 size={16} />
            {busy ? "Publishing…" : "Publish & get share link"}
          </button>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
              >
                <ExternalLink size={15} /> View the brief
              </a>
              <button
                onClick={copyUrl}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--surface)]"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied!" : "Copy link"}
              </button>
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 basis-64 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--muted)]"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--subtle)]">Download:</span>
              <a href={`${url}`} target="_blank" rel="noreferrer" className={dlLink}>
                <FileDown size={13} /> PDF (print from the brief)
              </a>
              <a href={`${dl}?format=doc`} className={dlLink}>
                <FileDown size={13} /> Word
              </a>
              <a href={`${dl}?format=html`} className={dlLink}>
                <FileDown size={13} /> HTML
              </a>
              <a href={`${dl}?format=md`} className={dlLink}>
                <FileDown size={13} /> Markdown
              </a>
              <button
                onClick={unpublish}
                disabled={busy}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-[var(--subtle)] transition hover:text-[var(--danger)]"
              >
                <Link2Off size={13} />
                {busy ? "Unpublishing…" : "Unpublish"}
              </button>
            </div>
          </>
        )}
      </div>
    );
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

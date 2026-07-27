"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

// Delete a whole project (and everything in it) with a lightweight inline confirm.
// `variant="icon"` is for dense UI (home project cards); default is the full project-hub control.
export function DeleteProjectButton({
  projectId,
  projectName,
  variant = "default",
}: {
  projectId: string;
  projectName: string;
  variant?: "default" | "icon";
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (variant === "icon") {
    if (!confirming) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(true);
          }}
          aria-label={`Delete ${projectName}`}
          title="Delete project"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--danger)]/25 bg-[var(--danger)]/5 text-[var(--danger)]/70 transition hover:border-[var(--danger)]/50 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
        >
          <Trash2 size={14} />
        </button>
      );
    }

    return (
      <div
        className="flex flex-wrap items-center gap-1.5"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <span className="text-[11px] text-[var(--muted)]">Delete?</span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-full px-2 py-1 text-[11px] text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={del}
          disabled={busy}
          className="rounded-full bg-[var(--danger)] px-2.5 py-1 text-[11px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "…" : "Delete"}
        </button>
      </div>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--danger)] transition hover:border-[var(--danger)]"
      >
        <Trash2 size={15} /> Delete project
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-[var(--muted)]">
        Delete <span className="font-medium text-[var(--foreground)]">{projectName}</span> and
        everything in it? This can&apos;t be undone.
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-full px-3 py-1 text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={del}
          disabled={busy}
          className="rounded-full bg-[var(--danger)] px-3 py-1 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

// Delete a whole project (and everything in it) with a lightweight inline confirm.
export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
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
    }
  }

  if (!confirming) {
    return (
      <button
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
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-full px-3 py-1 text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
        >
          Cancel
        </button>
        <button
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

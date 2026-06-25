"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";

// Footer for a pillar review screen: marks the whole pillar reviewed (its filled
// steps complete) and moves to the next pillar, or back to the hub when done.
export function PillarReviewFooter({
  projectId,
  pillarId,
  isLast,
}: {
  projectId: string;
  pillarId: string;
  isLast: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function done() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, pillarId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't save. Try again.");
        setBusy(false);
        return;
      }
      router.push(data.next ? `/projects/${projectId}/review/${data.next}` : `/projects/${projectId}`);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-6">
      <span className="text-sm text-[var(--muted)]">Edits save automatically as you go.</span>
      <div className="flex items-center gap-3">
        {error && <span className="text-sm text-[var(--danger)]">{error}</span>}
        <button
          onClick={done}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {busy ? "Saving…" : isLast ? "Looks good — finish" : "Looks good — continue"}
          {isLast ? <Check size={16} /> : <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  );
}

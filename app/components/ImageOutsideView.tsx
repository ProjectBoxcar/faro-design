"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, Telescope, BadgeInfo } from "lucide-react";
import type { ImageViewState } from "@/lib/image-view";

// The Image pillar's fork in the road: a real survey (best data, more work)
// or an AI outside view (fast, honest about being inferred). Shown wherever
// the owner meets the Image steps, until one of the two paths has happened.
export function ImageOutsideView({
  projectId,
  initialState,
}: {
  projectId: string;
  initialState: ImageViewState;
}) {
  const router = useRouter();
  const [state, setState] = useState<ImageViewState>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state === "surveyed") return null;

  if (state === "inferred") {
    return (
      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--muted)]">
        <BadgeInfo size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
        <p>
          <strong className="text-[var(--foreground)]">Inferred — not surveyed.</strong> Your image
          pillar currently rests on an AI outside view. It&apos;s labeled that way everywhere,
          including the designer brief. Paste real customer answers into{" "}
          <strong className="text-[var(--foreground)]">Results</strong> anytime — they replace the
          inference and make everything downstream stronger.
        </p>
      </div>
    );
  }

  async function infer() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/image-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setState(data.state);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="font-serif text-lg font-semibold tracking-tight">
        How do others actually see you? Two ways to find out:
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ClipboardList size={15} className="text-[var(--accent)]" /> Ask real customers
            <span className="rounded-full border border-[var(--ok)]/50 px-2 py-0.5 text-[10px] font-medium text-[var(--ok)]">
              best data
            </span>
          </p>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Send the short survey below to 5–10 people and paste their answers into Results. Takes a
            few days, but nothing beats real voices.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Telescope size={15} className="text-[var(--accent)]" /> Let AI infer it
            <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
              fast · labeled as inferred
            </span>
          </p>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Claude researches your public footprint (reviews, mentions, your sector) and drafts an
            honest outside view — clearly marked as inferred, never fake quotes. ~2 minutes.
          </p>
          <button
            onClick={infer}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Researching your public image…
              </>
            ) : (
              "Infer my image with AI"
            )}
          </button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      <p className="mt-3 text-xs text-[var(--subtle)]">
        You can do both: infer now to keep moving, and swap in real survey answers later.
      </p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Trash2 } from "lucide-react";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";
import { JourneyProgress, type JourneyStep } from "@/components/JourneyProgress";

export type ProjectCardData = {
  id: string;
  name: string;
  clientName: string | null;
  status: string;
  phase: string;
  /** Methodology journey points (Strategic → … → Design). */
  steps: JourneyStep[];
  /** Required strategy steps filled (draft or complete). */
  strategyFilled: number;
  strategyTotal: number;
  /** Required strategy steps marked complete (reviewed / approved). */
  strategyComplete: number;
  published: boolean;
  /** Prefer the express review page for continue. */
  expressReady: boolean;
  /** Logo Workshop unlock (strategy essentials drafted). */
  logoWorkshopReady: boolean;
  /** An approved logo exists — Design Studio may open. */
  logoApproved: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  at_risk: "At risk",
  blocked: "Blocked",
  archived: "Archived",
};

export function ProjectList({ projects }: { projects: ProjectCardData[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = projects.length > 0 && selected.size === projects.length;
  const someSelected = selected.size > 0;

  const selectedNames = useMemo(
    () => projects.filter((p) => selected.has(p.id)).map((p) => p.name),
    [projects, selected]
  );

  function toggle(id: string) {
    setConfirming(false);
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setConfirming(false);
    setError(null);
    setSelected(allSelected ? new Set() : new Set(projects.map((p) => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
    setConfirming(false);
    setError(null);
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    const ids = [...selected];
    const results = await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
        return { id, ok: res.ok };
      })
    );
    const failed = results.filter((r) => !r.ok);
    setBusy(false);
    if (failed.length > 0) {
      setError(
        failed.length === ids.length
          ? "Couldn't delete the selected projects."
          : `Deleted ${ids.length - failed.length}, but ${failed.length} failed.`
      );
      setSelected(new Set(failed.map((f) => f.id)));
      setConfirming(false);
      router.refresh();
      return;
    }
    clearSelection();
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          Your projects
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {projects.length > 1 && (
            <button
              type="button"
              onClick={toggleAll}
              className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          )}
          {someSelected && !confirming && (
            <>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full px-3 py-1.5 text-xs text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-3 py-1.5 text-xs font-medium text-[var(--danger)]/90 transition hover:border-[var(--danger)]/50 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
              >
                <Trash2 size={13} />
                Delete {selected.size}
              </button>
            </>
          )}
          {someSelected && confirming && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[var(--muted)]">
                Delete{" "}
                {selected.size === 1 ? (
                  <span className="font-medium text-[var(--foreground)]">{selectedNames[0]}</span>
                ) : (
                  <span className="font-medium text-[var(--foreground)]">{selected.size} projects</span>
                )}
                ? Can&apos;t be undone.
              </span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="rounded-full px-3 py-1.5 text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--danger)] px-3 py-1.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                <Trash2 size={13} />
                {busy ? "Deleting…" : `Delete ${selected.size}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-4 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {projects.map((p) => {
          const isSelected = selected.has(p.id);
          const strategyDone =
            p.published ||
            p.phase === "design" ||
            p.phase === "finished" ||
            (p.strategyTotal > 0 && p.strategyComplete >= p.strategyTotal) ||
            p.logoWorkshopReady;
          const draftedReady =
            !strategyDone && p.strategyTotal > 0 && p.strategyFilled >= p.strategyTotal;
          // Order: strategy → Logo Workshop → Design Studio → Brand Handover
          const continueHref = p.logoApproved
            ? `/projects/${p.id}/design`
            : strategyDone || p.logoWorkshopReady
            ? `/projects/${p.id}/studio`
            : draftedReady || p.expressReady
            ? `/projects/${p.id}/express`
            : `/projects/${p.id}`;
          const statusLabel = p.logoApproved
            ? "Logo approved — continue design"
            : strategyDone || p.logoWorkshopReady
            ? "Strategy ready — Logo Workshop"
            : draftedReady
            ? "Ready to review"
            : p.strategyFilled > 0
            ? "Strategy in progress"
            : "Not started";
          const ctaLabel = p.logoApproved
            ? "Continue"
            : strategyDone || p.logoWorkshopReady
            ? "Logo Workshop"
            : draftedReady
            ? "Review strategy"
            : "Continue";

          return (
            <li
              key={p.id}
              className={`card-shadow flex flex-col gap-3 rounded-2xl border bg-[var(--surface)] px-5 py-4 transition ${
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]/30"
                  : "border-[var(--border)] hover:bg-[var(--surface-2)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`Select ${p.name}`}
                  onClick={() => toggle(p.id)}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border-strong)] text-transparent hover:border-[var(--muted)]"
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </button>
                <Link href={continueHref} className="block min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      {p.clientName && (
                        <div className="truncate text-sm text-[var(--subtle)]">{p.clientName}</div>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-xs ${
                        p.status === "blocked"
                          ? "text-[var(--danger)]"
                          : p.status === "at_risk"
                          ? "text-[var(--warn)]"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                </Link>
              </div>

              <Link href={continueHref} className="block">
                <JourneyProgress steps={p.steps} />
                <p className="mt-2 text-[11px] text-[var(--subtle)]">{statusLabel}</p>
              </Link>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                <DeleteProjectButton projectId={p.id} projectName={p.name} variant="icon" />
                <Link
                  href={continueHref}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)]"
                >
                  {ctaLabel}
                  <ArrowRight size={12} />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Pencil, Sparkles } from "lucide-react";
import type { Section } from "@/lib/methodology";
import { SectionReadout } from "./SectionReadout";
import { SectionEditor } from "./SectionEditor";

type Value = Record<string, unknown>;

export type ReviewStep = {
  section: Section;
  initialValue: Value;
  initialStatus: string;
  aiGenerated: boolean;
  autoDraft: boolean;
  whatItIs?: string;
  missingReadNames: string[];
};

function hasContent(v: Value): boolean {
  return Object.values(v).some((x) => {
    if (x == null) return false;
    if (typeof x === "string") return x.trim() !== "";
    if (Array.isArray(x)) return x.length > 0;
    return true;
  });
}

type StepState = {
  value: Value;
  status: string;
  aiOwned: boolean;
  generating: boolean;
  // An AI draft held in memory only — persisted when the owner approves the
  // pillar ("Looks good") or opens the step to edit it. Never silently saved.
  unsavedDraft: boolean;
  generationId: string | null;
  editing: boolean;
  error: string | null;
};

// One review screen per pillar: every step rendered as a compact READOUT, one
// "Looks good" for the whole pillar. Editing a single step swaps in the full
// editor; everything else stays read-and-move-on.
export function PillarReview({
  projectId,
  groupId,
  steps,
  prevId,
  isLast,
}: {
  projectId: string;
  groupId: string;
  steps: ReviewStep[];
  prevId: string | null;
  isLast: boolean;
}) {
  const router = useRouter();
  const [states, setStates] = useState<StepState[]>(() =>
    steps.map((s) => ({
      value: s.initialValue,
      status: s.initialStatus,
      aiOwned: s.aiGenerated,
      generating: s.autoDraft && !hasContent(s.initialValue),
      unsavedDraft: false,
      generationId: null,
      editing: false,
      error: null,
    }))
  );
  const [busy, setBusy] = useState(false);
  const [footerError, setFooterError] = useState<string | null>(null);
  const ran = useRef(false);

  function patch(i: number, p: Partial<StepState>) {
    setStates((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)));
  }

  // Draft all empty derived steps in parallel on open — the owner reads finished
  // content instead of forms. Drafts stay in memory until approved.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    steps.forEach((step, i) => {
      if (!(step.autoDraft && !hasContent(step.initialValue))) return;
      (async () => {
        try {
          const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, key: step.section.id, value: {} }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.values && Object.keys(data.values).length > 0) {
            patch(i, {
              value: data.values as Value,
              aiOwned: true,
              unsavedDraft: true,
              generationId: data.generationId ?? null,
              generating: false,
            });
          } else {
            patch(i, { generating: false, error: data.error ?? "Couldn't draft this — open it to write or retry." });
          }
        } catch {
          patch(i, { generating: false, error: "Couldn't draft this — open it to write or retry." });
        }
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist one in-memory draft (approve moment: pillar button or opening the editor).
  async function persistDraft(i: number): Promise<boolean> {
    const s = states[i];
    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        key: steps[i].section.id,
        value: s.value,
        status: "draft",
        aiGenerated: true,
      }),
    });
    if (!res.ok) return false;
    if (s.generationId) {
      void fetch("/api/generate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: s.generationId }),
      }).catch(() => {});
    }
    patch(i, { unsavedDraft: false, generationId: null, status: "draft" });
    return true;
  }

  async function openEditor(i: number) {
    if (states[i].unsavedDraft) {
      const ok = await persistDraft(i);
      if (!ok) {
        patch(i, { error: "Couldn't save this draft — check your connection." });
        return;
      }
    }
    patch(i, { editing: true });
  }

  // Approve the pillar: persist any remaining in-memory drafts, then mark all
  // content-filled steps complete and move on.
  async function done() {
    setBusy(true);
    setFooterError(null);
    try {
      const saves = await Promise.all(states.map((s, i) => (s.unsavedDraft ? persistDraft(i) : true)));
      if (saves.some((ok) => !ok)) {
        setFooterError("Couldn't save some drafts — try again.");
        setBusy(false);
        return;
      }
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, groupId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFooterError(data.error ?? "Couldn't save. Try again.");
        setBusy(false);
        return;
      }
      router.push(data.next ? `/projects/${projectId}/review/${data.next}` : `/projects/${projectId}`);
      router.refresh();
    } catch {
      setFooterError("Network error. Try again.");
      setBusy(false);
    }
  }

  const anyGenerating = states.some((s) => s.generating);
  // Progress among steps that auto-drafted (empty on open).
  const generatingCount = states.filter((s) => s.generating).length;
  const autoDraftStarted = steps.filter(
    (step, i) => step.autoDraft && !hasContent(step.initialValue)
  ).length;
  const autoDraftDone = Math.max(0, autoDraftStarted - generatingCount);
  const pillarPct =
    autoDraftStarted > 0 ? Math.round((autoDraftDone / autoDraftStarted) * 100) : 0;

  return (
    <div>
      {anyGenerating && autoDraftStarted > 0 && (
        <div className="mb-8 rounded-2xl border border-[var(--designer)]/30 bg-[var(--accent-soft)] px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-[var(--designer)]">
              <Loader2 size={15} className="animate-spin" />
              Drafting this pillar…
            </span>
            <span className="font-semibold tabular-nums text-[var(--designer)]" aria-live="polite">
              {pillarPct}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/50 dark:bg-black/20">
              <div
                className="h-full rounded-full bg-[var(--designer)] transition-all duration-500"
                style={{ width: `${pillarPct}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-[var(--muted)]">
              {autoDraftDone}/{autoDraftStarted}
            </span>
          </div>
        </div>
      )}
      <div className="space-y-10">
        {steps.map((step, i) => {
          const s = states[i];
          const filled = hasContent(s.value);
          return (
            <section
              key={step.section.id}
              className="border-t border-[var(--border)] pt-8 first:border-0 first:pt-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-2xl font-medium tracking-tight">{step.section.name}</h2>
                <div className="flex items-center gap-2">
                  {s.aiOwned && filled && s.status !== "complete" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--designer)]">
                      <Sparkles size={11} /> AI draft
                    </span>
                  )}
                  {!s.editing && (
                    <button
                      onClick={() => openEditor(i)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                    >
                      <Pencil size={12} /> {filled ? "Edit" : "Write it"}
                    </button>
                  )}
                </div>
              </div>
              {step.whatItIs && (
                <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">{step.whatItIs}</p>
              )}

              <div className="mt-4">
                {s.editing ? (
                  <SectionEditor
                    projectId={projectId}
                    section={step.section}
                    initialValue={s.value}
                    initialStatus={s.status === "empty" && filled ? "draft" : s.status}
                    aiGenerated={s.aiOwned}
                    embedded
                  />
                ) : s.generating ? (
                  <div className="flex items-center gap-2.5 rounded-lg border border-[var(--designer)]/40 bg-[var(--accent-soft)] p-4 text-sm">
                    <Loader2 size={16} className="animate-spin text-[var(--designer)]" />
                    <span className="text-[var(--designer)]">Writing this from your earlier answers…</span>
                  </div>
                ) : filled ? (
                  <SectionReadout section={step.section} value={s.value} />
                ) : (
                  <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                    {step.section.optional ? (
                      <>Optional — fine to skip. It won&apos;t hold anything up.</>
                    ) : step.missingReadNames.length > 0 ? (
                      <>
                        Builds on{" "}
                        <span className="text-[var(--foreground)]">{step.missingReadNames.join(", ")}</span> — fill
                        those first and this writes itself, or write it yourself now.
                      </>
                    ) : (
                      <>Nothing here yet — only you know this one. It&apos;s quick.</>
                    )}
                  </div>
                )}
                {s.error && <p className="mt-2 text-sm text-[var(--danger)]">{s.error}</p>}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-6">
        <div className="flex items-center gap-4">
          {prevId && (
            <Link
              href={`/projects/${projectId}/review/${prevId}`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-5 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            >
              <ArrowLeft size={16} /> Back
            </Link>
          )}
          <span className="hidden text-sm text-[var(--muted)] sm:inline">
            Approving saves everything on this screen.
          </span>
        </div>
        <div className="flex items-center gap-3">
          {footerError && <span className="text-sm text-[var(--danger)]">{footerError}</span>}
          <button
            onClick={done}
            disabled={busy || anyGenerating}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {busy ? "Saving…" : anyGenerating ? "Writing…" : isLast ? "Looks good — finish" : "Looks good — continue"}
            {isLast ? <Check size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

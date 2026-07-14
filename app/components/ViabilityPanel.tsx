"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { EvalScore } from "@/lib/db/types";

export type ViabilityPanelProps = {
  projectId: string;
  viability: "pending" | "pass" | "fail" | "caveat";
  overrideNote: string | null;
  /** Latest evaluation scores (if any). */
  scores: EvalScore[] | null;
  personal: boolean;
};

const STYLE: Record<
  string,
  { label: string; className: string; Icon: typeof CheckCircle2; blurb: string }
> = {
  pending: {
    label: "Not checked yet",
    className: "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)]",
    Icon: ShieldQuestion,
    blurb: "The gate runs automatically once the key Reality answers are on file.",
  },
  pass: {
    label: "Pass",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    Icon: CheckCircle2,
    blurb: "The methodology’s non-negotiables look sound for this engagement.",
  },
  caveat: {
    label: "Pass with caveats",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    Icon: AlertTriangle,
    blurb: "You can continue, but some warning signs or non-blocking gaps showed up.",
  },
  fail: {
    label: "Fail",
    className: "border-red-200 bg-red-50 text-red-800",
    Icon: ShieldAlert,
    blurb: "A non-negotiable condition failed. You can still proceed with a logged reason.",
  },
};

export function ViabilityPanel({
  projectId,
  viability,
  overrideNote,
  scores,
  personal,
}: ViabilityPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(viability === "fail" && !overrideNote);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"override" | "recheck" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localViability, setLocalViability] = useState(viability);
  const [localOverride, setLocalOverride] = useState(overrideNote);

  // Effective display: override turns fail into an annotated pass.
  const displayKey =
    localOverride && localViability === "pass" ? "pass" : localViability;
  const style = STYLE[displayKey] ?? STYLE.pending;
  const Icon = style.Icon;

  async function recheck() {
    setBusy("recheck");
    setError(null);
    try {
      const res = await fetch("/api/viability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, action: "recheck" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Re-check failed");
        setBusy(null);
        return;
      }
      setLocalViability(data.viability);
      setLocalOverride(data.overrideNote ?? null);
      setBusy(null);
      router.refresh();
    } catch {
      setError("Re-check failed — check your connection.");
      setBusy(null);
    }
  }

  async function override() {
    setBusy("override");
    setError(null);
    try {
      const res = await fetch("/api/viability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, action: "override", note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn’t save override");
        setBusy(null);
        return;
      }
      setLocalViability("pass");
      setLocalOverride(data.overrideNote ?? note);
      setBusy(null);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Couldn’t save override — check your connection.");
      setBusy(null);
    }
  }

  // Hide entirely until something useful can be shown (pending with no scores
  // is noise on a brand-new project).
  if (localViability === "pending" && !scores?.length) return null;

  return (
    <div className={`mt-4 rounded-2xl border p-4 ${style.className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              Viability gate: {localOverride ? "Pass (overridden)" : style.label}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed opacity-90">
              {localOverride
                ? `Proceeding with a logged reason. ${personal ? "Personal project — commercial non-negotiables don’t block." : ""}`
                : style.blurb}
            </p>
            {localOverride && (
              <p className="mt-2 rounded-lg bg-white/50 px-2.5 py-1.5 text-xs">
                <span className="font-medium">Override note: </span>
                {localOverride}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void recheck()}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-full border border-current/20 bg-white/60 px-3 py-1.5 text-xs font-medium transition hover:bg-white disabled:opacity-50"
          >
            {busy === "recheck" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Re-check
          </button>
          {scores && scores.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-full border border-current/20 bg-white/60 px-3 py-1.5 text-xs font-medium transition hover:bg-white"
            >
              {open ? "Hide criteria" : "See criteria"}
            </button>
          )}
          <Link
            href={`/projects/${projectId}/${encodeURIComponent("reality.evaluation-criteria")}`}
            className="inline-flex items-center rounded-full border border-current/20 bg-white/60 px-3 py-1.5 text-xs font-medium transition hover:bg-white"
          >
            Full page
          </Link>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-700">{error}</p>}

      {open && scores && scores.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-current/10 pt-3">
          {scores.map((s) => (
            <li key={s.key} className="rounded-lg bg-white/50 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{s.label}</span>
                <span className="uppercase tracking-wide opacity-80">
                  {s.level} · {s.result}
                </span>
              </div>
              {s.notes && <p className="mt-1 opacity-80">{s.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      {localViability === "fail" && !localOverride && (
        <div className="mt-4 border-t border-current/10 pt-3">
          <p className="text-xs font-medium">Proceed anyway?</p>
          <p className="mt-1 text-xs opacity-80">
            Soft override — the fail stays in history; you log why you&apos;re continuing.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. Client has budget approval next month; starting strategy work only."
            className="mt-2 w-full rounded-lg border border-current/20 bg-white px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-current/40"
          />
          <button
            type="button"
            onClick={() => void override()}
            disabled={busy !== null || note.trim().length < 8}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--foreground)] px-4 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy === "override" ? <Loader2 size={13} className="animate-spin" /> : null}
            Proceed with this reason
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Loader2, Pencil, Sparkles, Square, X } from "lucide-react";
import { FaroLoaderPanel } from "@/components/FaroLoader";
import { StagePageBanner } from "@/components/StagePageBanner";
import { useLocale } from "@/components/LocaleProvider";
import { countBasedPercent } from "@/lib/generation-progress";
import { sectionGuide } from "@/lib/guide";

function cardGuide(sectionId: string): string | null {
  const g = sectionGuide(sectionId);
  const line = (g.takeaway || g.whatItIs || "").trim();
  return line || null;
}

// One value block of a strategy section, already reduced to plain JSON.
export type ExpressSection = {
  id: string;
  name: string;
  value: Record<string, unknown> | null;
  fields: {
    id: string;
    label: string;
    type: string;
    columns: { id: string; label: string }[];
    options?: string[];
  }[];
};

export type ExpressStateDto = {
  status: "idle" | "running" | "done" | "failed" | "cancelled";
  done: number;
  total: number;
  current: string | null;
  currentName: string | null;
  error: string | null;
  resumable?: boolean;
  errorCode?: string | null;
  errorHint?: string | null;
  engine?: "strategy-direct";
};

export type RefineStateDto = {
  status: "idle" | "running" | "done" | "failed" | "cancelled";
  sourceId: string | null;
  sourceName: string | null;
  done: number;
  total: number;
  current: string | null;
  currentName: string | null;
  error: string | null;
  updatedIds: string[];
};

const PIPELINE_STAGES = [
  { label: "Reality — what your business actually is", prefix: ["reality."] },
  { label: "Identity — who the brand is", prefix: ["identity."] },
  { label: "Communication — how it speaks", prefix: ["communication."] },
  { label: "Strategic document & brief", prefix: ["strategic-document.", "brief."] },
  { label: "Brand concept & manifesto", prefix: ["concept", "insights", "manifesto"] },
  { label: "Design plan", prefix: ["audit", "design-plan"] },
];

function stageIndexOf(sectionId: string | null): number {
  if (!sectionId) return -1;
  return PIPELINE_STAGES.findIndex((s) => s.prefix.some((p) => sectionId === p || sectionId.startsWith(p)));
}

function isEmptyValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function cloneValue(value: Record<string, unknown> | null): Record<string, unknown> {
  return value ? (JSON.parse(JSON.stringify(value)) as Record<string, unknown>) : {};
}

// Generic renderer for a section value: strings as paragraphs, lists as
// bullets, tables as tables — driven by the methodology field definitions.
function ValueBlock({ section, compactFields }: { section: ExpressSection; compactFields?: string[] }) {
  if (!section.value) return null;
  const fields = compactFields
    ? section.fields.filter((f) => compactFields.includes(f.id))
    : section.fields;
  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const v = section.value?.[f.id];
        if (isEmptyValue(v)) return null;
        return (
          <div key={f.id}>
            {fields.length > 1 && (
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                {f.label}
              </div>
            )}
            {typeof v === "string" && <p className="whitespace-pre-wrap text-sm leading-relaxed">{v}</p>}
            {Array.isArray(v) && f.type === "list" && (
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {(v as string[]).map((item, i) => (
                  <li key={i}>{String(item)}</li>
                ))}
              </ul>
            )}
            {Array.isArray(v) && f.type === "table" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--subtle)]">
                      {f.columns.map((c) => (
                        <th key={c.id} className="py-1.5 pr-4 font-semibold">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(v as Record<string, unknown>[]).map((row, i) => (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0 align-top">
                        {f.columns.map((c) => (
                          <td key={c.id} className="py-2 pr-4 leading-relaxed">
                            {String(row?.[c.id] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: ExpressSection["fields"][number];
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const inputClass =
    "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-[var(--accent)]";

  if (field.type === "list") {
    const lines = Array.isArray(value) ? (value as unknown[]).map((x) => String(x)) : [];
    return (
      <textarea
        className={`${inputClass} min-h-[100px]`}
        value={lines.join("\n")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split("\n")
              .map((l) => l.trimEnd())
              .filter((l, i, arr) => l.length > 0 || i < arr.length - 1)
          )
        }
        placeholder="One item per line"
      />
    );
  }

  if (field.type === "table") {
    const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    return (
      <div className="space-y-3">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="rounded-xl border border-[var(--border)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                Row {rowIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== rowIndex))}
                className="text-[11px] text-[var(--danger)]/80 transition hover:text-[var(--danger)]"
              >
                Remove
              </button>
            </div>
            <div className="space-y-2">
              {field.columns.map((c) => (
                <label key={c.id} className="block">
                  <span className="mb-1 block text-[11px] text-[var(--subtle)]">{c.label}</span>
                  <textarea
                    className={`${inputClass} min-h-[60px]`}
                    value={String(row?.[c.id] ?? "")}
                    onChange={(e) => {
                      const next = rows.map((r, i) =>
                        i === rowIndex ? { ...r, [c.id]: e.target.value } : r
                      );
                      onChange(next);
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const blank: Record<string, unknown> = {};
            for (const c of field.columns) blank[c.id] = "";
            onChange([...rows, blank]);
          }}
          className="text-xs font-medium text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
        >
          + Add row
        </button>
      </div>
    );
  }

  if (field.type === "enum" && field.options?.length) {
    return (
      <select
        className={inputClass}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  // text / textarea / fallback
  const multiline = field.type === "textarea" || String(value ?? "").length > 80;
  if (multiline) {
    return (
      <textarea
        className={`${inputClass} min-h-[120px]`}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      type="text"
      className={inputClass}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function SectionEditorInline({
  section,
  draft,
  onFieldChange,
  compactFields,
}: {
  section: ExpressSection;
  draft: Record<string, unknown>;
  onFieldChange: (fieldId: string, value: unknown) => void;
  compactFields?: string[];
}) {
  const fields = compactFields
    ? section.fields.filter((f) => compactFields.includes(f.id))
    : section.fields;
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <label key={f.id} className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
            {f.label}
          </span>
          <FieldEditor
            field={f}
            value={draft[f.id]}
            onChange={(v) => onFieldChange(f.id, v)}
          />
        </label>
      ))}
    </div>
  );
}

function ApplyEditsLabel() {
  const { t } = useLocale();
  return <>{t("express.applyEdits")}</>;
}

/** Shared hint under Rewrite with AI. */
function RewriteHint({ saving }: { saving?: boolean }) {
  return (
    <p className="mt-1.5 max-w-xs text-right text-[11px] leading-snug text-[var(--subtle)]">
      Improves <span className="text-[var(--muted)]">your</span> edits with clearer wording — keeps
      your meaning, not the old AI draft.
      {saving ? (
        <span className="mt-0.5 block text-[10px] text-[var(--subtle)]">Saving your text…</span>
      ) : null}
    </p>
  );
}

function CardShell({
  title,
  guide,
  accent,
  editing,
  updating,
  onEdit,
  onCancel,
  onReady,
  onRewrite,
  readyBusy,
  rewriteBusy,
  draftSaving,
  /** Extra actions in view mode (e.g. Try a different concept). */
  viewActions,
  children,
}: {
  title: string;
  /** One-line owner prompt from guide.json */
  guide?: string | null;
  accent?: boolean;
  editing: boolean;
  updating: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onReady: () => void;
  onRewrite: () => void;
  readyBusy: boolean;
  rewriteBusy: boolean;
  draftSaving?: boolean;
  viewActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const editLocked = readyBusy || rewriteBusy;
  return (
    <section
      className={`rounded-2xl border p-5 card-shadow ${
        accent
          ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]"
          : updating
          ? "border-[var(--accent)]/30 bg-[var(--surface)] ring-1 ring-[var(--accent)]/20"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={`font-serif text-lg font-medium tracking-tight ${
              accent ? "text-[var(--accent)]" : ""
            }`}
          >
            {title}
            {updating && (
              <span className="ml-2 inline-flex items-center gap-1 align-middle text-[11px] font-sans font-medium text-[var(--accent)]">
                <Loader2 size={12} className="animate-spin" /> Updating…
              </span>
            )}
          </h3>
          {guide ? (
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{guide}</p>
          ) : null}
        </div>
        {editing ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={editLocked}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-[var(--muted)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
              >
                <X size={12} /> Cancel
              </button>
              <button
                type="button"
                onClick={onRewrite}
                disabled={editLocked}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
              >
                {rewriteBusy ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                {rewriteBusy ? "Rewriting…" : "Rewrite with AI"}
              </button>
              <button
                type="button"
                onClick={onReady}
                disabled={editLocked}
                data-faro-anchor="faro-express-apply"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {readyBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                <ApplyEditsLabel />
              </button>
            </div>
            <RewriteHint saving={draftSaving} />
          </div>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {viewActions}
            <button
              type="button"
              onClick={onEdit}
              disabled={updating}
              className="inline-flex items-center gap-1 text-xs text-[var(--subtle)] transition hover:text-[var(--foreground)] disabled:opacity-40"
            >
              <Pencil size={12} /> Edit
            </button>
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

/** First-draft wait screen after the 6 questions — large beacon + monotonic progress. */
function ExpressDraftingScreen({
  projectId,
  projectName,
  state,
  setState,
  running,
  stopping,
  stopGeneration,
}: {
  projectId: string;
  projectName: string;
  state: ExpressStateDto;
  setState: Dispatch<SetStateAction<ExpressStateDto>>;
  running: boolean;
  stopping: boolean;
  stopGeneration: () => void | Promise<void>;
}) {
  const { t } = useLocale();
  const [peakPct, setPeakPct] = useState(0);
  const [secondsInCurrent, setSecondsInCurrent] = useState(0);
  const [resuming, setResuming] = useState(false);
  const lastDoneRef = useRef(state.done);
  const unitStartedAtRef = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      setSecondsInCurrent(Math.floor((Date.now() - unitStartedAtRef.current) / 1000));
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (state.done !== lastDoneRef.current) {
      lastDoneRef.current = state.done;
      unitStartedAtRef.current = Date.now();
      setSecondsInCurrent(0);
    }
  }, [state.done]);

  const rawPct =
    state.total > 0
      ? countBasedPercent({
          done: state.done,
          total: state.total,
          secondsInCurrent,
          secondsPerUnit: 35,
        })
      : 2;
  useEffect(() => {
    setPeakPct((p) => Math.max(p, rawPct));
  }, [rawPct]);
  const pct = Math.max(peakPct, rawPct);

  // Stage bullets: a stage is done when progress has passed its band (aligned to %).
  const stageCount = PIPELINE_STAGES.length;
  const progress01 = pct / 100;
  const activeFromCurrent = stageIndexOf(state.current);

  const stopped = state.status === "cancelled";
  const interrupted =
    state.status === "failed" &&
    (state.errorCode === "interrupted" ||
      /interrupt|server restart/i.test(state.error ?? ""));
  const canResume = state.status === "failed" || state.status === "cancelled";

  const panelTitle = stopped
    ? t("express.stoppedTitle")
    : interrupted
      ? t("express.interruptedTitle")
      : state.status === "failed"
        ? t("express.pausedTitle")
        : t("express.draftingTitle", { name: projectName });
  const panelDesc = stopped
    ? t("express.stoppedDesc")
    : interrupted
      ? t("express.interruptedDesc")
      : state.status === "failed"
        ? t("express.pausedDesc")
        : t("express.draftingDesc");

  async function resumeDrafting() {
    if (resuming) return;
    setResuming(true);
    setState({
      ...state,
      status: "running",
      error: null,
      errorCode: null,
      errorHint: null,
    });
    try {
      await fetch(`/api/projects/${projectId}/express`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
    } finally {
      setResuming(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-16">
      <FaroLoaderPanel
        beaconSize="hero"
        title={panelTitle}
        description={panelDesc}
        progressPercent={pct}
        progressLabel={
          state.total > 0
            ? `${t("express.sectionsProgress", {
                done: state.done,
                total: state.total,
              })}${state.currentName && running ? ` · ${state.currentName}` : ""}`
            : undefined
        }
      >
        <ol className="mt-10 w-full max-w-md space-y-3 text-left">
          {PIPELINE_STAGES.map((stage, i) => {
            // Prefer real current section when available; otherwise map from % bands.
            const bandStart = i / stageCount;
            const bandEnd = (i + 1) / stageCount;
            let stageDone =
              activeFromCurrent > i ||
              (activeFromCurrent < 0 && progress01 >= bandEnd - 0.001);
            let active =
              running &&
              (activeFromCurrent === i ||
                (activeFromCurrent < 0 && progress01 >= bandStart && progress01 < bandEnd));
            // If we have a current section, force later stages pending even if soft % crept ahead.
            if (activeFromCurrent >= 0 && i > activeFromCurrent) {
              stageDone = false;
              active = false;
            }
            if (activeFromCurrent >= 0 && i < activeFromCurrent) {
              stageDone = true;
              active = false;
            }
            return (
              <li key={stage.label} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    stageDone
                      ? "bg-[var(--accent)] text-white"
                      : active
                        ? "border border-[var(--accent)] text-[var(--accent)]"
                        : "border border-[var(--border-strong)] text-[var(--subtle)]"
                  }`}
                >
                  {stageDone ? (
                    <Check size={13} />
                  ) : active ? (
                    <span className="faro-generation-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={active ? "font-medium" : stageDone ? "" : "text-[var(--muted)]"}>
                  {stage.label}
                  {active && state.currentName ? (
                    <span className="text-[var(--subtle)]"> — {state.currentName}…</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
        {running && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => void stopGeneration()}
              disabled={stopping}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
            >
              {stopping ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> {t("express.stopping")}
                </>
              ) : (
                <>
                  <Square size={12} fill="currentColor" /> {t("express.stopGeneration")}
                </>
              )}
            </button>
            <p className="text-xs text-[var(--subtle)]">{t("express.stopHint")}</p>
          </div>
        )}
        {canResume && (
          <div
            className={`mt-8 w-full max-w-md rounded-2xl border px-5 py-4 text-left text-sm ${
              state.status === "failed"
                ? "border-[var(--danger)]/40 bg-[var(--danger)]/10"
                : "border-[var(--border-strong)] bg-[var(--surface)]"
            }`}
          >
            <p>
              {state.status === "failed"
                ? state.error ?? t("express.failedDefault")
                : t("express.stoppedDefault")}
            </p>
            {state.errorHint && state.status === "failed" ? (
              <p className="mt-2 text-xs text-[var(--muted)]">{state.errorHint}</p>
            ) : null}
            <button
              type="button"
              data-faro-anchor="faro-express-resume"
              disabled={resuming}
              onClick={() => void resumeDrafting()}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {resuming ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> {t("express.continueDrafting")}
                </>
              ) : (
                t("express.continueDrafting")
              )}
            </button>
          </div>
        )}
      </FaroLoaderPanel>
    </main>
  );
}

export function ExpressJourney({
  projectId,
  projectName,
  initialState,
  sections: initialSections,
  approved,
}: {
  projectId: string;
  projectName: string;
  initialState: ExpressStateDto;
  sections: Record<string, ExpressSection>;
  approved: boolean;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [state, setState] = useState<ExpressStateDto>(initialState);
  const [sections, setSections] = useState(initialSections);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const draftRef = useRef<Record<string, unknown>>({});
  const saveSeqRef = useRef(0);
  const saveAbortRef = useRef<AbortController | null>(null);
  const [readyBusy, setReadyBusy] = useState(false);
  const [rewriteBusy, setRewriteBusy] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [conceptBusy, setConceptBusy] = useState(false);
  const [conceptNote, setConceptNote] = useState<string | null>(null);
  const [refine, setRefine] = useState<RefineStateDto | null>(null);
  const running = state.status === "running" || state.status === "idle";
  const refining = refine?.status === "running";
  const [stopping, setStopping] = useState(false);

  // Always keep a ref of the latest draft so Rewrite / autosave never use a stale closure.
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  function updateDraftField(fieldId: string, value: unknown) {
    setDraft((prev) => {
      const next = { ...prev, [fieldId]: value };
      draftRef.current = next;
      return next;
    });
  }

  /** Persist the current edit to the DB (owner-owned draft). Cancels any in-flight save. */
  async function persistDraft(
    sectionId: string,
    value: Record<string, unknown>
  ): Promise<boolean> {
    const seq = ++saveSeqRef.current;
    saveAbortRef.current?.abort();
    const ac = new AbortController();
    saveAbortRef.current = ac;
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          projectId,
          key: sectionId,
          value,
          status: "draft",
          aiGenerated: false,
        }),
      });
      if (!res.ok) return false;
      // Ignore out-of-order responses so an older save can't overwrite newer text in the UI.
      if (seq !== saveSeqRef.current) return true;
      setSections((prev) => {
        const existing = prev[sectionId];
        if (!existing) return prev;
        return { ...prev, [sectionId]: { ...existing, value: { ...value } } };
      });
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return true;
      return false;
    }
  }

  // Autosave while editing so Rewrite always polishes the owner's latest text.
  // Paused during rewrite so we never cancel the flush that Rewrite just sent.
  useEffect(() => {
    if (!editingId || rewriteBusy) return;
    let cancelled = false;
    setDraftSaving(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        // Always read the ref at flush time — not the draft from this effect's closure.
        await persistDraft(editingId, { ...draftRef.current });
        if (!cancelled) setDraftSaving(false);
      })();
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, editingId, projectId, rewriteBusy]);

  // While the pipeline runs, poll for progress; refresh the page data once done.
  // Merge so done/total never jump backward from a transient poll response.
  useEffect(() => {
    if (state.status === "done" || state.status === "failed" || state.status === "cancelled") return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/express?sections=1`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.state) {
          setState((prev) => {
            const next = data.state as ExpressStateDto;
            if (next.status === "running" && prev.status === "running") {
              return {
                ...next,
                done: Math.max(prev.done, next.done),
                total: Math.max(prev.total, next.total),
              };
            }
            return next;
          });
          if (data.sections) setSections(data.sections);
          if (data.state.status === "done") {
            router.refresh();
            return;
          }
          // Crash recovery only: idle incomplete. Cancelled/failed need Resume click.
          if (
            data.state.status === "idle" &&
            data.state.done < data.state.total &&
            data.state.status !== "cancelled"
          ) {
            void fetch(`/api/projects/${projectId}/express`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "start" }),
            });
          }
        }
      } catch {
        // transient; keep polling
      }
      if (!cancelled) timer = window.setTimeout(poll, 2500);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [projectId, router, state.status]);

  // Poll while a Ready cascade rewrites dependent cards.
  useEffect(() => {
    if (!refining) return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/express?sections=1`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          if (data.refine) setRefine(data.refine);
          if (data.sections) setSections(data.sections);
          if (
            data.refine?.status === "done" ||
            data.refine?.status === "failed" ||
            data.refine?.status === "cancelled"
          ) {
            setReadyBusy(false);
            if (data.refine.status === "failed") {
              setError(data.refine.error ?? "Couldn't update the rest of the strategy");
            }
            if (data.refine.status === "cancelled") {
              setError("Cascade update stopped. Cards already rewritten are kept.");
            }
            return;
          }
        }
      } catch {
        /* keep polling */
      }
      if (!cancelled) timer = window.setTimeout(poll, 2000);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [projectId, refining]);

  function beginEdit(section: ExpressSection) {
    if (refining || readyBusy || rewriteBusy) return;
    setError(null);
    const initial = cloneValue(section.value);
    draftRef.current = initial;
    setDraft(initial);
    setEditingId(section.id);
  }

  function cancelEdit() {
    if (readyBusy || rewriteBusy) return;
    // Edits are already autosaved — leave them in place, just exit edit mode.
    const id = editingId;
    const current = draftRef.current;
    if (id) {
      setSections((prev) => {
        const existing = prev[id];
        if (!existing) return prev;
        return { ...prev, [id]: { ...existing, value: { ...current } } };
      });
    }
    setEditingId(null);
    setDraft({});
    draftRef.current = {};
    setDraftSaving(false);
  }

  /**
   * New brand concept from the same strategy (different phrase/angle).
   * Saves as draft and opens edit so the owner can Ready → cascade manifesto/plan.
   */
  async function tryDifferentConcept() {
    if (conceptBusy || readyBusy || rewriteBusy || refining) {
      setError(
        refining
          ? "Wait for the current strategy update to finish."
          : "Wait for the current action to finish."
      );
      return;
    }
    if (editingId && editingId !== "concept") {
      setError("Finish or cancel the card you're editing first.");
      return;
    }
    const current = sections["concept"];
    if (!current) return;
    // Prefer live edit draft so "try another" avoids the phrase on screen now.
    const previous =
      editingId === "concept"
        ? { ...(current.value ?? {}), ...draftRef.current }
        : (current.value ?? {});
    setConceptBusy(true);
    setConceptNote(null);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          key: "concept",
          value: previous,
          mode: "alternative",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't draft another concept");
      const values = data.values as Record<string, unknown> | undefined;
      if (!values || Object.keys(values).length === 0) {
        throw new Error("The AI didn't return a usable concept. Try again.");
      }
      const nextValue = { ...previous, ...values };
      // Persist draft so refresh keeps the alternative.
      const saveRes = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          key: "concept",
          value: nextValue,
          status: "draft",
          aiGenerated: true,
        }),
      });
      if (!saveRes.ok) {
        const saveData = await saveRes.json().catch(() => ({}));
        throw new Error(
          (saveData as { error?: string }).error ?? "Couldn't save the new concept"
        );
      }
      setSections((prev) => {
        const existing = prev.concept;
        if (!existing) return prev;
        return { ...prev, concept: { ...existing, value: nextValue } };
      });
      // Open edit mode so Ready can cascade manifesto / design plan.
      setDraft(nextValue);
      draftRef.current = nextValue;
      setEditingId("concept");
      setConceptNote(
        "New concept draft. Edit if you like, then Apply my edits so the manifesto and design plan follow this idea — or try another concept."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't draft another concept");
    } finally {
      setConceptBusy(false);
    }
  }

  /** Polish the owner's current edit in place — does not cascade until Ready. */
  async function rewriteWithAi() {
    if (!editingId || readyBusy || rewriteBusy) return;
    setRewriteBusy(true);
    setError(null);
    try {
      // Flush the latest keystrokes before polish so we never send a stale draft.
      const latest = { ...draftRef.current };
      const saved = await persistDraft(editingId, latest);
      if (!saved) {
        // Still attempt polish with in-memory text even if the network save failed.
        console.warn("[express] draft save failed before rewrite; polishing in-memory text");
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          key: editingId,
          value: latest,
          mode: "polish",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't rewrite this card");
      const values = data.values as Record<string, unknown> | undefined;
      if (!values || Object.keys(values).length === 0) {
        throw new Error("The AI didn't return usable wording. Try again or edit manually.");
      }
      // Prefer AI polish of fields it returned, keep any fields the model omitted.
      const polished = { ...latest, ...values };
      draftRef.current = polished;
      setDraft(polished);
      await persistDraft(editingId, polished);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't rewrite this card");
    } finally {
      setRewriteBusy(false);
    }
  }

  async function markReady() {
    if (!editingId || rewriteBusy) return;
    setReadyBusy(true);
    setError(null);
    try {
      const latest = { ...draftRef.current };
      const res = await fetch(`/api/projects/${projectId}/express`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ready", sectionId: editingId, value: latest }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save your edit");
      if (data.sections) setSections(data.sections);
      if (data.refine) setRefine(data.refine);
      if (data.warning) setError(data.warning);
      setEditingId(null);
      setDraft({});
      setConceptNote(null);
      // If nothing to cascade, we're done immediately.
      if (!data.refine || data.refine.status !== "running") {
        setReadyBusy(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your edit");
      setReadyBusy(false);
    }
  }

  async function approve() {
    if (refining || editingId) {
      setError(
        editingId
          ? "Apply your edits (or Cancel) on this card before approving."
          : "Still updating strategy cards from your last edit — wait a moment."
      );
      return;
    }
    setApproving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/express`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Approval failed");
      // Temporary/generic working titles go to name workshop first; real names skip to logos.
      const next =
        typeof data.nextPath === "string" && data.nextPath
          ? data.nextPath
          : `/projects/${projectId}/studio`;
      router.push(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
      setApproving(false);
    }
  }

  async function stopGeneration() {
    setStopping(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/express`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not stop generation");
      if (data.state) setState(data.state);
      if (data.refine) setRefine(data.refine);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not stop generation");
    } finally {
      setStopping(false);
    }
  }

  if (running || state.status === "failed" || state.status === "cancelled") {
    return (
      <ExpressDraftingScreen
        projectId={projectId}
        projectName={projectName}
        state={state}
        setState={setState}
        running={running}
        stopping={stopping}
        stopGeneration={stopGeneration}
      />
    );
  }

  const concept = sections["concept"];
  const briefIds = [
    "brief.central-pattern",
    "brief.main-tension",
    "brief.constraint",
    "brief.emotional-territory",
    "brief.must-resolve",
  ];
  const designPlan = sections["design-plan"];
  const manifesto = sections["manifesto"];
  const detailIds = [
    "strategic-document.reality",
    "strategic-document.identity",
    "strategic-document.communication",
    "strategic-document.direction",
  ];

  function cardUpdating(id: string) {
    return refine?.status === "running" && refine.current === id;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 lg:py-14">
      <StagePageBanner stageId="strategy" data-faro-anchor="faro-express-header">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          {t("express.kicker")}
        </div>
        <h1 className="mt-2 font-serif text-4xl font-medium leading-tight tracking-tight lg:text-5xl">
          {projectName} {t("express.titleSuffix")}
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">{t("express.lede")}</p>
        <p className="mt-2 text-xs text-[var(--subtle)]">{t("express.helper")}</p>
      </StagePageBanner>

      {refining && refine && (
        <div className="mb-5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="shrink-0 animate-spin text-[var(--accent)]" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{t("express.updating")}</div>
              <div className="text-[var(--muted)]">
                {refine.currentName
                  ? t("express.rewriting", { name: refine.currentName })
                  : t("express.applying")}
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--accent)]">
              {refine.total > 0 ? Math.round((refine.done / refine.total) * 100) : 0}%
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                style={{
                  width: `${refine.total > 0 ? Math.round((refine.done / refine.total) * 100) : 0}%`,
                }}
              />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-[var(--subtle)]">
              {refine.done}/{refine.total}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {concept?.value && (
          <CardShell
            title="Brand concept"
            guide={cardGuide("concept")}
            accent
            editing={editingId === "concept"}
            updating={cardUpdating("concept") || conceptBusy}
            onEdit={() => beginEdit(concept)}
            onCancel={cancelEdit}
            onReady={markReady}
            onRewrite={() => void rewriteWithAi()}
            readyBusy={readyBusy && editingId === "concept"}
            rewriteBusy={rewriteBusy && editingId === "concept"}
            draftSaving={draftSaving && editingId === "concept"}
            viewActions={
              <button
                type="button"
                onClick={() => void tryDifferentConcept()}
                disabled={conceptBusy || refining || readyBusy || rewriteBusy}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
                title="Keep the strategy; draft a different concept phrase"
              >
                {conceptBusy ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                {conceptBusy ? "Finding another concept…" : "Try a different concept"}
              </button>
            }
          >
            {editingId === "concept" ? (
              <SectionEditorInline
                section={concept}
                draft={draft}
                onFieldChange={updateDraftField}
                compactFields={["statement", "description", "distillation"]}
              />
            ) : (
              <>
                <h2 className="font-serif text-2xl font-medium tracking-tight">
                  {String(concept.value["statement"] ?? "")}
                </h2>
                {typeof concept.value["description"] === "string" && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                    {concept.value["description"]}
                  </p>
                )}
                {conceptNote ? (
                  <p className="mt-3 rounded-xl bg-[var(--surface)]/80 px-3 py-2 text-xs leading-relaxed text-[var(--muted)]">
                    {conceptNote}
                  </p>
                ) : null}
              </>
            )}
            {editingId === "concept" ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)]/60 pt-4">
                <button
                  type="button"
                  onClick={() => void tryDifferentConcept()}
                  disabled={conceptBusy || readyBusy || rewriteBusy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)] disabled:opacity-50"
                >
                  {conceptBusy ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  {conceptBusy ? "Finding another…" : "Try another concept"}
                </button>
                <p className="text-[11px] text-[var(--subtle)]">
                  Strategy stays the same — only the concept phrase changes. Then hit{" "}
                  <strong className="font-medium text-[var(--muted)]">Apply my edits</strong> to update the
                  rest.
                </p>
              </div>
            ) : null}
          </CardShell>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {briefIds.map((id) => {
            const s = sections[id];
            if (!s?.value && editingId !== id) return null;
            if (!s) return null;
            return (
              <CardShell
                key={id}
                title={s.name}
                guide={cardGuide(id)}
                editing={editingId === id}
                updating={cardUpdating(id)}
                onEdit={() => beginEdit(s)}
                onCancel={cancelEdit}
                onReady={markReady}
                onRewrite={() => void rewriteWithAi()}
                readyBusy={readyBusy && editingId === id}
                rewriteBusy={rewriteBusy && editingId === id}
                draftSaving={draftSaving && editingId === id}
              >
                {editingId === id ? (
                  <SectionEditorInline section={s} draft={draft} onFieldChange={updateDraftField} />
                ) : (
                  <ValueBlock section={s} />
                )}
              </CardShell>
            );
          })}
        </div>

        {manifesto?.value && (
          <CardShell
            title="Manifesto"
            guide={cardGuide("manifesto")}
            editing={editingId === "manifesto"}
            updating={cardUpdating("manifesto")}
            onEdit={() => beginEdit(manifesto)}
            onCancel={cancelEdit}
            onReady={markReady}
            onRewrite={() => void rewriteWithAi()}
            readyBusy={readyBusy && editingId === "manifesto"}
            rewriteBusy={rewriteBusy && editingId === "manifesto"}
            draftSaving={draftSaving && editingId === "manifesto"}
          >
            {editingId === "manifesto" ? (
              <SectionEditorInline
                section={manifesto}
                draft={draft}
                onFieldChange={updateDraftField}
                compactFields={["text"]}
              />
            ) : (
              <ValueBlock section={manifesto} compactFields={["text"]} />
            )}
          </CardShell>
        )}

        {designPlan?.value && (
          <CardShell
            title="Design plan — what the Studio will create"
            guide={cardGuide("design-plan")}
            editing={editingId === "design-plan"}
            updating={cardUpdating("design-plan")}
            onEdit={() => beginEdit(designPlan)}
            onCancel={cancelEdit}
            onReady={markReady}
            onRewrite={() => void rewriteWithAi()}
            readyBusy={readyBusy && editingId === "design-plan"}
            rewriteBusy={rewriteBusy && editingId === "design-plan"}
            draftSaving={draftSaving && editingId === "design-plan"}
          >
            {editingId === "design-plan" ? (
              <SectionEditorInline
                section={designPlan}
                draft={draft}
                onFieldChange={updateDraftField}
                compactFields={["visual-identity", "verbal-identity", "deliverables", "execution-order"]}
              />
            ) : (
              <ValueBlock
                section={designPlan}
                compactFields={["visual-identity", "verbal-identity", "deliverables", "execution-order"]}
              />
            )}
          </CardShell>
        )}

        <details className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] card-shadow">
          <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 text-sm font-medium">
            Full strategy detail (Reality · Identity · Communication · Direction)
            <ChevronDown size={16} className="shrink-0 transition group-open:rotate-180" />
          </summary>
          <div className="space-y-6 border-t border-[var(--border)] p-5">
            {detailIds.map((id) => {
              const s = sections[id];
              if (!s?.value && editingId !== id) return null;
              if (!s) return null;
              return (
                <div key={id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="font-serif text-lg font-medium tracking-tight">
                      {s.name}
                      {cardUpdating(id) && (
                        <span className="ml-2 inline-flex items-center gap-1 align-middle text-[11px] font-sans font-medium text-[var(--accent)]">
                          <Loader2 size={12} className="animate-spin" /> Updating…
                        </span>
                      )}
                    </h3>
                    {editingId === id ? (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={readyBusy || rewriteBusy}
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-[var(--muted)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
                          >
                            <X size={12} /> Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void rewriteWithAi()}
                            disabled={readyBusy || rewriteBusy}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
                          >
                            {rewriteBusy ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Sparkles size={12} />
                            )}
                            {rewriteBusy ? "Rewriting…" : "Rewrite with AI"}
                          </button>
                          <button
                            type="button"
                            onClick={markReady}
                            disabled={readyBusy || rewriteBusy}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                          >
                            {readyBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            <ApplyEditsLabel />
                          </button>
                        </div>
                        <RewriteHint saving={draftSaving && editingId === id} />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => beginEdit(s)}
                        disabled={refining}
                        className="inline-flex items-center gap-1 text-xs text-[var(--subtle)] transition hover:text-[var(--foreground)] disabled:opacity-40"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    )}
                  </div>
                  {editingId === id ? (
                    <SectionEditorInline section={s} draft={draft} onFieldChange={updateDraftField} />
                  ) : (
                    <ValueBlock section={s} />
                  )}
                </div>
              );
            })}
            <p className="text-xs text-[var(--subtle)]">
              The full strategy is compiled behind these cards. Stay on this page to edit — the
              advanced workspace is only if you need every underlying step.
            </p>
          </div>
        </details>
      </div>

      {error && <p className="mt-6 text-sm text-[var(--danger)]">{error}</p>}

      <div className="sticky bottom-0 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4">
        <div className="flex flex-col gap-1 text-sm">
          <Link
            href={`/projects/${projectId}/review/brief`}
            data-faro-anchor="faro-full-map"
            className="text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            {t("express.fullMap")}
          </Link>
          <Link
            href={`/projects/${projectId}`}
            className="text-xs text-[var(--subtle)] transition hover:text-[var(--muted)]"
          >
            {t("express.projectHub")}
          </Link>
        </div>
        <button
          onClick={approve}
          disabled={approving || refining || Boolean(editingId) || rewriteBusy}
          data-faro-anchor="faro-express-approve"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {approving ? <Loader2 size={15} className="animate-spin" /> : approved ? <Check size={15} /> : null}
          {approved ? t("express.reapprove") : t("express.approve")}
          <ArrowRight size={15} />
        </button>
      </div>
    </main>
  );
}

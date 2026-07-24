"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Loader2, Pencil, Sparkles, Square, X } from "lucide-react";

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
  onChange,
  compactFields,
}: {
  section: ExpressSection;
  draft: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
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
            onChange={(v) => onChange({ ...draft, [f.id]: v })}
          />
        </label>
      ))}
    </div>
  );
}

function CardShell({
  title,
  accent,
  editing,
  updating,
  onEdit,
  onCancel,
  onReady,
  readyBusy,
  children,
}: {
  title: string;
  accent?: boolean;
  editing: boolean;
  updating: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onReady: () => void;
  readyBusy: boolean;
  children: React.ReactNode;
}) {
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
      <div className="mb-3 flex items-center justify-between gap-3">
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
        {editing ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={readyBusy}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-[var(--muted)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
            >
              <X size={12} /> Cancel
            </button>
            <button
              type="button"
              onClick={onReady}
              disabled={readyBusy}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {readyBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Ready
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            disabled={updating}
            className="inline-flex items-center gap-1 text-xs text-[var(--subtle)] transition hover:text-[var(--foreground)] disabled:opacity-40"
          >
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>
      {children}
    </section>
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
  const [state, setState] = useState<ExpressStateDto>(initialState);
  const [sections, setSections] = useState(initialSections);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [readyBusy, setReadyBusy] = useState(false);
  const [refine, setRefine] = useState<RefineStateDto | null>(null);
  const running = state.status === "running" || state.status === "idle";
  const refining = refine?.status === "running";
  const [stopping, setStopping] = useState(false);

  // While the pipeline runs, poll for progress; refresh the page data once done.
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
          setState(data.state);
          if (data.sections) setSections(data.sections);
          if (data.state.status === "done") {
            router.refresh();
            return;
          }
          if (data.state.status === "idle" && data.state.done < data.state.total) {
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
    if (refining || readyBusy) return;
    setError(null);
    setEditingId(section.id);
    setDraft(cloneValue(section.value));
  }

  function cancelEdit() {
    if (readyBusy) return;
    setEditingId(null);
    setDraft({});
  }

  async function markReady() {
    if (!editingId) return;
    setReadyBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/express`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ready", sectionId: editingId, value: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save your edit");
      if (data.sections) setSections(data.sections);
      if (data.refine) setRefine(data.refine);
      if (data.warning) setError(data.warning);
      setEditingId(null);
      setDraft({});
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
          ? "Mark this card Ready (or Cancel) before approving."
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
      router.push(`/projects/${projectId}/studio`);
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
    const activeStage = stageIndexOf(state.current);
    const pct = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;
    const stopped = state.status === "cancelled";
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-16">
        <div className="text-center">
          <Sparkles className="mx-auto animate-pulse text-[var(--accent)]" size={32} />
          <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight">
            {stopped ? "Strategy drafting stopped" : `Drafting the ${projectName} strategy`}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {stopped
              ? "You stopped generation. Sections already drafted are kept — resume when you are ready."
              : "Your answers are becoming a complete brand strategy and design plan. This takes a few minutes — you'll review everything on one page when it's ready."}
          </p>
        </div>
        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ol className="mt-8 space-y-3">
          {PIPELINE_STAGES.map((stage, i) => {
            const stageDone = activeStage > i;
            const active = !stopped && activeStage === i;
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
                  {stageDone ? <Check size={13} /> : active ? <Loader2 size={13} className="animate-spin" /> : i + 1}
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
                  <Loader2 size={14} className="animate-spin" /> Stopping…
                </>
              ) : (
                <>
                  <Square size={12} fill="currentColor" /> Stop generation
                </>
              )}
            </button>
            <p className="text-xs text-[var(--subtle)]">
              Stops after the current section finishes. Progress so far is kept.
            </p>
          </div>
        )}
        {(state.status === "failed" || state.status === "cancelled") && (
          <div
            className={`mt-8 rounded-2xl border px-5 py-4 text-sm ${
              state.status === "failed"
                ? "border-[var(--danger)]/40 bg-[var(--danger)]/10"
                : "border-[var(--border-strong)] bg-[var(--surface)]"
            }`}
          >
            <p>
              {state.status === "failed"
                ? state.error ?? "Strategy drafting failed."
                : "Generation stopped. You can resume from where it left off."}
            </p>
            <button
              onClick={async () => {
                setState({ ...state, status: "running", error: null });
                await fetch(`/api/projects/${projectId}/express`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "start" }),
                });
              }}
              className="mt-2 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)]"
            >
              Resume drafting
            </button>
          </div>
        )}
      </main>
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
      <header className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
          Your strategy is ready to review
        </div>
        <h1 className="mt-2 font-serif text-4xl font-medium leading-tight tracking-tight lg:text-5xl">
          {projectName} — strategy &amp; design plan
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Read each card. Hit <span className="font-medium text-[var(--foreground)]">Edit</span> to
          fix wording right here, then{" "}
          <span className="font-medium text-[var(--foreground)]">Ready</span> — the rest of the
          strategy updates from your change. When you approve, you go to the{" "}
          <span className="font-medium text-[var(--foreground)]">Logo Workshop</span> next (Design
          Studio unlocks after you approve a logo).
        </p>
      </header>

      {refining && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3 text-sm">
          <Loader2 size={16} className="shrink-0 animate-spin text-[var(--accent)]" />
          <div>
            <div className="font-medium">Updating the strategy from your edit</div>
            <div className="text-[var(--muted)]">
              {refine.currentName
                ? `Rewriting ${refine.currentName}… (${refine.done}/${refine.total})`
                : `Applying your change… (${refine.done}/${refine.total})`}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {concept?.value && (
          <CardShell
            title="Brand concept"
            accent
            editing={editingId === "concept"}
            updating={cardUpdating("concept")}
            onEdit={() => beginEdit(concept)}
            onCancel={cancelEdit}
            onReady={markReady}
            readyBusy={readyBusy && editingId === "concept"}
          >
            {editingId === "concept" ? (
              <SectionEditorInline
                section={concept}
                draft={draft}
                onChange={setDraft}
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
              </>
            )}
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
                editing={editingId === id}
                updating={cardUpdating(id)}
                onEdit={() => beginEdit(s)}
                onCancel={cancelEdit}
                onReady={markReady}
                readyBusy={readyBusy && editingId === id}
              >
                {editingId === id ? (
                  <SectionEditorInline section={s} draft={draft} onChange={setDraft} />
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
            editing={editingId === "manifesto"}
            updating={cardUpdating("manifesto")}
            onEdit={() => beginEdit(manifesto)}
            onCancel={cancelEdit}
            onReady={markReady}
            readyBusy={readyBusy && editingId === "manifesto"}
          >
            {editingId === "manifesto" ? (
              <SectionEditorInline
                section={manifesto}
                draft={draft}
                onChange={setDraft}
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
            editing={editingId === "design-plan"}
            updating={cardUpdating("design-plan")}
            onEdit={() => beginEdit(designPlan)}
            onCancel={cancelEdit}
            onReady={markReady}
            readyBusy={readyBusy && editingId === "design-plan"}
          >
            {editingId === "design-plan" ? (
              <SectionEditorInline
                section={designPlan}
                draft={draft}
                onChange={setDraft}
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={readyBusy}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
                        >
                          <X size={12} /> Cancel
                        </button>
                        <button
                          type="button"
                          onClick={markReady}
                          disabled={readyBusy}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                        >
                          {readyBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Ready
                        </button>
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
                    <SectionEditorInline section={s} draft={draft} onChange={setDraft} />
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

      <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          Open the full workspace instead
        </Link>
        <button
          onClick={approve}
          disabled={approving || refining || Boolean(editingId)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {approving ? <Loader2 size={15} className="animate-spin" /> : approved ? <Check size={15} /> : null}
          {approved ? "Re-approve & open the Logo Workshop" : "Approve & open the Logo Workshop"}
          <ArrowRight size={15} />
        </button>
      </div>
    </main>
  );
}

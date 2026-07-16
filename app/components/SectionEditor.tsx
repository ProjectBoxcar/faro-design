"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Section, Field } from "@/lib/methodology";
import { Sparkles, Trash2, Check, X, RotateCw, Loader2 } from "lucide-react";

type Value = Record<string, unknown>;

export function SectionEditor({
  projectId,
  section,
  initialValue,
  initialStatus,
  aiGenerated,
  autoDraft = false,
  embedded = false,
}: {
  projectId: string;
  section: Section;
  initialValue: Value;
  initialStatus: string;
  aiGenerated: boolean;
  // When true and the section is empty, draft it from upstream answers on open —
  // so derived steps arrive pre-written to review, never as a blank form.
  autoDraft?: boolean;
  // Embedded inside a pillar review screen: drop the per-step Save/Complete/Clear
  // footer (the pillar screen owns completion) and rely on autosave.
  embedded?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Value>(initialValue);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  // The AI's proposed values — shown for review; never overwrites silently.
  const [proposal, setProposal] = useState<Value | null>(null);
  // Provenance id of the generation behind the current proposal, so accepting
  // it can be recorded (ai_generations.accepted).
  const [generationId, setGenerationId] = useState<string | null>(null);
  // Human-readable upstream section names this draft was built from.
  const [draftedFrom, setDraftedFrom] = useState<string[]>([]);
  // Whether the current content is AI-authored and untouched. Persisted as the
  // `ai_generated` flag; a manual edit flips it false (designer ownership).
  const [aiOwned, setAiOwned] = useState(aiGenerated);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isEmptyInitial = Object.keys(initialValue).length === 0;
  const [autoDrafting, setAutoDrafting] = useState(autoDraft && isEmptyInitial);

  const lastSaved = useRef(JSON.stringify(initialValue));

  // Live mirrors so the unmount flush below reads current values, not a stale closure.
  const valueRef = useRef(value);
  const statusRef = useRef(status);
  const aiOwnedRef = useRef(aiOwned);
  useEffect(() => {
    valueRef.current = value;
    statusRef.current = status;
    aiOwnedRef.current = aiOwned;
  });

  // Flush any unsaved edit when navigating away (e.g. "Looks good — continue"
  // before the debounce fired). `keepalive` lets the request finish post-unmount.
  useEffect(() => {
    return () => {
      const serialized = JSON.stringify(valueRef.current);
      if (serialized === lastSaved.current) return;
      try {
        void fetch("/api/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            projectId,
            key: section.id,
            value: valueRef.current,
            status: statusRef.current === "empty" ? "draft" : statusRef.current,
            aiGenerated: aiOwnedRef.current,
          }),
        });
      } catch {
        /* best effort */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-draft an empty derived step from the answers already on file, so the
  // owner reviews written content instead of facing a blank form. Runs once.
  // The result arrives as a PROPOSAL — nothing is saved until "Use this".
  useEffect(() => {
    if (!autoDraft || !isEmptyInitial) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, key: section.id, value: {} }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.values && Object.keys(data.values).length > 0) {
            setProposal(data.values as Value);
            setGenerationId(data.generationId ?? null);
            setDraftedFrom(Array.isArray(data.readNames) ? data.readNames : []);
          }
        } else if (!cancelled) {
          setGenError("Couldn't draft this automatically — use “Draft with AI” below to try again.");
        }
      } catch {
        if (!cancelled) setGenError("Couldn't draft this automatically — use “Draft with AI” below to try again.");
      }
      if (!cancelled) setAutoDrafting(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send the owner's current notes to Claude and PROPOSE an improved version.
  // Nothing changes in the fields until they click "Use this".
  async function improveWithAI() {
    setGenerating(true);
    setGenError(null);
    setProposal(null);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, key: section.id, value }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setGenError(data.error ?? "Couldn't generate. Try again.");
      setGenerating(false);
      return;
    }
    const data = await res.json();
    if (data.values && Object.keys(data.values).length > 0) {
      setProposal(data.values as Value);
      setGenerationId(data.generationId ?? null);
      setDraftedFrom(Array.isArray(data.readNames) ? data.readNames : []);
    } else {
      setGenError("The AI didn't return anything usable. Add a few notes and try again.");
    }
    setGenerating(false);
  }

  function acceptProposal() {
    if (!proposal) return;
    setValue((prev) => ({ ...prev, ...proposal }));
    setAiOwned(true);
    setProposal(null);
    if (generationId) {
      // Best-effort provenance: record that this draft was the one accepted.
      void fetch("/api/generate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId }),
      }).catch(() => {});
      setGenerationId(null);
    }
  }

  async function autosave(serialized: string) {
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          key: section.id,
          value,
          status: status === "empty" ? "draft" : status,
          aiGenerated: aiOwned,
        }),
      });
      if (!res.ok) {
        setSaveError("Couldn't save your changes — check your connection.");
        return;
      }
      const data = await res.json();
      const row = data.row ?? data;
      lastSaved.current = serialized;
      setStatus(row.status);
      setSavedAt(new Date().toLocaleTimeString());
      setSaveError(null);
    } catch {
      setSaveError("Couldn't save your changes — check your connection.");
    }
  }

  // Debounced autosave: any edit is saved as a draft ~1.2s after you stop typing,
  // so navigating away never loses work. Completion is still explicit.
  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized === lastSaved.current || saving) return;
    const t = setTimeout(() => {
      void autosave(serialized);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  async function clearStep() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/sections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, key: section.id }),
    });
    if (!res.ok) {
      setError("Failed to clear");
      setSaving(false);
      return;
    }
    setValue({});
    lastSaved.current = "{}";
    setStatus("empty");
    setConfirmClear(false);
    setProposal(null);
    setSavedAt(null);
    setSaving(false);
    router.refresh();
  }

  const fields = section.fields ?? [];

  function setField(id: string, v: unknown) {
    setValue((prev) => ({ ...prev, [id]: v }));
    setAiOwned(false); // a manual edit hands ownership to the designer
  }

  async function save(nextStatus?: string, advance = false) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, key: section.id, value, status: nextStatus ?? status, aiGenerated: aiOwned }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      setSaving(false);
      return;
    }
    const data = await res.json();
    const row = data.row ?? data;
    setStatus(row.status);
    setSaveError(null);
    lastSaved.current = JSON.stringify(value);

    // On completion, jump straight to the next step (or back to the hub if
    // there's nothing actionable left). Keep the button disabled through the nav.
    if (advance) {
      if (data.next) {
        router.push(`/projects/${projectId}/${encodeURIComponent(data.next)}`);
      } else {
        router.push(`/projects/${projectId}`);
      }
      return;
    }

    setSavedAt(new Date().toLocaleTimeString());
    setSaving(false);
    router.refresh();
  }

  return (
    <div>
      {/* One clear "AI is working" signal — covers both auto-draft-on-open and manual (re)writes. */}
      {(autoDrafting || generating) && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-[var(--designer)]/40 bg-[var(--accent-soft)] p-4 text-sm">
          <Loader2 size={18} className="shrink-0 animate-spin text-[var(--designer)]" />
          <span className="font-medium text-[var(--designer)]">Writing this with AI</span>
          <span className="inline-flex gap-0.5 text-[var(--designer)]" aria-hidden="true">
            <span className="animate-bounce">.</span>
            <span className="animate-bounce" style={{ animationDelay: "0.15s" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "0.3s" }}>.</span>
          </span>
          <span className="ml-1 text-[var(--muted)]">This can take a few seconds.</span>
        </div>
      )}

      {/* Single AI box: review notice with an inline rewrite, or a compact "draft it" prompt. */}
      {!autoDrafting && !generating && !proposal &&
        (aiOwned && status !== "complete" ? (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-[var(--designer)]/40 bg-[var(--accent-soft)] p-4 text-sm">
            <div>
              <span className="font-medium">This is your AI draft.</span>{" "}
              <span className="text-[var(--muted)]">Read it over and edit anything that doesn&apos;t sound like you.</span>
              {draftedFrom.length > 0 && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Drafted from: {draftedFrom.join(", ")}
                </p>
              )}
            </div>
            <button
              onClick={improveWithAI}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--designer)] px-3 py-1.5 text-xs font-medium text-[var(--designer)] transition hover:bg-[var(--surface-2)]"
            >
              <RotateCw size={13} /> Rewrite
            </button>
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
            <span className="text-[var(--muted)]">Want the AI to write this? Add a few notes below, or just generate it.</span>
            <button
              onClick={improveWithAI}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)]"
            >
              <Sparkles size={13} /> Draft with AI
            </button>
          </div>
        ))}

      {genError && <div className="mb-4 text-sm text-[var(--danger)]">{genError}</div>}

      {section.triggerQuestions && section.triggerQuestions.length > 0 && (
        <details className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-[var(--subtle)]">
            Prompts to explore
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            {section.triggerQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </details>
      )}

      {/* AI proposal — review and accept; never overwrites silently. */}
      {proposal && (
        <div className="mb-6 rounded-lg border border-[var(--designer)] bg-[var(--surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-[var(--designer)]">
                AI suggestion — review before applying
              </div>
              {draftedFrom.length > 0 && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Drafted from: {draftedFrom.join(", ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={improveWithAI}
                disabled={generating}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
              >
                <RotateCw size={13} /> {generating ? "…" : "Regenerate"}
              </button>
              <button
                onClick={() => setProposal(null)}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
              >
                <X size={13} /> Discard
              </button>
              <button
                onClick={acceptProposal}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)]"
              >
                <Check size={13} /> Use this
              </button>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {fields.map((f) => (
              <ProposalValue key={f.id} field={f} value={proposal[f.id]} />
            ))}
          </div>
        </div>
      )}

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--subtle)]">
          No fields defined for this section yet.
        </p>
      ) : (
        <div className="space-y-5">
          {fields.map((f) => (
            <FieldInput key={f.id} field={f} value={value[f.id]} onChange={(v) => setField(f.id, v)} />
          ))}
        </div>
      )}

      {embedded ? (
        <div className="mt-3 h-4 text-xs">
          {saveError ? (
            <span className="text-[var(--danger)]">{saveError}</span>
          ) : (
            <span className="text-[var(--subtle)]">{saving ? "Saving…" : savedAt ? `Saved ${savedAt}` : ""}</span>
          )}
        </div>
      ) : (
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => save()}
          disabled={saving}
          className="rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-5 py-2 text-sm font-medium transition hover:bg-[var(--surface-2)] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => save("complete", true)}
          disabled={saving}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Complete & continue"}
        </button>
        {aiGenerated && (
          <span className="text-xs text-[var(--designer)]">Current content was AI-drafted</span>
        )}
        {savedAt && !saveError && <span className="text-xs text-[var(--subtle)]">Saved {savedAt}</span>}
        {saveError && <span className="text-xs text-[var(--danger)]">{saveError}</span>}
        {error && <span className="text-xs text-[var(--danger)]">{error}</span>}

        {/* Clear this step's answers. */}
        {confirmClear ? (
          <span className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-[var(--muted)]">Clear your answers on this step?</span>
            <button
              onClick={() => setConfirmClear(false)}
              disabled={saving}
              className="rounded-full px-2.5 py-1 text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
            >
              Cancel
            </button>
            <button
              onClick={clearStep}
              disabled={saving}
              className="rounded-full bg-[var(--danger)] px-2.5 py-1 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Clear
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
          >
            <Trash2 size={13} /> Clear answers
          </button>
        )}
      </div>
      )}
    </div>
  );
}

// Read-only render of one proposed field value (skips empties).
function ProposalValue({ field, value }: { field: Field; value: unknown }) {
  const empty =
    value == null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);
  if (empty) return null;

  const label = (
    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--subtle)]">
      {field.label}
    </div>
  );

  if (field.type === "list" && Array.isArray(value)) {
    return (
      <div>
        {label}
        <ul className="mt-0.5 list-disc pl-5 text-sm text-[var(--foreground)]">
          {(value as unknown[]).map((it, i) => (
            <li key={i}>{String(it)}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (field.type === "table" && Array.isArray(value)) {
    const cols = field.columns ?? [];
    const rows = value as Record<string, string>[];
    return (
      <div>
        {label}
        <div className="mt-0.5 overflow-x-auto rounded border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-2)]">
              <tr>
                {cols.map((c) => (
                  <th key={c.id} className="px-2 py-1 text-left font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  {cols.map((c) => (
                    <td key={c.id} className="px-2 py-1">
                      {r?.[c.id] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      {label}
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-[var(--foreground)]">{String(value)}</p>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = (
    <label className="block text-sm font-medium">{field.label}</label>
  );

  if (field.type === "text") {
    return (
      <div>
        {label}
        <input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3.5 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3.5 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
        />
      </div>
    );
  }

  if (field.type === "enum") {
    return (
      <div>
        {label}
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3.5 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
        >
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "list") {
    const items = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        {label}
        <div className="mt-1 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={item}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  onChange(next);
                }}
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3.5 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="rounded-lg px-2 text-[var(--muted)] hover:bg-[var(--surface-2)]"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange([...items, ""])}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            + Add
          </button>
        </div>
      </div>
    );
  }

  if (field.type === "table") {
    const cols = field.columns ?? [];
    const rows = Array.isArray(value) ? (value as Record<string, string>[]) : [];
    return (
      <div>
        {label}
        <div className="mt-1 overflow-x-auto rounded-lg border border-[var(--border-strong)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-2)]">
              <tr>
                {cols.map((c) => (
                  <th key={c.id} className="px-2 py-1.5 text-left font-medium">
                    {c.label}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  {cols.map((c) => (
                    <td key={c.id} className="px-1 py-1">
                      {c.type === "enum" ? (
                        <select
                          value={r[c.id] ?? ""}
                          onChange={(e) => {
                            const next = [...rows];
                            next[i] = { ...next[i], [c.id]: e.target.value };
                            onChange(next);
                          }}
                          className="w-full rounded border border-transparent bg-transparent px-1 py-1 focus:border-[var(--border-strong)]"
                        >
                          <option value="">—</option>
                          {(c.options ?? []).map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={r[c.id] ?? ""}
                          onChange={(e) => {
                            const next = [...rows];
                            next[i] = { ...next[i], [c.id]: e.target.value };
                            onChange(next);
                          }}
                          className="w-full rounded border border-transparent bg-transparent px-1 py-1 focus:border-[var(--border-strong)]"
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-1">
                    <button
                      onClick={() => onChange(rows.filter((_, j) => j !== i))}
                      className="px-1 text-[var(--muted)] hover:text-[var(--danger)]"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => onChange([...rows, {}])}
          className="mt-2 text-sm text-[var(--accent)] hover:underline"
        >
          + Add row
        </button>
      </div>
    );
  }

  return null;
}

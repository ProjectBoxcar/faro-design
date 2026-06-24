"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Section, Field } from "@/lib/methodology";
import { Sparkles, Trash2, Check, X, RotateCw } from "lucide-react";

type Value = Record<string, unknown>;

export function SectionEditor({
  projectId,
  section,
  initialValue,
  initialStatus,
  aiGenerated,
}: {
  projectId: string;
  section: Section;
  initialValue: Value;
  initialStatus: string;
  aiGenerated: boolean;
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

  const lastSaved = useRef(JSON.stringify(initialValue));

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
    } else {
      setGenError("The AI didn't return anything usable. Add a few notes and try again.");
    }
    setGenerating(false);
  }

  function acceptProposal() {
    if (!proposal) return;
    setValue((prev) => ({ ...prev, ...proposal }));
    setProposal(null);
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
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const row = data.row ?? data;
      lastSaved.current = serialized;
      setStatus(row.status);
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      /* silent — manual Save remains available */
    }
  }

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
  }

  async function save(nextStatus?: string, advance = false) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, key: section.id, value, status: nextStatus ?? status }),
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
      {aiGenerated && status === "draft" && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-[var(--designer)]/40 bg-[var(--accent-soft)] p-4 text-sm">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-[var(--designer)]" />
          <div>
            <span className="font-medium">This is your AI draft.</span>{" "}
            <span className="text-[var(--muted)]">
              We wrote it from your Quick Start answers. Read it over, edit anything that doesn&apos;t sound like you,
              then choose <strong>Complete &amp; continue</strong> to move on.
            </span>
          </div>
        </div>
      )}

      {section.triggerQuestions && section.triggerQuestions.length > 0 && (
        <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--subtle)]">
            Prompts to explore
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            {section.triggerQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-[var(--designer)]/40 bg-[var(--surface)] p-4">
        <div className="text-sm">
          <div className="font-medium">Write it with AI</div>
          <div className="text-[var(--muted)]">
            Jot rough notes below (or leave them empty), then let AI turn them into clear,
            well-written content. You review it before anything changes.
          </div>
          {genError && <div className="mt-1 text-[var(--danger)]">{genError}</div>}
        </div>
        <button
          onClick={improveWithAI}
          disabled={generating}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--designer)] px-4 py-2 text-sm font-medium text-[var(--designer)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
        >
          <Sparkles size={15} /> {generating ? "Writing…" : "Improve with AI"}
        </button>
      </div>

      {/* AI proposal — review and accept; never overwrites silently. */}
      {proposal && (
        <div className="mb-6 rounded-lg border border-[var(--designer)] bg-[var(--surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-[var(--designer)]">
              AI suggestion — review before applying
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
        {savedAt && <span className="text-xs text-[var(--subtle)]">Saved {savedAt}</span>}
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

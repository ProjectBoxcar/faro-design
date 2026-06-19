"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function NewProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [greenfield, setGreenfield] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), client_name: client.trim() || null, greenfield }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create project");
      setSaving(false);
      return;
    }
    const project = await res.json();
    router.push(`/projects/${project.id}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
      >
        <Plus size={16} /> New project
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
            style={{ boxShadow: "var(--shadow-pop)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-xl font-semibold">New project</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">A brand engagement.</p>

            <label className="mt-5 block text-sm font-medium">Brand / engagement name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3.5 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              placeholder="e.g. Finisterra"
            />

            <label className="mt-4 block text-sm font-medium">Client (optional)</label>
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3.5 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              placeholder="Client or company name"
            />

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={greenfield}
                onChange={(e) => setGreenfield(e.target.checked)}
              />
              Greenfield (no existing brand assets — skips the Brand Audit)
            </label>

            {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="rounded-full px-4 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { Check, KeyRound, Trash2 } from "lucide-react";

type Status = { configured: boolean; source: "settings" | "env" | null };

export function SettingsForm({ initial }: { initial: Status }) {
  const [status, setStatus] = useState<Status>(initial);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't save the key.");
      setBusy(false);
      return;
    }
    setStatus(data);
    setKey("");
    setMsg("Saved — AI is ready to use. No restart needed.");
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/settings", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setStatus(data);
    setMsg("Key removed.");
    setBusy(false);
  }

  return (
    <div className="card-shadow rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      {/* Current status */}
      <div className="mb-5 flex items-center gap-2 text-sm">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: status.configured ? "var(--ok)" : "var(--border-strong)" }}
        />
        {status.configured ? (
          <span>
            <span className="font-medium">AI is connected.</span>{" "}
            <span className="text-[var(--muted)]">
              {status.source === "env"
                ? "Using a key from your environment. You can override it below."
                : "A key is saved in this app."}
            </span>
          </span>
        ) : (
          <span className="text-[var(--muted)]">No API key yet — add one below to turn on “Improve with AI”.</span>
        )}
      </div>

      <label className="block text-sm font-medium">Anthropic API key</label>
      <p className="mt-0.5 text-xs text-[var(--subtle)]">
        Get one at console.anthropic.com → API keys. It starts with “sk-”.
      </p>
      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <KeyRound
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]"
          />
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={status.configured ? "Paste a new key to replace it" : "sk-ant-…"}
            autoComplete="off"
            className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] py-2.5 pl-9 pr-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          />
        </div>
        <button
          onClick={save}
          disabled={busy || !key.trim()}
          className="shrink-0 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save key"}
        </button>
      </div>

      {(msg || error) && (
        <div className={`mt-3 flex items-center gap-1.5 text-sm ${error ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}>
          {!error && <Check size={15} />}
          {error ?? msg}
        </div>
      )}

      {status.configured && status.source === "settings" && (
        <button
          onClick={remove}
          disabled={busy}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
        >
          <Trash2 size={13} /> Remove saved key
        </button>
      )}

      <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs text-[var(--subtle)]">
        The key is stored locally in this app&apos;s database on your machine (never committed to
        git, never sent anywhere except Anthropic). Usage is a few cents per project.
      </p>
    </div>
  );
}

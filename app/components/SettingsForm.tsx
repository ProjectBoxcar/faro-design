"use client";

import { useState } from "react";
import { Check, KeyRound, Trash2 } from "lucide-react";
import type { AiProvider } from "@/lib/db/types";

type Status = {
  configured: boolean;
  source: "settings" | "env" | null;
  provider: AiProvider;
  baseUrl: string | null;
  model: string | null;
};

export function SettingsForm({ initial }: { initial: Status }) {
  const [status, setStatus] = useState<Status>(initial);
  const [key, setKey] = useState("");
  const [provider, setProvider] = useState<AiProvider>(initial.provider);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl ?? "");
  const [model, setModel] = useState(initial.model ?? "");
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
      body: JSON.stringify({
        apiKey: key,
        provider,
        baseUrl: baseUrl || null,
        model: model || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't save settings.");
      setBusy(false);
      return;
    }
    setStatus(data);
    setKey("");
    setMsg("Saved — AI settings updated. No restart needed.");
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/settings", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setStatus(data);
    setKey("");
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
          <span className="text-[var(--muted)]">No API key yet — add one below to turn on AI generation.</span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">AI provider</label>
          <p className="mt-0.5 text-xs text-[var(--subtle)]">
            Anthropic uses native API. OpenAI-compatible supports OpenAI, OpenRouter, Groq, Ollama, etc.
          </p>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiProvider)}
            className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai-compatible">OpenAI-compatible</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">API key</label>
          <p className="mt-0.5 text-xs text-[var(--subtle)]">
            Anthropic keys start with “sk-ant-”. OpenAI-compatible keys usually start with “sk-”.
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
                placeholder={status.configured ? "Paste a new key to replace it" : "sk-…"}
                autoComplete="off"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] py-2.5 pl-9 pr-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
            </div>
          </div>
        </div>

        {provider === "openai-compatible" && (
          <div>
            <label className="block text-sm font-medium">Base URL (optional)</label>
            <p className="mt-0.5 text-xs text-[var(--subtle)]">
              Leave blank for OpenAI. Use your OpenRouter/Ollama base URL for other providers.
            </p>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">Model override (optional)</label>
          <p className="mt-0.5 text-xs text-[var(--subtle)]">
            Leave blank to use the default. For Anthropic: claude-opus-4-8. For OpenAI: gpt-4o-mini.
          </p>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={provider === "anthropic" ? "claude-opus-4-8" : "gpt-4o-mini"}
            className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="shrink-0 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
        {status.configured && status.source === "settings" && (
          <button
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
          >
            <Trash2 size={13} /> Remove saved key
          </button>
        )}
      </div>

      {(msg || error) && (
        <div className={`mt-3 flex items-center gap-1.5 text-sm ${error ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}>
          {!error && <Check size={15} />}
          {error ?? msg}
        </div>
      )}

      <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs text-[var(--subtle)]">
        The key is stored locally in this app&apos;s database on your machine (never committed to
        git). It is only sent to the provider you select above.
      </p>
    </div>
  );
}

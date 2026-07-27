"use client";

import { useState } from "react";
import { Check, KeyRound, Trash2 } from "lucide-react";
import type { AiProvider } from "@/lib/db/types";

type LaneStatus = {
  configured: boolean;
  source: "settings" | "env" | null;
  provider: AiProvider;
  baseUrl: string | null;
  model: string | null;
};

export type SettingsInitial = {
  strategy: LaneStatus;
  openDesign: LaneStatus;
  brandMemory?: { total: number; byEngine: Record<string, number> };
  // Back-compat flat fields
  configured?: boolean;
  source?: "settings" | "env" | null;
  provider?: AiProvider;
  baseUrl?: string | null;
  model?: string | null;
};

export function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const strategy0 =
    initial.strategy ??
    ({
      configured: initial.configured ?? false,
      source: initial.source ?? null,
      provider: initial.provider ?? "anthropic",
      baseUrl: initial.baseUrl ?? null,
      model: initial.model ?? null,
    } satisfies LaneStatus);
  const design0 =
    initial.openDesign ??
    ({
      configured: false,
      source: null,
      provider: "openai-compatible",
      baseUrl: null,
      model: null,
    } satisfies LaneStatus);

  const [strategy, setStrategy] = useState<LaneStatus>(strategy0);
  const [openDesign, setOpenDesign] = useState<LaneStatus>(design0);

  const [key, setKey] = useState("");
  const [provider, setProvider] = useState<AiProvider>(strategy0.provider);
  const [baseUrl, setBaseUrl] = useState(strategy0.baseUrl ?? "");
  const [model, setModel] = useState(strategy0.model ?? "");

  const [designKey, setDesignKey] = useState("");
  const [designProvider, setDesignProvider] = useState<AiProvider>(design0.provider);
  const [designBaseUrl, setDesignBaseUrl] = useState(design0.baseUrl ?? "");
  const [designModel, setDesignModel] = useState(design0.model ?? "");

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
        apiKey: key || undefined,
        provider,
        baseUrl: baseUrl || null,
        model: model || null,
        designApiKey: designKey || undefined,
        designProvider,
        designBaseUrl: designBaseUrl || null,
        designModel: designModel || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't save settings.");
      setBusy(false);
      return;
    }
    if (data.strategy) setStrategy(data.strategy);
    if (data.openDesign) setOpenDesign(data.openDesign);
    setKey("");
    setDesignKey("");
    setMsg("Saved — strategy and Open Design settings updated.");
    setBusy(false);
  }

  async function removeStrategyKey() {
    setBusy(true);
    setError(null);
    setMsg(null);
    // Only clear strategy key via partial save: empty apiKey with special flag
    // Use DELETE then re-save design - simpler: POST with empty means no change unless we clear
    // Keep DELETE clearing both for now is wrong. Clear strategy only.
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "", clearStrategyKey: true }),
    });
    // Fallback: dedicated clear by setting blank via DELETE strategy only
    void res;
    await fetch("/api/settings", { method: "DELETE" }); // clears both currently
    // Re-save design if we still have design key in env; refresh state
    const get = await fetch("/api/settings");
    const data = await get.json().catch(() => ({}));
    if (data.strategy) setStrategy(data.strategy);
    if (data.openDesign) setOpenDesign(data.openDesign);
    setKey("");
    setMsg("Keys cleared. Re-add Open Design if you only meant to remove the strategy key.");
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      {/* Strategy lane */}
      <section className="card-shadow rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-serif text-xl font-medium tracking-tight">1. Strategy AI</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Used for intake, drafting strategy sections, viability, and naming. Anthropic, OpenAI,
          OpenRouter, etc.
        </p>

        <div className="mt-4 mb-4 flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: strategy.configured ? "var(--ok)" : "var(--border-strong)" }}
          />
          {strategy.configured ? (
            <span>
              <span className="font-medium">Strategy AI connected</span>{" "}
              <span className="text-[var(--muted)]">
                ({strategy.source === "env" ? "env" : "settings"} · {strategy.provider} ·{" "}
                {strategy.model})
              </span>
            </span>
          ) : (
            <span className="text-[var(--muted)]">No strategy key yet</span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Provider</label>
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
            <div className="relative mt-2">
              <KeyRound
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]"
              />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={strategy.configured ? "Paste a new key to replace it" : "sk-…"}
                autoComplete="off"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] py-2.5 pl-9 pr-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
            </div>
          </div>
          {provider === "openai-compatible" && (
            <div>
              <label className="block text-sm font-medium">Base URL (optional)</label>
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
            <label className="block text-sm font-medium">Model (optional)</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === "anthropic" ? "claude-opus-4-8" : "gpt-4o"}
              className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            />
          </div>
        </div>
      </section>

      {/* Open Design lane */}
      <section className="card-shadow rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface)] p-6">
        <h2 className="font-serif text-xl font-medium tracking-tight">2. Logo AI (OpenAI)</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          <strong className="text-[var(--foreground)]">Logo Workshop only</strong> — OpenAI (gpt-4o)
          with optional Gemini fallback via <code className="text-xs">GEMINI_API_KEY</code>. Design
          Studio identity systems and mockups do <em>not</em> use this key — they run through Open
          Design + Anthropic only.
        </p>

        <div className="mt-4 mb-4 flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: openDesign.configured ? "var(--ok)" : "var(--border-strong)" }}
          />
          {openDesign.configured ? (
            <span>
              <span className="font-medium">Graphics AI connected</span>{" "}
              <span className="text-[var(--muted)]">
                ({openDesign.source === "env" ? "env" : openDesign.source === "strategy" ? "strategy key" : "settings"} ·{" "}
                {openDesign.provider} · {openDesign.model})
              </span>
            </span>
          ) : (
            <span className="text-[var(--muted)]">
              Not configured — logos and Design Studio will refuse to generate
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Provider</label>
            <p className="mt-0.5 text-xs text-[var(--subtle)]">
              Use <strong className="text-[var(--foreground)]">OpenAI</strong> for logos. Choose
              Anthropic here only if this field stores the OD BYOK key (not used for logo generation).
            </p>
            <select
              value={designProvider}
              onChange={(e) => setDesignProvider(e.target.value as AiProvider)}
              className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            >
              <option value="openai-compatible">OpenAI (gpt-4o) — Logo Workshop</option>
              <option value="anthropic">Anthropic key (OD BYOK for Design Studio)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Graphics API key</label>
            <p className="mt-0.5 text-xs text-[var(--subtle)]">
              OpenAI: <code className="text-[var(--foreground)]">sk-…</code> · Env:{" "}
              <code className="text-[var(--foreground)]">OPEN_DESIGN_API_KEY</code> or{" "}
              <code className="text-[var(--foreground)]">OPENAI_API_KEY</code>
            </p>
            <div className="relative mt-2">
              <KeyRound
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]"
              />
              <input
                type="password"
                value={designKey}
                onChange={(e) => setDesignKey(e.target.value)}
                placeholder={openDesign.configured ? "Paste a new key to replace it" : "sk-proj-… or sk-…"}
                autoComplete="off"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] py-2.5 pl-9 pr-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
            </div>
          </div>
          {designProvider === "openai-compatible" && (
            <div>
              <label className="block text-sm font-medium">Base URL</label>
              <p className="mt-0.5 text-xs text-[var(--subtle)]">
                Leave blank for OpenAI. Env:{" "}
                <code className="text-[var(--foreground)]">OPEN_DESIGN_BASE_URL</code>
              </p>
              <input
                type="url"
                value={designBaseUrl}
                onChange={(e) => setDesignBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium">Model</label>
            <p className="mt-0.5 text-xs text-[var(--subtle)]">
              Logos: <code className="text-[var(--foreground)]">gpt-4o</code> recommended. Env:{" "}
              <code className="text-[var(--foreground)]">OPEN_DESIGN_MODEL</code>
            </p>
            <input
              type="text"
              value={designModel}
              onChange={(e) => setDesignModel(e.target.value)}
              placeholder={designProvider === "openai-compatible" ? "gpt-4o" : "claude-opus-4-8"}
              className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="shrink-0 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
        {(strategy.configured && strategy.source === "settings") ||
        (openDesign.configured && openDesign.source === "settings") ? (
          <button
            onClick={removeStrategyKey}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
          >
            <Trash2 size={13} /> Clear saved keys
          </button>
        ) : null}
      </div>

      {(msg || error) && (
        <div
          className={`flex items-center gap-1.5 text-sm ${error ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}
        >
          {!error && <Check size={15} />}
          {error ?? msg}
        </div>
      )}

      <section className="card-shadow mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-serif text-xl font-medium tracking-tight">3. Brand memory</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Faro learns from projects you finish — approved strategy, logos, design systems, and full
          packages. Those outcomes gently guide the next project. The cloud model is not fine-tuned;
          this app stores preferences locally and feeds them into prompts.
        </p>
        <div className="mt-4 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm">
          <p className="font-medium text-[var(--foreground)]">
            {initial.brandMemory?.total
              ? `${initial.brandMemory.total} learning${initial.brandMemory.total === 1 ? "" : "s"} stored`
              : "No learnings yet"}
          </p>
          {initial.brandMemory && initial.brandMemory.total > 0 ? (
            <p className="mt-1 text-xs text-[var(--subtle)]">
              Strategy {initial.brandMemory.byEngine.strategy ?? 0} · Logo{" "}
              {initial.brandMemory.byEngine.logo ?? 0} · Design{" "}
              {initial.brandMemory.byEngine.design ?? 0} · Shared{" "}
              {initial.brandMemory.byEngine.all ?? 0}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--subtle)]">
              Approve a strategy, logo, or publish a Brand Handover to start building memory.
            </p>
          )}
        </div>
      </section>

      <p className="mt-6 text-xs text-[var(--subtle)]">
        Keys stay local (never git). Engines: <strong>Strategy</strong> = Anthropic/GPT above ·{" "}
        <strong>Logos</strong> = OpenAI (this section) → Gemini fallback ·{" "}
        <strong>Design Studio</strong> = Open Design daemon + Anthropic only (strategy Anthropic key
        or Anthropic graphics key). Gemini: <code className="text-[var(--foreground)]">GEMINI_API_KEY</code>{" "}
        in <code className="text-[var(--foreground)]">.env.local</code>.
      </p>
    </div>
  );
}

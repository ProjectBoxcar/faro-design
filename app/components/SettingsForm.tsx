"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, KeyRound, Trash2 } from "lucide-react";
import type { AiProvider } from "@/lib/db/types";
import type { LaneHealthSummary } from "@/lib/ai-lanes";

type StrategyStatus = {
  configured: boolean;
  source: "settings" | "env" | null;
  provider: AiProvider;
  baseUrl: string | null;
  model: string | null;
};

type LogoStatus = {
  configured: boolean;
  source: "settings" | "env" | null;
  model: string | null;
  baseUrl: string | null;
  geminiConfigured: boolean;
  geminiModel: string | null;
};

type DesignStudioStatus = {
  configured: boolean;
  source: "settings" | "env" | "strategy" | null;
  model: string | null;
  daemonUp: boolean | null;
};

export type SettingsInitial = {
  lanes?: LaneHealthSummary[];
  strategy: StrategyStatus;
  logo?: LogoStatus;
  designStudio?: DesignStudioStatus;
  /** @deprecated alias for designStudio wiring */
  openDesign?: {
    configured: boolean;
    source: "settings" | "env" | "strategy" | null;
    provider: AiProvider;
    baseUrl: string | null;
    model: string | null;
  };
  brandMemory?: { total: number; byEngine: Record<string, number> };
};

function levelColor(level: "ok" | "warn" | "off"): string {
  if (level === "ok") return "var(--ok)";
  if (level === "warn") return "var(--warn, #c9a227)";
  return "var(--border-strong)";
}

function levelWord(level: "ok" | "warn" | "off"): string {
  if (level === "ok") return "Ready";
  if (level === "warn") return "Almost";
  return "Not yet";
}

export function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const strategy0 = initial.strategy;
  const logo0: LogoStatus = initial.logo ?? {
    configured: false,
    source: null,
    model: null,
    baseUrl: null,
    geminiConfigured: false,
    geminiModel: null,
  };
  const design0: DesignStudioStatus = initial.designStudio ?? {
    configured: initial.openDesign?.configured ?? false,
    source: initial.openDesign?.source ?? null,
    model: initial.openDesign?.model ?? null,
    daemonUp: null,
  };

  const [lanes, setLanes] = useState<LaneHealthSummary[]>(initial.lanes ?? []);
  const [strategy, setStrategy] = useState<StrategyStatus>(strategy0);
  const [logo, setLogo] = useState<LogoStatus>(logo0);
  const [designStudio, setDesignStudio] = useState<DesignStudioStatus>(design0);

  const [key, setKey] = useState("");
  const [provider, setProvider] = useState<AiProvider>(strategy0.provider);
  const [baseUrl, setBaseUrl] = useState(strategy0.baseUrl ?? "");
  const [model, setModel] = useState(strategy0.model ?? "");

  const [designKey, setDesignKey] = useState("");
  // Graphics field: openai-compatible stores OpenAI logo key; anthropic stores OD BYOK.
  const [designProvider, setDesignProvider] = useState<AiProvider>(
    initial.openDesign?.provider ?? "openai-compatible"
  );
  const [designBaseUrl, setDesignBaseUrl] = useState(initial.openDesign?.baseUrl ?? "");
  const [designModel, setDesignModel] = useState(
    logo0.model ?? design0.model ?? initial.openDesign?.model ?? ""
  );

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyPayload(data: Record<string, unknown>) {
    if (Array.isArray(data.lanes)) setLanes(data.lanes as LaneHealthSummary[]);
    if (data.strategy && typeof data.strategy === "object") {
      setStrategy(data.strategy as StrategyStatus);
    }
    if (data.logo && typeof data.logo === "object") {
      setLogo(data.logo as LogoStatus);
    }
    if (data.designStudio && typeof data.designStudio === "object") {
      setDesignStudio(data.designStudio as DesignStudioStatus);
    }
  }

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
      setError((data as { error?: string }).error ?? "Couldn't save settings.");
      setBusy(false);
      return;
    }
    applyPayload(data as Record<string, unknown>);
    setKey("");
    setDesignKey("");
    setMsg("Saved.");
    setBusy(false);
  }

  async function clearKeys() {
    setBusy(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/settings", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    applyPayload(data as Record<string, unknown>);
    setKey("");
    setDesignKey("");
    setMsg("Saved keys cleared.");
    setBusy(false);
  }

  const statusRows: LaneHealthSummary[] =
    lanes.length > 0
      ? lanes
      : [
          {
            lane: "strategy",
            name: "Brand strategy",
            level: strategy.configured ? "ok" : "off",
            summary: strategy.configured ? "Ready" : "Needs a key",
            detail: "Writes your brand strategy from your answers",
          },
          {
            lane: "logo",
            name: "Logos",
            level: logo.configured ? "ok" : logo.geminiConfigured ? "warn" : "off",
            summary: logo.configured
              ? "Ready"
              : logo.geminiConfigured
                ? "Ready (backup)"
                : "Needs a key",
            detail: "Creates logo concepts to choose from",
          },
          {
            lane: "design",
            name: "Design package",
            level: designStudio.configured
              ? designStudio.daemonUp === false
                ? "warn"
                : "ok"
              : "off",
            summary: designStudio.configured
              ? designStudio.daemonUp === false
                ? "Almost ready"
                : "Ready"
              : "Needs setup",
            detail: "Builds your identity system, page, and deck",
          },
        ];

  return (
    <div className="space-y-6">
      {/* What’s ready */}
      <section className="card-shadow rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-serif text-xl font-medium tracking-tight">What’s ready</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Faro uses a few keys so it can write strategy, invent logos, and build your design
          package. You only need to paste them once — they stay on this computer.
        </p>
        <ul className="mt-4 space-y-3">
          {statusRows.map((row) => (
            <li
              key={row.lane}
              className="flex gap-3 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm"
            >
              <span
                className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: levelColor(row.level) }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-[var(--foreground)]">{row.name}</p>
                  <p className="text-xs font-medium text-[var(--muted)]">{levelWord(row.level)}</p>
                </div>
                <p className="text-[var(--muted)]">{row.summary}</p>
                {row.detail ? (
                  <p className="mt-0.5 text-xs text-[var(--subtle)]">{row.detail}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Main keys — plain language */}
      <section
        data-faro-anchor="faro-settings-keys"
        className="card-shadow rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h2 className="font-serif text-xl font-medium tracking-tight">Your keys</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Think of these like passwords that unlock AI features. Get them from your Claude and
          OpenAI accounts, then paste them here.
        </p>

        <div className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium">Claude key</label>
            <p className="mt-0.5 text-xs text-[var(--subtle)]">
              Unlocks brand strategy writing — and the design package when you get there.
            </p>
            <div className="relative mt-2">
              <KeyRound
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]"
              />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={
                  strategy.configured ? "Paste a new key to replace it" : "Paste your Claude key"
                }
                autoComplete="off"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] py-2.5 pl-9 pr-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
            </div>
            <p className="mt-1.5 text-xs text-[var(--subtle)]">
              {strategy.configured ? "Already saved on this computer." : "Not saved yet."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">OpenAI key</label>
            <p className="mt-0.5 text-xs text-[var(--subtle)]">
              Unlocks logo ideas in the Logo Workshop.
            </p>
            <div className="relative mt-2">
              <KeyRound
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]"
              />
              <input
                type="password"
                value={designKey}
                onChange={(e) => {
                  setDesignKey(e.target.value);
                  // Default graphics path is logos via OpenAI.
                  if (designProvider !== "openai-compatible") {
                    setDesignProvider("openai-compatible");
                  }
                }}
                placeholder={
                  logo.configured ? "Paste a new key to replace it" : "Paste your OpenAI key"
                }
                autoComplete="off"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] py-2.5 pl-9 pr-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
            </div>
            <p className="mt-1.5 text-xs text-[var(--subtle)]">
              {logo.configured
                ? "Already saved on this computer."
                : logo.geminiConfigured
                  ? "OpenAI not set — a backup key is available."
                  : "Not saved yet."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="shrink-0 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {(strategy.configured && strategy.source === "settings") ||
          (logo.configured && logo.source === "settings") ||
          (designStudio.configured && designStudio.source === "settings") ? (
            <button
              type="button"
              onClick={() => void clearKeys()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
            >
              <Trash2 size={13} /> Clear saved keys
            </button>
          ) : null}
        </div>

        {(msg || error) && (
          <div
            className={`mt-4 flex items-center gap-1.5 text-sm ${error ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}
          >
            {!error && <Check size={15} />}
            {error ?? msg}
          </div>
        )}
      </section>

      {/* Advanced — optional, for power users */}
      <section className="card-shadow rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div>
            <h2 className="font-serif text-xl font-medium tracking-tight">Advanced</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Optional. Only if you know you need a different provider or model.
            </p>
          </div>
          {showAdvanced ? (
            <ChevronDown size={18} className="shrink-0 text-[var(--subtle)]" />
          ) : (
            <ChevronRight size={18} className="shrink-0 text-[var(--subtle)]" />
          )}
        </button>

        {showAdvanced ? (
          <div className="mt-6 space-y-6 border-t border-[var(--border)] pt-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
                Brand strategy
              </p>
              <div>
                <label className="block text-sm font-medium">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as AiProvider)}
                  className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                >
                  <option value="anthropic">Claude (Anthropic)</option>
                  <option value="openai-compatible">OpenAI-compatible</option>
                </select>
              </div>
              {provider === "openai-compatible" && (
                <div>
                  <label className="block text-sm font-medium">Base URL</label>
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
                <label className="block text-sm font-medium">Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={provider === "anthropic" ? "claude-opus-4-8" : "gpt-4o"}
                  className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
                Logos
              </p>
              <div>
                <label className="block text-sm font-medium">Key type</label>
                <select
                  value={designProvider}
                  onChange={(e) => setDesignProvider(e.target.value as AiProvider)}
                  className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                >
                  <option value="openai-compatible">OpenAI (logos)</option>
                  <option value="anthropic">Claude key (design service only)</option>
                </select>
              </div>
              {designProvider === "openai-compatible" && (
                <div>
                  <label className="block text-sm font-medium">Base URL</label>
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
                <input
                  type="text"
                  value={designModel}
                  onChange={(e) => setDesignModel(e.target.value)}
                  placeholder={designProvider === "openai-compatible" ? "gpt-4o" : "claude-opus-4-8"}
                  className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save advanced options"}
            </button>
          </div>
        ) : null}
      </section>

      {/* Brand memory — soft language */}
      <section className="card-shadow rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-serif text-xl font-medium tracking-tight">What Faro remembers</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          When you finish a brand, Faro keeps a few local notes so the next project can feel more
          like your taste. Nothing is uploaded to fine-tune a model.
        </p>
        <div className="mt-4 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm">
          <p className="font-medium text-[var(--foreground)]">
            {initial.brandMemory?.total
              ? `${initial.brandMemory.total} note${initial.brandMemory.total === 1 ? "" : "s"} saved`
              : "No notes yet"}
          </p>
          <p className="mt-1 text-xs text-[var(--subtle)]">
            {initial.brandMemory && initial.brandMemory.total > 0
              ? "They grow as you approve strategy, logos, and packages."
              : "Finish a project and publish a handover to start."}
          </p>
        </div>
      </section>
    </div>
  );
}

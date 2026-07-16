"use client";

import { useState } from "react";
import { Sparkles, Download, Trash2, Loader2, LayoutTemplate, Presentation, Palette } from "lucide-react";
import type { AssetRow } from "@/lib/design";

const KIND_LABEL: Record<AssetRow["kind"], { label: string; icon: React.ReactNode }> = {
  design_system: { label: "Brand Identity System", icon: <Palette size={16} /> },
  landing_page: { label: "Landing Page", icon: <LayoutTemplate size={16} /> },
  deck: { label: "Brand Deck", icon: <Presentation size={16} /> },
  brand_guidelines: { label: "Brand Guidelines", icon: <Palette size={16} /> },
  logo_concept: { label: "Logo Concept", icon: <Palette size={16} /> },
};

export function DesignStudio({
  projectId,
  projectName,
  initialAssets,
  apiKeyConfigured,
}: {
  projectId: string;
  projectName: string;
  initialAssets: AssetRow[];
  apiKeyConfigured: boolean;
}) {
  const [assets, setAssets] = useState<AssetRow[]>(initialAssets);
  const [activeId, setActiveId] = useState<string | null>(initialAssets[0]?.id ?? null);
  const [loading, setLoading] = useState<AssetRow["kind"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeAsset = assets.find((a) => a.id === activeId) ?? assets[0] ?? null;

  async function generate(kind: AssetRow["kind"]) {
    if (!apiKeyConfigured) {
      setError("Add your Anthropic API key in Settings first.");
      return;
    }
    setLoading(kind);
    setError(null);
    try {
      const res = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      const asset: AssetRow = data.asset;
      setAssets((prev) => {
        // Replace same-kind asset if it exists, otherwise prepend.
        const withoutSame = prev.filter((a) => a.kind !== asset.kind);
        return [asset, ...withoutSame];
      });
      setActiveId(asset.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(null);
    }
  }

  async function remove(assetId: string) {
    if (!confirm("Delete this generated asset?")) return;
    await fetch(`/api/design/${assetId}?projectId=${projectId}`, { method: "DELETE" });
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
    if (activeId === assetId) setActiveId(null);
  }

  function download(asset: AssetRow) {
    const ext = asset.kind === "design_system" ? "md" : "html";
    const blob = new Blob([asset.html ?? ""], { type: ext === "md" ? "text/markdown" : "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${asset.name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const hasDesignSystem = assets.some((a) => a.kind === "design_system");

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-12 lg:py-12 2xl:max-w-[104rem]">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium tracking-tight lg:text-4xl">Design Studio</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
          Turn the {projectName} brief into real brand assets: a design system, landing page, and deck.
        </p>
      </div>

      {!apiKeyConfigured && (
        <div className="mb-6 rounded-2xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-6 py-4 text-sm text-[var(--foreground)]">
          Add your Anthropic API key in Settings to generate design assets.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-6 py-4 text-sm text-[var(--foreground)]">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Controls */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
              Generate
            </h2>
            <div className="space-y-2">
              <GenerateButton
                icon={<Palette size={18} />}
                label="Brand Identity System"
                description="DESIGN.md from the brief"
                onClick={() => generate("design_system")}
                loading={loading === "design_system"}
              />
              <GenerateButton
                icon={<LayoutTemplate size={18} />}
                label="Landing Page"
                description="Single-page website"
                onClick={() => generate("landing_page")}
                loading={loading === "landing_page"}
                disabled={!hasDesignSystem}
                disabledReason="Generate the identity system first."
              />
              <GenerateButton
                icon={<Presentation size={18} />}
                label="Brand Deck"
                description="Strategy presentation"
                onClick={() => generate("deck")}
                loading={loading === "deck"}
                disabled={!hasDesignSystem}
                disabledReason="Generate the identity system first."
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
              Assets
            </h2>
            {assets.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No assets yet. Generate your first brand identity system.</p>
            ) : (
              <ul className="space-y-2">
                {assets.map((asset) => {
                  const meta = KIND_LABEL[asset.kind];
                  const isActive = activeAsset?.id === asset.id;
                  return (
                    <li key={asset.id}>
                      <button
                        onClick={() => setActiveId(asset.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          isActive ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-2)]"
                        }`}
                      >
                        <span className="text-[var(--accent)]">{meta.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm ${isActive ? "font-medium" : ""}`}>
                            {meta.label}
                          </span>
                          <span className="block truncate text-xs text-[var(--subtle)]">
                            {asset.status === "draft" ? "Draft" : "Complete"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow">
          {activeAsset ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-xl font-medium tracking-tight">
                    {KIND_LABEL[activeAsset.kind].label}
                  </h2>
                  <p className="text-xs text-[var(--subtle)]">
                    Generated {new Date(activeAsset.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => download(activeAsset)}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
                  >
                    <Download size={16} /> Download
                  </button>
                  <button
                    onClick={() => remove(activeAsset.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
                    aria-label="Delete asset"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
                {activeAsset.kind === "design_system" ? (
                  <pre className="h-[60vh] overflow-auto p-5 text-sm leading-relaxed whitespace-pre-wrap font-mono text-[var(--foreground)]">
                    {activeAsset.html}
                  </pre>
                ) : (
                  <iframe
                    srcDoc={activeAsset.html ?? "<p>No content</p>"}
                    className="h-[60vh] w-full"
                    sandbox="allow-scripts"
                    title={activeAsset.name}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex h-[40vh] flex-col items-center justify-center text-[var(--muted)]">
              <Sparkles size={40} className="mb-3 text-[var(--accent)]" />
              <p className="text-sm">Generate your brand identity system to start the Design Studio.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GenerateButton({
  icon,
  label,
  description,
  onClick,
  loading,
  disabled,
  disabledReason,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={disabled ? disabledReason : undefined}
      className={`flex w-full items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-3 text-left transition ${
        isDisabled
          ? "cursor-not-allowed opacity-50"
          : "hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
      }`}
    >
      <span className="text-[var(--accent)]">{loading ? <Loader2 size={18} className="animate-spin" /> : icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-[var(--subtle)]">{description}</span>
      </span>
    </button>
  );
}

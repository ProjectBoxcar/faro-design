"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Sparkles,
  Download,
  Trash2,
  Loader2,
  LayoutTemplate,
  Presentation,
  Palette,
  Check,
  AlertCircle,
} from "lucide-react";
import type { AssetRow } from "@/lib/design";

const KIND_META: Record<
  AssetRow["kind"],
  { label: string; shortLabel: string; icon: React.ReactNode; description: string; cta: string }
> = {
  design_system: {
    label: "Brand Identity System",
    shortLabel: "Identity",
    icon: <Palette size={18} />,
    description: "Colors, typography, logo, and component rules a developer can use.",
    cta: "Generate 3 identity proposals",
  },
  landing_page: {
    label: "Landing Page",
    shortLabel: "Landing",
    icon: <LayoutTemplate size={18} />,
    description: "Interactive website preview with scroll animations and real CTA sections.",
    cta: "Generate 3 landing page proposals",
  },
  deck: {
    label: "Brand Deck",
    shortLabel: "Deck",
    icon: <Presentation size={18} />,
    description: "12-slide brand strategy deck with keyboard and swipe navigation.",
    cta: "Generate 3 deck proposals",
  },
  brand_guidelines: {
    label: "Brand Guidelines",
    shortLabel: "Guidelines",
    icon: <Palette size={18} />,
    description: "Extended brand guidelines.",
    cta: "Generate guidelines",
  },
  logo_concept: {
    label: "Logo Concept",
    shortLabel: "Logo",
    icon: <Palette size={18} />,
    description: "Logo exploration.",
    cta: "Generate logos",
  },
};

type GenerationState = {
  kind: AssetRow["kind"];
  stage: "generating" | "selecting";
} | null;

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
  const [loading, setLoading] = useState<GenerationState>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);

  const byKind = useMemo(() => {
    const map: Record<AssetRow["kind"], AssetRow[]> = {
      design_system: [],
      landing_page: [],
      deck: [],
      brand_guidelines: [],
      logo_concept: [],
    };
    for (const asset of assets) {
      map[asset.kind].push(asset);
    }
    // Sort A, B, C... then selected first.
    for (const kind of Object.keys(map) as AssetRow["kind"][]) {
      map[kind].sort((a, b) => {
        if (a.selected && !b.selected) return -1;
        if (!a.selected && b.selected) return 1;
        return (a.variant ?? "").localeCompare(b.variant ?? "");
      });
    }
    return map;
  }, [assets]);

  const selected = useCallback(
    (kind: AssetRow["kind"]) => byKind[kind].find((a) => a.selected) ?? byKind[kind][0] ?? null,
    [byKind]
  );

  const previewAsset = useMemo(
    () => assets.find((a) => a.id === previewAssetId) ?? null,
    [assets, previewAssetId]
  );

  async function generateProposals(kind: AssetRow["kind"]) {
    if (!apiKeyConfigured) {
      setError("Add your Anthropic API key in Settings first.");
      return;
    }
    setLoading({ kind, stage: "generating" });
    setError(null);

    let designSystemId: string | undefined;
    if (kind !== "design_system") {
      const ds = selected("design_system");
      if (!ds) {
        setError("Choose a Brand Identity System proposal first.");
        setLoading(null);
        return;
      }
      designSystemId = ds.id;
    }

    try {
      const res = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, kind, count: 3, designSystemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      const newAssets: AssetRow[] = data.assets;
      setAssets((prev) => {
        // Drop any older unselected proposals of this kind to keep the UI clean.
        const kept = prev.filter((a) => a.kind !== kind || a.selected);
        return [...kept, ...newAssets];
      });
      setPreviewAssetId(newAssets[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(null);
    }
  }

  async function selectProposal(assetId: string, kind: AssetRow["kind"]) {
    setLoading({ kind, stage: "selecting" });
    setError(null);
    try {
      const res = await fetch(`/api/design/${assetId}?projectId=${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Selection failed");
      const updated: AssetRow = data.asset;
      setAssets((prev) =>
        prev.map((a) =>
          a.kind === updated.kind
            ? { ...a, selected: a.id === updated.id }
            : a
        )
      );
      setPreviewAssetId(updated.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Selection failed");
    } finally {
      setLoading(null);
    }
  }

  async function remove(assetId: string) {
    if (!confirm("Delete this proposal?")) return;
    await fetch(`/api/design/${assetId}?projectId=${projectId}`, { method: "DELETE" });
    setAssets((prev) => {
      const next = prev.filter((a) => a.id !== assetId);
      if (previewAssetId === assetId) {
        const firstKind = next[0];
        setPreviewAssetId(firstKind?.id ?? null);
      }
      return next;
    });
  }

  function download(asset: AssetRow) {
    const ext = "html";
    const blob = new Blob([asset.html ?? ""], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${asset.name.replace(/\s+/g, "_")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const identitySelected = selected("design_system");

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-12 lg:py-12 2xl:max-w-[104rem]">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium tracking-tight lg:text-4xl">Design Studio</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
          Turn the {projectName} brief into real brand assets. Generate proposals, compare them, and lock in the best direction.
        </p>
      </div>

      {!apiKeyConfigured && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-6 py-4 text-sm text-[var(--foreground)]">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          Add your Anthropic API key in Settings to generate design assets.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-6 py-4 text-sm text-[var(--foreground)]">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Pipeline sidebar */}
        <div className="space-y-5">
          <PipelineStep
            kind="design_system"
            meta={KIND_META.design_system}
            proposals={byKind.design_system}
            loading={loading}
            onGenerate={() => generateProposals("design_system")}
            onSelect={selectProposal}
            onPreview={setPreviewAssetId}
            onDelete={remove}
            unlocked
          />
          <PipelineStep
            kind="landing_page"
            meta={KIND_META.landing_page}
            proposals={byKind.landing_page}
            loading={loading}
            onGenerate={() => generateProposals("landing_page")}
            onSelect={selectProposal}
            onPreview={setPreviewAssetId}
            onDelete={remove}
            unlocked={Boolean(identitySelected)}
          />
          <PipelineStep
            kind="deck"
            meta={KIND_META.deck}
            proposals={byKind.deck}
            loading={loading}
            onGenerate={() => generateProposals("deck")}
            onSelect={selectProposal}
            onPreview={setPreviewAssetId}
            onDelete={remove}
            unlocked={Boolean(identitySelected)}
          />
        </div>

        {/* Preview */}
        <div className="flex min-h-[60vh] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow">
          {previewAsset ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-serif text-xl font-medium tracking-tight">
                    {KIND_META[previewAsset.kind].icon}
                    <span>{KIND_META[previewAsset.kind].label}</span>
                    {previewAsset.variant && (
                      <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                        {previewAsset.variant}
                      </span>
                    )}
                    {previewAsset.selected && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        Selected
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-[var(--subtle)]">
                    Generated {new Date(previewAsset.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!previewAsset.selected && (
                    <button
                      onClick={() => selectProposal(previewAsset.id, previewAsset.kind)}
                      disabled={loading?.kind === previewAsset.kind}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      <Check size={16} /> Select
                    </button>
                  )}
                  <button
                    onClick={() => download(previewAsset)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--surface-2)]"
                  >
                    <Download size={16} /> Download
                  </button>
                  <button
                    onClick={() => remove(previewAsset.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                    aria-label="Delete proposal"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
                <iframe
                  title={`${KIND_META[previewAsset.kind].label} preview`}
                  srcDoc={previewAsset.html ?? "<p>No preview available.</p>"}
                  className="h-[60vh] w-full lg:h-[70vh]"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-[var(--muted)]">
              <div className="mb-4 rounded-full bg-[var(--surface-2)] p-4">
                <Sparkles size={32} />
              </div>
              <p className="text-lg font-medium">No preview yet</p>
              <p className="max-w-sm text-sm">Generate Brand Identity System proposals to start the Design Studio pipeline.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PipelineStep({
  kind,
  meta,
  proposals,
  loading,
  onGenerate,
  onSelect,
  onPreview,
  onDelete,
  unlocked,
}: {
  kind: AssetRow["kind"];
  meta: (typeof KIND_META)[AssetRow["kind"]];
  proposals: AssetRow[];
  loading: GenerationState;
  onGenerate: () => void;
  onSelect: (id: string, kind: AssetRow["kind"]) => void;
  onPreview: (id: string) => void;
  onDelete: (id: string) => void;
  unlocked: boolean;
}) {
  const isGenerating = loading?.kind === kind && loading.stage === "generating";

  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow ${!unlocked ? "opacity-60" : ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[var(--accent)]">{meta.icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--subtle)]">
          {meta.label}
        </h2>
      </div>
      <p className="mb-4 text-xs text-[var(--muted)]">{meta.description}</p>

      <button
        onClick={onGenerate}
        disabled={!unlocked || isGenerating}
        className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {isGenerating ? "Generating..." : proposals.length > 0 ? "Regenerate proposals" : meta.cta}
      </button>

      {!unlocked && kind !== "design_system" && (
        <p className="mb-3 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
          Select an identity system first.
        </p>
      )}

      {proposals.length > 0 ? (
        <ul className="space-y-2">
          {proposals.map((asset) => {
            const isSelected = asset.selected;
            return (
              <li key={asset.id}>
                <button
                  onClick={() => onPreview(asset.id)}
                  className={`group flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface-2)] text-[var(--muted)]"
                    }`}
                  >
                    {asset.variant ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${isSelected ? "font-medium" : ""}`}>
                      Proposal {asset.variant ?? ""}
                    </span>
                    <span className="block truncate text-xs text-[var(--subtle)]">
                      {isSelected ? "Selected" : "Click to preview"}
                    </span>
                  </span>
                  {!isSelected && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(asset.id, kind);
                      }}
                      className="rounded-full p-1.5 text-[var(--muted)] opacity-0 transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] group-hover:opacity-100"
                      title="Select this proposal"
                    >
                      <Check size={14} />
                    </span>
                  )}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(asset.id);
                    }}
                    className="rounded-full p-1.5 text-[var(--muted)] opacity-0 transition hover:text-[var(--danger)] group-hover:opacity-100"
                    title="Delete proposal"
                  >
                    <Trash2 size={14} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-[var(--muted)]">No proposals yet.</p>
      )}
    </div>
  );
}

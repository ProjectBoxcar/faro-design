"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  PackageCheck,
  ExternalLink,
  Copy,
} from "lucide-react";
import type { AssetRow } from "@/lib/design";
import {
  buildArtifactPreviewHtml,
  IDENTITY_PREVIEW_SECTIONS,
  type IdentityPreviewSection,
} from "@/lib/design-preview";
import {
  DesignGenerationWindow,
  type DesignGenerationKind,
} from "@/components/DesignGenerationWindow";
import type { DesignJobState } from "@/lib/design-job-types";
import { sanitizeDownloadName } from "@/lib/download-name";

const KIND_META: Record<
  AssetRow["kind"],
  { label: string; shortLabel: string; icon: React.ReactNode; description: string; cta: string }
> = {
  design_system: {
    label: "Brand Identity System",
    shortLabel: "Identity",
    icon: <Palette size={18} />,
    description: "Colors, typography, and components around your approved workshop logo.",
    cta: "Create 3 brand proposals",
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
  kind: AssetRow["kind"] | "mockups";
  stage: "generating" | "selecting";
  jobId?: string;
} | null;

export function DesignStudio({
  projectId,
  projectName,
  initialAssets,
  initialJob,
  initialShareToken,
  generationBlockedReason,
  apiKeyConfigured,
}: {
  projectId: string;
  projectName: string;
  initialAssets: AssetRow[];
  initialJob: DesignJobState | null;
  initialShareToken: string | null;
  generationBlockedReason: string | null;
  apiKeyConfigured: boolean;
}) {
  const router = useRouter();
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const [assets, setAssets] = useState<AssetRow[]>(initialAssets);
  const [loading, setLoading] = useState<GenerationState>(() =>
    initialJob && (initialJob.status === "queued" || initialJob.status === "running")
      ? { kind: initialJob.kind, stage: "generating", jobId: initialJob.id }
      : null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [discardingKind, setDiscardingKind] = useState<AssetRow["kind"] | null>(null);
  const [creatingDeliverable, setCreatingDeliverable] = useState(false);
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [publishingPackage, setPublishingPackage] = useState(false);
  const [packageLinkCopied, setPackageLinkCopied] = useState(false);
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  const [previewSection, setPreviewSection] = useState<IdentityPreviewSection>("overview");
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(() =>
    initialAssets.find((asset) => asset.kind === "design_system" && asset.selected)?.id
      ?? initialAssets.find((asset) => asset.selected)?.id
      ?? initialAssets[0]?.id
      ?? null
  );

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

  const selectedAsset = useCallback(
    (kind: AssetRow["kind"]) => byKind[kind].find((asset) => asset.selected) ?? null,
    [byKind]
  );

  const previewAsset = useMemo(
    () => assets.find((a) => a.id === previewAssetId) ?? null,
    [assets, previewAssetId]
  );
  const previewHtml = useMemo(
    () => buildArtifactPreviewHtml(previewAsset?.html ?? null, previewAsset?.kind ?? "design_system"),
    [previewAsset]
  );

  function previewProposal(assetId: string) {
    setPreviewAssetId(assetId);
    setPreviewSection("overview");
  }

  function focusPreviewSection(section: IdentityPreviewSection) {
    setPreviewSection(section);
    previewFrameRef.current?.contentWindow?.postMessage(
      { source: "faro-preview", action: "focus", section },
      "*"
    );
  }

  async function openFullPreview() {
    if (!previewFrameRef.current) return;
    try {
      await previewFrameRef.current.requestFullscreen();
    } catch {
      setError("Full-screen preview is unavailable in this browser.");
    }
  }

  useEffect(() => {
    if (loading?.stage !== "generating" || !loading.jobId) return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const params = new URLSearchParams({ projectId, jobId: loading.jobId! });
        const res = await fetch(`/api/design?${params}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not check design generation");
        const job: DesignJobState = data.job;
        if (cancelled) return;
        if (job.status === "complete") {
          const generated: AssetRow[] = data.assets;
          setAssets((previous) =>
            job.kind === "mockups"
              ? [
                  // The mockups job replaces every landing page and deck with
                  // the fresh pair built on the approved identity.
                  ...previous.filter((asset) => asset.kind !== "landing_page" && asset.kind !== "deck"),
                  ...generated,
                ]
              : [
                  ...previous.filter((asset) => asset.kind !== job.kind || asset.selected),
                  ...generated,
                ]
          );
          setPreviewAssetId(generated[0]?.id ?? null);
          setPreviewSection("overview");
          setLoading(null);
          router.refresh();
          return;
        }
        if (job.status === "failed") {
          const stopped = /stopped/i.test(job.error ?? "");
          setError(stopped ? null : (job.error ?? "Design generation failed"));
          setLoading(null);
          setStopping(false);
          router.refresh();
          return;
        }
      } catch (pollError) {
        if (!cancelled) setError(pollError instanceof Error ? pollError.message : "Could not check design generation");
      }
      if (!cancelled) timer = window.setTimeout(poll, 2000);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [loading?.jobId, loading?.stage, projectId, router]);

  // After the owner approves an identity proposal, the Studio applies it: one
  // landing page and one brand deck, generated in the design plan's execution
  // order and selected automatically — they are applications, not new choices.
  async function generateMockups(designSystemId: string) {
    setLoading({ kind: "mockups", stage: "generating" });
    setError(null);
    try {
      const res = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, kind: "mockups", count: 2, designSystemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mockup generation failed");
      const job: DesignJobState | undefined = data.job;
      if (!job) throw new Error("Mockup generation did not start correctly");
      setLoading({ kind: "mockups", stage: "generating", jobId: job.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mockup generation failed");
      setLoading(null);
    }
  }

  async function stopGeneration() {
    if (!loading?.jobId || stopping) return;
    setStopping(true);
    setError(null);
    try {
      const res = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", projectId, jobId: loading.jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not stop generation");
      setLoading(null);
      setStopping(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not stop generation");
      setStopping(false);
    }
  }

  async function generateProposals(kind: AssetRow["kind"]) {
    if (!apiKeyConfigured) {
      setError("Add your Anthropic API key in Settings first.");
      return;
    }
    if (generationBlockedReason) {
      setError(generationBlockedReason);
      return;
    }
    setLoading({ kind, stage: "generating" });
    setError(null);

    let designSystemId: string | undefined;
    if (kind !== "design_system") {
      const ds = selectedAsset("design_system");
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
      const job: DesignJobState | undefined = data.job;
      if (!job) throw new Error("Design generation did not start correctly");
      setLoading({ kind, stage: "generating", jobId: job.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setLoading(null);
    }
  }

  async function selectProposal(assetId: string, kind: AssetRow["kind"]) {
    const currentFinal = selectedAsset(kind);
    const nextFinal = byKind[kind].find((asset) => asset.id === assetId);
    if (currentFinal && currentFinal.id !== assetId) {
      const currentLabel = currentFinal.variant ? `proposal ${currentFinal.variant}` : "the current proposal";
      const nextLabel = nextFinal?.variant ? `proposal ${nextFinal.variant}` : "this proposal";
      const dependencyWarning = kind === "design_system" && (selectedAsset("landing_page") || selectedAsset("deck"))
        ? " The landing page and brand deck mockups will be rebuilt on the new identity."
        : "";
      if (!confirm(`Replace ${currentLabel} with ${nextLabel} as the final direction?${dependencyWarning}`)) return;
    }
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
        prev.map((asset) => {
          if (asset.kind === updated.kind) return { ...asset, selected: asset.id === updated.id };
          if (
            updated.kind === "design_system"
            && (asset.kind === "landing_page" || asset.kind === "deck")
          ) {
            return { ...asset, selected: false };
          }
          return asset;
        })
      );
      setPreviewAssetId(updated.id);
      setPreviewSection("overview");
      router.refresh();
      if (updated.kind === "design_system") {
        // Approving the identity moves straight to the plan's next step:
        // the application mockups.
        await generateMockups(updated.id);
        return;
      }
      setLoading(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Selection failed");
      setLoading(null);
    }
  }

  function removeAssetsFromState(ids: string[]) {
    const discardedIds = new Set(ids);
    setAssets((prev) => {
      const removedSystems = prev.filter(
        (a) => discardedIds.has(a.id) && a.kind === "design_system"
      );
      const next = prev
        .filter((asset) => !discardedIds.has(asset.id))
        .map((candidate) =>
          removedSystems.some((sys) => candidate.design_system_id === sys.id)
            ? { ...candidate, selected: false }
            : candidate
        );
      if (previewAssetId && discardedIds.has(previewAssetId)) {
        setPreviewAssetId(next.find((a) => a.selected)?.id ?? next[0]?.id ?? null);
        setPreviewSection("overview");
      }
      return next;
    });
  }

  async function discardProposal(assetId: string) {
    if (deletingId || discardingKind) return;
    const snapshot = assets;
    setDeletingId(assetId);
    setError(null);
    // Optimistic remove — no browser confirm (those dialogs often get blocked).
    removeAssetsFromState([assetId]);
    try {
      const res = await fetch("/api/design", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ projectId, assetIds: [assetId] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.refresh();
    } catch (e) {
      setAssets(snapshot);
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function discardUnselected(kind: AssetRow["kind"]) {
    const unselected = byKind[kind].filter((asset) => !asset.selected);
    if (unselected.length === 0 || deletingId || discardingKind) return;
    const snapshot = assets;
    setDiscardingKind(kind);
    setError(null);
    const ids = unselected.map((asset) => asset.id);
    removeAssetsFromState(ids);
    try {
      const res = await fetch("/api/design", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ projectId, assetIds: ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.refresh();
    } catch (e) {
      setAssets(snapshot);
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDiscardingKind(null);
    }
  }

  async function discardMany(ids: string[]) {
    if (ids.length === 0 || deletingId || discardingKind) return;
    const snapshot = assets;
    const first = assets.find((a) => a.id === ids[0]);
    setDiscardingKind(first?.kind ?? "design_system");
    setError(null);
    removeAssetsFromState(ids);
    try {
      const res = await fetch("/api/design", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ projectId, assetIds: ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.refresh();
    } catch (e) {
      setAssets(snapshot);
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDiscardingKind(null);
    }
  }

  function download(asset: AssetRow) {
    const ext = "html";
    const blob = new Blob([asset.html ?? ""], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeDownloadName(asset.name)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function publishFinalPackage() {
    setPublishingPackage(true);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, action: "publish" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Final package could not be published");
      setShareToken(data.token);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Final package could not be published");
    } finally {
      setPublishingPackage(false);
    }
  }

  async function copyPackageLink() {
    if (!shareToken) return;
    try {
      await navigator.clipboard.writeText(`${origin}/share/${shareToken}/package`);
      setPackageLinkCopied(true);
      window.setTimeout(() => setPackageLinkCopied(false), 2000);
    } catch {
      setError("Could not copy the package link. Open it and copy the address from your browser.");
    }
  }

  async function downloadFinalDeliverable() {
    setCreatingDeliverable(true);
    setError(null);
    try {
      const params = new URLSearchParams({ projectId, format: "deliverable" });
      const res = await fetch(`/api/design?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Final deliverable could not be created");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="([^"]+)"/)?.[1]
        ?? `${projectName.replace(/\s+/g, "-").toLowerCase()}-faro-brand-deliverable.html`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Final deliverable could not be created");
    } finally {
      setCreatingDeliverable(false);
    }
  }

  const identitySelected = selectedAsset("design_system");
  const landingSelected = selectedAsset("landing_page");
  const deckSelected = selectedAsset("deck");
  const finalOutputs = [
    {
      kind: "design_system" as const,
      label: "Brand Identity System",
      asset: identitySelected,
      ready: Boolean(identitySelected),
    },
    {
      kind: "landing_page" as const,
      label: "Landing Page",
      asset: landingSelected,
      ready: Boolean(identitySelected && landingSelected?.design_system_id === identitySelected.id),
    },
    {
      kind: "deck" as const,
      label: "Brand Deck",
      asset: deckSelected,
      ready: Boolean(identitySelected && deckSelected?.design_system_id === identitySelected.id),
    },
  ];
  const finalCount = finalOutputs.filter((output) => output.ready).length;
  const deliverableReady = finalCount === finalOutputs.length;
  const generationKind: DesignGenerationKind | null = loading?.stage === "generating"
    && (loading.kind === "design_system" || loading.kind === "landing_page" || loading.kind === "deck" || loading.kind === "mockups")
    ? loading.kind
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-12 lg:py-12 2xl:max-w-[104rem]">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium tracking-tight lg:text-4xl">Design Studio</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
          Builds on the logo you approved in the Logo Workshop. Systems must follow your strategy
          brief only — no invented claims. Compare proposals, delete any you don&apos;t want, pick
          one, and the Studio applies it to the mockups your plan calls for.
        </p>
      </div>

      {!apiKeyConfigured && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-6 py-4 text-sm text-[var(--foreground)]">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          Graphics run through Open Design. Start the OD daemon (start-open-design.ps1) and keep
          your Anthropic key in Settings for OD BYOK.
        </div>
      )}

      {generationBlockedReason && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-6 py-4 text-sm text-[var(--foreground)]">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {generationBlockedReason}
        </div>
      )}

      {error && (
        <div role="alert" className="mb-6 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-6 py-4 text-sm text-[var(--foreground)]">
          {error}
        </div>
      )}

      <section aria-labelledby="deliverable-title" className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow lg:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <PackageCheck size={18} className="text-[var(--accent)]" />
              <h2 id="deliverable-title" className="font-serif text-xl font-medium tracking-tight">Final brand package</h2>
            </div>
            <p className="max-w-xl text-sm text-[var(--muted)]">
              Approve one identity proposal — the Studio then builds the application mockups from
              your design plan and the complete brand package is ready to share.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2" aria-live="polite">
              {finalOutputs.map((output) => (
                <li
                  key={output.kind}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                    output.ready
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                      : "bg-[var(--surface-2)] text-[var(--muted)]"
                  }`}
                >
                  {output.ready ? <Check size={13} /> : <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />}
                  {output.label}{
                    output.ready && output.asset?.variant
                      ? ` · Final ${output.asset.variant}`
                      : output.asset
                      ? " · Choose aligned final"
                      : " · Choose final"
                  }
                </li>
              ))}
            </ul>
          </div>
          <div className="shrink-0 lg:text-right">
            <p className="mb-2 text-xs font-medium text-[var(--muted)]">
              {deliverableReady ? "All 3 outputs are ready" : `${finalCount} of 3 outputs ready`}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
              {shareToken ? (
                <>
                  <a
                    href={`/share/${shareToken}/package`}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!deliverableReady}
                    className={`inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition ${
                      deliverableReady ? "hover:bg-[var(--accent-hover)]" : "pointer-events-none opacity-50"
                    }`}
                  >
                    <ExternalLink size={16} /> View final package
                  </a>
                  <button
                    type="button"
                    onClick={copyPackageLink}
                    disabled={!deliverableReady}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {packageLinkCopied ? <Check size={16} /> : <Copy size={16} />}
                    {packageLinkCopied ? "Copied" : "Copy private link"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={publishFinalPackage}
                  disabled={!deliverableReady || publishingPackage || Boolean(loading)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {publishingPackage ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                  {publishingPackage ? "Publishing..." : "Publish final package"}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={downloadFinalDeliverable}
              disabled={!deliverableReady || creatingDeliverable || Boolean(loading) || Boolean(deletingId) || Boolean(discardingKind)}
              className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingDeliverable ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {creatingDeliverable ? "Preparing offline package..." : "Download offline package"}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Pipeline sidebar */}
        <div className="space-y-5">
          <PipelineStep
            kind="design_system"
            step={1}
            anchor="identity-system"
            meta={KIND_META.design_system}
            proposals={byKind.design_system}
            loading={loading}
            deletingId={deletingId}
            discardingKind={discardingKind}
            previewAssetId={previewAssetId}
            onGenerate={() => generateProposals("design_system")}
            onSelect={selectProposal}
            onPreview={previewProposal}
            onDiscard={discardProposal}
            onDiscardUnselected={() => discardUnselected("design_system")}
            onDiscardMany={discardMany}
            unlocked={!generationBlockedReason}
          />
          {/* Application mockups: created automatically after the identity is
              approved, in the design plan's execution order. Not a separate
              choice — they demonstrate the approved system. */}
          <section
            id="application-mockups"
            aria-labelledby="application-mockups-title"
            className={`scroll-mt-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow ${!identitySelected ? "opacity-60" : ""}`}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                2
              </span>
              <span className="text-[var(--accent)]"><LayoutTemplate size={18} /></span>
              <h2 id="application-mockups-title" className="text-sm font-semibold uppercase tracking-wider text-[var(--subtle)]">
                Application Mockups
              </h2>
            </div>
            <p className="mb-4 text-xs text-[var(--muted)]">
              A landing page and brand deck showing your approved identity in use. Built
              automatically when you approve an identity proposal, following the design plan.
            </p>
            {!identitySelected ? (
              <p className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
                Approve an identity proposal first — the mockups follow it.
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {(["landing_page", "deck"] as const).map((mockKind) => {
                    const asset = selectedAsset(mockKind) ?? byKind[mockKind][0] ?? null;
                    const aligned = Boolean(asset && asset.design_system_id === identitySelected.id);
                    const isPreviewed = Boolean(asset && asset.id === previewAssetId);
                    return (
                      <li
                        key={mockKind}
                        className={`flex items-center gap-1 rounded-xl border px-1 py-1 transition ${
                          isPreviewed
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--border)] bg-[var(--surface)]"
                        }`}
                      >
                        <button
                          onClick={() => asset && previewProposal(asset.id)}
                          disabled={!asset}
                          aria-pressed={isPreviewed}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left disabled:cursor-default"
                        >
                          <span className="text-[var(--accent)]">{KIND_META[mockKind].icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{KIND_META[mockKind].label}</span>
                            <span className="block truncate text-xs text-[var(--subtle)]">
                              {asset && aligned
                                ? isPreviewed
                                  ? "Previewing"
                                  : "Ready — preview"
                                : loading?.kind === "mockups"
                                ? "Building…"
                                : "Not built yet"}
                            </span>
                          </span>
                          {asset && aligned && <Check size={14} className="text-emerald-600" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => generateMockups(identitySelected.id)}
                  disabled={Boolean(loading) || Boolean(deletingId) || Boolean(discardingKind)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 text-xs font-medium transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading?.kind === "mockups" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {loading?.kind === "mockups" ? "Building the mockups…" : "Rebuild the mockups"}
                </button>
              </>
            )}
          </section>
        </div>

        {/* Preview */}
        <div className="flex min-h-[60vh] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow">
          {generationKind ? (
            <DesignGenerationWindow
              kind={generationKind}
              projectName={projectName}
              onCancel={loading?.jobId ? () => void stopGeneration() : undefined}
              cancelling={stopping}
            />
          ) : previewAsset ? (
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
                        Final
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-[var(--subtle)]">
                    Generated {new Date(previewAsset.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!previewAsset.selected && (
                    <>
                      <button
                        onClick={() => selectProposal(previewAsset.id, previewAsset.kind)}
                        disabled={Boolean(loading) || Boolean(deletingId) || Boolean(discardingKind)}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                      >
                        <Check size={16} /> Choose as final
                      </button>
                      <button
                        onClick={() => discardProposal(previewAsset.id)}
                        disabled={Boolean(deletingId) || Boolean(discardingKind)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === previewAsset.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Discard
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={openFullPreview}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--surface-2)]"
                  >
                    <ExternalLink size={16} /> Full preview
                  </button>
                  <button
                    onClick={() => download(previewAsset)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--surface-2)]"
                  >
                    <Download size={16} /> Download
                  </button>
                  {previewAsset.selected && (
                    <button
                      onClick={() => discardProposal(previewAsset.id)}
                      disabled={Boolean(deletingId) || Boolean(discardingKind)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Delete selected proposal"
                    >
                      {deletingId === previewAsset.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
                {previewAsset.kind === "design_system" && (
                  <div
                    role="group"
                    aria-label="Identity preview sections"
                    className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] p-2"
                  >
                    <span className="sr-only" aria-live="polite">
                      Showing {IDENTITY_PREVIEW_SECTIONS.find((section) => section.id === previewSection)?.label} section
                    </span>
                    {IDENTITY_PREVIEW_SECTIONS.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => focusPreviewSection(section.id)}
                        aria-pressed={previewSection === section.id}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          previewSection === section.id
                            ? "bg-[var(--accent)] text-white"
                            : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {section.label}
                      </button>
                    ))}
                  </div>
                )}
                <iframe
                  ref={previewFrameRef}
                  key={previewAsset.id}
                  title={`${KIND_META[previewAsset.kind].label} preview`}
                  srcDoc={previewHtml}
                  className={`design-preview-frame w-full ${
                    previewAsset.kind === "design_system"
                      ? "h-[calc(60vh-49px)] lg:h-[calc(70vh-49px)]"
                      : "h-[60vh] lg:h-[70vh]"
                  }`}
                  sandbox="allow-scripts"
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
  step,
  anchor,
  meta,
  proposals,
  loading,
  deletingId,
  discardingKind,
  previewAssetId,
  onGenerate,
  onSelect,
  onPreview,
  onDiscard,
  onDiscardUnselected,
  onDiscardMany,
  unlocked,
}: {
  kind: AssetRow["kind"];
  step: number;
  anchor: string;
  meta: (typeof KIND_META)[AssetRow["kind"]];
  proposals: AssetRow[];
  loading: GenerationState;
  deletingId: string | null;
  discardingKind: AssetRow["kind"] | null;
  previewAssetId: string | null;
  onGenerate: () => void;
  onSelect: (id: string, kind: AssetRow["kind"]) => void;
  onPreview: (id: string) => void;
  onDiscard: (id: string) => void;
  onDiscardUnselected: () => void;
  onDiscardMany: (ids: string[]) => void;
  unlocked: boolean;
}) {
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const isGenerating = loading?.kind === kind && loading.stage === "generating";
  const isDiscarding = discardingKind === kind;
  // Generation must not lock delete — previously a stuck/restarting job set
  // `loading` and disabled every Trash control across the studio.
  const isDeleting = Boolean(deletingId) || Boolean(discardingKind);
  const isBusy = isGenerating || isDeleting;
  const unselectedCount = proposals.filter((asset) => !asset.selected).length;
  const markedCount = [...marked].filter((id) => proposals.some((p) => p.id === id)).length;

  // Drop marks for proposals that no longer exist after regenerate/delete.
  useEffect(() => {
    const ids = new Set(proposals.map((p) => p.id));
    setMarked((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [proposals]);

  function toggleMark(id: string) {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleMarkAll() {
    if (markedCount === proposals.length) {
      setMarked(new Set());
      return;
    }
    setMarked(new Set(proposals.map((p) => p.id)));
  }

  async function deleteMarked() {
    const ids = [...marked].filter((id) => proposals.some((p) => p.id === id));
    if (ids.length === 0) return;
    onDiscardMany(ids);
    setMarked(new Set());
  }

  return (
    <section
      id={anchor}
      aria-labelledby={`${anchor}-title`}
      className={`scroll-mt-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow ${!unlocked ? "opacity-60" : ""}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
          {step}
        </span>
        <span className="text-[var(--accent)]">{meta.icon}</span>
        <h2 id={`${anchor}-title`} className="text-sm font-semibold uppercase tracking-wider text-[var(--subtle)]">
          {meta.label}
        </h2>
      </div>
      <p className="mb-4 text-xs text-[var(--muted)]">{meta.description}</p>

      <div className="mb-4 space-y-2">
        <button
          onClick={onGenerate}
          disabled={!unlocked || isBusy}
          aria-busy={isGenerating}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Sparkles size={16} />}
          {isGenerating ? "Generating 3 proposals..." : proposals.length > 0 ? "Regenerate proposals" : meta.cta}
        </button>
        {proposals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleMarkAll}
              disabled={isDeleting}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
            >
              {markedCount === proposals.length ? "Clear selection" : "Select all"}
            </button>
            <button
              type="button"
              onClick={deleteMarked}
              disabled={isDeleting || markedCount === 0}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-3 py-2 text-xs font-medium text-[var(--danger)] transition hover:border-[var(--danger)]/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={14} />
              Delete selected ({markedCount})
            </button>
          </div>
        )}
        {unselectedCount > 0 && (
          <button
            type="button"
            onClick={onDiscardUnselected}
            disabled={isDeleting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDiscarding ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Discard unselected ({unselectedCount})
          </button>
        )}
      </div>

      {!unlocked && kind !== "design_system" && (
        <p className="mb-3 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
          Select an identity system first.
        </p>
      )}

      {proposals.length > 0 ? (
        <ul className="space-y-2">
          {proposals.map((asset) => {
            const isSelected = asset.selected;
            const isPreviewed = asset.id === previewAssetId;
            const isMarked = marked.has(asset.id);
            return (
              <li
                key={asset.id}
                className={`group flex items-center gap-1 rounded-xl border px-1 py-1 transition ${
                  isPreviewed
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : isMarked
                    ? "border-[var(--danger)]/30 bg-[var(--danger)]/5"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isMarked}
                  aria-label={`Select proposal ${asset.variant ?? ""} for deletion`}
                  onClick={() => toggleMark(asset.id)}
                  disabled={isDeleting}
                  className={`ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    isMarked
                      ? "border-[var(--danger)] bg-[var(--danger)] text-white"
                      : "border-[var(--border-strong)] text-transparent hover:border-[var(--muted)]"
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </button>
                <button
                  onClick={() => onPreview(asset.id)}
                  aria-pressed={isPreviewed}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left"
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
                      {isSelected ? "Final direction" : isPreviewed ? "Previewing" : "Preview proposal"}
                    </span>
                  </span>
                </button>
                {!isSelected && (
                  <button
                    type="button"
                    onClick={() => onSelect(asset.id, kind)}
                    disabled={isBusy}
                    className="rounded-full p-1.5 text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Choose proposal ${asset.variant ?? ""} as final`}
                    title="Choose as final"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDiscard(asset.id)}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-[var(--danger)]/80 transition hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete proposal ${asset.variant ?? ""}`}
                  title="Delete proposal"
                >
                  {deletingId === asset.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-[var(--muted)]">No proposals yet.</p>
      )}
    </section>
  );
}

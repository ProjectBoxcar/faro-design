"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
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
  Copy,
  MessageSquarePlus,
  X,
  ExternalLink,
  MessageSquare,
  Mail,
  Megaphone,
  Printer,
} from "lucide-react";
import { CHANNEL_ASSET_KINDS } from "@/lib/db/types";
import type { AssetRow } from "@/lib/design";
import {
  buildArtifactPreviewHtml,
  IDENTITY_PREVIEW_SECTIONS,
  type IdentityPreviewSection,
} from "@/lib/design-preview";
import { FaroBeacon } from "@/components/FaroLoader";
import { StagePageBanner } from "@/components/StagePageBanner";
import { ViabilityPanel } from "@/components/ViabilityPanel";
import { useLocale } from "@/components/LocaleProvider";
import type { EvalScore } from "@/lib/db/types";
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
  sms: {
    label: "SMS template",
    shortLabel: "SMS",
    icon: <MessageSquare size={18} />,
    description: "Text-message mockup from your strategy and identity.",
    cta: "Build SMS template",
  },
  email: {
    label: "Email template",
    shortLabel: "Email",
    icon: <Mail size={18} />,
    description: "Marketing email layout using your brand system.",
    cta: "Build email template",
  },
  ad: {
    label: "Ad mockups",
    shortLabel: "Ads",
    icon: <Megaphone size={18} />,
    description: "Feed and story ad canvases bound to the brief.",
    cta: "Build ad mockups",
  },
  print: {
    label: "Print collateral",
    shortLabel: "Print",
    icon: <Printer size={18} />,
    description: "Business card and flyer mockups for print.",
    cta: "Build print set",
  },
};

type GenerationState = {
  kind: AssetRow["kind"] | "mockups" | "channels";
  stage: "generating" | "selecting";
  jobId?: string;
} | null;

export function DesignStudio({
  projectId,
  projectName,
  initialAssets,
  initialJob,
  initialShareToken: _initialShareToken,
  generationBlockedReason,
  apiKeyConfigured,
  daemonUp = true,
  viability = null,
}: {
  projectId: string;
  projectName: string;
  initialAssets: AssetRow[];
  initialJob: DesignJobState | null;
  /** Package links live on Brand Handover — prop kept for call-site compat */
  initialShareToken: string | null;
  generationBlockedReason: string | null;
  apiKeyConfigured: boolean;
  /** Open Design daemon reachable (pre-flight) */
  daemonUp?: boolean;
  viability?: {
    status: "pending" | "pass" | "fail" | "caveat";
    overrideNote: string | null;
    scores: EvalScore[] | null;
    personal: boolean;
  } | null;
}) {
  void _initialShareToken;
  const router = useRouter();
  const { t } = useLocale();
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const [assets, setAssets] = useState<AssetRow[]>(initialAssets);
  const [loading, setLoading] = useState<GenerationState>(() =>
    initialJob && (initialJob.status === "queued" || initialJob.status === "running")
      ? { kind: initialJob.kind, stage: "generating", jobId: initialJob.id }
      : null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [discardingKind, setDiscardingKind] = useState<AssetRow["kind"] | null>(null);
  const [previewSection, setPreviewSection] = useState<IdentityPreviewSection>("overview");
  const [error, setError] = useState<string | null>(null);
  const [failedJob, setFailedJob] = useState<DesignJobState | null>(
    initialJob && initialJob.status === "failed" ? initialJob : null
  );
  const [stopping, setStopping] = useState(false);
  const [jobProgress, setJobProgress] = useState<{ done: number; total: number }>(() =>
    initialJob && (initialJob.status === "queued" || initialJob.status === "running")
      ? { done: initialJob.asset_ids?.length ?? 0, total: initialJob.count ?? 0 }
      : { done: 0, total: 0 }
  );
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
      sms: [],
      email: [],
      ad: [],
      print: [],
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
        // Never let poll glitches drop completed counts (would yank the bar backward).
        setJobProgress((prev) => {
          const done = job.asset_ids?.length ?? 0;
          const total = job.count ?? prev.total ?? 0;
          return {
            done: Math.max(prev.done, done),
            total: Math.max(prev.total, total),
          };
        });
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
              : job.kind === "channels"
                ? [
                    ...previous.filter(
                      (asset) =>
                        !CHANNEL_ASSET_KINDS.includes(
                          asset.kind as (typeof CHANNEL_ASSET_KINDS)[number]
                        )
                    ),
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
          setJobProgress({ done: 0, total: 0 });
          router.refresh();
          return;
        }
        if (job.status === "failed") {
          const stopped = /stopped/i.test(job.error ?? "");
          if (stopped) {
            setError(null);
            setFailedJob(null);
          } else {
            const hint =
              typeof job.errorHint === "string" && job.errorHint.trim()
                ? job.errorHint
                : t("design.resumeHint");
            setError(job.error ?? t("design.failedDefault"));
            setFailedJob({ ...job, errorHint: hint });
          }
          setLoading(null);
          setJobProgress({ done: 0, total: 0 });
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
    setJobProgress({ done: 0, total: 0 });
    setError(null);
    setFailedJob(null);
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
      setJobProgress({ done: job.asset_ids?.length ?? 0, total: job.count ?? 2 });
      setLoading({ kind: "mockups", stage: "generating", jobId: job.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mockup generation failed");
      setLoading(null);
      setJobProgress({ done: 0, total: 0 });
    }
  }

  async function generateChannels(designSystemId: string) {
    if (!apiKeyConfigured) {
      setError(t("design.notSetup"));
      return;
    }
    if (!daemonUp) {
      setError(t("design.daemonDownHint"));
      return;
    }
    setLoading({ kind: "channels", stage: "generating" });
    setJobProgress({ done: 0, total: 4 });
    setError(null);
    setFailedJob(null);
    try {
      const res = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, kind: "channels", count: 4, designSystemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("design.channelsFailed"));
      const job: DesignJobState | undefined = data.job;
      if (!job) throw new Error(t("design.channelsFailed"));
      setJobProgress({ done: job.asset_ids?.length ?? 0, total: job.count ?? 4 });
      setLoading({ kind: "channels", stage: "generating", jobId: job.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("design.channelsFailed"));
      setLoading(null);
      setJobProgress({ done: 0, total: 0 });
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
      const wasMockups = loading.kind === "mockups";
      setLoading(null);
      setJobProgress({ done: 0, total: 0 });
      setStopping(false);
      if (wasMockups) {
        setError(null);
        // Soft guidance — not an error. Identity selection is kept.
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not stop generation");
      setStopping(false);
    }
  }

  async function generateProposals(
    kind: AssetRow["kind"],
    opts?: { feedback?: string; refineFromAssetId?: string }
  ) {
    if (!apiKeyConfigured) {
      setError(t("design.notSetup"));
      return;
    }
    if (!daemonUp) {
      setError(t("design.daemonDownHint"));
      return;
    }
    if (generationBlockedReason) {
      setError(generationBlockedReason);
      return;
    }
    setLoading({ kind, stage: "generating" });
    setJobProgress({ done: 0, total: 0 });
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
        body: JSON.stringify({
          projectId,
          kind,
          count: 3,
          designSystemId,
          ...(opts?.feedback?.trim() ? { feedback: opts.feedback.trim() } : {}),
          ...(opts?.refineFromAssetId ? { refineFromAssetId: opts.refineFromAssetId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      const job: DesignJobState | undefined = data.job;
      if (!job) throw new Error("Design generation did not start correctly");
      setJobProgress({ done: job.asset_ids?.length ?? 0, total: job.count ?? 3 });
      setLoading({ kind, stage: "generating", jobId: job.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setLoading(null);
      setJobProgress({ done: 0, total: 0 });
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
        // Server may already have started mockups on select; reuse that job if present.
        const serverJob = data.job as DesignJobState | null | undefined;
        if (serverJob?.id) {
          setJobProgress({
            done: serverJob.asset_ids?.length ?? 0,
            total: serverJob.count ?? 2,
          });
          setLoading({ kind: "mockups", stage: "generating", jobId: serverJob.id });
          return;
        }
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
  const generationKind: DesignGenerationKind | null =
    loading?.stage === "generating" &&
    (loading.kind === "design_system" ||
      loading.kind === "landing_page" ||
      loading.kind === "deck" ||
      loading.kind === "mockups" ||
      loading.kind === "channels")
      ? loading.kind
      : null;
  const mockupsAligned =
    Boolean(identitySelected) &&
    Boolean(landingSelected?.design_system_id === identitySelected?.id) &&
    Boolean(deckSelected?.design_system_id === identitySelected?.id);
  const mockupsIncomplete = Boolean(identitySelected) && !mockupsAligned;
  const isBuildingMockups = loading?.kind === "mockups" && loading.stage === "generating";
  const isBuildingChannels = loading?.kind === "channels" && loading.stage === "generating";
  const channelsAligned = Boolean(
    identitySelected &&
      CHANNEL_ASSET_KINDS.every((k) => {
        const a = selectedAsset(k) ?? byKind[k]?.[0];
        return a && a.design_system_id === identitySelected.id;
      })
  );
  const channelsIncomplete = Boolean(identitySelected) && !channelsAligned;
  const actionsBusy = Boolean(loading) || Boolean(deletingId) || Boolean(discardingKind);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 lg:px-12 lg:py-8 2xl:max-w-[104rem]">
      <StagePageBanner stageId="design" data-faro-anchor="faro-design-primary">
        <h1 className="font-serif text-2xl font-medium tracking-tight lg:text-3xl">
          {t("design.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{t("design.lede")}</p>
      </StagePageBanner>

      {!apiKeyConfigured && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-6 py-4 text-sm text-[var(--foreground)]">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{t("design.setupTitle")}</p>
            <p className="mt-1.5 text-[var(--muted)]">{t("design.setupHint")}</p>
            <Link
              href="/settings"
              className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {t("nav.settings")}
            </Link>
          </div>
        </div>
      )}

      {apiKeyConfigured && !daemonUp && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-6 py-4 text-sm text-[var(--foreground)]">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{t("design.daemonDownTitle")}</p>
            <p className="mt-1.5 text-[var(--muted)]">{t("design.daemonDownHint")}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-xs font-medium hover:bg-[var(--surface-2)]"
            >
              {t("design.retryHelper")}
            </button>
          </div>
        </div>
      )}

      {generationBlockedReason && /viability/i.test(generationBlockedReason) && viability ? (
        <div className="mb-5">
          <ViabilityPanel
            projectId={projectId}
            viability={viability.status}
            overrideNote={viability.overrideNote}
            scores={viability.scores}
            personal={viability.personal}
            forceShow
          />
        </div>
      ) : null}

      {generationBlockedReason && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-4 py-3 text-sm text-[var(--foreground)]">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {generationBlockedReason}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-6 py-4 text-sm text-[var(--foreground)]"
        >
          <p className="font-medium">{t("design.pausedTitle")}</p>
          <p className="mt-1">{error}</p>
          {failedJob?.errorHint ? (
            <p className="mt-2 text-xs text-[var(--muted)]">{failedJob.errorHint}</p>
          ) : null}
          {(failedJob?.resumable !== false || failedJob) && (
            <button
              type="button"
              className="mt-3 inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              disabled={actionsBusy || !daemonUp || !apiKeyConfigured}
              onClick={() => {
                const kind = failedJob?.kind;
                setError(null);
                setFailedJob(null);
                if (kind === "mockups") {
                  const ds = selectedAsset("design_system");
                  if (ds) void generateMockups(ds.id);
                  else setError(t("design.needIdentity"));
                } else if (kind === "channels") {
                  const ds = selectedAsset("design_system");
                  if (ds) void generateChannels(ds.id);
                  else setError(t("design.needIdentity"));
                } else if (
                  kind === "design_system" ||
                  kind === "landing_page" ||
                  kind === "deck" ||
                  kind === "sms" ||
                  kind === "email" ||
                  kind === "ad" ||
                  kind === "print"
                ) {
                  if (kind === "design_system") void generateProposals(kind);
                  else {
                    const ds = selectedAsset("design_system");
                    if (ds && kind !== "landing_page" && kind !== "deck") {
                      void generateChannels(ds.id);
                    } else if (kind === "landing_page" || kind === "deck") {
                      void generateProposals(kind);
                    } else void generateProposals("design_system");
                  }
                } else {
                  void generateProposals("design_system");
                }
              }}
            >
              {t("design.continueGenerating")}
            </button>
          )}
        </div>
      )}

      {/* After stop/cancel (or first select): clear path to finish mockups. */}
      {mockupsIncomplete && !isBuildingMockups && (
        <div className="mb-6 rounded-2xl border border-[var(--accent)]/35 bg-[var(--accent)]/8 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-[var(--foreground)]">
                Identity chosen — next: application mockups
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                You selected a Brand Identity System
                {identitySelected?.variant ? ` (proposal ${identitySelected.variant})` : ""}.
                Build the landing page and brand deck to continue toward Brand Handover
                {loading?.stage === "selecting" ? "" : " (safe to restart if you stopped earlier)"}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => identitySelected && void generateMockups(identitySelected.id)}
              disabled={actionsBusy || !identitySelected}
              data-faro-anchor="faro-design-generate"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              <Sparkles size={16} />
              Build landing page &amp; deck
            </button>
          </div>
        </div>
      )}

      {/* Package / publish lives only on Brand Handover — keep Design Studio = create & select */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {deliverableReady
              ? t("design.visualsReady")
              : t("design.chooseFinals", { n: finalCount })}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {finalOutputs.map((output) => (
              <li
                key={output.kind}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                  output.ready
                    ? "border-[var(--ok)]/40 bg-[var(--ok)]/10 text-[var(--ok)]"
                    : "border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {output.ready ? <Check size={12} /> : <span className="inline-block h-2 w-2 rounded-full bg-[var(--border-strong)]" />}
                {output.label}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-[var(--muted)]">{t("design.handoverNote")}</p>
        </div>
        <Link
          href={`/projects/${projectId}/handover`}
          data-faro-anchor="faro-design-handover"
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            deliverableReady
              ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              : "border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
          }`}
        >
          <PackageCheck size={16} />
          {deliverableReady ? t("design.openHandover") : t("design.leftForHandover")}
        </Link>
      </div>

      {/* Sticky current step for cognitive load */}
      <div className="sticky top-14 z-20 mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 px-4 py-2 shadow-sm backdrop-blur lg:top-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
          Design Studio · create & select
        </p>
        <p className="text-sm font-medium text-[var(--foreground)]">
          {!identitySelected
            ? "Step 1 — Brand identity system"
            : !finalOutputs.find((o) => o.kind === "landing_page")?.ready
              ? "Step 2 — Landing page mockup"
              : !finalOutputs.find((o) => o.kind === "deck")?.ready
                ? "Step 3 — Brand deck"
                : "All finals chosen — continue to Brand Handover"}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
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
            onImprove={(assetId, feedback) =>
              generateProposals("design_system", {
                refineFromAssetId: assetId,
                feedback,
              })
            }
            onSelect={selectProposal}
            onPreview={previewProposal}
            onDiscard={discardProposal}
            onDiscardUnselected={() => discardUnselected("design_system")}
            onDiscardMany={discardMany}
            unlocked={!generationBlockedReason}
            allowFeedback
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
              Landing page + brand deck applying your chosen identity. Starts when you choose a
              final identity — if you stop, use the button below to continue anytime.
            </p>
            {!identitySelected ? (
              <p className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
                First choose a Brand Identity System as final (button on each proposal, or{" "}
                <strong className="font-medium text-[var(--foreground)]">Choose as final</strong> in
                the preview).
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
                                  : "Built — open preview"
                                : isBuildingMockups
                                ? "Building…"
                                : "Not built yet"}
                            </span>
                          </span>
                          {asset && aligned && <Check size={14} className="text-[var(--ok)]" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => void generateMockups(identitySelected.id)}
                  disabled={actionsBusy}
                  className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    mockupsIncomplete
                      ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                      : "border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {isBuildingMockups ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  {isBuildingMockups
                    ? "Building the mockups…"
                    : mockupsAligned
                      ? "Rebuild the mockups"
                      : "Build / continue mockups"}
                </button>
              </>
            )}
          </section>

          {/* Channel templates: SMS, email, ads, print — optional applications */}
          <section
            id="channel-templates"
            aria-labelledby="channel-templates-title"
            className={`mt-4 scroll-mt-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow ${!identitySelected ? "opacity-60" : ""}`}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                3
              </span>
              <span className="text-[var(--accent)]">
                <Megaphone size={18} />
              </span>
              <h2
                id="channel-templates-title"
                className="text-sm font-semibold uppercase tracking-wider text-[var(--subtle)]"
              >
                {t("design.channelsTitle")}
              </h2>
            </div>
            <p className="mb-4 text-xs text-[var(--muted)]">{t("design.channelsBlurb")}</p>
            {!identitySelected ? (
              <p className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
                {t("design.channelsNeedIdentity")}
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {CHANNEL_ASSET_KINDS.map((chKind) => {
                    const asset = selectedAsset(chKind) ?? byKind[chKind]?.[0] ?? null;
                    const aligned = Boolean(asset && asset.design_system_id === identitySelected.id);
                    const isPreviewed = Boolean(asset && asset.id === previewAssetId);
                    return (
                      <li
                        key={chKind}
                        className={`flex items-center gap-1 rounded-xl border px-1 py-1 transition ${
                          isPreviewed
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--border)] bg-[var(--surface)]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => asset && previewProposal(asset.id)}
                          disabled={!asset}
                          aria-pressed={isPreviewed}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left disabled:cursor-default"
                        >
                          <span className="text-[var(--accent)]">{KIND_META[chKind].icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{KIND_META[chKind].label}</span>
                            <span className="block truncate text-xs text-[var(--subtle)]">
                              {asset && aligned
                                ? isPreviewed
                                  ? t("design.previewing")
                                  : t("design.builtPreview")
                                : isBuildingChannels
                                  ? t("design.building")
                                  : t("design.notBuilt")}
                            </span>
                          </span>
                          {asset && aligned && <Check size={14} className="text-[var(--ok)]" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => void generateChannels(identitySelected.id)}
                  disabled={actionsBusy}
                  className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    channelsIncomplete
                      ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                      : "border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {isBuildingChannels ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  {isBuildingChannels
                    ? t("design.channelsBuilding")
                    : channelsAligned
                      ? t("design.channelsRebuild")
                      : t("design.channelsBuild")}
                </button>
              </>
            )}
          </section>
        </div>

        {/* Preview */}
        <div className="flex min-h-[40vh] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 card-shadow lg:min-h-[48vh]">
          {generationKind ? (
            <DesignGenerationWindow
              kind={generationKind}
              projectName={projectName}
              onCancel={loading?.jobId ? () => void stopGeneration() : undefined}
              cancelling={stopping}
              progressDone={jobProgress.done}
              progressTotal={jobProgress.total}
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
                      <span className="rounded-full bg-[var(--ok)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--ok)]">
                        Final
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-[var(--subtle)]">
                    Generated {new Date(previewAsset.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!previewAsset.selected ? (
                    <>
                      <button
                        onClick={() => selectProposal(previewAsset.id, previewAsset.kind)}
                        disabled={actionsBusy}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
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
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ok)]/15 px-3 py-1.5 text-xs font-semibold text-[var(--ok)]">
                        <Check size={14} /> This is your final {KIND_META[previewAsset.kind].shortLabel}
                      </span>
                      {previewAsset.kind === "design_system" && mockupsIncomplete && !isBuildingMockups && (
                        <button
                          type="button"
                          onClick={() => void generateMockups(previewAsset.id)}
                          disabled={actionsBusy}
                          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                        >
                          <Sparkles size={16} /> Build mockups next
                        </button>
                      )}
                      <button
                        onClick={() => discardProposal(previewAsset.id)}
                        disabled={Boolean(deletingId) || Boolean(discardingKind)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                      >
                        {deletingId === previewAsset.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Remove
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

const IDENTITY_FEEDBACK_CHIPS = [
  "Simpler palette",
  "Bolder type hierarchy",
  "More space / calmer",
  "Stronger components",
  "Closer to the logo",
  "Less generic",
];

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
  onImprove,
  onSelect,
  onPreview,
  onDiscard,
  onDiscardUnselected,
  onDiscardMany,
  unlocked,
  allowFeedback = false,
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
  onImprove?: (assetId: string, feedback: string) => void;
  onSelect: (id: string, kind: AssetRow["kind"]) => void;
  onPreview: (id: string) => void;
  onDiscard: (id: string) => void;
  onDiscardUnselected: () => void;
  onDiscardMany: (ids: string[]) => void;
  unlocked: boolean;
  allowFeedback?: boolean;
}) {
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [chips, setChips] = useState<string[]>([]);
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
          {isGenerating ? <FaroBeacon size="sm" tone="light" /> : <Sparkles size={16} />}
          {isGenerating ? "Generating 3 proposals..." : proposals.length > 0 ? "Regenerate proposals" : meta.cta}
        </button>
        {kind === "design_system" && proposals.length === 0 && !isGenerating ? (
          <p className="text-[11px] leading-snug text-[var(--subtle)]">
            Usually several minutes — uses Open Design and your design key. Keep this tab open.
          </p>
        ) : null}
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
          {allowFeedback && proposals.length > 0 && (
            <p className="mb-2 text-[11px] leading-snug text-[var(--muted)]">
              Like a proposal? Use{" "}
              <span className="font-medium text-[var(--foreground)]">Improve with feedback</span> to
              refine it — chips + your notes, then three new versions.
            </p>
          )}
          {proposals.map((asset) => {
            const isSelected = asset.selected;
            const isPreviewed = asset.id === previewAssetId;
            const isMarked = marked.has(asset.id);
            const showFeedback = allowFeedback && feedbackFor === asset.id && onImprove;
            return (
              <li
                key={asset.id}
                className={`rounded-xl border p-2 transition ${
                  showFeedback
                    ? "border-[var(--accent)]/50 bg-[var(--accent)]/5"
                    : isPreviewed
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : isMarked
                    ? "border-[var(--danger)]/30 bg-[var(--danger)]/5"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isMarked}
                    aria-label={`Select proposal ${asset.variant ?? ""} for deletion`}
                    onClick={() => toggleMark(asset.id)}
                    disabled={isDeleting}
                    className={`ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
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
                  {isSelected ? (
                    <span className="shrink-0 rounded-full bg-[var(--ok)]/15 px-2 py-1 text-[10px] font-semibold text-[var(--ok)]">
                      Final
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelect(asset.id, kind)}
                      disabled={isBusy}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Choose proposal ${asset.variant ?? ""} as final`}
                      title="Choose as final"
                    >
                      <Check size={12} /> Choose
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
                  </button>
                </div>

                {allowFeedback && onImprove && (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackFor((id) => (id === asset.id ? null : asset.id));
                      setFeedbackText("");
                      setChips([]);
                    }}
                    disabled={isBusy}
                    className={`mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                      showFeedback
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                        : "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/15"
                    }`}
                  >
                    <MessageSquarePlus size={14} />
                    {showFeedback ? "Hide feedback" : "Improve with feedback"}
                  </button>
                )}

                {showFeedback && (
                  <div className="mt-2 rounded-xl border border-[var(--accent)]/20 bg-[var(--background)] p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-[11px] leading-snug text-[var(--muted)]">
                        Describe what should change. Faro keeps this direction and generates{" "}
                        <strong className="font-medium text-[var(--foreground)]">3 refined versions</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={() => setFeedbackFor(null)}
                        className="shrink-0 rounded-full p-1 text-[var(--subtle)] hover:bg-[var(--surface-2)]"
                        aria-label="Close feedback"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {IDENTITY_FEEDBACK_CHIPS.map((chip) => {
                        const on = chips.includes(chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() =>
                              setChips((prev) =>
                                prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
                              )
                            }
                            className={`rounded-full border px-2 py-1 text-[10px] font-medium ${
                              on
                                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                                : "border-[var(--border-strong)] text-[var(--muted)] hover:text-[var(--foreground)]"
                            }`}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder='e.g. "Warmer palette, tighter type scale, simpler components."'
                      className="w-full resize-y rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-2 text-xs outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        const parts = [...chips];
                        if (feedbackText.trim()) parts.push(feedbackText.trim());
                        onImprove(asset.id, parts.join(". "));
                        setFeedbackFor(null);
                        setFeedbackText("");
                        setChips([]);
                      }}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Sparkles size={13} />
                      )}
                      Generate improved versions
                    </button>
                  </div>
                )}
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, Loader2, MessageSquarePlus, Sparkles, Square, Trash2, Undo2, X } from "lucide-react";
import { FaroBeacon, FaroLoaderInline } from "@/components/FaroLoader";
import { LOGO_STAGES, stageStatus, timeBasedPercent } from "@/lib/generation-progress";
import type { AssetPayload, EvalScore } from "@/lib/db/types";

/** Common tweak chips — owner can combine with free text. */
const FEEDBACK_CHIPS = [
  "Simpler / fewer elements",
  "Bolder weight",
  "Softer & more approachable",
  "Tighter letter-spacing",
  "More geometric mark",
  "Less decorative",
  "Stronger on dark",
  "More unique, less generic",
];

export type WorkspaceAsset = {
  id: string;
  label: string;
  direction: string | null;
  status: "candidate" | "chosen" | "approved" | "discarded";
  payload: AssetPayload;
  approvedAt: string | null;
  verdict: "pass" | "caveat" | "fail" | "blocked" | null;
  scores: EvalScore[];
  /** Parent mark id when this is an improved variation. */
  refinedFrom: string | null;
  refinedFromLabel: string | null;
};

type ImproveJob = {
  sourceId: string;
  sourceLabel: string;
  feedback: string;
};

type FreshBatch = {
  /** New asset ids from the last improve/generate run, highlighted until dismissed. */
  newIds: string[];
  mode: "improve" | "generate";
  sourceLabel?: string;
  feedback?: string;
};

function mapWorkspaceAssets(raw: Record<string, unknown>[]): WorkspaceAsset[] {
  return raw.map((a) => {
    const payload = (a.payload ?? {}) as AssetPayload;
    const tokens = payload.tokens ?? {};
    return {
      id: String(a.id),
      label: String(a.label ?? ""),
      direction: (a.direction as string | null) ?? null,
      status: a.status as WorkspaceAsset["status"],
      payload,
      approvedAt: (a.approved_at as string | null) ?? null,
      verdict: ((a.evaluation as Record<string, unknown> | null)?.verdict as WorkspaceAsset["verdict"]) ?? null,
      scores: (((a.evaluation as Record<string, unknown> | null)?.scores as EvalScore[]) ?? []),
      refinedFrom: typeof tokens.refinedFrom === "string" ? tokens.refinedFrom : null,
      refinedFromLabel: typeof tokens.refinedFromLabel === "string" ? tokens.refinedFromLabel : null,
    };
  });
}

/** Keep original order, but place improved children directly under their parent. */
function orderWithRefinements(list: WorkspaceAsset[]): WorkspaceAsset[] {
  const byParent = new Map<string, WorkspaceAsset[]>();
  for (const a of list) {
    if (!a.refinedFrom) continue;
    if (!list.some((x) => x.id === a.refinedFrom)) continue;
    const kids = byParent.get(a.refinedFrom) ?? [];
    kids.push(a);
    byParent.set(a.refinedFrom, kids);
  }
  const emitted = new Set<string>();
  const out: WorkspaceAsset[] = [];
  for (const a of list) {
    if (emitted.has(a.id)) continue;
    // Skip children here — they render under the parent.
    if (a.refinedFrom && list.some((x) => x.id === a.refinedFrom)) continue;
    out.push(a);
    emitted.add(a.id);
    for (const kid of byParent.get(a.id) ?? []) {
      if (emitted.has(kid.id)) continue;
      out.push(kid);
      emitted.add(kid.id);
    }
  }
  for (const a of list) {
    if (!emitted.has(a.id)) {
      out.push(a);
      emitted.add(a.id);
    }
  }
  return out;
}

// The logo workspace: generate → review survivors → choose → APPROVE.
// The Approve button is the whole point of this screen — the one act the AI
// can never perform. Until it's pressed, nothing here is part of the brand.
export function StudioLogoWorkspace({
  projectId,
  initialBlocked,
  name,
  initialAssets,
}: {
  projectId: string;
  initialBlocked: string | null;
  name: string | null;
  initialAssets: WorkspaceAsset[];
}) {
  const [assets, setAssets] = useState<WorkspaceAsset[]>(() =>
    initialAssets.map((a) => ({
      ...a,
      refinedFrom:
        typeof a.payload?.tokens?.refinedFrom === "string" ? a.payload.tokens.refinedFrom : null,
      refinedFromLabel:
        typeof a.payload?.tokens?.refinedFromLabel === "string"
          ? a.payload.tokens.refinedFromLabel
          : null,
    }))
  );
  const [busy, setBusy] = useState<string | null>(null); // action id or "generate"
  const [error, setError] = useState<string | null>(null);
  const [lastDiscarded, setLastDiscarded] = useState(0);
  const [stopping, setStopping] = useState(false);
  /** In-flight improve: show progress under the source card, not a silent top-of-page jump. */
  const [improveJob, setImproveJob] = useState<ImproveJob | null>(null);
  const [freshBatch, setFreshBatch] = useState<FreshBatch | null>(null);
  const nextCtaRef = useRef<HTMLDivElement | null>(null);
  const wasApproved = useRef(initialAssets.some((a) => a.status === "approved"));
  const abortRef = useRef<AbortController | null>(null);

  const live = useMemo(
    () => orderWithRefinements(assets.filter((a) => a.status !== "discarded")),
    [assets]
  );
  const discarded = assets.filter((a) => a.status === "discarded");
  const approved = live.find((a) => a.status === "approved");
  const isImproving = busy === "generate" && improveJob !== null;
  const isFreshGenerate = busy === "generate" && improveJob === null;

  // After a fresh approval, bring the next step into view (user is often mid-page).
  useEffect(() => {
    if (approved && !wasApproved.current) {
      wasApproved.current = true;
      // Sticky bar is always visible; also scroll the top banner into view gently.
      window.requestAnimationFrame(() => {
        nextCtaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
    if (!approved) wasApproved.current = false;
  }, [approved]);

  // Google Fonts used by any candidate's lettering — loaded live for preview.
  const fontLinks = useMemo(() => {
    const fonts = new Set<string>();
    for (const a of assets) {
      for (const f of ((a.payload.tokens?.fonts as string[]) ?? [])) fonts.add(f);
    }
    return [...fonts].map(
      (f) => `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700&display=swap`
    );
  }, [assets]);

  async function act(
    body: Record<string, string>,
    busyKey: string,
    meta?: { improve?: ImproveJob }
  ) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const priorIds = new Set(assets.map((a) => a.id));
    setBusy(busyKey);
    setError(null);
    setStopping(false);
    if (meta?.improve) {
      setImproveJob(meta.improve);
      setFreshBatch(null);
      // Keep the user on the card they're improving — not at the top of the list.
      window.requestAnimationFrame(() => {
        document
          .querySelector(`[data-logo-asset="${meta.improve!.sourceId}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else if (body.action === "generate") {
      setImproveJob(null);
      setFreshBatch(null);
    }
    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...body }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (controller.signal.aborted) return;
      if (!res.ok) {
        if (data.cancelled || data.error === "Generation stopped.") return;
        throw new Error(data.error ?? "Something went wrong");
      }
      if (typeof data.discarded === "number") setLastDiscarded(data.discarded);
      const ws = data.workspace;
      const next = mapWorkspaceAssets(ws.assets as Record<string, unknown>[]);
      const newIds = next.filter((a) => !priorIds.has(a.id) && a.status !== "discarded").map((a) => a.id);
      setAssets(next);
      if (newIds.length > 0) {
        setFreshBatch({
          newIds,
          mode: meta?.improve ? "improve" : "generate",
          sourceLabel: meta?.improve?.sourceLabel,
          feedback: meta?.improve?.feedback,
        });
        // Improved marks sit under the source — scroll there, not to list top.
        const scrollId = meta?.improve?.sourceId ?? newIds[0];
        window.requestAnimationFrame(() => {
          document
            .querySelector(`[data-logo-asset="${scrollId}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(null);
      setStopping(false);
      setImproveJob(null);
    }
  }

  async function stopGeneration() {
    if (busy !== "generate" || stopping) return;
    setStopping(true);
    try {
      await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", projectId }),
      });
    } catch {
      /* best-effort server cancel */
    }
    abortRef.current?.abort();
    setBusy(null);
    setStopping(false);
    setImproveJob(null);
  }

  if (initialBlocked) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
        {initialBlocked}
      </div>
    );
  }

  return (
    <div>
      {fontLinks.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Logo — “{name}”</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
            You get three proposals, each scored by a skeptical AI critic (scores are advice, not a
            veto). Like a direction but want tweaks? Use{" "}
            <strong className="font-medium text-[var(--foreground)]">Improve with feedback</strong>{" "}
            on that card. When it feels right, choose and{" "}
            <strong className="text-[var(--foreground)]">approve</strong> — only you make it official.
          </p>
        </div>
        <button
          onClick={() => act({ action: "generate" }, "generate")}
          disabled={busy !== null}
          data-faro-anchor="faro-logo-primary"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {isFreshGenerate ? (
            <>
              <FaroBeacon size="sm" /> Designing… takes a minute or two
            </>
          ) : isImproving ? (
            <>
              <FaroBeacon size="sm" /> Improving a proposal…
            </>
          ) : (
            <>
              <Sparkles size={15} /> {live.length ? "Generate more candidates" : "Generate 3 candidates"}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      {lastDiscarded > 0 && !approved && (
        <p className="mb-6 text-xs text-[var(--subtle)]">
          The critic flagged {lastDiscarded} of these as weak — still shown so you can judge; open
          scores on a card for details.
        </p>
      )}

      {freshBatch && freshBatch.newIds.length > 0 && busy !== "generate" && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--accent)]/35 bg-[var(--accent)]/8 px-4 py-3.5 text-sm">
          <div className="min-w-0">
            {freshBatch.mode === "improve" ? (
              <>
                <p className="font-medium text-[var(--foreground)]">
                  {freshBatch.newIds.length} improved version
                  {freshBatch.newIds.length === 1 ? "" : "s"} of “{freshBatch.sourceLabel}”
                </p>
                <p className="mt-1 text-[var(--muted)]">
                  They sit <strong className="font-medium text-[var(--foreground)]">under that proposal</strong>
                  {freshBatch.feedback
                    ? " — steered by your feedback"
                    : " — refined from the same direction"}
                  . Highlighted cards are the new ones.
                </p>
                {freshBatch.feedback ? (
                  <p className="mt-2 text-xs italic text-[var(--subtle)]">
                    Your notes: “{freshBatch.feedback.length > 160
                      ? `${freshBatch.feedback.slice(0, 160)}…`
                      : freshBatch.feedback}”
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="font-medium text-[var(--foreground)]">
                  {freshBatch.newIds.length} new candidate
                  {freshBatch.newIds.length === 1 ? "" : "s"} ready
                </p>
                <p className="mt-1 text-[var(--muted)]">
                  Review them below — pick a direction, then approve when it feels right.
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFreshBatch(null)}
            className="shrink-0 text-xs text-[var(--subtle)] underline-offset-2 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {live.length > 0 && !approved && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3.5 text-sm leading-relaxed text-[var(--muted)]">
          <p className="font-medium text-[var(--foreground)]">A note on these logo proposals</p>
          <p className="mt-1.5">
            This app is strongest at building a full strategy and design system. Treat these logos as a{" "}
            <strong className="font-medium text-[var(--foreground)]">solid baseline to brief a designer</strong>
            — a starting mark to refine with a human, not a finished brand identity. As stronger
            design AI arrives, this workshop will get more capable; until then, use them as direction,
            not the final word.
          </p>
        </div>
      )}

      {approved && (
        <div
          ref={nextCtaRef}
          className="mb-8 rounded-2xl border border-[var(--accent)]/35 bg-[var(--accent)]/5 p-5 sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ok)]">
                <BadgeCheck size={16} /> Logo approved — “{approved.label}”
              </div>
              <p className="mt-1.5 max-w-xl text-sm text-[var(--muted)]">
                Next: Design Studio builds color, type, components, and mockups around this mark. It
                will not invent a new logo.
              </p>
            </div>
            <Link
              href={`/projects/${projectId}/design`}
              data-faro-anchor="faro-logo-continue"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
            >
              Continue to Design Studio <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {live.length === 0 && !busy && (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
          No candidates yet. Generate the first three — each is designed from your strategy, scored
          against it, and shown with its critique.
        </div>
      )}

      {/* Fresh generate only — improve progress lives under the source card. */}
      {isFreshGenerate && (
        <GenerationProgress
          mode="generate"
          onCancel={() => void stopGeneration()}
          cancelling={stopping}
        />
      )}

      {isImproving && improveJob && (
        <div className="mb-4 sticky top-2 z-10 rounded-2xl border border-[var(--accent)]/40 bg-[var(--background)]/95 px-4 py-3 shadow-sm backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5 text-sm">
              <FaroBeacon size="sm" className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-[var(--foreground)]">
                  Improving “{improveJob.sourceLabel}”…
                </p>
                <p className="mt-0.5 text-[var(--muted)]">
                  Stay on this card — three refined versions will appear right underneath it
                  {improveJob.feedback ? ", using your feedback" : ""}.
                </p>
                {improveJob.feedback ? (
                  <p className="mt-1.5 text-xs italic text-[var(--subtle)]">
                    “{improveJob.feedback.length > 140
                      ? `${improveJob.feedback.slice(0, 140)}…`
                      : improveJob.feedback}”
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void stopGeneration()}
              disabled={stopping}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {stopping ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Stopping…
                </>
              ) : (
                <>
                  <Square size={10} fill="currentColor" /> Stop
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {live.map((a) => (
          <div key={a.id} data-logo-asset={a.id}>
            <CandidateCard
              projectId={projectId}
              asset={a}
              name={name ?? ""}
              busy={busy}
              hasApproved={Boolean(approved)}
              isNew={Boolean(freshBatch?.newIds.includes(a.id))}
              isSourceImproving={isImproving && improveJob?.sourceId === a.id}
              onChoose={() => act({ action: "choose", assetId: a.id }, a.id)}
              onApprove={() => act({ action: "approve", assetId: a.id }, a.id)}
              onRevoke={() => act({ action: "revoke-approval", assetId: a.id }, a.id)}
              onImprove={(feedback) =>
                act(
                  {
                    action: "variations",
                    assetId: a.id,
                    ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
                  },
                  "generate",
                  {
                    improve: {
                      sourceId: a.id,
                      sourceLabel: a.label,
                      feedback: feedback.trim(),
                    },
                  }
                )
              }
              onDiscard={() => act({ action: "discard", assetId: a.id }, a.id)}
            />
            {isImproving && improveJob?.sourceId === a.id && (
              <ImproveInlineProgress
                sourceLabel={improveJob.sourceLabel}
                feedback={improveJob.feedback}
                onCancel={() => void stopGeneration()}
                cancelling={stopping}
              />
            )}
          </div>
        ))}
      </div>

      {discarded.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-xs text-[var(--subtle)]">
            Discarded ({discarded.length}) — failed the critic or dismissed by you
          </summary>
          <div className="mt-3 flex flex-wrap gap-4 opacity-50">
            {discarded.map((a) => (
              <div key={a.id} className="w-40">
                <div
                  className="rounded-lg border border-[var(--border)] bg-white p-3 [&_svg]:h-10 [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: a.payload.svg ?? "" }}
                />
                <p className="mt-1 text-xs text-[var(--subtle)]">{a.label}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Always-visible next step after approval — user is often mid-list when they approve. */}
      {approved && (
        <div className="sticky bottom-0 z-20 -mx-5 mt-10 border-t border-[var(--border)] bg-[var(--background)]/95 px-5 py-4 backdrop-blur-md lg:-mx-12 lg:px-12">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm">
              <span className="font-medium text-[var(--ok)]">Logo ready</span>
              <span className="text-[var(--muted)]">
                {" "}
                — “{approved.label}” is approved. Continue when you are.
              </span>
            </div>
            <Link
              href={`/projects/${projectId}/design`}
              data-faro-anchor="faro-logo-continue"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--accent-hover)]"
            >
              Continue to Design Studio <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Progress block under the source card while improve-with-feedback runs.
function ImproveInlineProgress({
  sourceLabel,
  feedback,
  onCancel,
  cancelling,
}: {
  sourceLabel: string;
  feedback: string;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [peakPct, setPeakPct] = useState(2);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const rawPct = timeBasedPercent(elapsed, 130);
  useEffect(() => {
    setPeakPct((p) => Math.max(p, rawPct));
  }, [rawPct]);
  const pct = Math.max(peakPct, rawPct);
  const stages = stageStatus(LOGO_STAGES, pct / 100);
  const stage =
    stages.find((s) => s.state === "active")?.label ??
    `Designing 3 refinements of “${sourceLabel}”…`;
  return (
    <div className="mt-3 space-y-4 rounded-2xl border border-dashed border-[var(--accent)]/40 bg-[var(--accent)]/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FaroLoaderInline label={stage} size="sm" />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {cancelling ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Stopping…
              </>
            ) : (
              <>
                <Square size={10} fill="currentColor" /> Stop
              </>
            )}
          </button>
        )}
      </div>
      {feedback ? (
        <p className="text-xs text-[var(--muted)]">
          Applying: <span className="italic text-[var(--foreground)]">“{feedback}”</span>
        </p>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          No free-text notes — refining weight, spacing, and craft of this direction.
        </p>
      )}
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="mb-3 h-4 w-24 rounded bg-[var(--surface-2)]" />
            <div className="h-20 rounded-lg bg-[var(--surface-2)]" />
            <p className="mt-2 text-[10px] text-[var(--subtle)]">Version {i + 1} of 3…</p>
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] text-[var(--subtle)]">
        New proposals will land here — not at the top of the list.
      </p>
    </div>
  );
}

// The 2-minute generation wait, narrated: skeleton cards plus estimated %.
function GenerationProgress({
  mode = "generate",
  onCancel,
  cancelling,
}: {
  mode?: "generate" | "improve";
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [peakPct, setPeakPct] = useState(2);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // One-shot logo+critic call (~2 min). Monotonic soft estimate — never sawtooths.
  const estimateSec = mode === "improve" ? 130 : 120;
  const rawPct = timeBasedPercent(elapsed, estimateSec);
  useEffect(() => {
    setPeakPct((p) => Math.max(p, rawPct));
  }, [rawPct]);
  const pct = Math.max(peakPct, rawPct);
  const progress01 = pct / 100;
  const stages = stageStatus(LOGO_STAGES, progress01);
  const activeLabel =
    stages.find((s) => s.state === "active")?.label ??
    (mode === "improve" ? "Improving your mark…" : "Designing logo candidates…");

  return (
    <div className="mb-6 space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow">
      <div className="flex flex-col items-center text-center">
        <FaroBeacon size="xl" />
        <p className="mt-4 text-sm font-medium text-[var(--foreground)]">{activeLabel}</p>
        <p className="mt-1 text-xs text-[var(--subtle)]">
          {mode === "improve"
            ? "Three refined versions, then a quick score against your brief."
            : "Three candidates from your strategy, then a skeptical score."}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Logo generation progress"
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--foreground)]" aria-live="polite">
          {pct}%
        </span>
      </div>

      <ol className="space-y-2.5">
        {stages.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 text-sm">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                s.state === "done"
                  ? "bg-[var(--accent)] text-white"
                  : s.state === "active"
                    ? "border border-[var(--accent)] text-[var(--accent)]"
                    : "border border-[var(--border-strong)] text-[var(--subtle)]"
              }`}
            >
              {s.state === "done" ? (
                <Check size={13} />
              ) : s.state === "active" ? (
                <span className="faro-generation-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={
                s.state === "active"
                  ? "font-medium"
                  : s.state === "pending"
                    ? "text-[var(--muted)]"
                    : ""
              }
            >
              {mode === "improve" && s.id === "design"
                ? "Designing refined versions"
                : s.label}
            </span>
          </li>
        ))}
      </ol>

      {onCancel && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            {cancelling ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Stopping…
              </>
            ) : (
              <>
                <Square size={12} fill="currentColor" /> Stop generation
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// The mark dropped into real surfaces — a decision aid, not decoration.
function ContextStrip({ svg, svgDark, name }: { svg: string; svgDark: string; name: string }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
        In context
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-white p-3">
          <div className="flex items-end">
            <div className="flex max-w-full items-center gap-1.5 rounded-t-md border border-b-0 border-[#D8D2C4] bg-[#EFEAE0] px-2.5 py-1.5">
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <span className="truncate text-[10px] text-[#555]">{name}</span>
              <span className="text-[10px] text-[#AAA]">×</span>
            </div>
          </div>
          <div className="rounded-b-md border border-[#D8D2C4] bg-white px-2.5 py-1 text-[9px] text-[#999]">
            {name.toLowerCase().replace(/\s+/g, "")}.com
          </div>
          <p className="mt-2 text-[10px] text-[var(--subtle)]">Browser tab · favicon at 16 px</p>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-white p-3">
          <div className="w-32 rounded-2xl bg-[#0E1B2A] px-3 pb-5 pt-2">
            <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-white/20" />
            <div
              className="flex justify-center [&_svg]:h-5 [&_svg]:w-auto [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svgDark }}
            />
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 rounded bg-white/10" />
              <div className="h-1.5 w-4/5 rounded bg-white/10" />
              <div className="h-1.5 w-3/5 rounded bg-white/10" />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[var(--subtle)]">App header · dark</p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-white p-3">
          <div className="flex aspect-[7/4] w-full max-w-[180px] flex-col justify-between rounded-lg border border-[#E2DCCE] bg-[#F5F1E8] p-3 shadow-sm">
            <div
              className="[&_svg]:h-6 [&_svg]:w-auto [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <div className="space-y-1">
              <div className="h-1 w-16 rounded bg-[#0E1B2A]/30" />
              <div className="h-1 w-10 rounded bg-[#0E1B2A]/20" />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[var(--subtle)]">Business card</p>
        </div>
      </div>
    </div>
  );
}

function CandidateCard({
  projectId,
  asset,
  name,
  busy,
  hasApproved,
  isNew = false,
  isSourceImproving = false,
  onChoose,
  onApprove,
  onRevoke,
  onImprove,
  onDiscard,
}: {
  projectId: string;
  asset: WorkspaceAsset;
  name: string;
  busy: string | null;
  hasApproved: boolean;
  isNew?: boolean;
  isSourceImproving?: boolean;
  onChoose: () => void;
  onApprove: () => void;
  onRevoke: () => void;
  onImprove: (feedback: string) => void;
  onDiscard: () => void;
}) {
  const [showScores, setShowScores] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const isBusy = busy === asset.id;
  const generating = busy === "generate";
  const svg = asset.payload.svg ?? "";
  const svgDark = asset.payload.svgOnDark ?? svg;
  const critique = asset.scores.find((s) => s.key === "summary")?.notes;
  const canImprove = asset.status !== "approved" && !generating;

  function toggleChip(chip: string) {
    setChips((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));
  }

  function buildFeedback(): string {
    const parts = [...chips];
    const note = feedbackText.trim();
    if (note) parts.push(note);
    return parts.join(". ");
  }

  function submitImprove() {
    onImprove(buildFeedback());
    setFeedbackOpen(false);
  }

  const chip =
    asset.status === "approved"
      ? "border-[var(--ok)]/50 text-[var(--ok)]"
      : asset.verdict === "pass"
        ? "border-[var(--ok)]/50 text-[var(--ok)]"
        : "border-[var(--border-strong)] text-[var(--muted)]";

  return (
    <div
      className={`rounded-2xl border bg-[var(--surface)] p-6 transition ${
        isSourceImproving
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25"
          : isNew
            ? "border-[var(--accent)]/50 ring-1 ring-[var(--accent)]/20"
            : asset.status === "approved"
              ? "border-[var(--ok)]/60"
              : asset.status === "chosen"
                ? "border-[var(--accent)]/60"
                : "border-[var(--border)]"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-serif text-lg font-semibold tracking-tight">{asset.label}</h2>
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${chip}`}>
            {asset.status === "approved" ? "approved" : (asset.verdict ?? "unscored")}
          </span>
          {asset.status === "chosen" && (
            <span className="rounded-full border border-[var(--accent)]/50 px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent)]">
              your pick
            </span>
          )}
          {isNew && (
            <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[11px] font-semibold text-white">
              New
            </span>
          )}
          {asset.refinedFromLabel && (
            <span className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] text-[var(--muted)]">
              Improved from “{asset.refinedFromLabel}”
            </span>
          )}
          {isSourceImproving && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent)]">
              <Loader2 size={11} className="animate-spin" /> Improving…
            </span>
          )}
        </div>
        {asset.status !== "approved" && (
          <button
            onClick={onDiscard}
            disabled={isBusy}
            title="Discard this candidate"
            className="text-[var(--subtle)] transition hover:text-[var(--danger)]"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {asset.direction && <p className="mb-2 max-w-3xl text-sm text-[var(--muted)]">{asset.direction}</p>}
      {critique && (
        <p className="mb-4 max-w-3xl text-sm italic text-[var(--subtle)]">Critic: “{critique}”</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div
          className="flex items-center justify-center rounded-xl border border-[var(--border)] p-6 [&_svg]:max-h-20 [&_svg]:w-full"
          style={{ background: "#F5F1E8" }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div
          className="flex items-center justify-center rounded-xl p-6 [&_svg]:max-h-20 [&_svg]:w-full"
          style={{ background: "#0E1B2A" }}
          dangerouslySetInnerHTML={{ __html: svgDark }}
        />
        <div
          className="flex items-center justify-center rounded-xl border border-[var(--border)] p-6 [&_svg]:h-5 [&_svg]:w-auto [&_svg]:max-w-full"
          style={{ background: "#FFFFFF" }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {(asset.status === "chosen" || asset.status === "approved") && (
        <ContextStrip svg={svg} svgDark={svgDark} name={name} />
      )}

      {asset.scores.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowScores(!showScores)}
            className="text-xs text-[var(--subtle)] underline-offset-2 hover:underline"
          >
            {showScores ? "Hide critique" : "Show the critic's scores"}
          </button>
          {showScores && (
            <table className="mt-2 w-full text-sm">
              <tbody>
                {asset.scores.map((s) => (
                  <tr key={s.key} className="border-t border-[var(--border)]">
                    <td className="py-1.5 pr-3 text-[var(--muted)]">{s.label}</td>
                    <td
                      className={`py-1.5 pr-3 font-medium ${
                        s.result === "pass"
                          ? "text-[var(--ok)]"
                          : s.result === "fail"
                            ? "text-[var(--danger)]"
                            : "text-[var(--muted)]"
                      }`}
                    >
                      {s.result}
                    </td>
                    <td className="py-1.5 text-[var(--subtle)]">{s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {asset.status === "candidate" && (
          <>
            <button
              onClick={onChoose}
              disabled={isBusy || generating}
              className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
            >
              Choose this direction
            </button>
            <button
              type="button"
              onClick={() => setFeedbackOpen((o) => !o)}
              disabled={!canImprove || isBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
            >
              <MessageSquarePlus size={15} />
              {feedbackOpen ? "Hide feedback" : "Improve with feedback"}
            </button>
            {/* Approval is always visible so the human gate is never a surprise —
                just disabled until this candidate is the chosen direction. */}
            <button
              disabled
              title="Choose this direction first — then you can approve it"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white opacity-35"
            >
              <BadgeCheck size={16} /> Approve
            </button>
            <span className="text-xs text-[var(--subtle)]">← choose first, then approve</span>
          </>
        )}
        {asset.status === "chosen" && (
          <>
            <button
              onClick={onApprove}
              disabled={isBusy || generating}
              data-faro-anchor="faro-logo-approve"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              <BadgeCheck size={16} /> Approve — make it official
            </button>
            <button
              type="button"
              onClick={() => setFeedbackOpen((o) => !o)}
              disabled={!canImprove || isBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
            >
              <MessageSquarePlus size={15} />
              {feedbackOpen ? "Hide feedback" : "Improve with feedback"}
            </button>
            <button
              type="button"
              onClick={() => onImprove("")}
              disabled={isBusy || generating}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:opacity-50"
            >
              Quick variations (no notes)
            </button>
          </>
        )}
        {asset.status === "approved" && (
          <>
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ok)]">
              <BadgeCheck size={16} /> Approved by you
              {asset.approvedAt ? ` · ${new Date(asset.approvedAt).toLocaleDateString()}` : ""} — this is
              your logo
            </p>
            <Link
              href={`/projects/${projectId}/design`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
            >
              Next: Design Studio <ArrowRight size={15} />
            </Link>
            <button
              onClick={onRevoke}
              disabled={isBusy}
              className="inline-flex items-center gap-1 text-xs text-[var(--subtle)] underline-offset-2 transition hover:underline"
            >
              <Undo2 size={12} /> Revoke approval
            </button>
          </>
        )}
        {hasApproved && asset.status === "candidate" && (
          <p className="text-xs text-[var(--subtle)]">
            You already approved a logo — approving another replaces it as the choice.
          </p>
        )}
        {isBusy && <Loader2 size={15} className="animate-spin text-[var(--subtle)]" />}
      </div>

      {feedbackOpen && canImprove && (
        <div className="mt-4 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                What should change about this mark?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                Keep the direction you like — describe tweaks (weight, spacing, simplicity, mood).
                Faro generates <strong className="font-medium text-[var(--foreground)]">3 refined versions</strong>{" "}
                of this proposal. Your notes steer the AI; they do not invent a brand-new logo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackOpen(false)}
              className="shrink-0 rounded-full p-1 text-[var(--subtle)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              aria-label="Close feedback"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {FEEDBACK_CHIPS.map((chip) => {
              const on = chips.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleChip(chip)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    on
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
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
            placeholder='e.g. "Keep the geometric M but make the wordmark less condensed, and drop the small accent mark."'
            className="w-full resize-y rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-[var(--accent)]"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-[var(--subtle)]">
              Tip: chips + a short sentence work best. Empty notes still produce variations of this mark.
            </p>
            <button
              type="button"
              onClick={submitImprove}
              disabled={isBusy || generating}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Improving…
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Generate improved versions
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

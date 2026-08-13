"use client";

import { useState } from "react";
import { CalendarDays, Loader2, Lock, Upload } from "lucide-react";
import { FaroLoaderInline } from "@/components/FaroLoader";
import type {
  BrandProfile,
  ContentAssetTag,
  ContentCalendar,
  ContentRawAsset,
  MediaReusePolicy,
  MonthBrief,
} from "@/lib/content-studio/types";
import { BrandProfileStrip } from "@/components/content-studio/BrandProfileStrip";
import { ContentCalendarView } from "@/components/content-studio/ContentCalendarView";
import { StagePageBanner } from "@/components/StagePageBanner";
import { useLocale } from "@/components/LocaleProvider";

const ASSET_TAG_OPTIONS: { id: ContentAssetTag; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "bts", label: "BTS" },
  { id: "product", label: "Product" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "event", label: "Event" },
  { id: "no-ads", label: "No ads" },
];

type Props = {
  mode: "project" | "standalone";
  projectId?: string | null;
  initialBlockedReason?: string | null;
  initialProfileId?: string | null;
  initialProfile?: BrandProfile | null;
  initialAssets?: ContentRawAsset[];
  initialCalendar?: ContentCalendar | null;
};

export function ContentStudioWorkspace({
  mode,
  projectId = null,
  initialBlockedReason = null,
  initialProfileId = null,
  initialProfile = null,
  initialAssets = [],
  initialCalendar = null,
}: Props) {
  const { t } = useLocale();
  const [blockedReason] = useState(initialBlockedReason);
  const [profileId, setProfileId] = useState(initialProfileId);
  const [profile, setProfile] = useState(initialProfile);
  const [assets, setAssets] = useState(initialAssets);
  const [calendar, setCalendar] = useState(initialCalendar);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Non-error progress (never use danger styling). */
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [standaloneName, setStandaloneName] = useState("Untitled");
  const [fileNames, setFileNames] = useState<string[]>([]);

  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  /** Organic: 2 or 3 posts per week across the full month (~9–13 posts). */
  const [postsPerWeek, setPostsPerWeek] = useState<2 | 3>(3);
  /** P4 owner controls */
  const [monthBrief, setMonthBrief] = useState<MonthBrief>({
    goal: "",
    offer: "",
    taboo: "",
    language: "",
    notes: "",
  });
  const [reusePolicy, setReusePolicy] = useState<MediaReusePolicy>("unique-first");
  const [excludeWeakFit, setExcludeWeakFit] = useState(false);
  /** Wizard: lock → media → brief → generate → review */
  type WizardStep = "lock" | "media" | "brief" | "generate" | "review";
  const [step, setStep] = useState<WizardStep>(() => {
    if (initialCalendar?.posts?.length) return "review";
    if (initialProfile) return "media";
    return "lock";
  });

  const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
    { id: "lock", label: "1. Lock brand" },
    { id: "media", label: "2. Media" },
    { id: "brief", label: "3. Brief" },
    { id: "generate", label: "4. Generate" },
    { id: "review", label: "5. Review" },
  ];

  async function lockFromProject() {
    if (!projectId) return;
    setBusy("lock");
    setError(null);
    try {
      const res = await fetch("/api/content-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock-from-project", projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not lock brand profile");
      setProfileId(data.profileId);
      setProfile(data.profile);
      setStep("media");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lock failed");
    } finally {
      setBusy(null);
    }
  }

  async function lockInferred() {
    setBusy("lock");
    setError(null);
    try {
      const res = await fetch("/api/content-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lock-inferred",
          brandName: standaloneName,
          assets: fileNames.map((filename) => ({
            filename,
            mimeType: filename.match(/\.(mp4|mov|webm)$/i)
              ? "video/mp4"
              : filename.match(/\.(png|jpe?g|webp|gif)$/i)
                ? "image/jpeg"
                : "application/octet-stream",
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not infer brand profile");
      setProfileId(data.profileId);
      setProfile(data.profile);
      // refresh assets list from API
      const get = await fetch(`/api/content-studio?profileId=${data.profileId}`);
      const body = await get.json();
      if (get.ok) setAssets(body.assets || []);
      setStep("media");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Infer failed");
    } finally {
      setBusy(null);
    }
  }

  async function registerFiles(list: FileList | null) {
    if (!list?.length) return;
    const names = [...list].map((f) => f.name);
    setFileNames((prev) => [...prev, ...names]);
    if (!profileId) return;
    setBusy("upload");
    setError(null);
    try {
      for (const file of list) {
        const form = new FormData();
        form.set("profileId", profileId);
        form.set("file", file);
        const res = await fetch("/api/content-studio", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        setAssets((prev) => [data.asset, ...prev]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function refreshAssets(pid: string) {
    const get = await fetch(`/api/content-studio?profileId=${encodeURIComponent(pid)}`);
    const body = await get.json();
    if (get.ok) setAssets(body.assets || []);
  }

  async function runAnalyzeMedia() {
    if (!profileId) return;
    setBusy("analyze");
    setError(null);
    try {
      const res = await fetch("/api/content-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze-media", profileId, force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Media analysis failed");
      await refreshAssets(profileId);
      const ff = data.pipeline?.ffmpeg;
      setError(
        null
      );
      if (ff && !ff.available) {
        setError("Photos reviewed. Video needs the design helper’s video tools—check Settings if clips stayed unreviewed.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyze failed");
    } finally {
      setBusy(null);
    }
  }

  async function patchAssetMeta(
    assetId: string,
    patch: { tags?: ContentAssetTag[]; excluded?: boolean; note?: string | null }
  ) {
    if (!profileId) return;
    setBusy(`asset-${assetId}`);
    setError(null);
    try {
      const res = await fetch("/api/content-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-asset-meta",
          profileId,
          assetId,
          ...patch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update asset");
      if (data.asset) {
        setAssets((prev) => prev.map((a) => (a.id === assetId ? data.asset : a)));
      } else {
        await refreshAssets(profileId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Asset update failed");
    } finally {
      setBusy(null);
    }
  }

  async function runGenerate() {
    if (!profileId) return;
    setBusy("generate");
    setError(null);
    setProgressMessage("Writing this month’s plan from your photos…");
    try {
      // Phase 1: Strategy AI — vision cards + full month (2–3×/week) + owner controls
      const res = await fetch("/api/content-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-month",
          profileId,
          year,
          month,
          postsPerWeek,
          monthBrief,
          reusePolicy,
          excludeWeakFit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Month plan failed");
      let cal = data.calendar as ContentCalendar;
      setCalendar(cal);
      await refreshAssets(profileId);

      // Phase 2: Open Design each post (one request each — reliable for ~9–13 posts)
      setBusy("design");
      const posts = cal.posts || [];
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i]!;
        setProgressMessage(`Designing post ${i + 1} of ${posts.length} · ${post.dateIso}…`);
        try {
          const dres = await fetch("/api/content-studio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "design-post",
              profileId,
              postId: post.id,
              calendarId: cal.id,
            }),
          });
          const ddata = await dres.json();
          if (!dres.ok) throw new Error(ddata.error || "Design failed");
          cal = {
            ...cal,
            posts: cal.posts.map((p) =>
              p.id === post.id ? { ...p, variants: ddata.variants } : p
            ),
          };
          setCalendar(cal);
        } catch (de) {
          console.warn("design-post failed", post.id, de);
        }
      }
      setCalendar({ ...cal, status: "ready" });
      setError(null);
      setProgressMessage(null);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setProgressMessage(null);
    } finally {
      setBusy(null);
    }
  }

  if (mode === "project" && blockedReason && !profile) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <Lock className="mx-auto text-[var(--subtle)]" size={28} />
        <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight">{t("stage.content")}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{blockedReason}</p>
        <p className="mt-2 text-xs text-[var(--subtle)]">{t("content.blocked")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 lg:px-12 lg:py-10">
      <StagePageBanner stageId="content" className="mb-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--subtle)]">
          Content Studio
        </p>
        <h1
          className="mt-1 font-serif text-3xl font-medium tracking-tight lg:text-4xl"
          data-faro-anchor="faro-content-primary"
        >
          {t("content.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          {mode === "project" ? t("content.projectBlurb") : t("content.standaloneBlurb")}
        </p>
        {profile ? (
          <nav className="mt-5 flex flex-wrap gap-1.5" aria-label="Content Studio steps">
            {WIZARD_STEPS.filter((s) => s.id !== "lock").map((s) => {
              const active = step === s.id;
              const done =
                (s.id === "media" && ["brief", "generate", "review"].includes(step)) ||
                (s.id === "brief" && ["generate", "review"].includes(step)) ||
                (s.id === "generate" && step === "review") ||
                (s.id === "review" && Boolean(calendar?.posts?.length));
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setStep(s.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : done
                        ? "border-[var(--ok)]/30 bg-[var(--ok)]/10 text-[var(--ok)]"
                        : "border-[var(--border)] text-[var(--subtle)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>
        ) : null}
      </StagePageBanner>

      {error ? (
        <p role="alert" className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {progressMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3"
        >
          <FaroLoaderInline label={progressMessage} size="sm" />
        </div>
      ) : null}

      {!profile ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow">
          {mode === "project" ? (
            <>
              <p className="text-sm text-[var(--muted)]">
                Use this project’s strategy, logo, and look for content planning — then we keep that brand fixed while you build posts.
              </p>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void lockFromProject()}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy === "lock" ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                Use brand from this project
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                Working brand name
                <input
                  value={standaloneName}
                  onChange={(e) => setStandaloneName(e.target.value)}
                  className="mt-1.5 w-full max-w-md rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-6 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]">
                <span className="inline-flex items-center gap-2 font-medium text-[var(--foreground)]">
                  <Upload size={16} /> Select raw photos / videos
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const list = e.target.files;
                    if (!list?.length) return;
                    setFileNames([...list].map((f) => f.name));
                  }}
                />
                {fileNames.length ? (
                  <span className="text-xs">{fileNames.join(", ")}</span>
                ) : (
                  <span className="text-xs">Files stay local for now — we only register names (upload storage later).</span>
                )}
              </label>
              <button
                type="button"
                disabled={busy !== null || !standaloneName.trim()}
                onClick={() => void lockInferred()}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy === "lock" ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                Start with this brand
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <BrandProfileStrip profile={profile} />

          {step === "brief" || step === "generate" ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow">
            <h3 className="font-medium">Month brief</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Optional notes for this month — goals, offer, what to avoid, and language. We treat this as the brief for planning posts.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(
                [
                  ["goal", "Goal", "e.g. Show human side of the studio, soft CTA to book a call"],
                  ["offer", "Offer / soft CTA", "e.g. Free 20-min brand clarity chat"],
                  ["taboo", "Taboo / never say", "e.g. No fake case studies, no political takes"],
                  ["language", "Language / market", "e.g. Spanish (Ecuador), casual"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <label key={key} className="block text-xs font-medium text-[var(--muted)]">
                  {label}
                  <input
                    value={String(monthBrief[key] ?? "")}
                    disabled={busy !== null}
                    placeholder={placeholder}
                    onChange={(e) => setMonthBrief((b) => ({ ...b, [key]: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </label>
              ))}
              <label className="block text-xs font-medium text-[var(--muted)] md:col-span-2">
                Notes
                <textarea
                  value={String(monthBrief.notes ?? "")}
                  disabled={busy !== null}
                  rows={2}
                  placeholder="Anything else the strategist should know…"
                  onChange={(e) => setMonthBrief((b) => ({ ...b, notes: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--field)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>
            {step === "brief" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStep("media")}
                  className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-xs font-medium text-[var(--muted)]"
                >
                  Back to media
                </button>
                <button
                  type="button"
                  onClick={() => setStep("generate")}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white"
                >
                  Next: Generate
                </button>
              </div>
            ) : null}
          </section>
          ) : null}

          {step === "media" || step === "generate" ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow">
            <h3 className="font-medium">Raw media</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Tag each photo, skip anything you don&apos;t want used, then review fit. Skipped files never enter the month plan.
            </p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-2)]">
              <Upload size={15} />
              Add assets
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => void registerFiles(e.target.files)}
              />
            </label>
            <ul className="mt-3 space-y-3">
              {assets.map((a) => {
                const card = a.analysis;
                const meta = a.ownerMeta ?? { tags: [] as ContentAssetTag[], excluded: false };
                const tags = meta.tags ?? [];
                const fitColor =
                  card?.brandFit === "strong"
                    ? "bg-[var(--ok)]/15 text-[var(--ok)]"
                    : card?.brandFit === "moderate"
                      ? "bg-[var(--warn)]/15 text-[var(--warn)]"
                      : card?.brandFit === "weak"
                        ? "bg-[var(--surface-2)] text-[var(--subtle)]"
                        : "bg-[var(--surface-2)] text-[var(--subtle)]";
                return (
                  <li
                    key={a.id}
                    className={`rounded-xl border px-3 py-2.5 text-xs ${
                      meta.excluded
                        ? "border-dashed border-[var(--border)] bg-[var(--surface-2)]/20 opacity-70"
                        : "border-[var(--border)] bg-[var(--surface-2)]/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--foreground)]">{a.filename}</span>
                      <span className="text-[var(--subtle)]">· {a.kind}</span>
                      {card ? (
                        <>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${fitColor}`}>
                            {card.brandFit} fit
                          </span>
                          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                            {card.cluster}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-[var(--subtle)]">not analyzed yet</span>
                      )}
                      <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[var(--muted)]">
                        <input
                          type="checkbox"
                          checked={Boolean(meta.excluded)}
                          disabled={busy !== null}
                          onChange={(e) =>
                            void patchAssetMeta(a.id, {
                              tags,
                              excluded: e.target.checked,
                              note: meta.note ?? null,
                            })
                          }
                        />
                        Exclude from plan
                      </label>
                    </div>
                    {card?.summary ? (
                      <p className="mt-1.5 leading-relaxed text-[var(--muted)]">{card.summary}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ASSET_TAG_OPTIONS.map((t) => {
                        const on = tags.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            disabled={busy !== null}
                            onClick={() => {
                              const next = on
                                ? tags.filter((x) => x !== t.id)
                                : [...tags, t.id];
                              void patchAssetMeta(a.id, {
                                tags: next,
                                excluded: Boolean(meta.excluded),
                                note: meta.note ?? null,
                              });
                            }}
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              on
                                ? "bg-[var(--accent)] text-white"
                                : "border border-[var(--border)] text-[var(--subtle)] hover:bg-[var(--surface-2)]"
                            }`}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
              {!assets.length ? (
                <li className="text-[var(--subtle)]">No assets registered yet.</li>
              ) : null}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy !== null || !profileId || assets.filter((a) => a.storagePath).length === 0}
                onClick={() => void runAnalyzeMedia()}
                data-faro-anchor="faro-content-review"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] disabled:opacity-50"
              >
                {busy === "analyze" ? <Loader2 size={14} className="animate-spin" /> : null}
                Review photos
              </button>
              <span className="self-center text-[10px] text-[var(--subtle)]">
                Ready to use:{" "}
                {assets.filter((a) => a.storagePath && !a.ownerMeta?.excluded).length}
                {excludeWeakFit
                  ? ` · poor fits will be skipped when generating`
                  : ""}
              </span>
            </div>
            {step === "media" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={assets.filter((a) => a.storagePath && !a.ownerMeta?.excluded).length === 0}
                  onClick={() => setStep("brief")}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                >
                  Next: Month brief
                </button>
              </div>
            ) : null}
            {assets.filter((a) => a.storagePath).length === 0 && step === "media" ? (
              <p className="mt-3 text-xs text-[var(--danger)]">
                Upload at least one photo or video to continue.
              </p>
            ) : null}
          </section>
          ) : null}

          {step === "generate" ? (
          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow">
            <h3 className="font-medium">Generate month</h3>
            <p className="text-xs text-[var(--muted)]">
              We plan the month from your photos, then design each post. This can take several minutes.
            </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
              How often
              <select
                value={postsPerWeek}
                disabled={busy !== null}
                onChange={(e) => setPostsPerWeek(Number(e.target.value) === 2 ? 2 : 3)}
                className="rounded-full border border-[var(--border-strong)] bg-[var(--field)] px-3 py-1.5 text-sm text-[var(--foreground)]"
              >
                <option value={2}>2× / week (~9 posts)</option>
                <option value={3}>3× / week (~13 posts)</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
              Photo reuse
              <select
                value={reusePolicy}
                disabled={busy !== null}
                onChange={(e) => setReusePolicy(e.target.value as MediaReusePolicy)}
                className="rounded-full border border-[var(--border-strong)] bg-[var(--field)] px-3 py-1.5 text-sm text-[var(--foreground)]"
              >
                <option value="unique-first">Prefer unused photos first</option>
                <option value="prefer-strong">Prefer best-fit photos</option>
                <option value="rotate">Share photos evenly</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--muted)]">
              <input
                type="checkbox"
                checked={excludeWeakFit}
                disabled={busy !== null}
                onChange={(e) => setExcludeWeakFit(e.target.checked)}
              />
              Skip poor-fit photos
            </label>
            <button
              type="button"
              disabled={
                busy !== null ||
                assets.filter((a) => a.storagePath && !a.ownerMeta?.excluded).length === 0
              }
              onClick={() => void runGenerate()}
              data-faro-anchor="faro-content-generate"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy === "generate" || busy === "design" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CalendarDays size={16} />
              )}
              Build this month’s posts
            </button>
          </div>
            <button
              type="button"
              onClick={() => setStep("brief")}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Back to brief
            </button>
          </div>
          ) : null}

          {step === "review" && calendar ? (
            <ContentCalendarView
              key={calendar.id}
              calendar={calendar}
              onUpdated={setCalendar}
            />
          ) : null}
          {step === "review" && !calendar ? (
            <p className="text-sm text-[var(--muted)]">
              No calendar yet.{" "}
              <button type="button" className="text-[var(--accent)] underline" onClick={() => setStep("generate")}>
                Generate this month
              </button>
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

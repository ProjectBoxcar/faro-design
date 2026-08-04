"use client";

import { useState } from "react";
import { CalendarDays, Loader2, Lock, Upload } from "lucide-react";
import type { BrandProfile, ContentCalendar, ContentRawAsset } from "@/lib/content-studio/types";
import { BrandProfileStrip } from "@/components/content-studio/BrandProfileStrip";
import { ContentCalendarView } from "@/components/content-studio/ContentCalendarView";

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
  const [blockedReason] = useState(initialBlockedReason);
  const [profileId, setProfileId] = useState(initialProfileId);
  const [profile, setProfile] = useState(initialProfile);
  const [assets, setAssets] = useState(initialAssets);
  const [calendar, setCalendar] = useState(initialCalendar);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [standaloneName, setStandaloneName] = useState("Untitled");
  const [fileNames, setFileNames] = useState<string[]>([]);

  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);

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

  async function runGenerate() {
    if (!profileId) return;
    setBusy("generate");
    setError(null);
    try {
      const res = await fetch("/api/content-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-month",
          profileId,
          year,
          month,
          postsPerWeek: 4,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setCalendar(data.calendar);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(null);
    }
  }

  if (mode === "project" && blockedReason && !profile) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <Lock className="mx-auto text-[var(--subtle)]" size={28} />
        <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight">Content Studio</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{blockedReason}</p>
        <p className="mt-2 text-xs text-[var(--subtle)]">
          Finish Logo Workshop and Design Studio finals first — Content Studio uses your locked brand package.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 lg:px-12 lg:py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--subtle)]">
          Content Studio
        </p>
        <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight lg:text-4xl">
          Monthly social content
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          {mode === "project"
            ? "Uses this project’s finished brand (strategy, logo, visual system) as a locked profile — then builds a content calendar from your raw media."
            : "No FARO brand package yet — upload footage, lock an inferred starter profile, then generate the same calendar output."}
        </p>
      </header>

      {error ? (
        <p role="alert" className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      {!profile ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow">
          {mode === "project" ? (
            <>
              <p className="text-sm text-[var(--muted)]">
                Pull strategy tone, logo, and visual signals from this completed project and lock them for content generation.
              </p>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void lockFromProject()}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy === "lock" ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                Lock brand profile from project
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
                Infer &amp; lock starter profile
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <BrandProfileStrip profile={profile} />

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 card-shadow">
            <h3 className="font-medium">Raw media</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Upload photos and video. Strategy AI writes copy, hashtags, channels, and dimensions;
              Open Design builds the post visuals from your media + locked brand.
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
            <ul className="mt-3 space-y-1 text-xs text-[var(--subtle)]">
              {assets.map((a) => (
                <li key={a.id}>
                  {a.filename} · {a.kind}
                </li>
              ))}
              {!assets.length ? <li>No assets registered yet.</li> : null}
            </ul>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy !== null || assets.filter((a) => a.storagePath).length === 0}
              onClick={() => void runGenerate()}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy === "generate" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CalendarDays size={16} />
              )}
              Generate month ({year}-{String(month).padStart(2, "0")})
            </button>
            <span className="text-xs text-[var(--subtle)]">
              Strategy AI (copy · hashtags · channels · sizes) + Open Design (visuals) · may take several minutes
            </span>
          </div>
          {busy === "generate" ? (
            <p className="text-xs text-[var(--muted)]">
              Planning the month with Strategy AI, then rendering each post in Open Design…
            </p>
          ) : null}
          {assets.filter((a) => a.storagePath).length === 0 ? (
            <p className="text-xs text-[var(--danger)]">Upload or import at least one photo/video first.</p>
          ) : null}

          {calendar ? (
            <ContentCalendarView
              key={calendar.id}
              calendar={calendar}
              onUpdated={setCalendar}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

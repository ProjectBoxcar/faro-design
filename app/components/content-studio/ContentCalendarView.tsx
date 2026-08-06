"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContentCalendar, ContentPost, ContentPostStatus } from "@/lib/content-studio/types";

export function ContentCalendarView({
  calendar: initial,
  onUpdated,
}: {
  calendar: ContentCalendar;
  onUpdated?: (calendar: ContentCalendar) => void;
}) {
  const [calendar, setCalendar] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Remount-equivalent: when parent regenerates, calendar.id changes — resync local state.
  useEffect(() => {
    setCalendar(initial);
  }, [initial.id]);

  const byWeek = useMemo(() => {
    const sorted = [...calendar.posts].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
    const buckets = new Map<string, ContentPost[]>();
    for (const p of sorted) {
      const d = new Date(p.dateIso + "T12:00:00");
      const start = new Date(d);
      start.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday-based week
      const key = start.toISOString().slice(0, 10);
      const list = buckets.get(key) ?? [];
      list.push(p);
      buckets.set(key, list);
    }
    return [...buckets.entries()].map(([start, posts], i) => ({
      label: `Week of ${start}`,
      posts,
      i,
    }));
  }, [calendar.posts]);

  async function patchPost(postId: string, patch: Partial<ContentPost>) {
    setBusyId(postId);
    setError(null);
    try {
      const res = await fetch("/api/content-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-post",
          postId,
          caption: patch.caption,
          hashtags: patch.hashtags,
          status: patch.status as ContentPostStatus | undefined,
          notes: patch.notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update post");
      setCalendar((prev) => {
        const next = {
          ...prev,
          posts: prev.posts.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
        };
        onUpdated?.(next);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  const strategy = calendar.strategy;

  return (
    <div className="space-y-6">
      {strategy ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 card-shadow">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--subtle)]">
            Content strategy
          </p>
          <h3 className="mt-1 font-serif text-xl font-medium tracking-tight">
            {strategy.monthlyTheme}
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {strategy.cadenceLabel} · {strategy.postsPerWeek}× per week · {calendar.posts.length}{" "}
            posts this month
          </p>
          {strategy.goals?.length ? (
            <ul className="mt-3 list-inside list-disc space-y-0.5 text-xs text-[var(--muted)]">
              {strategy.goals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          ) : null}
          {strategy.pillars?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {strategy.pillars.map((p) => (
                <span
                  key={p.name}
                  title={p.description}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] text-[var(--muted)]"
                >
                  {p.name}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 text-[11px] leading-relaxed text-[var(--subtle)] md:grid-cols-2">
            {strategy.channelMix ? (
              <p>
                <span className="font-medium text-[var(--muted)]">Channels · </span>
                {strategy.channelMix}
              </p>
            ) : null}
            {strategy.mediaPlan ? (
              <p>
                <span className="font-medium text-[var(--muted)]">Media · </span>
                {strategy.mediaPlan}
              </p>
            ) : null}
            {strategy.voiceNotes ? (
              <p>
                <span className="font-medium text-[var(--muted)]">Voice · </span>
                {strategy.voiceNotes}
              </p>
            ) : null}
          </div>
          {strategy.weekOutline?.length ? (
            <ol className="mt-4 space-y-1 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted)]">
              {strategy.weekOutline.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ol>
          ) : null}
          {strategy.consistency ? (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2.5 text-[11px]">
              <p className="font-medium text-[var(--muted)]">Media consistency gate</p>
              <p className="mt-0.5 text-[var(--subtle)]">
                {strategy.consistency.repaired} hard-repaired · {strategy.consistency.warnings}{" "}
                warnings · {strategy.consistency.errorsRemaining} remaining
              </p>
              {strategy.consistency.issues?.length ? (
                <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[var(--subtle)]">
                  {strategy.consistency.issues.slice(0, 8).map((iss, i) => (
                    <li key={`${i}-${iss.message.slice(0, 24)}`}>
                      <span className="font-semibold uppercase tracking-wide text-[10px] text-[var(--muted)]">
                        {iss.severity}
                      </span>{" "}
                      {iss.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-serif text-xl font-medium tracking-tight">
            Content calendar · {calendar.year}-{String(calendar.month).padStart(2, "0")}
          </h3>
          <p className="text-xs text-[var(--muted)]">
            {calendar.posts.length} posts across the month · {calendar.status} · edit, approve before export
          </p>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {byWeek.map((week) => (
        <section key={week.label} className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
            {week.label}
          </h4>
          <ul className="grid gap-3 md:grid-cols-2">
            {week.posts.map((post) => (
              <li
                key={post.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 card-shadow"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[var(--muted)]">
                    Day {post.dayIndex} · {post.dateIso}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      post.status === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : post.status === "rejected"
                          ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                          : "bg-[var(--surface-2)] text-[var(--subtle)]"
                    }`}
                  >
                    {post.status}
                  </span>
                </div>
                <textarea
                  className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                  rows={4}
                  defaultValue={post.caption}
                  disabled={busyId === post.id}
                  onBlur={(e) => {
                    if (e.target.value !== post.caption) {
                      void patchPost(post.id, { caption: e.target.value });
                    }
                  }}
                />
                <input
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--field)] px-2 py-1.5 text-[11px] text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                  defaultValue={post.hashtags.join(" ")}
                  disabled={busyId === post.id}
                  onBlur={(e) => {
                    const tags = e.target.value
                      .split(/\s+/)
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((t) => (t.startsWith("#") ? t : `#${t}`));
                    if (tags.join(" ") !== post.hashtags.join(" ")) {
                      void patchPost(post.id, { hashtags: tags });
                    }
                  }}
                />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {post.variants.map((v) => (
                    <span
                      key={v.platform}
                      className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                      title={v.cropHint}
                    >
                      {v.platform} · {v.aspectRatio}
                      {v.cropHint.includes("x") ? ` · ${v.cropHint.split("·").pop()?.trim()}` : ""}
                    </span>
                  ))}
                </div>
                {post.variants.some((v) => v.previewUri) ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {post.variants
                      .filter((v) => v.previewUri)
                      .map((v) => {
                        // Real artboard pixels (must match od-designs PLATFORM_SPECS)
                        const size =
                          v.platform === "tiktok"
                            ? { w: 1080, h: 1920 }
                            : v.platform === "linkedin"
                              ? { w: 1200, h: 627 }
                              : v.aspectRatio === "1:1"
                                ? { w: 1080, h: 1080 }
                                : { w: 1080, h: 1350 };
                        const previewW = 280;
                        const scale = previewW / size.w;
                        const previewH = Math.round(size.h * scale);
                        return (
                          <a
                            key={v.platform + (v.previewUri || "")}
                            href={v.previewUri!}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
                          >
                            <div className="flex items-center justify-between gap-2 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--subtle)]">
                              <span>
                                OD · {v.platform} · {size.w}×{size.h}
                              </span>
                              <span className="normal-case tracking-normal text-[var(--muted)]">
                                Full size ↗
                              </span>
                            </div>
                            <div
                              className="relative mx-auto overflow-hidden bg-[#111]"
                              style={{ width: previewW, height: previewH }}
                            >
                              <iframe
                                title={`${v.platform} ${size.w}x${size.h}`}
                                src={v.previewUri!}
                                className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
                                style={{
                                  width: size.w,
                                  height: size.h,
                                  transform: `scale(${scale})`,
                                  transformOrigin: "top left",
                                }}
                                sandbox="allow-same-origin"
                              />
                            </div>
                          </a>
                        );
                      })}
                  </div>
                ) : null}
                {post.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--subtle)]">
                    {post.notes}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === post.id}
                    onClick={() => void patchPost(post.id, { status: "approved" })}
                    className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === post.id}
                    onClick={() => void patchPost(post.id, { status: "draft" })}
                    className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] disabled:opacity-50"
                  >
                    Keep draft
                  </button>
                  <button
                    type="button"
                    disabled={busyId === post.id}
                    onClick={() => void patchPost(post.id, { status: "rejected" })}
                    className="rounded-full border border-[var(--danger)]/40 px-3 py-1.5 text-xs font-medium text-[var(--danger)] disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

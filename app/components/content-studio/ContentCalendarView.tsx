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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-serif text-xl font-medium tracking-tight">
            Content calendar · {calendar.year}-{String(calendar.month).padStart(2, "0")}
          </h3>
          <p className="text-xs text-[var(--muted)]">
            {calendar.posts.length} posts · status {calendar.status} · edit captions, approve before export
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
                    </span>
                  ))}
                </div>
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

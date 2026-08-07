/**
 * Export approved Content Studio posts as markdown + simple HTML index.
 */
import "server-only";
import { getCalendarWithPosts, getContentProfile, listRawAssets } from "@/lib/content-studio/store";
import type { ContentCalendar, ContentPost } from "@/lib/content-studio/types";

export type ContentExportBundle = {
  filename: string;
  mimeType: string;
  body: string;
};

function postBlock(post: ContentPost, assetName?: string): string {
  const tags = (post.hashtags || []).join(" ");
  const platforms = (post.platforms || []).join(", ");
  return [
    `## Day ${post.dayIndex} · ${post.dateIso}`,
    ``,
    `**Status:** ${post.status}`,
    `**Platforms:** ${platforms || "—"}`,
    assetName ? `**Media:** ${assetName}` : null,
    ``,
    post.caption || "",
    ``,
    tags ? `Hashtags: ${tags}` : null,
    post.notes ? `\n### Notes\n${post.notes}` : null,
    ``,
    `---`,
    ``,
  ]
    .filter((x) => x != null)
    .join("\n");
}

export function buildCalendarMarkdownExport(
  calendar: ContentCalendar,
  opts?: { brandName?: string; onlyApproved?: boolean }
): ContentExportBundle {
  const posts = opts?.onlyApproved
    ? calendar.posts.filter((p) => p.status === "approved")
    : calendar.posts;
  const strategy = calendar.strategy;
  const title = opts?.brandName
    ? `${opts.brandName} · ${calendar.year}-${String(calendar.month).padStart(2, "0")}`
    : `Content calendar ${calendar.year}-${String(calendar.month).padStart(2, "0")}`;

  const lines = [
    `# ${title}`,
    ``,
    strategy?.monthlyTheme ? `**Theme:** ${strategy.monthlyTheme}` : null,
    strategy?.cadenceLabel ? `**Cadence:** ${strategy.cadenceLabel}` : null,
    `**Posts:** ${posts.length}${opts?.onlyApproved ? " (approved only)" : ""}`,
    ``,
  ].filter((x) => x != null);

  if (strategy?.goals?.length) {
    lines.push(`## Goals`, ...strategy.goals.map((g) => `- ${g}`), ``);
  }
  if (strategy?.mediaPlan) {
    lines.push(`## Media plan`, strategy.mediaPlan, ``);
  }

  lines.push(`## Posts`, ``);

  const assets = calendar.profileId ? listRawAssets(calendar.profileId) : [];
  const byId = new Map(assets.map((a) => [a.id, a.filename]));

  for (const p of posts.sort((a, b) => a.dateIso.localeCompare(b.dateIso))) {
    const aid = p.sourceAssetIds?.[0];
    lines.push(postBlock(p, aid ? byId.get(aid) : undefined));
  }

  const body = lines.join("\n");
  const slug = title.replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").slice(0, 60);
  return {
    filename: `${slug || "content-calendar"}.md`,
    mimeType: "text/markdown; charset=utf-8",
    body,
  };
}

export function exportCalendarForProfile(
  profileId: string,
  calendarId: string,
  opts?: { onlyApproved?: boolean }
): ContentExportBundle {
  const cal = getCalendarWithPosts(calendarId);
  if (!cal || cal.profileId !== profileId) {
    throw new Error("Calendar not found for this profile.");
  }
  const profile = getContentProfile(profileId);
  const brandName =
    (profile?.payload as { brandName?: string } | undefined)?.brandName ||
    profile?.brand_name ||
    undefined;
  return buildCalendarMarkdownExport(cal, {
    brandName,
    onlyApproved: opts?.onlyApproved,
  });
}

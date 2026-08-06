/**
 * Pure owner-control helpers for Content Studio (P4).
 * Filter assets, format month brief, reuse policy guidance.
 */
import type {
  AssetOwnerMeta,
  ContentAssetTag,
  ContentRawAsset,
  MediaBrandFit,
  MediaReusePolicy,
  MonthBrief,
} from "@/lib/content-studio/types";
import { isUsableAnalysis, rankAssetIndicesByFit } from "@/lib/content-studio/media-analysis-pure";

export const ALL_ASSET_TAGS: ContentAssetTag[] = [
  "hero",
  "bts",
  "product",
  "lifestyle",
  "event",
  "no-ads",
];

export const DEFAULT_OWNER_META: AssetOwnerMeta = {
  tags: [],
  excluded: false,
  note: null,
};

export function normalizeOwnerMeta(raw: unknown): AssetOwnerMeta {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const tagsRaw = Array.isArray(o.tags) ? o.tags : [];
  const tags = tagsRaw
    .map((t) => String(t).toLowerCase() as ContentAssetTag)
    .filter((t): t is ContentAssetTag => (ALL_ASSET_TAGS as string[]).includes(t));
  const noteRaw = o.note != null ? String(o.note).trim() : "";
  return {
    tags: [...new Set(tags)],
    excluded: Boolean(o.excluded),
    note: noteRaw ? noteRaw.slice(0, 400) : null,
  };
}

export function normalizeMonthBrief(raw: unknown): MonthBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const pick = (k: string) => {
    const v = o[k];
    if (v == null) return null;
    const s = String(v).trim();
    return s ? s.slice(0, 800) : null;
  };
  const brief: MonthBrief = {
    goal: pick("goal"),
    offer: pick("offer"),
    taboo: pick("taboo"),
    language: pick("language"),
    notes: pick("notes"),
  };
  if (!brief.goal && !brief.offer && !brief.taboo && !brief.language && !brief.notes) {
    return null;
  }
  return brief;
}

export function formatMonthBriefForPlan(brief: MonthBrief | null | undefined): string {
  if (!brief) return "";
  const lines = [
    brief.goal ? `Goal: ${brief.goal}` : null,
    brief.offer ? `Offer / soft CTA: ${brief.offer}` : null,
    brief.taboo ? `Taboo / never say: ${brief.taboo}` : null,
    brief.language ? `Language / market: ${brief.language}` : null,
    brief.notes ? `Owner notes: ${brief.notes}` : null,
  ].filter(Boolean);
  if (!lines.length) return "";
  return ["OWNER MONTH BRIEF (source of truth — obey):", ...lines].join("\n");
}

export function formatAssetOwnerLine(asset: ContentRawAsset): string {
  const m = asset.ownerMeta ?? DEFAULT_OWNER_META;
  const parts = [
    m.excluded ? "EXCLUDED" : null,
    m.tags.length ? `tags=${m.tags.join(",")}` : null,
    m.note ? `note=${m.note}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "no owner tags";
}

export type FilterAssetsResult = {
  eligible: ContentRawAsset[];
  droppedExcluded: number;
  droppedWeak: number;
  /** Indices into original list (for debugging) */
  droppedIds: string[];
};

/**
 * Select assets for the month plan under owner controls.
 * Always keeps at least one stored asset if any exist (never empty if inputs had files).
 */
export function filterAssetsForPlan(
  assets: ContentRawAsset[],
  opts?: {
    excludeWeakFit?: boolean;
    /** Minimum fit to keep when excludeWeakFit (default: moderate) */
    minFit?: MediaBrandFit;
  }
): FilterAssetsResult {
  const withFiles = assets.filter((a) => Boolean(a.storagePath));
  const droppedIds: string[] = [];
  let droppedExcluded = 0;
  let droppedWeak = 0;

  let eligible = withFiles.filter((a) => {
    const excluded = a.ownerMeta?.excluded === true;
    if (excluded) {
      droppedExcluded++;
      droppedIds.push(a.id);
      return false;
    }
    return true;
  });

  if (opts?.excludeWeakFit) {
    const before = eligible.length;
    const kept = eligible.filter((a) => {
      const fit = a.analysis?.brandFit ?? "unknown";
      // Drop only explicit weak; keep unknown/moderate/strong
      if (fit === "weak") {
        droppedIds.push(a.id);
        return false;
      }
      return true;
    });
    droppedWeak = before - kept.length;
    // Never empty the library entirely
    if (kept.length > 0) {
      eligible = kept;
    } else {
      droppedWeak = 0;
      // restore non-excluded (including weak) so plan can still run
      eligible = withFiles.filter((a) => !a.ownerMeta?.excluded);
    }
  }

  return { eligible, droppedExcluded, droppedWeak, droppedIds };
}

/** Order asset indices for assignment under reuse policy. */
export function orderAssetsForReuse(
  assets: ContentRawAsset[],
  policy: MediaReusePolicy = "unique-first"
): number[] {
  if (assets.length === 0) return [];
  const cards = assets.map((a) => a.analysis ?? null);
  const byFit = rankAssetIndicesByFit(cards);

  if (policy === "prefer-strong") return byFit;

  if (policy === "unique-first") {
    // Prefer not-yet-analyzed-last? Keep natural order but put strong first among ties
    // Natural index order with light fit bias: unusable analysis last
    return assets
      .map((_, i) => i)
      .sort((a, b) => {
        const ua = isUsableAnalysis(cards[a]) ? 1 : 0;
        const ub = isUsableAnalysis(cards[b]) ? 1 : 0;
        if (ub !== ua) return ub - ua;
        return a - b;
      });
  }

  // rotate: stable 0..n-1
  return assets.map((_, i) => i);
}

export function reusePolicyPromptLine(policy: MediaReusePolicy, assetCount: number, postCount: number): string {
  if (postCount <= assetCount) {
    return `Reuse policy: ${policy} — enough assets (${assetCount}) for ${postCount} posts; prefer unique media when possible.`;
  }
  switch (policy) {
    case "prefer-strong":
      return `Reuse policy: prefer-strong — ${postCount} posts / ${assetCount} assets. Assign strongest brand-fit assets more often; weak only if needed; same photo may recur with a NEW angle/crop, never invent new subjects.`;
    case "unique-first":
      return `Reuse policy: unique-first — cover every eligible asset at least once, then reuse with different pillars/angles (same SEEN subjects).`;
    default:
      return `Reuse policy: rotate — cycle through assets evenly; on reuse change angle/crop/copy, never invent subjects.`;
  }
}

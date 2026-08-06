/**
 * Pure helpers for Content Studio media intelligence (no I/O).
 * Safe for unit tests without server-only / vision APIs.
 */
import type {
  MediaAnalysisCard,
  MediaBrandFit,
  MediaCluster,
  MediaAnalysisStatus,
} from "@/lib/content-studio/types";

const CLUSTERS: MediaCluster[] = [
  "lifestyle",
  "people",
  "place",
  "product",
  "event",
  "pet",
  "process",
  "architecture",
  "food",
  "other",
];

const FITS: MediaBrandFit[] = ["strong", "moderate", "weak", "unknown"];
const STATUSES: MediaAnalysisStatus[] = ["ok", "partial", "unanalyzed", "failed"];

function asStringArray(v: unknown, max = 12): string[] {
  if (!Array.isArray(v)) {
    if (typeof v === "string" && v.trim()) return [v.trim()].slice(0, max);
    return [];
  }
  return v
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
}

function asCluster(v: unknown): MediaCluster {
  const s = String(v || "other").toLowerCase() as MediaCluster;
  return CLUSTERS.includes(s) ? s : "other";
}

function asFit(v: unknown): MediaBrandFit {
  const s = String(v || "unknown").toLowerCase() as MediaBrandFit;
  return FITS.includes(s) ? s : "unknown";
}

function asStatus(v: unknown): MediaAnalysisStatus {
  const s = String(v || "unanalyzed").toLowerCase() as MediaAnalysisStatus;
  return STATUSES.includes(s) ? s : "unanalyzed";
}

function asOrientation(v: unknown): MediaAnalysisCard["orientation"] {
  const s = String(v || "unknown").toLowerCase();
  if (s === "portrait" || s === "landscape" || s === "square") return s;
  return "unknown";
}

/** Normalize arbitrary model/JSON into a MediaAnalysisCard. */
export function normalizeMediaAnalysis(
  raw: unknown,
  fallback?: Partial<MediaAnalysisCard>
): MediaAnalysisCard {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const crop =
    o.cropHints && typeof o.cropHints === "object"
      ? (o.cropHints as Record<string, unknown>)
      : {};

  return {
    status: asStatus(o.status ?? fallback?.status ?? "ok"),
    summary: String(o.summary || fallback?.summary || "No visual summary available.").slice(0, 600),
    subjects: asStringArray(o.subjects ?? fallback?.subjects, 10),
    setting: String(o.setting || fallback?.setting || "").slice(0, 200),
    mood: asStringArray(o.mood ?? fallback?.mood, 8),
    people: Boolean(o.people ?? fallback?.people ?? false),
    facesVisible: Boolean(o.facesVisible ?? fallback?.facesVisible ?? false),
    visibleText: asStringArray(o.visibleText ?? fallback?.visibleText, 12),
    colors: asStringArray(o.colors ?? fallback?.colors, 8),
    orientation: asOrientation(o.orientation ?? fallback?.orientation),
    composition: String(o.composition || fallback?.composition || "").slice(0, 400),
    cropHints: {
      instagram: crop.instagram ? String(crop.instagram).slice(0, 200) : fallback?.cropHints?.instagram,
      tiktok: crop.tiktok ? String(crop.tiktok).slice(0, 200) : fallback?.cropHints?.tiktok,
      linkedin: crop.linkedin ? String(crop.linkedin).slice(0, 200) : fallback?.cropHints?.linkedin,
    },
    contentAngles: asStringArray(o.contentAngles ?? fallback?.contentAngles, 8),
    doNotClaim: asStringArray(o.doNotClaim ?? fallback?.doNotClaim, 10),
    brandFit: asFit(o.brandFit ?? fallback?.brandFit),
    brandFitNotes: String(o.brandFitNotes || fallback?.brandFitNotes || "").slice(0, 300),
    cluster: asCluster(o.cluster ?? fallback?.cluster),
    analyzedAt: String(o.analyzedAt || fallback?.analyzedAt || new Date().toISOString()),
    model: o.model ? String(o.model) : fallback?.model,
    engine: o.engine ? String(o.engine) : fallback?.engine,
  };
}

/** Placeholder when vision cannot run (missing file, API fail, unknown kind). */
export function unanalyzedCard(
  reason: string,
  opts?: { kind?: string; filename?: string; status?: MediaAnalysisStatus }
): MediaAnalysisCard {
  const kind = opts?.kind || "unknown";
  const name = opts?.filename || "asset";
  return normalizeMediaAnalysis({
    status: opts?.status || "unanalyzed",
    summary: `Not visually analyzed (${reason}). File: ${name} (${kind}). Do not invent subjects, places, or process scenes.`,
    subjects: [],
    setting: "unknown",
    mood: [],
    people: false,
    facesVisible: false,
    visibleText: [],
    colors: [],
    orientation: "unknown",
    composition: "Unknown — keep overlays conservative; center-safe type on a scrim.",
    cropHints: {
      instagram: "Center-safe 4:5; avoid edge-critical subject assumptions",
      tiktok: "Center-safe 9:16; leave lower chrome clear",
      linkedin: "Center landscape crop; large type on panel if subject uncertain",
    },
    contentAngles: [
      "Brand-led message with careful photo support only if frame allows",
      "Do not force a specific narrative onto this asset",
    ],
    doNotClaim: [
      "Do not invent what is in the photo or video",
      "Do not claim sketches, strategy sessions, or studio BTS unless analysis confirms them",
      "Do not invent product shots or client work",
    ],
    brandFit: "unknown",
    brandFitNotes: reason,
    cluster: "other",
    analyzedAt: new Date().toISOString(),
  });
}

/** True when a card is good enough to ground strategy (ok or partial with summary). */
export function isUsableAnalysis(card: MediaAnalysisCard | null | undefined): boolean {
  if (!card) return false;
  if (card.status === "ok") return true;
  if (card.status === "partial" && card.summary.length > 20 && card.subjects.length > 0) return true;
  return false;
}

/** Compact block for Strategy AI month plan (one asset). */
export function formatMediaCardForPlan(
  index: number,
  filename: string,
  kind: string,
  card: MediaAnalysisCard | null | undefined
): string {
  const c = card && isUsableAnalysis(card) ? card : unanalyzedCard("missing analysis", { kind, filename });
  const lines = [
    `[${index}] ${filename} (${kind}) · cluster=${c.cluster} · fit=${c.brandFit} · status=${c.status}`,
    `  SEEN: ${c.summary}`,
    c.subjects.length ? `  Subjects: ${c.subjects.join("; ")}` : null,
    c.setting ? `  Setting: ${c.setting}` : null,
    c.mood.length ? `  Mood: ${c.mood.join(", ")}` : null,
    `  People/faces: ${c.people ? "yes" : "no"} / ${c.facesVisible ? "faces visible" : "no faces"}`,
    c.visibleText.length ? `  Visible text: ${c.visibleText.join(" | ")}` : null,
    c.composition ? `  Composition: ${c.composition}` : null,
    c.contentAngles.length ? `  Honest angles: ${c.contentAngles.join(" · ")}` : null,
    c.doNotClaim.length ? `  DO NOT CLAIM: ${c.doNotClaim.join(" · ")}` : null,
    c.brandFitNotes ? `  Brand-fit notes: ${c.brandFitNotes}` : null,
    c.cropHints.instagram ? `  Crop IG: ${c.cropHints.instagram}` : null,
    c.cropHints.tiktok ? `  Crop TT: ${c.cropHints.tiktok}` : null,
    c.cropHints.linkedin ? `  Crop LI: ${c.cropHints.linkedin}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

export type MediaConsistencyIssue = {
  postIndex: number;
  severity: "error" | "warn";
  code: "missing_analysis" | "invented_process" | "weak_as_proof" | "subject_mismatch";
  message: string;
};

/** Patterns that invent studio/process content not visible in lifestyle media. */
export const INVENTED_PROCESS_RE =
  /\b(sketch(?:es|ing)?|wireframe|moodboard|strategy session|whiteboard|figma|mockup deck|logo draft|studio desk|behind the scenes of branding|work[- ]in[- ]progress notes|design process bts)\b/i;

/** Positive portfolio claims (not “not a case study” denials). */
export const WEAK_AS_PROOF_RE =
  /(?<!not (?:a |our |the )?)(?<!no )\b(proof|case study|client win|delivered package|our rebrand for|portfolio piece)\b/i;

/**
 * Lightweight consistency checks: caption/art direction must not invent
 * process/studio scenes when the media card forbids them.
 */
export function validatePostsAgainstMedia(input: {
  posts: {
    caption: string;
    creativeDirection: string;
    theme: string;
    hook?: string;
    sourceAssetIndex: number;
  }[];
  cards: (MediaAnalysisCard | null | undefined)[];
}): MediaConsistencyIssue[] {
  const issues: MediaConsistencyIssue[] = [];

  input.posts.forEach((post, i) => {
    const card = input.cards[post.sourceAssetIndex];
    if (!card || !isUsableAnalysis(card)) {
      issues.push({
        postIndex: i,
        severity: "warn",
        code: "missing_analysis",
        message: `Post ${i + 1}: media index ${post.sourceAssetIndex} has weak/missing analysis — treat claims conservatively.`,
      });
      return;
    }

    // Invent checks on owner-facing copy only — art direction may say "do not invent sketches"
    const copyBlob = `${post.caption}\n${post.theme}\n${post.hook || ""}`;
    const artBlob = post.creativeDirection || "";
    const forbiddenHit =
      INVENTED_PROCESS_RE.test(copyBlob) ||
      // Art direction invents when it *describes* showing sketches as the visual, not forbidding them
      (/\b(show|use|include|feature)\b.{0,40}\b(sketch|whiteboard|moodboard|figma)\b/i.test(artBlob) &&
        !/\b(do not|don't|never|avoid)\b/i.test(artBlob));
    const forbidsProcess = card.doNotClaim.some((d) =>
      /sketch|process|studio|bts|session|mockup|logo|whiteboard/i.test(d)
    );
    const isProcessCluster = card.cluster === "process";
    const lifestyleClusters = new Set([
      "pet",
      "place",
      "event",
      "food",
      "people",
      "lifestyle",
      "architecture",
    ]);

    if (
      forbiddenHit &&
      !isProcessCluster &&
      (forbidsProcess || lifestyleClusters.has(card.cluster) || card.brandFit === "weak")
    ) {
      issues.push({
        postIndex: i,
        severity: "error",
        code: "invented_process",
        message: `Post ${i + 1}: copy/art direction invents studio/process scenes that media card does not support (cluster=${card.cluster}: ${card.summary.slice(0, 80)}).`,
      });
    }

    if (card.brandFit === "weak" && WEAK_AS_PROOF_RE.test(copyBlob)) {
      issues.push({
        postIndex: i,
        severity: "error",
        code: "weak_as_proof",
        message: `Post ${i + 1}: weak brand-fit asset sold as proof/case study — not allowed.`,
      });
    } else if (card.brandFit === "moderate" && WEAK_AS_PROOF_RE.test(copyBlob)) {
      issues.push({
        postIndex: i,
        severity: "warn",
        code: "weak_as_proof",
        message: `Post ${i + 1}: moderate-fit asset used as hard proof — soften claims.`,
      });
    }
  });

  return issues;
}

export type GroundedCopy = {
  caption: string;
  hook: string;
  theme: string;
  creativeDirection: string;
};

/** Deterministic media-grounded copy when AI invents unsupported scenes (P2 hard gate). */
export function buildMediaGroundedCopy(
  brandName: string,
  card: MediaAnalysisCard
): GroundedCopy {
  const subjectLine =
    card.subjects.length > 0
      ? card.subjects.slice(0, 4).join(", ")
      : card.summary.slice(0, 100);
  const angle =
    card.contentAngles[0] ||
    "An honest frame from the week — no invented process, no fake client story.";
  const hook =
    card.cluster === "pet"
      ? `Real life, not a set: ${subjectLine}.`
      : card.cluster === "food"
        ? `Not a shoot. Just ${subjectLine}.`
        : card.cluster === "people" || card.cluster === "event"
          ? `A real moment: ${subjectLine}.`
          : card.summary.split(/[.!?]/)[0]?.trim().slice(0, 160) || subjectLine;

  const softBridge =
    card.brandFit === "weak" || card.brandFit === "unknown"
      ? `${brandName} stays honest about the work — and about downtime. This photo is what it is; we are not dressing it up as finished client work.`
      : `${brandName}: ${angle}`;

  const caption = [hook, "", softBridge, "", card.summary].join("\n").slice(0, 900);

  const creativeDirection = [
    `Use ONLY what is seen: ${card.summary}`,
    card.composition ? `Composition: ${card.composition}` : null,
    card.cropHints.instagram ? `IG: ${card.cropHints.instagram}` : null,
    card.cropHints.tiktok ? `TT: ${card.cropHints.tiktok}` : null,
    card.doNotClaim.length
      ? `Never show/claim: ${card.doNotClaim.slice(0, 4).join("; ")}`
      : "Do not invent studio process or subjects not in the frame.",
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 500);

  return {
    caption,
    hook: hook.slice(0, 200),
    theme: `${card.cluster} · media-grounded`.slice(0, 120),
    creativeDirection,
  };
}

export type EnforceConsistencyResult<T extends {
  caption: string;
  creativeDirection: string;
  theme: string;
  hook: string;
  sourceAssetIndex: number;
}> = {
  posts: T[];
  issues: MediaConsistencyIssue[];
  repaired: number;
  errorsRemaining: number;
};

/**
 * P2 hard gate: validate, then replace caption/hook/theme/art direction for error posts
 * with deterministic media-grounded copy. Re-validates once.
 */
export function enforceMediaConsistency<
  T extends {
    caption: string;
    creativeDirection: string;
    theme: string;
    hook: string;
    sourceAssetIndex: number;
  },
>(input: {
  posts: T[];
  cards: (MediaAnalysisCard | null | undefined)[];
  brandName: string;
}): EnforceConsistencyResult<T> {
  const issues = validatePostsAgainstMedia({ posts: input.posts, cards: input.cards });
  const posts = input.posts.map((p) => ({ ...p }));
  let repaired = 0;

  for (const issue of issues.filter((i) => i.severity === "error")) {
    const p = posts[issue.postIndex];
    if (!p) continue;
    const card = input.cards[p.sourceAssetIndex];
    if (!card || !isUsableAnalysis(card)) continue;
    const grounded = buildMediaGroundedCopy(input.brandName, card);
    posts[issue.postIndex] = {
      ...p,
      caption: grounded.caption,
      hook: grounded.hook,
      theme: grounded.theme,
      creativeDirection: grounded.creativeDirection,
    };
    repaired++;
  }

  // Soft-warn posts: still tighten art direction only
  for (const issue of issues.filter((i) => i.severity === "warn" && i.code !== "missing_analysis")) {
    const p = posts[issue.postIndex];
    if (!p) continue;
    const card = input.cards[p.sourceAssetIndex];
    if (!card || !isUsableAnalysis(card)) continue;
    if (!/use only what is seen/i.test(p.creativeDirection)) {
      p.creativeDirection = [
        `Use ONLY what is seen: ${card.summary}`,
        p.creativeDirection,
      ]
        .join(" · ")
        .slice(0, 500);
    }
  }

  const after = validatePostsAgainstMedia({ posts, cards: input.cards });
  const errorsRemaining = after.filter((i) => i.severity === "error").length;

  return {
    posts,
    issues: [...issues, ...after.filter((a) => a.severity === "error")],
    repaired,
    errorsRemaining,
  };
}

/** Prefer stronger brand-fit assets when rotating coverage. */
export function rankAssetIndicesByFit(
  cards: (MediaAnalysisCard | null | undefined)[]
): number[] {
  const score = (c: MediaAnalysisCard | null | undefined): number => {
    if (!c) return 0;
    const fit =
      c.brandFit === "strong" ? 40 : c.brandFit === "moderate" ? 25 : c.brandFit === "weak" ? 5 : 10;
    const usable = isUsableAnalysis(c) ? 20 : 0;
    const subjects = Math.min(10, c.subjects.length * 2);
    return fit + usable + subjects;
  };
  return cards
    .map((_, i) => i)
    .sort((a, b) => score(cards[b]) - score(cards[a]) || a - b);
}

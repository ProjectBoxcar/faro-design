import { describe, expect, it } from "vitest";
import {
  filterAssetsForPlan,
  formatMonthBriefForPlan,
  normalizeMonthBrief,
  normalizeOwnerMeta,
  orderAssetsForReuse,
  reusePolicyPromptLine,
} from "@/lib/content-studio/owner-controls-pure";
import type { ContentRawAsset } from "@/lib/content-studio/types";
import { normalizeMediaAnalysis } from "@/lib/content-studio/media-analysis-pure";

function asset(
  id: string,
  opts: {
    excluded?: boolean;
    tags?: string[];
    fit?: "strong" | "moderate" | "weak" | "unknown";
    path?: string | null;
  } = {}
): ContentRawAsset {
  return {
    id,
    profileId: "p",
    filename: `${id}.jpg`,
    mimeType: "image/jpeg",
    kind: "image",
    storagePath: opts.path === null ? null : opts.path ?? `content-studio/x/${id}.jpg`,
    createdAt: new Date().toISOString(),
    ownerMeta: normalizeOwnerMeta({
      excluded: opts.excluded,
      tags: opts.tags,
    }),
    analysis: normalizeMediaAnalysis({
      summary: `Subject for ${id}`,
      subjects: [id],
      brandFit: opts.fit ?? "moderate",
      cluster: "lifestyle",
    }),
  };
}

describe("owner-controls-pure", () => {
  it("normalizes tags and exclude", () => {
    const m = normalizeOwnerMeta({ tags: ["hero", "NO-ADS", "bogus"], excluded: 1, note: "  hi  " });
    expect(m.tags).toEqual(["hero", "no-ads"]);
    expect(m.excluded).toBe(true);
    expect(m.note).toBe("hi");
  });

  it("formats month brief only when fields set", () => {
    expect(normalizeMonthBrief({})).toBeNull();
    const b = normalizeMonthBrief({ goal: "Be human", taboo: "No fake clients" });
    expect(b?.goal).toBe("Be human");
    const text = formatMonthBriefForPlan(b);
    expect(text).toMatch(/OWNER MONTH BRIEF/);
    expect(text).toMatch(/Be human/);
    expect(text).toMatch(/No fake clients/);
  });

  it("filters excluded and weak-fit assets", () => {
    const assets = [
      asset("a", { fit: "strong" }),
      asset("b", { fit: "weak" }),
      asset("c", { excluded: true, fit: "strong" }),
      asset("d", { fit: "moderate" }),
    ];
    const r = filterAssetsForPlan(assets, { excludeWeakFit: true });
    expect(r.droppedExcluded).toBe(1);
    expect(r.droppedWeak).toBe(1);
    expect(r.eligible.map((a) => a.id).sort()).toEqual(["a", "d"]);
  });

  it("never empties library when all weak and excludeWeakFit", () => {
    const assets = [asset("w1", { fit: "weak" }), asset("w2", { fit: "weak" })];
    const r = filterAssetsForPlan(assets, { excludeWeakFit: true });
    expect(r.eligible.length).toBe(2);
  });

  it("orders prefer-strong with strong first", () => {
    const assets = [asset("w", { fit: "weak" }), asset("s", { fit: "strong" })];
    const order = orderAssetsForReuse(assets, "prefer-strong");
    expect(assets[order[0]!]!.id).toBe("s");
  });

  it("describes reuse when posts exceed assets", () => {
    const line = reusePolicyPromptLine("unique-first", 3, 13);
    expect(line).toMatch(/unique-first/);
    expect(line).toMatch(/cover every eligible asset/i);
  });
});

import { describe, expect, it } from "vitest";
import { generateMonth } from "@/lib/content-studio/generate";
import type { BrandProfile } from "@/lib/content-studio/types";

const lockedProfile: BrandProfile = {
  source: "inferred",
  projectId: null,
  brandName: "Example",
  conceptStatement: "Clarity over noise.",
  toneOfVoice: ["plainspoken", "warm"],
  personalityTraits: ["steady"],
  promise: null,
  palette: [{ name: "ink", hex: "#111111" }],
  typography: {},
  logoAssetId: null,
  logoSvgPreview: null,
  designSystemId: null,
  locked: true,
  notes: null,
};

describe("content studio generateMonth", () => {
  it("builds a calendar of draft posts for a locked profile", () => {
    const cal = generateMonth(
      lockedProfile,
      [],
      { year: 2026, month: 8, postsPerWeek: 2 },
      "profile-1"
    );
    expect(cal.status).toBe("ready");
    expect(cal.posts.length).toBe(8);
    expect(cal.posts[0].caption).toContain("Example");
    expect(cal.posts[0].variants.length).toBe(3);
    expect(cal.posts.every((p) => p.status === "draft")).toBe(true);
  });

  it("refuses unlocked profiles", () => {
    expect(() =>
      generateMonth(
        { ...lockedProfile, locked: false },
        [],
        { year: 2026, month: 8 },
        "p"
      )
    ).toThrow(/locked/i);
  });
});

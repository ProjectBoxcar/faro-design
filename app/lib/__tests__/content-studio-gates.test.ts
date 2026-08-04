import { describe, expect, it } from "vitest";
import { generateMonthPlaceholder } from "@/lib/content-studio/generate";
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
  const storedAsset = {
    id: "a1",
    profileId: "profile-1",
    filename: "hero.jpg",
    mimeType: "image/jpeg",
    kind: "image" as const,
    storagePath: "content-studio/_standalone/profile-1/raw/hero.jpg",
    createdAt: new Date().toISOString(),
  };

  it("builds a calendar of draft posts for a locked profile with stored media", () => {
    const cal = generateMonthPlaceholder(
      lockedProfile,
      [storedAsset],
      { year: 2026, month: 8, postsPerWeek: 2 },
      "profile-1"
    );
    expect(cal.status).toBe("ready");
    // Aug 31 days · 2/wk ≈ 9 posts (organic, not daily)
    expect(cal.posts.length).toBeGreaterThanOrEqual(8);
    expect(cal.posts.length).toBeLessThanOrEqual(10);
    expect(cal.posts[0].caption).toContain("Example");
    expect(cal.posts[0].variants.length).toBe(3);
    expect(cal.posts.every((p) => p.status === "draft")).toBe(true);
  });

  it("refuses unlocked profiles", () => {
    expect(() =>
      generateMonthPlaceholder(
        { ...lockedProfile, locked: false },
        [storedAsset],
        { year: 2026, month: 8 },
        "p"
      )
    ).toThrow(/locked/i);
  });

  it("refuses generate with no stored files", () => {
    expect(() =>
      generateMonthPlaceholder(lockedProfile, [], { year: 2026, month: 8 }, "p")
    ).toThrow(/stored/i);
  });
});

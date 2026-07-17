import { describe, expect, it } from "vitest";
import { designSystemBlockedReason } from "@/lib/design-gates";
import { designSystemPrompt, landingPagePrompt, brandDeckPrompt } from "@/lib/design-prompts";
import type { BriefContext } from "@/lib/design-gates";

const fullBrief: BriefContext = {
  project: {
    id: "p1",
    name: "Test Brand",
    client_name: null,
    status: "active",
    current_phase: "planning",
    viability: "pending",
    viability_override_note: null,
    greenfield: false,
    personal: false,
    share_token: null,
    published_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
  name: "Test Brand",
  client: null,
  conceptStatement: "Open frontier",
  conceptDescription: "A brand about accessible adventure.",
  personality: "Brave, warm, straightforward",
  tone: "Plain-spoken, encouraging, precise",
  promise: "We make the first step feel possible.",
};

describe("designSystemBlockedReason", () => {
  it("never blocks generation, even with an incomplete strategy", () => {
    expect(designSystemBlockedReason({ ...fullBrief, conceptStatement: undefined })).toBeNull();
    expect(designSystemBlockedReason({ ...fullBrief, personality: undefined })).toBeNull();
    expect(designSystemBlockedReason({ ...fullBrief, tone: undefined })).toBeNull();
    expect(designSystemBlockedReason({ ...fullBrief, promise: undefined })).toBeNull();
    expect(designSystemBlockedReason(fullBrief)).toBeNull();
  });
});

describe("designSystemPrompt", () => {
  it("produces a visual developer handover HTML prompt", () => {
    const prompt = designSystemPrompt("A", "brief text");
    expect(prompt).toContain("proposal \"A\"");
    expect(prompt).toContain("<!DOCTYPE html>");
    expect(prompt).toContain("embedded SVG logo");
    expect(prompt).toContain("color palette");
    expect(prompt).toContain("typography");
    expect(prompt).toContain("components");
    expect(prompt).toContain("Do & Don't");
    expect(prompt).toContain("brief text");
  });
});

describe("landingPagePrompt", () => {
  it("requires a self-contained interactive HTML file", () => {
    const prompt = landingPagePrompt("B", "brief", "design system");
    expect(prompt).toContain("proposal \"B\"");
    expect(prompt).toContain("<!DOCTYPE html>");
    expect(prompt).toContain("Intersection Observer");
    expect(prompt).toContain("DESIGN SYSTEM:");
    expect(prompt).toContain("BRAND STRATEGY:");
    expect(prompt).toContain("design system");
  });
});

describe("brandDeckPrompt", () => {
  it("requires a multi-slide keyboard-navigable HTML deck", () => {
    const prompt = brandDeckPrompt("C", "brief", "design system");
    expect(prompt).toContain("proposal \"C\"");
    expect(prompt).toContain("<!DOCTYPE html>");
    expect(prompt).toContain("12 slides");
    expect(prompt).toContain("arrow keys");
    expect(prompt).toContain("DESIGN SYSTEM:");
    expect(prompt).toContain("BRAND STRATEGY:");
  });
});

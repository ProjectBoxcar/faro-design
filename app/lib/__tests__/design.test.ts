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
  it("includes the 9 required DESIGN.md sections", () => {
    const prompt = designSystemPrompt("brief text");
    expect(prompt).toContain("Visual Theme & Atmosphere");
    expect(prompt).toContain("Color Palette & Roles");
    expect(prompt).toContain("Typography Rules");
    expect(prompt).toContain("Component Stylings");
    expect(prompt).toContain("Layout Principles");
    expect(prompt).toContain("Depth & Elevation");
    expect(prompt).toContain("Do's and Don'ts");
    expect(prompt).toContain("Responsive Behavior");
    expect(prompt).toContain("Agent Prompt Guide");
  });

  it("includes the brand brief", () => {
    const prompt = designSystemPrompt("unique brief content");
    expect(prompt).toContain("unique brief content");
  });
});

describe("landingPagePrompt", () => {
  it("requires a self-contained HTML file with inlined CSS", () => {
    const prompt = landingPagePrompt("brief", "design system");
    expect(prompt).toContain("<!DOCTYPE html>");
    expect(prompt).toContain("<style>");
    expect(prompt).toContain("DESIGN SYSTEM:");
    expect(prompt).toContain("BRAND STRATEGY:");
  });
});

describe("brandDeckPrompt", () => {
  it("requires a keyboard-navigable HTML deck", () => {
    const prompt = brandDeckPrompt("brief", "design system");
    expect(prompt).toContain("<!DOCTYPE html>");
    expect(prompt).toContain("arrow keys");
    expect(prompt).toContain("DESIGN SYSTEM:");
    expect(prompt).toContain("BRAND STRATEGY:");
  });
});

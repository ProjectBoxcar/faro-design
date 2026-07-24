import { describe, expect, it } from "vitest";
import { artifactBlockedReason, designSystemBlockedReason } from "@/lib/design-gates";
import {
  designSystemPrompt,
  landingPagePrompt,
  brandDeckPrompt,
  variantCreativeDirection,
} from "@/lib/design-prompts";
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
  centralPattern: "Accessible adventure",
  mainTension: "Seen as niche",
  emotionalTerritory: "Confident, welcoming",
  designPlan: '{"execution-order":["logo","system","web"]}',
};

describe("designSystemBlockedReason", () => {
  it("blocks generation until the brief, concept, design plan, and approved logo exist", () => {
    expect(designSystemBlockedReason(fullBrief, { hasApprovedLogo: true })).toBeNull();
    expect(designSystemBlockedReason(fullBrief, { hasApprovedLogo: false })).toContain(
      "Logo Workshop"
    );
    expect(
      designSystemBlockedReason({ ...fullBrief, conceptStatement: undefined }, { hasApprovedLogo: true })
    ).toContain("the brand concept");
    expect(
      designSystemBlockedReason({ ...fullBrief, designPlan: undefined }, { hasApprovedLogo: true })
    ).toContain("the design plan");
    expect(
      designSystemBlockedReason(
        {
          ...fullBrief,
          centralPattern: undefined,
          mainTension: undefined,
          emotionalTerritory: undefined,
        },
        { hasApprovedLogo: true }
      )
    ).toContain("the strategic brief");
    // Softer gaps do not block — the strategy essentials are the gate.
    expect(designSystemBlockedReason({ ...fullBrief, personality: undefined }, { hasApprovedLogo: true })).toBeNull();
    expect(designSystemBlockedReason({ ...fullBrief, tone: undefined }, { hasApprovedLogo: true })).toBeNull();
    expect(designSystemBlockedReason({ ...fullBrief, promise: undefined }, { hasApprovedLogo: true })).toBeNull();
  });
});

describe("artifactBlockedReason", () => {
  it("requires a selected identity system for downstream artifacts", () => {
    expect(artifactBlockedReason(false, "landing_page")).toBe(
      "Select a brand identity system before creating a landing page."
    );
    expect(artifactBlockedReason(false, "deck")).toBe(
      "Select a brand identity system before creating a deck."
    );
    expect(artifactBlockedReason(true, "landing_page")).toBeNull();
    expect(artifactBlockedReason(true, "deck")).toBeNull();
  });
});

describe("variantCreativeDirection", () => {
  it("gives every output three structurally different mandatory directions", () => {
    for (const kind of ["design_system", "landing_page", "deck"] as const) {
      const directions = ["A", "B", "C"].map((variant) => variantCreativeDirection(kind, variant));
      expect(new Set(directions).size).toBe(3);
      expect(directions[0]).toContain("THESIS A");
      expect(directions[1]).toContain("THESIS B");
      expect(directions[2]).toContain("THESIS C");
    }
  });
});

describe("designSystemPrompt", () => {
  it("produces a visual developer handover that reuses the approved workshop logo", () => {
    const logoSvg = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>';
    const prompt = designSystemPrompt("A", "brief text", logoSvg);
    expect(prompt).toContain("proposal \"A\"");
    expect(prompt).toContain("<!DOCTYPE html>");
    expect(prompt).toContain("MUST NOT invent");
    expect(prompt).toContain("STRATEGY BRIEF FIDELITY");
    expect(prompt).toContain(logoSvg);
    expect(prompt).toContain("APPROVED LOGO SVG");
    expect(prompt).toContain("color palette");
    expect(prompt).toContain("typography");
    expect(prompt).toContain("components");
    expect(prompt).toContain("Do & Don't");
    expect(prompt).toContain("one continuous, native-size vertical guide");
    expect(prompt).toContain("exact section ids: logo, color, type, components");
    expect(prompt).toContain("Do not apply transform: scale()");
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

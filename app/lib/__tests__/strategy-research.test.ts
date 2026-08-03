import { describe, expect, it } from "vitest";
import {
  sanitizeStrategyResearchBrief,
  sectionUsesStrategyResearch,
  shouldRunStrategyResearch,
  totalIntakeChars,
} from "@/lib/strategy-research-pure";
import { normalizeIntakeAnswers } from "@/lib/intake-answers";

const rich = normalizeIntakeAnswers({
  offering:
    "We sell modular furniture tested in real apartments under 700 sq ft for city renters who need pieces that clear hallway turns and work as a system.",
  story:
    "Started as a neighborhood shop; expanded online after we built a clearance-test process for every SKU. In three years we want the default small-space brand in two metro markets.",
  difference:
    "Unlike catalog retailers we prove fit in real rooms and sell coordinated systems, not lone objects. We believe livability beats trend photography.",
  operations:
    "Three lines — furniture, decor kits, space-planning add-ons. Mid-to-premium pricing. Website, Instagram, and a small showroom. Most customers from referrals and SEO.",
  edge:
    "Every piece is rejected if it fails the hallway-turn and under-700-sq-ft apartment test — a competitor without that lab cannot honestly claim the same.",
  taste: "Warm minimal oak, soft neutrals, calm editorial like Aesop and Muji. No neon or fake luxury gold.",
});

const thin = normalizeIntakeAnswers({
  offering: "furniture for apartments",
  story: "new shop",
  difference: "",
  operations: "online",
  edge: "",
  taste: "simple",
});

describe("shouldRunStrategyResearch", () => {
  it("skips rich, complete owner context", () => {
    const r = shouldRunStrategyResearch({ answers: rich, greenfield: true });
    expect(r.needed).toBe(false);
    expect(totalIntakeChars(rich)).toBeGreaterThan(420);
  });

  it("runs when answers are sparse (core volume signals)", () => {
    const r = shouldRunStrategyResearch({ answers: thin, greenfield: true });
    expect(r.needed).toBe(true);
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.reasons).not.toContain("sufficient_context");
  });

  it("does not run on missing edge alone when volume is OK", () => {
    // Five solid fields + only edge empty → missing_edge reason, but no core volume signal
    const mid = normalizeIntakeAnswers({
      offering:
        "We help architecture studios brand their practices with clear positioning, a full verbal system, and a practical toolkit partners can use on every pitch.",
      story:
        "I started after freelancing for ten years with mid-size studios that outgrew DIY brand kits and needed a sharper way to explain their value to clients.",
      difference:
        "We focus on process clarity and decision frameworks over decoration, so studios leave with language they will actually use in meetings.",
      operations:
        "Solo practice with premium project fees; the brand lives on the website and LinkedIn, and most clients arrive through referrals from other principals.",
      edge: "",
      taste:
        "Quiet editorial, paper and ink, no startup gradients or neon — more library than launch party.",
    });
    expect(totalIntakeChars(mid)).toBeGreaterThanOrEqual(420);
    const r = shouldRunStrategyResearch({ answers: mid, greenfield: false });
    // Empty edge alone must not force research when the rest is solid
    expect(r.needed).toBe(false);
  });
});

describe("sectionUsesStrategyResearch", () => {
  it("includes market and brief synthesis", () => {
    expect(sectionUsesStrategyResearch("reality.differentiator")).toBe(true);
    expect(sectionUsesStrategyResearch("brief.main-tension")).toBe(true);
    expect(sectionUsesStrategyResearch("concept")).toBe(true);
  });

  it("skips pure introspective / internal keys", () => {
    expect(sectionUsesStrategyResearch("identity.origin")).toBe(false);
    expect(sectionUsesStrategyResearch("internal.strategy-research")).toBe(false);
    expect(sectionUsesStrategyResearch("intake.answers")).toBe(false);
  });
});

describe("sanitizeStrategyResearchBrief", () => {
  it("strips process chatter and keeps the briefing body", () => {
    const raw = [
      "I'll research the small-apartment home appliance category to ground a strategy draft.",
      "Let me run a few targeted searches.",
      "I have enough category grounding. Here's the internal briefing.",
      "",
      'INTERNAL BRIEFING — compact home appliances for small city apartments',
      "",
      "Category: Compact kitchen and laundry appliances for renters.",
      "Typical competitors: Specialized small-space appliance brands and IKEA kits.",
      "Positioning patterns: Fit, quiet operation, multi-function.",
    ].join("\n");
    const out = sanitizeStrategyResearchBrief(raw);
    expect(out.toLowerCase()).not.toContain("i'll research");
    expect(out.toLowerCase()).not.toContain("let me run");
    expect(out).toMatch(/INTERNAL BRIEFING|Category/i);
    expect(out).toContain("Compact kitchen");
  });

  it("soft-trims long trademark digressions", () => {
    const raw = [
      "INTERNAL BRIEFING",
      "Category: city appliances.",
      "Note on the name: This is a globally recognized appliance trademark with severe brand confusion and legal exposure across USPTO filings and international classes which creates near-certain brand confusion for any new entrant in this exact category and must be abandoned immediately.",
      "Positioning: quiet fit for small rooms.",
    ].join("\n");
    const out = sanitizeStrategyResearchBrief(raw);
    expect(out).toContain("Category");
    expect(out).toContain("Positioning");
    // Long legal essay dropped
    expect(out).not.toMatch(/USPTO filings and international/);
  });

  it("caps length", () => {
    const raw = "INTERNAL BRIEFING\n" + "word ".repeat(2000);
    const out = sanitizeStrategyResearchBrief(raw, 200);
    expect(out.length).toBeLessThanOrEqual(210);
  });
});

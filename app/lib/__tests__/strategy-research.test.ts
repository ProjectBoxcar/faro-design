import { describe, expect, it } from "vitest";
import {
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

  it("runs when answers are sparse", () => {
    const r = shouldRunStrategyResearch({ answers: thin, greenfield: true });
    expect(r.needed).toBe(true);
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.reasons).not.toContain("sufficient_context");
  });

  it("runs when difference/edge missing even with some text", () => {
    const mid = normalizeIntakeAnswers({
      offering: "We help architecture studios brand their practices with clear positioning.",
      story: "I started after freelancing for ten years.",
      difference: "",
      operations: "Solo, premium fees, website and referrals.",
      edge: "",
      taste: "Quiet editorial.",
    });
    const r = shouldRunStrategyResearch({ answers: mid, greenfield: false });
    expect(r.needed).toBe(true);
    expect(r.reasons).toContain("missing_edge_or_difference");
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

import { describe, expect, it } from "vitest";
import {
  buildMediaGroundedCopy,
  enforceMediaConsistency,
  formatMediaCardForPlan,
  isUsableAnalysis,
  normalizeMediaAnalysis,
  rankAssetIndicesByFit,
  unanalyzedCard,
  validatePostsAgainstMedia,
} from "@/lib/content-studio/media-analysis-pure";

describe("media-analysis-pure", () => {
  it("normalizes partial model output", () => {
    const card = normalizeMediaAnalysis({
      summary: "A black-and-white dog in a park wearing a pink bandana.",
      subjects: ["dog", "park"],
      cluster: "pet",
      brandFit: "weak",
      people: false,
    });
    expect(card.status).toBe("ok");
    expect(card.cluster).toBe("pet");
    expect(card.brandFit).toBe("weak");
    expect(card.subjects).toContain("dog");
    expect(isUsableAnalysis(card)).toBe(true);
  });

  it("unanalyzed cards are not usable for grounding", () => {
    const card = unanalyzedCard("no key", { kind: "video", filename: "clip.mp4" });
    expect(card.status).toBe("unanalyzed");
    expect(isUsableAnalysis(card)).toBe(false);
    expect(card.doNotClaim.length).toBeGreaterThan(0);
  });

  it("formats media cards for the plan prompt", () => {
    const card = normalizeMediaAnalysis({
      summary: "Three friends pose at an Evil Dead movie poster.",
      subjects: ["people", "movie poster"],
      cluster: "event",
      brandFit: "moderate",
      contentAngles: ["night out", "culture"],
      doNotClaim: ["studio logo process"],
    });
    const block = formatMediaCardForPlan(0, "cinema.jpeg", "image", card);
    expect(block).toContain("[0]");
    expect(block).toContain("Evil Dead");
    expect(block).toContain("DO NOT CLAIM");
    expect(block).toContain("event");
  });

  it("flags invented process claims against pet/place media", () => {
    const dog = normalizeMediaAnalysis({
      summary: "Dog in park",
      subjects: ["dog"],
      cluster: "pet",
      brandFit: "weak",
      doNotClaim: ["Do not invent studio process or sketches"],
    });
    const issues = validatePostsAgainstMedia({
      posts: [
        {
          caption: "Here is our strategy session whiteboard before the logo.",
          creativeDirection: "Show sketches and moodboard BTS",
          theme: "process",
          sourceAssetIndex: 0,
        },
      ],
      cards: [dog],
    });
    expect(issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("allows process language when cluster is process", () => {
    const processCard = normalizeMediaAnalysis({
      summary: "Desk with sketches and sticky notes",
      subjects: ["sketches"],
      cluster: "process",
      brandFit: "strong",
    });
    const issues = validatePostsAgainstMedia({
      posts: [
        {
          caption: "Sketch phase before the mark.",
          creativeDirection: "Show the sketch desk",
          theme: "process",
          sourceAssetIndex: 0,
        },
      ],
      cards: [processCard],
    });
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("ranks strong brand-fit assets first", () => {
    const weak = normalizeMediaAnalysis({
      summary: "Pet photo",
      subjects: ["dog"],
      brandFit: "weak",
      cluster: "pet",
    });
    const strong = normalizeMediaAnalysis({
      summary: "Brand product hero",
      subjects: ["product"],
      brandFit: "strong",
      cluster: "product",
    });
    const order = rankAssetIndicesByFit([weak, strong]);
    expect(order[0]).toBe(1);
  });

  it("hard-repairs invented process captions via enforceMediaConsistency", () => {
    const dog = normalizeMediaAnalysis({
      summary: "A blue merle Border Collie in a park with a pink bandana.",
      subjects: ["dog", "bandana"],
      cluster: "pet",
      brandFit: "weak",
      contentAngles: ["honest lifestyle"],
      doNotClaim: ["Do not invent studio process or sketches"],
    });
    const result = enforceMediaConsistency({
      brandName: "FARO Design",
      cards: [dog],
      posts: [
        {
          caption: "Here is our strategy session whiteboard and logo draft sketches.",
          creativeDirection: "Show the studio desk moodboard",
          theme: "process",
          hook: "Sketches first",
          sourceAssetIndex: 0,
        },
      ],
    });
    expect(result.repaired).toBe(1);
    expect(result.errorsRemaining).toBe(0);
    expect(result.posts[0]!.caption).toMatch(/Border Collie|dog|Real life/i);
    expect(result.posts[0]!.creativeDirection).toMatch(/Use ONLY what is seen/i);
    expect(INVENTED_gone(result.posts[0]!.caption)).toBe(true);
  });

  it("buildMediaGroundedCopy stays honest for weak-fit food", () => {
    const food = normalizeMediaAnalysis({
      summary: "Two plates of burritos on a couch night.",
      subjects: ["burritos"],
      cluster: "food",
      brandFit: "weak",
    });
    const copy = buildMediaGroundedCopy("FARO Design", food);
    expect(copy.caption.toLowerCase()).not.toMatch(/\bwhiteboard\b|\bsketch/);
    expect(copy.caption.toLowerCase()).not.toMatch(/\bdelivered package\b/);
    expect(copy.theme).toMatch(/media-grounded/);
  });
});

function INVENTED_gone(text: string): boolean {
  return !/\b(sketch|whiteboard|moodboard|strategy session)\b/i.test(text);
}

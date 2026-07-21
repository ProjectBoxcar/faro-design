import { describe, expect, it } from "vitest";
import { canGenerate, getSection } from "@/lib/methodology";
import { getSectionPrompt } from "@/lib/prompts";

describe("canGenerate", () => {
  it("blocks synthesis until declared reads are filled", () => {
    const key = "brief.central-pattern";
    const section = getSection(key)!;
    expect(section.kind).toBe("synthesis");
    expect(canGenerate(key, new Set())).toBe(false);
  });

  it("allows synthesis when hard reads are filled", () => {
    const key = "brief.central-pattern";
    const section = getSection(key)!;
    const filled = new Set(section.reads ?? []);
    expect(canGenerate(key, filled)).toBe(true);
  });

  it("does not treat pure input steps as generatable via canGenerate", () => {
    expect(canGenerate("reality.problem", new Set(["reality.problem"]))).toBe(false);
  });

  it("never waives Image pillar reads", () => {
    const key = "image.pattern-analysis";
    const section = getSection(key);
    if (!section?.reads?.length) return; // skip if taxonomy shifts
    const almost = new Set(section.reads.slice(0, -1));
    expect(canGenerate(key, almost)).toBe(false);
  });
});

describe("getSectionPrompt", () => {
  it("registers specialized quality bars for flagship sections", () => {
    expect(getSectionPrompt("concept")?.systemAddon).toMatch(/CONCEPT/i);
    expect(getSectionPrompt("manifesto")?.systemAddon).toMatch(/MANIFESTO/i);
    expect(getSectionPrompt("brief.central-pattern")?.systemAddon).toMatch(/BRIEF/i);
    expect(getSectionPrompt("communication.purpose")?.systemAddon).toBeTruthy();
  });

  it("routes survey design to the parsing model", () => {
    expect(getSectionPrompt("image.survey-design")?.useParsingModel).toBe(true);
  });

  it("returns null for unregistered sections", () => {
    expect(getSectionPrompt("reality.problem")).toBeNull();
  });
});

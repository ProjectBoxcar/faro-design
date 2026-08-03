import { describe, expect, it } from "vitest";
import {
  countFilledIntakeAnswers,
  intakeAnswersToSectionValue,
  normalizeIntakeAnswers,
  parseIntakeAnswersSection,
} from "@/lib/intake-answers";

describe("normalizeIntakeAnswers", () => {
  it("trims all six fields", () => {
    const n = normalizeIntakeAnswers({
      offering: "  furniture  ",
      story: " started ",
      difference: "fit",
      operations: "",
      edge: "  tested in real rooms ",
      taste: "warm minimal",
    });
    expect(n.offering).toBe("furniture");
    expect(n.story).toBe("started");
    expect(n.operations).toBe("");
    expect(n.edge).toBe("tested in real rooms");
  });
});

describe("countFilledIntakeAnswers", () => {
  it("counts non-empty fields", () => {
    expect(
      countFilledIntakeAnswers(
        normalizeIntakeAnswers({
          offering: "a",
          story: "b",
          difference: "",
          operations: "",
          edge: "c",
          taste: "",
        })
      )
    ).toBe(3);
  });
});

describe("intakeAnswersToSectionValue / parse", () => {
  it("round-trips owner answers with savedAt", () => {
    const answers = normalizeIntakeAnswers({
      offering: "City furniture for small apartments",
      story: "Neighborhood shop went online",
      difference: "Tested under 700 sq ft",
      operations: "Mid-premium",
      edge: "Hallway turn clearance",
      taste: "Warm oak, Muji calm",
    });
    const value = intakeAnswersToSectionValue(answers, "2026-07-31T12:00:00.000Z");
    expect(value.savedAt).toBe("2026-07-31T12:00:00.000Z");
    expect(value.offering).toContain("furniture");
    const parsed = parseIntakeAnswersSection(value as unknown as Record<string, unknown>);
    expect(parsed?.taste).toBe("Warm oak, Muji calm");
    expect(parsed?.edge).toBe("Hallway turn clearance");
  });

  it("returns null for empty section", () => {
    expect(parseIntakeAnswersSection({})).toBeNull();
    expect(parseIntakeAnswersSection(null)).toBeNull();
  });
});

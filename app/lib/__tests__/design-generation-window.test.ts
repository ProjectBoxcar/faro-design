import { describe, expect, it } from "vitest";
import {
  formatGenerationElapsed,
  generationFocusIndex,
  generationProgressPercent,
} from "@/components/DesignGenerationWindow";

describe("DesignGenerationWindow helpers", () => {
  it("formats truthful elapsed time without estimating completion", () => {
    expect(formatGenerationElapsed(0)).toBe("0s");
    expect(formatGenerationElapsed(59)).toBe("59s");
    expect(formatGenerationElapsed(60)).toBe("1m 00s");
    expect(formatGenerationElapsed(125)).toBe("2m 05s");
  });

  it("cycles design lenses without presenting them as progress stages", () => {
    expect(generationFocusIndex(0, 8)).toBe(0);
    expect(generationFocusIndex(12, 8)).toBe(1);
    expect(generationFocusIndex(96, 8)).toBe(0);
    expect(generationFocusIndex(10, 0)).toBe(0);
  });

  it("reports percent from real asset progress and soft estimates", () => {
    expect(generationProgressPercent(0, "design_system", 3, 3)).toBe(100);
    expect(generationProgressPercent(30, "design_system", 0, 3)).toBeGreaterThanOrEqual(1);
    expect(generationProgressPercent(30, "design_system", 0, 3)).toBeLessThan(100);
    expect(generationProgressPercent(30, "design_system", 1, 3)).toBeGreaterThanOrEqual(33);
    expect(generationProgressPercent(5, "mockups", 0, 0)).toBeGreaterThanOrEqual(1);
    expect(generationProgressPercent(5, "mockups", 0, 0)).toBeLessThanOrEqual(92);
  });
});

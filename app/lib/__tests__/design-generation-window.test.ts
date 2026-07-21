import { describe, expect, it } from "vitest";
import {
  formatGenerationElapsed,
  generationFocusIndex,
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
});

import { describe, expect, it } from "vitest";
import {
  assessLogoBatchDiversity,
  classifyLogoStructure,
  shouldRetryForLogoDiversity,
} from "@/lib/logo-diversity-pure";

describe("classifyLogoStructure", () => {
  it("reads direction labels", () => {
    expect(classifyLogoStructure({ direction: "Solid wordmark with tight tracking" })).toBe(
      "wordmark"
    );
    expect(classifyLogoStructure({ direction: "Mark + word monogram lockup" })).toBe("mark_word");
    expect(classifyLogoStructure({ direction: "Integrated badge frame" })).toBe("integrated");
  });
});

describe("assessLogoBatchDiversity", () => {
  it("passes when three structures are present", () => {
    const r = assessLogoBatchDiversity([
      { direction: "wordmark only" },
      { direction: "mark + word icon" },
      { direction: "integrated badge" },
    ]);
    expect(r.hasAllThree).toBe(true);
    expect(r.diverseEnough).toBe(true);
    expect(shouldRetryForLogoDiversity(r)).toBe(false);
  });

  it("flags samey three-wordmark batches for retry", () => {
    const r = assessLogoBatchDiversity([
      { direction: "wordmark A" },
      { direction: "wordmark B" },
      { direction: "wordmark C" },
    ]);
    expect(r.diverseEnough).toBe(false);
    expect(shouldRetryForLogoDiversity(r)).toBe(true);
  });

  it("does not retry incomplete batches (count retry handles that)", () => {
    const r = assessLogoBatchDiversity([{ direction: "wordmark" }]);
    expect(shouldRetryForLogoDiversity(r)).toBe(false);
  });
});

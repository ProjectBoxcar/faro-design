import { describe, expect, it } from "vitest";
import { scoreViabilityVerdict, type CriterionScore } from "@/lib/viability-score";

function crit(
  partial: Partial<CriterionScore> & Pick<CriterionScore, "criterion" | "type" | "answer">
): CriterionScore {
  return { implication: "", note: "", ...partial };
}

describe("scoreViabilityVerdict", () => {
  it("passes when all non-negotiables are yes", () => {
    const scored = [
      crit({ criterion: "Recurring sales exist", type: "non-negotiable", answer: "yes" }),
      crit({ criterion: "Budget is available", type: "non-negotiable", answer: "yes" }),
      crit({ criterion: "Some positive signal", type: "positive", answer: "yes" }),
    ];
    expect(scoreViabilityVerdict(scored, false)).toBe("pass");
  });

  it("fails commercial engagement when a blocking non-negotiable is no", () => {
    const scored = [
      crit({ criterion: "Recurring sales exist", type: "non-negotiable", answer: "no" }),
      crit({ criterion: "Budget is available", type: "non-negotiable", answer: "yes" }),
    ];
    expect(scoreViabilityVerdict(scored, false)).toBe("fail");
  });

  it("does not fail personal projects on commercial non-negotiables", () => {
    const scored = [
      crit({ criterion: "Recurring sales exist", type: "non-negotiable", answer: "no" }),
      crit({ criterion: "Budget is available", type: "non-negotiable", answer: "no" }),
    ];
    // Still caveat (non-negotiable nos), not fail
    expect(scoreViabilityVerdict(scored, true)).toBe("caveat");
  });

  it("does not hard-fail greenfield brands lacking recurring sales", () => {
    const scored = [
      crit({ criterion: "Recurring sales exist", type: "non-negotiable", answer: "no" }),
      crit({ criterion: "Budget is available", type: "non-negotiable", answer: "yes" }),
    ];
    expect(scoreViabilityVerdict(scored, { greenfield: true })).toBe("caveat");
    expect(scoreViabilityVerdict(scored, { personal: false, greenfield: false })).toBe("fail");
  });

  it("returns caveat for non-blocking non-negotiable failures", () => {
    const scored = [
      crit({ criterion: "Team is ready", type: "non-negotiable", answer: "no" }),
      crit({ criterion: "Recurring sales exist", type: "non-negotiable", answer: "yes" }),
    ];
    expect(scoreViabilityVerdict(scored, false)).toBe("caveat");
  });

  it("returns caveat when a risk-phrased warning is yes", () => {
    const scored = [
      crit({ criterion: "Recurring sales exist", type: "non-negotiable", answer: "yes" }),
      crit({
        criterion: "Category is overcrowded",
        type: "warning",
        answer: "yes",
        implication: "Risk — do not proceed lightly",
      }),
    ];
    expect(scoreViabilityVerdict(scored, false)).toBe("caveat");
  });
});

import { describe, expect, it } from "vitest";
import type { Section } from "@/lib/methodology";
import {
  stripHint,
  trimForBrief,
  wouldIncludeInBrief,
  BRIEF_OMIT_FIELDS,
  centralPatternError,
} from "@/lib/brief-rules";

function section(partial: Partial<Section> & Pick<Section, "id" | "name">): Section {
  return {
    resolver: "designer",
    kind: "synthesis",
    fields: [],
    ...partial,
  };
}

describe("centralPatternError", () => {
  it("accepts a concise pattern and rejects embedded rationale", () => {
    expect(centralPatternError("Verified presence")).toBeNull();
    expect(centralPatternError("The pattern is verified because someone personally visited every workshop and documented the proof.")).toMatch(/short phrase/);
  });
});

describe("stripHint", () => {
  it("removes trailing parenthetical authoring hints", () => {
    expect(stripHint("Concept statement (the phrase)")).toBe("Concept statement");
  });
});

describe("trimForBrief", () => {
  it("drops process-only concept fields", () => {
    const s = section({
      id: "concept",
      name: "Brand Concept",
      fields: [
        { id: "statement", label: "Statement", type: "text" },
        { id: "distillation", label: "Distillation", type: "textarea" },
        { id: "eval-against-brief", label: "Eval", type: "table" },
      ],
    });
    const trimmed = trimForBrief(s);
    const ids = (trimmed.fields ?? []).map((f) => f.id);
    expect(ids).toContain("statement");
    expect(ids).not.toContain("distillation");
    expect(ids).not.toContain("eval-against-brief");
    for (const omit of BRIEF_OMIT_FIELDS.concept) {
      expect(ids).not.toContain(omit);
    }
  });

  it("drops manifesto construction/evaluation", () => {
    const s = section({
      id: "manifesto",
      name: "Manifesto",
      fields: [
        { id: "text", label: "Text", type: "textarea" },
        { id: "construction", label: "Construction", type: "textarea" },
        { id: "evaluation", label: "Evaluation", type: "textarea" },
      ],
    });
    const ids = (trimForBrief(s).fields ?? []).map((f) => f.id);
    expect(ids).toEqual(["text"]);
  });
});

describe("wouldIncludeInBrief", () => {
  const concept = section({
    id: "concept",
    name: "Brand Concept",
    fields: [
      { id: "statement", label: "Statement", type: "text" },
      { id: "distillation", label: "Distillation", type: "textarea" },
    ],
  });

  it("excludes evaluation sections even if later added to a brief group", () => {
    const evaluation = section({
      id: "system.logo-evaluation",
      name: "Logo Evaluation",
      kind: "eval",
      fields: [{ id: "scores", label: "Scores", type: "table" }],
    });
    expect(wouldIncludeInBrief(evaluation, "complete", { scores: [{ result: "pass" }] })).toBe(false);
  });

  it("excludes internal sections", () => {
    const internal = section({
      id: "reality.evaluation-criteria",
      name: "Evaluation Criteria",
      internal: true,
      fields: [{ id: "criteria", label: "Criteria", type: "table" }],
    });
    expect(
      wouldIncludeInBrief(internal, "complete", {
        criteria: [{ criterion: "x", answer: "yes" }],
      })
    ).toBe(false);
  });

  it("excludes non-complete status", () => {
    expect(wouldIncludeInBrief(concept, "draft", { statement: "Hello" })).toBe(false);
  });

  it("excludes complete but empty content", () => {
    expect(wouldIncludeInBrief(concept, "complete", {})).toBe(false);
  });

  it("includes complete sections with deliverable content", () => {
    expect(wouldIncludeInBrief(concept, "complete", { statement: "North star" })).toBe(true);
  });

  it("does not count only-omitted fields as content", () => {
    // Only distillation is filled — omitted from brief → no deliverable content
    expect(
      wouldIncludeInBrief(concept, "complete", { distillation: "process notes only" })
    ).toBe(false);
  });
});

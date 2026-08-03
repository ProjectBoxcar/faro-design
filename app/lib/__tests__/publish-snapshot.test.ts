import { describe, expect, it } from "vitest";
import {
  serializeBriefGroups,
  groupsFromSnapshot,
} from "@/lib/publish-snapshot-pure";
import type { CompiledGroup } from "@/lib/brief";
import type { Section } from "@/lib/methodology";

function fakeSection(id: string, name: string): Section {
  return {
    id,
    name,
    fields: [
      {
        id: "statement",
        label: "Statement",
        type: "text",
      },
    ],
  } as Section;
}

describe("publish snapshot freeze", () => {
  it("deep-clones values so later mutations do not rewrite the snapshot", () => {
    const liveValue = { statement: "Original concept" };
    const groups: CompiledGroup[] = [
      {
        heading: "Brand Concept",
        sections: [{ section: fakeSection("concept", "Brand Concept"), value: liveValue }],
      },
    ];

    const frozen = serializeBriefGroups(groups);
    liveValue.statement = "Edited after publish";

    expect(frozen[0].sections[0].value.statement).toBe("Original concept");
  });

  it("round-trips groups for readout without losing field labels", () => {
    const groups: CompiledGroup[] = [
      {
        heading: "Strategic Brief",
        sections: [
          {
            section: fakeSection("brief.central-pattern", "Central Pattern"),
            value: { statement: "Pattern text" },
          },
        ],
      },
    ];
    const frozen = serializeBriefGroups(groups);
    const restored = groupsFromSnapshot(frozen);
    expect(restored[0].heading).toBe("Strategic Brief");
    expect(restored[0].sections[0].section.name).toBe("Central Pattern");
    expect(restored[0].sections[0].section.fields?.[0]?.label).toBe("Statement");
    expect(restored[0].sections[0].value).toEqual({ statement: "Pattern text" });
  });

  it("isolates nested table rows from live mutation", () => {
    const row = { component: "Logo", action: "create" };
    const groups: CompiledGroup[] = [
      {
        heading: "Design Plan",
        sections: [
          {
            section: {
              ...fakeSection("design-plan", "Design Plan"),
              fields: [
                {
                  id: "visual-identity",
                  label: "Visual",
                  type: "table",
                  columns: [
                    { id: "component", label: "Component" },
                    { id: "action", label: "Action" },
                  ],
                },
              ],
            } as Section,
            value: { "visual-identity": [row] },
          },
        ],
      },
    ];
    const frozen = serializeBriefGroups(groups);
    row.action = "keep";
    const frozenRows = frozen[0].sections[0].value["visual-identity"] as { action: string }[];
    expect(frozenRows[0].action).toBe("create");
  });
});

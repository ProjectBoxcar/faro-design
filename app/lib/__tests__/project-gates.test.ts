import { describe, expect, it } from "vitest";
import { viabilityActionBlockedReason } from "@/lib/project-gates";

describe("viabilityActionBlockedReason", () => {
  it("blocks consequential actions while viability is pending or failed", () => {
    expect(viabilityActionBlockedReason({ viability: "pending" }, "publish")).toContain("Complete the viability review");
    expect(viabilityActionBlockedReason({ viability: "fail" }, "design")).toContain("documented override");
    expect(viabilityActionBlockedReason({ viability: "fail" }, "deliverable")).toContain("documented override");
  });

  it("allows pass and caveat verdicts", () => {
    expect(viabilityActionBlockedReason({ viability: "pass" }, "publish")).toBeNull();
    expect(viabilityActionBlockedReason({ viability: "caveat" }, "design")).toBeNull();
  });
});

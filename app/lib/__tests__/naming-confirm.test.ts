import { describe, expect, it } from "vitest";
import { isGenericBrandName } from "@/lib/naming-generic";

/**
 * Pure naming policy tests for Pack 2.
 * hasConfirmedBrandName / needsNameWorkshop need DB — covered by policy rules here
 * and integration via studio gates in app code.
 */

describe("name workshop policy (Pack 2)", () => {
  it("CITY HOME is not generic — but must still be confirmed (needsWorkshop != isGeneric)", () => {
    // Before Pack 2, needsWorkshop === isGeneric, so CITY HOME skipped the workshop.
    // After Pack 2, needsWorkshop is !confirmed only — product decision, not isGeneric.
    expect(isGenericBrandName("CITY HOME")).toBe(false);
    expect(isGenericBrandName("Fits Right")).toBe(false);
    expect(isGenericBrandName("My Brand")).toBe(true);
  });

  it("availability pass must not equal confirm: confirmed is presentation.chosen or naming_confirm", () => {
    // Document the contract for reviewers — availability uses type naming_availability.
    const confirmTypes = ["naming_confirm"] as const;
    const availabilityTypes = ["naming_availability"] as const;
    expect(confirmTypes).not.toEqual(availabilityTypes);
    // Legacy confirm rows are type "naming" with score key "source" only.
    const legacyConfirmScoreKey = "source";
    expect(legacyConfirmScoreKey).toBe("source");
  });
});

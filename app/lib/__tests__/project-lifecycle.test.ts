import { describe, expect, it } from "vitest";
import {
  deriveProjectPhase,
  isDesignJourneyDone,
  shareStateCopy,
} from "@/lib/project-lifecycle-pure";

describe("deriveProjectPhase", () => {
  it("starts strategic when nothing is ready", () => {
    expect(
      deriveProjectPhase({
        strategyReady: false,
        logoApproved: false,
        designPackageReady: false,
        hasShareToken: false,
      })
    ).toBe("strategic");
  });

  it("moves to planning when strategy is ready (even if share token exists)", () => {
    expect(
      deriveProjectPhase({
        strategyReady: true,
        logoApproved: false,
        designPackageReady: false,
        hasShareToken: true,
      })
    ).toBe("planning");
  });

  it("moves to design when logo is approved", () => {
    expect(
      deriveProjectPhase({
        strategyReady: true,
        logoApproved: true,
        designPackageReady: false,
        hasShareToken: true,
      })
    ).toBe("design");
  });

  it("is finished only when package ready AND shared", () => {
    expect(
      deriveProjectPhase({
        strategyReady: true,
        logoApproved: true,
        designPackageReady: true,
        hasShareToken: false,
      })
    ).toBe("design");
    expect(
      deriveProjectPhase({
        strategyReady: true,
        logoApproved: true,
        designPackageReady: true,
        hasShareToken: true,
      })
    ).toBe("finished");
  });
});

describe("isDesignJourneyDone", () => {
  it("does not treat strategy publish + logo as design complete", () => {
    expect(
      isDesignJourneyDone({
        currentPhase: "design",
        designPackageReady: false,
      })
    ).toBe(false);
  });

  it("is done when package finals exist", () => {
    expect(
      isDesignJourneyDone({
        currentPhase: "design",
        designPackageReady: true,
      })
    ).toBe(true);
  });

  it("is done when phase is finished", () => {
    expect(
      isDesignJourneyDone({
        currentPhase: "finished",
        designPackageReady: false,
      })
    ).toBe(true);
  });
});

describe("shareStateCopy", () => {
  it("labels strategy-only share clearly", () => {
    const c = shareStateCopy({
      hasShareToken: true,
      packageReady: false,
      snapshotPackageReady: false,
      version: 1,
    });
    expect(c.kind).toBe("strategy_brief");
    expect(c.title.toLowerCase()).toContain("strategy");
    expect(c.title.toLowerCase()).not.toContain("brand package published");
  });

  it("labels full package publish", () => {
    const c = shareStateCopy({
      hasShareToken: true,
      packageReady: true,
      snapshotPackageReady: true,
      version: 2,
    });
    expect(c.kind).toBe("brand_package");
    expect(c.title).toMatch(/Brand package published/i);
  });

  it("prompts update when package live but freeze is strategy-only", () => {
    const c = shareStateCopy({
      hasShareToken: true,
      packageReady: true,
      snapshotPackageReady: false,
      version: 1,
    });
    expect(c.kind).toBe("strategy_brief");
    expect(c.blurb.toLowerCase()).toMatch(/publish again|update package|freeze/);
  });
});

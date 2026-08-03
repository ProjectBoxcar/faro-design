import { describe, expect, it } from "vitest";
import { shouldResumeDesignJob } from "@/lib/design-job-resume-pure";

describe("shouldResumeDesignJob", () => {
  it("resumes when caller asks for resume", () => {
    expect(
      shouldResumeDesignJob({
        status: "queued",
        explicitResume: true,
        landedAssetCount: 0,
      })
    ).toBe(true);
  });

  it("resumes when any proposals already landed", () => {
    expect(
      shouldResumeDesignJob({
        status: "running",
        landedAssetCount: 2,
      })
    ).toBe(true);
  });

  it("resumes orphaned mid-flight jobs even with zero landed yet", () => {
    expect(
      shouldResumeDesignJob({
        status: "running",
        isOrphan: true,
        landedAssetCount: 0,
      })
    ).toBe(true);
    expect(
      shouldResumeDesignJob({
        status: "queued",
        isOrphan: true,
        landedAssetCount: 0,
      })
    ).toBe(true);
  });

  it("does not force resume for a brand-new empty job with no orphan flag", () => {
    expect(
      shouldResumeDesignJob({
        status: "queued",
        isOrphan: false,
        landedAssetCount: 0,
      })
    ).toBe(false);
  });
});

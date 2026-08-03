import { describe, expect, it } from "vitest";
import {
  deriveExpressStatusFromDisk,
  shouldAutoStartExpress,
} from "@/lib/express-run-state-pure";

describe("deriveExpressStatusFromDisk", () => {
  it("reports done when all sections are filled", () => {
    const s = deriveExpressStatusFromDisk({
      sectionsFilled: 27,
      sectionsTotal: 27,
      persisted: { status: "cancelled" },
    });
    expect(s.status).toBe("done");
    expect(s.resumable).toBe(false);
  });

  it("keeps cancelled durable so clients do not auto-start", () => {
    const s = deriveExpressStatusFromDisk({
      sectionsFilled: 10,
      sectionsTotal: 27,
      persisted: { status: "cancelled" },
    });
    expect(s.status).toBe("cancelled");
    expect(s.resumable).toBe(true);
    expect(shouldAutoStartExpress(s.status)).toBe(false);
  });

  it("surfaces failed with error and resumable", () => {
    const s = deriveExpressStatusFromDisk({
      sectionsFilled: 5,
      sectionsTotal: 27,
      persisted: {
        status: "failed",
        error: "Rate limited",
        errorCode: "rate_limit",
      },
    });
    expect(s.status).toBe("failed");
    expect(s.error).toContain("Rate");
    expect(s.resumable).toBe(true);
    expect(shouldAutoStartExpress(s.status)).toBe(false);
  });

  it("uses idle+resumable for crash recovery without cancel", () => {
    const s = deriveExpressStatusFromDisk({
      sectionsFilled: 8,
      sectionsTotal: 27,
      persisted: { status: "running" },
    });
    expect(s.status).toBe("idle");
    expect(s.resumable).toBe(true);
    expect(shouldAutoStartExpress(s.status)).toBe(true);
  });

  it("idle empty project is not resumable", () => {
    const s = deriveExpressStatusFromDisk({
      sectionsFilled: 0,
      sectionsTotal: 27,
      persisted: null,
    });
    expect(s.status).toBe("idle");
    expect(s.resumable).toBe(false);
  });
});

describe("shouldAutoStartExpress", () => {
  it("only auto-starts idle", () => {
    expect(shouldAutoStartExpress("idle")).toBe(true);
    expect(shouldAutoStartExpress("cancelled")).toBe(false);
    expect(shouldAutoStartExpress("failed")).toBe(false);
    expect(shouldAutoStartExpress("running")).toBe(false);
    expect(shouldAutoStartExpress("done")).toBe(false);
  });
});

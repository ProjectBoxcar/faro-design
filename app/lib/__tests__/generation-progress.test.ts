import { describe, expect, it } from "vitest";
import {
  countBasedPercent,
  peakPercent,
  stageStatus,
  timeBasedPercent,
  LOGO_STAGES,
} from "@/lib/generation-progress";

describe("countBasedPercent", () => {
  it("is 100 when done >= total", () => {
    expect(countBasedPercent({ done: 3, total: 3 })).toBe(100);
  });

  it("starts from real completion floor (never drops below base when soft timer resets)", () => {
    const baseAtOne = countBasedPercent({ done: 1, total: 3, secondsInCurrent: 0 });
    expect(baseAtOne).toBeGreaterThanOrEqual(33);
    expect(baseAtOne).toBeLessThan(50);
    // Even at 0 seconds into next unit, still at least the floor from done=1
    const later = countBasedPercent({ done: 1, total: 3, secondsInCurrent: 0 });
    expect(later).toBe(baseAtOne);
  });

  it("creeps upward within a unit without completing the slot", () => {
    const early = countBasedPercent({ done: 0, total: 3, secondsInCurrent: 5, secondsPerUnit: 60 });
    const late = countBasedPercent({ done: 0, total: 3, secondsInCurrent: 90, secondsPerUnit: 60 });
    expect(late).toBeGreaterThan(early);
    expect(late).toBeLessThan(34); // less than one full third claimed
  });

  it("does not sawtooth when seconds keep increasing (no modulo)", () => {
    const samples = [10, 40, 70, 100, 130].map((s) =>
      countBasedPercent({ done: 1, total: 3, secondsInCurrent: s, secondsPerUnit: 60 })
    );
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
  });
});

describe("peakPercent", () => {
  it("never decreases", () => {
    expect(peakPercent(80, 40)).toBe(80);
    expect(peakPercent(40, 55)).toBe(55);
  });
});

describe("timeBasedPercent", () => {
  it("stays under 100 and rises with time", () => {
    const a = timeBasedPercent(10, 120);
    const b = timeBasedPercent(90, 120);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(100);
  });
});

describe("stageStatus", () => {
  it("marks logo stages by progress fraction", () => {
    const early = stageStatus(LOGO_STAGES, 0.05);
    expect(early[0].state).toBe("active");
    expect(early[1].state).toBe("pending");

    const mid = stageStatus(LOGO_STAGES, 0.4);
    expect(mid[0].state).toBe("done");
    expect(mid[1].state).toBe("active");

    const late = stageStatus(LOGO_STAGES, 0.85);
    expect(late[2].state).toBe("active");
  });
});

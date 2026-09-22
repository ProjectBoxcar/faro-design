import { describe, expect, it } from "vitest";
import {
  isFaroMood,
  moodForScene,
  FARO_BRAND_PERSONALITY,
} from "@/lib/faro-persona";

describe("faro-persona", () => {
  it("maps moods and scenes", () => {
    expect(isFaroMood("proud")).toBe(true);
    expect(isFaroMood("angry")).toBe(false);
    expect(moodForScene("handover")).toBe("proud");
    expect(moodForScene("settings")).toBe("careful");
  });

  it("carries brand promise", () => {
    expect(FARO_BRAND_PERSONALITY.promise).toMatch(/explain/i);
    expect(FARO_BRAND_PERSONALITY.kicker).toMatch(/Strategy first/i);
  });
});

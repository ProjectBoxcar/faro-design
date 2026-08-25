import { describe, expect, it } from "vitest";
import { dockNearRect, SCENE_ANCHORS } from "@/lib/faro-assistant-anchors";

describe("faro-assistant-anchors", () => {
  it("has anchors for major scenes", () => {
    expect(SCENE_ANCHORS.home[0]).toBe("faro-start-brand");
    expect(SCENE_ANCHORS.strategy.length).toBeGreaterThan(0);
    expect(SCENE_ANCHORS.design[0]).toBe("faro-design-handover");
  });

  it("docks to the right when space allows", () => {
    // mock window size for clamp
    const d = dockNearRect(
      { left: 100, top: 200, width: 120, height: 40, right: 220, bottom: 240 },
      280,
      200,
      12,
      ["right", "left"]
    );
    expect(d.placement).toBe("right");
    expect(d.left).toBeGreaterThan(220);
  });
});

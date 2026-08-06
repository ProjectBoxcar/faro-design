import { describe, expect, it } from "vitest";
import {
  layoutLockCss,
  suggestLayoutFromMedia,
} from "@/lib/content-studio/layout-pure";
import { normalizeMediaAnalysis } from "@/lib/content-studio/media-analysis-pure";

describe("layout-pure (P3)", () => {
  it("puts type at bottom when faces are upper/center", () => {
    const card = normalizeMediaAnalysis({
      summary: "Three friends smiling in a cinema lobby",
      subjects: ["people"],
      people: true,
      facesVisible: true,
      composition: "faces in upper third, poster behind",
      cluster: "people",
    });
    const layout = suggestLayoutFromMedia(card, "instagram");
    expect(layout.typeZone).toBe("bottom");
    expect(layout.template).toBe("photo-led-bottom-type");
    expect(layout.scrim).toMatch(/medium|strong/);
    expect(layout.instructions).toMatch(/Faces are visible/i);
  });

  it("uses architecture-friendly layout", () => {
    const card = normalizeMediaAnalysis({
      summary: "Brick street and apartment building",
      subjects: ["street"],
      people: false,
      facesVisible: false,
      composition: "road leads left to right",
      cluster: "architecture",
      orientation: "portrait",
    });
    const layout = suggestLayoutFromMedia(card, "instagram");
    expect(layout.typeZone).toBe("bottom");
    expect(layout.objectPosition).toBeTruthy();
  });

  it("linkedin landscape prefers readable band", () => {
    const card = normalizeMediaAnalysis({
      summary: "Wide street",
      cluster: "place",
      orientation: "landscape",
    });
    const layout = suggestLayoutFromMedia(card, "linkedin");
    expect(["bottom", "left", "right", "top", "center"]).toContain(layout.typeZone);
    expect(layout.instructions).toMatch(/linkedin/i);
  });

  it("emits layout lock CSS with object-position", () => {
    const layout = suggestLayoutFromMedia(
      normalizeMediaAnalysis({
        summary: "Dog in park",
        cluster: "pet",
        subjects: ["dog"],
      }),
      "instagram"
    );
    const css = layoutLockCss(layout, 1080, 1350);
    expect(css).toMatch(/object-position/);
    expect(css).toMatch(/1080px/);
    expect(css).toMatch(/cs-type-zone|type-zone/);
  });
});

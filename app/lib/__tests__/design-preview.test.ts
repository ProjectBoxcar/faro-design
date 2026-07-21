import { describe, expect, it } from "vitest";
import { buildArtifactPreviewHtml } from "@/lib/design-preview";

const identityHtml = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=1440, initial-scale=.25"><title>Identity</title></head>
<body style="transform:scale(.25)"><nav><a href="#color">Colors</a></nav><section id="color"><h2>Colors</h2></section></body></html>`;

describe("buildArtifactPreviewHtml", () => {
  it("normalizes identity previews and intercepts section navigation", () => {
    const output = buildArtifactPreviewHtml(identityHtml, "design_system");
    expect(output).toContain('content="width=device-width, initial-scale=1"');
    expect(output).toContain("data-faro-preview-reset");
    expect(output).toContain("body{zoom:1!important;transform:none!important");
    expect(output).toContain("data-faro-preview-bridge");
    expect(output).toContain("event.stopImmediatePropagation()");
    expect(output).toContain("scrollIntoView");
  });

  it("does not rewrite landing page or deck behavior", () => {
    expect(buildArtifactPreviewHtml(identityHtml, "landing_page")).toBe(identityHtml);
    expect(buildArtifactPreviewHtml(identityHtml, "deck")).toBe(identityHtml);
  });

  it("provides an empty preview document when content is missing", () => {
    expect(buildArtifactPreviewHtml(null, "design_system")).toContain("No preview available.");
  });
});

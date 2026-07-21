import { describe, expect, it } from "vitest";
import { externalResourceUrls, generatedArtifactIssues } from "@/lib/design-validation";

const base = (body: string) => `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><style>@media(prefers-reduced-motion:reduce){*{animation:none}}</style></head><body>${body}</body></html>`;

describe("generatedArtifactIssues", () => {
  it("accepts a complete offline identity artifact", () => {
    const html = base('<section id="logo"><svg></svg></section><section id="color"></section><section id="type"></section><section id="components"></section>');
    expect(generatedArtifactIssues("design_system", html)).toEqual([]);
  });

  it("detects missing landing-page behavior", () => {
    const issues = generatedArtifactIssues("landing_page", base('<section id="faq"></section><script>new IntersectionObserver(()=>{})</script>'));
    expect(issues).toContain("missing mobile menu hook");
  });

  it("requires exactly twelve numbered deck slides", () => {
    const slides = Array.from({ length: 11 }, (_, index) => `<section data-slide="${index + 1}"></section>`).join("");
    const issues = generatedArtifactIssues("deck", base(`${slides}<script>if(e.key==='ArrowRight'){};addEventListener('touchstart',()=>{})</script>`));
    expect(issues).toContain("deck must contain exactly 12 numbered slides");
  });
});

describe("externalResourceUrls", () => {
  it("detects remote dependencies but allows data assets", () => {
    expect(externalResourceUrls('<link href="https://fonts.example/font.css"><img src="data:image/svg+xml;base64,abc">')).toEqual(["https://fonts.example/font.css"]);
    expect(externalResourceUrls('<script src=//cdn.example/app.js></script>')).toEqual(["//cdn.example/app.js"]);
    expect(externalResourceUrls('<img src="file://server/share/image.png">')).toEqual(["file://server/share/image.png"]);
  });

  it("does not accept validation words hidden in comments", () => {
    const html = '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"></head><body><!-- id="logo" @media(prefers-reduced-motion: reduce) --></body></html>';
    const issues = generatedArtifactIssues("design_system", html);
    expect(issues).toContain("missing reduced-motion behavior");
    expect(issues).toContain("missing #logo section");
  });
});

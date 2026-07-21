import { describe, expect, it } from "vitest";
import { sanitizeStudioSvg } from "@/lib/studio-svg";

describe("sanitizeStudioSvg", () => {
  it("removes executable and externally referenced SVG content", () => {
    const unsafe = '<svg onclick="alert(1)"><script>alert(1)</script><foreignObject>html</foreignObject><image href="https://example.com/a.png"/><a xlink:href="javascript:alert(1)"><path d="M0 0"/></a><use href="#local"/></svg>';
    const safe = sanitizeStudioSvg(unsafe);
    expect(safe).not.toMatch(/script|foreignObject|onclick|https:\/\/|javascript:/i);
    expect(safe).toContain('<path d="M0 0"/>');
    expect(safe).toContain('href="#local"');
  });
});

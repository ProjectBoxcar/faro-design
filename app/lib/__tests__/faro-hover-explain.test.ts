import { describe, expect, it } from "vitest";
import { explainElement } from "@/lib/faro-hover-explain";

/** Minimal stand-in for HTMLElement (node test env has no document). */
function fakeEl(attrs: Record<string, string>, text = ""): HTMLElement {
  const map = new Map(Object.entries(attrs));
  return {
    getAttribute: (k: string) => map.get(k) ?? null,
    tagName: "BUTTON",
    innerText: text,
    textContent: text,
  } as unknown as HTMLElement;
}

describe("faro-hover-explain", () => {
  it("explains known anchors via catalog", () => {
    const exp = explainElement(
      fakeEl({ "data-faro-anchor": "faro-start-brand" }, "Start"),
      "en"
    );
    expect(exp?.body.toLowerCase()).toMatch(/interview|strategy|approve/);
  });

  it("uses data-faro-explain when present", () => {
    const exp = explainElement(
      fakeEl({ "data-faro-explain": "Custom help for this control." }, "Magic"),
      "en"
    );
    expect(exp?.body).toContain("Custom help");
  });

  it("falls back to button heuristic", () => {
    const exp = explainElement(fakeEl({}, "Save draft"), "en");
    expect(exp?.title).toMatch(/Save draft/i);
    expect(exp?.body).toMatch(/button/i);
  });
});

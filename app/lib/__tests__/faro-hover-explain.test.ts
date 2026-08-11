import { describe, expect, it } from "vitest";
import { explainElement } from "@/lib/faro-hover-explain";

describe("faro-hover-explain", () => {
  it("explains known anchors via catalog", () => {
    const el = document.createElement("button");
    el.setAttribute("data-faro-anchor", "faro-start-brand");
    el.textContent = "Start";
    const exp = explainElement(el, "en");
    expect(exp?.body.toLowerCase()).toMatch(/interview|strategy|approve/);
  });

  it("uses data-faro-explain when present", () => {
    const el = document.createElement("button");
    el.setAttribute("data-faro-explain", "Custom help for this control.");
    el.textContent = "Magic";
    const exp = explainElement(el, "en");
    expect(exp?.body).toContain("Custom help");
  });

  it("falls back to button heuristic", () => {
    const el = document.createElement("button");
    el.textContent = "Save draft";
    const exp = explainElement(el, "en");
    expect(exp?.title).toMatch(/Save draft/i);
    expect(exp?.body).toMatch(/button/i);
  });
});

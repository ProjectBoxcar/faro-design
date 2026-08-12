import { describe, expect, it } from "vitest";
import { matchProductKnowledge } from "@/lib/faro-product-knowledge";
import { explainElement } from "@/lib/faro-hover-explain";

function fakeEl(attrs: Record<string, string>, text = "", tag = "BUTTON"): HTMLElement {
  const map = new Map(Object.entries(attrs));
  return {
    getAttribute: (k: string) => map.get(k) ?? null,
    tagName: tag,
    innerText: text,
    textContent: text,
    closest: () => null,
  } as unknown as HTMLElement;
}

describe("product knowledge explain", () => {
  it("matches approve strategy by label", () => {
    const m = matchProductKnowledge({ label: "Approve strategy · continue to brand name" });
    expect(m?.id).toBe("approveStrategy");
  });

  it("explains design handover with deep insight", () => {
    const exp = explainElement(
      fakeEl({ "data-faro-anchor": "faro-design-handover" }, "Open Brand Handover"),
      "en",
      "/projects/x/design"
    );
    expect(exp?.deep).toBe(true);
    expect(exp?.body.toLowerCase()).toMatch(/package|handover|publish|final/);
    expect(exp?.body.toLowerCase()).not.toMatch(/something nice|following page|freeze/);
  });

  it("approve strategy does not claim full package share", () => {
    const exp = explainElement(
      fakeEl({ "data-faro-anchor": "faro-express-approve" }, "Approve strategy"),
      "en",
      "/projects/x/express"
    );
    expect(exp?.deep).toBe(true);
    expect(exp?.body.toLowerCase()).toMatch(/naming|name/);
    expect(exp?.body.toLowerCase()).not.toMatch(/freeze/);
  });

  it("uses href knowledge for /settings links", () => {
    const el = fakeEl({ href: "/settings" }, "Settings", "A");
    (el as unknown as { closest: (s: string) => HTMLElement | null }).closest = (sel: string) =>
      sel.includes("a[href]") ? el : null;
    const exp = explainElement(el, "en", "/");
    expect(exp?.deep).toBe(true);
    expect(exp?.body.toLowerCase()).toMatch(/key|lane|local|claude|logo/);
  });

  it("has EN and ES knowledge for name confirm anchor", () => {
    const en = explainElement(
      fakeEl({ "data-faro-anchor": "faro-name-confirm" }, "Confirm"),
      "en"
    );
    const es = explainElement(
      fakeEl({ "data-faro-anchor": "faro-name-confirm" }, "Confirm"),
      "es"
    );
    expect(en?.deep && es?.deep).toBe(true);
    expect(en?.body).not.toEqual(es?.body);
  });
});

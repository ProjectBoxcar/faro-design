import { describe, expect, it } from "vitest";
import {
  buildFaroDeliverable,
  finalDeliverableIssue,
  missingFinalKinds,
  sanitizeDownloadName,
} from "@/lib/design-deliverable";

const assets = [
  {
    id: "identity-a",
    kind: "design_system" as const,
    selected: true,
    variant: "A",
    design_system_id: null,
    name: "Identity A",
    html: "<!DOCTYPE html><html><body>identity-final</body></html>",
  },
  {
    id: "landing-b",
    kind: "landing_page" as const,
    selected: true,
    variant: "B",
    design_system_id: "identity-a",
    name: "Landing B",
    html: "<!DOCTYPE html><html><body>landing-final</body></html>",
  },
  {
    id: "deck-c",
    kind: "deck" as const,
    selected: true,
    variant: "C",
    design_system_id: "identity-a",
    name: "Deck C",
    html: "<!DOCTYPE html><html><body>deck-final</body></html>",
  },
];

describe("final deliverable readiness", () => {
  it("lists outputs without a usable final proposal", () => {
    expect(missingFinalKinds([])).toEqual(["design_system", "landing_page", "deck"]);
    expect(missingFinalKinds(assets)).toEqual([]);
  });

  it("rejects final assets that depend on external resources", () => {
    const external = assets.map((asset) =>
      asset.kind === "design_system"
        ? { ...asset, html: '<!DOCTYPE html><html><head><link href="https://fonts.example/test.css"></head><body></body></html>' }
        : asset
    );
    expect(finalDeliverableIssue(external)).toMatch(/external resources/);
  });

  it("rejects downstream finals created from another identity system", () => {
    const misaligned = assets.map((asset) =>
      asset.kind === "landing_page" ? { ...asset, design_system_id: "identity-old" } : asset
    );
    expect(finalDeliverableIssue(misaligned)).toBe(
      "Choose a final Landing Page generated from the final Brand Identity System."
    );
  });
});

describe("buildFaroDeliverable", () => {
  it("creates one isolated package containing all final outputs", () => {
    const html = buildFaroDeliverable("North & <South>", assets, new Date("2026-07-20T00:00:00Z"));
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("North &amp; &lt;South&gt;");
    expect(html).toContain("Created with Faro");
    expect(html).toContain('sandbox="allow-scripts"');
    expect(html).not.toContain("allow-same-origin");
    expect(html).toContain(Buffer.from(assets[0].html, "utf8").toString("base64"));
    expect(html).toContain(Buffer.from(assets[1].html, "utf8").toString("base64"));
    expect(html).toContain(Buffer.from(assets[2].html, "utf8").toString("base64"));
  });

  it("does not interpolate project markup into executable HTML", () => {
    const html = buildFaroDeliverable("</title><script>alert(1)</script>", assets);
    expect(html).not.toContain("</title><script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

describe("sanitizeDownloadName", () => {
  it("produces Windows-safe download names", () => {
    expect(sanitizeDownloadName("../../Fáro: Brand?" )).toBe("Faro-Brand");
    expect(sanitizeDownloadName("CON")).toBe("brand-CON");
    expect(sanitizeDownloadName("   ")).toBe("brand");
  });
});

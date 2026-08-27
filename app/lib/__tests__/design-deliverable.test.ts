import { describe, expect, it } from "vitest";
import {
  buildFaroDeliverable,
  finalDeliverableIssue,
  missingFinalKinds,
  missingPackageKinds,
  sanitizeDownloadName,
} from "@/lib/design-deliverable";

function asset(
  partial: Partial<{
    id: string;
    kind: string;
    selected: boolean;
    variant: string | null;
    design_system_id: string | null;
    name: string;
    html: string | null;
  }>
) {
  return {
    id: partial.id ?? "x",
    kind: partial.kind as never,
    selected: partial.selected ?? true,
    variant: partial.variant ?? "A",
    design_system_id: partial.design_system_id ?? null,
    name: partial.name ?? "Asset",
    html: partial.html ?? "<!DOCTYPE html><html><body>ok</body></html>",
  };
}

const identityId = "identity-a";

const coreThree = [
  asset({
    id: identityId,
    kind: "design_system",
    name: "Identity A",
    html: "<!DOCTYPE html><html><body>identity-final</body></html>",
  }),
  asset({
    id: "landing-b",
    kind: "landing_page",
    variant: "B",
    design_system_id: identityId,
    name: "Landing B",
    html: "<!DOCTYPE html><html><body>landing-final</body></html>",
  }),
  asset({
    id: "deck-c",
    kind: "deck",
    variant: "C",
    design_system_id: identityId,
    name: "Deck C",
    html: "<!DOCTYPE html><html><body>deck-final</body></html>",
  }),
];

const channels = (["sms", "email", "ad", "print"] as const).map((kind, i) =>
  asset({
    id: `${kind}-${i}`,
    kind,
    design_system_id: identityId,
    name: kind,
    html: `<!DOCTYPE html><html><body>${kind}</body></html>`,
  })
);

const fullPackage = [...coreThree, ...channels];

describe("final deliverable readiness", () => {
  it("lists core visual kinds without a usable final proposal", () => {
    expect(missingFinalKinds([])).toEqual(["design_system", "landing_page", "deck"]);
    expect(missingFinalKinds(coreThree)).toEqual([]);
  });

  it("requires channel templates for the full package", () => {
    expect(missingPackageKinds(coreThree)).toEqual(["sms", "email", "ad", "print"]);
    expect(missingPackageKinds(fullPackage)).toEqual([]);
    expect(finalDeliverableIssue(coreThree)).toMatch(/SMS Template/);
  });

  it("rejects final assets that depend on external resources", () => {
    const external = fullPackage.map((a) =>
      a.kind === "design_system"
        ? {
            ...a,
            html: '<!DOCTYPE html><html><head><link href="https://fonts.example/test.css"></head><body></body></html>',
          }
        : a
    );
    expect(finalDeliverableIssue(external)).toMatch(/external resources/);
  });

  it("rejects channel templates with external resources", () => {
    const poisoned = fullPackage.map((a) =>
      a.kind === "sms"
        ? {
            ...a,
            html: '<!DOCTYPE html><html><head><link href="https://evil.example/x.css"></head><body>sms</body></html>',
          }
        : a
    );
    expect(finalDeliverableIssue(poisoned)).toMatch(/SMS Template.*external resources/);
  });

  it("rejects downstream finals created from another identity system", () => {
    const misaligned = fullPackage.map((a) =>
      a.kind === "landing_page" ? { ...a, design_system_id: "identity-old" } : a
    );
    expect(finalDeliverableIssue(misaligned)).toBe(
      "Choose a final Landing Page generated from the final Brand Identity System."
    );
  });

  it("rejects channel finals created from another identity system", () => {
    const misaligned = fullPackage.map((a) =>
      a.kind === "email" ? { ...a, design_system_id: "identity-old" } : a
    );
    expect(finalDeliverableIssue(misaligned)).toBe(
      "Choose a final Email Template generated from the final Brand Identity System."
    );
  });

  it("passes when all seven package finals are selected and aligned", () => {
    expect(finalDeliverableIssue(fullPackage)).toBeNull();
  });
});

describe("buildFaroDeliverable", () => {
  it("creates one isolated package containing all final outputs including channels", () => {
    const html = buildFaroDeliverable("North & <South>", fullPackage, {
      generatedAt: new Date("2026-07-20T00:00:00Z"),
    });
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("North &amp; &lt;South&gt;");
    expect(html).toContain("Created with Faro");
    expect(html).toContain('sandbox="allow-scripts"');
    expect(html).not.toContain("allow-same-origin");
    expect(html).toContain("SMS Template");
    expect(html).toContain("Email Template");
    expect(html).toContain(Buffer.from(fullPackage[0].html!, "utf8").toString("base64"));
    expect(html).toContain(Buffer.from(fullPackage[3].html!, "utf8").toString("base64"));
  });

  it("does not interpolate project markup into executable HTML", () => {
    const html = buildFaroDeliverable("</title><script>alert(1)</script>", fullPackage);
    expect(html).not.toContain("</title><script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

describe("sanitizeDownloadName", () => {
  it("keeps readable names", () => {
    expect(sanitizeDownloadName("Tide & Timber")).toMatch(/Tide/);
  });
});

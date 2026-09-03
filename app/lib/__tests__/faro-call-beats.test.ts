import { describe, expect, it } from "vitest";
import { buildFaroCallContext } from "@/lib/faro-call/beats";
import type { CallAgendaItem } from "@/lib/faro-call/types";

const agenda: CallAgendaItem[] = [
  { id: "strategy", name: "Strategy", status: "done", detail: "Ready" },
  { id: "name", name: "Brand name", status: "done", detail: "Confirmed" },
  { id: "logo", name: "Logo", status: "current", detail: "Approve" },
  { id: "design", name: "Design", status: "todo", detail: "Build" },
  { id: "handover", name: "Handover", status: "locked", detail: "Locked" },
  { id: "content", name: "Content", status: "locked", detail: "Locked" },
];

describe("buildFaroCallContext", () => {
  it("builds beats grounded in snapshot assets and starts near current stage", () => {
    const ctx = buildFaroCallContext("proj1", agenda, {
      projectName: "Tide & Timber",
      confirmedName: "Tide & Timber",
      conceptLine: "Coastal craft, not kitsch.",
      manifestoLine: null,
      logoSvg: "<svg></svg>",
      logoSvgOnDark: "<svg></svg>",
      identityHtml: null,
      landingHtml: null,
      deckHtml: null,
      channelLabels: [],
      packageReady: false,
      contentReady: false,
      shareHref: null,
      contentHref: "/projects/proj1/content",
      handoverHref: "/projects/proj1/handover",
      designHref: "/projects/proj1/design",
      expressHref: "/projects/proj1/express",
      nameHref: "/projects/proj1/name",
      logoHref: "/projects/proj1/studio",
    });

    expect(ctx.beats.length).toBeGreaterThan(4);
    expect(ctx.beats[0].id).toBe("welcome");
    expect(ctx.beats.some((b) => b.id === "logo-show")).toBe(true);
    expect(ctx.beats.find((b) => b.id === "logo-show")?.media.kind).toBe("logo");
    expect(ctx.projectName).toBe("Tide & Timber");
    const start = ctx.beats[ctx.startBeatIndex];
    expect(start.stageId).toBe("logo");
    const close = ctx.beats.find((b) => b.id === "close");
    expect(close).toBeTruthy();
    expect(close?.stageId).toBe("content");
  });

  it("localizes spoken lines for Spanish", () => {
    const ctx = buildFaroCallContext(
      "proj1",
      agenda,
      {
        projectName: "Tide & Timber",
        confirmedName: "Tide & Timber",
        conceptLine: "Coastal craft, not kitsch.",
        manifestoLine: null,
        logoSvg: "<svg></svg>",
        logoSvgOnDark: "<svg></svg>",
        identityHtml: null,
        landingHtml: null,
        deckHtml: null,
        channelLabels: [],
        packageReady: false,
        contentReady: false,
        shareHref: null,
        contentHref: "/projects/proj1/content",
        handoverHref: "/projects/proj1/handover",
        designHref: "/projects/proj1/design",
        expressHref: "/projects/proj1/express",
        nameHref: "/projects/proj1/name",
        logoHref: "/projects/proj1/studio",
      },
      "es"
    );
    expect(ctx.beats[0].line).toMatch(/Hola, soy Faro/i);
    expect(ctx.beats.find((b) => b.id === "strategy-open")?.media.title).toMatch(/Estrategia/i);
  });

  it("wires shareHref into handover CTA when package is ready", () => {
    const ctx = buildFaroCallContext("proj1", agenda, {
      projectName: "Tide & Timber",
      confirmedName: "Tide & Timber",
      conceptLine: null,
      manifestoLine: null,
      logoSvg: null,
      logoSvgOnDark: null,
      identityHtml: "<div/>",
      landingHtml: "<div/>",
      deckHtml: "<div/>",
      channelLabels: [{ label: "SMS template", ready: true }],
      packageReady: true,
      contentReady: false,
      shareHref: "/share/abc",
      contentHref: "/projects/proj1/content",
      handoverHref: "/projects/proj1/handover",
      designHref: "/projects/proj1/design",
      expressHref: "/projects/proj1/express",
      nameHref: "/projects/proj1/name",
      logoHref: "/projects/proj1/studio",
    });
    const handover = ctx.beats.find((b) => b.id === "handover");
    expect(handover?.media.ctaHref).toBe("/share/abc");
  });
});

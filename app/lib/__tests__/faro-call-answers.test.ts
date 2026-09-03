import { describe, expect, it } from "vitest";
import {
  sanitizeSpokenText,
  tryAnswerCallQuestion,
  callGuideUnavailableMessage,
} from "@/lib/faro-call/call-answers";
import type { CallAgendaItem } from "@/lib/faro-call/types";

const agenda: CallAgendaItem[] = [
  { id: "strategy", name: "1. Strategy", status: "done", detail: "Ready" },
  { id: "name", name: "2. Brand name", status: "done", detail: "Confirmed" },
  { id: "logo", name: "3. Logo Workshop", status: "done", detail: "Approved" },
  { id: "design", name: "4. Design Studio", status: "current", detail: "Finish channels" },
  { id: "handover", name: "5. Brand Handover", status: "locked", detail: "Locked" },
  { id: "content", name: "6. Content Studio", status: "locked", detail: "Locked" },
];

const ctx = {
  projectName: "Tide & Timber",
  agenda,
  beats: [],
};

describe("sanitizeSpokenText", () => {
  it("strips markdown and collapses space", () => {
    expect(sanitizeSpokenText("  **Hello** `world`  ")).toBe("Hello world");
  });

  it("strips emoji, markdown links, and bare urls", () => {
    expect(sanitizeSpokenText("Hi 👋 see [docs](https://x.test/a) and https://y.test/b now")).toBe(
      "Hi see docs and now"
    );
  });
});

describe("tryAnswerCallQuestion", () => {
  it("answers logo status factually and jumps to logo", () => {
    const a = tryAnswerCallQuestion("Do we have an approved logo?", ctx);
    expect(a?.text).toMatch(/Yes/i);
    expect(a?.text).toMatch(/Tide & Timber/);
    expect(a?.jumpStageId).toBe("logo");
  });

  it("answers bare logo?", () => {
    const a = tryAnswerCallQuestion("logo?", ctx);
    expect(a?.text).toMatch(/Yes|Not yet/i);
    expect(a?.jumpStageId).toBe("logo");
  });

  it("answers what's left with current + locked stages", () => {
    const a = tryAnswerCallQuestion("What's left?", ctx);
    expect(a?.text).toMatch(/Design Studio/i);
    expect(a?.text).toMatch(/locked/i);
  });

  it("answers handover readiness", () => {
    const a = tryAnswerCallQuestion("Can I download the package?", ctx);
    expect(a?.text).toMatch(/Not yet/i);
    expect(a?.text).toMatch(/channel/i);
    expect(a?.jumpStageId).toBe("handover");
  });

  it("returns null for open-ended questions", () => {
    expect(tryAnswerCallQuestion("What should our brand feel like emotionally?", ctx)).toBeNull();
  });

  it("answers Spanish logo questions", () => {
    const a = tryAnswerCallQuestion("¿Tenemos logo aprobado?", ctx, "es");
    expect(a?.text).toMatch(/Sí/i);
    expect(a?.jumpStageId).toBe("logo");
  });

  it("answers Spanish what's left", () => {
    const a = tryAnswerCallQuestion("¿Qué falta?", ctx, "es");
    expect(a?.text).toMatch(/Design Studio|bloqueado/i);
  });
});

describe("callGuideUnavailableMessage", () => {
  it("returns honest EN / ES copy about Settings key", () => {
    expect(callGuideUnavailableMessage("en")).toMatch(/Settings/i);
    expect(callGuideUnavailableMessage("en")).not.toMatch(/Ask me anything about this project's strategy/i);
    expect(callGuideUnavailableMessage("es")).toMatch(/Ajustes/i);
  });
});

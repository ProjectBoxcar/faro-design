import { describe, expect, it } from "vitest";
import {
  sanitizeSpokenText,
  tryAnswerCallQuestion,
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
});

describe("tryAnswerCallQuestion", () => {
  it("answers logo status factually", () => {
    const a = tryAnswerCallQuestion("Do we have an approved logo?", ctx);
    expect(a).toMatch(/Yes/i);
    expect(a).toMatch(/Tide & Timber/);
  });

  it("answers what's left with current + locked stages", () => {
    const a = tryAnswerCallQuestion("What's left?", ctx);
    expect(a).toMatch(/Design Studio/i);
    expect(a).toMatch(/locked/i);
  });

  it("answers handover readiness", () => {
    const a = tryAnswerCallQuestion("Can I download the package?", ctx);
    expect(a).toMatch(/Not yet/i);
    expect(a).toMatch(/channel/i);
  });

  it("returns null for open-ended questions", () => {
    expect(tryAnswerCallQuestion("What should our brand feel like emotionally?", ctx)).toBeNull();
  });
});

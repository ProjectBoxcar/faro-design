import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/ai", () => ({
  hasApiKey: vi.fn(() => false),
  generateStrategyText: vi.fn(),
  MODELS: { parsing: "test" },
}));

vi.mock("@/lib/design", () => ({ listAssets: () => [] }));
vi.mock("@/lib/design-deliverable", () => ({ finalDeliverableIssue: () => null }));
vi.mock("@/lib/queries", () => ({
  getProject: () => null,
  getSections: () => [],
}));
vi.mock("@/lib/naming-propose", () => ({ hasConfirmedBrandName: () => false }));
vi.mock("@/lib/sidebar-journey", () => ({
  buildProjectJourney: () => ({ stages: [], overall: { done: 0, total: 0 } }),
  primaryActionFromJourney: () => null,
}));
vi.mock("@/lib/studio", () => ({ hasApprovedLogo: () => false }));

import { hasApiKey } from "@/lib/ai";
import { generateCoachGuidance } from "@/lib/journey-coach-ai";
import { callGuideUnavailableMessage } from "@/lib/faro-call/call-answers";

describe("Faro Call coach fallback", () => {
  beforeEach(() => {
    vi.mocked(hasApiKey).mockReturnValue(false);
  });

  it("does not answer a call question with the static call tip when no API key", async () => {
    const res = await generateCoachGuidance({
      pathname: "/projects/abc/call",
      question: "Do we have a logo?",
      locale: "en",
      mode: "call",
    });
    expect(res.source).toBe("fallback");
    expect(res.aiAvailable).toBe(false);
    expect(res.body).toBe(callGuideUnavailableMessage("en"));
    expect(res.body).not.toMatch(/Ask me anything about this project's strategy/i);
  });

  it("returns Spanish unavailable copy for es locale", async () => {
    const res = await generateCoachGuidance({
      pathname: "/projects/abc/call",
      question: "¿Tenemos logo?",
      locale: "es",
      mode: "call",
    });
    expect(res.body).toBe(callGuideUnavailableMessage("es"));
  });
});

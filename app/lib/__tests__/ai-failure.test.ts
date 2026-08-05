import { describe, expect, it } from "vitest";
import { classifyAiFailure, formatClassifiedFailure } from "@/lib/ai-failure";

describe("classifyAiFailure", () => {
  it("never suggests using OpenAI/Gemini when Open Design is down", () => {
    const c = classifyAiFailure(
      new Error("Open Design daemon is not running. Run start.bat / start.ps1, or start-open-design.ps1 (port 7456)."),
      "design"
    );
    expect(c.code).toBe("open_design_down");
    expect(c.hint).toMatch(/7456|open design/i);
    // Explicit anti-fallback is OK; "use OpenAI instead" is not.
    expect(c.hint.toLowerCase()).toMatch(/will not fall back|not openai|not.*gemini/i);
    expect(c.hint.toLowerCase()).not.toMatch(/use openai|switch to openai|try gemini for design/i);
    expect(c.retriable).toBe(true);
  });

  it("keeps logo failures on OpenAI/Gemini path", () => {
    const c = classifyAiFailure(new Error("No OpenAI logo key — save an OpenAI API key"), "logo");
    expect(c.code).toBe("missing_logo_key");
    expect(c.hint).toMatch(/OpenAI|Gemini/i);
    expect(c.hint.toLowerCase()).toMatch(/not used for logos|logo workshop/i);
    expect(c.hint.toLowerCase()).not.toMatch(/use open design for logo|strategy key for logo/i);
  });

  it("keeps strategy rate limits on strategy resume", () => {
    const c = classifyAiFailure(new Error("429 rate limit exceeded"), "strategy");
    expect(c.code).toBe("rate_limit");
    expect(c.retriable).toBe(true);
    expect(c.hint.toLowerCase()).toMatch(/resume strategy|strategy drafting/i);
    // Anti-cross-lane wording is fine; do not recommend alternate engines as a fix.
    expect(c.hint.toLowerCase()).not.toMatch(/try logo|switch to open design|use open design instead/i);
  });

  it("classifies cancel as resumable without scaring the owner", () => {
    const err = new Error("Generation stopped.");
    err.name = "GenerationCancelled";
    const c = classifyAiFailure(err, "strategy");
    expect(c.code).toBe("cancelled");
    expect(c.retriable).toBe(true);
  });

  it("formatClassifiedFailure includes hint for storage", () => {
    const c = classifyAiFailure(new Error("Open Design daemon is not running"), "design");
    const s = formatClassifiedFailure(c);
    expect(s).toMatch(/Open Design/i);
    expect(s.length).toBeGreaterThan(c.message.length);
  });
});

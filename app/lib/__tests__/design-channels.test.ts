import { describe, expect, it } from "vitest";
import { CHANNEL_ASSET_KINDS } from "@/lib/db/types";
import { channelTemplatePrompt } from "@/lib/design-prompts";

describe("channel design templates", () => {
  it("defines four channel kinds", () => {
    expect(CHANNEL_ASSET_KINDS).toEqual(["sms", "email", "ad", "print"]);
  });

  it("builds offline HTML prompts grounded in brief + system", () => {
    for (const kind of CHANNEL_ASSET_KINDS) {
      const prompt = channelTemplatePrompt(kind, "BRIEF: coastal honey", "<html>system</html>");
      expect(prompt).toMatch(/<!DOCTYPE html>|BRAND STRATEGY|DESIGN SYSTEM/i);
      expect(prompt).toMatch(/offline|no remote/i);
      expect(prompt).toContain("BRIEF: coastal honey");
      expect(prompt.toLowerCase()).toMatch(/logo/);
    }
  });
});

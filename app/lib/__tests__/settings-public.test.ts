import { describe, expect, it } from "vitest";
import { publicProviderConfig } from "@/lib/settings-public";

describe("publicProviderConfig", () => {
  it("never exposes the configured API key", () => {
    const result = publicProviderConfig({
      provider: "anthropic",
      apiKey: "sk-secret-value",
      baseUrl: null,
      model: "claude-opus-4-8",
    });
    expect(result).toEqual({
      provider: "anthropic",
      baseUrl: null,
      model: "claude-opus-4-8",
    });
    expect("apiKey" in result).toBe(false);
  });
});

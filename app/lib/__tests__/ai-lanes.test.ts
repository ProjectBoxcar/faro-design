import { describe, expect, it } from "vitest";
import {
  AI_LANES,
  AI_LANE_ORDER,
  assertEngineForLane,
  engineLabel,
  isAnthropicKeyShape,
  isLogoPrimaryKeyShape,
  summarizeLaneHealth,
  type AiEngineId,
  type AiLaneId,
} from "@/lib/ai-lanes";

describe("AI_LANES invariants", () => {
  it("defines exactly three lanes in fixed order", () => {
    expect(AI_LANE_ORDER).toEqual(["strategy", "logo", "design"]);
    expect(Object.keys(AI_LANES).sort()).toEqual(["design", "logo", "strategy"]);
  });

  it("keeps allowed engines disjoint across lanes", () => {
    const seen = new Map<AiEngineId, AiLaneId>();
    for (const lane of AI_LANE_ORDER) {
      for (const engine of AI_LANES[lane].allowedEngines) {
        const prior = seen.get(engine);
        expect(
          prior,
          `engine ${engine} claimed by both ${prior} and ${lane}`
        ).toBeUndefined();
        seen.set(engine, lane);
      }
    }
  });

  it("forbids every other lane’s engines", () => {
    for (const lane of AI_LANE_ORDER) {
      const def = AI_LANES[lane];
      const others = AI_LANE_ORDER.filter((id) => id !== lane).flatMap(
        (id) => [...AI_LANES[id].allowedEngines]
      );
      for (const eng of others) {
        expect(def.forbiddenEngines).toContain(eng);
        expect(def.allowedEngines).not.toContain(eng);
      }
    }
  });

  it("maps entries to the correct generate* functions", () => {
    expect(AI_LANES.strategy.entry).toBe("generateStrategyText");
    expect(AI_LANES.logo.entry).toBe("generateLogoText");
    expect(AI_LANES.design.entry).toBe("generateDesignText");
  });
});

describe("assertEngineForLane", () => {
  it("accepts allowed engines", () => {
    expect(() => assertEngineForLane("strategy", "strategy-direct")).not.toThrow();
    expect(() => assertEngineForLane("logo", "openai-direct")).not.toThrow();
    expect(() => assertEngineForLane("logo", "gemini-direct")).not.toThrow();
    expect(() => assertEngineForLane("design", "open-design-daemon")).not.toThrow();
  });

  it("rejects cross-lane engines (no Design→OpenAI, no Logo→OD, etc.)", () => {
    expect(() => assertEngineForLane("design", "openai-direct")).toThrow(/cross engines/i);
    expect(() => assertEngineForLane("design", "gemini-direct")).toThrow(/cross engines/i);
    expect(() => assertEngineForLane("design", "strategy-direct")).toThrow(/cross engines/i);
    expect(() => assertEngineForLane("logo", "open-design-daemon")).toThrow(/cross engines/i);
    expect(() => assertEngineForLane("logo", "strategy-direct")).toThrow(/cross engines/i);
    expect(() => assertEngineForLane("strategy", "open-design-daemon")).toThrow(/cross engines/i);
  });

  it("rejects missing or unknown engine tags", () => {
    expect(() => assertEngineForLane("logo", undefined)).toThrow(/no engine/i);
    expect(() => assertEngineForLane("logo", "mystery-engine")).toThrow(/unknown engine/i);
  });
});

describe("key shape helpers", () => {
  it("treats sk-ant as Anthropic (OD/strategy), not logo primary", () => {
    expect(isAnthropicKeyShape("sk-ant-api03-xxx")).toBe(true);
    expect(isLogoPrimaryKeyShape("sk-ant-api03-xxx")).toBe(false);
  });

  it("treats OpenAI-style keys as logo primary, not Anthropic", () => {
    expect(isAnthropicKeyShape("sk-proj-abc")).toBe(false);
    expect(isLogoPrimaryKeyShape("sk-proj-abc")).toBe(true);
    expect(isLogoPrimaryKeyShape("sk-xxx")).toBe(true);
  });
});

describe("summarizeLaneHealth", () => {
  it("reports three independent statuses", () => {
    const rows = summarizeLaneHealth({
      strategyConfigured: true,
      strategyProvider: "anthropic",
      strategyModel: "claude-opus-4-8",
      logoOpenAiConfigured: true,
      geminiConfigured: true,
      logoModel: "gpt-4o",
      designAnthropicConfigured: true,
      designKeySource: "strategy",
      designModel: "claude-opus-4-8",
      openDesignDaemonUp: true,
    });
    expect(rows.map((r) => r.lane)).toEqual(["strategy", "logo", "design"]);
    expect(rows.map((r) => `${r.lane}:${r.level}`)).toEqual([
      "strategy:ok",
      "logo:ok",
      "design:ok",
    ]);
    expect(rows.every((r) => r.summary === "Ready")).toBe(true);
  });

  it("does not mark Design package ok when the design service is down (even with Claude)", () => {
    const rows = summarizeLaneHealth({
      strategyConfigured: true,
      logoOpenAiConfigured: true,
      geminiConfigured: false,
      designAnthropicConfigured: true,
      openDesignDaemonUp: false,
    });
    const design = rows.find((r) => r.lane === "design")!;
    expect(design.level).toBe("warn");
    expect(design.summary.toLowerCase()).toMatch(/almost|ready/);
    expect(design.name).toBe("Design package");
  });

  it("allows logo backup-only as warn without claiming strategy broken", () => {
    const rows = summarizeLaneHealth({
      strategyConfigured: true,
      logoOpenAiConfigured: false,
      geminiConfigured: true,
      designAnthropicConfigured: false,
      openDesignDaemonUp: false,
    });
    expect(rows.find((r) => r.lane === "strategy")!.level).toBe("ok");
    expect(rows.find((r) => r.lane === "logo")!.level).toBe("warn");
    expect(rows.find((r) => r.lane === "design")!.level).toBe("off");
  });
});

describe("engineLabel", () => {
  it("labels each engine for UI", () => {
    expect(engineLabel("open-design-daemon")).toMatch(/Open Design/i);
    expect(engineLabel("openai-direct")).toMatch(/logo/i);
  });
});

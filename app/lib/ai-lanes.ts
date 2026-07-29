/**
 * Canonical three-engine AI lane model.
 * Source of truth for humans: docs/11-ai-lanes.md
 * Generation entry points: lib/ai.ts (generateStrategyText | generateLogoText | generateDesignText)
 */

export type AiLaneId = "strategy" | "logo" | "design";

/** Values returned on GenerateTextResult.engine */
export type AiEngineId =
  | "strategy-direct"
  | "openai-direct"
  | "gemini-direct"
  | "open-design-daemon";

export type AiLaneDefinition = {
  id: AiLaneId;
  /** Short product name */
  name: string;
  /** What journey step uses this lane */
  uses: string;
  /** Public generate entry in lib/ai.ts */
  entry: "generateStrategyText" | "generateLogoText" | "generateDesignText";
  /** Engines allowed on a successful call */
  allowedEngines: readonly AiEngineId[];
  /** Engines that must never power this lane */
  forbiddenEngines: readonly AiEngineId[];
};

export const AI_LANES: Record<AiLaneId, AiLaneDefinition> = {
  strategy: {
    id: "strategy",
    name: "Strategy",
    uses: "Intake, Express, section drafts, viability, naming, synthesis",
    entry: "generateStrategyText",
    allowedEngines: ["strategy-direct"],
    forbiddenEngines: ["openai-direct", "gemini-direct", "open-design-daemon"],
  },
  logo: {
    id: "logo",
    name: "Logo Workshop",
    uses: "Logo candidates and logo judge only",
    entry: "generateLogoText",
    allowedEngines: ["openai-direct", "gemini-direct"],
    forbiddenEngines: ["strategy-direct", "open-design-daemon"],
  },
  design: {
    id: "design",
    name: "Design Studio",
    uses: "Identity system, landing page, deck, mockups via Open Design",
    entry: "generateDesignText",
    allowedEngines: ["open-design-daemon"],
    forbiddenEngines: ["strategy-direct", "openai-direct", "gemini-direct"],
  },
} as const;

export const AI_LANE_ORDER: AiLaneId[] = ["strategy", "logo", "design"];

export function isAiEngineId(value: string): value is AiEngineId {
  return (
    value === "strategy-direct" ||
    value === "openai-direct" ||
    value === "gemini-direct" ||
    value === "open-design-daemon"
  );
}

/** True when key shape is Anthropic (OD / strategy Anthropic), not OpenAI logo. */
export function isAnthropicKeyShape(key: string): boolean {
  return key.trim().startsWith("sk-ant");
}

/** True when key can power Logo Workshop primary path (not Anthropic). */
export function isLogoPrimaryKeyShape(key: string): boolean {
  const k = key.trim();
  if (!k) return false;
  if (isAnthropicKeyShape(k)) return false;
  return k.startsWith("sk-") || k.startsWith("od-");
}

/**
 * Throws if a successful generation reported the wrong engine for its lane.
 * Call after generate*Text when engine is present.
 */
export function assertEngineForLane(lane: AiLaneId, engine: string | undefined): void {
  const def = AI_LANES[lane];
  if (!engine) {
    throw new Error(
      `[ai-lanes] ${def.name} returned no engine tag — expected one of: ${def.allowedEngines.join(", ")}`
    );
  }
  if (!isAiEngineId(engine)) {
    throw new Error(`[ai-lanes] ${def.name} returned unknown engine “${engine}”`);
  }
  if (!(def.allowedEngines as readonly string[]).includes(engine)) {
    throw new Error(
      `[ai-lanes] ${def.name} must use ${def.allowedEngines.join(" | ")}, got “${engine}”. ` +
        `See docs/11-ai-lanes.md — do not cross engines.`
    );
  }
}

/** Human label for Settings / job UI. */
export function engineLabel(engine: AiEngineId): string {
  switch (engine) {
    case "strategy-direct":
      return "Strategy provider";
    case "openai-direct":
      return "OpenAI (logo)";
    case "gemini-direct":
      return "Gemini (logo fallback)";
    case "open-design-daemon":
      return "Open Design + Anthropic";
    default: {
      const _exhaustive: never = engine;
      return _exhaustive;
    }
  }
}

export type LaneHealthLevel = "ok" | "warn" | "off";

export type LaneHealthSummary = {
  lane: AiLaneId;
  name: string;
  level: LaneHealthLevel;
  /** One line for Settings / hub */
  summary: string;
  detail?: string;
};

/**
 * Pure AI-setup status from already-resolved flags (no I/O).
 * Design Studio needs both Anthropic BYOK *and* daemon up for "ok".
 */
export function summarizeLaneHealth(input: {
  strategyConfigured: boolean;
  strategyProvider?: string;
  strategyModel?: string | null;
  logoOpenAiConfigured: boolean;
  geminiConfigured: boolean;
  logoModel?: string | null;
  designAnthropicConfigured: boolean;
  designKeySource?: string | null;
  designModel?: string | null;
  openDesignDaemonUp: boolean | null; // null = not checked
}): LaneHealthSummary[] {
  // Owner-facing labels: what they unlock, not how the stack works.
  const strategy: LaneHealthSummary = {
    lane: "strategy",
    name: "Brand strategy",
    level: input.strategyConfigured ? "ok" : "off",
    summary: input.strategyConfigured ? "Ready" : "Needs a key",
    detail: input.strategyConfigured
      ? "Writes and drafts your strategy from your answers"
      : "Paste your Claude key below to unlock strategy drafts",
  };

  let logoLevel: LaneHealthLevel = "off";
  let logoSummary = "Needs a key";
  let logoDetail = "Paste an OpenAI key below to unlock logo ideas";
  if (input.logoOpenAiConfigured) {
    logoLevel = "ok";
    logoSummary = "Ready";
    logoDetail = "Creates logo concepts for you to choose from";
  } else if (input.geminiConfigured) {
    logoLevel = "warn";
    logoSummary = "Ready (backup key)";
    logoDetail = "Logos will work with the backup key you already set up";
  }

  const logo: LaneHealthSummary = {
    lane: "logo",
    name: "Logos",
    level: logoLevel,
    summary: logoSummary,
    detail: logoDetail,
  };

  const hasOdKey = Boolean(input.designAnthropicConfigured);
  const daemon = input.openDesignDaemonUp;
  let design: LaneHealthSummary;
  if (!hasOdKey) {
    design = {
      lane: "design",
      name: "Design package",
      level: "off",
      summary: "Needs setup",
      detail:
        "Add a Claude key under Brand strategy first — the design package uses the same key",
    };
  } else if (daemon === false) {
    design = {
      lane: "design",
      name: "Design package",
      level: "warn",
      summary: "Almost ready",
      detail: "Start the app with the usual launcher so design generation can run",
    };
  } else if (daemon === null) {
    design = {
      lane: "design",
      name: "Design package",
      level: "warn",
      summary: "Key ready",
      detail: "We’ll confirm the design service when you generate",
    };
  } else {
    design = {
      lane: "design",
      name: "Design package",
      level: "ok",
      summary: "Ready",
      detail: "Builds identity system, landing page, and deck",
    };
  }

  return [strategy, logo, design];
}

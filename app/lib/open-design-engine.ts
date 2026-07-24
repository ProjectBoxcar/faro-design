import "server-only";

/**
 * Open Design engine client — the ONLY path for graphic generation in Faro.
 * Logo Workshop + Design Studio must call this; they must not call Anthropic
 * (or any provider) directly via lib/ai Anthropic SDK.
 *
 * Requires the local Open Design daemon from:
 *   external/open-design-origin/open-design-main
 * listening on OPEN_DESIGN_URL (default http://127.0.0.1:7456).
 */

const DEFAULT_URL = (process.env.OPEN_DESIGN_URL ?? "http://127.0.0.1:7456").replace(/\/$/, "");

export function openDesignDaemonUrl(): string {
  return DEFAULT_URL;
}

/** True when the OD daemon answers on the local URL. */
export async function isOpenDesignDaemonUp(): Promise<boolean> {
  try {
    const res = await fetch(`${DEFAULT_URL}/api/brands`, {
      method: "GET",
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type OpenDesignGenerateParams = {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens: number;
  model: string;
  /** Provider API key OD will use (BYOK through the daemon). */
  apiKey: string;
};

export type OpenDesignGenerateResult = {
  text: string;
  model: string;
  engine: "open-design-daemon";
};

/**
 * Run a design LLM completion through the Open Design daemon's Anthropic proxy.
 * All logo / identity / landing / deck model calls go through here.
 */
export async function generateViaOpenDesign(
  params: OpenDesignGenerateParams
): Promise<OpenDesignGenerateResult> {
  const up = await isOpenDesignDaemonUp();
  if (!up) {
    throw new Error(
      `Open Design daemon is not running at ${DEFAULT_URL}. ` +
        `Start it from external/open-design-origin/open-design-main ` +
        `(e.g. node apps/daemon/dist/cli.js --port 7456 --host 127.0.0.1 --no-open). ` +
        `Faro will not generate logos or design systems without Open Design.`
    );
  }
  if (!params.apiKey?.trim()) {
    throw new Error(
      "Open Design needs an Anthropic API key (BYOK). Save it in Faro Settings — OD uses it through the daemon only."
    );
  }

  const res = await fetch(`${DEFAULT_URL}/api/proxy/anthropic/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      baseUrl: "https://api.anthropic.com",
      apiKey: params.apiKey,
      model: params.model,
      systemPrompt: params.system ?? "",
      messages: params.messages,
      maxTokens: params.maxTokens,
    }),
    signal: AbortSignal.timeout(Math.max(120_000, params.maxTokens * 20)),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Open Design daemon returned ${res.status}: ${errBody.slice(0, 400) || res.statusText}`
    );
  }

  const text = await collectSseText(res);
  if (!text.trim()) {
    throw new Error("Open Design returned an empty design response. Check the daemon logs and try again.");
  }
  return { text: text.trim(), model: params.model, engine: "open-design-daemon" };
}

/** Parse OD SSE stream (event: delta / data: {"delta":"..."}). */
async function collectSseText(res: Response): Promise<string> {
  if (!res.body) {
    // Fallback if body stream unavailable
    const raw = await res.text();
    return extractDeltasFromSseBuffer(raw);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  let eventName = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as {
            delta?: string;
            text?: string;
            content?: string;
            error?: string;
            message?: string;
          };
          if (json.error || (eventName === "error" && json.message)) {
            throw new Error(json.error ?? json.message ?? "Open Design stream error");
          }
          const piece = json.delta ?? json.text ?? json.content ?? "";
          if (piece) out += piece;
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("Open Design")) throw e;
          // non-JSON data lines ignored
        }
        eventName = "";
      }
      if (line === "") eventName = "";
    }
  }

  if (buffer.trim()) {
    out += extractDeltasFromSseBuffer(buffer);
  }
  return out;
}

function extractDeltasFromSseBuffer(raw: string): string {
  let out = "";
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const json = JSON.parse(payload) as { delta?: string; text?: string; content?: string };
      out += json.delta ?? json.text ?? json.content ?? "";
    } catch {
      /* ignore */
    }
  }
  return out;
}

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/ai";
import { getApiKey, getProvider } from "@/lib/settings";
import { extractJson } from "@/lib/json";
import { getProject, getSectionRow, getSections, insertEvaluation } from "@/lib/queries";
import type { EvaluationRow } from "@/lib/queries";
import type { EvalScore } from "@/lib/db/types";

// Real-world availability screen for a naming candidate: live domain lookups
// (RDAP) plus Claude-with-web-search researching trademarks, same-sector
// companies and social handles. A preliminary screen, not legal clearance.

// Registry RDAP servers queried directly — the rdap.org proxy is slow/absent
// for some TLDs (.co times out, .io isn't in the IANA bootstrap at all).
const RDAP_ENDPOINTS: Record<string, string> = {
  com: "https://rdap.verisign.com/com/v1/domain/",
  io: "https://rdap.identitydigital.services/rdap/domain/",
  app: "https://pubapi.registry.google/rdap/domain/",
};
const DOMAIN_TLDS = Object.keys(RDAP_ENDPOINTS);

export type DomainFact = {
  domain: string;
  status: "registered" | "available" | "unknown";
};

// RDAP is the registries' own lookup protocol: 404 = no registration on file.
async function checkDomain(label: string, tld: string): Promise<DomainFact> {
  const domain = `${label}.${tld}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${RDAP_ENDPOINTS[tld]}${domain}`, {
        signal: AbortSignal.timeout(10000),
        headers: { accept: "application/rdap+json" },
        cache: "no-store",
      });
      if (res.status === 404) return { domain, status: "available" };
      if (res.ok) return { domain, status: "registered" };
    } catch {
      /* retry once, then report unknown */
    }
  }
  return { domain, status: "unknown" };
}

// Upstream brand context so "same sector" means something: the concept and
// central pattern if written, else whatever Reality foundation exists.
function brandContext(projectId: string): string {
  const parts: string[] = [];
  const project = getProject(projectId);
  if (project) {
    parts.push(`Project: ${project.name}${project.client_name ? ` (client: ${project.client_name})` : ""}`);
  }
  const preferred = ["concept", "brief.central-pattern"];
  const rows = getSections(projectId).filter(
    (r) => r.value && Object.keys(r.value as Record<string, unknown>).length > 0
  );
  const picked = [
    ...preferred.map((k) => rows.find((r) => r.section_key === k)),
    ...rows.filter((r) => r.section_key.startsWith("reality.")).slice(0, 2),
  ].filter((r): r is NonNullable<typeof r> => Boolean(r));
  for (const row of picked.slice(0, 4)) {
    parts.push(`### ${row.section_key}\n${JSON.stringify(row.value)}`);
  }
  return parts.join("\n\n");
}

export type NameCheckResult = {
  evaluation: EvaluationRow;
  domains: DomainFact[];
};

type ParsedCheck = { item: string; result: string; notes: string };

const VALID_RESULTS = new Set(["Pass", "Pass with caveat", "Fail"]);
const VALID_VERDICTS = new Set(["pass", "caveat", "fail"]);

export async function runNameAvailabilityCheck(
  projectId: string,
  name: string
): Promise<NameCheckResult> {
  if (getProvider() !== "anthropic") {
    throw new Error("Name availability check requires the Anthropic provider (web search tool).");
  }
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");
  const label = trimmed.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!label) throw new Error("Name has no usable characters for a domain check");

  const domains = await Promise.all(DOMAIN_TLDS.map((tld) => checkDomain(label, tld)));

  const context = brandContext(projectId);
  const domainFacts = domains
    .map((d) => `- ${d.domain}: ${d.status === "unknown" ? "could not verify" : d.status}`)
    .join("\n");

  const system = [
    "You are a brand-name availability researcher. Your job: determine whether a proposed brand name is usable commercially and legally for this specific business. This is a preliminary screen the founder runs before getting attached to a name — be factual, thorough, and honest about uncertainty.",
    "Use web search extensively before answering. Search for existing companies, trademark registrations (USPTO, EUIPO, WIPO Global Brand Database results that surface on the web), app-store products, and social-media handles. Ground every note in what you actually found; never invent registrations or companies.",
    "Severity rules: an identical or confusingly similar name used by a company in the SAME sector, or a live trademark in a relevant class, is a Fail. A similar-but-distinguishable name, or a taken handle with a workable variant (prefix/suffix), is Pass with caveat. No meaningful collision found is Pass.",
    'Respond with ONLY one JSON object, no prose or code fences: {"checks": [{"item": string, "result": "Pass" | "Pass with caveat" | "Fail", "notes": string}], "verdict": "pass" | "caveat" | "fail", "summary": string}. The verdict is "fail" if any critical check fails, "caveat" if nothing fails but caveats exist, else "pass". The summary is 2-3 plain sentences the founder can act on.',
  ].join("\n\n");

  const user = [
    `PROPOSED BRAND NAME: ${trimmed}`,
    context ? `BRAND CONTEXT (use this to judge what "same sector" means):\n${context}` : "",
    `DOMAIN AVAILABILITY (verified live via registry RDAP lookups just now — treat as fact and report as-is, even if your own web searches fail or run out):\n${domainFacts}`,
    [
      "RESEARCH AND REPORT ONE CHECK ROW FOR EACH OF:",
      "1. Same-sector companies with this or a confusingly similar name.",
      "2. Trademark registrations for this name in relevant classes (US, EU, international — whatever web search surfaces).",
      "3. Adjacent-category collisions prominent enough to cause confusion (big brands, media, apps).",
      `4. Social handle availability for "${label}" on Instagram, X/Twitter and LinkedIn (best effort from search results; note workable variants if taken).`,
      `5. One row per domain above (${DOMAIN_TLDS.map((t) => `${label}.${t}`).join(", ")}), interpreting the RDAP facts (registered ≠ necessarily in use — note if it's parked or an active same-sector site).`,
    ].join("\n"),
    "Return the JSON object now.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key configured");
  const client = new Anthropic({ apiKey });
  let messages: { role: "user" | "assistant"; content: unknown }[] = [{ role: "user", content: user }];
  let resp = await client.messages.create({
    model: MODELS.reasoning,
    max_tokens: 4096,
    system,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 10 }],
    messages: messages as Anthropic.MessageParam[],
  });

  // Server-side tool loops can pause; re-send to let the search continue.
  for (let i = 0; i < 6 && resp.stop_reason === "pause_turn"; i++) {
    messages = [...messages, { role: "assistant", content: resp.content }];
    resp = await client.messages.create({
      model: MODELS.reasoning,
      max_tokens: 4096,
      system,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 10 }],
      messages: messages as Anthropic.MessageParam[],
    });
  }

  const text = resp.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  const parsed = extractJson(text);

  const rawChecks = Array.isArray(parsed.checks) ? (parsed.checks as ParsedCheck[]) : [];
  const checks = rawChecks
    .filter((c) => c && typeof c.item === "string")
    .map((c) => ({
      item: c.item,
      result: VALID_RESULTS.has(c.result) ? c.result : "Pass with caveat",
      notes: typeof c.notes === "string" ? c.notes : "",
    }));
  if (checks.length === 0) throw new Error("The availability research returned no usable result — try again.");

  const verdict = (
    VALID_VERDICTS.has(parsed.verdict as string) ? parsed.verdict : deriveVerdict(checks)
  ) as "pass" | "caveat" | "fail";
  const summary = typeof parsed.summary === "string" ? parsed.summary : "";

  // First score row carries the summary; the rest are the individual checks.
  const scores: EvalScore[] = [
    { key: "summary", label: "Summary", result: verdict, notes: summary },
    ...checks.map((c, i) => ({ key: `check-${i}`, label: c.item, result: c.result, notes: c.notes })),
  ];

  // Separate type from workshop confirm so a research "pass" never marks the name confirmed.
  const evaluation = insertEvaluation({
    projectId,
    type: "naming_availability",
    subject: trimmed,
    scores,
    verdict,
  });
  return { evaluation, domains };
}

function deriveVerdict(checks: { result: string }[]): "pass" | "caveat" | "fail" {
  if (checks.some((c) => c.result === "Fail")) return "fail";
  if (checks.some((c) => c.result === "Pass with caveat")) return "caveat";
  return "pass";
}

// Candidate names already on file, offered as one-click suggestions.
export function suggestedCandidates(projectId: string): string[] {
  const names: string[] = [];
  const presentation = getSectionRow(projectId, "naming.presentation");
  const chosen = (presentation?.value as { chosen?: string } | undefined)?.chosen?.trim();
  if (chosen) names.push(chosen);
  const presentationCandidates = (presentation?.value as Record<string, unknown> | undefined)
    ?.candidates;
  if (Array.isArray(presentationCandidates)) {
    for (const row of presentationCandidates as Record<string, string>[]) {
      if (row?.name?.trim()) names.push(row.name.trim());
    }
  }
  // Workshop proposals live on naming.exploration.candidates (not .directions).
  const exploration = getSectionRow(projectId, "naming.exploration");
  const explorationCandidates = (exploration?.value as Record<string, unknown> | undefined)
    ?.candidates;
  if (Array.isArray(explorationCandidates)) {
    for (const row of explorationCandidates as Record<string, string>[]) {
      if (row?.name?.trim()) names.push(row.name.trim());
    }
  }
  const directions = (exploration?.value as Record<string, unknown> | undefined)?.directions;
  if (Array.isArray(directions)) {
    for (const row of directions as Record<string, string>[]) {
      if (row?.direction?.trim()) names.push(row.direction.trim());
      if (row?.name?.trim()) names.push(row.name.trim());
    }
  }
  const project = getProject(projectId);
  if (project?.name?.trim()) names.push(project.name.trim());
  return [...new Set(names)].slice(0, 8);
}

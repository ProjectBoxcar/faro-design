/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from "@anthropic-ai/sdk";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Phase-2 PoC (roadmap step A in 10-asset-studio.md): prove that the completed
// strategy is enough for Claude to produce real brand assets. Reads the Brand App
// project's own strategy from the sandbox DB, generates palette tokens, a type
// system, and 3 SVG wordmark candidates, auto-scores the wordmarks, and renders
// an HTML gallery to data/poc-output/. No app code touched — script only.

dotenv.config({ path: ".env.local" });

const DB_PATH = join("data", "brand-phase2.db");
const OUT_DIR = join("data", "poc-output");
const PROJECT_NAME = "Brand App";

const db = new Database(DB_PATH, { readonly: true });

function getProjectId(): string {
  const row: any = db.prepare("SELECT id FROM projects WHERE name = ?").get(PROJECT_NAME);
  if (!row) throw new Error(`Project "${PROJECT_NAME}" not found in ${DB_PATH}`);
  return row.id;
}

function section(projectId: string, key: string): any {
  const row: any = db
    .prepare("SELECT value FROM sections WHERE project_id = ? AND section_key = ? AND status = 'complete'")
    .get(projectId, key);
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

function apiKey(): string {
  const row: any = db.prepare("SELECT anthropic_api_key FROM settings WHERE id = 1").get();
  const key = (row?.anthropic_api_key ?? "").trim() || (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!key) throw new Error("No Anthropic API key in settings or ANTHROPIC_API_KEY");
  return key;
}

function model(): string {
  const row: any = db.prepare("SELECT default_model FROM settings WHERE id = 1").get();
  return row?.default_model || "claude-opus-4-8";
}

// Tolerant JSON extraction: models sometimes wrap output in ```json fences.
function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.search(/[[{]/);
  if (start === -1) throw new Error(`No JSON in model output:\n${text.slice(0, 400)}`);
  return JSON.parse(raw.slice(start).trim());
}

// ---- WCAG contrast (computed locally — never trust a model with arithmetic) ----
function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
}

async function ask(client: Anthropic, mdl: string, system: string, user: string, maxTokens = 6000) {
  const res = await client.messages.create({
    model: mdl,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = res.content.filter((b) => b.type === "text").map((b: any) => b.text).join("\n");
  return extractJson(text);
}

async function main() {
  const projectId = getProjectId();
  const mdl = model();
  const client = new Anthropic({ apiKey: apiKey() });
  console.log(`Project ${projectId}, model ${mdl}`);

  // The strategy context every generation call sees — the same sections the
  // phase-1 brief compiles for the designer.
  const strategy = {
    concept: section(projectId, "concept"),
    brief: {
      centralPattern: section(projectId, "brief.central-pattern"),
      mainTension: section(projectId, "brief.main-tension"),
      constraint: section(projectId, "brief.constraint"),
      emotionalTerritory: section(projectId, "brief.emotional-territory"),
      mustResolve: section(projectId, "brief.must-resolve"),
    },
    visualTerritory: section(projectId, "territory.definition"),
    personality: section(projectId, "communication.personality"),
    tone: section(projectId, "communication.tone"),
    colorDirection: section(projectId, "system.color"),
    typographyDirection: section(projectId, "system.typography"),
    naming: section(projectId, "naming.presentation"),
  };
  const naming = strategy.naming ?? {};
  const brandName: string =
    (typeof naming.chosen === "string" && naming.chosen.match(/^\w[\w-]*/)?.[0]) ||
    naming.candidates?.[0]?.name ||
    PROJECT_NAME;
  console.log(`Brand name for wordmarks: ${brandName}`);

  const SYSTEM = `You are a senior brand designer executing a strategy that is already decided.
Never invent strategy — every choice must trace to the brief you are given.
Answer with a single JSON object and nothing else.

The strategy:
${JSON.stringify(strategy)}`;

  // 1 — palette: formalize the strategy's color direction into usable tokens.
  console.log("Generating palette tokens…");
  const palette = await ask(
    client,
    mdl,
    SYSTEM,
    `Formalize the color direction into design tokens. Keep the hex values the strategy already chose
unless a value fails legibility; you may add at most 2 supporting neutrals/tints if the direction
implies them. Return: {"colors":[{"name","hex","role","usage"}],"pairs":[{"fg","bg","use"}],"notes"}
where "pairs" lists every foreground/background combination the brand will actually set text in
(reference colors by hex).`
  );
  for (const p of palette.pairs ?? []) {
    p.ratio = contrast(p.fg, p.bg);
    p.aa = p.ratio >= 4.5 ? "AA" : p.ratio >= 3 ? "AA-large only" : "fail";
  }

  // 2 — type system: open-license families only, full scale.
  console.log("Generating type system…");
  const type = await ask(
    client,
    mdl,
    SYSTEM,
    `Turn the typography direction into a concrete system using ONLY fonts available on Google Fonts
(the delivered brand must be legally usable). Honor the direction's intent (e.g. structured grotesque
→ pick the closest Google Fonts match). Return:
{"families":[{"family","googleFontsName","weights":[...],"role","why"}],
 "scale":[{"name","px","lineHeight","family","weight","use"}],"rules":[...]}`
  );

  // 3 — three SVG wordmark candidates, distinct directions, built on the real palette/type.
  console.log("Generating 3 wordmark candidates…");
  const marks = await ask(
    client,
    mdl,
    SYSTEM,
    `Design 3 distinct wordmark candidates for the name "${brandName}". Constraints:
- Each is a complete inline SVG (viewBox, no width/height, no external refs, no <image>).
- Type-driven or geometric only. For lettering use <text> with font-family set to one of the
  Google Fonts families from this type system (the preview page loads them): ${JSON.stringify(
    (type.families ?? []).map((f: any) => f.googleFontsName)
  )}.
- Use ONLY these palette hexes: ${JSON.stringify((palette.colors ?? []).map((c: any) => c.hex))}.
- Any accompanying mark/isotype must be simple geometry (<path>/<rect>/<circle>), no filters/gradients
  unless the visual territory demands them.
- The three candidates must explore genuinely different directions, not variations of one idea.
Return: {"candidates":[{"label","direction","svg","svgOnDark"}]} where svgOnDark is the same mark
recolored for the dark ground.`,
    9000
  );

  // 4 — auto-score: a skeptical judge, separate call so it can't grade its own homework.
  console.log("Scoring candidates…");
  const scoring = await ask(
    client,
    mdl,
    `You are a skeptical design director reviewing wordmark candidates against a brand strategy.
You did NOT design these and gain nothing from approving them. Be harsh: "caveat" is the default
for anything not clearly excellent, "fail" for anything generic, off-strategy, or technically weak.
Answer with a single JSON object and nothing else.

The strategy:
${JSON.stringify({ concept: strategy.concept, brief: strategy.brief, visualTerritory: strategy.visualTerritory })}`,
    `Score each candidate on: concept-alignment, territory-fit, distinctiveness, legibility-at-16px,
versatility-light-dark. Result per criterion: pass | caveat | fail, with a one-sentence note.
Overall verdict per candidate: pass (usable direction), caveat (direction ok, execution needs work),
fail (discard). Candidates:
${JSON.stringify(marks.candidates.map((c: any) => ({ label: c.label, direction: c.direction, svg: c.svg })))}
Return: {"scores":[{"label","criteria":[{"criterion","result","note"}],"verdict","summary"}]}`,
    5000
  );

  // ---- render gallery ----
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "poc-results.json"),
    JSON.stringify({ brandName, palette, type, marks, scoring }, null, 2)
  );

  const fontLinks = (type.families ?? [])
    .map(
      (f: any) =>
        `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(
          f.googleFontsName
        ).replace(/%20/g, "+")}:wght@${(f.weights ?? [400]).join(";")}&display=swap" rel="stylesheet">`
    )
    .join("\n");

  const swatches = (palette.colors ?? [])
    .map(
      (c: any) => `<div class="swatch">
        <div class="chip" style="background:${c.hex}"></div>
        <strong>${c.name}</strong><code>${c.hex}</code>
        <em>${c.role}</em><p>${c.usage ?? ""}</p></div>`
    )
    .join("");

  const pairRows = (palette.pairs ?? [])
    .map(
      (p: any) => `<tr><td><span class="pair" style="color:${p.fg};background:${p.bg}">Aa</span></td>
        <td><code>${p.fg}</code> on <code>${p.bg}</code></td><td>${p.use}</td>
        <td>${p.ratio}:1</td><td class="${p.aa === "fail" ? "bad" : "ok"}">${p.aa}</td></tr>`
    )
    .join("");

  const scaleRows = (type.scale ?? [])
    .map(
      (s: any) => `<div class="specimen" style="font-family:'${
        (type.families ?? []).find((f: any) => f.family === s.family || f.googleFontsName === s.family)
          ?.googleFontsName ?? s.family
      }';font-size:${s.px}px;font-weight:${s.weight};line-height:${s.lineHeight}">
      ${s.name} · ${s.px}px — The lighthouse doesn't sail the ship.</div>`
    )
    .join("");

  const verdictOf = (label: string) => (scoring.scores ?? []).find((s: any) => s.label === label);
  const cards = (marks.candidates ?? [])
    .map((c: any) => {
      const v = verdictOf(c.label);
      const rows = (v?.criteria ?? [])
        .map(
          (cr: any) =>
            `<tr><td>${cr.criterion}</td><td class="${cr.result === "fail" ? "bad" : cr.result === "caveat" ? "warn" : "ok"}">${cr.result}</td><td>${cr.note}</td></tr>`
        )
        .join("");
      return `<div class="card">
        <h3>${c.label} <span class="verdict ${v?.verdict ?? ""}">${v?.verdict ?? "unscored"}</span></h3>
        <p>${c.direction}</p>
        <div class="stage light">${c.svg}</div>
        <div class="stage dark">${c.svgOnDark ?? c.svg}</div>
        <div class="stage light small">${c.svg}</div>
        <table>${rows}</table>
        <p class="summary">${v?.summary ?? ""}</p>
      </div>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Asset Studio PoC — ${brandName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">${fontLinks}
<style>
  body{font-family:system-ui,sans-serif;margin:0;padding:2rem;max-width:1100px;margin-inline:auto;color:#1a1a1a}
  h1{margin-top:0} h2{margin-top:3rem;border-top:1px solid #ddd;padding-top:1.5rem}
  .note{background:#fdf6e3;border:1px solid #e8d9a0;padding:.6rem 1rem;border-radius:6px}
  .swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:1rem}
  .swatch .chip{height:64px;border-radius:8px;border:1px solid #0002}
  .swatch code{display:block;color:#555} .swatch em{font-size:.85em;color:#777} .swatch p{font-size:.8em;color:#666;margin:.2em 0}
  table{border-collapse:collapse;width:100%;font-size:.9em} td,th{border:1px solid #ddd;padding:.4rem .6rem;text-align:left}
  .pair{display:inline-block;padding:.2rem .6rem;border-radius:4px;font-weight:700}
  .ok{color:#1a7f37}.warn{color:#9a6700}.bad{color:#cf222e}
  .specimen{margin:.6rem 0;white-space:nowrap;overflow-x:auto}
  .cards{display:grid;grid-template-columns:1fr;gap:2rem}
  .card{border:1px solid #ddd;border-radius:10px;padding:1.2rem}
  .stage{border-radius:8px;padding:1.5rem;margin:.6rem 0;display:flex;justify-content:center}
  .stage svg{max-width:100%;height:auto;max-height:110px}
  .stage.light{background:#F5F1E8}.stage.dark{background:#0E1B2A}
  .stage.small svg{max-height:22px}
  .verdict{font-size:.7em;padding:.15rem .5rem;border-radius:99px;vertical-align:middle;text-transform:uppercase}
  .verdict.pass{background:#dafbe1;color:#1a7f37}.verdict.caveat{background:#fff8c5;color:#9a6700}.verdict.fail{background:#ffebe9;color:#cf222e}
  .summary{font-style:italic;color:#555}
</style></head><body>
<h1>Asset Studio — proof of concept</h1>
<p class="note">Generated by ${mdl} from the completed <strong>${PROJECT_NAME}</strong> strategy
(sandbox DB). Wordmark lettering uses live Google Fonts via <code>&lt;text&gt;</code>; production
export would convert text to paths. Scores come from a separate skeptical-judge call.</p>
<h2>Color palette (${(palette.colors ?? []).length} tokens)</h2>
<div class="swatches">${swatches}</div>
<h3>Text pairs — WCAG contrast (computed locally)</h3>
<table><tr><th></th><th>Pair</th><th>Use</th><th>Ratio</th><th>WCAG</th></tr>${pairRows}</table>
<p>${palette.notes ?? ""}</p>
<h2>Type system</h2>
<p>${(type.families ?? []).map((f: any) => `<strong>${f.googleFontsName}</strong> (${f.role})`).join(" · ")}</p>
${scaleRows}
<ul>${(type.rules ?? []).map((r: string) => `<li>${r}</li>`).join("")}</ul>
<h2>Wordmark candidates — "${brandName}"</h2>
<div class="cards">${cards}</div>
</body></html>`;

  const outPath = join(OUT_DIR, "poc-gallery.html");
  writeFileSync(outPath, html);
  console.log(`\nDone → ${outPath}`);
  for (const s of scoring.scores ?? []) console.log(`  ${s.label}: ${s.verdict}`);
}

main().catch((e) => {
  console.error("PoC failed:", e);
  process.exit(1);
});

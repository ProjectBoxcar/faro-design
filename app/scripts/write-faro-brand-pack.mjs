/**
 * Dogfood: build Brand Implement Pack from the Faro Design project DB
 * and write it into public/brand for the webapp to consume.
 *
 * Usage: node scripts/write-faro-brand-pack.mjs
 */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const PROJECT_ID = process.env.FARO_PROJECT_ID || "eM-JNZ7bTBZNr3Ay4-q4a";
const OUT = path.join("public", "brand");
const APP_TOKENS = path.join("app", "brand", "tokens.css");

const db = new Database("data/brand.db");

function firstRootBlock(html) {
  return html.match(/:root\s*\{[\s\S]*?\}/)?.[0] ?? "";
}
function darkThemeBlock(html) {
  return html.match(/\[data-theme=["']dark["']\]\s*\{[\s\S]*?\}/)?.[0] ?? "";
}
function parseCssVars(block) {
  const vars = {};
  for (const m of block.matchAll(/--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g)) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}
function resolveVar(value, vars, depth = 0) {
  if (depth > 6) return value;
  const m = value.match(/^var\(\s*--([a-zA-Z0-9-_]+)\s*\)$/);
  if (!m || !vars[m[1]]) return value;
  return resolveVar(vars[m[1]], vars, depth + 1);
}
function pick(vars, sources) {
  for (const k of sources) {
    if (vars[k]) return resolveVar(vars[k], vars);
  }
  return undefined;
}
function extractSection(html, id) {
  const re = new RegExp(
    `<[^>]*\\bid=["']${id}["'][^>]*>[\\s\\S]*?(?=<section\\b[^>]*\\bid=["']|</main>|</body>)`,
    "i"
  );
  return html.match(re)?.[0] ?? "";
}
function extractIcons(html) {
  const section = extractSection(html, "icons");
  if (!section) return [];
  const icons = [];
  for (const cell of section.split(/class=["']icon-cell["']/i).slice(1)) {
    const label =
      cell.match(/class=["']lbl["'][^>]*>\s*([^<]+)/i)?.[1]?.trim() ||
      `icon-${icons.length + 1}`;
    const svg = cell.match(/<svg\b[\s\S]*?<\/svg>/i)?.[0];
    if (!svg) continue;
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    icons.push({
      name: slug,
      svg: svg
        .replace(/\sclass=["'][^"']*["']/gi, "")
        .replace(/\swidth=["'][^"']*["']/i, ' width="24"')
        .replace(/\sheight=["'][^"']*["']/i, ' height="24"'),
    });
  }
  const seen = new Set();
  return icons.filter((i) => (seen.has(i.name) ? false : (seen.add(i.name), true)));
}

const system = db
  .prepare(
    `SELECT html FROM assets WHERE project_id = ? AND kind = 'design_system' AND selected = 1 LIMIT 1`
  )
  .get(PROJECT_ID);
const landing = db
  .prepare(
    `SELECT html FROM assets WHERE project_id = ? AND kind = 'landing_page' AND selected = 1 LIMIT 1`
  )
  .get(PROJECT_ID);
const logo = db
  .prepare(
    `SELECT payload FROM studio_assets WHERE project_id = ? AND kind = 'logo' AND status = 'approved' LIMIT 1`
  )
  .get(PROJECT_ID);

if (!system?.html) {
  console.error("No selected design_system for Faro project", PROJECT_ID);
  process.exit(1);
}

const raw = parseCssVars(firstRootBlock(system.html));
const dark = parseCssVars(darkThemeBlock(system.html));

const roles = {
  ink: pick(raw, ["color-ink", "ink"]) || "#111111",
  paper: pick(raw, ["color-paper", "paper"]) || "#F5F1E8",
  surface: pick(raw, ["color-white", "color-surface"]) || "#FFFFFF",
  "surface-2": pick(raw, ["color-surface-2"]) || "#FBF9F3",
  primary: pick(raw, ["color-primary"]) || "#16514B",
  "primary-strong": pick(raw, ["color-primary-strong"]) || "#0E3C37",
  accent: pick(raw, ["color-accent"]) || "#F25C2A",
  "accent-soft": pick(raw, ["color-accent-soft"]) || "#FDE3D6",
  signal: pick(raw, ["color-signal"]) || "#E8B417",
  muted: pick(raw, ["color-muted"]) || "#6B6558",
  line: pick(raw, ["color-line"]) || "#D8D1C0",
  success: pick(raw, ["color-success"]) || "#2E7D5B",
  danger: pick(raw, ["color-danger"]) || "#C0392B",
  "font-display":
    pick(raw, ["font-display"]) || '"EB Garamond", Georgia, "Times New Roman", serif',
  "font-body":
    pick(raw, ["font-body"]) ||
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const tokensCss = `/* Faro Design — Brand Implement Pack (dogfood)
 * Generated from approved Identity System + Landing finals.
 * Source of truth for the Faro Design webapp chrome.
 */
:root {
  --brand-ink: ${roles.ink};
  --brand-paper: ${roles.paper};
  --brand-surface: ${roles.surface};
  --brand-surface-2: ${roles["surface-2"]};
  --brand-primary: ${roles.primary};
  --brand-primary-strong: ${roles["primary-strong"]};
  --brand-accent: ${roles.accent};
  --brand-accent-soft: ${roles["accent-soft"]};
  --brand-signal: ${roles.signal};
  --brand-muted: ${roles.muted};
  --brand-line: ${roles.line};
  --brand-success: ${roles.success};
  --brand-danger: ${roles.danger};
  --brand-font-display: ${roles["font-display"]};
  --brand-font-body: ${roles["font-body"]};

  /* Product chrome aliases */
  --background: var(--brand-paper);
  --surface: var(--brand-surface);
  --surface-2: var(--brand-surface-2);
  --field: var(--brand-surface);
  --foreground: var(--brand-ink);
  --muted: var(--brand-muted);
  --subtle: color-mix(in srgb, var(--brand-muted) 72%, var(--brand-paper));
  --border: var(--brand-line);
  --border-strong: color-mix(in srgb, var(--brand-line) 80%, var(--brand-ink));
  --accent: var(--brand-primary);
  --accent-hover: var(--brand-primary-strong);
  --accent-soft: color-mix(in srgb, var(--brand-primary) 12%, var(--brand-paper));
  --client: var(--brand-accent);
  --designer: var(--brand-primary);
  --collab: var(--brand-signal);
  --ok: var(--brand-success);
  --warn: #9a6b00;
  --danger: var(--brand-danger);
  --shadow-card: ${raw["shadow-1"] || "0 1px 2px rgba(17,17,17,.08)"};
  --shadow-pop: ${raw["shadow-3"] || "0 8px 24px rgba(17,17,17,.14)"};
  --radius-sm: ${raw["radius-sm"] || "2px"};
  --radius-md: ${raw["radius-md"] || "4px"};
  --radius-lg: ${raw["radius-lg"] || "8px"};
  --radius-pill: ${raw["radius-pill"] || "999px"};
}
`;

fs.mkdirSync(path.join(OUT, "icons"), { recursive: true });
fs.mkdirSync(path.dirname(APP_TOKENS), { recursive: true });
fs.writeFileSync(path.join(OUT, "tokens.css"), tokensCss);
// App stylesheet import path (Next/CSS pipeline)
fs.writeFileSync(APP_TOKENS, tokensCss);
fs.writeFileSync(
  path.join(OUT, "tokens.json"),
  JSON.stringify(
    {
      project: { id: PROJECT_ID, name: "Faro Design" },
      generatedAt: new Date().toISOString(),
      tokens: roles,
      dark: Object.keys(dark).length ? dark : undefined,
      raw,
    },
    null,
    2
  )
);

const payload = logo?.payload
  ? typeof logo.payload === "string"
    ? JSON.parse(logo.payload)
    : logo.payload
  : null;
let lockup = payload?.svg || extractSection(system.html, "logo").match(/<svg[\s\S]*?<\/svg>/i)?.[0];
if (lockup) {
  if (!lockup.includes("xmlns")) lockup = lockup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  fs.writeFileSync(path.join(OUT, "logo-lockup.svg"), lockup);
  const mark = lockup.replace(/<rect[^>]*width=["']400["'][^>]*height=["']120["'][^>]*\/?>/i, "");
  fs.writeFileSync(path.join(OUT, "logo-mark.svg"), mark);
}

const icons = extractIcons(system.html);
for (const icon of icons) {
  let svg = icon.svg;
  if (!svg.includes("xmlns")) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  fs.writeFileSync(path.join(OUT, "icons", `${icon.name}.svg`), svg);
}

if (landing?.html) {
  const h1 =
    landing.html
      .match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "";
  const lede =
    landing.html
      .match(/class=["'][^"']*lede[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "";
  fs.writeFileSync(
    path.join(OUT, "copy.json"),
    JSON.stringify(
      {
        hero: { headline: h1, lede },
        documentTitle:
          landing.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "Faro Design",
      },
      null,
      2
    )
  );
}

fs.writeFileSync(
  path.join(OUT, "IMPLEMENT.md"),
  `# Brand implement pack — Faro Design

This folder is the dogfood pack for the Faro Design webapp.

- Import \`tokens.css\` from the app root stylesheet.
- Use \`logo-mark.svg\` in chrome.
- Icons live in \`icons/\`.

Regenerate: \`node scripts/write-faro-brand-pack.mjs\`
`
);

fs.writeFileSync(
  path.join(OUT, "manifest.json"),
  JSON.stringify(
    {
      format: "faro-brand-implement-pack",
      version: 1,
      projectName: "Faro Design",
      projectId: PROJECT_ID,
      icons: icons.map((i) => i.name),
    },
    null,
    2
  )
);

console.log("Wrote brand pack to", OUT);
console.log("Icons:", icons.map((i) => i.name).join(", "));
console.log("Primary:", roles.primary, "Accent:", roles.accent);

import "server-only";
import { listAssets, getSelectedAsset } from "@/lib/design";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import { getProject, listStudioAssets } from "@/lib/queries";
import { sanitizeDownloadName } from "@/lib/download-name";

export type BrandPackFile = {
  path: string;
  content: string;
};

export type BrandPackResult = {
  projectId: string;
  projectName: string;
  files: BrandPackFile[];
  downloadName: string;
};

type TokenMap = Record<string, string>;

const ROLE_MAP: Array<{
  role: string;
  sources: string[];
  description: string;
  appVar?: string;
}> = [
  {
    role: "ink",
    sources: ["color-ink", "ink", "fg"],
    description: "Primary text and marks",
    appVar: "--foreground",
  },
  {
    role: "paper",
    sources: ["color-paper", "paper", "bg"],
    description: "Page / canvas background",
    appVar: "--background",
  },
  {
    role: "surface",
    sources: ["color-white", "color-surface", "surface", "card-bg"],
    description: "Raised cards and panels",
    appVar: "--surface",
  },
  {
    role: "surface-2",
    sources: ["color-surface-2", "surface-2"],
    description: "Secondary fills and hover grounds",
    appVar: "--surface-2",
  },
  {
    role: "primary",
    sources: ["color-primary", "primary"],
    description: "Primary CTA / brand color",
    appVar: "--accent",
  },
  {
    role: "primary-strong",
    sources: ["color-primary-strong", "primary-strong", "color-primary-600"],
    description: "Primary hover / pressed",
    appVar: "--accent-hover",
  },
  {
    role: "accent",
    sources: ["color-accent", "accent"],
    description: "Secondary signal (kickers, emphasis)",
    appVar: "--client",
  },
  {
    role: "accent-soft",
    sources: ["color-accent-soft", "accent-soft"],
    description: "Soft tint behind accents",
  },
  {
    role: "signal",
    sources: ["color-signal", "signal"],
    description: "Highlight / proof / metric accent",
    appVar: "--collab",
  },
  {
    role: "muted",
    sources: ["color-muted", "muted"],
    description: "Secondary text",
    appVar: "--muted",
  },
  {
    role: "line",
    sources: ["color-line", "line", "border"],
    description: "Hairline borders",
    appVar: "--border",
  },
  {
    role: "success",
    sources: ["color-success", "success"],
    description: "Positive status",
    appVar: "--ok",
  },
  {
    role: "danger",
    sources: ["color-danger", "danger"],
    description: "Error / destructive status",
    appVar: "--danger",
  },
  {
    role: "font-display",
    sources: ["font-display"],
    description: "Display / editorial headings",
  },
  {
    role: "font-body",
    sources: ["font-body"],
    description: "UI and body type",
  },
];

function firstRootBlock(cssOrHtml: string): string {
  // Prefer the first `:root { ... }` before dark theme overrides.
  const match = cssOrHtml.match(/:root\s*\{[\s\S]*?\}/);
  return match?.[0] ?? "";
}

function darkThemeBlock(cssOrHtml: string): string {
  const match = cssOrHtml.match(/\[data-theme=["']dark["']\]\s*\{[\s\S]*?\}/);
  return match?.[0] ?? "";
}

function parseCssVars(block: string): TokenMap {
  const vars: TokenMap = {};
  for (const m of block.matchAll(/--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g)) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

function resolveVar(value: string, vars: TokenMap, depth = 0): string {
  if (depth > 6) return value;
  const m = value.match(/^var\(\s*--([a-zA-Z0-9-_]+)\s*\)$/);
  if (!m) return value;
  const next = vars[m[1]];
  if (!next) return value;
  return resolveVar(next, vars, depth + 1);
}

function pickRole(vars: TokenMap, sources: string[]): string | undefined {
  for (const key of sources) {
    if (vars[key]) return resolveVar(vars[key], vars);
  }
  return undefined;
}

function extractSection(html: string, id: string): string {
  const re = new RegExp(
    `<[^>]*\\bid=["']${id}["'][^>]*>[\\s\\S]*?(?=<section\\b[^>]*\\bid=["']|</main>|</body>)`,
    "i"
  );
  return html.match(re)?.[0] ?? "";
}

function extractIcons(html: string): Array<{ name: string; svg: string }> {
  const section = extractSection(html, "icons");
  if (!section) return [];
  const icons: Array<{ name: string; svg: string }> = [];
  // icon-cell blocks with label + first 24px svg
  const cells = section.split(/class=["']icon-cell["']/i).slice(1);
  for (const cell of cells) {
    const label =
      cell.match(/class=["']lbl["'][^>]*>\s*([^<]+)/i)?.[1]?.trim() ||
      cell.match(/<!--\s*([a-z0-9 _-]+)\s*-->/i)?.[1]?.trim() ||
      `icon-${icons.length + 1}`;
    const svg = cell.match(/<svg\b[\s\S]*?<\/svg>/i)?.[0];
    if (!svg) continue;
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    // Normalize to 24 viewBox standalone file
    const cleaned = svg
      .replace(/\sclass=["'][^"']*["']/gi, "")
      .replace(/\swidth=["'][^"']*["']/i, ' width="24"')
      .replace(/\sheight=["'][^"']*["']/i, ' height="24"');
    icons.push({ name: slug || `icon-${icons.length + 1}`, svg: cleaned });
  }
  // Dedupe by name
  const seen = new Set<string>();
  return icons.filter((icon) => {
    if (seen.has(icon.name)) return false;
    seen.add(icon.name);
    return true;
  });
}

function extractLogoFromSystem(html: string): string | null {
  const section = extractSection(html, "logo");
  const svg = section.match(/<svg\b[\s\S]*?<\/svg>/i)?.[0];
  return svg ?? null;
}

function stripLogoPaperBackground(svg: string): string {
  // Remove full-bleed paper rect so the mark works on any surface.
  return svg.replace(/<rect[^>]*width=["']400["'][^>]*height=["']120["'][^>]*\/?>/i, "");
}

function extractLandingCopy(html: string): Record<string, unknown> {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const h1 =
    html
      .match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() ?? "";
  const kickers = [...html.matchAll(/class=["'][^"']*kicker[^"']*["'][^>]*>([\s\S]*?)<\//gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 12);
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 16);
  const lede =
    html
      .match(/class=["'][^"']*lede[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() ?? "";
  return {
    documentTitle: title,
    hero: { headline: h1, lede },
    kickers,
    sectionTitles: h2s,
  };
}

function buildTokensCss(roles: TokenMap, raw: TokenMap, dark?: TokenMap): string {
  const lines = [
    "/* Brand Implement Pack — tokens.css",
    "   Generated by Faro from the approved Brand Identity System.",
    "   Import this file (or copy :root) into your product. */",
    "",
    ":root {",
  ];
  for (const [key, value] of Object.entries(roles)) {
    lines.push(`  --brand-${key}: ${value};`);
  }
  // App chrome mapping used by Faro Design product UI
  lines.push("");
  lines.push("  /* Product chrome aliases (Faro webapp) */");
  lines.push("  --background: var(--brand-paper);");
  lines.push("  --surface: var(--brand-surface);");
  lines.push("  --surface-2: var(--brand-surface-2);");
  lines.push("  --foreground: var(--brand-ink);");
  lines.push("  --muted: var(--brand-muted);");
  lines.push("  --subtle: color-mix(in srgb, var(--brand-muted) 70%, var(--brand-paper));");
  lines.push("  --border: var(--brand-line);");
  lines.push("  --border-strong: color-mix(in srgb, var(--brand-line) 85%, var(--brand-ink));");
  lines.push("  --accent: var(--brand-primary);");
  lines.push("  --accent-hover: var(--brand-primary-strong);");
  lines.push(
    "  --accent-soft: color-mix(in srgb, var(--brand-primary) 12%, var(--brand-paper));"
  );
  lines.push("  --client: var(--brand-accent);");
  lines.push("  --designer: var(--brand-primary);");
  lines.push("  --collab: var(--brand-signal);");
  lines.push("  --ok: var(--brand-success);");
  lines.push("  --danger: var(--brand-danger);");
  lines.push("  --field: var(--brand-surface);");
  if (raw["shadow-1"]) lines.push(`  --shadow-card: ${raw["shadow-1"]};`);
  if (raw["shadow-3"]) lines.push(`  --shadow-pop: ${raw["shadow-3"]};`);
  if (raw["radius-md"]) lines.push(`  --radius-md: ${raw["radius-md"]};`);
  if (raw["radius-lg"]) lines.push(`  --radius-lg: ${raw["radius-lg"]};`);
  if (raw["radius-pill"]) lines.push(`  --radius-pill: ${raw["radius-pill"]};`);
  lines.push("}");
  if (dark && Object.keys(dark).length > 0) {
    lines.push("");
    lines.push('[data-theme="dark"] {');
    for (const [key, value] of Object.entries(dark)) {
      lines.push(`  --brand-${key.replace(/^color-/, "")}: ${value};`);
    }
    lines.push("}");
  }
  lines.push("");
  return lines.join("\n");
}

function buildImplementMd(projectName: string, roles: TokenMap, iconNames: string[]): string {
  return `# Brand implement pack — ${projectName}

Machine-readable handoff for engineers and design systems.

## Contents

| Path | Purpose |
|------|---------|
| \`tokens.css\` | CSS custom properties + product chrome aliases |
| \`tokens.json\` | Same roles as JSON (tools, theming scripts) |
| \`logo-mark.svg\` | Mark without paper background (nav, favicon source) |
| \`logo-lockup.svg\` | Full lockup as approved |
| \`icons/*.svg\` | Icon set extracted from the identity system |
| \`copy.json\` | Headlines and section titles from the landing page |
| \`IMPLEMENT.md\` | This file |

## Roles → usage

${ROLE_MAP.map((r) => {
  const v = roles[r.role] ?? "(not found in system)";
  return `- **${r.role}** (\`${v}\`) — ${r.description}${r.appVar ? ` → product \`${r.appVar}\`` : ""}`;
}).join("\n")}

## Icons (${iconNames.length})

${iconNames.length ? iconNames.map((n) => `- \`icons/${n}.svg\``).join("\n") : "- (none extracted — regenerate identity with #icons section)"}

## How to apply in a web app

1. Copy \`tokens.css\` into your app and import it once at the root.
2. Map product components to roles:
   - Primary buttons → \`--brand-primary\` / hover \`--brand-primary-strong\`
   - Page background → \`--brand-paper\`
   - Body text → \`--brand-ink\`, secondary → \`--brand-muted\`
   - Borders → \`--brand-line\`
   - Kickers / tags → \`--brand-accent\`
3. Use \`logo-mark.svg\` in navigation (currentColor works if paths use \`currentColor\` or you set fill/stroke).
4. Prefer icons from \`icons/\` over random icon fonts for brand consistency.
5. Keep offline: no remote webfonts unless you self-host (display stack lists fallbacks).

## Quality checks

- [ ] Contrast: ink on paper and white on primary meet WCAG AA for UI text
- [ ] Buttons use primary, not random grays
- [ ] Logo clearspace roughly matches identity system rules
- [ ] Icons share one stroke weight / corner language

---
Generated by Faro Design Brand Handover.
`;
}

/** Build the Brand Implement Pack from a project's selected finals. */
export function buildBrandPack(projectId: string): BrandPackResult {
  const project = getProject(projectId);
  if (!project) throw new Error("Project not found");

  const assets = listAssets(projectId);
  const issue = finalDeliverableIssue(assets);
  if (issue) throw new Error(issue);

  const system = getSelectedAsset(projectId, "design_system");
  const landing = getSelectedAsset(projectId, "landing_page");
  if (!system?.html) throw new Error("No final Brand Identity System selected.");

  const root = firstRootBlock(system.html);
  const darkRoot = darkThemeBlock(system.html);
  const rawVars = parseCssVars(root);
  const darkVars = parseCssVars(darkRoot);

  const roles: TokenMap = {};
  const roleTable: Array<{ role: string; value: string; description: string; appVar?: string }> =
    [];
  for (const def of ROLE_MAP) {
    const value = pickRole(rawVars, def.sources);
    if (value) {
      roles[def.role] = value;
      roleTable.push({
        role: def.role,
        value,
        description: def.description,
        appVar: def.appVar,
      });
    }
  }
  // Defaults if surface missing
  if (!roles.surface) roles.surface = roles.paper ? "#FFFFFF" : "#ffffff";
  if (!roles["surface-2"] && roles.paper) roles["surface-2"] = roles.paper;
  if (!roles["primary-strong"] && roles.primary) roles["primary-strong"] = roles.primary;
  if (!roles.success) roles.success = "#2E7D5B";
  if (!roles.danger) roles.danger = "#C0392B";
  if (!roles.signal && roles.accent) roles.signal = roles.accent;
  if (!roles["accent-soft"] && roles.accent) roles["accent-soft"] = roles.accent;

  const darkRoles: TokenMap = {};
  for (const def of ROLE_MAP) {
    const value = pickRole(darkVars, def.sources);
    if (value) darkRoles[def.role] = value;
  }

  // Logo
  const approvedLogo = listStudioAssets(projectId, "logo").find((a) => a.status === "approved");
  const lockupSvg =
    (typeof approvedLogo?.payload?.svg === "string" && approvedLogo.payload.svg) ||
    extractLogoFromSystem(system.html) ||
    "";
  const markSvg = lockupSvg ? stripLogoPaperBackground(lockupSvg) : "";

  const icons = extractIcons(system.html);
  const copy = landing?.html
    ? extractLandingCopy(landing.html)
    : { documentTitle: project.name, hero: {}, kickers: [], sectionTitles: [] };

  const tokensJson = {
    project: { id: project.id, name: project.name },
    generatedAt: new Date().toISOString(),
    roles: roleTable,
    tokens: roles,
    dark: Object.keys(darkRoles).length ? darkRoles : undefined,
    fonts: {
      display: roles["font-display"] ?? rawVars["font-display"] ?? null,
      body: roles["font-body"] ?? rawVars["font-body"] ?? null,
    },
    raw: rawVars,
    icons: icons.map((i) => i.name),
  };

  const files: BrandPackFile[] = [
    { path: "tokens.css", content: buildTokensCss(roles, rawVars, darkRoles) },
    { path: "tokens.json", content: JSON.stringify(tokensJson, null, 2) },
    {
      path: "IMPLEMENT.md",
      content: buildImplementMd(
        project.name,
        roles,
        icons.map((i) => i.name)
      ),
    },
    { path: "copy.json", content: JSON.stringify(copy, null, 2) },
  ];

  if (markSvg) {
    files.push({
      path: "logo-mark.svg",
      content: markSvg.includes("xmlns")
        ? markSvg
        : markSvg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'),
    });
  }
  if (lockupSvg) {
    files.push({
      path: "logo-lockup.svg",
      content: lockupSvg.includes("xmlns")
        ? lockupSvg
        : lockupSvg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'),
    });
  }
  for (const icon of icons) {
    const svg = icon.svg.includes("xmlns")
      ? icon.svg
      : icon.svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    files.push({ path: `icons/${icon.name}.svg`, content: svg });
  }

  // Manifest for tooling
  files.push({
    path: "manifest.json",
    content: JSON.stringify(
      {
        format: "faro-brand-implement-pack",
        version: 1,
        projectName: project.name,
        projectId: project.id,
        files: files.map((f) => f.path),
      },
      null,
      2
    ),
  });

  return {
    projectId: project.id,
    projectName: project.name,
    files,
    downloadName: `${sanitizeDownloadName(project.name)}-brand-implement-pack.zip`,
  };
}

/** Minimal ZIP (store only) — no compression dependency. */
export function zipBrandPack(files: BrandPackFile[]): Buffer {
  const encoder = new TextEncoder();
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.path.replace(/\\/g, "/"));
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); // store
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc >>> 0, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, Buffer.from(name), Buffer.from(data));

    const cen = Buffer.alloc(46 + name.length);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0, 14);
    cen.writeUInt32LE(crc >>> 0, 16);
    cen.writeUInt32LE(data.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, Buffer.from(name));
    offset += local.length + name.length + data.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, centralBuf, end]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

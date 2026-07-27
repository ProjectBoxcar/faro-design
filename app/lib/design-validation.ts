import type { AssetKind } from "@/lib/db/types";

function strippedHtml(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

/**
 * Clean model output before validation. OD/Claude often wrap HTML in markdown,
 * cut off mid-document, or slip in Google Fonts / CDN links that our offline
 * contract rejects — causing "could not create proposal A" with empty assets.
 */
export function normalizeGeneratedHtml(
  raw: string,
  kind: AssetKind,
  opts?: { approvedLogoSvg?: string }
): string {
  let html = (raw ?? "").trim();
  if (!html) return html;

  // Strip markdown fences: ```html ... ``` or ``` ... ```
  const fenced = html.match(/```(?:html|HTML)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) html = fenced[1].trim();

  // Drop leading prose before the document
  const doctypeAt = html.search(/<!doctype html>/i);
  if (doctypeAt > 0) html = html.slice(doctypeAt);
  else if (!/^<!doctype html>/i.test(html) && /<html[\s>]/i.test(html)) {
    const htmlAt = html.search(/<html[\s>]/i);
    if (htmlAt >= 0) html = `<!DOCTYPE html>\n${html.slice(htmlAt)}`;
  }

  // If the model trailed with explanation after </html>, keep only the document
  const closeAt = html.toLowerCase().lastIndexOf("</html>");
  if (closeAt >= 0) {
    html = html.slice(0, closeAt + "</html>".length);
  }

  // Remove external stylesheets / scripts (offline contract)
  html = html.replace(
    /<link\b[^>]*\bhref\s*=\s*["'](?:https?:)?\/\/[^"']+["'][^>]*>/gi,
    ""
  );
  html = html.replace(
    /<script\b[^>]*\bsrc\s*=\s*["'](?:https?:)?\/\/[^"']+["'][^>]*>\s*<\/script>/gi,
    ""
  );
  html = html.replace(/@import\s+(?:url\()?\s*["']?(?:https?:)?\/\/[^"');]+["']?\)?\s*;?/gi, "");

  // Ensure viewport
  if (!/<meta\b[^>]*name=["']viewport["']/i.test(html)) {
    if (/<\/head>/i.test(html)) {
      html = html.replace(
        /<\/head>/i,
        `<meta name="viewport" content="width=device-width, initial-scale=1" />\n</head>`
      );
    } else if (/<head[^>]*>/i.test(html)) {
      html = html.replace(
        /<head[^>]*>/i,
        (m) =>
          `${m}\n<meta name="viewport" content="width=device-width, initial-scale=1" />`
      );
    }
  }

  // Ensure reduced-motion support
  if (!/@media\s*[^\{]*\(\s*prefers-reduced-motion\s*:/i.test(html)) {
    const motionCss =
      "@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}";
    if (/<\/style>/i.test(html)) {
      html = html.replace(/<\/style>/i, `${motionCss}\n</style>`);
    } else if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `<style>${motionCss}</style>\n</head>`);
    }
  }

  // Ensure a body we can append into (truncated streams often stop mid-body).
  if (/<!doctype html>/i.test(html) || /<html[\s>]/i.test(html)) {
    if (!/<body[\s>]/i.test(html)) {
      if (/<\/head>/i.test(html)) {
        html = html.replace(/<\/head>/i, "</head>\n<body>\n");
      } else {
        html += "\n<body>\n";
      }
    }
  }

  // Design system: inject missing required section shells so validation passes
  // when the model produced a real page but forgot an id.
  if (kind === "design_system") {
    const missingSections = ["logo", "color", "type", "icons", "components"].filter(
      (id) => !new RegExp(`<[a-z][^>]*\\bid=["']${id}["']`, "i").test(html)
    );
    if (missingSections.length > 0) {
      const logoBlock =
        opts?.approvedLogoSvg && /<svg\b/i.test(opts.approvedLogoSvg)
          ? opts.approvedLogoSvg
          : "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 120 40\"><text y=\"28\" font-size=\"18\">Logo</text></svg>";
      const shells = missingSections
        .map((id) => {
          if (id === "logo") {
            return `<section id="logo"><h2>Logo</h2><div class="logo-mark">${logoBlock}</div></section>`;
          }
          return `<section id="${id}"><h2>${id}</h2><p>See system tokens above.</p></section>`;
        })
        .join("\n");
      if (/<\/body>/i.test(html)) {
        html = html.replace(/<\/body>/i, `${shells}\n</body>`);
      } else {
        html += `\n${shells}\n`;
      }
    }
    // Embed approved SVG if the page has no svg at all
    if (
      opts?.approvedLogoSvg &&
      !/<svg\b/i.test(html) &&
      /id=["']logo["']/i.test(html)
    ) {
      html = html.replace(
        /(<section[^>]*id=["']logo["'][^>]*>)/i,
        `$1\n<div class="logo-mark">${opts.approvedLogoSvg}</div>`
      );
    }
  }

  // Close an incomplete document rather than rejecting after long OD waits
  if (/<!doctype html>/i.test(html) || /<html[\s>]/i.test(html)) {
    if (!/<\/body>/i.test(html)) html += "\n</body>";
    if (!/<\/html>/i.test(html)) html += "\n</html>";
  }

  return html.trim();
}

function isRemoteResource(value: string): boolean {
  const url = value.trim().replace(/^['"]|['"]$/g, "");
  if (/^(?:data:|blob:|#|\/[^/])/i.test(url)) return false;
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(url) || /^[a-z][a-z0-9+.-]*:/i.test(url);
}

export function externalResourceUrls(html: string): string[] {
  const source = strippedHtml(html);
  const urls = new Set<string>();
  const attributes = /<(?:link|script|img|source)\b[^>]*(?:href|src)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  for (const match of source.matchAll(attributes)) {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    if (isRemoteResource(value)) urls.add(value);
  }
  const cssUrls = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/gi;
  for (const match of source.matchAll(cssUrls)) {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    if (isRemoteResource(value)) urls.add(value);
  }
  const imports = /@import\s+(?:url\()?\s*(?:"([^"]+)"|'([^']+)'|([^\s;)]+))/gi;
  for (const match of source.matchAll(imports)) {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    if (isRemoteResource(value)) urls.add(value);
  }
  return [...urls];
}

function hasId(html: string, id: string): boolean {
  return new RegExp(`<[a-z][^>]*\\bid=["']${id}["']`, "i").test(strippedHtml(html));
}

export function generatedArtifactIssues(kind: AssetKind, html: string): string[] {
  const source = strippedHtml(html);
  const issues: string[] = [];
  if (!/^<!doctype html>/i.test(source.trim())) issues.push("missing <!DOCTYPE html>");
  if (!/<meta\b[^>]*name=["']viewport["']/i.test(source)) issues.push("missing viewport meta tag");
  // Allow trailing whitespace after </html>; reject only when the close tag is absent.
  if (!/<\/html>/i.test(source)) issues.push("incomplete HTML document");
  if (!/@media\s*[^\{]*\(\s*prefers-reduced-motion\s*:/i.test(source)) issues.push("missing reduced-motion behavior");
  const external = externalResourceUrls(source);
  if (external.length > 0) issues.push(`external resources are not allowed: ${external.join(", ")}`);

  if (kind === "design_system") {
    for (const section of ["logo", "color", "type", "icons", "components"]) {
      if (!hasId(source, section)) issues.push(`missing #${section} section`);
    }
    // Require a real icon set: several inline SVGs inside #icons (not prose only).
    if (hasId(source, "icons")) {
      const iconsChunk =
        source.match(/<[^>]*\bid=["']icons["'][^>]*>[\s\S]*?(?=<section\b[^>]*\bid=["']|<\/main>|<\/body>)/i)?.[0] ??
        "";
      const svgCount = (iconsChunk.match(/<svg\b/gi) ?? []).length;
      if (svgCount < 6) {
        issues.push("icons section must include at least 6 inline SVG icons");
      }
    }
    // Logo section must still show the workshop-approved mark (as SVG), not invent a new one.
    if (!/<svg\b/i.test(source)) issues.push("missing embedded approved SVG logo");
  }

  if (kind === "landing_page") {
    if (!hasId(source, "faq")) issues.push("missing #faq section");
    if (!/data-mobile-menu=["']true["']/i.test(source)) issues.push("missing mobile menu hook");
    if (!/intersectionobserver/i.test(source)) issues.push("missing scroll reveal behavior");
  }

  if (kind === "deck") {
    const slides = [...source.matchAll(/data-slide=["'](\d+)["']/gi)].map((match) => Number(match[1]));
    if (slides.length !== 12 || new Set(slides).size !== 12) issues.push("deck must contain exactly 12 numbered slides");
    if (!/arrowleft|arrowright/i.test(source)) issues.push("missing keyboard navigation");
    if (!/touchstart|pointerdown/i.test(source)) issues.push("missing touch navigation");
  }

  return issues;
}

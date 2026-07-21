import type { AssetKind } from "@/lib/db/types";

function strippedHtml(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
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
  if (!/<\/html>\s*$/i.test(source.trim())) issues.push("incomplete HTML document");
  if (!/@media\s*[^\{]*\(\s*prefers-reduced-motion\s*:/i.test(source)) issues.push("missing reduced-motion behavior");
  const external = externalResourceUrls(source);
  if (external.length > 0) issues.push(`external resources are not allowed: ${external.join(", ")}`);

  if (kind === "design_system") {
    for (const section of ["logo", "color", "type", "components"]) {
      if (!hasId(source, section)) issues.push(`missing #${section} section`);
    }
    if (!/<svg\b/i.test(source)) issues.push("missing embedded SVG logo");
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

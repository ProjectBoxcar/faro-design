/**
 * Explain whatever the cursor is over — catalog + element heuristics.
 */

import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/types";

export type HoverExplain = {
  title: string;
  body: string;
  /** Anchor id or synthetic key */
  key: string;
  el: HTMLElement;
};

/** data-faro-anchor id → i18n keys under explain.* */
const ANCHOR_EXPLAIN: Record<string, { title: string; body: string }> = {
  "faro-start-brand": { title: "explain.startBrand.title", body: "explain.startBrand.body" },
  "faro-home-projects": { title: "explain.homeProjects.title", body: "explain.homeProjects.body" },
  "faro-lang": { title: "explain.lang.title", body: "explain.lang.body" },
  "faro-start-next": { title: "explain.startNext.title", body: "explain.startNext.body" },
  "faro-start-finish": { title: "explain.startFinish.title", body: "explain.startFinish.body" },
  "faro-start-name": { title: "explain.startName.title", body: "explain.startName.body" },
  "faro-express-approve": {
    title: "explain.expressApprove.title",
    body: "explain.expressApprove.body",
  },
  "faro-express-apply": { title: "explain.expressApply.title", body: "explain.expressApply.body" },
  "faro-design-handover": {
    title: "explain.designHandover.title",
    body: "explain.designHandover.body",
  },
  "faro-hub-continue": { title: "explain.hubContinue.title", body: "explain.hubContinue.body" },
  "faro-journey-current": {
    title: "explain.journeyCurrent.title",
    body: "explain.journeyCurrent.body",
  },
  "faro-handover-pack": { title: "explain.handoverPack.title", body: "explain.handoverPack.body" },
  "faro-handover-share": {
    title: "explain.handoverShare.title",
    body: "explain.handoverShare.body",
  },
  "faro-content-generate": {
    title: "explain.contentGenerate.title",
    body: "explain.contentGenerate.body",
  },
};

function cleanText(s: string, max = 80): string {
  return s.replace(/\s+/g, " ").trim().slice(0, max);
}

function labelFromEl(el: HTMLElement): string {
  const aria = el.getAttribute("aria-label");
  if (aria?.trim()) return cleanText(aria);
  const title = el.getAttribute("title");
  if (title?.trim()) return cleanText(title);
  const text = el.innerText || el.textContent || "";
  if (text.trim()) return cleanText(text, 60);
  const ph = el.getAttribute("placeholder");
  if (ph?.trim()) return cleanText(ph);
  return el.tagName.toLowerCase();
}

/**
 * Find the best explainable target under the cursor (or from an element).
 */
export function findExplainTarget(from: Element | null): HTMLElement | null {
  if (!from || !(from instanceof Element)) return null;
  if (from instanceof HTMLElement && from.closest("[data-faro-assistant]")) return null;

  const hit = from.closest<HTMLElement>(
    [
      "[data-faro-explain]",
      "[data-faro-anchor]",
      "button",
      "a[href]",
      "input",
      "textarea",
      "select",
      "[role='button']",
      "[role='link']",
      "[role='tab']",
      "label",
      "summary",
      "h1",
      "h2",
      "h3",
      "nav a",
      "li a",
    ].join(",")
  );
  if (!hit) return null;
  if (hit.closest("[data-faro-assistant]")) return null;
  return hit;
}

/**
 * Build a short Faro explanation for an element.
 */
export function explainElement(el: HTMLElement, locale: AppLocale): HoverExplain | null {
  // Explicit author string
  const explicit = el.getAttribute("data-faro-explain");
  if (explicit?.trim()) {
    const label = labelFromEl(el);
    return {
      key: `explicit:${label}`,
      title: label,
      body: cleanText(explicit, 220),
      el,
    };
  }

  const anchor = el.getAttribute("data-faro-anchor");
  if (anchor && ANCHOR_EXPLAIN[anchor]) {
    const keys = ANCHOR_EXPLAIN[anchor];
    return {
      key: anchor,
      title: translate(locale, keys.title),
      body: translate(locale, keys.body),
      el,
    };
  }

  // Heuristic from control type + visible label
  const label = labelFromEl(el);
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role") || "";
  const type = (el.getAttribute("type") || "").toLowerCase();

  let bodyKey = "explain.generic.control";
  if (tag === "a" || role === "link") bodyKey = "explain.generic.link";
  else if (tag === "button" || role === "button") bodyKey = "explain.generic.button";
  else if (tag === "input" || tag === "textarea" || tag === "select")
    bodyKey = "explain.generic.field";
  else if (tag === "h1" || tag === "h2" || tag === "h3") bodyKey = "explain.generic.heading";
  else if (type === "checkbox") bodyKey = "explain.generic.checkbox";

  const body = translate(locale, bodyKey, { label: label || "…" });
  // Skip empty/useless
  if (!label || label.length < 2) return null;

  return {
    key: `heuristic:${tag}:${label}`,
    title: label,
    body,
    el,
  };
}

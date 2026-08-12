/**
 * Explain whatever the cursor is over — deep product knowledge, not filler.
 */

import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/types";
import { matchProductKnowledge } from "@/lib/faro-product-knowledge";

export type HoverExplain = {
  title: string;
  body: string;
  /** Anchor id or synthetic key */
  key: string;
  el: HTMLElement;
  /** True when explanation is from product knowledge (not weak generic) */
  deep: boolean;
};

/** data-faro-anchor id → knowledge id under explain.k.* */
const ANCHOR_TO_KNOWLEDGE: Record<string, string> = {
  "faro-start-brand": "startBrand",
  "faro-home-projects": "projectsList",
  "faro-lang": "language",
  "faro-start-next": "nextStep",
  "faro-start-finish": "finishDraft",
  "faro-start-name": "nameField",
  "faro-name-confirm": "nameConfirm",
  "faro-name-primary": "nameConfirm",
  "faro-express-approve": "approveStrategy",
  "faro-express-apply": "applyEdits",
  "faro-express-header": "pathExpress",
  "faro-express-resume": "continueDrafting",
  "faro-full-map": "fullMap",
  "faro-logo-continue": "logoGate",
  "faro-logo-approve": "logoGate",
  "faro-logo-primary": "logoGate",
  "faro-design-handover": "handover",
  "faro-design-generate": "designBuild",
  "faro-design-primary": "pathDesign",
  "faro-hub-continue": "continueJourney",
  "faro-journey-current": "journeyCurrent",
  "faro-handover-pack": "productPack",
  "faro-handover-share": "sharePackage",
  "faro-content-generate": "contentMonth",
  "faro-content-review": "reviewPhotos",
  "faro-content-primary": "contentStudio",
  "faro-settings-keys": "settings",
};

function cleanText(s: string, max = 100): string {
  return s.replace(/\s+/g, " ").trim().slice(0, max);
}

function labelFromEl(el: HTMLElement): string {
  const aria = el.getAttribute("aria-label");
  if (aria?.trim()) return cleanText(aria);
  const title = el.getAttribute("title");
  if (title?.trim()) return cleanText(title);
  const text = el.innerText || el.textContent || "";
  if (text.trim()) return cleanText(text, 72);
  const ph = el.getAttribute("placeholder");
  if (ph?.trim()) return cleanText(ph);
  return el.tagName.toLowerCase();
}

function hrefFromEl(el: HTMLElement): string | null {
  const direct = el.getAttribute("href");
  if (direct) return direct;
  try {
    const a = el.closest?.("a[href]");
    if (a && "getAttribute" in a) {
      return (a as HTMLElement).getAttribute("href");
    }
  } catch {
    /* node tests without full DOM */
  }
  return null;
}

function knowledgeExplain(
  knowledgeId: string,
  locale: AppLocale,
  el: HTMLElement,
  key: string
): HoverExplain | null {
  const title = translate(locale, `explain.k.${knowledgeId}.title`);
  const body = translate(locale, `explain.k.${knowledgeId}.body`);
  // Missing keys fall back to the key string itself
  if (!title || title.startsWith("explain.k.") || !body || body.startsWith("explain.k.")) {
    return null;
  }
  return { key, title, body, el, deep: true };
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
 * Build a short, clear, insightful Faro explanation for an element.
 */
export function explainElement(
  el: HTMLElement,
  locale: AppLocale,
  pathname?: string | null
): HoverExplain | null {
  // Explicit author string (product writers can pin deep copy)
  const explicit = el.getAttribute("data-faro-explain");
  if (explicit?.trim()) {
    const label = labelFromEl(el);
    return {
      key: `explicit:${label}`,
      title: label,
      body: cleanText(explicit, 280),
      el,
      deep: true,
    };
  }

  const label = labelFromEl(el);
  const href = hrefFromEl(el);
  const path =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : null);

  // 1) Anchored product knowledge
  const anchor = el.getAttribute("data-faro-anchor");
  if (anchor && ANCHOR_TO_KNOWLEDGE[anchor]) {
    const hit = knowledgeExplain(
      ANCHOR_TO_KNOWLEDGE[anchor],
      locale,
      el,
      anchor
    );
    if (hit) return hit;
  }

  // 2) Keyword / href / path knowledge
  const matched = matchProductKnowledge({ label, href, pathname: path });
  if (matched) {
    const hit = knowledgeExplain(matched.id, locale, el, `k:${matched.id}:${label}`);
    if (hit) return hit;
  }

  // 3) Heading on a known path — stage insight
  const tag = el.tagName.toLowerCase();
  if (tag === "h1" || tag === "h2" || tag === "h3") {
    const pathHit = matchProductKnowledge({ label: "", href: null, pathname: path });
    if (pathHit) {
      const hit = knowledgeExplain(pathHit.id, locale, el, `h:${pathHit.id}`);
      if (hit) {
        return {
          ...hit,
          title: label.length > 2 ? label : hit.title,
          key: `heading:${pathHit.id}:${label}`,
        };
      }
    }
  }

  // 4) Strong generic only when we have a real label — still useful, not fluffy
  if (!label || label.length < 2) return null;

  const role = el.getAttribute("role") || "";
  const type = (el.getAttribute("type") || "").toLowerCase();
  let bodyKey = "explain.generic.control";
  if (tag === "a" || role === "link") bodyKey = "explain.generic.link";
  else if (tag === "button" || role === "button") bodyKey = "explain.generic.button";
  else if (tag === "input" || tag === "textarea" || tag === "select")
    bodyKey = "explain.generic.field";
  else if (tag === "h1" || tag === "h2" || tag === "h3") bodyKey = "explain.generic.heading";
  else if (type === "checkbox") bodyKey = "explain.generic.checkbox";

  return {
    key: `heuristic:${tag}:${label}`,
    title: label,
    body: translate(locale, bodyKey, { label }),
    el,
    deep: false,
  };
}

/** Payload for optional AI enrichment when local knowledge is shallow */
export function hoverContextPayload(el: HTMLElement, pathname: string) {
  return {
    label: labelFromEl(el),
    href: hrefFromEl(el),
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute("role"),
    anchor: el.getAttribute("data-faro-anchor"),
    pathname,
  };
}

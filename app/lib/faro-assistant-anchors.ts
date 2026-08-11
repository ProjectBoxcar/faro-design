/**
 * Faro living assistant — which UI anchors to dock to per journey scene.
 * Mark elements with data-faro-anchor="<id>".
 */

import type { CoachScene } from "@/lib/journey-coach-pure";

export type AnchorPlacement = "left" | "right" | "above" | "below";

/** Preferred anchor ids (first visible wins) for each scene */
export const SCENE_ANCHORS: Record<Exclude<CoachScene, "hidden">, string[]> = {
  home: ["faro-start-brand", "faro-home-projects", "faro-lang"],
  start: ["faro-start-next", "faro-start-finish", "faro-start-name"],
  settings: ["faro-settings-keys", "faro-lang"],
  hub: ["faro-hub-continue", "faro-journey-current", "faro-lang"],
  strategy: ["faro-express-approve", "faro-express-apply", "faro-express-header"],
  strategy_map: ["faro-full-map", "faro-journey-current"],
  name: ["faro-name-confirm", "faro-name-primary"],
  logo: ["faro-logo-continue", "faro-logo-approve", "faro-logo-primary"],
  design: ["faro-design-handover", "faro-design-generate", "faro-design-primary"],
  handover: ["faro-handover-share", "faro-handover-pack", "faro-handover-primary"],
  content: ["faro-content-generate", "faro-content-review", "faro-content-primary"],
  content_standalone: ["faro-content-generate", "faro-content-primary"],
};

export type DockRect = {
  left: number;
  top: number;
  placement: AnchorPlacement;
};

/**
 * Place a panel of size (pw, ph) near an anchor rect inside the viewport.
 */
export function dockNearRect(
  anchor: { left: number; top: number; width: number; height: number; right: number; bottom: number },
  pw: number,
  ph: number,
  gap = 12,
  prefer: AnchorPlacement[] = ["right", "left", "above", "below"]
): DockRect {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const pad = 10;

  const candidates: Record<AnchorPlacement, { left: number; top: number }> = {
    right: {
      left: anchor.right + gap,
      top: anchor.top + anchor.height / 2 - ph / 2,
    },
    left: {
      left: anchor.left - gap - pw,
      top: anchor.top + anchor.height / 2 - ph / 2,
    },
    above: {
      left: anchor.left + anchor.width / 2 - pw / 2,
      top: anchor.top - gap - ph,
    },
    below: {
      left: anchor.left + anchor.width / 2 - pw / 2,
      top: anchor.bottom + gap,
    },
  };

  function clamp(p: { left: number; top: number }) {
    return {
      left: Math.min(Math.max(pad, p.left), Math.max(pad, vw - pw - pad)),
      top: Math.min(Math.max(pad, p.top), Math.max(pad, vh - ph - pad)),
    };
  }

  function fits(p: { left: number; top: number }) {
    return (
      p.left >= pad - 2 &&
      p.top >= pad - 2 &&
      p.left + pw <= vw - pad + 2 &&
      p.top + ph <= vh - pad + 2
    );
  }

  for (const place of prefer) {
    const raw = candidates[place];
    if (fits(raw)) return { ...raw, placement: place };
  }

  // Best effort: first preferred, clamped
  const fallback = prefer[0] ?? "right";
  const c = clamp(candidates[fallback]);
  return { ...c, placement: fallback };
}

export function isElementUsable(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  // At least partially in viewport
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return false;
  return true;
}

/** Resolve best anchor element for a scene (+ optional live interaction target). */
export function resolveAssistantAnchor(
  scene: Exclude<CoachScene, "hidden">,
  interactionEl: HTMLElement | null
): HTMLElement | null {
  if (typeof document === "undefined") return null;

  // Recent user focus/click — stay with them if still visible
  if (interactionEl && isElementUsable(interactionEl)) {
    return interactionEl;
  }

  for (const id of SCENE_ANCHORS[scene] ?? []) {
    const el = document.querySelector(`[data-faro-anchor="${id}"]`);
    if (isElementUsable(el)) return el;
  }

  // Any primary on page
  const primary = document.querySelector("[data-faro-anchor='primary']");
  if (isElementUsable(primary)) return primary;

  // First visible marked anchor
  const any = document.querySelectorAll("[data-faro-anchor]");
  for (const el of any) {
    if (isElementUsable(el)) return el;
  }

  return null;
}

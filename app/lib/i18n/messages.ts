import type { AppLocale } from "@/lib/i18n/types";
import { en, es, type Catalog } from "@/lib/i18n/catalog";

const TABLES: Record<AppLocale, Catalog> = { en, es };

/** Dot-path key into the catalog, e.g. "start.q1.title" */
export type MessageKey = string;

function getPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * Translate a catalog key. Optional `{name}` interpolation via vars.
 */
export function translate(
  locale: AppLocale,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  let raw = getPath(TABLES[locale], key);
  if (typeof raw !== "string") {
    raw = getPath(TABLES.en, key);
  }
  if (typeof raw !== "string") return key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] != null ? String(vars[name]) : `{${name}}`
  );
}

/** Stage id → display label key */
export function stageLabelKey(stageId: string): MessageKey {
  const map: Record<string, MessageKey> = {
    strategy: "stage.strategy",
    name: "stage.name",
    logo: "stage.logo",
    design: "stage.design",
    handover: "stage.handover",
    content: "stage.content",
  };
  return map[stageId] ?? stageId;
}

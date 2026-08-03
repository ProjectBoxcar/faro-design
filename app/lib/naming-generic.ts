/**
 * Pure helpers: detect temporary / generic brand names (no DB).
 */

const GENERIC_EXACT = new Set(
  [
    "project",
    "brand",
    "my brand",
    "my business",
    "my company",
    "business",
    "company",
    "startup",
    "untitled",
    "test",
    "demo",
    "new brand",
    "new project",
    "working title",
    "tbd",
    "temp",
    "temporary",
    "placeholder",
    "name",
    "brand name",
    "studio",
    "agency",
    "shop",
    "store",
  ].map((s) => s.toLowerCase())
);

const GENERIC_CONTAINS = [
  /^my\s+/i,
  /^test\b/i,
  /^untitled\b/i,
  /^new\s+(brand|project|business|company)/i,
  /\bworking\s+title\b/i,
  /\bplaceholder\b/i,
  /\btbd\b/i,
  /^project\s*\d*$/i,
  /^brand\s*\d*$/i,
];

/** True when the Start name looks temporary / not a real brand. */
export function isGenericBrandName(name: string): boolean {
  const n = name.trim().replace(/\s+/g, " ");
  if (!n) return true;
  if (n.length < 2) return true;
  const lower = n.toLowerCase();
  if (GENERIC_EXACT.has(lower)) return true;
  if (GENERIC_CONTAINS.some((re) => re.test(n))) return true;
  if (!/\s/.test(n) && n.length <= 4 && /^(app|co|inc|llc|the|and|for)$/i.test(n)) return true;
  return false;
}

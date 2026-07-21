function normalizeTemplate(html: string): string {
  return html
    .toLowerCase()
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "<script></script>")
    .replace(/#[0-9a-f]{3,8}\b/g, "#color")
    .replace(/(?:rgb|hsl|oklch)a?\([^)]*\)/g, "color()")
    .replace(/\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|ms|s)?\b/g, "#")
    .replace(/proposal\s*[abc]/g, "proposal")
    .replace(/>[^<]+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}

function shingles(value: string, size = 16): Set<string> {
  const result = new Set<string>();
  if (value.length <= size) {
    if (value) result.add(value);
    return result;
  }
  for (let index = 0; index <= value.length - size; index += 4) {
    result.add(value.slice(index, index + size));
  }
  return result;
}

export function proposalSimilarity(first: string, second: string): number {
  if (first === second) return 1;
  const firstSet = shingles(normalizeTemplate(first));
  const secondSet = shingles(normalizeTemplate(second));
  if (firstSet.size === 0 || secondSet.size === 0) return 0;
  let overlap = 0;
  for (const token of firstSet) {
    if (secondSet.has(token)) overlap += 1;
  }
  return (2 * overlap) / (firstSet.size + secondSet.size);
}

export function isNearDuplicateProposal(first: string, second: string, threshold = 0.88): boolean {
  return proposalSimilarity(first, second) >= threshold;
}

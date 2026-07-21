export function sanitizeDownloadName(name: string): string {
  const cleaned = name
    .slice(0, 500)
    .normalize("NFKD")
    .replace(/[\u0000-\u001f\u007f\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 120);
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
  if (!cleaned) return "brand";
  return reserved.test(cleaned) ? `brand-${cleaned}` : cleaned;
}

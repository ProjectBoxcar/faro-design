// Tolerant extraction: pull the first {...} object out of a model's reply.
// Shared by every AI call site (generate, intake, naming check, viability gate).
/**
 * Read a JSON column. A corrupt cell becomes an empty object, empty list, or
 * null so one bad row cannot crash the project.
 */
export function parseStoredJson<T>(raw: string | null | undefined): T {
  if (raw == null || raw === "") return null as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) return [] as T;
    if (trimmed.startsWith("{")) return {} as T;
    return null as T;
  }
}

export function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return {};
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    return obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

import type { Section, Field } from "@/lib/methodology";

// Read-only, server-compatible (no hooks) renderer for one section's saved value.
// Skips fields with empty/missing values; formats each by its methodology field type.

type FieldValue = unknown;

function isNonEmpty(v: FieldValue): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) {
    if (v.length === 0) return false;
    // list (string[]) or table (Record<string,string>[])
    return v.some((item) => {
      if (typeof item === "string") return item.trim().length > 0;
      if (item && typeof item === "object") {
        return Object.values(item as Record<string, unknown>).some(
          (cell) => typeof cell === "string" && cell.trim().length > 0
        );
      }
      return false;
    });
  }
  return false;
}

function asString(v: FieldValue): string {
  return typeof v === "string" ? v : "";
}

function asStringList(v: FieldValue): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function asRows(v: FieldValue): Record<string, string>[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is Record<string, string> => Boolean(x) && typeof x === "object" && !Array.isArray(x)
  );
}

function FieldValueView({ field, value }: { field: Field; value: FieldValue }) {
  if (field.type === "list") {
    const items = asStringList(value);
    return (
      <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-[var(--foreground)]">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }

  if (field.type === "table") {
    const cols = field.columns ?? [];
    const rows = asRows(value).filter((row) =>
      cols.some((c) => (row[c.id] ?? "").trim().length > 0)
    );
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.id}
                  className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--subtle)]"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td
                    key={c.id}
                    className="border-b border-[var(--border)] px-3 py-2 align-top text-[var(--foreground)]"
                  >
                    {row[c.id] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // text / textarea / enum → paragraph(s), preserving line breaks.
  const text = asString(value).trim();
  const paragraphs = text.split(/\n{2,}/);
  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-[var(--foreground)]">
      {paragraphs.map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {para}
        </p>
      ))}
    </div>
  );
}

export function SectionReadout({
  section,
  value,
}: {
  section: Section;
  value: Record<string, unknown>;
}) {
  const fields = (section.fields ?? []).filter((f) => isNonEmpty(value[f.id]));
  if (fields.length === 0) return null;

  return (
    <div className="space-y-5">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
            {field.label}
          </div>
          <FieldValueView field={field} value={value[field.id]} />
        </div>
      ))}
    </div>
  );
}

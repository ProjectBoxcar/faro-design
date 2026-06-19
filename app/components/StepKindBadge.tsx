import type { SectionKind } from "@/lib/methodology";

// The app is used by the business owner, not a designer. So instead of exposing
// the methodology's internal "client vs designer" roles, the badge tells the
// owner what's expected of them: do they just answer, or does the app draft it?
const MAP: Record<SectionKind, { label: string; color: string }> = {
  input: { label: "You answer", color: "var(--client)" },
  synthesis: { label: "We'll draft it", color: "var(--designer)" },
  partial: { label: "We'll draft it", color: "var(--designer)" },
  eval: { label: "Checklist", color: "var(--collab)" },
};

export function StepKindBadge({ kind }: { kind: SectionKind }) {
  const c = MAP[kind] ?? MAP.input;
  return (
    <span
      className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium"
      style={{ color: c.color, borderColor: c.color }}
    >
      {c.label}
    </span>
  );
}

/**
 * Pure helpers for publish snapshots (no DB / server-only).
 * Used by lib/publish-snapshot.ts and unit tests.
 */
import type { SnapshotGroup, SnapshotSection } from "@/lib/db/types";
import type { CompiledGroup, Value } from "@/lib/brief";
import type { Section } from "@/lib/methodology";

/** Serialize live compiled brief into a JSON-safe snapshot (pure). */
export function serializeBriefGroups(groups: CompiledGroup[]): SnapshotGroup[] {
  return groups.map((g) => ({
    heading: g.heading,
    sections: g.sections.map(
      ({ section, value }): SnapshotSection => ({
        id: section.id,
        name: section.name,
        fields: (section.fields ?? []).map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type,
          columns: (f.columns ?? []).map((c) => ({ id: c.id, label: c.label })),
          options: f.options ? [...f.options] : undefined,
        })),
        // Deep clone so later DB edits cannot mutate the frozen payload.
        value: JSON.parse(JSON.stringify(value ?? {})) as Record<string, unknown>,
      })
    ),
  }));
}

/** Rebuild CompiledGroup-shaped data for buildHtml / SectionReadout. */
export function groupsFromSnapshot(groups: SnapshotGroup[]): CompiledGroup[] {
  return groups.map((g) => ({
    heading: g.heading,
    sections: g.sections.map(({ id, name, fields, value }) => ({
      section: {
        id,
        name,
        fields: fields.map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type,
          columns: f.columns,
          options: f.options,
        })),
      } as unknown as Section,
      value: value as Value,
    })),
  }));
}

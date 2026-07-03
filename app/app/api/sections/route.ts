import { NextResponse } from "next/server";
import { saveSection, getSections, deleteSection, getProject } from "@/lib/queries";
import { getSection } from "@/lib/methodology";
import { upNext, type StatusMap } from "@/lib/flow";
import { maybeRunViabilityGate } from "@/lib/viability";
import { z } from "zod";

const SaveSchema = z.object({
  projectId: z.string().min(1),
  key: z.string().min(1),
  value: z.record(z.string(), z.unknown()),
  status: z.enum(["empty", "draft", "complete", "client_submitted"]).optional(),
  // Whether the content is AI-authored and untouched. The client flips this false
  // on a manual edit, so the flag stays accurate (and provenance is preserved).
  aiGenerated: z.boolean().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  if (!getSection(parsed.data.key)) {
    return NextResponse.json({ error: `Unknown section: ${parsed.data.key}` }, { status: 400 });
  }
  if (!getProject(parsed.data.projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  // Persist the AI-ownership flag the client computed (it flips false on a manual
  // edit), so an untouched AI draft keeps its provenance across reloads.
  const row = saveSection({
    projectId: parsed.data.projectId,
    key: parsed.data.key,
    value: parsed.data.value as Record<string, never>,
    status: parsed.data.status,
    aiGenerated: parsed.data.aiGenerated ?? false,
  });

  // When a step is completed, tell the client where to go next: the earliest
  // incomplete step that's actually workable now. Null → nothing actionable
  // left (send the user back to the hub).
  let next: string | null = null;
  if (row.status === "complete") {
    const map: StatusMap = new Map(
      getSections(parsed.data.projectId).map((r) => [r.section_key, r.status])
    );
    next = upNext(map);
    // A completed step may be the last input the internal viability gate was
    // waiting on. Fire-and-forget: the response shouldn't wait ~15s on Opus.
    void maybeRunViabilityGate(parsed.data.projectId).catch((e) =>
      console.error("[viability] failed:", e)
    );
  }

  return NextResponse.json({ row, next });
}

const DeleteSchema = z.object({
  projectId: z.string().min(1),
  key: z.string().min(1),
});

// Clear a step's answers (reset it to empty).
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  deleteSection(parsed.data.projectId, parsed.data.key);
  return NextResponse.json({ ok: true });
}

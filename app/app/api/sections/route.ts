import { NextResponse } from "next/server";
import { saveSection, getSections, deleteSection } from "@/lib/queries";
import { getSection } from "@/lib/methodology";
import { upNext, sectionLock, type StatusMap } from "@/lib/flow";
import { z } from "zod";

const SaveSchema = z.object({
  projectId: z.string().min(1),
  key: z.string().min(1),
  value: z.record(z.string(), z.unknown()),
  status: z.enum(["empty", "draft", "complete", "client_submitted"]).optional(),
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
  // A manual save always clears the AI flag (designer ownership of the content).
  const row = saveSection({
    projectId: parsed.data.projectId,
    key: parsed.data.key,
    value: parsed.data.value as Record<string, never>,
    status: parsed.data.status,
    aiGenerated: false,
  });

  // When a step is completed, tell the client where to go next: the earliest
  // incomplete step that's actually workable now. Null → nothing actionable
  // left (send the user back to the hub).
  let next: string | null = null;
  if (row.status === "complete") {
    const map: StatusMap = new Map(
      getSections(parsed.data.projectId).map((r) => [r.section_key, r.status])
    );
    const candidate = upNext(map);
    if (candidate && !sectionLock(candidate, map).locked) next = candidate;
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

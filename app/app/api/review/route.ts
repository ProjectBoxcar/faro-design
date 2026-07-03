import { NextResponse } from "next/server";
import { z } from "zod";
import { completeSectionsWithContent } from "@/lib/queries";
import { getReviewGroup, nextReviewGroupId } from "@/lib/flow";
import { maybeRunViabilityGate } from "@/lib/viability";

// Mark a whole reviewed group's filled steps complete, and report the next group
// in the owner's guided review (null = review finished).
const Schema = z.object({
  projectId: z.string().min(1),
  groupId: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const group = getReviewGroup(parsed.data.groupId);
  if (!group) {
    return NextResponse.json({ error: `Unknown group: ${parsed.data.groupId}` }, { status: 400 });
  }
  completeSectionsWithContent(parsed.data.projectId, group.sectionIds);
  // Reviewing a group may complete the viability gate's inputs — evaluate now.
  void maybeRunViabilityGate(parsed.data.projectId).catch((e) =>
    console.error("[viability] failed:", e)
  );
  return NextResponse.json({ next: nextReviewGroupId(parsed.data.groupId) });
}

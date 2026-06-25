import { NextResponse } from "next/server";
import { z } from "zod";
import { completeSectionsWithContent } from "@/lib/queries";
import { getReviewPillar, nextReviewPillarId } from "@/lib/flow";

// Mark a whole reviewed pillar's filled steps complete, and report the next pillar
// in the owner's guided review (null = review finished).
const Schema = z.object({
  projectId: z.string().min(1),
  pillarId: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const pillar = getReviewPillar(parsed.data.pillarId);
  if (!pillar) {
    return NextResponse.json({ error: `Unknown pillar: ${parsed.data.pillarId}` }, { status: 400 });
  }
  completeSectionsWithContent(parsed.data.projectId, pillar.sectionIds);
  return NextResponse.json({ next: nextReviewPillarId(parsed.data.pillarId) });
}

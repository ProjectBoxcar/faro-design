import { NextResponse } from "next/server";
import { getProject, publishProject, unpublishProject } from "@/lib/queries";
import { z } from "zod";
import { viabilityActionBlockedReason } from "@/lib/project-gates";

const PublishSchema = z.object({
  projectId: z.string().min(1),
  action: z.enum(["publish", "unpublish"]).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = PublishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const project = getProject(parsed.data.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const action = parsed.data.action ?? "publish";
  if (action === "unpublish") {
    unpublishProject(parsed.data.projectId);
    return NextResponse.json({ ok: true });
  }
  const blocked = viabilityActionBlockedReason(project, "publish");
  if (blocked) return NextResponse.json({ error: blocked }, { status: 409 });

  const token = publishProject(parsed.data.projectId);
  return NextResponse.json({ token });
}

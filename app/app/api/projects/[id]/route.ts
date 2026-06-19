import { NextResponse } from "next/server";
import { deleteProject, getProject } from "@/lib/queries";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getProject(id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  deleteProject(id);
  return NextResponse.json({ ok: true });
}

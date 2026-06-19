import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/queries";
import { z } from "zod";

export async function GET() {
  return NextResponse.json(listProjects());
}

const CreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  client_name: z.string().optional().nullable(),
  greenfield: z.boolean().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const project = createProject(parsed.data);
  return NextResponse.json(project, { status: 201 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiKey } from "@/lib/ai";
import { createProject } from "@/lib/queries";
import { expandIntake } from "@/lib/intake";
import { maybeRunViabilityGate } from "@/lib/viability";

// Quick Start: create the project, then expand the owner's five (+ optional
// survey) answers into editable drafts across Reality + Identity in one pass.
const Schema = z.object({
  name: z.string().min(1, "Name is required"),
  client_name: z.string().optional().nullable(),
  greenfield: z.boolean().optional(),
  personal: z.boolean().optional(),
  answers: z.object({
    offering: z.string().default(""),
    story: z.string().default(""),
    difference: z.string().default(""),
    operations: z.string().default(""),
    edge: z.string().default(""),
  }),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, client_name, greenfield, personal, answers } = parsed.data;

  // The project is the durable artifact — create it first so a later AI failure
  // still leaves the owner with a usable (if blank) workspace to fill manually.
  const project = createProject({ name, client_name, greenfield, personal });

  if (!hasApiKey()) {
    return NextResponse.json(
      { projectId: project.id, filled: 0, aiSkipped: true },
      { status: 201 }
    );
  }

  try {
    const result = await expandIntake(project.id, name, answers);
    // The intake drafts are the viability gate's inputs — evaluate right away,
    // in the background, so the verdict is on the hub by the time it's read.
    void maybeRunViabilityGate(project.id).catch((e) => console.error("[viability] failed:", e));
    return NextResponse.json({ projectId: project.id, filled: result.filled.length }, { status: 201 });
  } catch (e) {
    console.error("[intake] expansion failed:", e);
    const message = e instanceof Error ? e.message : "Couldn't draft your strategy";
    // The project exists — let the UI route there with a soft warning.
    return NextResponse.json({ projectId: project.id, filled: 0, error: message }, { status: 200 });
  }
}

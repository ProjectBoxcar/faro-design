import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiKey } from "@/lib/ai";
import { getSection } from "@/lib/methodology";
import { generateSection, generationBlockedReason } from "@/lib/generate";
import { getProject, markGenerationAccepted } from "@/lib/queries";
import { db } from "@/lib/db";
import { ai_generations } from "@/lib/db/schema";
import { nanoid } from "nanoid";

const Schema = z.object({
  projectId: z.string().min(1),
  key: z.string().min(1),
  value: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "AI isn't configured yet — add your Anthropic API key in Settings." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (!getSection(parsed.data.key)) {
    return NextResponse.json({ error: `Unknown section: ${parsed.data.key}` }, { status: 400 });
  }
  if (!getProject(parsed.data.projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // The dependency pipeline is enforced HERE, not just in the UI: input steps are
  // never AI-written, and synthesis steps need real upstream content or notes.
  const blocked = generationBlockedReason(parsed.data.projectId, parsed.data.key, parsed.data.value ?? {});
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 409 });
  }

  try {
    const result = await generateSection(parsed.data.projectId, parsed.data.key, parsed.data.value ?? {});
    // Record provenance: what was generated, from which model + upstream steps.
    const generationId = nanoid();
    db.insert(ai_generations)
      .values({
        id: generationId,
        project_id: parsed.data.projectId,
        section_key: parsed.data.key,
        model: result.model,
        reads: result.reads,
        output: JSON.stringify(result.values),
        accepted: false,
      })
      .run();
    // Resolve human-readable upstream names for the provenance UI line.
    const readNames = result.reads.map((id) => getSection(id)?.name ?? id);
    return NextResponse.json({
      values: result.values,
      reads: result.reads,
      readNames,
      generationId,
    });
  } catch (e) {
    console.error("[generate] failed:", e);
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const AcceptSchema = z.object({ generationId: z.string().min(1) });

// The owner clicked "Use this" on a draft — record the acceptance for provenance.
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = AcceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  markGenerationAccepted(parsed.data.generationId);
  return NextResponse.json({ ok: true });
}

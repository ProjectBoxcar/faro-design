import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiKey } from "@/lib/anthropic";
import { getSection } from "@/lib/methodology";
import { generateSection } from "@/lib/generate";
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

  try {
    const result = await generateSection(parsed.data.projectId, parsed.data.key, parsed.data.value ?? {});
    // Record provenance: what was generated, from which model + upstream steps.
    db.insert(ai_generations)
      .values({
        id: nanoid(),
        project_id: parsed.data.projectId,
        section_key: parsed.data.key,
        model: result.model,
        reads: result.reads,
        output: JSON.stringify(result.values),
        accepted: false,
      })
      .run();
    return NextResponse.json({ values: result.values, reads: result.reads });
  } catch (e) {
    console.error("[generate] failed:", e);
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

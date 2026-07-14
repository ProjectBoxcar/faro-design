import { NextResponse } from "next/server";
import { z } from "zod";
import { getProject, setViabilityOverride, resetViabilityPending } from "@/lib/queries";
import { maybeRunViabilityGate } from "@/lib/viability";
import { hasApiKey } from "@/lib/anthropic";

const Schema = z.object({
  projectId: z.string().min(1),
  action: z.enum(["override", "recheck"]),
  note: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const project = getProject(parsed.data.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (parsed.data.action === "override") {
    const note = (parsed.data.note ?? "").trim();
    if (note.length < 8) {
      return NextResponse.json(
        { error: "Add a short reason (at least a sentence) for proceeding past the fail." },
        { status: 400 }
      );
    }
    if (project.viability !== "fail" && !project.viability_override_note) {
      return NextResponse.json(
        { error: "Override is only needed when the gate failed." },
        { status: 400 }
      );
    }
    setViabilityOverride(parsed.data.projectId, note);
    return NextResponse.json({ ok: true, viability: "pass", overrideNote: note });
  }

  // recheck
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "AI isn't configured — add your Anthropic API key in Settings." },
      { status: 400 }
    );
  }
  resetViabilityPending(parsed.data.projectId);
  try {
    await maybeRunViabilityGate(parsed.data.projectId, { force: true });
  } catch (e) {
    console.error("[viability] recheck failed:", e);
    const message = e instanceof Error ? e.message : "Re-check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  const updated = getProject(parsed.data.projectId)!;
  return NextResponse.json({
    ok: true,
    viability: updated.viability,
    overrideNote: updated.viability_override_note,
  });
}

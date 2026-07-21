import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiKey } from "@/lib/ai";
import { getProject } from "@/lib/queries";
import { runNameAvailabilityCheck } from "@/lib/naming-check";

// Live domain lookups + web research can take a couple of minutes.
export const maxDuration = 300;

const Schema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(80),
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
  if (!getProject(parsed.data.projectId)) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  try {
    const { evaluation } = await runNameAvailabilityCheck(parsed.data.projectId, parsed.data.name);
    return NextResponse.json({
      check: {
        id: evaluation.id,
        subject: evaluation.subject,
        verdict: evaluation.verdict,
        scores: evaluation.scores,
        createdAt: evaluation.created_at.toISOString(),
      },
    });
  } catch (e) {
    console.error("[naming-check] failed:", e);
    const message = e instanceof Error ? e.message : "Availability check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

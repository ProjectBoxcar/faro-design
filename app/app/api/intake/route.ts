import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiKey } from "@/lib/ai";
import { createProject } from "@/lib/queries";
import { expandIntake, saveIntakeAnswers } from "@/lib/intake";
import { countFilledIntakeAnswers, normalizeIntakeAnswers } from "@/lib/intake-answers";
import { maybeRunViabilityGate } from "@/lib/viability";
import { startExpress } from "@/lib/express";

// Quick Start: create the project, persist raw answers, then expand into
// editable drafts across Reality + Identity in one pass.
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
    taste: z.string().default(""),
  }),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { name, client_name, greenfield, personal, answers: rawAnswers } = parsed.data;
  const answers = normalizeIntakeAnswers(rawAnswers);
  const answersFilled = countFilledIntakeAnswers(answers);

  // Durable artifacts first: project row + raw owner answers, before any AI call.
  const project = createProject({ name, client_name, greenfield, personal });
  try {
    saveIntakeAnswers(project.id, answers);
  } catch (e) {
    console.error("[intake] failed to save answers:", e);
    return NextResponse.json(
      {
        projectId: project.id,
        filled: 0,
        answersSaved: false,
        error: "Could not save your answers. Try again.",
      },
      { status: 500 }
    );
  }

  if (!hasApiKey()) {
    return NextResponse.json(
      {
        projectId: project.id,
        filled: 0,
        answersSaved: true,
        answersFilled,
        aiSkipped: true,
        error:
          "Your answers are saved. Add a Claude key in Settings (Brand strategy) to draft the strategy automatically.",
      },
      { status: 201 }
    );
  }

  try {
    const result = await expandIntake(project.id, name, answers);
    // The intake drafts are the viability gate's inputs — evaluate right away,
    // in the background, so the verdict is on the hub by the time it's read.
    void maybeRunViabilityGate(project.id).catch((e) => console.error("[viability] failed:", e));
    // Silent grounding when answers are thin (web research). Not a product feature —
    // fail soft, never block Express. Await briefly so first synthesis cards can use it.
    try {
      const { maybeRunStrategyResearch } = await import("@/lib/strategy-research");
      await maybeRunStrategyResearch(project.id);
    } catch (e) {
      console.warn("[intake] strategy research skipped:", e);
    }
    // Kick off the express pipeline: the full strategy chain drafts in the
    // background while the owner watches progress on the express page.
    startExpress(project.id);
    return NextResponse.json(
      {
        projectId: project.id,
        filled: result.filled.length,
        answersSaved: true,
        answersFilled,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[intake] expansion failed:", e);
    const message = e instanceof Error ? e.message : "Couldn't draft your strategy";
    // Project + raw answers exist — UI should show the error, not pretend drafts succeeded.
    return NextResponse.json(
      {
        projectId: project.id,
        filled: 0,
        answersSaved: true,
        answersFilled,
        error: message,
      },
      { status: 200 }
    );
  }
}

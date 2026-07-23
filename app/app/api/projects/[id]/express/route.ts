import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiKey } from "@/lib/ai";
import { getProject, completeSectionsWithContent, publishProject } from "@/lib/queries";
import { expressStatus, startExpress } from "@/lib/express";
import { maybeRunViabilityGate } from "@/lib/viability";
import { flowSteps } from "@/lib/flow";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getProject(id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json({ state: expressStatus(id) });
}

const Schema = z.object({ action: z.enum(["start", "approve"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getProject(id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.action === "start") {
    if (!hasApiKey()) {
      return NextResponse.json(
        { error: "AI isn't configured yet — add your API key in Settings." },
        { status: 400 }
      );
    }
    return NextResponse.json({ state: startExpress(id) });
  }

  // Approve: the owner accepted the reviewed brief + design plan. Commit every
  // drafted step, publish the read-only brief, and make sure the viability
  // verdict is settled before the Studio opens.
  const state = expressStatus(id);
  if (state.status !== "done") {
    return NextResponse.json({ error: "The strategy draft isn't finished yet." }, { status: 409 });
  }
  completeSectionsWithContent(id, flowSteps().map((s) => s.sectionId));
  const token = publishProject(id);
  await maybeRunViabilityGate(id).catch((e) => console.error("[viability] failed:", e));
  return NextResponse.json({ token });
}

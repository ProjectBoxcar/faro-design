import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiKey } from "@/lib/anthropic";
import { getProject } from "@/lib/queries";
import { runImageOutsideView } from "@/lib/image-view";

// Web research can take a couple of minutes.
export const maxDuration = 300;

const Schema = z.object({ projectId: z.string().min(1) });

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
    const state = await runImageOutsideView(parsed.data.projectId);
    return NextResponse.json({ state });
  } catch (e) {
    console.error("[image-view] failed:", e);
    const message = e instanceof Error ? e.message : "The outside view failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

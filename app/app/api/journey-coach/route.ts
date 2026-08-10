import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCoachGuidance } from "@/lib/journey-coach-ai";

export const dynamic = "force-dynamic";

const Body = z.object({
  pathname: z.string().min(1).max(500),
  question: z.string().max(400).optional().nullable(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const guidance = await generateCoachGuidance({
      pathname: parsed.data.pathname,
      question: parsed.data.question,
    });
    return NextResponse.json(guidance);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Coach unavailable" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCoachGuidance } from "@/lib/journey-coach-ai";

export const dynamic = "force-dynamic";

const Body = z.object({
  pathname: z.string().min(1).max(500).optional(),
  /** Alias used by Faro Call (same as pathname) */
  path: z.string().min(1).max(500).optional(),
  question: z.string().max(400).optional().nullable(),
  locale: z.enum(["en", "es"]).optional().nullable(),
  mode: z.enum(["guide", "hover", "call"]).optional().nullable(),
  hover: z
    .object({
      label: z.string().max(200).optional().nullable(),
      href: z.string().max(500).optional().nullable(),
      tag: z.string().max(40).optional().nullable(),
      role: z.string().max(40).optional().nullable(),
      anchor: z.string().max(80).optional().nullable(),
    })
    .optional()
    .nullable(),
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

  const pathname = parsed.data.pathname ?? parsed.data.path;
  if (!pathname) {
    return NextResponse.json({ error: "pathname required" }, { status: 400 });
  }

  try {
    const guidance = await generateCoachGuidance({
      pathname,
      question: parsed.data.question,
      locale: parsed.data.locale ?? "en",
      mode: parsed.data.mode ?? "guide",
      hover: parsed.data.hover,
    });
    return NextResponse.json(guidance);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Coach unavailable" },
      { status: 500 }
    );
  }
}

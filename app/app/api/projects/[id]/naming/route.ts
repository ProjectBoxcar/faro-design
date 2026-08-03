import { NextResponse } from "next/server";
import { z } from "zod";
import { getProject } from "@/lib/queries";
import {
  confirmBrandName,
  hasConfirmedBrandName,
  isGenericBrandName,
  needsNameWorkshop,
  proposeBrandNames,
  readCachedNameProposals,
} from "@/lib/naming-propose";
import { studioBlockedReason } from "@/lib/studio";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Palette kind = strategy content gates only (concept/plan/brief). Do NOT use
  // "logo" here — that also requires name confirm and creates a circular block
  // (cannot confirm name because name is unconfirmed).
  const strategyBlocked = studioBlockedReason(id, "palette");
  return NextResponse.json({
    workingName: project.name,
    isGeneric: isGenericBrandName(project.name),
    confirmed: hasConfirmedBrandName(id),
    needsWorkshop: needsNameWorkshop(id),
    strategyReady: !strategyBlocked,
    strategyBlocked: strategyBlocked,
    candidates: readCachedNameProposals(id),
  });
}

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("propose") }),
  z.object({
    action: z.literal("pick"),
    name: z.string().min(2).max(80),
  }),
  z.object({ action: z.literal("skip") }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const strategyBlocked = studioBlockedReason(id, "palette");
  if (strategyBlocked) {
    return NextResponse.json({ error: strategyBlocked }, { status: 409 });
  }

  try {
    if (parsed.data.action === "propose") {
      const candidates = await proposeBrandNames(id);
      return NextResponse.json({ candidates });
    }
    if (parsed.data.action === "pick") {
      const result = confirmBrandName(id, parsed.data.name, "chosen");
      return NextResponse.json({ ok: true, ...result });
    }
    // skip — keep working title as the official name for logos
    const result = confirmBrandName(id, project.name, "kept_working_title");
    return NextResponse.json({ ok: true, ...result, skipped: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Naming failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

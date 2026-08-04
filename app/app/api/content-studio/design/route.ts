import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { getContentProfile } from "@/lib/content-studio/store";
import { resolveDesignFile } from "@/lib/content-studio/od-designs";

export const dynamic = "force-dynamic";

/** Serve an Open Design–generated social post HTML preview. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  const file = searchParams.get("file");
  if (!profileId || !file) {
    return NextResponse.json({ error: "profileId and file required" }, { status: 400 });
  }
  const row = getContentProfile(profileId);
  if (!row) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  const abs = resolveDesignFile(profileId, row.project_id, file);
  if (!abs) {
    return NextResponse.json({ error: "Design not found" }, { status: 404 });
  }
  const html = readFileSync(abs, "utf8");
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}

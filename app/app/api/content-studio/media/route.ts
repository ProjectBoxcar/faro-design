import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { mimeFromFilename, resolveContainedStoragePath } from "@/lib/content-studio/storage";
import { listRawAssets, getContentProfile } from "@/lib/content-studio/store";

export const dynamic = "force-dynamic";

/** Serve a stored Content Studio asset by profileId + assetId (local testing). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  const assetId = searchParams.get("assetId");
  if (!profileId || !assetId) {
    return NextResponse.json({ error: "profileId and assetId required" }, { status: 400 });
  }
  if (!getContentProfile(profileId)) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  const asset = listRawAssets(profileId).find((a) => a.id === assetId);
  if (!asset?.storagePath) {
    return NextResponse.json({ error: "Asset not found on disk" }, { status: 404 });
  }
  const abs = resolveContainedStoragePath(asset.storagePath);
  if (!abs) {
    return NextResponse.json({ error: "File missing or path not allowed" }, { status: 404 });
  }
  const buf = readFileSync(abs);
  const mime = asset.mimeType || mimeFromFilename(asset.filename);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

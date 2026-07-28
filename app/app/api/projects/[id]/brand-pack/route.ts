import { NextResponse } from "next/server";
import { getProject } from "@/lib/queries";
import { buildBrandPack, zipBrandPack } from "@/lib/brand-pack";

export const dynamic = "force-dynamic";

/** Download Brand Implement Pack (tokens, logos, icons, copy, IMPLEMENT.md). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getProject(id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const pack = buildBrandPack(id);
    const format = new URL(req.url).searchParams.get("format") ?? "zip";

    if (format === "json") {
      return NextResponse.json({
        projectId: pack.projectId,
        projectName: pack.projectName,
        files: pack.files.map((f) => ({ path: f.path, bytes: f.content.length })),
        contents: Object.fromEntries(pack.files.map((f) => [f.path, f.content])),
      });
    }

    const zip = zipBrandPack(pack.files);
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${pack.downloadName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build brand pack";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

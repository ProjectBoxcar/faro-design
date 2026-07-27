import { NextResponse } from "next/server";
import { z } from "zod";
import { getSelectedAsset, listAssets } from "@/lib/design";
import { getProject } from "@/lib/queries";

const KindSchema = z.enum(["design_system", "landing_page", "deck"]);

/** Authenticated in-app package preview (keeps Brand Handover inside the project shell). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; kind: string }> }
) {
  const { id, kind: rawKind } = await params;
  const kind = KindSchema.safeParse(rawKind);
  if (!kind.success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!getProject(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const asset = getSelectedAsset(id, kind.data);
  if (!asset?.html) {
    // Fall back: any selected-ish final of that kind even if deliverable incomplete.
    const any = listAssets(id).find((a) => a.kind === kind.data && a.selected && a.html);
    if (!any?.html) return NextResponse.json({ error: "Not ready" }, { status: 404 });
    return htmlResponse(any.html);
  }
  return htmlResponse(asset.html);
}

function htmlResponse(html: string) {
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cache-Control": "private, no-store",
    },
  });
}

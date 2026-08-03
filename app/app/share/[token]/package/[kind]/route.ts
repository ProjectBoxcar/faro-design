import { NextResponse } from "next/server";
import { z } from "zod";
import { finalDeliverableIssue } from "@/lib/design-deliverable";
import { getSelectedAsset, listAssets } from "@/lib/design";
import { getProjectByShareToken } from "@/lib/queries";
import {
  getCurrentSnapshotByToken,
  getSnapshotPackageAsset,
} from "@/lib/publish-snapshot";

const KindSchema = z.enum(["design_system", "landing_page", "deck"]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; kind: string }> }
) {
  const { token, kind: rawKind } = await params;
  const kind = KindSchema.safeParse(rawKind);
  if (!kind.success) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = getProjectByShareToken(token);
  if (!project?.share_token) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const snapshot = getCurrentSnapshotByToken(token);
  if (snapshot) {
    if (!snapshot.payload.package.ready) {
      return NextResponse.json({ error: "Package not ready" }, { status: 409 });
    }
    const asset = getSnapshotPackageAsset(snapshot.payload, kind.data);
    if (!asset?.html) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(asset.html, {
      headers: packageHtmlHeaders(),
    });
  }

  // Legacy live path (published before snapshots).
  const assets = listAssets(project.id);
  const issue = finalDeliverableIssue(assets);
  if (issue) return NextResponse.json({ error: "Package not ready" }, { status: 409 });

  const asset = getSelectedAsset(project.id, kind.data);
  if (!asset?.html) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(asset.html, {
    headers: packageHtmlHeaders(),
  });
}

function packageHtmlHeaders(): HeadersInit {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy":
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  };
}

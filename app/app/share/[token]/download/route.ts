import { NextResponse } from "next/server";
import { getProjectByShareToken } from "@/lib/queries";
import { compileBrief, buildMarkdown, buildHtml } from "@/lib/brief";
import {
  getCurrentSnapshotByToken,
  buildMarkdownFromSnapshot,
  buildHtmlFromSnapshot,
} from "@/lib/publish-snapshot";

// Download the published brief. Prefer frozen snapshot so downloads match the share page.
// Formats: md, html, doc (Word opens HTML served as application/msword).
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const project = getProjectByShareToken(token);
  if (!project || !project.share_token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const format = new URL(req.url).searchParams.get("format") ?? "md";
  const snapshot = getCurrentSnapshotByToken(token);

  const name = snapshot?.payload.project.name ?? project.name;
  const slug =
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
  const versionSuffix = snapshot ? `-v${snapshot.version}` : "";

  if (format === "md") {
    const body = snapshot
      ? buildMarkdownFromSnapshot(snapshot.payload)
      : buildMarkdown(project, compileBrief(project));
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-brief${versionSuffix}.md"`,
      },
    });
  }
  if (format === "html" || format === "doc") {
    const body = snapshot
      ? buildHtmlFromSnapshot(snapshot.payload)
      : buildHtml(project, compileBrief(project));
    return new NextResponse(body, {
      headers: {
        "Content-Type":
          format === "doc"
            ? "application/msword; charset=utf-8"
            : "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-brief${versionSuffix}.${format === "doc" ? "doc" : "html"}"`,
      },
    });
  }
  return NextResponse.json({ error: `Unknown format: ${format}` }, { status: 400 });
}

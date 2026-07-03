import { NextResponse } from "next/server";
import { getProjectByShareToken } from "@/lib/queries";
import { compileBrief, buildMarkdown, buildHtml } from "@/lib/brief";

// Download the published brief. Public like the share page itself (token-gated).
// Formats: md, html, doc (Word opens HTML served as application/msword).
// PDF is the browser's job — the share page's Print/PDF button uses the print
// stylesheet, which every browser saves as PDF.
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const project = getProjectByShareToken(token);
  if (!project || !project.share_token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const format = new URL(req.url).searchParams.get("format") ?? "md";
  const compiled = compileBrief(project);
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";

  if (format === "md") {
    return new NextResponse(buildMarkdown(project, compiled), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-brief.md"`,
      },
    });
  }
  if (format === "html") {
    return new NextResponse(buildHtml(project, compiled), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-brief.html"`,
      },
    });
  }
  if (format === "doc") {
    return new NextResponse(buildHtml(project, compiled), {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-brief.doc"`,
      },
    });
  }
  return NextResponse.json({ error: `Unknown format: ${format}` }, { status: 400 });
}

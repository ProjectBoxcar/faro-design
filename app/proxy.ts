import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, sha256Hex } from "@/lib/auth";

// Everything except the public share link is designer-only. Clients open
// /share/<token> and nothing else; every other page and every API route needs
// the auth cookie. Requests from localhost (the designer's own PC) get the
// cookie automatically; other devices (e.g. phone over Tailscale) unlock once
// with APP_PASSWORD from .env.local.

export default async function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  // No password configured → open, preserving plain local use.
  if (!password) return NextResponse.next();

  const expected = await sha256Hex(password);
  if (req.cookies.get(AUTH_COOKIE)?.value === expected) return NextResponse.next();

  const host = req.headers.get("host") ?? "";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    const res = NextResponse.next();
    res.cookies.set(AUTH_COOKIE, expected, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = `?to=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Public: the share link, the unlock flow, and Next's own assets.
  matcher: ["/((?!share/|unlock|api/unlock|_next/|favicon\\.ico).*)"],
};

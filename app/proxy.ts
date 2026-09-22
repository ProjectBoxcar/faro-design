import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE,
  authCookieValue,
  decideAccess,
  isLocalHost,
  timingSafeEqualHex,
} from "@/lib/auth";

// Everything except the public share link is designer-only. Clients open
// /share/<token> and nothing else; every other page and every API route needs
// the auth cookie. Requests from localhost get the cookie automatically when
// APP_PASSWORD is set; other devices unlock once via /unlock.
//
// Non-localhost without APP_PASSWORD is blocked (Tailscale/Funnel must not
// fail open).

export default async function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD?.trim();
  const local = isLocalHost(req.headers.get("host"));

  let cookieOk = false;
  let expected = "";
  if (password) {
    expected = await authCookieValue(password);
    const got = req.cookies.get(AUTH_COOKIE)?.value ?? "";
    cookieOk = got !== "" && timingSafeEqualHex(got, expected);
  }

  const decision = decideAccess({ hasPassword: Boolean(password), local, cookieOk });

  // Off-machine access with no password configured → refuse (do not fail open).
  if (decision === "block-no-password") {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error:
            "Set APP_PASSWORD in .env.local before exposing Faro on the network (Tailscale / Funnel).",
        },
        { status: 503 }
      );
    }
    return new NextResponse(
      `<!doctype html><html><head><meta charset="utf-8"/><title>Faro — set a password</title>
<style>body{font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1.25rem;line-height:1.5;color:#111;background:#F5F1E8}
code{background:#fff;padding:0.15rem 0.4rem;border-radius:4px;border:1px solid #D8D1C0}</style></head>
<body><h1>Set an app password</h1>
<p>Faro is reachable off this computer, but <code>APP_PASSWORD</code> is not set. That would leave your projects and AI keys open.</p>
<p>Add to <code>app/.env.local</code>:</p>
<pre>APP_PASSWORD=choose-a-long-secret
AUTH_SECRET=another-long-secret</pre>
<p>Restart Faro, then open <code>/unlock</code> on this device.</p>
</body></html>`,
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  // Local dev with no password, or a valid session cookie → open.
  if (decision === "local-open" || decision === "allow") return NextResponse.next();

  // Localhost with a password and no cookie: mint one automatically.
  if (decision === "local-mint") {
    const res = NextResponse.next();
    res.cookies.set(AUTH_COOKIE, expected, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      secure: req.nextUrl.protocol === "https:",
    });
    return res;
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = `?to=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!share/|unlock|api/unlock|_next/|favicon\\.ico).*)"],
};

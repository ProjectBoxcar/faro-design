import { NextResponse } from "next/server";
import { AUTH_COOKIE, sha256Hex } from "@/lib/auth";

// Exchange the app password for the auth cookie. This is the only API route the
// proxy leaves open; a wrong password just bounces back to the form.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const password = form?.get("password");
  const to = form?.get("to");
  // Same-origin relative paths only — no open redirect.
  const dest = typeof to === "string" && to.startsWith("/") && !to.startsWith("//") ? to : "/";

  const expected = process.env.APP_PASSWORD;
  if (!expected || typeof password !== "string" || password !== expected) {
    return NextResponse.redirect(
      new URL(`/unlock?to=${encodeURIComponent(dest)}&error=1`, req.url),
      { status: 303 }
    );
  }

  const res = NextResponse.redirect(new URL(dest, req.url), { status: 303 });
  res.cookies.set(AUTH_COOKIE, await sha256Hex(expected), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

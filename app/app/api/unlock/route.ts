import { NextResponse } from "next/server";
import { AUTH_COOKIE, authCookieValue } from "@/lib/auth";

// Simple in-memory rate limit (per process). Slows casual brute force on
// Tailscale unlock; resets on server restart.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 12;

function clientKey(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const row = attempts.get(key);
  if (!row || now > row.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  row.count += 1;
  return row.count > MAX_ATTEMPTS;
}

function passwordsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const password = form?.get("password");
  const to = form?.get("to");
  const dest =
    typeof to === "string" && to.startsWith("/") && !to.startsWith("//") ? to : "/";

  const expected = process.env.APP_PASSWORD?.trim();
  if (!expected) {
    return NextResponse.redirect(
      new URL(`/unlock?to=${encodeURIComponent(dest)}&error=config`, req.url),
      { status: 303 }
    );
  }

  const key = clientKey(req);
  if (rateLimited(key)) {
    return NextResponse.redirect(
      new URL(`/unlock?to=${encodeURIComponent(dest)}&error=rate`, req.url),
      { status: 303 }
    );
  }

  if (typeof password !== "string" || !passwordsMatch(password, expected)) {
    return NextResponse.redirect(
      new URL(`/unlock?to=${encodeURIComponent(dest)}&error=1`, req.url),
      { status: 303 }
    );
  }

  attempts.delete(key);

  const token = await authCookieValue(expected);
  const res = NextResponse.redirect(new URL(dest, req.url), { status: 303 });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: new URL(req.url).protocol === "https:",
  });
  return res;
}

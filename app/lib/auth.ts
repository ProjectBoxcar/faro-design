// Shared by the proxy (edge runtime) and the unlock route (node runtime), so it
// only uses Web Crypto, which both support.

export const AUTH_COOKIE = "brand_auth";

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Cookie value = HMAC-SHA256(secret, password) hex.
 * Prefer AUTH_SECRET as HMAC key; fall back to APP_PASSWORD so local setups
 * without AUTH_SECRET still work (better than unsalted hash of password alone).
 */
export async function authCookieValue(password: string): Promise<string> {
  const secret = process.env.AUTH_SECRET?.trim() || password;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`faro-auth:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`session:v1:${password}`)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isLocalHost(hostHeader: string | null): boolean {
  const host = (hostHeader ?? "").split(":")[0]?.toLowerCase() ?? "";
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

/** Fixed order: missing password, then a valid cookie, then localhost mint. */
export function decideAccess({
  hasPassword,
  local,
  cookieOk,
}: {
  hasPassword: boolean;
  local: boolean;
  cookieOk: boolean;
}): "block-no-password" | "local-open" | "allow" | "local-mint" | "need-unlock" {
  if (!hasPassword && !local) return "block-no-password";
  if (!hasPassword && local) return "local-open";
  if (cookieOk) return "allow";
  if (local) return "local-mint";
  return "need-unlock";
}

/** Timing-safe string compare for equal-length hex tokens. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

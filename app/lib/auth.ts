// Shared by the proxy (edge runtime) and the unlock route (node runtime), so it
// only uses Web Crypto, which both support.

export const AUTH_COOKIE = "brand_auth";

// The cookie stores a hash of the password, never the password itself.
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

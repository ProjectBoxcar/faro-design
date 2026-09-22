import { describe, expect, it } from "vitest";
import { decideAccess, isLocalHost, timingSafeEqualHex } from "@/lib/auth";

describe("auth helpers", () => {
  it("detects localhost hosts", () => {
    expect(isLocalHost("localhost:3100")).toBe(true);
    expect(isLocalHost("127.0.0.1:3100")).toBe(true);
    expect(isLocalHost("100.80.1.2:3100")).toBe(false);
    expect(isLocalHost(null)).toBe(false);
  });

  it("compares equal hex safely", () => {
    expect(timingSafeEqualHex("abcd", "abcd")).toBe(true);
    expect(timingSafeEqualHex("abcd", "abce")).toBe(false);
    expect(timingSafeEqualHex("abc", "abcd")).toBe(false);
  });

  it("decides access in fixed order", () => {
    expect(decideAccess({ hasPassword: false, local: false, cookieOk: true })).toBe(
      "block-no-password"
    );
    expect(decideAccess({ hasPassword: false, local: true, cookieOk: true })).toBe("local-open");
    expect(decideAccess({ hasPassword: true, local: true, cookieOk: true })).toBe("allow");
    expect(decideAccess({ hasPassword: true, local: true, cookieOk: false })).toBe("local-mint");
    expect(decideAccess({ hasPassword: true, local: false, cookieOk: false })).toBe("need-unlock");
  });
});

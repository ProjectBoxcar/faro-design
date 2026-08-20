import { describe, expect, it } from "vitest";
import { isLocalHost, timingSafeEqualHex } from "@/lib/auth";

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
});

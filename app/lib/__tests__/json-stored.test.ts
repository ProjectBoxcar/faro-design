import { describe, expect, it } from "vitest";
import { parseStoredJson } from "@/lib/json";

describe("parseStoredJson", () => {
  it("returns parsed JSON", () => {
    expect(parseStoredJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("does not throw on a corrupt object or list", () => {
    expect(parseStoredJson("{not json")).toEqual({});
    expect(parseStoredJson("[not")).toEqual([]);
    expect(parseStoredJson("nope")).toBeNull();
    expect(parseStoredJson(null)).toBeNull();
  });
});

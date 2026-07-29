import { describe, expect, it } from "vitest";
import { isGenericBrandName } from "@/lib/naming-generic";

describe("isGenericBrandName", () => {
  it("flags empty and obvious placeholders", () => {
    expect(isGenericBrandName("")).toBe(true);
    expect(isGenericBrandName("  ")).toBe(true);
    expect(isGenericBrandName("project")).toBe(true);
    expect(isGenericBrandName("My Brand")).toBe(true);
    expect(isGenericBrandName("Untitled")).toBe(true);
    expect(isGenericBrandName("working title")).toBe(true);
    expect(isGenericBrandName("test")).toBe(true);
    expect(isGenericBrandName("New Project")).toBe(true);
  });

  it("allows real-looking brand names", () => {
    expect(isGenericBrandName("Finisterra")).toBe(false);
    expect(isGenericBrandName("Northline Studio")).toBe(false);
    expect(isGenericBrandName("Aesop")).toBe(false);
    expect(isGenericBrandName("Paca")).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import path from "path";

// storage.ts is server-only; mock the marker for unit tests.
vi.mock("server-only", () => ({}));

const {
  isPathInside,
  resolveContainedStoragePath,
  safeFilename,
  mimeFromFilename,
  kindFromMime,
  isAllowedMediaMime,
} = await import("@/lib/content-studio/storage");

describe("content studio storage path safety", () => {
  it("isPathInside rejects escape", () => {
    const root = path.join("C:", "data", "content-studio");
    expect(isPathInside(root, path.join(root, "a", "b.jpg"))).toBe(true);
    expect(isPathInside(root, path.join(root, "..", "secrets"))).toBe(false);
  });

  it("resolveContainedStoragePath rejects traversal", () => {
    expect(resolveContainedStoragePath("../../.env")).toBeNull();
    expect(resolveContainedStoragePath("foo/../../../etc/passwd")).toBeNull();
    expect(resolveContainedStoragePath("/absolute/path")).toBeNull();
  });

  it("safeFilename strips path segments", () => {
    expect(safeFilename("../../evil.jpg")).toBe("evil.jpg");
    expect(safeFilename("WhatsApp Image 2026-08-04 at 11.20.45.jpeg")).toContain("WhatsApp");
  });

  it("mime and kind for pilot media", () => {
    expect(mimeFromFilename("a.jpeg")).toBe("image/jpeg");
    expect(mimeFromFilename("a.mp4")).toBe("video/mp4");
    expect(kindFromMime("image/jpeg")).toBe("image");
    expect(kindFromMime("video/mp4")).toBe("video");
    expect(isAllowedMediaMime("image/jpeg")).toBe(true);
    expect(isAllowedMediaMime("application/pdf")).toBe(false);
    expect(isAllowedMediaMime("image/svg+xml")).toBe(false);
    expect(isAllowedMediaMime("text/html")).toBe(false);
  });
});

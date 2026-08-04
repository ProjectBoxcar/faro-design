/**
 * Local disk storage for Content Studio media.
 * Root: app/data/content-studio/<projectId|standalone>/<profileId>/raw/
 * Never commit this folder (gitignored).
 */
import "server-only";
import { mkdirSync, readdirSync, writeFileSync, existsSync, copyFileSync } from "fs";
import path from "path";
import { nanoid } from "nanoid";

export function contentStudioDataRoot(): string {
  return path.join(process.cwd(), "data", "content-studio");
}

export function profileRawDir(opts: {
  projectId: string | null;
  profileId: string;
}): string {
  const scope = opts.projectId || "_standalone";
  return path.join(contentStudioDataRoot(), scope, opts.profileId, "raw");
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/** Relative path stored in DB (posix-style, under data/). */
export function toStoragePath(absolutePath: string): string {
  const root = path.join(process.cwd(), "data");
  const rel = path.relative(root, absolutePath);
  return rel.split(path.sep).join("/");
}

export function absoluteFromStoragePath(storagePath: string): string {
  return path.join(process.cwd(), "data", ...storagePath.split("/"));
}

export function safeFilename(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ()[\]]+/g, "_");
  return base.slice(0, 180) || `file-${nanoid(6)}`;
}

export function mimeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (/\.(jpe?g|jpeg)$/.test(lower)) return "image/jpeg";
  if (/\.png$/.test(lower)) return "image/png";
  if (/\.webp$/.test(lower)) return "image/webp";
  if (/\.gif$/.test(lower)) return "image/gif";
  if (/\.mp4$/.test(lower)) return "video/mp4";
  if (/\.mov$/.test(lower)) return "video/quicktime";
  if (/\.webm$/.test(lower)) return "video/webm";
  return "application/octet-stream";
}

export function kindFromMime(mime: string): "image" | "video" | "unknown" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "unknown";
}

/** Write uploaded bytes into the profile raw folder. Returns relative storage path. */
export function writeRawAssetFile(opts: {
  projectId: string | null;
  profileId: string;
  filename: string;
  bytes: Buffer;
}): { storagePath: string; absolutePath: string; filename: string } {
  const dir = profileRawDir(opts);
  ensureDir(dir);
  const filename = safeFilename(opts.filename);
  const absolutePath = path.join(dir, filename);
  writeFileSync(absolutePath, opts.bytes);
  return {
    filename,
    absolutePath,
    storagePath: toStoragePath(absolutePath),
  };
}

/**
 * Import every file from a source directory into the profile raw folder
 * (copy, not move). Returns list of written files.
 */
export function importDirectoryToProfile(opts: {
  projectId: string | null;
  profileId: string;
  sourceDir: string;
}): { filename: string; storagePath: string; mimeType: string; kind: "image" | "video" | "unknown" }[] {
  if (!existsSync(opts.sourceDir)) return [];
  const dir = profileRawDir(opts);
  ensureDir(dir);
  const out: {
    filename: string;
    storagePath: string;
    mimeType: string;
    kind: "image" | "video" | "unknown";
  }[] = [];
  for (const name of readdirSync(opts.sourceDir)) {
    if (name.startsWith(".")) continue;
    const src = path.join(opts.sourceDir, name);
    const filename = safeFilename(name);
    const dest = path.join(dir, filename);
    copyFileSync(src, dest);
    const mimeType = mimeFromFilename(filename);
    out.push({
      filename,
      storagePath: toStoragePath(dest),
      mimeType,
      kind: kindFromMime(mimeType),
    });
  }
  return out;
}

/** List absolute files already on disk for a profile. */
export function listFilesOnDisk(opts: {
  projectId: string | null;
  profileId: string;
}): string[] {
  const dir = profileRawDir(opts);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => !n.startsWith("."))
    .map((n) => path.join(dir, n));
}

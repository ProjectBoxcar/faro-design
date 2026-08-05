/**
 * Local disk storage for Content Studio media.
 * Root: app/data/content-studio/<projectId|standalone>/<profileId>/raw/
 * Never commit this folder (gitignored).
 */
import "server-only";
import {
  mkdirSync,
  readdirSync,
  writeFileSync,
  existsSync,
  copyFileSync,
  statSync,
  realpathSync,
} from "fs";
import path from "path";
import { nanoid } from "nanoid";

export function contentStudioDataRoot(): string {
  return path.join(process.cwd(), "data", "content-studio");
}

/** Roots that import-folder may read from (resolved at call time). */
export function importAllowlistRoots(): string[] {
  const roots = [
    contentStudioDataRoot(),
    path.join(process.cwd(), "data"),
    // Sole local media library (never commit): local/media/<client>/source/
    path.join(process.cwd(), "..", "local", "media"),
  ];
  return roots.map((r) => {
    try {
      return existsSync(r) ? realpathSync(r) : path.resolve(r);
    } catch {
      return path.resolve(r);
    }
  });
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

/** True if candidate path is inside root (after resolve). */
export function isPathInside(root: string, candidate: string): boolean {
  const r = path.resolve(root);
  const c = path.resolve(candidate);
  const rel = path.relative(r, c);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Resolve a storage path to an absolute file under data/, rejecting traversal.
 * Returns null if path escapes data/ or does not exist.
 */
export function resolveContainedStoragePath(storagePath: string): string | null {
  if (!storagePath || storagePath.includes("\0")) return null;
  // Reject absolute and parent-segment paths before join
  const parts = storagePath.split(/[/\\]+/).filter(Boolean);
  if (parts.some((p) => p === ".." || p === ".")) return null;
  if (path.isAbsolute(storagePath)) return null;
  const dataRoot = path.join(process.cwd(), "data");
  const abs = path.join(dataRoot, ...parts);
  if (!isPathInside(dataRoot, abs)) return null;
  if (!existsSync(abs)) return null;
  try {
    const real = realpathSync(abs);
    if (!isPathInside(dataRoot, real)) return null;
    return real;
  } catch {
    return null;
  }
}

/** Relative path stored in DB (posix-style, under data/). */
export function toStoragePath(absolutePath: string): string {
  const root = path.join(process.cwd(), "data");
  const rel = path.relative(root, absolutePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Storage path escapes data root");
  }
  return rel.split(path.sep).join("/");
}

/** @deprecated Prefer resolveContainedStoragePath — does not enforce containment alone. */
export function absoluteFromStoragePath(storagePath: string): string {
  const contained = resolveContainedStoragePath(storagePath);
  if (contained) return contained;
  // Fallback for callers that check existsSync themselves — still strip ".."
  const parts = storagePath.split(/[/\\]+/).filter((p) => p && p !== ".." && p !== ".");
  return path.join(process.cwd(), "data", ...parts);
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

export function isAllowedMediaMime(mime: string): boolean {
  return mime.startsWith("image/") || mime.startsWith("video/");
}

/** Unique dest name if file already exists (upload collision). */
function uniqueDest(dir: string, filename: string): string {
  const dest = path.join(dir, filename);
  if (!existsSync(dest)) return filename;
  const ext = path.extname(filename);
  const stem = path.basename(filename, ext);
  return `${stem}-${nanoid(6)}${ext}`;
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
  const filename = uniqueDest(dir, safeFilename(opts.filename));
  const absolutePath = path.join(dir, filename);
  writeFileSync(absolutePath, opts.bytes);
  return {
    filename,
    absolutePath,
    storagePath: toStoragePath(absolutePath),
  };
}

/**
 * Resolve and validate sourceDir for import-folder (must sit under allowlisted roots).
 */
export function resolveImportSourceDir(sourceDir: string): string {
  const resolved = path.isAbsolute(sourceDir)
    ? path.resolve(sourceDir)
    : path.resolve(process.cwd(), sourceDir);
  if (!existsSync(resolved)) {
    throw new Error(`Import folder not found: ${sourceDir}`);
  }
  let real: string;
  try {
    real = realpathSync(resolved);
  } catch {
    throw new Error(`Cannot resolve import folder: ${sourceDir}`);
  }
  const st = statSync(real);
  if (!st.isDirectory()) {
    throw new Error("Import path must be a directory");
  }
  const allowed = importAllowlistRoots().some((root) => isPathInside(root, real));
  if (!allowed) {
    throw new Error(
      "Import folder must be under data/content-studio or the project raw drop folder"
    );
  }
  return real;
}

/**
 * Import media files from a source directory into the profile raw folder
 * (copy, not move). Skips non-files and non-media. Returns list of written files.
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
    let st;
    try {
      st = statSync(src);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    const filename = safeFilename(name);
    const mimeType = mimeFromFilename(filename);
    if (!isAllowedMediaMime(mimeType)) continue;
    const dest = path.join(dir, filename);
    copyFileSync(src, dest);
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

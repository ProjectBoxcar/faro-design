/**
 * Resolve an ffmpeg binary for video keyframe extraction (P5).
 * Prefer FFMPEG_PATH → PATH → ffmpeg-static package.
 */
import "server-only";
import { existsSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

let cached: string | null | undefined;

function candidatePaths(): string[] {
  const out: string[] = [];
  const env = (process.env.FFMPEG_PATH || "").trim();
  if (env) out.push(env);

  // Common Windows / tool installs
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const local = process.env.LOCALAPPDATA || "";
  out.push(
    path.join(programFiles, "ffmpeg", "bin", "ffmpeg.exe"),
    path.join(programFiles, "ffmpeg", "ffmpeg.exe"),
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\tools\\ffmpeg\\bin\\ffmpeg.exe",
    path.join(local, "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
    path.join(home, "scoop", "shims", "ffmpeg.exe"),
    path.join(home, "scoop", "apps", "ffmpeg", "current", "bin", "ffmpeg.exe"),
    path.join(home, "AppData", "Local", "Microsoft", "WinGet", "Packages")
  );

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const staticPath = require("ffmpeg-static") as string | null;
    if (staticPath) out.push(staticPath);
  } catch {
    /* optional dep */
  }

  return out;
}

/** Absolute path to ffmpeg, or null if unavailable. */
export function resolveFfmpegPath(): string | null {
  if (cached !== undefined) return cached;

  for (const p of candidatePaths()) {
    if (p && existsSync(p) && !p.includes("WinGet\\Packages")) {
      cached = p;
      return cached;
    }
  }

  // PATH lookup (ffmpeg / ffmpeg.exe)
  cached = null;
  return cached;
}

/** Async resolve — also probes `where`/`which` once. */
export async function resolveFfmpegPathAsync(): Promise<string | null> {
  const sync = resolveFfmpegPath();
  if (sync) return sync;

  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const { stdout } = await execFileAsync(cmd, ["ffmpeg"], {
      timeout: 5000,
      windowsHide: true,
    });
    const first = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l && existsSync(l));
    if (first) {
      cached = first;
      return first;
    }
  } catch {
    /* not on PATH */
  }

  // Retry static after PATH fail (require may have been skipped)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const staticPath = require("ffmpeg-static") as string | null;
    if (staticPath && existsSync(staticPath)) {
      cached = staticPath;
      return cached;
    }
  } catch {
    /* */
  }

  cached = null;
  return null;
}

export type FfmpegStatus = {
  available: boolean;
  path: string | null;
  source: "env" | "path" | "static" | "none";
};

export async function getFfmpegStatus(): Promise<FfmpegStatus> {
  const p = await resolveFfmpegPathAsync();
  if (!p) return { available: false, path: null, source: "none" };
  const env = (process.env.FFMPEG_PATH || "").trim();
  if (env && p === env) return { available: true, path: p, source: "env" };
  if (p.includes("ffmpeg-static") || p.includes("node_modules")) {
    return { available: true, path: p, source: "static" };
  }
  return { available: true, path: p, source: "path" };
}

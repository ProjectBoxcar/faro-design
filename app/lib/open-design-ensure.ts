import "server-only";
import { spawn } from "node:child_process";
import path from "node:path";
import { isOpenDesignDaemonUp, openDesignDaemonUrl } from "@/lib/open-design-engine";

let ensureInFlight: Promise<boolean> | null = null;

/**
 * Make sure the Open Design daemon is up. If not, spawn ensure-open-design.mjs
 * (same as npm run od:ensure) and wait briefly. Idempotent under concurrent callers.
 */
export async function ensureOpenDesignDaemon(opts: { timeoutMs?: number } = {}): Promise<boolean> {
  if (await isOpenDesignDaemonUp()) return true;
  if (ensureInFlight) return ensureInFlight;

  const timeoutMs = opts.timeoutMs ?? 45_000;
  ensureInFlight = (async () => {
    try {
      if (await isOpenDesignDaemonUp()) return true;

      const script = path.join(process.cwd(), "scripts", "ensure-open-design.mjs");
      await new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, [script, "--wait"], {
          cwd: process.cwd(),
          stdio: "ignore",
          windowsHide: true,
          env: process.env,
        });
        const timer = setTimeout(() => {
          try {
            child.kill();
          } catch {
            /* ignore */
          }
          reject(new Error("Open Design ensure timed out"));
        }, timeoutMs);
        child.on("exit", (code) => {
          clearTimeout(timer);
          if (code === 0) resolve();
          else reject(new Error(`ensure-open-design exited ${code}`));
        });
        child.on("error", (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });

      return isOpenDesignDaemonUp();
    } catch (e) {
      console.error("[open-design] ensure failed:", e);
      return isOpenDesignDaemonUp();
    } finally {
      ensureInFlight = null;
    }
  })();

  return ensureInFlight;
}

export function openDesignNotRunningMessage(): string {
  return (
    `Open Design daemon is not running at ${openDesignDaemonUrl()}. ` +
    `Faro tried to start it automatically — if it still fails, run start.bat or start-open-design.ps1 ` +
    `or: npm run od:ensure`
  );
}

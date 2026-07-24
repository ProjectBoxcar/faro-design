/**
 * Ensure the Open Design daemon is running (for Logo Workshop + Design Studio).
 * Idempotent: if port 7456 already answers, does nothing.
 *
 * Usage:
 *   node scripts/ensure-open-design.mjs
 *   node scripts/ensure-open-design.mjs --wait
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// app/scripts → Faro Design root
const repoRoot = path.resolve(__dirname, "..", "..");
const odRoot = path.join(repoRoot, "external", "open-design-origin", "open-design-main");
const odCli = path.join(odRoot, "apps", "daemon", "dist", "cli.js");
const port = Number(process.env.OPEN_DESIGN_PORT || 7456);
const odUrl = (process.env.OPEN_DESIGN_URL || `http://127.0.0.1:${port}`).replace(/\/$/, "");
const waitForReady = process.argv.includes("--wait");

async function isUp() {
  try {
    const res = await fetch(`${odUrl}/api/brands`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function log(msg) {
  console.log(`[open-design] ${msg}`);
}

async function main() {
  if (await isUp()) {
    log(`already running at ${odUrl}`);
    return;
  }

  if (!fs.existsSync(odRoot)) {
    console.error(
      `[open-design] ERROR: Open Design not found at:\n  ${odRoot}\n` +
        `Place the full open-design repo under external/open-design-origin/`
    );
    process.exit(1);
  }

  if (!fs.existsSync(odCli)) {
    console.error(
      `[open-design] ERROR: daemon not built (missing ${odCli}).\n` +
        `Run once:\n  cd "${odRoot}"\n  pnpm install\n  pnpm --filter @open-design/daemon build`
    );
    process.exit(1);
  }

  log(`starting daemon on ${odUrl} …`);
  const child = spawn(
    process.execPath,
    [odCli, "--port", String(port), "--host", "127.0.0.1", "--no-open"],
    {
      cwd: odRoot,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: {
        ...process.env,
        OPEN_DESIGN_PORT: String(port),
      },
    }
  );
  child.unref();

  if (!waitForReady) {
    log(`spawned (pid ${child.pid}). Waiting optional — use --wait to block until ready.`);
    return;
  }

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await isUp()) {
      log(`ready at ${odUrl}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.error(`[open-design] ERROR: daemon did not become ready within 60s at ${odUrl}`);
  process.exit(1);
}

main().catch((e) => {
  console.error("[open-design]", e);
  process.exit(1);
});

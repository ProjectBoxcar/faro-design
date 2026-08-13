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
/** Cold start on Windows can exceed 60s — allow override */
const waitMs = Number(process.env.OPEN_DESIGN_WAIT_MS || 120_000);

async function isUp() {
  try {
    const res = await fetch(`${odUrl}/api/brands`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function log(msg) {
  console.log(`[open-design] ${msg}`);
}

function spawnDaemon() {
  const logPath = path.join(odRoot, "daemon-ensure.log");
  let outFd;
  try {
    outFd = fs.openSync(logPath, "a");
    fs.writeSync(
      outFd,
      `\n---- ensure ${new Date().toISOString()} port=${port} ----\n`
    );
  } catch {
    outFd = "ignore";
  }

  log(`starting daemon on ${odUrl} …`);
  if (outFd !== "ignore") log(`daemon log: ${logPath}`);

  const child = spawn(
    process.execPath,
    [odCli, "--port", String(port), "--host", "127.0.0.1", "--no-open"],
    {
      cwd: odRoot,
      detached: true,
      stdio: outFd === "ignore" ? "ignore" : ["ignore", outFd, outFd],
      windowsHide: true,
      env: {
        ...process.env,
        OPEN_DESIGN_PORT: String(port),
      },
    }
  );
  child.unref();
  return { pid: child.pid, logPath };
}

async function waitUntilReady(label) {
  const deadline = Date.now() + waitMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    if (await isUp()) {
      log(`ready at ${odUrl} (${label}, ~${attempt * 0.5}s)`);
      return true;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
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

  // First spawn
  const first = spawnDaemon();
  log(`spawned (pid ${first.pid ?? "?"})`);

  if (!waitForReady) {
    log(`not waiting — use --wait to block until ready.`);
    return;
  }

  if (await waitUntilReady("first spawn")) return;

  // Retry once — Windows cold start / port race
  log(`not ready after ${Math.round(waitMs / 1000)}s — retrying spawn…`);
  spawnDaemon();
  if (await waitUntilReady("retry")) return;

  console.error(
    `[open-design] ERROR: daemon did not become ready within ${Math.round((waitMs * 2) / 1000)}s at ${odUrl}.\n` +
      `  Check log: ${path.join(odRoot, "daemon-ensure.log")}\n` +
      `  Or run: start-open-design.ps1 / npm run od:ensure`
  );
  process.exit(1);
}

main().catch((e) => {
  console.error("[open-design]", e);
  process.exit(1);
});

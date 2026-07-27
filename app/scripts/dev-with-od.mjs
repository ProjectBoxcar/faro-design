/**
 * One-command full stack for localhost:
 *   1) ensure Open Design daemon (graphics)
 *   2) start Next.js Brand App on :3100
 *
 * npm run dev  →  this file
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");

async function ensureOd() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, "ensure-open-design.mjs"), "--wait"], {
      cwd: appRoot,
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ensure-open-design exited ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  console.log("");
  console.log("Faro full stack: Open Design (graphics) + Brand App (localhost:3100)");
  console.log("");

  try {
    await ensureOd();
  } catch (e) {
    console.error("");
    console.error("Could not start Open Design. Strategy pages will still work;");
    console.error("Logo Workshop / Design Studio will fail until OD is up.");
    console.error(String(e?.message ?? e));
    console.error("");
    // Still start Faro so strategy work is usable.
  }

  const next = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "dev", "-p", "3100"],
    {
      cwd: appRoot,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    }
  );

  const shutdown = () => {
    // Leave OD running so a quick restart of Faro is fast; OD is idempotent.
    try {
      next.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  next.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

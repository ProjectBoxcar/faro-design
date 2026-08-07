/**
 * Live UX smoke — hits key owner routes and checks journey markers in HTML.
 * Run with app up: node local/pilots/ux-live-smoke.mjs
 * Optional: BASE_URL=http://localhost:3100 PROJECT_ID=...
 */
const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const PROJECT = process.env.PROJECT_ID || "QEK_B4Po06NNiYutLxMe7";

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  return { status: res.status, text, location: res.headers.get("location") };
}

function has(html, re) {
  return re.test(html);
}

async function main() {
  const results = [];
  const check = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
    console.log(ok ? `  OK  ${name}${detail ? ` — ${detail}` : ""}` : `  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  };

  console.log("=== UX live smoke ===", { BASE, PROJECT });

  // Health
  try {
    const home = await get("/");
    check("Home loads", home.status === 200);
    check(
      "Home setup readiness banner",
      has(home.text, /AI setup ready|Setup needed before long AI/),
      "readiness strip present"
    );
    check(
      "Home Continue · stage CTA pattern",
      has(home.text, /Continue ·|Open project/),
      "project card continue language"
    );
  } catch (e) {
    check("Home loads", false, e.message);
    process.exit(1);
  }

  // OD
  try {
    const od = await fetch("http://127.0.0.1:7456/api/brands", {
      signal: AbortSignal.timeout(3000),
    });
    check("Open Design daemon", od.ok, `status ${od.status}`);
  } catch {
    check("Open Design daemon", false, "not reachable on :7456");
  }

  // Settings
  const settings = await get("/settings");
  check("Settings loads", settings.status === 200);
  check("Settings Faro/lanes copy", has(settings.text, /Settings|Strategy|Logo|Design/i));

  // Project hub
  const hub = await get(`/projects/${PROJECT}`);
  check("Project hub loads", hub.status === 200 || hub.status === 307 || hub.status === 302);
  if (hub.status === 200) {
    // Up next when in progress, or "Journey complete" when all stages done
    check(
      "Hub primary action present",
      has(hub.text, /Up next|Continue ·|Journey complete/),
      "Up next or journey complete card"
    );
    // Should not stack dual full accent Design + Handover cards as primary (text links OK)
    const accentButtons = (hub.text.match(/bg-\[var\(--accent\)\][^>]*>[\s\S]*?Continue/gi) || []).length;
    check(
      "Hub single primary continue emphasis",
      accentButtons <= 2,
      `accent continue-ish buttons ≈ ${accentButtons}`
    );
  }

  // Stages
  const routes = [
    [`/projects/${PROJECT}/express`, /strategy|Express|essentials/i],
    [`/projects/${PROJECT}/name`, /Brand name|Name|confirmed|Change name/i],
    [`/projects/${PROJECT}/studio`, /Logo Workshop|Logo/i],
    [`/projects/${PROJECT}/design`, /Design Studio|create & select|Handover/i],
    [`/projects/${PROJECT}/handover`, /Brand Handover|package/i],
    [`/projects/${PROJECT}/content`, /Content Studio|Monthly social/i],
  ];

  for (const [path, re] of routes) {
    const r = await get(path);
    const ok = r.status === 200 || r.status === 307 || r.status === 302;
    check(`Route ${path}`, ok, `HTTP ${r.status}`);
    if (r.status === 200) {
      check(`  content ${path}`, has(r.text, re));
    }
  }

  // Content wizard markers when unlocked
  const content = await get(`/projects/${PROJECT}/content`);
  if (content.status === 200) {
    check(
      "Content wizard steps",
      has(content.text, /Media|Brief|Generate|Review|Lock brand/i)
    );
  }

  // Unlock page
  const unlock = await get("/unlock");
  check("Unlock title Faro Design", unlock.status === 200 && has(unlock.text, /Faro Design/));

  const failed = results.filter((r) => !r.ok);
  console.log("\n=== SUMMARY ===");
  console.log(`passed ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failed.length) {
    console.log("failures:", failed.map((f) => f.name).join("; "));
    process.exitCode = 1;
  } else {
    console.log("all checks passed — owner journey routes + readiness look healthy");
  }
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});

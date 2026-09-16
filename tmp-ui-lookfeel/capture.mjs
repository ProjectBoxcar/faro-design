import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const require = createRequire("F:/Faro Design/app/package.json");
const { chromium } = require("playwright");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const BASE = process.env.FARO_BASE || "http://127.0.0.1:3100";
const PROJECT =
  process.env.FARO_PROJECT || "hjYFwST2Foj_191sOZwJK";

fs.mkdirSync(OUT, { recursive: true });

async function settle(page, ms = 900) {
  await page.waitForTimeout(ms);
}

async function gotoSafe(page, url, label) {
  console.log("goto", label, url);
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await settle(page, 1200);
    // try network idle briefly but don't fail
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await settle(page, 600);
    return res?.status() ?? 0;
  } catch (e) {
    console.warn("goto failed", label, e.message);
    return 0;
  }
}

async function shot(page, name) {
  const dest = path.join(OUT, name);
  await page.screenshot({ path: dest, fullPage: false });
  console.log("wrote", name);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = {};

  // Discover a working project if needed
  let projectId = PROJECT;
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await gotoSafe(p, BASE + "/", "home-probe");
    const hubProbe = await gotoSafe(
      p,
      `${BASE}/projects/${projectId}`,
      "hub-probe"
    );
    if (hubProbe >= 400 || hubProbe === 0) {
      // try to find any project link on home
      const href = await p
        .locator('a[href^="/projects/"]')
        .first()
        .getAttribute("href")
        .catch(() => null);
      if (href) {
        const m = href.match(/\/projects\/([^/?#]+)/);
        if (m) {
          projectId = m[1];
          console.log("using discovered project", projectId);
        }
      }
    }
    await ctx.close();
  }

  const routes = {
    home: `${BASE}/`,
    hub: `${BASE}/projects/${projectId}`,
    express: `${BASE}/projects/${projectId}/express`,
    design: `${BASE}/projects/${projectId}/design`,
    studio: `${BASE}/projects/${projectId}/studio`,
    logo: `${BASE}/projects/${projectId}/studio/logo`,
    call: `${BASE}/projects/${projectId}/call`,
  };

  // --- Desktop ---
  {
    const desk = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await desk.newPage();
    page.setDefaultTimeout(45000);

    results.homeDesktop = await gotoSafe(page, routes.home, "home-desktop");
    await shot(page, "home-desktop.png");

    results.hubDesktop = await gotoSafe(page, routes.hub, "hub-desktop");
    await shot(page, "hub-desktop.png");

    results.express = await gotoSafe(page, routes.express, "express");
    const expressOk =
      results.express > 0 &&
      results.express < 400 &&
      !(await page.locator("text=/404|Not Found/i").first().isVisible().catch(() => false));
    if (expressOk) {
      await shot(page, "express-or-strategy.png");
      results.expressOrStrategy = "express";
    } else {
      // try hub strategy sections if express fails
      results.studioFallback = await gotoSafe(page, routes.studio, "studio");
      await shot(page, "express-or-strategy.png");
      results.expressOrStrategy = "studio-fallback";
    }

    results.design = await gotoSafe(page, routes.design, "design");
    const designOk =
      results.design > 0 &&
      results.design < 400 &&
      !(await page.locator("text=/404|Not Found/i").first().isVisible().catch(() => false));
    if (designOk) {
      await shot(page, "design-studio.png");
      results.designStudio = "design";
    } else {
      results.logo = await gotoSafe(page, routes.logo, "logo");
      await shot(page, "design-studio.png");
      results.designStudio = "logo-fallback";
    }

    results.callDesktop = await gotoSafe(page, routes.call, "call-desktop");
    await settle(page, 1500);
    await shot(page, "call-desktop.png");

    await desk.close();
  }

  // --- Mobile 390x844 ---
  {
    const mob = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await mob.newPage();
    page.setDefaultTimeout(45000);

    results.homeMobile = await gotoSafe(page, routes.home, "home-mobile");
    await shot(page, "home-mobile.png");

    results.hubMobile = await gotoSafe(page, routes.hub, "hub-mobile");
    await shot(page, "hub-mobile.png");

    results.callMobile = await gotoSafe(page, routes.call, "call-mobile");
    await settle(page, 1500);
    await shot(page, "call-mobile.png");

    await mob.close();
  }

  fs.writeFileSync(
    path.join(OUT, "capture-meta.json"),
    JSON.stringify({ projectId, routes, results, at: new Date().toISOString() }, null, 2)
  );
  console.log("done", projectId);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

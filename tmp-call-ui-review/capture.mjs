import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire("F:/Faro Design/app/package.json");
const { chromium } = require("playwright");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const URL =
  process.env.CALL_URL ||
  "http://127.0.0.1:3100/projects/hjYFwST2Foj_191sOZwJK/call";

async function waitReady(page) {
  await page.waitForSelector('text=/Live|En vivo/i', { timeout: 45000 });
  // Let stage media / fonts settle
  await page.waitForTimeout(1200);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // --- Desktop ---
  const desk = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const dpage = await desk.newPage();
  dpage.setDefaultTimeout(45000);
  console.log("goto", URL);
  await dpage.goto(URL, { waitUntil: "networkidle" });
  await waitReady(dpage);
  await dpage.screenshot({
    path: path.join(OUT, "desktop-idle.png"),
    fullPage: false,
  });
  console.log("wrote desktop-idle.png");

  // Open chat
  const askBtn = dpage.getByRole("button", { name: /ask|pregunt/i }).first();
  await askBtn.click();
  await dpage.waitForSelector("#faro-call-chat", { state: "visible" });
  await dpage.waitForTimeout(600);
  await dpage.screenshot({
    path: path.join(OUT, "desktop-chat-open.png"),
    fullPage: false,
  });
  console.log("wrote desktop-chat-open.png");

  // Close chat then Continue
  const closeChat = dpage.getByRole("button", { name: /close chat|cerrar/i }).first();
  if (await closeChat.isVisible().catch(() => false)) {
    await closeChat.click();
    await dpage.waitForTimeout(400);
  } else {
    await dpage.keyboard.press("Escape");
    await dpage.waitForTimeout(400);
  }

  const continueBtn = dpage
    .getByRole("button", { name: /continue|continuar|siguiente/i })
    .first();
  await continueBtn.click();
  await dpage.waitForTimeout(1400);
  await dpage.screenshot({
    path: path.join(OUT, "desktop-after-continue.png"),
    fullPage: false,
  });
  console.log("wrote desktop-after-continue.png");
  await desk.close();

  // --- Mobile ---
  const mob = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mpage = await mob.newPage();
  mpage.setDefaultTimeout(45000);
  await mpage.goto(URL, { waitUntil: "networkidle" });
  await waitReady(mpage);
  await mpage.screenshot({
    path: path.join(OUT, "mobile-idle.png"),
    fullPage: false,
  });
  console.log("wrote mobile-idle.png");

  const askMob = mpage.getByRole("button", { name: /ask|pregunt/i }).first();
  await askMob.click();
  await mpage.waitForSelector("#faro-call-chat", { state: "visible" });
  await mpage.waitForTimeout(600);
  await mpage.screenshot({
    path: path.join(OUT, "mobile-chat.png"),
    fullPage: false,
  });
  console.log("wrote mobile-chat.png");
  await mob.close();

  await browser.close();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

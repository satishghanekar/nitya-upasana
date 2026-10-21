import { chromium } from "../tests/node_modules/@playwright/test/index.mjs";
// MOCKUP ONLY: screenshots the site at each device size; with a CSS file (mockups/responsive.css) it injects it first.
// Run from tests/: node ../mockups/shoot-responsive.mjs <out dir> [css]   (needs node serve.mjs running)
const OUT = process.argv[2], BASE = "http://localhost:4173/", CSS = process.argv[3];
import { readFileSync } from "node:fs";
const css = CSS ? readFileSync(CSS, "utf8") : "";
const VPS = {
  "desktop-1440": { w: 1440, h: 900, touch: false },
  "desktop-1920": { w: 1920, h: 1080, touch: false },
  "ipad-land": { w: 1180, h: 820, touch: true },
  "ipad-port": { w: 820, h: 1180, touch: true },
  "ipadpro-land": { w: 1366, h: 1024, touch: true },
  "iphone-port": { w: 390, h: 844, touch: true, mobile: true },
  "iphone-land": { w: 844, h: 390, touch: true, mobile: true },
};
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [n, v] of Object.entries(VPS)) {
  const ctx = await b.newContext({ viewport: { width: v.w, height: v.h }, hasTouch: v.touch, isMobile: !!v.mobile, deviceScaleFactor: 1, colorScheme: "dark", timezoneId: "America/New_York" });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date("2026-10-20T22:23:00-04:00"));
  await page.addInitScript(() => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); localStorage.clear(); localStorage.setItem("aarti2-prefs", JSON.stringify({ sv: 6, wake: 0 })); } });
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-ready"));
  await page.waitForTimeout(600); await inject();
  async function inject() { if (!css) return; await page.addStyleTag({ content: css }); if (v.w >= 1024) await page.evaluate(() => document.documentElement.setAttribute("data-rail", "1")); await page.evaluate(() => { const t = document.querySelector(".toast,#toast,[role=status].show"); }); await page.waitForTimeout(300); }
  const shot = async (k) => { await page.evaluate(() => document.querySelectorAll("*").forEach(e => { if (/Ready to use offline/.test(e.textContent) && e.children.length === 0 && e.closest("#home,#cal,#jump,#panel") == null) e.style.visibility = "hidden"; })); await page.screenshot({ path: `${OUT}/${n}-${k}.png` }); };
  const shot0 = async (k) => page.screenshot({ path: `${OUT}/${n}-${k}.png` });
  await shot("1-home");
  await page.locator("#panb").click(); await page.waitForTimeout(500); await shot("2-calendar");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  if (await page.locator("#cal").isVisible()) { await page.goto(BASE); await page.waitForTimeout(800); await inject(); }
  await page.locator("#hm").click(); await page.waitForTimeout(500); await shot("3-library");
  await page.goto(BASE); await page.waitForFunction(() => document.documentElement.hasAttribute("data-ready")); await page.waitForTimeout(500);
  await page.locator("#aa").click(); await page.waitForTimeout(500); await shot("4-settings");
  await page.goto(BASE); await page.waitForFunction(() => document.documentElement.hasAttribute("data-ready")); await page.waitForTimeout(500);
  await page.locator("#tst").click(); await page.waitForTimeout(900); await shot("5-reading");
  await ctx.close();
  console.log("done", n);
}
await b.close();

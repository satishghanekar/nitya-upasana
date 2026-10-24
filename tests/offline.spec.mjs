// Offline: once opened, the site works with no internet (service worker sw.js).
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { FIXED_NOW, PREFS_KEY, BASE_PREFS, TEXT_COUNT, buildAll } from "./helpers.mjs";

test.use({ serviceWorkers: "allow" });

test("works offline after the first visit @chromium-only", async ({ page, context }) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [PREFS_KEY, JSON.stringify(BASE_PREFS)]);
  await page.goto("./");
  // wait until the service worker controls the page and has saved the site
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
    const v = document.querySelector('meta[name="version"]').content;
    for (let i = 0; i < 50; i++) {
      const c = await caches.open(v);
      if ((await c.keys()).length > 10) return;
      await new Promise((r) => setTimeout(r, 200));
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#jl a[data-go]")).toHaveCount(TEXT_COUNT);
  await buildAll(page);
  await expect(page.locator("section.ash")).toHaveCount(TEXT_COUNT);
  await expect(page.locator("#ofb")).toBeVisible();
  // the main fonts came from the saved copy
  expect(await page.evaluate(() => document.fonts.check('16px "Noto Sans Devanagari"', "क"))).toBe(true);
  // the picture shows, and all three time-of-day pictures are kept, so the afternoon and evening ones work offline too
  expect(await page.locator("#iconb img").evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true);
  const kept = await page.evaluate(async () => {
    const c = await caches.open(document.querySelector('meta[name="version"]').content);
    const names = ["sunrise", "midday", "sunset"].flatMap((t) => [`picture-${t}-360.webp`, `picture-${t}.webp`]);
    return Promise.all(names.map(async (n) => !!(await c.match(n))));
  });
  expect(kept).toEqual([true, true, true, true, true, true]);
  await context.setOffline(false);
});

// The version is written twice on purpose: browsers install a new service worker when sw.js itself changes
// (not every browser re-checks the files it imports), so sw.js must carry it, and the page needs it at start-up.
test("version in index.html and sw.js match", async ({ request }) => {
  const html = await (await request.get("./")).text();
  const sw = await (await request.get("sw.js")).text();
  const a = /<meta name="version" content="(aarti-v[\d.]+)">/.exec(html)?.[1];
  const b = /const V\s*=\s*'(aarti-v[\d.]+)'/.exec(sw)?.[1];
  expect(a, "<meta name=\"version\"> in index.html").toBeTruthy();
  expect(b, "sw.js").toBe(a);
});

// A PDF from the Library's PDFs tab opens in the browser's own viewer: the service worker answers its address with
// the PDF, never the page (a page's address is answered with the page), keeps it once opened, and says plainly when
// one not yet kept is opened without internet. (A file in tests/ stands in for content/pdfs/; the rule is by .pdf.)
test("a PDF opened once is the PDF, and opens offline @chromium-only", async ({ page, context }) => {
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
  });
  const tab = await context.newPage();
  // (headless Chromium saves a PDF it is sent rather than showing it: its first bytes tell a PDF from the page)
  const pdf = async (url) => {
    const [d] = await Promise.all([tab.waitForEvent("download"), tab.goto(url).catch(() => {})]);
    return readFileSync(await d.path()).subarray(0, 5).toString();
  };
  expect(await pdf("tests/unit/fixtures/sample.pdf")).toBe("%PDF-");
  await context.setOffline(true);
  expect(await pdf("tests/unit/fixtures/sample.pdf")).toBe("%PDF-");
  const r = await tab.goto("tests/unit/fixtures/never-opened.pdf");
  expect([r.status(), r.fromServiceWorker()]).toEqual([503, true]);
  await expect(tab.locator("body")).toContainText("This PDF is not saved on this phone yet");
  await context.setOffline(false);
});

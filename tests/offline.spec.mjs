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
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
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

// A file that could not be saved on the first visit (a weak connection): never "Offline ready" while it is missing;
// it is tried again when the internet is back, and then the badge and the note say ready
test("offline ready only once every file is saved @chromium-only", async ({ page, context }) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [PREFS_KEY, JSON.stringify(BASE_PREFS)]);
  const block = (r) => r.abort();
  await context.route("**/picture-sunset.webp", block);
  await page.goto("./");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.locator("#aa").click();
  await page.locator('#spv button[data-v="more"]').click();
  // the other files are saved, the picture is not: still saving
  await expect
    .poll(() => page.evaluate(async () => (await caches.open(document.querySelector('meta[name="version"]').content)).keys().then((k) => k.length)), {
      timeout: 20_000,
    })
    .toBeGreaterThan(10);
  await page.waitForTimeout(1000);
  await expect(page.locator("#offv")).toHaveAttribute("data-s", "save");
  // the internet back: the picture is saved, and the site is ready offline
  await context.unroute("**/picture-sunset.webp", block);
  await page.evaluate(() => dispatchEvent(new Event("online")));
  await expect(page.locator("#offv")).toHaveAttribute("data-s", "idle", { timeout: 20_000 });
  await expect(page.locator("#fl")).toHaveText("Ready to use offline");
});

// A weak connection with the site saved: the page and every part come from the saved copy at once, without asking the
// network, so the page is ready as fast as with a good connection (it took 6 s and more when each file waited for it)
test("a weak connection: the saved copy opens the page without asking the network @chromium-only", async ({ page, context }) => {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [PREFS_KEY, JSON.stringify(BASE_PREFS)]);
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
    const v = document.querySelector('meta[name="version"]').content;
    for (let i = 0; i < 100; i++) {
      if ((await (await caches.open(v)).keys()).length > 120) return;
      await new Promise((r) => setTimeout(r, 100));
    }
  });
  // what reaches the network: from the page itself, or fetched by the service worker
  const net = [];
  context.on("request", (r) => {
    if (r.serviceWorker()) net.push(r.url());
  });
  const res = [];
  page.on("response", (r) => res.push(r));
  await page.reload();
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-ready"));
  const own = res.filter((r) => new URL(r.url()).origin === new URL(page.url()).origin && !r.url().endsWith("/sw.js"));
  expect(own.length).toBeGreaterThan(100);
  expect(own.filter((r) => !r.fromServiceWorker()).map((r) => r.url())).toEqual([]);
  expect(net.filter((u) => !u.endsWith("/sw.js") && !u.endsWith("/js/parts.js"))).toEqual([]);
});

// Check for updates (Settings → More → About) still finds a file changed under the same version: it saves the new
// copy over the old one before reloading, since the page opens from the saved copy
test("Check for updates saves a changed file and reloads with it @chromium-only", async ({ page, context }) => {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [PREFS_KEY, JSON.stringify(BASE_PREFS)]);
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
  });
  await page.reload();
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-ready"));
  // the server now has a changed style file (asked for with ?fresh by the check, plain by the page)
  await context.route(/\/css\/99-fallbacks\.css(\?|$)/, async (r) => {
    const res = await r.fetch();
    await r.fulfill({ response: res, body: (await res.text()) + "\n#__changed{color:red}" });
  });
  await page.locator("#aa").click();
  await page.locator('#spv button[data-v="more"]').click();
  await page.locator("#upd").click();
  await page.waitForEvent("load", { timeout: 25_000 });
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-ready"));
  await context.unrouteAll({ behavior: "ignoreErrors" });
  // the page now runs with the changed file, from the saved copy
  const css = await page.evaluate(async () => (await (await fetch("css/99-fallbacks.css")).text()).includes("#__changed"));
  expect(css).toBe(true);
});

// Safari installs a new version as the app opens and removes the saved copy of the version still on screen: Check for
// updates then has no copy to compare with, and finds the new version from the version the page names (it said "Up to
// date", stuck on 1.37.3, 2026-10-29)
test("Check for updates finds a new version installed while the old one is on screen @chromium-only", async ({ page, context }) => {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [PREFS_KEY, JSON.stringify(BASE_PREFS)]);
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
  });
  await page.reload();
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-ready"));
  // the server's page names a newer version, and this version's saved copy is gone
  await context.route(/\/(\?fresh=\d+)?$/, async (r) => {
    const res = await r.fetch();
    await r.fulfill({ response: res, body: (await res.text()).replace(/content="aarti-v[\d.]+"/, 'content="aarti-v99.0"') });
  });
  await page.evaluate(async () => caches.delete(document.querySelector('meta[name="version"]').content));
  await page.locator("#aa").click();
  await page.locator('#spv button[data-v="more"]').click();
  const loaded = page.waitForEvent("load", { timeout: 25_000 });
  await page.locator("#upd").click();
  await loaded;
});

// The version is written twice on purpose: browsers install a new service worker when sw.js itself changes
// (not every browser re-checks the files it imports), so sw.js must carry it, and the page needs it at start-up.
test("version in index.html and sw.js match", async ({ request }) => {
  const html = await (await request.get("./")).text();
  const sw = await (await request.get("sw.js")).text();
  const a = /<meta name="version" content="(aarti-v[\d.]+)">/.exec(html)?.[1];
  const b = /const V\s*=\s*'(aarti-v[\d.]+)'/.exec(sw)?.[1];
  expect(a, '<meta name="version"> in index.html').toBeTruthy();
  expect(b, "sw.js").toBe(a);
});

// A PDF from the Library's PDFs tab opens in the browser's own viewer: the service worker answers its address with
// the PDF, never the page (a page's address is answered with the page), keeps it once opened, and says plainly when
// one not yet kept is opened without internet. (A file in tests/ stands in for content/pdfs/; the rule is by .pdf.)
test("a PDF opened once is the PDF, and opens offline @chromium-only", async ({ page, context }) => {
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
  });
  const tab = await context.newPage();
  // (headless Chromium saves a PDF it is sent rather than showing it: its first bytes tell a PDF from the page)
  const pdf = async (url) => {
    const [d] = await Promise.all([tab.waitForEvent("download"), tab.goto(url).catch(() => {})]);
    return readFileSync(await d.path())
      .subarray(0, 5)
      .toString();
  };
  expect(await pdf("tests/unit/fixtures/sample.pdf")).toBe("%PDF-");
  await context.setOffline(true);
  expect(await pdf("tests/unit/fixtures/sample.pdf")).toBe("%PDF-");
  const r = await tab.goto("tests/unit/fixtures/never-opened.pdf");
  expect([r.status(), r.fromServiceWorker()]).toEqual([503, true]);
  await expect(tab.locator("body")).toContainText("This PDF is not saved on this phone yet");
  await context.setOffline(false);
});

// The Books tab's cloud before each book (js/features/pdfs.js marks()): online only at first, then saved on this
// phone for the one opened, once the reader is back
test("a book opened once is marked as saved on this phone @chromium-only", async ({ page, context }) => {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [PREFS_KEY, JSON.stringify(BASE_PREFS)]);
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
  });
  await page.locator("#hm").click();
  await page.locator("#jtb button").nth(1).click();
  const books = page.locator("#jl .pdfg a.pdf");
  await expect(books.first()).toBeVisible();
  await expect(page.locator('#jl .pst[data-saved="true"]')).toHaveCount(0);
  await expect(books.first()).toHaveAccessibleName(/, (online only|फक्त ऑनलाइन)$/);
  // the smallest book, opened in a tab of its own (headless Chromium saves it rather than showing it)
  const book = books.filter({ hasText: "Lalita" }).first();
  const href = await book.getAttribute("href");
  const tab = await context.newPage();
  await Promise.all([tab.waitForEvent("download"), tab.goto(href).catch(() => {})]);
  await tab.close();
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(book.locator('.pst[data-saved="true"]')).toHaveCount(1);
  await expect(book).toHaveAccessibleName(/, (saved on this phone|या फोनवर जतन)$/);
  await expect(page.locator('#jl .pst[data-saved="true"]')).toHaveCount(1);
});

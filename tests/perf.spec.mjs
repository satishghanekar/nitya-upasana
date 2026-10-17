// Performance on a slowed-down phone (Chromium, CPU 4× slower, iPhone-size screen).
//
// What is checked: how many times the browser has to lay the page out, during load and for the
// language button (the most common tap). That count is the cause of the slowness the audit found
// (P1: the old auto-fit laid the page out once per verse line, about 1,280 times on load) and,
// unlike milliseconds, it is the same on every machine, so the test never fails because the
// computer running it happened to be busy.
//
// What is reported: the milliseconds of layout, style and script work and the tap's response time
// (the Event Timing API, which is what INP is built on), attached to the test result for comparison.
// Lighthouse CI (lighthouserc.json) checks the Core Web Vitals on top of this.
import { test, expect } from "@playwright/test";
import { openSite, SETUPS } from "./helpers.mjs";

// Recorded before the refactor (load / one language tap): 1,277 / 286 layouts.
// After the performance work: 21 / 5. The budgets leave room for new features, and for slower machines
// (GitHub's), where fonts finish downloading during a tap and add a few layouts (13 seen there).
export const BUDGET = {
  loadLayouts: 60,
  tapLayouts: 20,
};

async function metrics(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics");
  const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
  return {
    layouts: m.LayoutCount,
    styles: m.RecalcStyleCount,
    layoutMs: m.LayoutDuration * 1000,
    styleMs: m.RecalcStyleDuration * 1000,
    scriptMs: m.ScriptDuration * 1000,
  };
}
const diff = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, Math.round(b[k] - a[k])]));

test("load and the language button lay the page out only a few times @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  // the slowest interaction after each tap, input to next paint (only those over 16 ms are recorded)
  await page.addInitScript(() => {
    window.__slow = 0;
    try {
      new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__slow = Math.max(window.__slow, e.duration)))).observe({
        type: "event",
        durationThreshold: 16,
      });
    } catch (e) {}
  });
  const t0 = await metrics(cdp);
  await openSite(page, { ...SETUPS.marathi, lead: "mr", l2: "en" });
  // fonts arrive and the print warm-up runs (3 s after load, when idle); all of it counts as load
  await page.waitForTimeout(5500);
  const load = diff(t0, await metrics(cdp));

  // Marathi → English → both: each is a first visit to that language, so the text is fitted again
  const taps = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => (window.__slow = 0));
    const t = await metrics(cdp);
    await page.locator("#home-btn").click();
    await page.waitForTimeout(1000);
    taps.push({ ...diff(t, await metrics(cdp)), responseMs: Math.round(await page.evaluate(() => window.__slow)) });
  }

  const report = { load, taps };
  console.log(JSON.stringify(report));
  test.info().annotations.push({ type: "metrics", description: JSON.stringify(report) });
  expect(load.layouts, "page layouts during load").toBeLessThanOrEqual(BUDGET.loadLayouts);
  for (const [i, t] of taps.entries()) expect(t.layouts, `page layouts for language tap ${i + 1}`).toBeLessThanOrEqual(BUDGET.tapLayouts);
  await context.close();
});

test("closing Settings after a text-size change lays the page out only a few times @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").click();
  await page.locator("#lg").click();
  await page.waitForTimeout(800); // the page under Settings is re-laid out once the taps stop
  const t = await metrics(cdp);
  await page.locator("#xc").click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
  const size = diff(t, await metrics(cdp));
  test.info().annotations.push({ type: "metrics", description: JSON.stringify(size) });
  expect(size.layouts, "page layouts when Settings closes").toBeLessThanOrEqual(3);
  await context.close();
});

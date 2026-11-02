// The text's size and the menus' (Satish, 2026-11-02, "a consistent approach from a usability perspective"): a default
// by how far the screen is read from (js/core/state.js dfs()), the same for every text (js/text/autofit.js); a long
// line wraps, its rows closer than two lines (css/02-core.css); the menus from six sizes (css/01-theme.css); both times
// the reader's own text size (textScale()).
import { test, expect } from "@playwright/test";
import { openSite, SETUPS, readText } from "./helpers.mjs";

const fs = (page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--fs"));
const device = (browser, w, h, touch) =>
  browser.newContext({ viewport: { width: w, height: h }, screen: { width: w, height: h }, isMobile: touch && w < 800, hasTouch: touch });

for (const [name, w, h, touch, want] of [
  ["a small phone", 320, 640, true, "20px"],
  ["an iPhone 16 Pro", 402, 874, true, "22px"],
  ["an iPad", 820, 1180, true, "28px"],
  ["a computer", 1280, 800, false, "24px"],
  ["a large screen", 1920, 1080, false, "26px"],
])
  test(`the text's size on ${name}: ${want}, on Home and in a text @chromium-only`, async ({ browser }) => {
    const ctx = await device(browser, w, h, touch);
    const page = await ctx.newPage();
    await openSite(page, SETUPS.marathi);
    expect(await fs(page)).toBe(want);
    await readText(page, "a1");
    expect(await fs(page)).toBe(want);
    await ctx.close();
  });

// It once shrank to fit the widest line of the first text opened, so the size hung on which text came first
test("every text opens at the same size, whichever is opened first; 100% is that size @chromium-only", async ({ browser }) => {
  for (const first of ["a10", "a1"]) {
    const ctx = await device(browser, 390, 844, true);
    const page = await ctx.newPage();
    await openSite(page, SETUPS.marathi);
    const sizes = [];
    for (const s of [first, "a1", "a5", "a9", "a10"]) {
      await readText(page, s);
      sizes.push(await fs(page));
    }
    expect(new Set(sizes), first + " first").toEqual(new Set(["22px"]));
    await page.locator("#rsb").evaluate((b) => b.click());
    await expect(page.locator("#rsv")).toHaveText("100%");
    await ctx.close();
  }
});

test("a size the reader chose is kept", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, { ...SETUPS.marathi, fs: 30, fsu: 1 });
  await readText(page, "a1");
  expect(await fs(page)).toBe("30px");
});

// A phone or browser set to larger text: the text and the menus both grow by its share (Larger Text on an iPhone comes
// through Safari's -apple-system-body; here the browser's default size, 20px instead of 16px, is given to the probe)
test("the reader's own larger text size makes the text and the menus larger by the same share", async ({ page }) => {
  await page.addInitScript(() => {
    const gcs = window.getComputedStyle;
    window.getComputedStyle = function (e, p) {
      const r = gcs.call(window, e, p);
      if (e && e.style && e.style.fontSize === "medium")
        return new Proxy(r, { get: (t, k) => (k === "fontSize" ? "20px" : typeof t[k] === "function" ? t[k].bind(t) : t[k]) });
      return r;
    };
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await openSite(page, SETUPS.marathi);
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue("--ts"))).toBe("1.25");
  expect(await fs(page)).toBe("30px"); // 24px × 1.25
  // the session's heading, 24px as it comes (--fz-xxl)
  expect(await page.locator("#tsh").evaluate((e) => getComputedStyle(e).fontSize)).toBe("30px");
});

test("with the usual text size nothing is scaled", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openSite(page, SETUPS.marathi);
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue("--ts"))).toBe("1");
  expect(await page.locator("#tsh").evaluate((e) => getComputedStyle(e).fontSize)).toBe("24px");
});

// A line too long for a small phone wraps: its two rows sit closer together than two lines do, so it reads as one
test("a long line wraps on a small phone, its rows closer than two lines @chromium-only", async ({ browser }) => {
  const ctx = await device(browser, 320, 640, true);
  const page = await ctx.newPage();
  await openSite(page, SETUPS.marathi);
  await readText(page, "a1");
  const r = await page.evaluate(() => {
    const ps = [...document.querySelectorAll("#a1 .verse .mr p")].filter((p) => p.getClientRects().length);
    const hs = ps.map((p) => p.getBoundingClientRect().height);
    const one = Math.min(...hs);
    return { one, two: Math.max(...hs) };
  });
  expect(r.two, "a wrapped line").toBeGreaterThan(r.one * 1.5);
  expect(r.two, "its rows closer than two lines").toBeLessThan(r.one * 2 - 4);
  await ctx.close();
});

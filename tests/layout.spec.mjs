// Layout across screen sizes: from the smallest phones to large monitors, in portrait and landscape.
// Checks the things that break first on an unfamiliar screen: a sideways scroll, a bar that is off
// screen, text that is too small to read, and controls too small to tap.
import { test, expect } from "@playwright/test";
import { openSite, hasSidewaysScroll, SETUPS } from "./helpers.mjs";

export const SCREENS = [
  { name: "phone-320", width: 320, height: 640, mobile: true },
  { name: "iphone-se", width: 375, height: 667, mobile: true },
  { name: "iphone-15", width: 393, height: 852, mobile: true },
  { name: "android-412", width: 412, height: 915, mobile: true },
  { name: "phone-landscape", width: 844, height: 390, mobile: true },
  { name: "ipad-mini", width: 768, height: 1024, mobile: true },
  { name: "ipad-air", width: 820, height: 1180, mobile: true },
  { name: "ipad-landscape", width: 1180, height: 820, mobile: true },
  { name: "android-tablet", width: 800, height: 1280, mobile: true },
  { name: "laptop", width: 1280, height: 800, mobile: false },
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "full-hd", width: 1920, height: 1080, mobile: false },
  { name: "monitor-1440p", width: 2560, height: 1440, mobile: false },
];

for (const s of SCREENS)
  for (const setup of ["marathi", "both", "kannada-both"]) {
    test(`${s.name} · ${setup}: fits the screen`, async ({ browser, browserName }) => {
      const context = await browser.newContext({
        viewport: { width: s.width, height: s.height },
        // Firefox has no mobile emulation; it still checks the sizes
        ...(browserName !== "firefox" ? { isMobile: s.mobile, hasTouch: s.mobile } : {}),
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      const errors = [];
      await openSite(page, SETUPS[setup], { errors });
      expect(errors).toEqual([]);
      expect(await hasSidewaysScroll(page), "no sideways scroll on the home page").toBe(false);
      // the top bar is on screen and fully inside it
      const bar = await page.locator(".bar").boundingBox();
      expect(bar.y).toBeGreaterThanOrEqual(0);
      expect(bar.x + bar.width).toBeLessThanOrEqual(s.width + 1);
      // open a piece: still no sideways scroll, and the text is readable
      await page.evaluate(() => document.getElementById("a1").scrollIntoView());
      await page.waitForTimeout(150);
      expect(await hasSidewaysScroll(page), "no sideways scroll in a piece").toBe(false);
      const size = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#a1 .verse p")).fontSize));
      expect(size, "verse text at least 16px").toBeGreaterThanOrEqual(16);
      // no verse line is wider than the screen
      const wide = await page.evaluate((w) =>
        [...document.querySelectorAll(".verse p")].filter((p) => {
          const r = p.getBoundingClientRect();
          return r.width && r.right > w + 1;
        }).length, s.width);
      expect(wide, "verse lines wider than the screen").toBe(0);
      await context.close();
    });
  }

test("tap targets in the top and bottom bars are at least 44px @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const small = await page.evaluate(() =>
    [...document.querySelectorAll(".bar button, .bar a, #asc button")]
      .filter((b) => b.offsetParent !== null)
      .map((b) => ({ id: b.id, ...b.getBoundingClientRect().toJSON() }))
      .filter((r) => r.width < 44 || r.height < 44)
      .map((r) => `${r.id} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

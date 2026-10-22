// Smoke: the site opens without errors, with no piece built until one is opened, and can build every piece.
import { test, expect } from "@playwright/test";
import { buildAll, openSite, SETUPS, TEXT_COUNT } from "./helpers.mjs";

test("opens without errors and builds every text in the library when opened @mobile", async ({ page }) => {
  const errors = [];
  await openSite(page, SETUPS.marathi, { errors });
  await expect(page.locator("#home")).toBeVisible();
  // Home on its own: no piece is built until it is opened (js/core/page.js)
  await expect(page.locator("section.ash")).toHaveCount(0);
  await expect(page.locator("#jl a[data-go]").first()).toBeAttached();
  // so Home stays light (about 11,000 elements when every text was built)
  expect(await page.evaluate(() => document.querySelectorAll("*").length)).toBeLessThan(3000);
  await buildAll(page);
  await expect(page.locator("section.ash")).toHaveCount(TEXT_COUNT);
  expect(errors).toEqual([]);
});

for (const name of Object.keys(SETUPS)) {
  test(`no errors with settings: ${name}`, async ({ page }) => {
    const errors = [];
    await openSite(page, SETUPS[name], { errors });
    await buildAll(page);
    await expect(page.locator("section.ash")).toHaveCount(TEXT_COUNT);
    expect(errors).toEqual([]);
  });
}

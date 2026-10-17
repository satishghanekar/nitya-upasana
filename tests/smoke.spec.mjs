// Smoke: the site opens without errors and builds every piece.
import { test, expect } from "@playwright/test";
import { openSite, SETUPS } from "./helpers.mjs";

test("opens without errors and builds all 11 pieces @mobile", async ({ page }) => {
  const errors = [];
  await openSite(page, SETUPS.marathi, { errors });
  await expect(page.locator("section.ash")).toHaveCount(11);
  await expect(page.locator("#home")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const name of Object.keys(SETUPS)) {
  test(`no errors with settings: ${name}`, async ({ page }) => {
    const errors = [];
    await openSite(page, SETUPS[name], { errors });
    await expect(page.locator("section.ash")).toHaveCount(11);
    expect(errors).toEqual([]);
  });
}

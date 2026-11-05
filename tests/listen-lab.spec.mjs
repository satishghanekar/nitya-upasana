// The Listen lab (js/features/listen-lab.js): opened only by #listen-lab, it runs the chanting model on the phone.
// Here, in Chromium, under the site's own Content-Security-Policy (tests/serve.mjs): the library and the model load
// from this site, WebAssembly is allowed, and the check sound gives the very tokens the model's Python side gave
// (models/chant-v2/check.json), so the sound features, the model and the decoding all match the Mac's.
import { test, expect } from "@playwright/test";
import { openSite, SETUPS } from "./helpers.mjs";

test("#listen-lab loads the chanting model and its check chooses as the Mac does; Close takes it away @chromium-only", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = [];
  await openSite(page, SETUPS.marathi, { errors });
  await expect(page.getByRole("dialog", { name: "Listen lab" })).toHaveCount(0);
  await page.evaluate(() => (location.hash = "#listen-lab"));
  const box = page.getByRole("dialog", { name: "Listen lab" });
  await expect(box).toBeVisible();
  await box.getByRole("button", { name: "Load (CPU)" }).click();
  await expect(box.locator("pre")).toContainText("Model loaded on the CPU", { timeout: 120_000 });
  await box.getByRole("button", { name: "Check" }).click();
  await expect(box.locator("pre")).toContainText("Check passed", { timeout: 60_000 });
  await box.getByRole("button", { name: "Close" }).click();
  await expect(box).toHaveCount(0);
  expect(errors).toEqual([]);
});

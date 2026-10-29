// One text at a time: the page shows only the text being read, on every screen and from every way in, and ‹ Prev /
// Next › in the bottom bar go on (in the Library's order, or through a session: today.spec.mjs). There is no card at
// the end of a text: the bottom bar already does what it did. These tests run on the fixed routine (TEST_ROUTINE in
// helpers.mjs: Evening = the ten aartis).
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openSite, readText, SETUPS, useTestRoutine } from "./helpers.mjs";

const LIB = JSON.parse(readFileSync(new URL("../content/library.json", import.meta.url), "utf8"));
const EVENING = new Date("2026-10-18T19:00:00-04:00"); // Sunday
const rows = (page) => page.locator("#tsl li");
// the page's pieces that are on screen
const shown = (page) => page.evaluate(() => [...document.querySelectorAll("#main > .ash")].filter((s) => s.offsetParent !== null).map((s) => s.id));

test.beforeEach(async ({ page }) => {
  await useTestRoutine(page);
});

test("from the Library only the text opened is on the page, and Prev / Next in the bottom bar go on @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await readText(page, "a3");
  expect(await shown(page)).toEqual(["a3"]);
  // Home is not above it (on wide screens its column is beside the text, out of the page's flow)
  expect(await page.locator("#home").evaluate((h) => getComputedStyle(h).display === "none" || getComputedStyle(h).position === "fixed")).toBe(true);
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", "Next: Shankar Aarti");
  await expect(page.locator("#asv")).toHaveAttribute("aria-label", "Prev: Shendur Laal Chadhayo");
  await page.locator("#asn").click();
  await expect.poll(() => shown(page)).toEqual(["a4"]);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#a4");
  await page.locator("#asv").click();
  await expect.poll(() => shown(page)).toEqual(["a3"]);
});

test("the first text in the Library has no Prev; the last has no Next", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const order = LIB.texts.map((t) => t.id);
  // (from a3: the page may not scroll at all, and the bar must still follow the text opened)
  await readText(page, "a3");
  await readText(page, "p1");
  await expect(page.locator("#asv")).toBeDisabled();
  await expect(page.locator("#asn")).toBeEnabled();
  const lastSec = await page.evaluate(() => window.CONTENT.categories.flatMap((c) => c.pieces.map((p) => p.id)).pop());
  await readText(page, lastSec);
  await expect(page.locator("#asn")).toBeDisabled();
  await expect(page.locator("#asv")).toBeEnabled();
  expect(order.length).toBeGreaterThan(1);
});

test("no card at the end of a text, from the Library or in a session @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(page.locator("#endc")).toHaveCount(0);
  await rows(page).nth(1).locator("a.tgo").click();
  // (a session runs on: its texts are all on the page, one after another)
  await expect.poll(() => shown(page)).toContain("a2");
  await expect(page.locator("#endc")).toHaveCount(0);
  await expect(page.locator("#main")).not.toContainText("Done · next");
  await readText(page, "a3");
  await expect(page.locator("#endc")).toHaveCount(0);
});

test("Back from a text shows Home again", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await readText(page, "a3");
  await page.goBack();
  await expect(page.locator("#home")).toBeVisible();
});

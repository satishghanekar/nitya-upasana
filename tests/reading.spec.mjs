// One text at a time (v1.20, docs/decisions.md; stage 4 of docs/refactor-plan.md): the page shows only the text being
// read, on every screen and from every way in, and a card at its end (#endc, js/features/end-card.js) goes on: Next /
// Previous in the Library's order, or in a session where you are and Done · next (which ticks), Back to Home after the
// last text. These tests run on the fixed routine (TEST_ROUTINE in helpers.mjs: Evening = the ten aartis).
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openSite, readText, SETUPS, useTestRoutine, axeEveryTheme, noViolations } from "./helpers.mjs";

const LIB = JSON.parse(readFileSync(new URL("../content/library.json", import.meta.url), "utf8"));
const EVENING = new Date("2026-10-18T19:00:00-04:00"); // Sunday
const MORNING = new Date("2026-10-15T10:00:00-04:00"); // Thursday
const card = (page) => page.locator("#endc");
const rows = (page) => page.locator("#tsl li");
// the page's pieces that are on screen
const shown = (page) => page.evaluate(() => [...document.querySelectorAll("#main > .ash")].filter((s) => s.offsetParent !== null).map((s) => s.id));

test.beforeEach(async ({ page }) => {
  await useTestRoutine(page);
});

test("from the Library only the text opened is on the page, with Next and Previous at its end @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await readText(page, "a3");
  expect(await shown(page)).toEqual(["a3"]);
  // Home is not above it
  await expect(page.locator("#home")).toBeHidden();
  const next = card(page).locator('[data-ec="next"]'),
    prev = card(page).locator('[data-ec="prev"]');
  await expect(next).toContainText("Next");
  await expect(next).toContainText("४. शंकराची आरती");
  await expect(prev).toContainText("Previous");
  await expect(prev).toContainText("२. गणपति जी की आरती");
  // the card comes right after the text, not inside it
  expect(await page.evaluate(() => document.getElementById("endc").previousElementSibling.id)).toBe("a3");
  await next.click();
  await expect.poll(() => shown(page)).toEqual(["a4"]);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#a4");
  await card(page).locator('[data-ec="prev"]').click();
  await expect.poll(() => shown(page)).toEqual(["a3"]);
});

test("the first text in the Library has no Previous; the last has no Next", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const order = LIB.texts.map((t) => t.id);
  await readText(page, "p1");
  await expect(card(page).locator('[data-ec="prev"]')).toHaveCount(0);
  await expect(card(page).locator('[data-ec="next"]')).toHaveCount(1);
  const lastSec = await page.evaluate(() => [...document.querySelectorAll("#main > .ash")].pop().id);
  await readText(page, lastSec);
  await expect(card(page).locator('[data-ec="next"]')).toHaveCount(0);
  await expect(card(page).locator('[data-ec="prev"]')).toHaveCount(1);
  expect(order.length).toBeGreaterThan(1);
});

test("in a session the card says where you are, and Done · next ticks the text and opens the next one @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await rows(page).nth(0).locator("input").check();
  await page.locator("#tst").click();
  await expect.poll(() => shown(page)).toEqual(["a2"]);
  await expect(card(page).locator(".ecpos")).toHaveText("Evening session · 2 of 10");
  await expect(card(page).locator(".ecpips i")).toHaveCount(10);
  await expect(card(page).locator(".ecpips i.d")).toHaveCount(1);
  await expect(card(page).locator(".ecpips i.c")).toHaveCount(1);
  const next = card(page).locator('[data-ec="next"]');
  await expect(next).toContainText("Done · next");
  await expect(next).toContainText("देवीची आरती");
  await expect(card(page).locator('[data-ec="prev"]')).toContainText("गणपतीची आरती");
  await next.click();
  await expect.poll(() => shown(page)).toEqual(["a3"]);
  await expect(card(page).locator(".ecpos")).toHaveText("Evening session · 3 of 10");
  await expect(card(page).locator(".ecpips i.d")).toHaveCount(2);
});

test("on the session's last text, Done goes back to Home and ticks it @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await page.locator("#tst").click();
  await expect.poll(() => shown(page)).toEqual(["p1"]);
  await expect(card(page).locator(".ecpos")).toHaveText("Morning session · 1 of 1");
  await expect(card(page).locator('[data-ec="prev"]')).toHaveCount(0);
  const done = card(page).locator('[data-ec="next"]');
  await expect(done).toContainText("Done · the morning session is complete");
  await expect(done).toContainText("Back to Home");
  await done.click();
  await expect(page.locator("#tsc")).toBeInViewport();
  await expect(page.locator("#tsn")).toHaveText("1 of 1 done");
  await expect(card(page)).toBeHidden();
});

test("Marathi menus: the card speaks Marathi", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"], { now: EVENING });
  await page.locator("#tst").click();
  await expect(card(page).locator(".ecpos")).toHaveText("सायंकाळ · १० पैकी १");
  await expect(card(page).locator('[data-ec="next"]')).toContainText("झाले · पुढील");
  await expect(card(page)).toHaveAttribute("lang", "mr");
});

test("Home has no end card, and Back from a text shows Home again", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await expect(card(page)).toBeHidden();
  await readText(page, "a3");
  await expect(card(page)).toBeVisible();
  await page.goBack();
  await expect(page.locator("#home")).toBeVisible();
  await expect(card(page)).toBeHidden();
});

test("the card's buttons have a 44px target and a name @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#tst").click();
  await page.locator('#endc [data-ec="next"]').waitFor();
  const sizes = await page.locator("#endc button").evaluateAll((bs) => bs.map((b) => [b.getBoundingClientRect().height, b.textContent.trim().length]));
  for (const [h, n] of sizes) {
    expect(h).toBeGreaterThanOrEqual(44);
    expect(n).toBeGreaterThan(0);
  }
});

test("axe: the end of a text in a session, every theme @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#tst").click();
  await page.locator('#endc [data-ec="next"]').scrollIntoViewIfNeeded();
  expect(await axeEveryTheme(page, "#endc")).toEqual(noViolations());
});

// One text at a time: the page shows only the text being read, on every screen and from every way in, and ‹ Prev /
// Next › in the bottom bar go on (in the Library's order, or through a session: today.spec.mjs). There is no card at
// the end of a text: the bottom bar already does what it did. These tests run on the fixed routine (TEST_ROUTINE in
// helpers.mjs: Evening = the ten aartis).
import { test, expect } from "@playwright/test";
import { openSite, readText, SETUPS, useTestRoutine } from "./helpers.mjs";
import { TEXTS } from "./content-files.mjs";

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
  const order = TEXTS.map((t) => t.id);
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

test("a text with a recording shows it under the credit: YouTube, the chanters, opening in a new tab where it starts @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#hm").click();
  // a text's section, by its title in the Library
  const sec = (title) => page.evaluate((t) => [...document.querySelectorAll("#jl a[data-go]")].find((x) => x.textContent.includes(t)).dataset.go, title);
  const ath = await sec("गणपत्यथर्वशीर्ष");
  const pav = await sec("पवमान");
  await page.locator(`#jl a[data-go="${ath}"]`).click();
  const rec = page.locator(`#${ath} .cr .rec`);
  await expect(rec).toBeVisible();
  await expect(rec).toHaveText("▶ YouTube: Challakere Brothers ↗");
  const a = rec.locator("a");
  await expect(a).toHaveAttribute("href", "https://www.youtube.com/watch?v=OQhyYdoKW1k&t=90");
  await expect(a).toHaveAttribute("target", "_blank");
  await expect(a).toHaveAttribute("rel", "noopener");
  await expect(a).toHaveAccessibleName("Challakere Brothers: YouTube (opens in a new tab)");
  // two recordings, the long name wrapping inside the screen
  await page.locator("#hm").click();
  await page.locator(`#jl a[data-go="${pav}"]`).click();
  const pv = page.locator(`#${pav} .cr .rec`);
  await expect(pv.locator("a")).toHaveCount(2);
  const box = await pv.boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
});

// A text sung in more than one way (js/features/versions.js; Satish, 2026-11-15): the Library lists it once; the
// switch under its title shows the other version in place, remembered for the person, and print and search read it
test("the Hanuman Chalisa: listed once, Tulsidas | Popular under its title, the choice remembered @mobile", async ({ page }) => {
  const errors = [];
  await openSite(page, SETUPS.marathi, { hash: "#stotra-hanuman-chalisa", errors });
  await expect(page.locator('#jl a[data-go="stotra-hanuman-chalisa"]')).toHaveCount(1);
  await expect(page.locator('#jl a[data-go="stotra-hanuman-chalisa-popular"]')).toHaveCount(0);
  const sec = page.locator("#stotra-hanuman-chalisa");
  const sw = sec.locator(".ver");
  await expect(sw).toHaveAttribute("role", "group");
  await expect(sw.locator(".vlab .mr")).toHaveText("पाठभेद");
  const [own, popular] = [sw.locator('button[data-ver="stotra-hanuman-chalisa"]'), sw.locator('button[data-ver="stotra-hanuman-chalisa-popular"]')];
  await expect(own).toHaveAttribute("aria-pressed", "true");
  await expect(sec).toContainText("महाबीर बिक्रम बजरंगी");
  // big enough to tap
  const box = await popular.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  await popular.click();
  await expect(sec).toContainText("महावीर विक्रम बजरंगी");
  await expect(sec).not.toContainText("महाबीर बिक्रम बजरंगी");
  // the switch is built again with the text: the button pressed keeps the focus
  await expect(sec.locator('.ver button[data-ver="stotra-hanuman-chalisa-popular"]')).toHaveAttribute("aria-pressed", "true");
  await expect(sec.locator('.ver button[data-ver="stotra-hanuman-chalisa-popular"]')).toBeFocused();
  // the popular one is the piece in the text's place, which search, print, Go to and Follow read
  const found = await page.evaluate(() => {
    const C = window.CONTENT;
    return C.categories.flatMap((c) => c.pieces).find((p) => p.text === "stotra-hanuman-chalisa").ver;
  });
  expect(found).toBe("stotra-hanuman-chalisa-popular");
  // remembered after a reload
  await page.reload();
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-ready"));
  await expect(page.locator("#stotra-hanuman-chalisa")).toContainText("महावीर विक्रम बजरंगी");
  // and back
  await page.locator('#stotra-hanuman-chalisa .ver button[data-ver="stotra-hanuman-chalisa"]').click();
  await expect(page.locator("#stotra-hanuman-chalisa")).toContainText("महाबीर बिक्रम बजरंगी");
  expect(errors).toEqual([]);
});

// "↻ ३ वेळा" after the Hare Rama lines, which the text writes out three times (घालीन लोटांगण): with the dhrupad after
// every verse all three show, so the note would make it nine; with it once the repeats are hidden and the note says
// how many times (Satish, 2026-11-15, as on paper)
for (const [ref, shown] of [
  [0, false],
  [1, true],
])
  test(`a '3 times' note after written-out repeats: ${shown ? "shown" : "hidden"} with the dhrupad ${ref ? "once" : "after every verse"} @mobile`, async ({
    page,
  }) => {
    await openSite(page, { ...SETUPS.marathi, ref }, { hash: "#a8" });
    const note = page.locator("#a8 .rmk.nt", { hasText: "३ वेळा" });
    await expect(note).toHaveCount(1);
    if (shown) await expect(note).toBeVisible();
    else await expect(note).toBeHidden();
    // the repeats: all three Hare Rama lines with it after every verse, one with it once
    const lines = page.locator("#a8 .verse .mr p", { hasText: "हरे राम हरे रामराम" });
    expect(await lines.evaluateAll((l) => l.filter((p) => p.getClientRects().length).length)).toBe(shown ? 1 : 3);
  });

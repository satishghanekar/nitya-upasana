// The Library (Home v2, docs/decisions.md 2026-10-18): the book button in the top bar opens every text, grouped as
// the home page had them (पूजा, आरती), with search. A title opens its text; Back (the button or the browser's) returns
// to Home. The bottom bar's search button and the one at the end of each piece open the same page.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { openSite, SETUPS } from "./helpers.mjs";

const LIB = JSON.parse(readFileSync(new URL("../content/library.json", import.meta.url), "utf8"));
const EVENING = new Date("2026-10-18T19:00:00-04:00");
const onPiece = (page) =>
  page.evaluate(() => {
    let c = "";
    document.querySelectorAll(".ash").forEach((x) => {
      if (x.offsetParent !== null && x.getBoundingClientRect().top <= 90) c = x.id;
    });
    return c;
  });

test("the Library button opens every text, grouped, with search @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  const btn = page.locator("#hm");
  await expect(btn).toHaveAccessibleName("Library");
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  await btn.click();
  await expect(page.locator("#jump")).toBeVisible();
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#jump")).toHaveAccessibleName("संग्रह Library");
  await expect(page.locator("#q")).toBeVisible();
  // the groups as on the home page before: पूजा then आरती, every text of the library in order
  await expect(page.locator("#jl .tocg:not([hidden]) .gh .mr")).toHaveText(["पूजा", "आरती"]);
  const ids = LIB.groups.flatMap((g) => g.texts);
  await expect(page.locator("#jl a[data-go]")).toHaveCount(ids.length);
  // the bottom bar steps aside
  await expect(page.locator("#asc")).toBeHidden();
});

test("a text opened from the Library; Back returns to Home @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#hm").click();
  await page.locator('#jl a[data-go="a5"]').click();
  await expect(page.locator("#jump")).toBeHidden();
  await expect.poll(() => onPiece(page)).toBe("a5");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#a5");
  await page.goBack();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  await expect.poll(() => onPiece(page)).toBe("");
  await expect(page.locator("#tsc")).toBeInViewport();
  await expect(page.locator("#jump")).toBeHidden();
});

test("the Library's Back button and the browser's Back both close it, without leaving Home @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  const url = page.url();
  await page.locator("#hm").click();
  await page.locator("#jbk").click();
  await expect(page.locator("#jump")).toBeHidden();
  await expect(page.locator("#hm")).toBeFocused();
  expect(page.url()).toBe(url);
  await page.locator("#hm").click();
  await expect(page.locator("#jump")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#jump")).toBeHidden();
  expect(page.url()).toBe(url);
  await expect(page.locator("#tsc")).toBeVisible();
});

test("search in the Library finds a line and goes to it", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#hm").click();
  await page.locator("#q").fill("sukhakarta");
  await expect(page.locator("#res button").first()).toBeVisible();
  await expect(page.locator("#jl")).toBeHidden();
  await page.locator("#res button").first().click();
  await expect(page.locator("#jump")).toBeHidden();
  await expect.poll(() => onPiece(page)).toBe("a1");
});

test("the bottom bar's search button opens the Library while reading", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING, hash: "#a3" });
  await expect(page.locator("#asq")).toBeVisible();
  await page.locator("#asq").click();
  await expect(page.locator("#jump")).toBeVisible();
  await page.locator('#jl a[data-go="a7"]').click();
  await expect.poll(() => onPiece(page)).toBe("a7");
});

test("on the home page the top bar has the name, profile, Library and Settings; reading adds Language and Dhrupad @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(page.locator("#home-btn")).toBeHidden();
  await expect(page.locator("#rb")).toBeHidden();
  for (const b of ["#who", "#hm", "#aa"]) await expect(page.locator(b)).toBeVisible();
  await page.locator("#tst").click();
  await expect.poll(() => onPiece(page)).toBe("a1");
  await expect(page.locator("#home-btn")).toBeVisible();
  await expect(page.locator("#rb")).toBeVisible();
});

for (const [name, prefs] of [
  ["light", SETUPS.marathi],
  ["dark", { ...SETUPS.marathi, th: "dark" }],
  ["sepia", { ...SETUPS.marathi, th: "sepia" }],
  ["high contrast", { ...SETUPS.marathi, hc: 1 }],
  ["Marathi menus, both languages", { ...SETUPS["marathi-menus"], lang: "both" }],
]) {
  test(`axe: the Library, ${name} @mobile`, async ({ page }) => {
    await openSite(page, prefs, { now: EVENING });
    await page.locator("#hm").click();
    await expect(page.locator("#jump")).toBeVisible();
    const r = await new AxeBuilder({ page })
      .include("#jump")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .disableRules(["label-content-name-mismatch"])
      .analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 5).join(", ")}`)).toEqual([]);
  });
}

test("every Library link and button has a 44px target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#hm").click();
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("#jump a[data-go], #jbk")]
      .map((b) => ({ c: b.getAttribute("data-go") || b.id, ...b.getBoundingClientRect().toJSON() }))
      .filter((r) => r.height < 44)
      .map((r) => `${r.c} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

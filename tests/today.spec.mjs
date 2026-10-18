// The Today card (docs/architecture.md §5.4, mockup A): the time-of-day picture, the date, the week row, the
// Morning / Afternoon / Evening switch, the next Sankathara Chaturthi line and the session's texts with a tick each
// and Start / Continue. Default routine (content/routines.json): Morning = Atharvashirsha, Evening = the ten aartis.
// 15 Oct 2026 is a Thursday, 18 Oct a Sunday (the week row runs Mon 12 – Sun 18).
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { openSite, settle, SETUPS } from "./helpers.mjs";

const LIB = JSON.parse(readFileSync(new URL("../content/library.json", import.meta.url), "utf8"));
const TITLE = Object.fromEntries(LIB.texts.map((t) => [t.id, t]));
const AARTIS = LIB.groups.find((g) => g.id === "g-aarti").texts;
const MORNING = new Date("2026-10-15T10:00:00-04:00"); // Thursday
const EVENING = new Date("2026-10-18T19:00:00-04:00"); // Sunday

const rows = (page) => page.locator("#tsl li");
const checked = (page, group) => page.locator(`${group} [role="radio"][aria-checked="true"]`);
const hash = (page) => page.evaluate(() => location.hash);
// the piece the reader is on: the last one whose top has passed just under the top bar (js/core/apply.js cur())
const onPiece = (page) =>
  page.evaluate(() => {
    let c = "";
    document.querySelectorAll(".ash").forEach((x) => {
      if (x.offsetParent !== null && x.getBoundingClientRect().top <= 90) c = x.id;
    });
    return c;
  });

test("in the morning the card shows Thursday's Morning: the Atharvashirsha, with Start @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await expect(checked(page, "#tss")).toHaveAttribute("data-s", "morning");
  await expect(checked(page, "#twk")).toHaveAttribute("data-d", "2026-10-15");
  await expect(page.locator("#tdd")).toHaveText("Thursday, 15 October 2026");
  await expect(page.locator("#twk [role=radio]")).toHaveCount(7);
  await expect(page.locator("#twk [role=radio]").first()).toContainText("Mon");
  await expect(page.locator("#twk [role=radio]").last()).toContainText("Sun");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first().locator(".t1")).toHaveText(TITLE.atharvashirsha.title);
  await expect(rows(page).first().locator(".t2")).toHaveText(TITLE.atharvashirsha.titleEn);
  await expect(rows(page).first().locator(".ttg")).toHaveText("Sanskrit");
  await expect(page.locator("#tsn")).toHaveText("0 of 1 done");
  await expect(page.locator("#tst")).toHaveText("Start: Ganapati Atharvashirsha");
  // the picture is the sunrise one, Thursday's star ringed; the next Chaturthi line is still on the card
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "sunrise");
  await expect(page.locator("#iconb")).toHaveAttribute("data-day", "4");
  await expect(page.locator("#skc .skm")).toContainText("Moonrise");
  await expect(page.locator(".top #skc")).toBeVisible();
});

test("in the evening the card shows Sunday's Evening: the ten aartis in order @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(checked(page, "#tss")).toHaveAttribute("data-s", "evening");
  await expect(checked(page, "#twk")).toHaveAttribute("data-d", "2026-10-18");
  await expect(rows(page)).toHaveCount(10);
  expect(await rows(page).locator(".t1").allTextContents()).toEqual(AARTIS.map((id) => TITLE[id].title));
  expect(await rows(page).locator(".t2").allTextContents()).toEqual(AARTIS.map((id) => TITLE[id].titleEn));
  expect(await rows(page).locator(".tno").allTextContents()).toEqual(["१.", "२.", "३.", "४.", "५.", "६.", "७.", "८.", "९.", "१०."]);
  await expect(page.locator("#tsh")).toContainText("Evening");
  await expect(page.locator("#tst")).toHaveText("Start: Ganapati Aarti");
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "sunset");
});

test("the session switch changes the list, the picture and what screen readers hear @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await page.locator('#tss [data-s="afternoon"]').click();
  await expect(checked(page, "#tss")).toHaveAttribute("data-s", "afternoon");
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator("#tse")).toBeVisible();
  await expect(page.locator("#tst")).toBeHidden();
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "midday");
  await expect(page.locator("#tlive")).toContainText("Afternoon");
  await page.locator('#tss [data-s="evening"]').click();
  await expect(rows(page)).toHaveCount(10);
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "sunset");
  await expect(page.locator("#tlive")).toContainText("10 texts");
  // the browser tab icon still follows the clock
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute("href", "icon-32.png");
});

test("tapping another day shows that day's routine; ticks are only for today @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator('#twk [data-d="2026-10-12"]').click();
  await expect(checked(page, "#twk")).toHaveAttribute("data-d", "2026-10-12");
  await expect(page.locator("#tdd")).toHaveText("Monday, 12 October 2026");
  await expect(page.locator("#iconb")).toHaveAttribute("data-day", "1");
  await expect(rows(page)).toHaveCount(10);
  await expect(page.locator("#tsl input[type=checkbox]")).toHaveCount(0);
  await expect(page.locator("#tsn")).toHaveText("10 texts");
  // back to today: the ticks are there again
  await page.locator('#twk [data-d="2026-10-18"]').click();
  await expect(page.locator("#tsl input[type=checkbox]")).toHaveCount(10);
  await expect(page.locator("#tdd")).toHaveText("Sunday, 18 October 2026");
});

test("ticks are kept after a reload and cleared the next day @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await rows(page).nth(0).locator("input").check();
  await rows(page).nth(1).locator("input").check();
  await expect(page.locator("#tsn")).toHaveText("2 of 10 done");
  await expect(page.locator("#tst")).toHaveText("Continue: Devi Aarti");
  await page.reload();
  await settle(page);
  await expect(rows(page).nth(0).locator("input")).toBeChecked();
  await expect(rows(page).nth(1).locator("input")).toBeChecked();
  await expect(rows(page).nth(2).locator("input")).not.toBeChecked();
  await expect(rows(page).nth(1)).toHaveClass(/\bdone\b/);
  await expect(page.locator("#tsn")).toHaveText("2 of 10 done");
  // the morning's list has its own ticks
  await page.locator('#tss [data-s="morning"]').click();
  await expect(page.locator("#tsn")).toHaveText("0 of 1 done");
  // untick one
  await page.locator('#tss [data-s="evening"]').click();
  await rows(page).nth(0).locator("input").uncheck();
  await expect(page.locator("#tsn")).toHaveText("1 of 10 done");
  await expect(page.locator("#tst")).toHaveText("Continue: Ganapati Aarti");
  // Monday evening: a new day, no ticks
  await page.clock.setFixedTime(new Date("2026-10-19T19:00:00-04:00"));
  await page.reload();
  await settle(page);
  await expect(checked(page, "#twk")).toHaveAttribute("data-d", "2026-10-19");
  await expect(page.locator("#tsl input:checked")).toHaveCount(0);
  await expect(page.locator("#tsn")).toHaveText("0 of 10 done");
});

test("a page left open overnight starts the new day with no ticks", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-18T23:58:00-04:00"), running: true });
  await rows(page).nth(0).locator("input").check();
  await page.clock.runFor("03:00");
  await expect(checked(page, "#twk")).toHaveAttribute("data-d", "2026-10-19");
  await expect(checked(page, "#tss")).toHaveAttribute("data-s", "morning");
  await expect(page.locator("#tsl input:checked")).toHaveCount(0);
});

test("Start opens the first unticked text, and Next walks through the session in order @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await rows(page).nth(0).locator("input").check();
  await rows(page).nth(1).locator("input").check();
  await page.locator("#tst").click();
  await expect.poll(() => hash(page)).toBe("#a3");
  await expect.poll(() => onPiece(page)).toBe("a3");
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", "Next: Shankar Aarti");
  await page.locator("#asn").click();
  await expect.poll(() => onPiece(page)).toBe("a4");
  await page.locator("#asv").click();
  await expect.poll(() => onPiece(page)).toBe("a3");
});

test("in the morning, Next after the Atharvashirsha ends the session and returns to Today @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await page.locator("#tst").click();
  await expect.poll(() => onPiece(page)).toBe("p1");
  // the library order would go on to Aarti 1; the session ends here
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", "Next: Today");
  await page.locator("#asn").click();
  await expect.poll(() => onPiece(page)).toBe("");
  await expect(page.locator("#tsc")).toBeInViewport();
  await expect(page.locator("#tsh")).toBeFocused();
  // reading outside a session (a contents link): Next follows the library again
  await page.locator('a[data-go="p1"]:visible').first().click();
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", "Next: Ganapati Aarti");
});

test("a text's title in the list opens it, in the session", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await rows(page).nth(9).locator("a").click();
  await expect.poll(() => onPiece(page)).toBe("a10");
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", "Next: Today");
});

test("keyboard: arrows move along the day and session switches; Space ticks @mobile", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Safari's default Tab skips buttons");
  await openSite(page, SETUPS.marathi, { now: EVENING });
  // one Tab stop per group: the chosen day
  const day = checked(page, "#twk");
  await day.focus();
  await expect(day).toHaveAttribute("tabindex", "0");
  expect(await page.locator('#twk [tabindex="0"]').count()).toBe(1);
  await page.keyboard.press("ArrowLeft");
  await expect(checked(page, "#twk")).toHaveAttribute("data-d", "2026-10-17");
  await expect(page.locator('#twk [data-d="2026-10-17"]')).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.locator('#twk [data-d="2026-10-12"]')).toBeFocused();
  await expect(page.locator("#tdd")).toHaveText("Monday, 12 October 2026");
  await page.keyboard.press("End");
  await expect(checked(page, "#twk")).toHaveAttribute("data-d", "2026-10-18");
  await page.keyboard.press("ArrowRight"); // wraps to Monday
  await expect(checked(page, "#twk")).toHaveAttribute("data-d", "2026-10-12");
  await page.keyboard.press("End");
  // Tab goes on to the session switch, on the chosen session
  await page.keyboard.press("Tab");
  await expect(page.locator('#tss [data-s="evening"]')).toBeFocused();
  await page.keyboard.press("ArrowRight"); // wraps to Morning
  await expect(checked(page, "#tss")).toHaveAttribute("data-s", "morning");
  await page.keyboard.press("ArrowLeft");
  await expect(checked(page, "#tss")).toHaveAttribute("data-s", "evening");
  await page.keyboard.press("ArrowUp");
  await expect(checked(page, "#tss")).toHaveAttribute("data-s", "afternoon");
  await page.keyboard.press("ArrowDown");
  await expect(checked(page, "#tss")).toHaveAttribute("data-s", "evening");
  // a tick with the keyboard
  const box = rows(page).nth(0).locator("input");
  await box.focus();
  await page.keyboard.press("Space");
  await expect(box).toBeChecked();
  await expect(page.locator("#tsn")).toHaveText("1 of 10 done");
  // focus is drawn (WCAG 2.4.7)
  const outline = await box.evaluate((e) => {
    const s = getComputedStyle(e.parentElement.querySelector(".tkc"));
    return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2;
  });
  expect(outline).toBe(true);
});

test("each tick, day and session control has a name and a 44px target @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(rows(page).nth(2).locator("input")).toHaveAccessibleName("Done: Devi Aarti");
  await expect(page.locator("#twk")).toHaveAccessibleName("Day");
  await expect(page.locator("#tss")).toHaveAccessibleName("Session");
  await expect(page.locator('#tss [data-s="evening"]')).toHaveAccessibleName("Evening");
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("#twk [role=radio], #tss [role=radio], #tsl .ttk, #tsl a, #tst")]
      .map((b) => ({ c: b.className || b.id, ...b.getBoundingClientRect().toJSON() }))
      .filter((r) => r.width < 44 || r.height < 44)
      .map((r) => `${r.c} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

for (const [name, prefs] of [
  ["light", SETUPS.marathi],
  ["dark", { ...SETUPS.marathi, th: "dark" }],
  ["sepia", { ...SETUPS.marathi, th: "sepia" }],
  ["high contrast", { ...SETUPS.marathi, hc: 1 }],
  ["Marathi menus", SETUPS["marathi-menus"]],
]) {
  test(`axe: the Today card with ticks, ${name} @mobile`, async ({ page }) => {
    await openSite(page, prefs, { now: EVENING });
    await rows(page).nth(0).locator("input").check();
    await rows(page).nth(1).locator("input").check();
    const r = await new AxeBuilder({ page })
      .include("#home")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .disableRules(["label-content-name-mismatch"])
      .analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 5).join(", ")}`)).toEqual([]);
  });
}

test("Marathi menus: the card speaks Marathi, the titles stay as written", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"], { now: EVENING });
  await expect(page.locator("#tdd")).toHaveText("रविवार, १८ ऑक्टोबर २०२६");
  await expect(page.locator("#tst")).toHaveText("सुरू करा: गणपतीची आरती");
  await expect(page.locator('#tss [data-s="evening"]')).toHaveAccessibleName("सायंकाळ");
  await expect(rows(page).nth(1).locator(".t1")).toHaveText(TITLE["shendur-lal-chadhayo"].title);
});

test("Kannada letters: the titles in the list are shown in Kannada", async ({ page }) => {
  await openSite(page, SETUPS.kannada, { now: EVENING });
  await expect(rows(page).first().locator(".t1")).toHaveText(/^[ಀ-೿\s]+$/);
  await expect(rows(page).first().locator(".t2")).toHaveText("Ganapati Aarti");
});

test("the full date card is still there: More dates opens the strip and the calendar buttons", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(page.locator("#skc .sks")).toBeHidden();
  await page.locator("#skmore").click();
  await expect(page.locator("#skc .sks")).toBeVisible();
  await expect(page.locator("#skall")).toBeVisible();
  await expect(page.locator("#skc .sktd")).toBeVisible();
  await expect(page.locator("#shr #shb")).toBeVisible();
});

test("folding the card keeps the session in view", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#cvb").click();
  await expect(page.locator("#slim")).toBeVisible();
  await expect(page.locator("#twk")).toBeHidden();
  await expect(page.locator("#tsc")).toBeVisible();
  await expect(rows(page)).toHaveCount(10);
});

test("the list of every text stays under the card, on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(page.locator("#tfb")).toBeVisible();
  const order = await page.evaluate(() => {
    const y = (s) => document.querySelector(s).getBoundingClientRect().top;
    return y("#home .top") < y("#tsc") && y("#tsc") < y("#tfr");
  });
  expect(order).toBe(true);
});

test("on a wide screen the card and the session sit side by side", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const page = await context.newPage();
  await openSite(page, SETUPS.marathi, { now: EVENING });
  const a = await page.locator("#home .top").boundingBox();
  const b = await page.locator("#tsc").boundingBox();
  expect(b.x).toBeGreaterThan(a.x + a.width - 1);
  expect(Math.abs(b.y - a.y)).toBeLessThan(4);
  await context.close();
});

test("with no routine file the card still works and the texts still load", async ({ page }) => {
  await page.route("**/content/routines.json", (r) => r.fulfill({ status: 404, body: "" }));
  const errors = [];
  await openSite(page, SETUPS.marathi, { now: EVENING, errors });
  await expect(page.locator("#tse")).toBeVisible();
  await expect(page.locator("#tst")).toBeHidden();
  await expect(page.locator("#a1")).toBeAttached();
  // only the missing file itself is reported, by the browser
  expect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([]);
});

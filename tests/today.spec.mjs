// Home (Home v2, docs/decisions.md 2026-10-18): the time-of-day picture beside today's date, the session's texts with
// a tick each, "Not this time?" with the other sessions, the App / Share / QR / Print / Help row and Start /
// Continue (pinned to the bottom on phones). On a Sankashti day only, one line with moonrise. Every text is in the
// Library (the book button). Default routine (content/routines.json): Morning = Atharvashirsha, Evening = the ten
// aartis. 15 Oct 2026 is a Thursday, 18 Oct a Sunday, 28 Oct a Sankashti (Wednesday).
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
const other = (page, s) => page.locator(`#tso button[data-s="${s}"]`);
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

test("in the morning Home shows Thursday's Morning: the Atharvashirsha, with Start @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await expect(page.locator("#tsh")).toHaveText("सकाळ · Morning");
  await expect(page.locator("#tdd .d1")).toHaveText("गुरुवार, १५ ऑक्टोबर २०२६");
  await expect(page.locator("#tdd .d2")).toHaveText("Thursday, 15 October 2026");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first().locator(".t1")).toHaveText(TITLE.atharvashirsha.title);
  await expect(rows(page).first().locator(".t2")).toHaveText(TITLE.atharvashirsha.titleEn);
  await expect(rows(page).first().locator(".ttg")).toHaveText("Sanskrit");
  await expect(page.locator("#tsn")).toHaveText("0 of 1 done");
  await expect(page.locator("#tst")).toHaveText("Start: Ganapati Atharvashirsha");
  // the picture is the sunrise one, Thursday's star ringed; not a Sankashti, so no moonrise line
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "sunrise");
  await expect(page.locator("#iconb")).toHaveAttribute("data-day", "4");
  await expect(page.locator("#skt")).toBeHidden();
  // the other two sessions are offered
  await expect(page.locator("#tso")).toHaveText("Not this time? Afternoon · Evening", { useInnerText: true });
  await expect(other(page, "morning")).toBeHidden();
});

test("in the evening Home shows Sunday's Evening: the ten aartis in order @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(rows(page)).toHaveCount(10);
  expect(await rows(page).locator(".t1").allTextContents()).toEqual(AARTIS.map((id) => TITLE[id].title));
  expect(await rows(page).locator(".t2").allTextContents()).toEqual(AARTIS.map((id) => TITLE[id].titleEn));
  expect(await rows(page).locator(".tno").allTextContents()).toEqual(["१.", "२.", "३.", "४.", "५.", "६.", "७.", "८.", "९.", "१०."]);
  await expect(page.locator("#tsh")).toHaveText("सायंकाळ · Evening");
  await expect(page.locator("#tst")).toHaveText("Start: Ganapati Aarti");
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "sunset");
  await expect(page.locator("#tso")).toHaveText("Not this time? Morning · Afternoon", { useInnerText: true });
});

test("Not this time? changes the list, the picture and what screen readers hear @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await other(page, "afternoon").click();
  await expect(page.locator("#tsh")).toHaveText("दुपार · Afternoon");
  await expect(page.locator("#tsh")).toBeFocused();
  await expect(page.locator("#tso")).toHaveText("Not this time? Morning · Evening", { useInnerText: true });
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator("#tse")).toBeVisible();
  await expect(page.locator("#tst")).toBeHidden();
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "midday");
  await expect(page.locator("#tlive")).toContainText("Afternoon");
  await other(page, "evening").click();
  await expect(rows(page)).toHaveCount(10);
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "sunset");
  await expect(page.locator("#tlive")).toContainText("10 texts");
  // the browser tab icon still follows the clock
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute("href", "icon-32.png");
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
  await other(page, "morning").click();
  await expect(page.locator("#tsn")).toHaveText("0 of 1 done");
  // untick one
  await other(page, "evening").click();
  await rows(page).nth(0).locator("input").uncheck();
  await expect(page.locator("#tsn")).toHaveText("1 of 10 done");
  await expect(page.locator("#tst")).toHaveText("Continue: Ganapati Aarti");
  // Monday evening: a new day, no ticks
  await page.clock.setFixedTime(new Date("2026-10-19T19:00:00-04:00"));
  await page.reload();
  await settle(page);
  await expect(page.locator("#tdd .d2")).toHaveText("Monday, 19 October 2026");
  await expect(page.locator("#tsl input:checked")).toHaveCount(0);
  await expect(page.locator("#tsn")).toHaveText("0 of 10 done");
});

test("a page left open overnight starts the new day with no ticks", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-18T23:58:00-04:00"), running: true });
  await rows(page).nth(0).locator("input").check();
  await page.clock.runFor("03:00");
  await expect(page.locator("#tdd .d2")).toHaveText("Monday, 19 October 2026");
  await expect(page.locator("#tsh")).toHaveText("सकाळ · Morning");
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
  // reading outside a session (a Library link): Next follows the library again
  await page.locator("#hm").click();
  await page.locator('#jl a[data-go="p1"]').click();
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", "Next: Ganapati Aarti");
});

test("a text's title in the list opens it, in the session", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await rows(page).nth(9).locator("a").click();
  await expect.poll(() => onPiece(page)).toBe("a10");
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", "Next: Today");
});

test("in a session, Next ticks the text as done for today before moving on; Prev doesn't; a tick can still be taken off @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#tst").click();
  await expect.poll(() => onPiece(page)).toBe("a1");
  await page.locator("#asn").click();
  await expect.poll(() => onPiece(page)).toBe("a2");
  // Prev back to the first: the second is not ticked
  await page.locator("#asv").click();
  await expect.poll(() => onPiece(page)).toBe("a1");
  await page.locator("#asn").click();
  await expect.poll(() => onPiece(page)).toBe("a2");
  await page.locator("#asn").click();
  await expect.poll(() => onPiece(page)).toBe("a3");
  await page.goto(page.url().split("#")[0]);
  await settle(page);
  await expect(page.locator("#tsn")).toHaveText("2 of 10 done");
  await expect(rows(page).nth(0).locator("input")).toBeChecked();
  await expect(rows(page).nth(1).locator("input")).toBeChecked();
  await expect(rows(page).nth(2).locator("input")).not.toBeChecked();
  // taking a tick off by hand still works
  await rows(page).nth(1).locator("input").uncheck();
  await expect(page.locator("#tsn")).toHaveText("1 of 10 done");
});

test("Next on the last text of the session ticks it too, then returns to Today @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await page.locator("#tst").click();
  await expect.poll(() => onPiece(page)).toBe("p1");
  await page.locator("#asn").click();
  await expect.poll(() => onPiece(page)).toBe("");
  await expect(page.locator("#tsn")).toHaveText("1 of 1 done");
  await expect(rows(page).nth(0).locator("input")).toBeChecked();
});

test("keyboard: Space ticks, Not this time? and Start are buttons, focus is drawn @mobile", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Safari's default Tab skips buttons");
  await openSite(page, SETUPS.marathi, { now: EVENING });
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
  // Enter on another session shows it
  await other(page, "morning").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#tsh")).toHaveText("सकाळ · Morning");
  await expect(page.locator("#tsh")).toBeFocused();
});

test("each tick, session and Start control has a name and a 44px target @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(rows(page).nth(2).locator("input")).toHaveAccessibleName("Done: Devi Aarti");
  await expect(other(page, "morning")).toHaveAccessibleName("Show Morning");
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("#tso button:not([hidden]), #tsl .ttk, #tsl a, #tst, #shr button:not([hidden]), #iconb")]
      .map((b) => ({ c: b.className || b.id || b.dataset.s, ...b.getBoundingClientRect().toJSON() }))
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
  test(`axe: Home with ticks, ${name} @mobile`, async ({ page }) => {
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

test("Marathi menus: Home speaks Marathi, the titles stay as written", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"], { now: EVENING });
  await expect(page.locator("#tdd .d1")).toHaveText("रविवार, १८ ऑक्टोबर २०२६");
  await expect(page.locator("#tdd .d2")).toHaveText("Sunday, 18 October 2026");
  await expect(page.locator("#tst")).toHaveText("सुरू करा: गणपतीची आरती");
  await expect(page.locator("#tso")).toHaveText("दुसरी वेळ: सकाळ · दुपार", { useInnerText: true });
  await expect(other(page, "morning")).toHaveAccessibleName("दाखवा: सकाळ");
  await expect(rows(page).nth(1).locator(".t1")).toHaveText(TITLE["shendur-lal-chadhayo"].title);
});

test("Kannada letters: the titles in the list are shown in Kannada", async ({ page }) => {
  await openSite(page, SETUPS.kannada, { now: EVENING });
  await expect(rows(page).first().locator(".t1")).toHaveText(/^[ಀ-೿\s]+$/);
  await expect(rows(page).first().locator(".t2")).toHaveText("Ganapati Aarti");
});

test("Home has no date card, week row or contents list: the Library has every text", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  for (const sel of ["#skc", "#skmore", "#skall", "#twk", "#tss", "#tfb", "#cvb", "#home .tocg", "#home a[data-go]"])
    await expect(page.locator(sel), sel).toHaveCount(0);
  await expect(page.locator("#jl .tocg a[data-go]")).toHaveCount(11);
});

test("on a Sankashti day only, one line gives tonight's moonrise and the place @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-28T19:00:00-04:00") });
  await expect(page.locator("#skt")).toBeVisible();
  await expect(page.locator("#skt")).toHaveText(/^Sankashti Chaturthi today · Moonrise \d{1,2}:\d\d pm · Columbus, OH$/);
  // the evening before, nothing
  await page.clock.setFixedTime(new Date("2026-10-27T19:00:00-04:00"));
  await page.reload();
  await settle(page);
  await expect(page.locator("#skt")).toBeHidden();
});

test("Marathi menus: the Sankashti line in Marathi", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"], { now: new Date("2026-10-28T19:00:00-04:00") });
  await expect(page.locator("#skt")).toHaveText(/^संकष्टी चतुर्थी आज · चंद्रोदय .+ · कोलंबस$/);
});

test("the App / Share / QR / Print / Help row sits under the list, at every width", async ({ browser }) => {
  for (const width of [390, 820, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: "block" });
    const page = await context.newPage();
    await openSite(page, SETUPS.marathi, { now: EVENING });
    for (const b of ["#shb", "#qrb", "#prb", "#hlpb"]) await expect(page.locator(b), `${b} ${width}px`).toBeAttached();
    const list = await page.locator("#tsc").boundingBox();
    const row = await page.locator("#shr").boundingBox();
    expect(row.y, `${width}px`).toBeGreaterThanOrEqual(list.y + list.height - 1);
    await context.close();
  }
});

test("on a phone Start stays at the bottom of the screen, clear of the safe area, and never covers the last text @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { now: EVENING });
  const vh = 844;
  const bar = await page.locator("#tsb").boundingBox();
  expect(Math.round(bar.y + bar.height)).toBe(vh);
  // the bottom bar gives way to Start on the home page
  await expect(page.locator("#asc")).toBeHidden();
  // scrolled to the end of the home page, the last text sits above Start
  await page.evaluate(() => {
    const h = document.getElementById("home");
    scrollTo(0, h.offsetTop + h.offsetHeight - innerHeight);
  });
  await page.waitForTimeout(100);
  const last = await rows(page).last().boundingBox();
  const bar2 = await page.locator("#tsb").boundingBox();
  expect(last.y + last.height).toBeLessThanOrEqual(bar2.y + 1);
  // the safe area is added below the button
  const pad = await page.locator("#tsb").evaluate((e) => getComputedStyle(e).paddingBottom);
  expect(pad).toBe("10px");
  expect(await page.evaluate(() => [...document.styleSheets].some((s) => [...s.cssRules].some((r) => /#tsb/.test(r.cssText) && /safe-area-inset-bottom/.test(r.cssText))))).toBe(true);
});

test("on a wide screen Home is one centred column", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 }, serviceWorkers: "block" });
  const page = await context.newPage();
  await openSite(page, SETUPS.marathi, { now: EVENING });
  const h = await page.locator("#home").boundingBox();
  expect(h.width).toBeLessThanOrEqual(560);
  expect(Math.abs(h.x + h.width / 2 - 640)).toBeLessThan(40);
  await expect(page.locator("#rail")).toBeHidden();
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

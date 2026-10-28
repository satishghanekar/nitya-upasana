// Home: the time-of-day picture beside today's
// date, the Morning | Afternoon | Evening switch (a session with nothing set greyed), the session's texts with a tick
// each (a title starts the session there; no Start button: Satish, 2026-10-22), More (App / Share / QR / Help, closed by default) and
// "Another text? Open the Library". Home ends there: the pieces show once a text is opened. On a Sankashti day only,
// one line with moonrise. Every text is in the Library (the book button). These tests run on a fixed routine (TEST_ROUTINE
// in helpers.mjs: Morning = Atharvashirsha, Evening = the ten aartis), so they don't change with Satish's schedule; the
// bundled default (content/routines.json) has its own test below. 15 Oct 2026 is a Thursday, 18 Oct a Sunday, 28 Oct a
// Sankashti (Wednesday).
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openSite, settle, SETUPS, useTestRoutine, TEST_AARTIS, TEST_ROUTINE, TEXT_COUNT, axeScan, axeEveryTheme, noViolations } from "./helpers.mjs";
import { textsFor } from "../js/core/routine.js";

const LIB = JSON.parse(readFileSync(new URL("../content/library.json", import.meta.url), "utf8"));
const TITLE = Object.fromEntries(LIB.texts.map((t) => [t.id, t]));
const AARTIS = TEST_AARTIS;
const MORNING = new Date("2026-10-15T10:00:00-04:00"); // Thursday
const EVENING = new Date("2026-10-18T19:00:00-04:00"); // Sunday

const BUNDLED = JSON.parse(readFileSync(new URL("../content/routines.json", import.meta.url), "utf8"));
const ROUTINE = TEST_ROUTINE;
const rows = (page) => page.locator("#tsl li");
// a session's tab in the Morning | Afternoon | Evening switch; a greyed one is aria-disabled, so it is clicked with force
const tab = (page, s) => page.locator(`#tss-${s}`);
const pickTab = (page, s) => tab(page, s).click({ force: true });
// the texts the default routine gives a session on a weekday (0 Sunday), as Home shows them
const planned = (day, s) => textsFor(ROUTINE, day, s).filter((id) => TITLE[id]);
const hash = (page) => page.evaluate(() => location.hash);
// the piece the reader is on: the lowest one whose top has passed just under the top bar (js/core/apply.js cur())
const onPiece = (page) =>
  page.evaluate(() => {
    let c = "",
      best = -Infinity;
    document.querySelectorAll(".ash").forEach((x) => {
      const top = x.offsetParent !== null ? x.getBoundingClientRect().top : Infinity;
      if (top <= 90 && top > best) {
        best = top;
        c = x.id;
      }
    });
    return c;
  });
// the texts on the reading page, top to bottom
const shown = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#main > .ash")]
      .filter((x) => x.offsetParent !== null)
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
      .map((x) => x.id),
  );

test.beforeEach(async ({ page }, info) => {
  if (!info.title.startsWith("the bundled default")) await useTestRoutine(page);
});

test("the bundled default: Home shows the day's lists from content/routines.json @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  const ids = textsFor(BUNDLED, 4, "morning");
  expect(await rows(page).locator(".t1").allTextContents()).toEqual(ids.map((id) => TITLE[id].title));
  await pickTab(page, "evening");
  expect(await rows(page).locator(".t1").allTextContents()).toEqual(textsFor(BUNDLED, 4, "evening").map((id) => TITLE[id].title));
});

// Every session of the bundled routine, every weekday, read through with Next at a phone's, an upright iPad's and a
// computer's width: the address follows each text in Home's order, and Next after the last goes Home. A title tapped
// last is the text read, however short (the Mantra Pushpanjali ends every morning: on an iPad or a computer the page
// ends before it can reach the top bar, js/core/apply.js aimAt()).
for (const [name, vp] of [["a phone", { width: 390, height: 844 }], ["an upright iPad", { width: 820, height: 1180 }], ["a computer", { width: 1440, height: 900 }]]) {
  test(`the bundled default: every session of the week reads through to Home with Next, on ${name}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(vp);
    // Monday 19 to Sunday 25 October 2026
    for (let d = 19; d <= 25; d++)
      for (const at of ["08:00", "19:00"]) {
        await openSite(page, SETUPS.marathi, { now: new Date(`2026-10-${d}T${at}:00-04:00`) });
        const secs = await page.$$eval("#tsl a.tgo", (as) => as.map((a) => a.getAttribute("href").replace("./", "")));
        const where = `${d} Oct ${at}`;
        expect(secs.length, where).toBeGreaterThan(0);
        // the last title: that text is the one read, and Next goes Home
        await rows(page).last().locator("a.tgo").click();
        await expect.poll(() => hash(page), where).toBe(secs.at(-1));
        await expect(page.locator("#asn"), where).toHaveAttribute("aria-label", "Next: Today");
        await page.locator("#ash").click();
        await expect(page.locator("#tsc")).toBeInViewport();
        // from the first title, Next through the session in Home's order, then Home
        await rows(page).first().locator("a.tgo").click();
        for (const sec of secs) {
          await expect.poll(() => hash(page), where).toBe(sec);
          await page.locator("#asn").evaluate((b) => b.click());
        }
        await expect.poll(() => hash(page), where).toBe("");
        await expect(page.locator("#tsc")).toBeInViewport();
      }
  });
}
// on a computer Home's column stays beside the text: the short last text is the one marked in Home's list
test("the bundled default: on a computer the last text of the morning is marked in Home's list, with Prev going back", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-19T08:00:00-04:00") });
  const ids = textsFor(BUNDLED, 1, "morning");
  await rows(page).last().locator("a.tgo").click();
  await expect(page.locator("#tsl li.now a")).toHaveAttribute("data-t", ids.at(-1));
  await expect(page.locator("#asv")).toHaveAttribute("aria-label", "Prev: " + TITLE[ids.at(-2)].titleEn);
  await page.locator("#asv").evaluate((b) => b.click());
  await expect(page.locator("#tsl li.now a")).toHaveAttribute("data-t", ids.at(-2));
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", "Next: " + TITLE[ids.at(-1)].titleEn);
});

// Leaving a session: Home leaves it, and a session read on an earlier day is not taken up again after a reload
test("Home in the bottom bar or the top bar leaves the session being read @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  for (const home of ["#ash", "#bt"]) {
    await rows(page).nth(1).locator("a.tgo").click();
    await expect(page.locator("html")).toHaveAttribute("data-run", "1");
    await page.locator(home).evaluate((b) => b.click());
    await expect(page.locator("html")).not.toHaveAttribute("data-run", "1");
    expect(await page.evaluate(() => sessionStorage.getItem("nitya-run"))).toBeNull();
  }
});
test("a session read the evening before is not taken up again the next morning; one read past midnight is @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-18T19:00:00-04:00") });
  const sec = (await rows(page).nth(1).locator("a.tgo").getAttribute("href")).replace("./", "");
  await rows(page).nth(1).locator("a.tgo").click();
  await expect(page.locator("html")).toHaveAttribute("data-run", "1");
  // the next morning, the same tab opened again: the text in the address, on its own
  await page.clock.setFixedTime(new Date("2026-10-19T07:00:00-04:00"));
  await page.reload();
  await settle(page);
  await expect(page.locator("html")).not.toHaveAttribute("data-run", "1");
  await expect.poll(() => hash(page)).toBe(sec);
  // an evening session started at 23:30 and still read at 00:30 carries on
  await page.clock.setFixedTime(new Date("2026-10-19T23:30:00-04:00"));
  await page.reload();
  await settle(page);
  await page.locator("#ash").click();
  await pickTab(page, "evening");
  await rows(page).nth(1).locator("a.tgo").click();
  await expect(page.locator("html")).toHaveAttribute("data-run", "1");
  await page.clock.setFixedTime(new Date("2026-10-20T00:30:00-04:00"));
  await page.reload();
  await settle(page);
  await expect(page.locator("html")).toHaveAttribute("data-run", "1");
});

test("in the morning Home shows Thursday's Morning: the Atharvashirsha, with no Start button @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await expect(page.locator("#tsh")).toHaveText("सकाळ · Morning");
  await expect(page.locator("#tdd .d1")).toHaveText("गुरुवार, १५ ऑक्टोबर २०२६");
  await expect(page.locator("#tdd .d2")).toHaveText("Thursday, 15 October 2026");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first().locator(".t1")).toHaveText(TITLE["vedic-chant-atharvashirsha"].title);
  await expect(rows(page).first().locator(".t2")).toHaveText(TITLE["vedic-chant-atharvashirsha"].titleEn);
  await expect(rows(page).first().locator(".ttg")).toHaveText("Sanskrit");
  await expect(page.locator("#tsn")).toHaveText("1 text");
  // no ticks (Satish, 2026-10-22)
  await expect(page.locator("#tsl input, #tsl .ttk")).toHaveCount(0);
  await expect(page.locator("#tst, #tsb")).toHaveCount(0);
  // the picture is the sunrise one, Thursday's star ringed; not a Sankashti, so no moonrise line
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "sunrise");
  await expect(page.locator("#iconb")).toHaveAttribute("data-day", "4");
  await expect(page.locator("#skt")).toBeHidden();
  // the switch opens at Morning; Afternoon has nothing set, so it is greyed (Home v3: no "Not this time?")
  await expect(page.locator("#tso")).toHaveCount(0);
  await expect(tab(page, "morning")).toHaveAttribute("aria-selected", "true");
  await expect(tab(page, "afternoon")).toHaveAttribute("aria-disabled", "true");
  await expect(tab(page, "afternoon")).toContainText("Nothing set");
  await expect(tab(page, "evening")).not.toHaveAttribute("aria-disabled", "true");
});

test("in the evening Home shows Sunday's Evening: the ten aartis in order @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(rows(page)).toHaveCount(10);
  expect(await rows(page).locator(".t1").allTextContents()).toEqual(AARTIS.map((id) => TITLE[id].title));
  expect(await rows(page).locator(".t2").allTextContents()).toEqual(AARTIS.map((id) => TITLE[id].titleEn));
  expect(await rows(page).locator(".tno").allTextContents()).toEqual(["१.", "२.", "३.", "४.", "५.", "६.", "७.", "८.", "९.", "१०."]);
  await expect(page.locator("#tsh")).toHaveText("सायंकाळ · Evening");
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "sunset");
  await expect(tab(page, "evening")).toHaveAttribute("aria-selected", "true");
});

test("the session switch changes the list, the picture and what screen readers hear @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await pickTab(page, "afternoon");
  await expect(page.locator("#tsh")).toHaveText("दुपार · Afternoon");
  await expect(tab(page, "afternoon")).toBeFocused();
  await expect(tab(page, "afternoon")).toHaveAttribute("aria-selected", "true");
  await expect(tab(page, "morning")).toHaveAttribute("aria-selected", "false");
  await expect(page.locator("#tsp")).toHaveAttribute("aria-labelledby", "tss-afternoon");
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator("#tse")).toBeVisible();
  await expect(page.locator("#tse")).toContainText("Nothing is planned for afternoon yet.");
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "midday");
  await expect(page.locator("#tlive")).toContainText("Afternoon");
  await pickTab(page, "evening");
  const n = planned(4, "evening").length;
  await expect(rows(page)).toHaveCount(n);
  await expect(page.locator("#tsn")).toHaveText(`${n} texts`);
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "sunset");
  await expect(page.locator("#tlive")).toContainText(`${n} texts`);
  // the browser tab icon still follows the clock
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute("href", "icon-32.png");
});

test("Home v3: Monday 7:00 and 19:00, Tuesday 14:00 (the clock's session stays picked when empty) @mobile", async ({ page }) => {
  for (const [now, day, s] of [
    ["2026-10-19T07:00:00-04:00", 1, "morning"],
    ["2026-10-19T19:00:00-04:00", 1, "evening"],
    ["2026-10-20T14:00:00-04:00", 2, "afternoon"],
  ]) {
    await page.clock.setFixedTime(new Date(now));
    if (s === "morning") await openSite(page, SETUPS.marathi, { now: new Date(now) });
    else {
      await page.reload();
      await settle(page);
    }
    await expect(tab(page, s), now).toHaveAttribute("aria-selected", "true");
    await expect(tab(page, s)).toHaveAttribute("tabindex", "0");
    for (const x of ["morning", "afternoon", "evening"]) {
      const n = planned(day, x).length;
      if (n) await expect(tab(page, x), `${now} ${x}`).not.toHaveAttribute("aria-disabled", "true");
      else await expect(tab(page, x), `${now} ${x}`).toHaveAttribute("aria-disabled", "true");
      if (x !== s) await expect(tab(page, x)).toHaveAttribute("tabindex", "-1");
    }
    const ids = planned(day, s);
    expect(await rows(page).locator(".t2").allTextContents()).toEqual(ids.map((id) => TITLE[id].titleEn));
    await expect(page.locator("#tse")).toBeVisible({ visible: !ids.length });
    // each session, tapped, shows its texts for that day in place
    for (const x of ["morning", "afternoon", "evening"]) {
      await pickTab(page, x);
      await expect(page.locator("#tsh")).toContainText({ morning: "Morning", afternoon: "Afternoon", evening: "Evening" }[x]);
      expect(await rows(page).locator(".t2").allTextContents()).toEqual(planned(day, x).map((id) => TITLE[id].titleEn));
    }
  }
});


test("a page left open overnight starts the new day at its session", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-18T23:58:00-04:00"), running: true });
  await page.clock.runFor("03:00");
  await expect(page.locator("#tdd .d2")).toHaveText("Monday, 19 October 2026");
  await expect(page.locator("#tsh")).toHaveText("सकाळ · Morning");
});
test("a title opens its text in the session, and Next walks through the session in order @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await rows(page).nth(2).locator("a.tgo").click();
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
  await rows(page).nth(0).locator("a.tgo").click();
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
  const order = LIB.texts.map((t) => t.id);
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", "Next: " + TITLE[order[order.indexOf("vedic-chant-atharvashirsha") + 1]].titleEn);
});

test("a text's title in the list opens it, in the session", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await rows(page).nth(9).locator("a").click();
  await expect.poll(() => onPiece(page)).toBe("a10");
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", "Next: Today");
});

// A session is one scroll (Satish, 2026-10-22): its texts one after another, in session order, and nothing else
test("a session runs on in one scroll, in session order, with only its texts @mobile", async ({ page }) => {
  // a session whose order is not the Library's: the Ganapati aarti (a1) after the Devi aarti (a3)
  await page.route("**/content/routines.json", (r) =>
    r.fulfill({ contentType: "application/json", body: JSON.stringify({ ...ROUTINE, evening: { mode: "fixed", texts: [AARTIS[2], AARTIS[0], AARTIS[1]] } }) }),
  );
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await rows(page).nth(0).locator("a.tgo").click();
  await expect.poll(() => onPiece(page)).toBe("a3");
  await expect.poll(() => shown(page)).toEqual(["a3", "a1", "a2"]);
  // scrolling down reaches the next text without Next
  const y = await page.locator("#a1").evaluate((e) => e.getBoundingClientRect().top + scrollY - 80);
  await page.evaluate((y) => scrollTo(0, y), y);
  await expect.poll(() => onPiece(page)).toBe("a1");
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", "Next: " + TITLE[AARTIS[1]].titleEn);
  await expect(page.locator("#asv")).toHaveAttribute("aria-label", "Prev: " + TITLE[AARTIS[2]].titleEn);
  // scrolling up and down never brings in a text from outside the session
  // (scrollBy, not the mouse wheel: phones' WebKit has no wheel)
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => scrollBy(0, -3000));
    await page.waitForTimeout(100);
    await page.evaluate(() => scrollBy(0, 3000));
    await page.waitForTimeout(100);
  }
  expect(await shown(page)).toEqual(["a3", "a1", "a2"]);
  // a reload in the middle of the session carries on with the whole session in one scroll
  await page.reload();
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-ready"));
  await expect.poll(() => shown(page)).toEqual(["a3", "a1", "a2"]);
});

// The bug Satish found (2026-10-22): ‹ Prev on a session's first text opened the Library's text before it, outside the
// session, and Next then followed the Library
test("‹ Prev on a session's first text goes back to Home, never out of the session @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await rows(page).nth(0).locator("a.tgo").click();
  await expect.poll(() => onPiece(page)).toBe("a1");
  await expect(page.locator("#asv")).toHaveAttribute("aria-label", "Prev: Today");
  await page.locator("#asv").click();
  await expect.poll(() => onPiece(page)).toBe("");
  await expect(page.locator("html")).toHaveAttribute("data-hv", "1");
  await expect(page.locator("html")).not.toHaveAttribute("data-run", "1");
  await expect(page.locator("#tsh")).toBeFocused();
});

test("keyboard: the switch moves with arrow keys, focus is drawn @mobile", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Safari's default Tab skips buttons");
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(page.locator("#tsn")).toHaveText(`${planned(0, "evening").length} texts`);
  // the switch: Tab reaches the session shown; arrow keys move between the three (wrapping), Enter or Space picks
  await tab(page, "evening").focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "morning")).toBeFocused();
  await expect(page.locator("#tsh")).toHaveText("सायंकाळ · Evening");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "afternoon")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(tab(page, "morning")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#tsh")).toHaveText("सकाळ · Morning");
  await expect(tab(page, "morning")).toBeFocused();
  await expect(tab(page, "morning")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await page.keyboard.press(" ");
  await expect(page.locator("#tsh")).toHaveText("सायंकाळ · Evening");
  // the greyed session stays focusable and can be picked
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "afternoon")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#tse")).toBeVisible();
  const ring = await tab(page, "afternoon").evaluate((e) => {
    const s = getComputedStyle(e);
    return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2;
  });
  expect(ring).toBe(true);
});

test("each text and session control has a name and a 44px target @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(page.locator("#tss")).toHaveAttribute("role", "tablist");
  await expect(page.locator("#tss")).toHaveAccessibleName("Session");
  await expect(tab(page, "morning")).toHaveAccessibleName("Morning");
  await expect(tab(page, "afternoon")).toHaveAccessibleName("Afternoon Nothing set");
  await expect(page.locator("#tmb")).toHaveAccessibleName("More");
  await expect(page.locator("#tdp")).toHaveAccessibleName("Previous day");
  await expect(page.locator("#tdx")).toHaveAccessibleName("Next day");
  // another day, so Today › shows too
  await page.locator("#tdx").click();
  await page.locator("#tmb").click();
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("#tss [role=tab], #tmb, #tsl a, #shr button:not([hidden]), #iconb, #tdn button, #tdbb")]
      .filter((b) => b.getClientRects().length) // (Print this text is not shown on Home)
      .map((b) => ({ c: b.className || b.id || b.dataset.s, ...b.getBoundingClientRect().toJSON() }))
      .filter((r) => r.width < 44 || r.height < 44)
      .map((r) => `${r.c} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

// Light is scanned in full, then dark, sepia and high contrast for colour (axeEveryTheme); Marathi menus in full
for (const [name, prefs, themes] of [
  ["light, and every other theme", SETUPS.marathi, true],
  ["Marathi menus", SETUPS["marathi-menus"]],
]) {
  test(`axe: Home, ${name} @mobile`, async ({ page }) => {
    await openSite(page, prefs, { now: EVENING });
    if (themes) expect(await axeEveryTheme(page, "#home")).toEqual(noViolations());
    else expect(await axeScan(page, "#home")).toEqual([]);
  });
}

test("Marathi menus: Home speaks Marathi, the titles stay as written", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"], { now: EVENING });
  await expect(page.locator("#tdd .d1")).toHaveText("रविवार, १८ ऑक्टोबर २०२६");
  await expect(page.locator("#tdd .d2")).toHaveText("Sunday, 18 October 2026");
  await expect(page.locator("#tss")).toHaveAccessibleName("वेळ");
  await expect(tab(page, "morning")).toHaveText("सकाळ");
  await expect(tab(page, "afternoon")).toHaveText("दुपारकाहीच नाही");
  await page.locator("#tmb").click();
  for (const [id, w] of [["#shb", "शेअर"], ["#hlpb", "मदत"]]) await expect(page.locator(id)).toHaveText(w, { useInnerText: true });
  await expect(page.locator("#tsn")).toHaveText("१० रचना");
  await expect(rows(page).nth(1).locator(".t1")).toHaveText(TITLE["aarti-shendur-lal-chadhayo"].title);
});

test("Kannada letters: the titles in the list are shown in Kannada", async ({ page }) => {
  await openSite(page, SETUPS.kannada, { now: EVENING });
  await expect(rows(page).first().locator(".t1")).toHaveText(/^[ಀ-೿\s]+$/);
  await expect(rows(page).first().locator(".t2")).toHaveText("Ganapati Aarti");
});

test("Home has no date card, week row or contents list: the Library has every text", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  for (const sel of ["#skc", "#skmore", "#skall", "#twk", "#tso", "#tfb", "#cvb", "#tmo", "#home #shr", "#home .tocg", "#home a[data-go]"])
    await expect(page.locator(sel), sel).toHaveCount(0);
  // Home ends after the session's texts and the Library line (App, Share, QR and Help are under ⋯ More in the top bar); the reading page's pieces are not shown under it
  await expect(page.locator("html")).toHaveAttribute("data-hv", "1");
  await expect(page.locator("section.ash:visible")).toHaveCount(0);
  await expect(page.locator("#jl .tocg a[data-go]")).toHaveCount(LIB.texts.length);
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

test("a page left open past midnight: the date, the Vedic calendar line and the Sankashti line move on to the new day", async ({ page, browser }) => {
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-27T23:58:00-04:00"), running: true });
  await expect(page.locator("#skt")).toBeHidden();
  const line = (p) => p.locator("#pan").innerText();
  const yesterday = await line(page);
  await page.clock.runFor("04:00");
  await expect(page.locator("#tdd .d2")).toHaveText("Wednesday, 28 October 2026");
  await expect(page.locator("#skt")).toBeVisible();
  // as a page opened now shows them
  const fresh = await browser.newPage();
  await useTestRoutine(fresh);
  await openSite(fresh, SETUPS.marathi, { now: new Date("2026-10-28T00:02:00-04:00") });
  const today = await line(fresh);
  expect(today).not.toEqual(yesterday);
  expect(await line(page)).toEqual(today);
  await expect(page.locator("#skt")).toHaveText(await fresh.locator("#skt").innerText());
  await fresh.close();
});

test("Marathi menus: the Sankashti line in Marathi", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"], { now: new Date("2026-10-28T19:00:00-04:00") });
  await expect(page.locator("#skt")).toHaveText(/^संकष्टी चतुर्थी आज · चंद्रोदय .+ · कोलंबस$/);
});

// ‹ › under the date (Satish, 2026-10-27): Home shows the day before or after, all of it: the date, the Vedic calendar
// line, the lists (the bundled default's differ by weekday), the picture's star; "Showing Friday" and Today › take the
// place of This week. 15 Oct 2026 is a Thursday.
test("the bundled default: ‹ › under the date show another day's date, Vedic calendar line and lists; Today › comes back @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  const titles = () => rows(page).locator(".t2").allTextContents();
  const want = (day, s) => textsFor(BUNDLED, day, s).map((id) => TITLE[id].titleEn);
  await expect(page.locator("#tdr")).toHaveText("Today");
  await expect(page.locator("#tdr")).not.toHaveClass(/on/);
  await expect(page.locator("#tdb")).toBeHidden();
  const week = await page.locator("#upw").isVisible(),
    line = await page.locator("#pan").innerText();
  await page.locator("#tdx").click();
  await expect(page.locator("#tdd .d2")).toHaveText("Friday, 16 October 2026");
  await expect(page.locator("#tdd .d1")).toHaveText("शुक्रवार, १६ ऑक्टोबर २०२६");
  await expect(page.locator("#tdr")).toHaveText("Tomorrow");
  await expect(page.locator("#tdr")).toHaveClass(/on/);
  await expect(page.locator("#tdb")).toBeVisible();
  await expect(page.locator("#tdbt")).toHaveText("Showing Friday");
  await expect(page.locator("#tdbb")).toHaveText("Today ›");
  await expect(page.locator("#upw")).toBeHidden();
  expect(await page.locator("#pan").innerText()).not.toEqual(line);
  expect(await titles()).toEqual(want(5, "morning"));
  await expect(page.locator("#iconb")).toHaveAttribute("data-day", "5");
  await expect(page.locator("#tlive")).toHaveText(`Tomorrow, Morning, Friday: ${want(5, "morning").length} texts`);
  // back two days: yesterday; four more: Sunday, with Shree Rudra
  await page.locator("#tdp").click();
  await page.locator("#tdp").click();
  await expect(page.locator("#tdd .d2")).toHaveText("Wednesday, 14 October 2026");
  await expect(page.locator("#tdr")).toHaveText("Yesterday");
  expect(await titles()).toEqual(want(3, "morning"));
  for (let i = 0; i < 3; i++) await page.locator("#tdp").click();
  await expect(page.locator("#tdd .d2")).toHaveText("Sunday, 11 October 2026");
  await expect(page.locator("#tdr")).toHaveText("4 days ago");
  await expect(page.locator("#tdbt")).toHaveText("Showing Sunday");
  expect(await titles()).toEqual(want(0, "morning"));
  // a session picked stays picked from day to day
  await pickTab(page, "evening");
  expect(await titles()).toEqual(want(0, "evening"));
  await page.locator("#tdx").click();
  await expect(page.locator("#tsh")).toContainText("Evening");
  expect(await titles()).toEqual(want(1, "evening"));
  // Today ›: today again, with focus on the session's heading
  await page.locator("#tdbb").click();
  await expect(page.locator("#tdd .d2")).toHaveText("Thursday, 15 October 2026");
  await expect(page.locator("#tdr")).toHaveText("Today");
  await expect(page.locator("#tdb")).toBeHidden();
  await expect(page.locator("#tsh")).toBeFocused();
  await expect(page.locator("#upw")).toBeVisible({ visible: week });
  expect(await page.locator("#pan").innerText()).toEqual(line);
});

test("the bundled default: another day's session is read with Next in its own order, and Home comes back to that day @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  for (let i = 0; i < 4; i++) await page.locator("#tdp").click();
  await expect(page.locator("#tdd .d2")).toHaveText("Sunday, 11 October 2026");
  const ids = textsFor(BUNDLED, 0, "morning");
  await rows(page).nth(0).locator("a.tgo").click();
  await expect(page.locator("html")).toHaveAttribute("data-run", "1");
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", `Next: ${TITLE[ids[1]].titleEn}`);
  await page.locator("#asn").click();
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", `Next: ${TITLE[ids[2]].titleEn}`);
  await page.locator("#ash").evaluate((b) => b.click());
  await expect(page.locator("#tdd .d2")).toHaveText("Sunday, 11 October 2026");
  await expect(page.locator("#tdb")).toBeVisible();
});

test("the bundled default: Edit on another day opens the routine builder at that day @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await page.locator("#tdx").click();
  await page.locator("#tsed").click();
  await expect(page.locator("#rtb")).toBeVisible();
  await expect(page.locator('#rtwk [aria-checked="true"]')).toHaveAccessibleName(/^Friday/);
});

test("on another day the Sankashti line leaves out today, and the festival line names the day @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-27T19:00:00-04:00") });
  await expect(page.locator("#skt")).toBeHidden();
  await page.locator("#tdx").click();
  await expect(page.locator("#skt")).toBeVisible();
  await expect(page.locator("#skt")).toHaveText(/^Sankashti Chaturthi · Moonrise \d{1,2}:\d\d pm · Columbus, OH$/);
  await page.locator("#tdx").click();
  await expect(page.locator("#skt")).toBeHidden();
  // the first festival within two weeks: named by the day shown, never "Today"
  let n = 2;
  while (!(await page.locator("#fst").isVisible()) && n < 16) {
    await page.locator("#tdx").click();
    n++;
  }
  await expect(page.locator("#fst")).toBeVisible();
  const day = await page.locator("#tdd .d2").innerText();
  await expect(page.locator("#fst")).toHaveText(new RegExp("^" + day.split(",")[0] + ": "));
});

test("Marathi menus: another day in Marathi, and the Sankashti line without आज", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"], { now: new Date("2026-10-27T19:00:00-04:00") });
  await expect(page.locator("#tdr")).toHaveText("आज");
  await page.locator("#tdx").click();
  await expect(page.locator("#tdr")).toHaveText("उद्या");
  await expect(page.locator("#tdbt")).toHaveText("बुधवार पाहत आहात");
  await expect(page.locator("#tdbb")).toHaveText("आज ›");
  await expect(page.locator("#skt")).toHaveText(/^संकष्टी चतुर्थी · चंद्रोदय .+ · कोलंबस$/);
  await expect(page.locator("#tdp")).toHaveAccessibleName("आधीचा दिवस");
});

test("the date opens the calendar at the day Home shows; ‹ › do not open it", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await page.locator("#tdx").click();
  await expect(page.locator("#cal")).toBeHidden();
  await page.locator("#tdd .d1").click();
  await expect(page.locator("#cal")).toBeVisible();
  await expect(page.locator("#cal")).toContainText("Friday, 16 October 2026");
});

test("‹ › go no further than a year from today", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await page.evaluate(() => {
    for (let i = 0; i < 400; i++) document.getElementById("tdx").click();
  });
  await expect(page.locator("#tdx")).toBeDisabled();
  await expect(page.locator("#tdr")).toHaveText("In 366 days");
  await page.locator("#tdbb").click();
  await expect(page.locator("#tdx")).toBeEnabled();
});

test("on another day, Print on Home prints that day's session, its tab named by the day @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#tdx").click();
  await page.locator("#asp").click();
  await expect(page.locator("#prtab-today")).toHaveText("Monday");
  await expect(page.locator("#prtab-today")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('#prtp-today .prses[data-s="evening"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('#prtp-today .prses[data-s="all"] .prsn')).toHaveText("All of Monday");
});

test("a page hidden for over half an hour on another day shows today when it comes back @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MORNING, running: true });
  const away = (hidden) =>
    page.evaluate((h) => {
      Object.defineProperty(document, "hidden", { value: h, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
  await page.locator("#tdx").click();
  // a few minutes away: still Friday
  await away(true);
  await page.clock.runFor("05:00");
  await away(false);
  await expect(page.locator("#tdd .d2")).toHaveText("Friday, 16 October 2026");
  await away(true);
  await page.clock.runFor("31:00");
  await away(false);
  await expect(page.locator("#tdd .d2")).toHaveText("Thursday, 15 October 2026");
  await expect(page.locator("#tdb")).toBeHidden();
});

test("axe: Home on another day, every theme @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-27T19:00:00-04:00") });
  await page.locator("#tdx").click();
  expect(await axeEveryTheme(page, "#home")).toEqual(noViolations());
});

test("⋯ More in the top bar opens App / Share / QR / Help under it, at every width", async ({ browser }) => {
  for (const width of [390, 820, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: "block" });
    const page = await context.newPage();
    await openSite(page, SETUPS.marathi, { now: EVENING });
    // closed by default
    await expect(page.locator("#tmb")).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#tmb")).toHaveAttribute("aria-controls", "shr");
    await expect(page.locator("#shr")).toBeHidden();
    const bar = await page.locator("body > .bar").boundingBox();
    const more = await page.locator("#tmb").boundingBox();
    expect(more.y + more.height, `${width}px: in the top bar`).toBeLessThanOrEqual(bar.y + bar.height + 1);
    expect(more.height).toBeGreaterThanOrEqual(38);
    await page.locator("#tmb").click();
    await expect(page.locator("#tmb")).toHaveAttribute("aria-expanded", "true");
    for (const b of ["#shb", "#qrb", "#hlpb"]) await expect(page.locator(b), `${b} ${width}px`).toBeVisible();
    // under the button, on screen, its right edge at the button's
    const menu = await page.locator("#shr").boundingBox();
    expect(menu.y, `${width}px`).toBeGreaterThanOrEqual(more.y + more.height);
    expect(menu.x, `${width}px`).toBeGreaterThanOrEqual(0);
    expect(Math.abs(menu.x + menu.width - (more.x + more.width)), `${width}px`).toBeLessThanOrEqual(1);
    // the buttons work as before: QR opens its pop-up
    await page.locator("#qrb").click();
    await expect(page.locator("#shr")).toBeHidden();
    await expect(page.locator("#qrm")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.locator("#tmb").click();
    await page.locator("#tmb").click();
    await expect(page.locator("#shr")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
    await context.close();
  }
});

// Home is just the session's texts (Satish, 2026-10-22): no Print this session and no Library line (the Library is the
// top bar's book); Print is in the bottom bar while reading, and prints the session being read
test("Home has no Print this session or Library line; the bottom bar's Print prints the session @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(page.locator("#tspr, #tlib, #tlibb")).toHaveCount(0);
  await expect(page.locator("#hm")).toBeVisible();
  await rows(page).nth(1).locator("a.tgo").click();
  await expect.poll(() => onPiece(page)).toBe("a2");
  await expect(page.locator("#asp")).toBeVisible();
  await expect(page.locator("#asp")).toHaveAccessibleName("Print");
  await page.locator("#asp").click();
  await expect(page.locator("#prm")).toBeVisible();
  await expect(page.locator("#prsum span").first()).toHaveText(`${AARTIS.length} texts`);
});
// on a phone it opens at What, on the Today tab with that session chosen, so another one is a tap away
test("on Home, Print in the bottom bar prints the session Home shows, chosen on the Today tab @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#asp").click();
  await expect(page.locator("#prm")).toBeVisible();
  await expect(page.locator("#prm")).toHaveAttribute("data-step", "what");
  await expect(page.locator("#prtab-today")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('#prtp-today .prses[data-s="evening"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#prsum span").first()).toHaveText(`${AARTIS.length} texts`);
});
// a session left running (the phone's Back to Home leaves it so) does not change that: on Home, Print prints what Home shows
test("on Home, Print prints the session Home shows, not one still being read @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { now: MORNING });
  await rows(page).first().locator("a.tgo").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-hv", "1");
  await page.goBack();
  await expect(page.locator("#tdy")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-run", "1");
  await pickTab(page, "evening");
  await page.locator("#asp").click();
  await expect(page.locator("#prtab-today")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('#prtp-today .prses[data-s="evening"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#prsum span").first()).toHaveText(`${AARTIS.length} texts`);
});
test("Home on its own: the pieces show once a text is opened, and go again on the way home @mobile", async ({ page }) => {
  const errors = [];
  await openSite(page, SETUPS.marathi, { now: EVENING, errors });
  await expect(page.locator("section.ash:visible")).toHaveCount(0);
  // a title in the list opens its text (the reading page, every piece)
  await rows(page).first().locator("a").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-hv", "1");
  await expect.poll(() => onPiece(page)).not.toBe("");
  expect(await page.locator("section.ash:visible").count()).toBeGreaterThan(0);
  // the phone's Back: Home on its own again
  await page.goBack();
  await expect(page.locator("html")).toHaveAttribute("data-hv", "1");
  await expect(page.locator("section.ash:visible")).toHaveCount(0);
  // the Library: a text opens
  await page.locator("#hm").click();
  await page.locator('#jl a[data-go="a5"]').click();
  await expect.poll(() => onPiece(page)).toBe("a5");
  // the top bar's title: Home on its own
  await page.locator("#bt").click();
  await expect(page.locator("html")).toHaveAttribute("data-hv", "1");
  // a link to a piece opens the reading page there
  await page.goto("./#a5");
  await settle(page);
  await expect.poll(() => onPiece(page)).toBe("a5");
  // printing from Home still prints every piece
  await page.locator("#bt").click();
  const pv = await page.evaluate(() => {
    dispatchEvent(new Event("beforeprint"));
    const n = document.querySelectorAll("#pv .pvs").length;
    dispatchEvent(new Event("afterprint"));
    return n;
  });
  expect(pv).toBe(TEXT_COUNT);
  expect(errors).toEqual([]);
});

test("the greyed session's words are at least 4.5:1 on the switch, in every theme @mobile", async ({ browser }) => {
  for (const th of ["light", "dark", "sepia"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    const page = await context.newPage();
    await openSite(page, { ...SETUPS.marathi, th }, { now: EVENING });
    const ratio = await page.evaluate(() => {
      const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
      const lum = (c) => {
        const [r, g, b] = rgb(c).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const fg = getComputedStyle(document.querySelector("#tss-afternoon .tshn")).color,
        bg = getComputedStyle(document.getElementById("tss")).backgroundColor,
        a = lum(fg),
        b = lum(bg);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(ratio, th).toBeGreaterThanOrEqual(4.5);
    await context.close();
  }
});

test("on a phone Home ends with the session's texts, with no Start button; the bottom bar has only Print and Reading @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(page.locator("#tst, #tsb")).toHaveCount(0);
  await expect(page.locator("#asc")).toBeVisible();
  for (const id of ["#asp", "#rsb"]) await expect(page.locator(id)).toBeVisible();
  for (const id of ["#asv", "#ash", "#asq", "#asn"]) await expect(page.locator(id)).toBeHidden();
  // scrolled to the end of the home page, the last text is on screen
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(rows(page).last()).toBeInViewport();
  // a title starts the session there
  await rows(page).nth(1).locator("a.tgo").click();
  await expect.poll(() => onPiece(page)).toBe("a2");
  await expect(page.locator("#asn")).toHaveAttribute("aria-label", "Next: " + TITLE[AARTIS[2]].titleEn);
});

test("on a wide screen Home uses the whole width: today on the left, the picture large beside it (Full screen)", async ({ browser }) => {
  for (const [width, height] of [[1024, 768], [1280, 820], [1920, 1080]]) {
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: "block" });
    const page = await context.newPage();
    await openSite(page, SETUPS.marathi, { now: EVENING });
    const h = await page.locator("#home").boundingBox();
    const edge = width >= 1400 ? 32 : 24;
    expect(Math.abs(h.x - edge), `${width}px left edge`).toBeLessThan(2);
    expect(Math.abs(h.x + h.width - (width - edge)), `${width}px right edge`).toBeLessThan(10);
    const list = await page.locator("#tsc").boundingBox(),
      pic = await page.locator("#iconb").boundingBox();
    expect(pic.x, `${width}px picture beside today`).toBeGreaterThan(list.x + list.width);
    expect(pic.width, `${width}px picture size`).toBeGreaterThanOrEqual(Math.min(400, height - 300));
    expect(pic.y + pic.height, `${width}px picture on screen`).toBeLessThanOrEqual(height);
    // today's date at the top of the left column, above the calendar line; it stays put when the calendar opens
    const date = await page.locator("#tdd").boundingBox(),
      pan = await page.locator("#pan").boundingBox();
    expect(date.x + date.width, `${width}px date on the left`).toBeLessThan(pic.x);
    expect(date.y + date.height, `${width}px date above the calendar line`).toBeLessThanOrEqual(pan.y);
    await page.locator("#panb").click({ position: { x: 12, y: 12 } });
    await expect(page.locator("#cal")).toBeVisible();
    expect((await page.locator("#tdd").boundingBox()).y, `${width}px date stays put`).toBe(date.y);
    expect((await page.locator("#pan").boundingBox()).y, `${width}px calendar line stays put`).toBe(pan.y);
    await expect(page.locator("#rail")).toHaveCount(0);
    await context.close();
  }
});

// Satish, 2026-10-22: on a wide screen a text opened from Home opens on the right, and Home's column stays on the left
// as it is on Home (without the picture), the text being read highlighted; the bottom bar stays the way around
const WIDE = { viewport: { width: 1280, height: 820 }, serviceWorkers: "block" };
const nowRows = (page) => page.locator("#tsl li.now");

test("on a wide screen a text opened from Home opens beside Home's column, with the text being read highlighted", async ({ browser }) => {
  const context = await browser.newContext(WIDE);
  const page = await context.newPage();
  await useTestRoutine(page);
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await expect(nowRows(page)).toHaveCount(0);
  await rows(page).nth(1).locator("a.tgo").click();
  await expect.poll(() => onPiece(page)).toBe("a2");
  // Home's column stays, fixed on the left, without the picture; the text is beside it
  await expect(page.locator("#tsc")).toBeVisible();
  await expect(page.locator("#pan")).toBeVisible();
  // without the picture (it is in the top bar), but with today's date at the top of the card
  await expect(page.locator("#iconb")).toBeHidden();
  await expect(page.locator("#tdd")).toBeVisible();
  expect(await page.locator("#home").evaluate((h) => getComputedStyle(h).position)).toBe("fixed");
  const home = await page.locator("#home").boundingBox(),
    text = await page.locator("#a2 header").boundingBox();
  expect(text.x).toBeGreaterThan(home.x + home.width);
  // the text being read is marked, and only that one
  await expect(nowRows(page)).toHaveCount(1);
  await expect(rows(page).nth(1)).toHaveClass(/\bnow\b/);
  await expect(rows(page).nth(1).locator("a.tgo")).toHaveAttribute("aria-current", "true");
  await expect(page.locator("#tsl a[aria-current]")).toHaveCount(1);
  // the old side menus are gone
  await expect(page.locator("#rail, #rrun")).toHaveCount(0);
  // Next moves the mark
  await page.locator("#asn").click();
  await expect.poll(() => onPiece(page)).toBe("a3");
  await expect(rows(page).nth(2)).toHaveClass(/\bnow\b/);
  await expect(nowRows(page)).toHaveCount(1);
  // scrolling down and back up stays in the session (Home's column is always on screen)
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
  await page.mouse.wheel(0, -2000);
  await page.waitForTimeout(150);
  await expect(page.locator("html")).not.toHaveAttribute("data-hv", "1");
  // (the session runs on in one scroll: scrolling up reaches its earlier texts, and nothing else)
  expect(["a1", "a2", "a3"]).toContain(await onPiece(page));
  // another session only changes the list; the text stays open
  await pickTab(page, "morning");
  await expect(page.locator("#tsh")).toHaveText("सकाळ · Morning");
  await expect(page.locator("html")).not.toHaveAttribute("data-hv", "1");
  expect(["#a1", "#a2", "#a3"]).toContain(await hash(page));
  await expect(nowRows(page)).toHaveCount(0);
  await pickTab(page, "evening");
  // the text on screen is marked again
  await expect(nowRows(page)).toHaveCount(1);
  // Home in the bottom bar brings the picture back, and nothing is marked
  await page.locator("#ash").click();
  await expect(page.locator("html")).toHaveAttribute("data-hv", "1");
  await expect(page.locator("#tdy")).toBeVisible();
  await expect(nowRows(page)).toHaveCount(0);
  await context.close();
});

test("on a wide screen the Library opens beside Home's column, with the bottom bar under it", async ({ browser }) => {
  const context = await browser.newContext(WIDE);
  const page = await context.newPage();
  await useTestRoutine(page);
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await rows(page).nth(0).locator("a.tgo").click();
  await expect.poll(() => onPiece(page)).toBe("a1");
  await page.locator("#hm").click();
  await expect(page.locator("#jump")).toBeVisible();
  // Home's column stays on the left with the text being read marked; the bottom bar stays under the Library
  await expect(page.locator("#tsc")).toBeVisible();
  await expect(rows(page).nth(0)).toHaveClass(/\bnow\b/);
  await expect(page.locator("#asc")).toBeVisible();
  const home = await page.locator("#home").boundingBox(),
    lib = await page.locator("#jump").boundingBox(),
    bar = await page.locator("#asc").boundingBox();
  expect(lib.x).toBeGreaterThanOrEqual(home.x + home.width);
  expect(lib.y + lib.height).toBeLessThanOrEqual(bar.y + 1);
  expect(home.y + home.height).toBeLessThanOrEqual(bar.y + 1);
  // a text from the Library opens on the right; it is not in the session, so nothing is marked
  await page.locator('#jl a[data-go="p1"]').click();
  await expect(page.locator("#jump")).toBeHidden();
  await expect.poll(() => onPiece(page)).toBe("p1");
  await expect(page.locator("#tsc")).toBeVisible();
  await expect(nowRows(page)).toHaveCount(0);
  // the Vedic calendar opens beside it too, with the bottom bar; Next closes it and goes on
  await page.locator("#panb").click({ position: { x: 12, y: 12 } });
  await expect(page.locator("#cal")).toBeVisible();
  await expect(page.locator("#asc")).toBeVisible();
  await page.locator("#asn").click();
  await expect(page.locator("#cal")).toBeHidden();
  await expect.poll(() => onPiece(page)).not.toBe("p1");
  await context.close();
});

test("axe: Home's column beside the text being read, every theme", async ({ browser }) => {
  const context = await browser.newContext(WIDE);
  const page = await context.newPage();
  await useTestRoutine(page);
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await rows(page).nth(1).locator("a.tgo").click();
  await expect(rows(page).nth(1)).toHaveClass(/\bnow\b/);
  expect(await axeEveryTheme(page, "#home")).toEqual(noViolations());
  await context.close();
});

test("with no routine file the card still works and the texts still load", async ({ page }) => {
  await page.route("**/content/routines.json", (r) => r.fulfill({ status: 404, body: "" }));
  const errors = [];
  await openSite(page, SETUPS.marathi, { now: EVENING, errors });
  await expect(page.locator("#tse")).toBeVisible();
  await expect(page.locator('#jl a[data-go="a1"]')).toBeAttached();
  // only the missing file itself is reported, by the browser
  expect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([]);
});

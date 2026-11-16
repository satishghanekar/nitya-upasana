// How long a text or a session takes (js/features/routine-time.js, js/core/timing.js; Satish, 2026-11-15): Home's
// tabs and rows, the routine builder, the Library and the time left while a session is read, all from one place; a
// range until the reader's pace is known, one number once it is picked in Settings → Chanting pace or learned while
// Follow hears them; Forget goes back to the range. Every time is also said in words for screen readers.
import { test, expect } from "@playwright/test";
import { openSite, settingsTab, SETUPS, useTestRoutine } from "./helpers.mjs";

const RANGE = /^\d+–\d+ min$/;
const ONE = /^\d+ min$/;
const tabTime = (page, s) => page.locator(`#tss-${s} .tshn .tmv`);

/** Settings → You → Chanting pace */
async function openPace(page) {
  await page.locator("#aa").click();
  await settingsTab(page, "more");
  await page.locator("#spcrow").scrollIntoViewIfNeeded();
}

test.beforeEach(async ({ page }) => {
  await useTestRoutine(page);
});

test("Home: each session's time under its tab, each text's beside it; a range until the pace is known, in words too @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english);
  await expect(tabTime(page, "morning")).toHaveText(RANGE);
  await expect(tabTime(page, "evening")).toHaveText(RANGE);
  // an empty session says so, with no time
  await expect(page.locator("#tss-afternoon .tshn")).toHaveText("Nothing set");
  // heard as words: "Morning 3 to 5 minutes", never a dash
  await expect(page.locator("#tss-morning")).toHaveAccessibleName(/^Morning \d+ to \d+ minutes$/);
  const rows = page.locator("#tsl li");
  const n = await rows.count();
  expect(n).toBeGreaterThan(0);
  await expect(page.locator("#tsl .ttm")).toHaveCount(n);
  for (let i = 0; i < n; i++) {
    // (a short aarti may round to the same minute at both ends of the range: "1 min")
    await expect(rows.nth(i).locator(".ttm")).toHaveText(/^\d+(–\d+)? min$/);
    await expect(rows.nth(i).locator("a.tgo")).toHaveAccessibleName(/\d+ (to \d+ )?minutes?$/);
  }
});

test("a pace picked in Settings: one number everywhere, kept for the person; Auto goes back to the range @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english);
  await openPace(page);
  const g = page.locator("#spc");
  await expect(g).toHaveAccessibleName("Chanting pace How long texts and sessions take");
  await expect(g.locator('[aria-pressed="true"]')).toHaveText("Auto");
  await expect(page.locator("#spcs")).toContainText("Shown as a range");
  await expect(page.locator("#spcf")).toBeHidden();
  await g.getByRole("button", { name: "Quick" }).click();
  await expect(g.getByRole("button", { name: "Quick" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#spcs")).toHaveText("Times follow the pace picked here.");
  await page.keyboard.press("Escape");
  await expect(tabTime(page, "morning")).toHaveText(ONE);
  await expect(page.locator("#tss-morning")).toHaveAccessibleName(/^Morning about \d+ minutes?$/);
  const quick = await tabTime(page, "evening").textContent();
  // Slow takes longer than Quick
  await openPace(page);
  await g.getByRole("button", { name: "Slow" }).click();
  await page.keyboard.press("Escape");
  const slow = await tabTime(page, "evening").textContent();
  expect(parseInt(slow)).toBeGreaterThan(parseInt(quick));
  // kept for the person
  await page.reload();
  await expect(tabTime(page, "evening")).toHaveText(slow);
  // Auto: the range again
  await openPace(page);
  await g.getByRole("button", { name: "Auto" }).click();
  await page.keyboard.press("Escape");
  await expect(tabTime(page, "evening")).toHaveText(RANGE);
});

test("Auto learns the pace while Follow hears the chanting; Forget goes back to the range @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english);
  // what Follow tells the timing part: a steady stretch through one text, then Follow stopped (js/features/listen.js
  // calls heard() for each place found and heardEnd() on Stop); 3 minutes, 1800 letters: 0.1 s a letter
  await page.evaluate(async () => {
    const t = await import("./js/features/routine-time.js");
    for (let s = 0; s <= 180; s += 10) t.heard("a1", s * 10, s * 1000);
    t.heardEnd();
  });
  await expect(tabTime(page, "morning")).toHaveText(ONE);
  await openPace(page);
  await expect(page.locator("#spc [aria-pressed=true]")).toHaveText("Auto");
  await expect(page.locator("#spcs")).toHaveText("Your own pace, learned from Follow (3 min heard).");
  const forget = page.locator("#spcf");
  await expect(forget).toBeVisible();
  await expect(forget).toHaveAccessibleName("Forget what was learned");
  expect((await forget.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await forget.click();
  // said aloud, the button gone, focus on the pace picked
  await expect(page.locator("#spcl")).toHaveText("Forgotten. Times show as a range again.");
  await expect(forget).toBeHidden();
  await expect(page.locator("#spc [aria-pressed=true]")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(tabTime(page, "morning")).toHaveText(RANGE);
});

test("a little heard is not enough: still a range, and Settings says how much so far @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english);
  await page.evaluate(async () => {
    const t = await import("./js/features/routine-time.js");
    for (let s = 0; s <= 40; s += 10) t.heard("a1", s * 10, s * 1000);
    t.heardEnd();
  });
  await expect(tabTime(page, "morning")).toHaveText(RANGE);
  await openPace(page);
  await expect(page.locator("#spcs")).toContainText("(1 min so far)");
});

test("the Library: each text's time after its language, in the menu language @mobile", async ({ page }) => {
  await openSite(page, { ...SETUPS.english, pace: "quick" });
  await page.locator("#hm").click();
  const rows = page.locator("#jl .tocg:not(.pdfg) ol.toc li");
  const n = await rows.count();
  expect(n).toBeGreaterThan(10);
  await expect(page.locator("#jl .ltm")).toHaveCount(n);
  await expect(rows.first().locator(".ltm .tmv")).toHaveText(ONE);
  await expect(rows.first().locator("a")).toHaveAccessibleName(/about \d+ minutes?$/);
  // Marathi menus: Marathi's words and digits
  await page.keyboard.press("Escape");
  await page.locator("#aa").click();
  await settingsTab(page, "screen");
  await page.locator('#su [data-v="mr"]').click();
  await page.keyboard.press("Escape");
  await page.locator("#hm").click();
  await expect(rows.first().locator(".ltm .tmv")).toHaveText(/^[०-९]+ मि\.$/);
});

test("the routine builder: the session's time, each text's, and every weekday's, a bar as high as its share @mobile", async ({ page }) => {
  await openSite(page, { ...SETUPS.english, pace: "quick" });
  await page.locator("#tsed").click();
  await expect(page.locator("#rtb")).toBeVisible();
  await expect(page.locator("#rtsum")).toHaveText(/^Morning, every day · \d+ texts? · about \d+ min/);
  await expect(page.locator("#rtl .rtm")).toHaveCount(await page.locator("#rtl li").count());
  // a ready-made routine says how long a day takes
  await expect(page.locator("#rtbi")).toContainText(/ · \d+(–\d+)? min a day$/);
  // by weekday: each day its minutes, all sessions, heard with its name; the longest day's bar full
  await page.locator('#rtmd [data-v="weekday"]').click();
  const days = page.locator("#rtwk button");
  await expect(days).toHaveCount(7);
  await expect(days.first()).toHaveAccessibleName(/^Monday \d+, in all about \d+ minutes$/);
  await expect(page.locator("#rtwkh")).toHaveText("Each day's time, all sessions");
  const wk = await days.evaluateAll((bs) => bs.map((b) => Number(getComputedStyle(b.querySelector(".rtdb")).getPropertyValue("--wk"))));
  expect(Math.max(...wk)).toBe(1);
  for (const v of wk) expect(v).toBeGreaterThan(0);
});

test("reading a session: the title says how long is left of it, counting down text by text @mobile", async ({ page }) => {
  await openSite(page, { ...SETUPS.english, pace: "quick" }, { now: new Date("2026-10-19T19:00:00-04:00") });
  await page.locator("#tsl li a.tgo").first().click();
  await expect(page.locator("html")).toHaveAttribute("data-run", "1");
  await page.evaluate(() => scrollBy(0, 400));
  await page.evaluate(() => document.documentElement.removeAttribute("data-tuck"));
  const where = page.locator("#where");
  await expect(where).toBeVisible();
  // (in the small line over the title, so it is never cut off by a long title)
  await expect(page.locator("#wh1 .wh-left")).toHaveText(/^about \d+ min left$/);
  await expect(where).toHaveAccessibleName(/, about \d+ minutes left$/);
  const first = parseInt((await page.locator("#wh1 .wh-left").textContent()).replace(/\D+/g, " ").trim());
  // the next text: less left
  await page.locator("#asn").click();
  await page.evaluate(() => scrollBy(0, 300));
  await page.evaluate(() => document.documentElement.removeAttribute("data-tuck"));
  await expect.poll(async () => parseInt(((await page.locator("#wh1 .wh-left").textContent()) || "").replace(/\D+/g, " ").trim())).toBeLessThan(first);
});

// A session's short text, once its heading is under the top bar: the title is the large line, and the small line over
// it says which text of how many and how long is left (the large line said "Go to · … min left", its title small and
// grey above it, and the time was cut off; Satish, 2026-11-15)
test("in a session the top bar's large line is the text's title, the count and time left above it @mobile", async ({ page }) => {
  await openSite(page, { ...SETUPS.english, pace: "quick" }, { now: new Date("2026-10-19T19:00:00-04:00") });
  await page.locator("#tsl li a.tgo").first().click();
  await page.evaluate(() => scrollBy(0, 400));
  await page.evaluate(() => document.documentElement.removeAttribute("data-tuck"));
  await expect(page.locator("#where")).toBeVisible();
  // (without its number, which the small line gives)
  await expect(page.locator("#wh2")).toHaveText("Sukhkarta Dukhharta");
  await expect(page.locator("#wh1")).toHaveText(/^1 \/ \d+ · about \d+ min left$/);
  await expect(page.locator("#wh2")).not.toContainText("Go to");
  // the small line whole; a long title cut with … where a phone has no room for it, and whole in the spoken name
  expect(await page.locator("#wh1").evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  expect(await page.locator("#wh2 .wh-in").evaluate((e) => getComputedStyle(e).textOverflow)).toBe("ellipsis");
  await expect(page.locator("#where")).toHaveAccessibleName(/Sukhkarta Dukhharta/);
  await expect(page.locator("#where")).toHaveAccessibleName(/^Go to: /);
});

// A long text in a session, at a place in it: the large line is the place, and the small line over it starts with the
// title, without its number, the part that gives way; the count and the time stay whole after it (it said "८ / ८ · 6–9
// min left · ८. …", the title cut off down to its own number; Satish, 2026-11-15)
test("in a session at a place in a long text, the small line starts with the title and keeps the count and time @mobile", async ({ page }) => {
  await page.route("**/content/routines.json", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        short: {
          morning: { mode: "fixed", texts: [] },
          afternoon: { mode: "fixed", texts: [] },
          evening: { mode: "fixed", texts: ["aarti-sukhkarta", "stotra-ram-raksha"] },
        },
      }),
    }),
  );
  await openSite(page, { ...SETUPS.marathi, pace: "quick" }, { now: new Date("2026-10-19T19:00:00-04:00") });
  await page.locator("#tsl li a.tgo").nth(1).click();
  // (to a verse well into the Stotram, a third of the way down, where Go to puts a line)
  await page.evaluate(() => {
    const shown = [...document.querySelectorAll('[data-l^="stotra-ram-raksha."]')].filter((e) => e.getClientRects().length);
    const el = shown[shown.length - 12];
    scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.3);
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => scrollBy(0, 40));
  await page.waitForTimeout(400);
  await page.evaluate(() => document.documentElement.removeAttribute("data-tuck"));
  await expect(page.locator("#wh2 .wh-at")).toBeVisible();
  const parts = page.locator("#wh1 > span:not(.wh-dot)");
  await expect(parts).toHaveCount(3);
  await expect(parts.nth(0)).toHaveClass("wh-in");
  await expect(parts.nth(0)).not.toHaveText(/^\s*[0-9०-९]+\./);
  await expect(parts.nth(1)).toHaveText("२ / २");
  await expect(parts.nth(2)).toHaveText(/^about \d+ min left$/);
  // the count and the time whole, inside the line, whatever the title's length
  const whole = await page.locator("#wh1").evaluate((e) => {
    const box = e.getBoundingClientRect();
    return [...e.querySelectorAll(".wh-n, .wh-left")].every((s) => s.getBoundingClientRect().right <= box.right + 1 && s.scrollWidth <= s.clientWidth + 1);
  });
  expect(whole).toBe(true);
  expect(await parts.nth(0).evaluate((e) => getComputedStyle(e).textOverflow)).toBe("ellipsis");
});

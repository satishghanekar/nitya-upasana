// The Vedic calendar: one line on Home under the date, and the calendar page it opens
// (day card and month), worked out on the phone by js/core/panchang.js. The clock is fixed at Sunday 18 October 2026,
// 7 pm in Columbus (the browser's time zone is America/New_York, whose default place is Columbus, OH).
// Expected values: the panchang engine, checked against the Swiss Ephemeris in tests/unit/panchang.test.mjs.
import { test, expect } from "@playwright/test";
import { openSite, SETUPS, axeScan, axeEveryTheme, noViolations } from "./helpers.mjs";

const NOW = new Date("2026-10-18T19:00:00-04:00");
const COLUMBUS = { ...SETUPS.marathi, loc: { lat: 39.96, lon: -83.0 } };
const open = async (page, prefs = COLUMBUS) => {
  await openSite(page, prefs, { now: NOW });
  await page.locator("#panb").click();
  await expect(page.locator("#cal")).toBeVisible();
  await expect(page.locator("#calm button.cd")).toHaveCount(31);
};
const row = (page, label) => page.locator("#cald dt", { hasText: label }).locator("xpath=following-sibling::dd[1]");

test("Home: the calendar line under the date, with sunrise, sunset and the place @mobile", async ({ page }) => {
  await openSite(page, COLUMBUS, { now: NOW });
  const b = page.locator("#panb");
  await expect(b).toBeVisible();
  await expect(b.locator(".p1")).toHaveText("आश्विन शुद्ध अष्टमी");
  await expect(b.locator(".p2")).toHaveText("नक्षत्र उत्तराषाढा · शके १९४८ · पराभव संवत्सर");
  await expect(b.locator(".p3")).toHaveText(/7:45 am.*6:47 pm.*Columbus, OH/);
  await expect(b).toHaveAccessibleName(
    "आश्विन शुद्ध अष्टमी नक्षत्र उत्तराषाढा · शके १९४८ · पराभव संवत्सर Sunrise 7:45 am Sunset 6:47 pm Columbus, OH (open the Vedic calendar)",
  );
  await expect(b).toHaveAttribute("aria-expanded", "false");
  // it sits between the date and the session's texts (on wide screens the date is under the picture, on the right)
  const y = async (s) => (await page.locator(s).boundingBox()).y;
  if ((page.viewportSize()?.width ?? 0) < 1024) expect(await y("#tdy")).toBeLessThan(await y("#pan"));
  expect(await y("#pan")).toBeLessThan(await y("#tsc"));
  // the month is not worked out until the page opens
  await expect(page.locator("#calm")).toBeEmpty();
});

test("Home: the line in Marathi menus has Devanagari digits and the place's Marathi name", async ({ page }) => {
  await openSite(page, { ...SETUPS["marathi-menus"], loc: { lat: 39.96, lon: -83.0 } }, { now: NOW });
  await expect(page.locator("#panb .p3")).toHaveText(/सकाळी ७:४५.*सायं\. ६:४७.*कोलंबस/);
  await expect(page.locator("#panb")).toHaveAccessibleName(/^आश्विन शुद्ध अष्टमी .*सूर्योदय सकाळी ७:४५ .*\(पंचांग उघडा\)$/);
});

test("the line opens the calendar page; the day card has today's panchang @mobile", async ({ page }) => {
  await open(page);
  await expect(page.locator("#cal")).toHaveAccessibleName("पंचांग Vedic calendar");
  await expect(page.locator("#panb")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#asc")).toBeHidden();
  await expect(page.locator("#cdt")).toHaveText("आश्विन शुद्ध अष्टमी");
  await expect(page.locator("#cald .cdd")).toHaveText("Sunday, 18 October 2026 · today");
  await expect(page.locator("#cald img")).toHaveAttribute("alt", "");
  await expect(row(page, "तिथी")).toHaveText("शुद्ध अष्टमीShukla Ashtami · until Mon 1:21 am");
  await expect(row(page, "नक्षत्र")).toHaveText("उत्तराषाढाUttara Ashadha · until Mon 6:08 am");
  await expect(row(page, "योग")).toHaveText("सुकर्माSukarma · until 2:26 pm");
  await expect(row(page, "वार")).toHaveText("रविवारSunday");
  await expect(row(page, "सूर्योदय")).toHaveText("7:45 amSunset 6:47 pm · Columbus, OH");
  await expect(row(page, "चंद्रोदय")).toHaveText("3:05 pm");
  await expect(row(page, "मास")).toHaveText("आश्विनAshvin (amanta)");
  await expect(row(page, "संवत्सर")).toHaveText("शके १९४८ · पराभव संवत्सरShaka 1948 · Parabhava");
  await expect(row(page, "ऋतु · अयन")).toHaveText("शरद ऋतु · दक्षिणायनSharad · Dakshinayana");
  // no next Sankashti here (Satish, 2026-10-24: Home and the Share message have it)
  await expect(page.locator("#cald .csk")).toHaveCount(0);
  await expect(page.locator("#caln0")).toHaveText("Worked out on this phone for Columbus, OH. Tap a day to see its details.");
});

test("the month: weekdays, tithi at sunrise, paksha shading, moons, Ekadashi, Sankashti, kshaya, today @mobile", async ({ page }) => {
  await open(page);
  await expect(page.locator("#cmt")).toHaveText("October 2026भाद्रपद → आश्विन from 11 Oct");
  await expect(page.locator(".cgr thead th [aria-hidden]")).toHaveText(["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"]);
  // 1 October 2026 is a Thursday: four empty cells first
  await expect(page.locator(".cgr tbody tr").first().locator("td.ce")).toHaveCount(4);
  const day = (d) => page.locator(`#calm button[data-d="2026-10-${String(d).padStart(2, "0")}"]`);
  await expect(day(18).locator(".t")).toHaveText("अष्टमी");
  await expect(day(18)).toHaveAttribute("aria-current", "date");
  await expect(day(18)).toHaveClass(/today/);
  await expect(day(18)).toHaveAttribute("aria-pressed", "true");
  // 25 Oct purnima (full moon), 10 Oct amavasya (new moon)
  await expect(day(25).locator(".t")).toHaveText("पौर्णिमा");
  await expect(day(25).locator(".mn.full")).toHaveCount(1);
  await expect(day(10).locator(".t")).toHaveText("अमावास्या");
  await expect(day(10).locator(".mn.new")).toHaveCount(1);
  await expect(page.locator("#calm .cd .mn")).toHaveCount(2);
  // 28 Oct Sankashti; Ekadashi on 6 and 21 Oct
  await expect(day(28).locator(".f")).toHaveText("संकष्टी");
  await expect(day(6).locator(".f")).toHaveText("एकादशी");
  await expect(day(21).locator(".f")).toHaveText("एकादशी");
  await expect(page.locator("#calm .cd .f")).toHaveCount(3);
  // shukla 11–25, krishna 1–10 and 26–31
  await expect(page.locator(".cgr td.sh")).toHaveCount(15);
  await expect(page.locator(".cgr td.kr")).toHaveCount(16);
  // 30 Oct: vadya panchami at sunrise, and shashthi begins and ends before the next sunrise (kshaya)
  await expect(day(30).locator(".kx")).toHaveText("+षष्ठी");
  await expect(day(30)).toHaveAccessibleName(/30 October, Friday, पंचमी.*Krishna Panchami.*kshaya tithi: Krishna Shashthi/);
  // with Kojagiri Purnima, a festival (content/festivals.json): its short name shows, its full name is heard
  await expect(day(25)).toHaveAccessibleName("25 October, Sunday, पौर्णिमा कोजागिरी , Purnima, Kojagiri Purnima");
  // the key
  await expect(page.locator(".ckey")).toContainText("Shukla paksha");
  await expect(page.locator(".ckey")).toContainText("Krishna paksha");
});

test("tapping a day shows it in the day card @mobile", async ({ page }) => {
  await open(page);
  await page.locator('#calm button[data-d="2026-10-28"]').click();
  await expect(page.locator("#cdt")).toHaveText("आश्विन वद्य तृतीया");
  await expect(page.locator("#cald .cdd")).toHaveText("Wednesday, 28 October 2026");
  await expect(page.locator("#cald .cdg")).toHaveText("संकष्टी");
  await expect(row(page, "चंद्रोदय")).toHaveText("8:09 pm");
  await expect(row(page, "तिथी")).toHaveText("वद्य तृतीयाKrishna Tritiya · until 3:37 pm");
  await expect(page.locator('#calm button[data-d="2026-10-28"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('#calm button[data-d="2026-10-18"]')).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#call")).toHaveText("Showing 28 October: आश्विन वद्य तृतीया");
  // purnima: no paksha in the title
  await page.locator('#calm button[data-d="2026-10-25"]').click();
  await expect(page.locator("#cdt")).toHaveText("आश्विन पौर्णिमा");
  await expect(page.locator("#cald .cdg")).toHaveText("कोजागिरी पौर्णिमा पौर्णिमा");
});

test("previous and next month @mobile", async ({ page }) => {
  await open(page);
  await expect(page.locator("#caln")).toHaveAccessibleName("Next month: November 2026");
  await page.locator("#caln").click();
  await expect(page.locator("#cmt")).toContainText("November 2026");
  await expect(page.locator("#calm button.cd")).toHaveCount(30);
  await expect(page.locator("#caln")).toBeFocused();
  // the card keeps its day; no day of November is today
  await expect(page.locator("#cdt")).toHaveText("आश्विन शुद्ध अष्टमी");
  await expect(page.locator("#calm .cd.today")).toHaveCount(0);
  await expect(page.locator("#calm .cd .mn")).toHaveCount(2);
  await page.locator("#calp").click();
  await page.locator("#calp").click();
  await expect(page.locator("#cmt")).toContainText("September 2026");
  await expect(page.locator("#calm button.cd")).toHaveCount(30);
  await page.locator('#calm button[data-d="2026-09-01"]').click();
  await expect(page.locator("#cald .cdd")).toHaveText("Tuesday, 1 September 2026");
});

test("Back: the page's button and the browser's both close it, and focus returns to the line @mobile", async ({ page }) => {
  await open(page);
  const url = page.url();
  await page.locator("#cbk").click();
  await expect(page.locator("#cal")).toBeHidden();
  await expect(page.locator("#panb")).toBeFocused();
  await expect(page.locator("#panb")).toHaveAttribute("aria-expanded", "false");
  expect(page.url()).toBe(url);
  await page.locator("#panb").click();
  await expect(page.locator("#cal")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#cal")).toBeHidden();
  expect(page.url()).toBe(url);
  await expect(page.locator("#tsc")).toBeVisible();
  await expect(page.locator("#panb")).toBeFocused();
});

test("keyboard: open, move through the month with the arrows, pick a day, Escape", async ({ page }) => {
  await openSite(page, COLUMBUS, { now: NOW });
  await page.locator("#panb").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#cal")).toBeVisible();
  await expect(page.locator("#calm button.cd")).toHaveCount(31);
  // one day in the month is in the Tab order: the day shown
  await expect(page.locator('#calm button.cd[tabindex="0"]')).toHaveCount(1);
  await expect(page.locator('#calm button.cd[tabindex="0"]')).toHaveAttribute("data-d", "2026-10-18");
  await page.locator('#calm button[data-d="2026-10-18"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('#calm button[data-d="2026-10-19"]')).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('#calm button[data-d="2026-10-26"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#cdt")).toHaveText("आश्विन वद्य प्रतिपदा");
  await expect(page.locator('#calm button[data-d="2026-10-26"]')).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('#calm button[data-d="2026-11-02"]')).toBeFocused();
  await expect(page.locator("#cmt")).toContainText("November 2026");
  await page.keyboard.press("PageUp");
  await expect(page.locator('#calm button[data-d="2026-10-02"]')).toBeFocused();
  await page.keyboard.press(" ");
  await expect(page.locator("#cald .cdd")).toHaveText("Friday, 2 October 2026");
  await page.keyboard.press("Escape");
  await expect(page.locator("#cal")).toBeHidden();
  await expect(page.locator("#panb")).toBeFocused();
});

test("Marathi menus: the page's words and digits are Marathi", async ({ page }) => {
  await open(page, { ...SETUPS["marathi-menus"], loc: { lat: 39.96, lon: -83.0 } });
  await expect(page.locator("#cbk .mr")).toBeVisible();
  await expect(page.locator("#cbk .en")).toBeHidden();
  await expect(page.locator("#cbk")).toHaveAccessibleName("मागे");
  await expect(page.locator("#cmt")).toHaveText("ऑक्टोबर २०२६भाद्रपद → आश्विन (११ ऑक्टोबरपासून)");
  // the second reading language (English) is the small line, with the menus' words
  await expect(row(page, "तिथी")).toHaveText("शुद्ध अष्टमीShukla Ashtami · सोमवारी रात्री १:२१ पर्यंत");
  await expect(row(page, "सूर्योदय")).toHaveText("सकाळी ७:४५सूर्यास्त सायं. ६:४७ · कोलंबस");
  await expect(page.locator('#calm button[data-d="2026-10-25"] b')).toHaveText("२५");
});

test("targets: the page's buttons are 44px; days are at least 24px wide even on the smallest phones @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const sizes = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll("#cal button, #panb")].map((b) => {
        const r = b.getBoundingClientRect();
        return { id: b.id || b.dataset.d, w: r.width, h: r.height };
      }),
    );
  for (const s of await sizes()) {
    expect(s.h, s.id).toBeGreaterThanOrEqual(44);
    expect(s.w, s.id).toBeGreaterThanOrEqual(43.5);
  }
  await page.setViewportSize({ width: 320, height: 640 });
  for (const s of await sizes()) {
    expect(s.h, s.id).toBeGreaterThanOrEqual(44);
    expect(s.w, s.id).toBeGreaterThanOrEqual(24);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("desktop: the month, then the day card beside it, the month the larger (Desktop B, Full screen)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await open(page);
  const a = await page.locator("#calm").boundingBox(),
    b = await page.locator("#cald").boundingBox();
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  expect(a.x + a.width).toBeLessThan(b.x);
  expect(a.width).toBeGreaterThan(b.width);
  // tithi names stay whole words: no day is taller than its row's tallest by a letter-per-line wrap
  const cells = await page.locator("#calm .cd").evaluateAll((d) => d.map((x) => x.getBoundingClientRect().width));
  expect(Math.min(...cells)).toBeGreaterThan(50);
});

// ----- the reading languages (Settings → Languages): the names follow the first, and the second where there is room -----

const AT = (prefs) => ({ ...prefs, loc: { lat: 39.96, lon: -83.0 } });
const ENGLISH_ONLY = AT({ lang: "en", lead: "en", l2: "", ui: "en" });
const ENGLISH_MARATHI = AT({ lang: "both", lead: "en", l2: "mr", ui: "en" });
const MARATHI_ONLY = AT({ lang: "mr", lead: "mr", l2: "", ui: "en" });
const KANNADA = AT(SETUPS.kannada);
const ENGLISH_IAST = AT({ lang: "en", lead: "en", l2: "", ui: "en", tr: "iast" });
const DEVANAGARI = /[\u0900-\u097F]/;
const day = (page, d) => page.locator(`#calm button[data-d="2026-10-${String(d).padStart(2, "0")}"]`);

test("English first, no second: Home and the calendar are all in English, with Latin digits @mobile", async ({ page }) => {
  await openSite(page, ENGLISH_ONLY, { now: NOW });
  const b = page.locator("#panb");
  await expect(b.locator(".p1")).toHaveText("Ashvin Shukla Ashtami");
  await expect(b.locator(".p1")).toHaveAttribute("lang", "en");
  await expect(b.locator(".p2")).toHaveText("Nakshatra Uttara Ashadha · Shaka 1948 · Parabhava");
  await expect(b).toHaveAccessibleName(
    "Ashvin Shukla Ashtami Nakshatra Uttara Ashadha · Shaka 1948 · Parabhava Sunrise 7:45 am Sunset 6:47 pm Columbus, OH (open the Vedic calendar)",
  );
  expect(await page.locator("#pan").innerText()).not.toMatch(DEVANAGARI);
  await b.click();
  await expect(page.locator("#calm button.cd")).toHaveCount(31);
  await expect(page.locator("#cdt")).toHaveText("Ashvin Shukla Ashtami");
  await expect(row(page, "Tithi")).toHaveText("Shukla Ashtamiuntil Mon 1:21 am");
  await expect(row(page, "Nakshatra")).toHaveText("Uttara Ashadhauntil Mon 6:08 am");
  await expect(row(page, "Yoga")).toHaveText("Sukarmauntil 2:26 pm");
  await expect(row(page, "Weekday")).toHaveText("Sunday");
  await expect(row(page, "Sunrise")).toHaveText("7:45 amSunset 6:47 pm · Columbus, OH");
  await expect(row(page, "Moonrise")).toHaveText("3:05 pm");
  await expect(row(page, "Month")).toHaveText("Ashvinamanta");
  await expect(row(page, "Samvatsara")).toHaveText("Shaka 1948 · Parabhava");
  await expect(row(page, "Ritu · Ayana")).toHaveText("Sharad · Dakshinayana");
  await expect(page.locator("#cmt")).toHaveText("October 2026Bhadrapad → Ashvin from 11 Oct");
  await expect(page.locator(".cgr thead th [aria-hidden]")).toHaveText(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  await expect(day(page, 18).locator(".t")).toHaveText("Ashtami");
  await expect(day(page, 25).locator(".t")).toHaveText("Purnima");
  await expect(day(page, 10).locator(".t")).toHaveText("Amavasya");
  await expect(day(page, 25).locator("b")).toHaveText("25");
  await expect(day(page, 28).locator(".f")).toHaveText("Sankashti");
  await expect(day(page, 6).locator(".f")).toHaveText("Ekadashi");
  await expect(day(page, 30).locator(".kx")).toHaveText("+Shashthi");
  await expect(day(page, 30)).toHaveAccessibleName(/^30 October, Friday, Panchami \+Shashthi , Krishna Panchami, kshaya tithi: Krishna Shashthi$/);
  // nothing in Devanagari but the page's bilingual name (पंचांग · Vedic calendar)
  expect(await page.locator("#cald").innerText()).not.toMatch(DEVANAGARI);
  expect(await page.locator("#calm").innerText()).not.toMatch(DEVANAGARI);
  // a long name fits its day (it may break before its last part), and nothing scrolls sideways at 320px
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#calm button[data-d="2026-10-28"]').click();
  await expect(page.locator("#cdt")).toHaveText("Ashvin Krishna Tritiya");
  await expect(page.locator("#cald .cdg")).toHaveText("Sankashti");
  await expect(page.locator("#call")).toHaveText("Showing 28 October: Ashvin Krishna Tritiya");
});

test("Marathi first, English second: Marathi names, English as the day card's small lines @mobile", async ({ page }) => {
  await openSite(page, COLUMBUS, { now: NOW });
  // the Home line has the first language only
  await expect(page.locator("#panb .p1")).toHaveText("आश्विन शुद्ध अष्टमी");
  await expect(page.locator("#panb .p2")).toHaveText("नक्षत्र उत्तराषाढा · शके १९४८ · पराभव संवत्सर");
  await page.locator("#panb").click();
  await expect(page.locator("#calm button.cd")).toHaveCount(31);
  await expect(row(page, "तिथी").locator("small [lang=en]")).toHaveText("Shukla Ashtami");
  await expect(row(page, "वार")).toHaveText("रविवारSunday");
  await expect(row(page, "मास")).toHaveText("आश्विनAshvin (amanta)");
  // the month's days have the first language only
  await expect(page.locator(".cgr thead th [aria-hidden]").first()).toHaveText("रवि");
  await expect(day(page, 18).locator(".t")).toHaveText("अष्टमी");
  await expect(day(page, 18).locator(".t")).toHaveAttribute("lang", "mr");
});

test("English first, Marathi second: English names, Marathi as the day card's small lines @mobile", async ({ page }) => {
  await openSite(page, ENGLISH_MARATHI, { now: NOW });
  await expect(page.locator("#panb .p1")).toHaveText("Ashvin Shukla Ashtami");
  await expect(page.locator("#panb .p2")).toHaveText("Nakshatra Uttara Ashadha · Shaka 1948 · Parabhava");
  await page.locator("#panb").click();
  await expect(page.locator("#calm button.cd")).toHaveCount(31);
  await expect(page.locator("#cdt")).toHaveText("Ashvin Shukla Ashtami");
  await expect(row(page, "Tithi")).toHaveText("Shukla Ashtamiशुद्ध अष्टमी · until Mon 1:21 am");
  await expect(row(page, "Tithi").locator("small [lang=mr]")).toHaveText("शुद्ध अष्टमी");
  await expect(row(page, "Nakshatra")).toHaveText("Uttara Ashadhaउत्तराषाढा · until Mon 6:08 am");
  await expect(row(page, "Weekday")).toHaveText("Sundayरविवार");
  await expect(row(page, "Month")).toHaveText("Ashvinआश्विन (amanta)");
  await expect(row(page, "Samvatsara")).toHaveText("Shaka 1948 · Parabhavaशके १९४८ · पराभव संवत्सर");
  await expect(row(page, "Ritu · Ayana")).toHaveText("Sharad · Dakshinayanaशरद ऋतु · दक्षिणायन");
  await expect(page.locator(".cgr thead th [aria-hidden]").first()).toHaveText("Sun");
  await expect(day(page, 18).locator(".t")).toHaveText("Ashtami");
  await page.locator('#calm button[data-d="2026-10-30"]').click();
  await expect(row(page, "Tithi")).toContainText("kshaya tithi: वद्य षष्ठी");
});

test("Marathi first, no second: Marathi names without English lines @mobile", async ({ page }) => {
  await openSite(page, MARATHI_ONLY, { now: NOW });
  await expect(page.locator("#panb .p1")).toHaveText("आश्विन शुद्ध अष्टमी");
  await expect(page.locator("#panb .p2")).toHaveText("नक्षत्र उत्तराषाढा · शके १९४८ · पराभव संवत्सर");
  await page.locator("#panb").click();
  await expect(page.locator("#calm button.cd")).toHaveCount(31);
  await expect(page.locator("#cdt")).toHaveText("आश्विन शुद्ध अष्टमी");
  await expect(row(page, "तिथी")).toHaveText("शुद्ध अष्टमीuntil Mon 1:21 am");
  await expect(row(page, "वार")).toHaveText("रविवार");
  await expect(row(page, "संवत्सर")).toHaveText("शके १९४८ · पराभव संवत्सर");
  await expect(day(page, 18).locator(".t")).toHaveText("अष्टमी");
});

test("Kannada letters: the Marathi names in Kannada script @mobile", async ({ page }) => {
  await openSite(page, KANNADA, { now: NOW });
  await expect(page.locator("#panb .p1")).toHaveAttribute("lang", "kn");
  await expect(page.locator("#panb .p1")).toHaveText(/^[\u0C80-\u0CFF ]+$/);
  await page.locator("#panb").click();
  await expect(page.locator("#calm button.cd")).toHaveCount(31);
  await expect(page.locator("#cdt")).toHaveText(/^[\u0C80-\u0CFF ]+$/);
  await expect(day(page, 18).locator(".t")).toHaveText(/^[\u0C80-\u0CFF]+$/);
  await expect(page.locator(".cgr thead th [aria-hidden]").first()).toHaveAttribute("lang", "kn");
  // the second language, English, is the small line
  await expect(page.locator("#cald dd small [lang=en]").first()).toHaveText("Shukla Ashtami");
});

test("English first in the scholarly style: the names in IAST @mobile", async ({ page }) => {
  await openSite(page, ENGLISH_IAST, { now: NOW });
  await expect(page.locator("#panb .p1")).toHaveText("Āśvina Śukla Aṣṭamī");
  await expect(page.locator("#panb .p2")).toHaveText("Nakṣatra Uttarāṣāḍhā · Śaka 1948 · Parābhava");
  await page.locator("#panb").click();
  await expect(page.locator("#calm button.cd")).toHaveCount(31);
  await expect(day(page, 18).locator(".t")).toHaveText("Aṣṭamī");
  await expect(page.locator(".cgr thead th [aria-hidden]").first()).toHaveText("Sun");
});

test("changing the first language in Settings re-draws the Home line", async ({ page }) => {
  await openSite(page, COLUMBUS, { now: NOW });
  await expect(page.locator("#panb .p1")).toHaveText("आश्विन शुद्ध अष्टमी");
  await page.locator("#aa").click();
  await page.locator("#sl1s").selectOption("en:simple");
  await page.locator("#xc").click();
  await expect(page.locator("#panb .p1")).toHaveText("Ashvin Shukla Ashtami");
  await page.locator("#panb").click();
  await expect(page.locator("#cdt")).toHaveText("Ashvin Shukla Ashtami");
  await expect(row(page, "Tithi")).toHaveText("Shukla Ashtamiशुद्ध अष्टमी · until Mon 1:21 am");
});

// Festivals (content/festivals.json, js/core/festivals.js): in Columbus the engine keeps Dasara on 20 October 2026
// (dashami from 3:20 am on the 20th to 4:41 am on the 21st EDT: the afternoon of the 20th) and Kojagiri on the 25th
// (tests/unit/festivals.test.mjs).
const DASARA = new Date("2026-10-20T08:00:00-04:00");
test("festivals: दसरा on 20 October in the month, a tag and a row in the day card @mobile", async ({ page }) => {
  await open(page);
  const day = (d) => page.locator(`#calm button[data-d="2026-10-${String(d).padStart(2, "0")}"]`);
  await expect(day(20).locator(".fs")).toHaveText("दसरा");
  await expect(day(11).locator(".fs")).toHaveText("नवरात्र"); // घटस्थापना: Navratri begins
  await expect(day(25).locator(".fs")).toHaveText("कोजागिरी");
  await expect(page.locator("#calm .cd .fs")).toHaveCount(3);
  await expect(day(20)).toHaveAccessibleName("20 October, Tuesday, दशमी दसरा , Shukla Dashami, Dasara (Vijayadashami)");
  await day(20).click();
  await expect(page.locator("#cald .cdg")).toHaveText("दसरा");
  await expect(page.locator("#cald .cdg .tag.fest")).toHaveCount(1);
  await expect(row(page, "सण")).toHaveText("दसराDasara (Vijayadashami)");
  // an ordinary day has no festival row
  await day(19).click();
  await expect(page.locator("#cald dt", { hasText: "सण" })).toHaveCount(0);
});

test("festivals: Home says आज दसरा on the day only @mobile", async ({ page }) => {
  await openSite(page, COLUMBUS, { now: DASARA });
  await expect(page.locator("#panb .p1")).toHaveText("आश्विन शुद्ध दशमी");
  const f = page.locator("#fst");
  await expect(f).toBeVisible();
  await expect(f).toHaveText("Today: दसरा · Dasara (Vijayadashami)");
  // it sits under the calendar line, above the session's texts
  const y = async (s) => (await page.locator(s).boundingBox()).y;
  expect(await y("#pan")).toBeLessThan(await y("#fst"));
  expect(await y("#fst")).toBeLessThan(await y("#tsc"));
});

test("festivals: Marathi only says आज दसरा; no line the day before or after", async ({ browser }) => {
  for (const [now, shown] of [
    [DASARA, true],
    [new Date("2026-10-19T20:00:00-04:00"), false],
    [new Date("2026-10-21T08:00:00-04:00"), false],
  ]) {
    const page = await browser.newPage();
    await openSite(page, { ...SETUPS["marathi-menus"], l2: "", loc: { lat: 39.96, lon: -83.0 } }, { now });
    await expect(page.locator("#panb")).toBeVisible();
    if (shown) await expect(page.locator("#fst")).toHaveText("आज दसरा");
    else await expect(page.locator("#fst")).toBeHidden();
    await page.close();
  }
});

test("axe: the festival line on Home and Dasara in the calendar @mobile", async ({ page }) => {
  await openSite(page, COLUMBUS, { now: DASARA });
  await expect(page.locator("#fst")).toBeVisible();
  expect(await axeScan(page, ["#fst", "#pan"], { mismatch: true })).toEqual([]);
  await page.locator("#panb").click();
  await expect(page.locator("#calm button.cd")).toHaveCount(31);
  expect(await axeScan(page, "#cal", { mismatch: true })).toEqual([]);
});

test("festivals in English only: Home says Today: Dasara, the month and the day card have no Devanagari @mobile", async ({ page }) => {
  await openSite(page, ENGLISH_ONLY, { now: DASARA });
  const f = page.locator("#fst");
  await expect(f).toHaveText("Today: Dasara (Vijayadashami)");
  expect(await f.innerText()).not.toMatch(DEVANAGARI);
  await page.locator("#panb").click();
  await expect(page.locator("#calm button.cd")).toHaveCount(31);
  await expect(day(page, 20).locator(".fs")).toHaveText("Dasara");
  await expect(day(page, 20).locator(".fs")).toHaveAttribute("lang", "en");
  await expect(day(page, 11).locator(".fs")).toHaveText("Navratri");
  await expect(day(page, 25).locator(".fs")).toHaveText("Kojagiri");
  await expect(page.locator("#cald .cdg .tag.fest")).toHaveText("Dasara (Vijayadashami)");
  await expect(row(page, "Festival")).toHaveText("Dasara (Vijayadashami)");
  expect(await page.locator("#cald .cdg").innerText()).not.toMatch(DEVANAGARI);
  expect(await page.locator("#calm .fs").allInnerTexts()).not.toContainEqual(expect.stringMatching(DEVANAGARI));
});

test("festivals in Marathi only: आज दसरा, and no English line in the day card", async ({ page }) => {
  await openSite(page, { ...SETUPS["marathi-menus"], lead: "mr", l2: "", loc: { lat: 39.96, lon: -83.0 } }, { now: DASARA });
  await expect(page.locator("#fst")).toHaveText("आज दसरा");
  await page.locator("#panb").click();
  await expect(row(page, "सण")).toHaveText("दसरा");
});

// Light is scanned in full, then dark, sepia and high contrast for colour (axeEveryTheme); each language set-up in full
for (const [name, prefs, themes] of [
  ["light", COLUMBUS, true],
  ["Marathi menus", { ...SETUPS["marathi-menus"], loc: { lat: 39.96, lon: -83.0 } }],
  ["English only", ENGLISH_ONLY],
  ["English and Marathi", ENGLISH_MARATHI],
  ["Kannada letters", KANNADA],
]) {
  test(`axe: the calendar line and page, ${name}${themes ? ", and every other theme" : ""} @mobile`, async ({ page }) => {
    const scan = async (sel) => (themes ? axeEveryTheme(page, sel, { mismatch: true }) : axeScan(page, sel, { mismatch: true }));
    const ok = themes ? noViolations() : [];
    await openSite(page, prefs, { now: NOW });
    expect(await scan("#pan")).toEqual(ok);
    await page.locator("#panb").click();
    await expect(page.locator("#calm button.cd")).toHaveCount(31);
    await page.locator('#calm button[data-d="2026-10-28"]').click();
    expect(await scan("#cal")).toEqual(ok);
  });
}

// Visual regression: screenshots compared pixel by pixel with the ones recorded before the refactor.
// A curated set (not every combination) chosen so that every CSS section is on at least one shot:
// the home page, the Library, the calendar, a piece with its dhrupad, two columns, the side menu, Settings, search,
// Help, the dialogs, every theme and every language arrangement, on phones (upright and sideways), iPads (both ways),
// desktops and 2K / 4K monitors.
// Recorded in Chromium; the site's fonts are its own files, so shots are the same on any Linux machine.
import { test, expect } from "@playwright/test";
import { openSite, settle, SETUPS, readText, tapMore } from "./helpers.mjs";
import { printFromButton } from "./print-helpers.mjs";

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  small: { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
  "phone-land": { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true },
  "tablet-land": { viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 } },
  wide: { viewport: { width: 2560, height: 1440 } },
  "4k": { viewport: { width: 3840, height: 2160 } },
};

async function shoot(browser, name, size, prefs, prepare, now) {
  const context = await browser.newContext({ ...SIZES[size], deviceScaleFactor: 1, serviceWorkers: "block", reducedMotion: "reduce" });
  const page = await context.newPage();
  await openSite(page, prefs, now ? { now } : {});
  if (prepare) {
    await prepare(page);
    await settle(page);
  }
  await expect(page).toHaveScreenshot(`${name}.png`);
  await context.close();
}

// Home shows only what to chant now: a text is opened from the Library, then scrolled to just below its title
const goTo = (id) => async (page) => {
  await readText(page, id);
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    scrollTo(0, el.getBoundingClientRect().top + scrollY - 60);
  }, id);
  await page.waitForTimeout(300);
};
const calendar = (p) => p.locator("#panb").click();

const CASES = [
  // home page at every size
  ["home-phone", "phone", SETUPS.marathi],
  ["home-small", "small", SETUPS.marathi],
  ["home-tablet", "tablet", SETUPS.marathi],
  ["home-desktop", "desktop", SETUPS.marathi],
  ["home-wide", "wide", SETUPS.marathi],
  ["home-4k", "4k", SETUPS.marathi],
  ["home-phone-land", "phone-land", SETUPS.marathi],
  ["home-tablet-land", "tablet-land", SETUPS.marathi],
  ["home-sankashti-phone", "phone", SETUPS.marathi, null, new Date("2026-10-28T19:00:00-04:00")],
  ["home-marathi-menus", "phone", SETUPS["marathi-menus"]],
  // a piece in every language arrangement
  ["aarti-marathi-phone", "phone", SETUPS.marathi, goTo("a1")],
  ["aarti-english-phone", "phone", SETUPS.english, goTo("a1")],
  ["aarti-both-phone", "phone", SETUPS.both, goTo("a1")],
  ["aarti-iast-phone", "phone", SETUPS["both-iast"], goTo("a1")],
  ["aarti-english-main-phone", "phone", SETUPS["english-main-both"], goTo("a1")],
  ["aarti-kannada-phone", "phone", SETUPS["kannada-both"], goTo("a1")],
  ["aarti-every-verse-phone", "phone", SETUPS["marathi-every-verse"], goTo("a1")],
  ["atharvashirsha-phone", "phone", SETUPS.marathi, goTo("p1")],
  ["atharvashirsha-iast-phone", "phone", SETUPS["english-iast"], goTo("p1")],
  ["aarti-small", "small", SETUPS.both, goTo("a3")],
  // wide screens: two columns and the side menu
  ["aarti-tablet", "tablet", SETUPS.marathi, goTo("a1")],
  ["aarti-desktop", "desktop", SETUPS.marathi, goTo("a1")],
  ["aarti-both-desktop", "desktop", SETUPS.both, goTo("a1")],
  ["aarti-one-column-desktop", "desktop", { ...SETUPS.marathi, cols: 1 }, goTo("a4")],
  ["aarti-wide", "wide", SETUPS.both, goTo("a5")],
  // themes and contrast
  ["aarti-dark", "phone", { ...SETUPS.marathi, th: "dark" }, goTo("a1")],
  ["aarti-sepia", "phone", { ...SETUPS.marathi, th: "sepia" }, goTo("a1")],
  ["aarti-high-contrast", "phone", { ...SETUPS.marathi, hc: 1 }, goTo("a1")],
  ["home-dark", "phone", { ...SETUPS.marathi, th: "dark" }],
  ["home-sepia-desktop", "desktop", { ...SETUPS.marathi, th: "sepia" }],
  // text fonts (Traditional, the default, is in every other screenshot)
  ["font-modern", "phone", { ...SETUPS.both, fnt: "std" }, goTo("a1")],
  ["font-bold", "phone", { ...SETUPS.both, fnt: "bold" }, goTo("a1")],
  ["font-vedic-traditional", "phone", { ...SETUPS.marathi }, goTo("p1")],
  ["font-vedic-modern", "phone", { ...SETUPS.marathi, fnt: "std" }, goTo("p1")],
  ["font-vedic-bold", "phone", { ...SETUPS.marathi, fnt: "bold" }, goTo("p1")],
  // folds: a folded text shows only its title
  ["folded-sections", "phone", { ...SETUPS.marathi, af: ["a1", "a2"] }, goTo("a1")],
  // overlays
  ["settings-phone", "phone", SETUPS.marathi, (p) => p.locator("#aa").click()],
  ["settings-desktop", "desktop", SETUPS.marathi, (p) => p.locator("#aa").click()],
  ["settings-tablet", "tablet", SETUPS.marathi, (p) => p.locator("#aa").click()],
  ["settings-dark", "phone", { ...SETUPS.marathi, th: "dark" }, (p) => p.locator("#aa").click()],
  ["search-phone", "phone", SETUPS.marathi, async (p) => {
    await p.locator("#hm").click();
    await p.locator("#q").fill("sukh");
  }],
  ["library-phone", "phone", SETUPS.marathi, (p) => p.locator("#hm").click()],
  ["library-desktop", "desktop", SETUPS.marathi, (p) => p.locator("#hm").click()],
  ["library-tablet", "tablet", SETUPS.marathi, (p) => p.locator("#hm").click()],
  ["library-tablet-land", "tablet-land", SETUPS.marathi, (p) => p.locator("#hm").click()],
  // the Vedic calendar
  ["calendar-phone", "phone", SETUPS.marathi, calendar],
  ["calendar-tablet", "tablet", SETUPS.marathi, calendar],
  ["calendar-desktop", "desktop", SETUPS.marathi, calendar],
  ["calendar-wide", "wide", SETUPS.marathi, calendar],
  ["help-phone", "phone", SETUPS.marathi, (p) => tapMore(p, "#hlpb")],
  ["qr-phone", "phone", SETUPS.marathi, (p) => tapMore(p, "#qrb")],
  // the print builder: What (with each text's pages, once laid out), How, and both side by side on a computer
  ["print-dialog", "phone", SETUPS.marathi, printBuilder],
  ["print-how-phone", "phone", SETUPS.marathi, async (p) => (await printBuilder(p), p.locator("#prnx").click())],
  ["print-builder-desktop", "desktop", SETUPS.marathi, printBuilder],
  // the Routine tab: the default routine, the whole week, each text once with its tag
  ["print-routine-phone", "phone", SETUPS.marathi, async (p) => {
    await printBuilder(p);
    await p.locator("#prtab-routine").click();
    await expect(p.locator(".prrl .prpc").first()).toHaveText(/\d/);
  }],
];

// Print, open at What once the page counts and the first-page preview (with its fonts) are in
async function printBuilder(p) {
  await tapMore(p, "#prb");
  await expect(p.locator("#prsum span").nth(1)).toHaveText(/\d/, { timeout: 20_000 });
  await p.waitForFunction(() => {
    const f = document.querySelector("#prsheet iframe");
    return f && f.contentDocument && f.contentDocument.fonts.status === "loaded";
  }, null, { timeout: 20_000 });
}

for (const [name, size, prefs, prep, now] of CASES) {
  test(`screenshot ${name} @chromium-only`, async ({ browser }) => {
    await shoot(browser, name, size, prefs, prep, now);
  });
}

// The print layout as the printer sees it (first part of each layout: contents and the first piece)
for (const [name, prefs, choice] of [
  ["print-single-column-marathi", SETUPS.marathi, "pr1"],
  ["print-single-column", SETUPS.english, "pr1"],
  ["print-side-by-side", SETUPS.both, "pr2"],
]) {
  test(`screenshot ${name} @chromium-only`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 1, serviceWorkers: "block", locale: "en-US" });
    const page = await context.newPage();
    await page.addInitScript(() => (window.print = () => ((window.__printed = 1), dispatchEvent(new Event("beforeprint")))));
    await openSite(page, prefs);
    await printFromButton(page, choice);
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false, clip: { x: 0, y: 0, width: 816, height: 2112 } });
    await context.close();
  });
}

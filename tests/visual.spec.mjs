// Visual regression: screenshots compared pixel by pixel with the ones recorded before the refactor.
// A curated set (not every combination) chosen so that every CSS section is on at least one shot:
// the home card, contents, a piece with its dhrupad, two columns, the side menu, Settings, search,
// Help, the dialogs, every theme and every language arrangement.
// Recorded in Chromium; the site's fonts are its own files, so shots are the same on any Linux machine.
import { test, expect } from "@playwright/test";
import { openSite, settle, SETUPS } from "./helpers.mjs";
import { printFromButton } from "./print-helpers.mjs";

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  small: { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 } },
  wide: { viewport: { width: 2560, height: 1440 } },
};

async function shoot(browser, name, size, prefs, prepare) {
  const context = await browser.newContext({ ...SIZES[size], deviceScaleFactor: 1, serviceWorkers: "block", reducedMotion: "reduce" });
  const page = await context.newPage();
  await openSite(page, prefs);
  if (prepare) {
    await prepare(page);
    await settle(page);
  }
  await expect(page).toHaveScreenshot(`${name}.png`);
  await context.close();
}

const goTo = (id) => async (page) => {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    scrollTo(0, el.getBoundingClientRect().top + scrollY - 60);
  }, id);
  await page.waitForTimeout(300);
};

const CASES = [
  // home page at every size
  ["home-phone", "phone", SETUPS.marathi],
  ["home-small", "small", SETUPS.marathi],
  ["home-tablet", "tablet", SETUPS.marathi],
  ["home-desktop", "desktop", SETUPS.marathi],
  ["home-wide", "wide", SETUPS.marathi],
  ["home-folded-phone", "phone", { ...SETUPS.marathi, fold: 1 }],
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
  // text fonts
  ["font-classic", "phone", { ...SETUPS.both, fnt: "classic" }, goTo("a1")],
  ["font-bold", "phone", { ...SETUPS.both, fnt: "bold" }, goTo("a1")],
  ["font-hand", "phone", { ...SETUPS.both, fnt: "hand" }, goTo("a1")],
  // folds
  ["folded-sections", "phone", { ...SETUPS.marathi, pf: 1, af: ["a1", "a2"], tf: 1, fold: 1 }],
  // overlays
  ["settings-phone", "phone", SETUPS.marathi, (p) => p.locator("#aa").click()],
  ["settings-desktop", "desktop", SETUPS.marathi, (p) => p.locator("#aa").click()],
  ["settings-dark", "phone", { ...SETUPS.marathi, th: "dark" }, (p) => p.locator("#aa").click()],
  ["search-phone", "phone", SETUPS.marathi, async (p) => {
    await p.locator("#hm").click();
    await p.locator("#q").fill("sukh");
  }],
  ["contents-phone", "phone", SETUPS.marathi, (p) => p.locator("#hm").click()],
  ["help-phone", "phone", SETUPS.marathi, (p) => p.locator("#hlpb").click()],
  ["qr-phone", "phone", SETUPS.marathi, (p) => p.locator("#qrb").click()],
  ["print-dialog", "phone", SETUPS.marathi, (p) => p.locator("#prb").click()],
];

for (const [name, size, prefs, prep] of CASES) {
  test(`screenshot ${name} @chromium-only`, async ({ browser }) => {
    await shoot(browser, name, size, prefs, prep);
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

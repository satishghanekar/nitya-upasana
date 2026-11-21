// Welcome (js/features/welcome.js; Satish, 2026-11-21): once, on a new phone, two full-screen steps over Home: what the
// app is, the first reading language (English the second) and the first person's name (or Guest); then their ready-made routine and where to change
// both. Start keeps them; not when the site opens at a text. Four small routines of its own, so the tests don't change with content/routines.json. Every other test opens
// a phone that has seen it (openSite's welcome option, tests/helpers.mjs).
import { test, expect } from "@playwright/test";
import { openSite, settle, SETUPS, axeEveryTheme, noViolations } from "./helpers.mjs";

const FOUR = {
  short: {
    morning: { mode: "fixed", texts: ["vedic-chant-atharvashirsha"] },
    afternoon: { mode: "fixed", texts: [] },
    evening: { mode: "fixed", texts: ["aarti-sukhkarta"] },
  },
  daily: {
    morning: { mode: "fixed", texts: ["vedic-chant-atharvashirsha", "vedic-chant-purusha-suktam"] },
    afternoon: { mode: "fixed", texts: [] },
    evening: { mode: "fixed", texts: ["aarti-sukhkarta", "aarti-ghalin-lotangan"] },
  },
  full: {
    morning: { mode: "fixed", texts: ["vedic-chant-atharvashirsha", "vedic-chant-purusha-suktam", "vedic-chant-shri-sukta"] },
    afternoon: { mode: "fixed", texts: [] },
    evening: { mode: "fixed", texts: ["aarti-sukhkarta"] },
  },
  extended: {
    morning: { mode: "fixed", texts: ["vedic-chant-atharvashirsha", "vedic-chant-shri-rudra"] },
    afternoon: { mode: "fixed", texts: [] },
    evening: { mode: "fixed", texts: ["aarti-sukhkarta"] },
  },
};
const MORNING = new Date("2026-10-19T08:00:00-04:00");
const card = (page) => page.locator("#wlc");
const homeIds = (page) => page.locator("#tsl li a.tgo").evaluateAll((l) => l.map((a) => a.dataset.t));

test.beforeEach(async ({ page }) => {
  await page.route("**/content/routines.json", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(FOUR) }));
});

test("a new phone: step one over Home, the name or Guest; step two the routine, Home following it at once @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english, { welcome: true, now: MORNING });
  await expect(card(page)).toBeVisible();
  await expect(card(page)).toHaveAccessibleName("Welcome to Nitya Upasana");
  await expect(page.locator("#welcome-routine")).toBeHidden();
  await expect(page.locator("#welcome-title")).toHaveText("नित्य उपासनाNitya Upasana");
  await expect(page.locator("#welcome-facts li")).toHaveText(["Works offline", "Stays on your phone", "No sign-up", "Can follow your chanting"]);
  await expect(page.locator("#welcome-lang")).toHaveValue("mr");
  await expect(page.locator("#wlcn")).toHaveAccessibleName("What should we call you?");
  await expect(page.locator("#wlcn")).toHaveValue("");
  // Home is under it, and out of reach: the welcome covers the screen
  expect(await homeIds(page)).toEqual(["vedic-chant-atharvashirsha"]);
  const box = await card(page).boundingBox();
  const vp = page.viewportSize();
  expect(box.width).toBe(vp.width);
  expect(box.height).toBe(vp.height);
  // Guest: on to the routine, the name as it was
  await page.locator("#welcome-guest").click();
  await expect(page.locator("#welcome-about")).toBeHidden();
  await expect(page.locator("#welcome-routine-title")).toBeFocused();
  await expect(page.locator("#wlcb")).toHaveAccessibleName("Choose a daily routine");
  await expect(page.locator("#wlcb .welcome-r-name")).toHaveText(["Short", "Daily", "Full", "Extended"]);
  await expect(page.locator('#wlcb [aria-checked="true"]')).toContainText("Short");
  await expect(page.locator('#wlcb [data-v="short"] .welcome-r-time')).toHaveText(/min$/);
  await expect(page.locator('#wlcb [data-v="short"] .welcome-r-info')).toContainText("2 texts a day");
  await expect(page.locator("#welcome-change")).toContainText("Change it any time");
  await expect(page.locator("#welcome-edit")).toHaveText("Edit");
  await expect(page.locator("#welcome-badge .pfa")).toHaveText("M");
  // Daily: Home follows at once; the arrows move through the four, as radio buttons do
  await page.locator('#wlcb [data-v="daily"]').click();
  await expect(page.locator('#wlcb [data-v="daily"]')).toBeFocused();
  await expect(page.locator('#wlcb [data-v="daily"] .welcome-r-info')).toContainText("4 texts a day");
  await expect.poll(() => homeIds(page)).toEqual(["vedic-chant-atharvashirsha", "vedic-chant-purusha-suktam"]);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('#wlcb [data-v="full"]')).toBeFocused();
  await expect(page.locator('#wlcb [aria-checked="true"]')).toContainText("Full");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator('#wlcb [aria-checked="true"]')).toContainText("Daily");
  // Back: the first step again
  await page.locator("#welcome-back").click();
  await expect(page.locator("#welcome-about")).toBeVisible();
  await expect(page.locator("#welcome-title")).toBeFocused();
});

test("a name, Enter, a routine and Start: kept, Home shown, and the welcome does not come back @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english, { welcome: true, now: MORNING });
  await page.locator("#wlcn").fill("Satish");
  // Enter in the name goes on, as Next
  await page.locator("#wlcn").press("Enter");
  await expect(page.locator("#welcome-routine")).toBeVisible();
  await expect(page.locator("#welcome-badge .pfa")).toHaveText("S");
  await page.locator('#wlcb [data-v="daily"]').click();
  await page.locator("#wlcs").click();
  await expect(card(page)).toBeHidden();
  await expect(page.locator("html")).not.toHaveAttribute("data-welcome", "1");
  await expect(page.locator("#tsh")).toBeFocused();
  await expect(page.locator("#fl")).toContainText("Welcome, Satish");
  await expect(page.locator("#who")).toHaveAccessibleName("Profile: Satish");
  await page.reload();
  await settle(page);
  await expect(card(page)).toBeHidden();
  expect(await homeIds(page)).toEqual(["vedic-chant-atharvashirsha", "vedic-chant-purusha-suktam"]);
});

test("Guest and Start: still Me, no greeting by a name not given; closed and gone for good @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english, { welcome: true, now: MORNING });
  await page.locator("#wlcn").fill("Typed then left");
  await page.locator("#welcome-guest").click();
  await page.locator("#wlcs").click();
  await expect(card(page)).toBeHidden();
  await expect(page.locator("#who")).toHaveAccessibleName("Profile: Me");
  await expect(page.locator("#fl")).not.toContainText("Welcome");
  expect(await page.evaluate(() => localStorage.getItem("nitya-welcome"))).toBe("2");
});

test("Escape steps back, and on the first step closes it as Guest @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english, { welcome: true, now: MORNING });
  await page.locator("#welcome-next").click();
  await expect(page.locator("#welcome-routine")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#welcome-about")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card(page)).toBeHidden();
  await expect(page.locator("#who")).toHaveAccessibleName("Profile: Me");
  expect(await page.evaluate(() => localStorage.getItem("nitya-welcome"))).toBe("2");
});

test("closed before Start (the app left): there again at the next opening @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english, { welcome: true, now: MORNING });
  await page.locator("#welcome-next").click();
  await page.reload();
  await settle(page);
  await expect(card(page)).toBeVisible();
  await expect(page.locator("#welcome-about")).toBeVisible();
});

test("the first reading language picked on step one, English staying the second: the texts follow it @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english, { welcome: true, now: MORNING });
  await expect(page.locator("#welcome-lang-label")).toHaveText("Texts in");
  await expect(page.locator("#welcome-second")).toHaveText("and English");
  await expect(page.locator("#welcome-lang option")).toHaveCount(4);
  await expect(page.locator("#welcome-lang")).toHaveValue("mr");
  await page.locator("#welcome-lang").selectOption("kn");
  // kept as Settings keeps it: Marathi in Kannada letters first, English second
  const prefs = () =>
    page.evaluate(() => import(new URL("js/core/state.js", document.baseURI).href).then((m) => ({ lead: m.P.lead, l2: m.P.l2, ind: m.P.ind })));
  await expect.poll(prefs).toEqual({ lead: "mr", l2: "en", ind: "kn" });
  await expect(page.locator("#welcome-lang")).toHaveValue("kn");
  await page.locator("#welcome-next").click();
  await page.locator("#wlcs").click();
  await page.reload();
  await settle(page);
  expect(await prefs()).toEqual({ lead: "mr", l2: "en", ind: "kn" });
});

test("opened at a text (a shared link): no welcome, and the visit not counted, so Home's next visit has it @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english, { welcome: true, now: MORNING, hash: "#a1" });
  await expect(card(page)).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("nitya-welcome"))).toBeNull();
});

test("Marathi menus: the welcome in Marathi, the first person मी @mobile", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"], { welcome: true, now: MORNING });
  await expect(card(page)).toHaveAttribute("lang", "mr");
  await expect(page.locator("#wlcn")).toHaveAccessibleName("तुमचे नाव काय?");
  await expect(page.locator("#welcome-guest")).toHaveText("पाहुणे म्हणून पुढे जा");
  await page.locator("#welcome-guest").click();
  await expect(page.locator("#wlcb .welcome-r-name")).toHaveText(["संक्षिप्त", "दैनिक", "पूर्ण", "विस्तृत"]);
  await expect(page.locator("#welcome-edit")).toHaveText("बदला");
  await expect(page.locator("#wlcs")).toHaveText("सुरू करा");
});

test("axe: both steps of the welcome, in every theme", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { welcome: true, now: MORNING });
  expect(await axeEveryTheme(page, "#wlc")).toEqual(noViolations());
  await page.locator("#welcome-next").click();
  expect(await axeEveryTheme(page, "#wlc")).toEqual(noViolations());
});

// Every screen (Satish, 2026-11-02: desktops and iPads too): the whole screen covered, the steps one column in the
// middle, every target at least 44px, nothing wider than the screen, Start reached by scrolling where it is short
for (const [name, size] of [
  ["a 320px phone", { width: 320, height: 568 }],
  ["a phone", { width: 390, height: 844 }],
  ["an upright iPad", { width: 820, height: 1180 }],
  ["an iPad sideways", { width: 1180, height: 820 }],
  ["a computer", { width: 1440, height: 900 }],
])
  test(`the welcome on ${name}: covers the screen, one column, 44px targets, Start in reach`, async ({ page }) => {
    await page.setViewportSize(size);
    await openSite(page, SETUPS["marathi-menus"], { welcome: true, now: MORNING });
    const box = await card(page).boundingBox();
    expect(box).toEqual({ x: 0, y: 0, width: size.width, height: size.height });
    const col = await page.locator("#welcome-about").boundingBox();
    expect(col.width).toBeLessThanOrEqual(440);
    expect(Math.abs(col.x + col.width / 2 - size.width / 2)).toBeLessThan(2);
    for (const sel of ["#welcome-lang", "#wlcn", "#welcome-next", "#welcome-guest"]) {
      const b = await page.locator(sel).boundingBox();
      expect(b.height, sel).toBeGreaterThanOrEqual(44);
    }
    await page.locator("#welcome-next").click();
    for (const b of await page.locator("#wlcb button").evaluateAll((bs) => bs.map((x) => x.getBoundingClientRect().height)))
      expect(b).toBeGreaterThanOrEqual(44);
    await page.locator("#wlcs").scrollIntoViewIfNeeded();
    await expect(page.locator("#wlcs")).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await card(page).evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  });

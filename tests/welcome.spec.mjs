// Welcome (js/features/welcome.js; Satish, 2026-11-02): once, on a new phone's Home, the first person's name and their
// ready-made routine, never in the way; Start keeps both, Later puts it off (twice at most); not when the site opens at
// a text. Four small routines of its own, so the tests don't change with content/routines.json. Every other test opens
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
    morning: { mode: "fixed", texts: ["vedic-chant-atharvashirsha", "vedic-chant-shree-rudra"] },
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

test("a new phone: the card on Home, Home under it; a routine picked changes the lists at once @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english, { welcome: true, now: MORNING });
  await expect(card(page)).toBeVisible();
  await expect(card(page)).toHaveAccessibleName("Welcome to Nitya Upasana");
  await expect(page.locator("#wlcn")).toHaveAccessibleName("Your name");
  await expect(page.locator("#wlcn")).toHaveValue("");
  await expect(page.locator("#wlcn")).toHaveAttribute("placeholder", "Me");
  await expect(page.locator("#wlcb")).toHaveAccessibleName("Your routine");
  await expect(page.locator("#wlcb button")).toHaveText(["Short", "Daily", "Full", "Extended"]);
  await expect(page.locator('#wlcb [aria-checked="true"]')).toHaveText("Short");
  await expect(page.locator("#wlci")).toContainText("2 texts a day");
  await expect(page.locator("#wlch")).toHaveText("Change either any time: tap your badge at the top, or Edit beside a session.");
  // Home is there under it
  expect(await homeIds(page)).toEqual(["vedic-chant-atharvashirsha"]);
  // Daily: Home follows at once; the arrows move through the four, as radio buttons do
  await page.locator('#wlcb [data-v="daily"]').click();
  await expect(page.locator('#wlcb [data-v="daily"]')).toBeFocused();
  await expect(page.locator("#wlci")).toContainText("4 texts a day");
  await expect.poll(() => homeIds(page)).toEqual(["vedic-chant-atharvashirsha", "vedic-chant-purusha-suktam"]);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('#wlcb [data-v="full"]')).toBeFocused();
  await expect(page.locator('#wlcb [aria-checked="true"]')).toHaveText("Full");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator('#wlcb [aria-checked="true"]')).toHaveText("Daily");
});

test("Start keeps the name and the routine; the card does not come back @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english, { welcome: true, now: MORNING });
  await page.locator('#wlcb [data-v="daily"]').click();
  await page.locator("#wlcn").fill("Satish");
  // Enter in the name is Start
  await page.locator("#wlcn").press("Enter");
  await expect(card(page)).toBeHidden();
  await expect(page.locator("#tsh")).toBeFocused();
  await expect(page.locator("#fl")).toContainText("Welcome, Satish");
  await expect(page.locator("#who")).toHaveAccessibleName("Profile: Satish");
  await expect(page.locator("#who .pfa")).toHaveText("S");
  await page.reload();
  await settle(page);
  await expect(card(page)).toBeHidden();
  expect(await homeIds(page)).toEqual(["vedic-chant-atharvashirsha", "vedic-chant-purusha-suktam"]);
});

test("Later puts it off to the next visit, twice at most @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english, { welcome: true, now: MORNING });
  await page.locator("#wlcx").click();
  await expect(card(page)).toBeHidden();
  await expect(page.locator("#tsh")).toBeFocused();
  // the next visit: there again; Later once more, and that is enough
  await page.reload();
  await settle(page);
  await expect(card(page)).toBeVisible();
  await page.locator("#wlcx").click();
  await page.reload();
  await settle(page);
  await expect(card(page)).toBeHidden();
  await expect(page.locator("#who")).toHaveAccessibleName("Profile: Me");
});

test("Start with the name left empty: still Me, and no greeting by a name not given @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english, { welcome: true, now: MORNING });
  await page.locator("#wlcs").click();
  await expect(card(page)).toBeHidden();
  await expect(page.locator("#who")).toHaveAccessibleName("Profile: Me");
  await expect(page.locator("#fl")).not.toContainText("Welcome");
});

test("opened at a text (a shared link): no card, and the visit not counted, so Home's next visit has it @mobile", async ({ page }) => {
  await openSite(page, SETUPS.english, { welcome: true, now: MORNING, hash: "#a1" });
  await expect(card(page)).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("nitya-welcome"))).toBeNull();
});

test("Marathi menus: the card in Marathi, the first person मी @mobile", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"], { welcome: true, now: MORNING });
  await expect(page.locator("#wlct")).toHaveText("नित्य उपासनेत स्वागत");
  await expect(page.locator("#wlcb button")).toHaveText(["संक्षिप्त", "दैनिक", "पूर्ण", "विस्तृत"]);
  await expect(page.locator("#wlcn")).toHaveAttribute("placeholder", "मी");
  await expect(page.locator("#wlcs")).toHaveText("सुरू करा");
  await expect(card(page)).toHaveAttribute("lang", "mr");
});

test("axe: the welcome card, in every theme", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { welcome: true, now: MORNING });
  expect(await axeEveryTheme(page, "#wlc")).toEqual(noViolations());
});

// Every screen (Satish, 2026-11-02: desktops and iPads too): at the top of Home's column, beside the picture on wide
// screens; the four in one row; Start and Later whole tap targets; nothing wider than the screen
for (const [name, size, beside] of [
  ["a 320px phone", { width: 320, height: 640 }, false],
  ["a phone", { width: 390, height: 844 }, false],
  ["an upright iPad", { width: 820, height: 1180 }, false],
  ["an iPad sideways", { width: 1180, height: 820 }, true],
  ["a computer", { width: 1440, height: 900 }, true],
])
  test(`the welcome card on ${name}: under the date, on the screen, the four in one row`, async ({ page }) => {
    await page.setViewportSize(size);
    await openSite(page, SETUPS["marathi-menus"], { welcome: true, now: MORNING });
    const box = await card(page).boundingBox();
    const date = await page.locator("#tdd").boundingBox();
    const cal = await page.locator("#pan").boundingBox();
    expect(box.y, "under the date").toBeGreaterThan(date.y);
    expect(box.y + box.height, "above the calendar card").toBeLessThanOrEqual(cal.y + 1);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    if (beside) {
      const pic = await page.locator("#iconb").boundingBox();
      expect(box.x + box.width, "beside the picture").toBeLessThanOrEqual(pic.x);
    }
    const rows = await page.locator("#wlcb button").evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect().toJSON()));
    expect(new Set(rows.map((b) => Math.round(b.top))).size, "one row").toBe(1);
    for (const b of rows) expect(b.height).toBeGreaterThanOrEqual(44);
    for (const sel of ["#wlcs", "#wlcx", "#wlcn"]) {
      const b = await page.locator(sel).boundingBox();
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

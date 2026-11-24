// Who sings (js/features/who-sings.js, css/04-columns-rail.css; Satish, 2026-11-24): a text marked with [lead],
// [chorus] and [together] shows Solo | Group under its heading, and in the group view My part. Group: a stanza one
// centred block, a chorus line stepped in with a rule, together labelled, a screen reader told who sings where each turn
// starts; my part's lines full with a dot, the other part's muted. Solo: as one person sings it. A text without the
// marks has none of it.
import { test, expect } from "@playwright/test";
import { openSite, readText, SETUPS, axeEveryTheme, noViolations, PREFS_KEY } from "./helpers.mjs";

const VANDE = "bhajan-vande-ganapati";
const line = (page, who, n = 0, lang = "mr") => page.locator(`#${VANDE} .verse > .${lang} > p[data-who="${who}"]`).nth(n);
const style = (loc, prop, pseudo = null) => loc.evaluate((e, [p, ps]) => getComputedStyle(e, ps).getPropertyValue(p), [prop, pseudo]);

test("group by default: the switch, a chorus line stepped in with its rule, together labelled @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await readText(page, VANDE);
  const sec = page.locator("#" + VANDE);
  await expect(sec).toHaveClass(/\bwho\b/);
  await expect(page.locator("html")).toHaveAttribute("data-sing", "group");
  await expect(sec.getByRole("group", { name: "गायन" }).getByRole("button", { name: "समूह" })).toHaveAttribute("aria-pressed", "true");
  await expect(sec.getByRole("button", { name: "सोलो" })).toHaveAttribute("aria-pressed", "false");
  await expect(sec.getByRole("group", { name: "माझा भाग" })).toBeVisible();
  // the lead at the stanza's edge, the chorus a step in with its rule
  expect(await style(line(page, "lead"), "border-inline-start-width")).toBe("0px");
  expect(await style(line(page, "chorus"), "border-inline-start-width")).toBe("3px");
  expect(parseFloat(await style(line(page, "chorus"), "margin-inline-start"))).toBeGreaterThan(10);
  // the lines start at one edge, the stanza centred
  expect(await style(sec.locator(".items .verse").first(), "text-align")).toBe("start");
  // where a turn starts, a screen reader hears who sings; together's label shows
  expect(await style(line(page, "lead"), "content", "::before")).toBe('"गायक: "');
  expect(await style(line(page, "chorus"), "content", "::before")).toBe('"कोरस: "');
  const together = line(page, "together");
  expect(await style(together, "content", "::before")).toBe('"सर्व"');
  expect(await style(together, "display", "::before")).toBe("inline-block");
  // the English lines carry no second label
  expect(await style(line(page, "lead", 0, "en"), "content", "::before")).toBe("none");
  // only the words of the text are in the line (search, Follow, copying and print read them)
  await expect(line(page, "lead")).toHaveText("वंदे गणपती विघ्नविनाशन, ​हे लंबोदर गजानना");
});

test("my part: its lines with a dot and named so, the other part's muted; tapped again, no part @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await readText(page, VANDE);
  const sec = page.locator("#" + VANDE);
  const lead = sec.getByRole("button", { name: "गायक" });
  await lead.click();
  await expect(lead).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-part", "lead");
  expect(await style(line(page, "lead"), "content", "::before")).toBe('"गायक, माझा भाग: "');
  expect(await style(line(page, "lead", 1), "content", "::after")).toBe('""');
  expect(await style(line(page, "chorus"), "content", "::after")).toBe("none");
  const muted = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--muted").trim());
  const rgb = await page.evaluate((c) => {
    const d = document.createElement("i");
    d.style.color = c;
    document.body.append(d);
    const v = getComputedStyle(d).color;
    d.remove();
    return v;
  }, muted);
  expect(await style(line(page, "chorus"), "color")).toBe(rgb);
  expect(await style(line(page, "lead"), "color")).not.toBe(rgb);
  // kept with this person's settings
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).part, PREFS_KEY)).toBe("lead");
  await lead.click();
  await expect(lead).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).not.toHaveAttribute("data-part", /./);
});

test("solo: the text as one person sings it, no part to choose @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await readText(page, VANDE);
  const sec = page.locator("#" + VANDE);
  await sec.getByRole("button", { name: "सोलो" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-sing", "solo");
  await expect(sec.getByRole("button", { name: "सोलो" })).toHaveAttribute("aria-pressed", "true");
  await expect(sec.getByRole("group", { name: "माझा भाग" })).toBeHidden();
  expect(await style(line(page, "chorus"), "border-inline-start-width")).toBe("0px");
  expect(await style(line(page, "chorus"), "margin-inline-start")).toBe("0px");
  expect(await style(line(page, "lead"), "content", "::before")).toBe("none");
  expect(await style(sec.locator(".items .verse").first(), "text-align")).toBe("center");
});

test("English menus and lines: the switch and the turns in English; a text without marks has no switch @chromium-only", async ({ page }) => {
  await openSite(page, { ...SETUPS.english, ui: "en" });
  await readText(page, VANDE);
  const sec = page.locator("#" + VANDE);
  await expect(sec.getByRole("group", { name: "Singing" }).getByRole("button", { name: "Group" })).toHaveAttribute("aria-pressed", "true");
  expect(await style(line(page, "chorus", 0, "en"), "content", "::before")).toBe('"Chorus: "');
  expect(await style(line(page, "chorus", 0, "en"), "border-inline-start-width")).toBe("3px");
  await readText(page, "a1");
  await expect(page.locator("#a1 .sing")).toHaveCount(0);
  await expect(page.locator("#a1")).not.toHaveClass(/\bwho\b/);
});

test("in Kannada letters the turns are Kannada's own words @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS.kannada);
  await readText(page, VANDE);
  expect(await style(line(page, "chorus"), "content", "::before")).toBe('"ಕೋರಸ್: "');
});

test("both languages side by side on a computer: the chorus steps away from the middle on both sides @chromium-only", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSite(page, { ...SETUPS.both, cols: 2 });
  await readText(page, VANDE);
  await expect(page.locator("html")).toHaveAttribute("data-cols", "2");
  expect(await style(line(page, "chorus"), "border-right-width")).toBe("3px");
  expect(await style(line(page, "chorus"), "border-left-width")).toBe("0px");
  expect(await style(line(page, "chorus", 0, "en"), "border-left-width")).toBe("3px");
});

test("accessible in every theme, group view with a part chosen @chromium-only", async ({ page }) => {
  // (no fade-in: contrast is measured on the colours as they end, not half-way)
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSite(page, { ...SETUPS.both, part: "chorus" });
  await readText(page, VANDE);
  expect(await axeEveryTheme(page, ["#" + VANDE])).toEqual(noViolations());
  // the switch's buttons are at least 44 px tall
  for (const b of await page.locator(`#${VANDE} .sing button`).all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
});

// Pictures for a person to look at (not compared): WHO_SHOTS=<folder> npx playwright test who-sings
test("pictures: phone, iPad and computer @chromium-only", async ({ browser }) => {
  test.skip(!process.env.WHO_SHOTS, "only when WHO_SHOTS names a folder");
  for (const [name, w, h, prefs] of [
    ["phone", 390, 844, { ...SETUPS.marathi, part: "chorus" }],
    ["ipad", 834, 1194, { ...SETUPS.both, part: "chorus" }],
    ["computer", 1440, 900, { ...SETUPS.both, cols: 2, part: "lead" }],
    ["phone-dark", 390, 844, { ...SETUPS.both, th: "dark", part: "lead" }],
  ]) {
    // each in a browser of its own: a page keeps the settings it saved
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce", serviceWorkers: "block" });
    const page = await ctx.newPage();
    await openSite(page, prefs);
    await readText(page, VANDE);
    await page.locator(`#${VANDE} header`).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${process.env.WHO_SHOTS}/${name}.png` });
    await ctx.close();
  }
});

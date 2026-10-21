// The Library (Home v2, docs/decisions.md 2026-10-18): the book button in the top bar opens every text, grouped as
// the home page had them (पूजा, आरती), with search. A title opens its text; Back (the button or the browser's) returns
// to Home. The bottom bar's search button and the one at the end of each piece open the same page.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openSite, SETUPS, axeScan, axeEveryTheme, noViolations } from "./helpers.mjs";

const LIB = JSON.parse(readFileSync(new URL("../content/library.json", import.meta.url), "utf8"));
// the bundled categories that have texts, in order (an empty one is left out of the list)
const CATS = JSON.parse(readFileSync(new URL("../content/categories.json", import.meta.url), "utf8")).filter((c) =>
  LIB.texts.some((t) => t.category === c.id),
);
const GROUPS = CATS.map((c) => c.name.mr);
const GROUPS_EN = CATS.map((c) => c.name.en);
const VEDIC = LIB.texts.filter((t) => t.category === "vedic-chant");
const EVENING = new Date("2026-10-18T19:00:00-04:00");
const onPiece = (page) =>
  page.evaluate(() => {
    let c = "";
    document.querySelectorAll(".ash").forEach((x) => {
      if (x.offsetParent !== null && x.getBoundingClientRect().top <= 90) c = x.id;
    });
    return c;
  });

test("the Library button opens every text, grouped, with search @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  const btn = page.locator("#hm");
  await expect(btn).toHaveAccessibleName("Library");
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  await btn.click();
  await expect(page.locator("#jump")).toBeVisible();
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#jump")).toHaveAccessibleName("संग्रह Library");
  await expect(page.locator("#q")).toBeVisible();
  // by category (content/categories.json): वैदिक मंत्र, आरती, …, every text of the library in order
  await expect(page.locator("#jl .tocg .gh .mr")).toHaveText(GROUPS);
  const ids = LIB.texts.map((t) => t.id);
  await expect(page.locator("#jl a[data-go]")).toHaveCount(ids.length);
  // the bottom bar steps aside
  await expect(page.locator("#asc")).toBeHidden();
});

test("a text opened from the Library; Back returns to Home @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#hm").click();
  await page.locator('#jl a[data-go="a5"]').click();
  await expect(page.locator("#jump")).toBeHidden();
  await expect.poll(() => onPiece(page)).toBe("a5");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#a5");
  await page.goBack();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  await expect.poll(() => onPiece(page)).toBe("");
  await expect(page.locator("#tsc")).toBeInViewport();
  await expect(page.locator("#jump")).toBeHidden();
});

test("the Library's Back button and the browser's Back both close it, without leaving Home @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  const url = page.url();
  await page.locator("#hm").click();
  await page.locator("#jbk").click();
  await expect(page.locator("#jump")).toBeHidden();
  await expect(page.locator("#hm")).toBeFocused();
  expect(page.url()).toBe(url);
  await page.locator("#hm").click();
  await expect(page.locator("#jump")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#jump")).toBeHidden();
  expect(page.url()).toBe(url);
  await expect(page.locator("#tsc")).toBeVisible();
});

test("search in the Library finds a line and goes to it", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#hm").click();
  await page.locator("#q").fill("sukhakarta");
  await expect(page.locator("#res button").first()).toBeVisible();
  await expect(page.locator("#jl")).toBeHidden();
  await page.locator("#res button").first().click();
  await expect(page.locator("#jump")).toBeHidden();
  await expect.poll(() => onPiece(page)).toBe("a1");
});

test("the bottom bar's search button opens the Library while reading", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING, hash: "#a3" });
  await expect(page.locator("#asq")).toBeVisible();
  await page.locator("#asq").click();
  await expect(page.locator("#jump")).toBeVisible();
  await page.locator('#jl a[data-go="a7"]').click();
  await expect.poll(() => onPiece(page)).toBe("a7");
});

test("on the home page the top bar has the name, profile, Library, More and Settings; while reading Library moves to the bottom bar @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  for (const b of ["#who", "#hm", "#tmb", "#aa"]) await expect(page.locator(b)).toBeVisible();
  await expect(page.locator("#asq")).toBeHidden();
  await page.locator("#tst").click();
  await expect.poll(() => onPiece(page)).toBe("a1");
  await expect(page.locator("#hm")).toBeHidden();
  await expect(page.locator("#asq")).toBeVisible();
  for (const b of ["#who", "#tmb", "#aa"]) await expect(page.locator(b)).toBeVisible();
});

// Light is scanned in full, then dark, sepia and high contrast for colour (axeEveryTheme); Marathi menus in full
for (const [name, prefs, themes] of [
  ["light, and every other theme", SETUPS.marathi, true],
  ["Marathi menus, both languages", { ...SETUPS["marathi-menus"], lang: "both" }],
]) {
  test(`axe: the Library, ${name} @mobile`, async ({ page }) => {
    await openSite(page, prefs, { now: EVENING });
    await page.locator("#hm").click();
    await expect(page.locator("#jump")).toBeVisible();
    if (themes) expect(await axeEveryTheme(page, "#jump")).toEqual(noViolations());
    else expect(await axeScan(page, "#jump")).toEqual([]);
  });
}

test("every Library link and button has a 44px target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#hm").click();
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("#jump a[data-go], #jbk")]
      .map((b) => ({ c: b.getAttribute("data-go") || b.id, ...b.getBoundingClientRect().toJSON() }))
      .filter((r) => r.height < 44)
      .map((r) => `${r.c} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

// ---- Slice 3: the Library by category, the categories sheet (#lbm) and search across the library ----
const groups = (page) => page.locator("#jl .tocg .gh .mr").allTextContents();
const inGroup = (page, cat) => page.locator(`#jl .tocg[data-cat="${cat}"] a[data-go]`).evaluateAll((as) => as.map((a) => a.getAttribute("data-go")));
async function openSheet(page) {
  await page.locator("#hm").click();
  await page.locator("#lbb").click();
  await expect(page.locator("#lbm")).toBeVisible();
}

test("the Library lists the texts by category; empty categories are left out; each category is numbered from 1 @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#hm").click();
  expect(await groups(page)).toEqual(GROUPS);
  expect(await inGroup(page, "vedic-chant")).toEqual(["p1", ...VEDIC.slice(1).map((t) => t.id)]);
  expect(await inGroup(page, "aarti")).toEqual(["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10",
    "jaydeva-jaydeva-samartha", "jay-jay-aarti-shrigururaya", "ovaloon-aarti-chaitanyabrahma", "aarti-kariton-guruvar",
    "dhanya-jagin-guruvarya", "aarti-belaguve", "svastha-karin-shayan", "ovaloo-sapreme-aarti"]);
  // numbered from 1 in each category (Satish, 2026-10-21), in Marathi and English digits
  for (const g of await page.locator("#jl .tocg").all()) {
    const n = await g.locator("a[data-go]").count();
    await expect(g.locator(".nm")).toHaveText(Array.from({ length: n }, (_, i) => String(i + 1).replace(/[0-9]/g, (d) => "०१२३४५६७८९"[+d]) + "."));
    await expect(g.locator(".ne")).toHaveText(Array.from({ length: n }, (_, i) => i + 1 + "."));
  }
  await expect(page.locator('#jl a[data-go="a5"] .nm')).toHaveText("५.");
  await expect(page.locator("#lbb")).toHaveAccessibleName("Edit categories");
  // the side menu on wide screens follows the same categories
  await expect(page.locator("#rail .rg .mr")).toHaveText(GROUPS);
});

// A pinch on the Library (on a computer: Ctrl/⌘ + and −, or a trackpad pinch) makes the list bigger or smaller by the
// same share as the reading page (one text size); the top bar, Back, the title and the search box keep their size, and
// the browser never zooms the whole page there (Satish, 2026-10-21)
test("a pinch on the Library resizes only its list, with the reading page's text size @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#hm").click();
  await expect(page.locator("#jump")).toBeVisible();
  await expect(page.locator("#jump")).toHaveCSS("touch-action", "pan-y");
  const fixed = ["#jlt", "#jbk", "#q", "#hm", ".bar .t"];
  const look = () =>
    page.evaluate((fixed) => {
      const px = (s) => parseFloat(getComputedStyle(document.querySelector(s)).fontSize);
      return {
        fs: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--fs")),
        fsa: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--fsa")) || 24,
        list: px("#jl ol.toc a"),
        head: px("#jl .tocg:first-child .gh"),
        fixed: fixed.map((s) => {
          const r = document.querySelector(s).getBoundingClientRect();
          return [s, px(s), Math.round(r.top), Math.round(r.height)];
        }),
      };
    }, fixed);
  const a = await look();
  expect(a.list).toBeCloseTo(15, 0); // the book-index size at the automatic text size
  for (let i = 0; i < 4; i++) await page.keyboard.press("Control+Equal");
  const b = await look();
  expect(b.fs).toBeGreaterThan(a.fs);
  expect(b.list).toBeCloseTo((15 * b.fs) / b.fsa, 1);
  expect(b.head).toBeCloseTo((15 * b.fs) / b.fsa, 1);
  expect(b.fixed).toEqual(a.fixed);
  await expect(page.locator("#szt")).toContainText("Text size");
  // the reading page has the same size
  await page.locator("#jbk").click();
  expect(parseFloat(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--fs")))).toBe(b.fs);
});

test("add a category, move a text into it, rename it: the list follows, and it is kept after a reload @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await openSheet(page);
  await expect(page.locator("#lbcl li")).toHaveCount(4); // empty categories are shown here
  await page.locator("#lbadd").click();
  await expect(page.locator("#lbmr")).toBeFocused(); // the field of the first reading language
  await page.locator("#lbmr").fill("भजन");
  await page.locator("#lben").fill("Bhajan");
  await page.locator("#lbsave").click();
  await expect(page.locator("#lbcl li")).toHaveCount(5);
  await expect(page.locator("#lblive")).toHaveText("भजन added");
  // still empty: not in the list yet
  expect(await groups(page)).toEqual(GROUPS);
  await page.locator("#lbs-ghalin-lotangan").selectOption("bhajan");
  await expect(page.locator("#lblive")).toHaveText("घालीन लोटांगण: now in भजन");
  expect(await groups(page)).toEqual([...GROUPS, "भजन"]);
  expect(await inGroup(page, "bhajan")).toEqual(["a8"]);
  // numbered in its new category
  await expect(page.locator('#jl a[data-go="a8"] .nm')).toHaveText("१.");
  // rename a built-in one (on this phone only)
  await page.locator('.lbe[data-id="aarti"]').click();
  await page.locator("#lbmr").fill("आरत्या");
  await page.locator("#lben").fill("Aartis");
  await page.locator("#lbsave").click();
  await expect(page.locator('.lbe[data-id="aarti"]')).toBeFocused();
  expect(await groups(page)).toEqual([...GROUPS.map((g) => (g === "आरती" ? "आरत्या" : g)), "भजन"]);
  // a name already used is refused, and said so
  await page.locator('.lbe[data-id="bhajan"]').click();
  await page.locator("#lben").fill("Aartis");
  await page.locator("#lbmr").fill("");
  await page.locator("#lbsave").click();
  await expect(page.locator("#lberr")).toHaveText("Another category already has this name.");
  await expect(page.locator("#lben")).toHaveAttribute("aria-invalid", "true");
  await page.keyboard.press("Escape");
  await page.locator("#lbx").click();
  await expect(page.locator("#lbm")).toBeHidden();
  await expect(page.locator("#jump")).toBeVisible();
  await expect(page.locator("#lbb")).toBeFocused();
  // kept on this phone (IndexedDB) after a reload
  await page.reload();
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-ready"));
  await page.locator("#hm").click();
  expect(await groups(page)).toEqual([...GROUPS.map((g) => (g === "आरती" ? "आरत्या" : g)), "भजन"]);
  // search finds a text by its category's new name
  await page.locator("#q").fill("bhajan");
  await expect(page.locator("#res li.rt .rl")).toHaveText(["घालीन लोटांगण"]);
});

test("delete a family category: its texts go back; a built-in one can only be renamed @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await openSheet(page);
  await page.locator("#lbadd").click();
  await page.locator("#lben").fill("Bhajan");
  await page.locator("#lbsave").click();
  await page.locator("#lbs-jai-jagdish-hare").selectOption("bhajan");
  expect(await inGroup(page, "bhajan")).toEqual(["a10"]);
  await page.locator('.lbe[data-id="aarti"]').click();
  await expect(page.locator("#lbdel")).toBeHidden();
  await expect(page.locator("#lbbi")).toBeVisible();
  await page.locator("#lbcan").click();
  await page.locator('.lbe[data-id="bhajan"]').click();
  await page.locator("#lbdel").click();
  await expect(page.locator("#lbdq")).toContainText("Delete Bhajan?");
  await expect(page.locator("#lbdn")).toBeFocused();
  await page.locator("#lbdy").click();
  await expect(page.locator("#lblive")).toHaveText("Bhajan deleted");
  await expect(page.locator("#lbcl li")).toHaveCount(4);
  expect(await groups(page)).toEqual(GROUPS);
  expect(await inGroup(page, "aarti")).toContain("a10");
});

test("search across the library: Devanagari and English find texts (first) and lines @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#hm").click();
  for (const q of ["sukhakarta", "सुखकर्ता"]) {
    await page.locator("#q").fill(q);
    await expect(page.locator("#res li.rh h3")).toHaveText(["Texts", "Lines"]);
    await expect(page.locator("#res li.rt").first().locator(".rl")).toHaveText("गणपतीची आरती");
    await expect(page.locator("#res li:not(.rh):not(.rt)").first()).toContainText("सुखकर्ता");
    await expect(page.locator("#srs")).toHaveText(/^1 text and \d+ lines?$/);
  }
  // a text by its English title, spelt loosely; and by its category
  await page.locator("#q").fill("vithal aarti");
  await expect(page.locator("#res li.rt .rl").first()).toHaveText("विठ्ठलाची आरती");
  await page.locator("#q").fill("vedic");
  await expect(page.locator("#res li.rt .rl")).toHaveText(VEDIC.map((t) => t.title));
  // a line only: no Texts group
  await page.locator("#q").fill("विघ्नाची");
  await expect(page.locator("#res li.rh h3")).toHaveText(["Lines"]);
  // a text result opens the text
  await page.locator("#q").fill("jagdish");
  await page.locator("#res li.rt button").first().click();
  await expect(page.locator("#jump")).toBeHidden();
  await expect.poll(() => onPiece(page)).toBe("a10");
});

test("Marathi menus: the sheet and search speak Marathi (विभाग, रचना) @mobile", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"], { now: EVENING });
  await page.locator("#hm").click();
  await expect(page.locator("#lbb")).toHaveAccessibleName("विभाग बदला");
  await expect(page.locator("#q")).toHaveAttribute("placeholder", "रचना किंवा ओळ शोधा");
  await page.locator("#q").fill("sukhakarta");
  await expect(page.locator("#res li.rh h3")).toHaveText(["रचना", "ओळी"]);
  await page.locator("#q").fill("");
  await page.locator("#lbb").click();
  await expect(page.locator("#lbmt")).toHaveText("विभाग");
  await expect(page.locator("#lbth")).toHaveText("रचना");
  // वैदिक मंत्र: its count in Marathi digits
  await expect(page.locator("#lbcl .lbk").first()).toHaveText(String(VEDIC.length).replace(/\d/g, (d) => "०१२३४५६७८९"[d]) + " रचना");
});

test("keyboard: the sheet traps Tab, Escape steps back then closes it, the phone's Back closes it and the Library stays", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#hm").click();
  await page.locator("#lbb").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#lbm")).toBeVisible();
  await expect(page.locator("#lbb")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#lbmt")).toBeFocused();
  // Tab never leaves the sheet
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement.closest("#lbm"))).toBe(true);
  }
  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => !!document.activeElement.closest("#lbm"))).toBe(true);
  // Escape: from Rename back to the list, then closed; the Library stays open, focus back on the button
  await page.locator('.lbe[data-id="aarti"]').click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#lbv1")).toBeVisible();
  await expect(page.locator('.lbe[data-id="aarti"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#lbm")).toBeHidden();
  await expect(page.locator("#jump")).toBeVisible();
  await expect(page.locator("#lbb")).toBeFocused();
  // the phone's Back closes the sheet only; the next Back closes the Library
  await page.locator("#lbb").click();
  await page.goBack();
  await expect(page.locator("#lbm")).toBeHidden();
  await expect(page.locator("#jump")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#jump")).toBeHidden();
  // closed with ✕, the sheet takes its Back step away: one Back closes the Library
  await page.locator("#hm").click();
  await page.locator("#lbb").click();
  await page.locator("#lbx").click();
  await expect(page.locator("#jump")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#jump")).toBeHidden();
});

test("English only (Settings → Languages): English titles and category names, English words @mobile", async ({ page }) => {
  await openSite(page, { lang: "en", lead: "en", l2: "", ui: "en" }, { now: EVENING });
  await page.locator("#hm").click();
  await expect(page.locator("#jl .tocg .gh .en")).toHaveText(GROUPS_EN);
  await expect(page.locator("#jl .tocg .gh .mr").first()).toBeHidden();
  expect(await page.locator('#jl a[data-go="a1"] .m').innerText()).toMatch(/^1\.\s*Ganapati Aarti$/);
  await page.locator("#lbb").click();
  await expect(page.locator("#lbcl .lbn")).toHaveText(["Vedic Chant", "Aarti", "Stotra", "Ashtak"]);
  await expect(page.locator("#lbcl .lbo")).toHaveCount(0); // no second language
  await expect(page.locator("#lbtl .lbtn").first()).toHaveText("Ganapati Atharvashirsha");
  await expect(page.locator("#lbs-sukhkarta option:checked")).toHaveText("Aarti");
  await page.keyboard.press("Escape");
  await page.locator("#q").fill("sukhakarta");
  await expect(page.locator("#res li.rt .rs")).toHaveText(["Aarti"]);
  await expect(page.locator("#res li.rt .rl")).toHaveText(["Ganapati Aarti"]);
});

test("English first with Marathi second: the sheet names in English with the Marathi under them", async ({ page }) => {
  await openSite(page, SETUPS["english-main-both"], { now: EVENING });
  await page.locator("#hm").click();
  await page.locator("#lbb").click();
  await expect(page.locator("#lbcl .lbn").first()).toHaveText("Vedic Chant");
  await expect(page.locator("#lbcl .lbo").first()).toHaveText("वैदिक मंत्र");
  // the list's category names put English first, as the titles do
  expect(await page.locator("#jl .tocg .gh").first().evaluate((h) => h.firstElementChild.className)).toBe("en");
});

for (const [name, prefs, themes] of [
  ["light, and every other theme", SETUPS.marathi, true],
  ["Marathi menus", SETUPS["marathi-menus"]],
]) {
  test(`axe: the categories sheet and search results, ${name} @mobile`, async ({ page }) => {
    // the categories sheet is scanned with label-content-name-mismatch on, as it always was
    const scan = async (sel, opt = {}) => (themes ? axeEveryTheme(page, sel, opt) : axeScan(page, sel, opt));
    const ok = themes ? noViolations() : [];
    await openSite(page, prefs, { now: EVENING });
    await page.locator("#hm").click();
    await page.locator("#q").fill("sukhakarta");
    await expect(page.locator("#res li.rt")).toHaveCount(1);
    expect(await scan("#jump")).toEqual(ok);
    await page.locator("#q").fill("");
    await page.locator("#lbb").click();
    expect(await scan("#lbm", { mismatch: true })).toEqual(ok);
    await page.locator('.lbe[data-id="aarti"]').click();
    expect(await scan("#lbm", { mismatch: true })).toEqual(ok);
  });
}

test("every control in the categories sheet has a 44px target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await openSheet(page);
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("#lbm button, #lbm select")]
      .filter((b) => b.getClientRects().length)
      .map((b) => ({ c: b.id || b.className || b.tagName, ...b.getBoundingClientRect().toJSON() }))
      .filter((r) => r.height < 44 || r.width < 44)
      .map((r) => `${r.c} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

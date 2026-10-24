// The Library: the book button in the top bar opens every text, grouped as
// the home page had them (पूजा, आरती), with search. A title opens its text; Back (the button or the browser's) returns
// to Home. The bottom bar's search button and the one at the end of each piece open the same page.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openSite, SETUPS, axeScan, axeEveryTheme, noViolations, useTestRoutine } from "./helpers.mjs";

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
  await expect(page.locator("#jl .tocg:not(.pdfg) .gh .mr")).toHaveText(GROUPS);
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

test("the top bar's Library button opens the Library while reading", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING, hash: "#a3" });
  await expect(page.locator("#hm")).toBeVisible();
  await page.locator("#hm").click();
  await expect(page.locator("#jump")).toBeVisible();
  await page.locator('#jl a[data-go="a7"]').click();
  await expect.poll(() => onPiece(page)).toBe("a7");
});

test("the top bar is the same on Home and while reading: the name, profile, Library, More and Settings, in the same places @mobile", async ({ page }) => {
  await useTestRoutine(page);
  await openSite(page, SETUPS.marathi, { now: EVENING });
  const where = () => page.evaluate(() => ["#who", "#hm", "#tmb", "#aa"].map((s) => Math.round(document.querySelector(s).getBoundingClientRect().x)));
  for (const b of ["#who", "#hm", "#tmb", "#aa"]) await expect(page.locator(b)).toBeVisible();
  const home = await where();
  await page.locator("#tsl a.tgo").first().click();
  await expect.poll(() => onPiece(page)).toBe("a1");
  for (const b of ["#who", "#hm", "#tmb", "#aa"]) await expect(page.locator(b)).toBeVisible();
  expect(await where()).toEqual(home);
  // Settings, the Library and the calendar open under it, so it stays; their headers alike: Back, then the name in both
  // languages
  await page.locator("#aa").click();
  await expect(page.locator("#panel")).toBeVisible();
  await expect(page.locator("#hm")).toBeVisible();
  const bar = await page.locator(".bar").boundingBox(),
    sp = await page.locator("#panel").boundingBox();
  expect(sp.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1);
  await expect(page.locator("#spt")).toHaveText("सेटिंग्ज · Settings");
  const left = async (s) => (await page.locator(s).boundingBox()).x;
  expect(await left("#spt")).toBeLessThan(await left("#xc") + 140);
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
// (the texts' categories, not the PDFs tab's groups)
const groups = (page) => page.locator("#jl .tocg:not(.pdfg) .gh .mr").allTextContents();
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
    "aarti-jaydeva-jaydeva-samartha", "aarti-jay-jay-aarti-shrigururaya", "aarti-ovaloon-aarti-chaitanyabrahma", "aarti-kariton-guruvar",
    "aarti-dhanya-jagin-guruvarya", "aarti-belaguve", "aarti-svastha-karin-shayan", "aarti-ovaloo-sapreme-aarti"]);
  // numbered from 1 in each category (Satish, 2026-10-21), in Marathi and English digits
  for (const g of await page.locator("#jl .tocg").all()) {
    const n = await g.locator("a[data-go]").count();
    await expect(g.locator(".nm")).toHaveText(Array.from({ length: n }, (_, i) => String(i + 1).replace(/[0-9]/g, (d) => "०१२३४५६७८९"[+d]) + "."));
    await expect(g.locator(".ne")).toHaveText(Array.from({ length: n }, (_, i) => i + 1 + "."));
  }
  await expect(page.locator('#jl a[data-go="a5"] .nm')).toHaveText("५.");
  await expect(page.locator("#lbb")).toHaveAccessibleName("Edit categories");
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
  // the size reaches the page on the next frame (js/features/pinch.js): read it after that frame, not before (WebKit
  // on GitHub, busy laying the printout out in the background, read the size of three presses, then of four)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
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
  await page.locator("#lbs-aarti-ghalin-lotangan").selectOption("bhajan");
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
  await page.locator("#lbs-aarti-jai-jagdish-hare").selectOption("bhajan");
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
  await expect(page.locator("#jl .tocg:not(.pdfg) .gh .en")).toHaveText(GROUPS_EN);
  await expect(page.locator("#jl .tocg .gh .mr").first()).toBeHidden();
  expect(await page.locator('#jl a[data-go="a1"] .m').innerText()).toMatch(/^1\.\s*Ganapati Aarti$/);
  await page.locator("#lbb").click();
  await expect(page.locator("#lbcl .lbn")).toHaveText(["Vedic Chant", "Aarti", "Stotra", "Ashtak"]);
  await expect(page.locator("#lbcl .lbo")).toHaveCount(0); // no second language
  await expect(page.locator("#lbtl .lbtn").first()).toHaveText("Ganapati Atharvashirsha");
  await expect(page.locator("#lbs-aarti-sukhkarta option:checked")).toHaveText("Aarti");
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

// ---- The PDFs tab (content/pdfs.json, js/features/pdfs.js): a made-up list and PDF, served to the test only ----
const SAMPLE_PDF = readFileSync(new URL("./unit/fixtures/sample.pdf", import.meta.url));
const PDFS = {
  pdfs: [
    { id: "vedic-chant-dasbodh", file: "pdfs/dasbodh.pdf", title: "दासबोध", titleEn: "Dasbodh", category: "vedic-chant", language: "mr" },
    { id: "stotra-pothi", file: "pdfs/pothi.pdf", titleEn: "Pothi", category: "stotra", language: "sa", pages: 48, size: 4058213 },
    { id: "vedic-chant-gurucharitra", file: "pdfs/Shri Gurucharitra.pdf", title: "श्री गुरुचरित्र", titleEn: "Shri Gurucharitra", category: "vedic-chant", language: "mr" },
    { id: "aarti-x", file: "../index.html", title: "Not a PDF", category: "aarti" },
  ],
};
async function withPdfs(page, list = PDFS) {
  await page.route("**/content/pdfs.json", (r) => r.fulfill({ json: list }));
  await page.route("**/content/pdfs/**", (r) => r.fulfill({ body: SAMPLE_PDF, contentType: "application/pdf" }));
}

test("no PDFs listed: the Library has no tabs @mobile", async ({ page }) => {
  await withPdfs(page, { pdfs: [] });
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await page.locator("#hm").click();
  await expect(page.locator("#jtb")).toBeHidden();
  await expect(page.locator("#jl .pdfg")).toHaveCount(0);
  await expect(page.locator("#q")).toBeVisible();
});

test("Chants | Books: the PDFs by the texts' categories, each opening in a new tab; the Library opens on Chants again @mobile", async ({ page }) => {
  await withPdfs(page);
  await openSite(page, SETUPS.both, { now: EVENING });
  await page.locator("#hm").click();
  const tabs = page.locator("#jtb button");
  // (the words in the menu language only: the other is in the page, not shown)
  await expect(tabs.nth(0)).toHaveAccessibleName("Chants");
  await expect(tabs.nth(1)).toHaveAccessibleName("Books");
  await expect(tabs.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#jl .pdfg").first()).toBeHidden();
  // a search shown when the tab changes is cleared
  await page.locator("#q").fill("sukh");
  await expect(page.locator("#res li").first()).toBeVisible();
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#q")).toBeHidden();
  await expect(page.locator("#q")).toHaveValue("");
  await expect(page.locator("#res li")).toHaveCount(0);
  await expect(page.locator("#lbr")).toBeHidden();
  await expect(page.locator("#jl .tocg:not(.pdfg)").first()).toBeHidden();
  // the texts' categories in their order (Aarti, with no PDF, left out), with the entry that is not a PDF left out;
  // names in both reading languages
  await expect(page.locator("#jl .pdfg .gh .mr")).toHaveText(["वैदिक मंत्र", "स्तोत्र"]);
  await expect(page.locator("#jl .pdfg .gh .en")).toHaveText(["Vedic Chant", "Stotra"]);
  const links = page.locator("#jl .pdfg a.pdf");
  await expect(links).toHaveCount(3);
  await expect(links.locator(".m .mr")).toHaveText(["दासबोध", "श्री गुरुचरित्र", "Pothi"]);
  await expect(links.nth(1)).toHaveAttribute("href", "content/pdfs/Shri%20Gurucharitra.pdf");
  // each one's pages and size when content/pdfs.json gives them
  await expect(links.locator(".lt")).toHaveCount(1);
  await expect(links.nth(2).locator(".lt .en")).toHaveText("48 pp · 4.1 MB");
  await expect(links.nth(0)).toHaveAttribute("target", "_blank");
  await expect(links.nth(0)).toHaveAttribute("rel", "noopener");
  // a PDF opens in a tab of its own, the Library staying open behind it
  const [tab] = await Promise.all([page.context().waitForEvent("page"), links.nth(0).click()]);
  await tab.waitForLoadState();
  expect(tab.url()).toMatch(/\/content\/pdfs\/dasbodh\.pdf$/);
  await tab.close();
  await expect(page.locator("#jump")).toBeVisible();
  // closed and opened again: on Texts, with the search box
  await page.locator("#jbk").click();
  await page.locator("#hm").click();
  await expect(tabs.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#q")).toBeVisible();
  await expect(page.locator("#jl .pdfg").first()).toBeHidden();
});

test("a category renamed on this phone: the PDFs tab uses the new name too @mobile", async ({ page }) => {
  await withPdfs(page);
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await openSheet(page);
  await page.locator('.lbe[data-id="stotra"]').click();
  await page.locator("#lbmr").fill("स्तोत्रे");
  await page.locator("#lben").fill("Stotras");
  await page.locator("#lbsave").click();
  await page.locator("#lbx").click();
  await page.locator("#jtb button").nth(1).click();
  await expect(page.locator("#jl .pdfg .gh .mr")).toHaveText(["वैदिक मंत्र", "स्तोत्रे"]);
  await expect(page.locator("#jl .pdfg a.pdf")).toHaveCount(3);
});

test("the PDFs tab in Marathi menus @mobile", async ({ page }) => {
  await withPdfs(page);
  await openSite(page, SETUPS["marathi-menus"], { now: EVENING });
  await page.locator("#hm").click();
  await expect(page.locator("#jtb button").nth(0)).toHaveAccessibleName("पाठ");
  await expect(page.locator("#jtb button").nth(1)).toHaveAccessibleName("पोथी");
  await page.locator("#jtb button").nth(1).click();
  await expect(page.locator("#jl .pdfg a.pdf").first()).toHaveAccessibleName("दासबोध");
});

test("the Books tab follows Kannada letters and English only", async ({ browser }) => {
  for (const [setup, first] of [["kannada", "ದಾಸಬೋಧ"], ["english", "Dasbodh"]]) {
    const page = await browser.newPage();
    await withPdfs(page);
    await openSite(page, SETUPS[setup], { now: EVENING });
    await page.locator("#hm").click();
    await page.locator("#jtb button").nth(1).click();
    await expect.poll(() => page.locator("#jl .pdfg a.pdf").first().innerText()).toMatch(new RegExp("^" + first + "(\\s|$)"));
    await page.close();
  }
});

test("axe: the PDFs tab, in every theme; 44px tabs", async ({ page }) => {
  await withPdfs(page);
  await openSite(page, SETUPS.both, { now: EVENING });
  await page.locator("#hm").click();
  await page.locator("#jtb button").nth(1).click();
  for (const b of await page.locator("#jtb button").all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect(await axeEveryTheme(page, "#jump")).toEqual(noViolations());
});

// The three text fonts (Settings → Text font, and the same three in the Print pop-up): what each one sets the texts
// in, on screen and in print. Traditional (classic, the default): Tiro Devanagari Marathi, with the Vedic chants in
// Tiro Devanagari Sanskrit; Modern (std): Noto Sans Devanagari; Bold: Noto Serif Devanagari, SemiBold. All three
// draw the Vedic svara marks themselves, so a mark never comes from another font than its letter.
// (css/00-fonts.css, css/07-bottom-bar-folds.css, js/features/print.js pfn())
import { test, expect } from "@playwright/test";
import { openSite, readText, SETUPS } from "./helpers.mjs";
import { stubPrint } from "./print-helpers.mjs";

// the first font a line asks for, and its weight
const look = (page, sel) =>
  page
    .locator(sel)
    .first()
    .evaluate((e) => {
      const s = getComputedStyle(e);
      return [s.fontFamily.split(",")[0].trim().replace(/"/g, ""), s.fontWeight];
    });
// an aarti (a1) and the Atharvashirsha (p1, a Vedic chant), each line of the original
const AARTI = "#a1 .item:not(.dh) .verse .mr p";
const VEDIC = "#p1 .verse .mr p";

const ON_SCREEN = {
  classic: { aarti: ["SC Classic", "400"], vedic: ["Tiro Devanagari Sanskrit", "400"] },
  std: { aarti: ["Noto Sans Devanagari", "400"], vedic: ["Noto Sans Devanagari", "400"] },
  bold: { aarti: ["SC Bold", "600"], vedic: ["SC Bold", "600"] },
};

for (const [fnt, want] of Object.entries(ON_SCREEN))
  test(`on screen, ${fnt}: the aartis and the Vedic chants`, async ({ page }) => {
    await openSite(page, { ...SETUPS.marathi, fnt });
    await readText(page, "a1");
    expect(await look(page, AARTI)).toEqual(want.aarti);
    // the dhrupad stays heavier than the stanzas in every font (Bold sets it ExtraBold)
    const [, dh] = await look(page, "#a1 .rftop p, #a1 .item.rf p");
    expect(Number(dh)).toBeGreaterThan(Number(want.aarti[1]));
    await readText(page, "p1");
    expect(await look(page, VEDIC)).toEqual(want.vedic);
  });

test("a new reader reads in Traditional", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-font"))).toBe("classic");
});

// The printout, through a text's print link: the font picked in the pop-up, else the text font the page is read in
const printed = async (page, prefs, id) => {
  await openSite(page, { por: "up", ...prefs }, { hash: `?print=as&t=${id}` });
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 20_000 });
  // as the printer sees the page (the printout's styles are print styles: css/15-print.css)
  await page.emulateMedia({ media: "print" });
  // a stanza line (the dhrupad at the top is printed bold in every font)
  return look(page, "#pv .pvs .pvsz:not(.pvbold) .pvl.pvo, #pv .pvs .pvpr.pvo");
};

test("in print: the printout follows the text font when none is picked @chromium-only", async ({ page }) => {
  await stubPrint(page);
  expect(await printed(page, { ...SETUPS.marathi, fnt: "std" }, "aarti-sukhkarta")).toEqual(["Noto Sans Devanagari", "400"]);
});

for (const [pfn, aarti, vedic] of [
  ["classic", ["SC Classic", "400"], ["Tiro Devanagari Sanskrit", "400"]],
  ["std", ["Noto Sans Devanagari", "400"], ["Noto Sans Devanagari", "400"]],
  ["bold", ["SC Bold", "600"], ["SC Bold", "600"]],
])
  test(`in print, ${pfn}: an aarti and a Vedic chant as on screen @chromium-only`, async ({ page }) => {
    await stubPrint(page);
    // the reading page in another font: the printout's own choice wins
    const other = pfn === "bold" ? "std" : "bold";
    expect(await printed(page, { ...SETUPS.marathi, fnt: other, pfn }, "aarti-sukhkarta")).toEqual(aarti);
    expect(await printed(page, { ...SETUPS.marathi, fnt: other, pfn }, "vedic-chant-atharvashirsha")).toEqual(vedic);
  });

// The other scripts the original can be shown in, with their faces: Noto Sans in Modern, Noto Serif (named SC … Classic)
// in Traditional and Bold; each draws the Vedic marks on its own letters (css/00-fonts.css)
const SCRIPT_FACES = [
  ["Kannada", "kannada", "Noto Sans Kannada", "SC Kn Classic"],
  ["Telugu", "telugu", "Noto Sans Telugu", "SC Te Classic"],
  ["Gujarati", "gujarati", "Noto Sans Gujarati", "SC Gu Classic"],
];

// in print: their own face in each font, as on screen
for (const [name, setup, sans, serif] of SCRIPT_FACES)
  for (const [pfn, want] of [
    ["std", [sans, "400"]],
    ["classic", [serif, "400"]],
  ])
    test(`in print, ${name} letters, ${pfn} @chromium-only`, async ({ page }) => {
      await stubPrint(page);
      expect(await printed(page, { ...SETUPS[setup], pfn }, "aarti-sukhkarta")).toEqual(want);
    });

// on screen: the sans face in Modern, the serif in Traditional and Bold
for (const [name, setup, sans, serif] of SCRIPT_FACES)
  for (const [fnt, want] of [
    ["std", [sans, "400"]],
    ["classic", [serif, "400"]],
    ["bold", [serif, "600"]],
  ])
    test(`${name} letters, ${fnt}`, async ({ page }) => {
      await openSite(page, { ...SETUPS[setup], fnt });
      await readText(page, "p1");
      expect(await look(page, VEDIC)).toEqual(want);
    });

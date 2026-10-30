// The printout in every engine. Only Chromium can make a PDF (print.spec.mjs reads those back), so in Firefox and
// WebKit (Safari's engine) this checks what the printer is given: after the site's Print button, styled as the printer
// sees it (print media), only the print view (#pv) shows, it holds every text with its contents, and the page rules
// of css/15-print.css (a new page for each text, no block split) are the ones the engine uses.
import { test, expect } from "@playwright/test";
import { openSite, SETUPS, TEXT_COUNT } from "./helpers.mjs";
import { stubPrint, printFromButton, readPrintView } from "./print-helpers.mjs";

for (const W of [
  { name: "one language", prefs: SETUPS.marathi, choice: "pr1", mode: "one" },
  { name: "both side by side", prefs: SETUPS.both, choice: "pr2", mode: "side" },
]) {
  test(`the print view in this engine · ${W.name}`, async ({ page }) => {
    await stubPrint(page);
    await openSite(page, W.prefs);
    await printFromButton(page, W.choice);
    const pv = await readPrintView(page);
    expect(pv.mode).toBe(W.mode);
    expect(pv.pieces).toHaveLength(TEXT_COUNT);
    expect(pv.toc.map((t) => t.id)).toEqual(pv.pieces);
    expect(pv.blocks).toBeGreaterThan(TEXT_COUNT);
    // side by side, each line has its English beside it
    if (W.mode === "side") expect(pv.english.length).toBeGreaterThan(0);
    const got = await page.evaluate(() => {
      const pv = document.getElementById("pv");
      const css = (e) => getComputedStyle(e);
      return {
        shown: css(pv).display !== "none" && pv.getBoundingClientRect().height > 0,
        // nothing but the print view reaches the paper
        others: [...document.body.children].filter((e) => e !== pv && css(e).display !== "none").map((e) => e.id || e.tagName),
        // every text after the contents starts a new page
        newPage: [...pv.querySelectorAll(":scope > section + section")].filter((s) => !/page|always/.test(css(s).breakBefore || css(s).pageBreakBefore)).length,
        // and no block is split (a Vedic paragraph, pvflow, may run on)
        split: [...pv.querySelectorAll(".pvk:not(.pvflow), .pvt tr")].filter((k) => !/avoid/.test(css(k).breakInside || css(k).pageBreakInside)).length,
      };
    });
    expect(got.shown, "the print view shows").toBe(true);
    expect(got.others, "screen-only parts printed").toEqual([]);
    expect(got.newPage, "texts not starting a new page").toBe(0);
    expect(got.split, "blocks that may be split").toBe(0);
  });
}

// What a text prints around its stanzas: the author line with its second line apart, no "3 times" after lines already
// written out three times, and no "↻ dhrupad" between the dhrupad at the top and the first stanza
for (const W of [
  { name: "the dhrupad once", pref: 1 },
  { name: "the dhrupad after every verse", pref: 0 },
]) {
  test(`the notes around a text's stanzas · ${W.name}`, async ({ page }) => {
    await stubPrint(page);
    await openSite(page, { ...SETUPS.english, pref: W.pref });
    await printFromButton(page, "pr1");
    const got = await page.evaluate(() => {
      const sec = (id) => document.querySelector('#pv .pvs[data-sid="' + id + '"]');
      const ks = (id) => [...sec(id).querySelectorAll(".pvk")].map((k) => k.textContent.replace(/\s+/g, " ").trim());
      return {
        credit: sec("a7").querySelector(".pvcr").textContent,
        ghalinEnd: ks("a8").slice(-1)[0],
        vitthalFirst: ks("a7")[0],
      };
    });
    expect(got.credit).toContain("Nama (also credited");
    if (W.pref === 0) expect(got.ghalinEnd).not.toContain("3 times");
    else expect(got.ghalinEnd).toContain("3 times");
    // the first block: the dhrupad at the top, the first stanza and, with the dhrupad once, the one ↻ after it
    expect(got.vitthalFirst.match(/↻/g) || []).toHaveLength(W.pref === 1 ? 1 : 0);
  });
}

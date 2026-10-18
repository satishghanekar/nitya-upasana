// Print audit: every printout a reader can make, kept as a PDF and judged line by line.
//
//   npm run print:audit        (from tests/; a few minutes)
//
// Every combination of what is printed (the view), the page chosen in the Print pop-up (Portrait or
// Landscape), the text font, the dhrupad setting and the paper size is printed exactly as a reader would print
// it, and kept as
//   tests/pdfs/<view>/<portrait|landscape>/<font>-<dhrupad>-<paper>.pdf
// with what the audit found next to it (.json). tests/pdfs/REPORT.md then sums them up
// (print-audit-report.mjs). Each printout must pass the checks every print test makes (contents page
// numbers, nothing split or lost, footers); the line-by-line findings (lines broken mid-phrase, side by side
// out of step, mostly empty pages) are reported, for a person to look at.
//
// Skipped in the normal test run (PRINT_AUDIT is unset): it prints a few hundred PDFs.
import { test } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { printOnce, checkPrintout } from "./print-helpers.mjs";
import { openSite } from "./helpers.mjs";
import { pdfMarks, auditLines } from "./print-audit-helpers.mjs";

test.describe.configure({ mode: "parallel" });
test.skip(!process.env.PRINT_AUDIT, "print audit: run with npm run print:audit");

// What is printed, and the choices the Print pop-up offers for it: Portrait and Landscape for one language (in a
// column either way); Landscape, side by side, for both
const ONE = { portrait: ["pr1", "one"], landscape: ["pr2", "one"] };
const BOTH = { landscape: ["pr2", "side"] };
export const VIEWS = {
  marathi: [{ lang: "mr", lead: "mr", l2: "en" }, ONE],
  kannada: [{ lang: "mr", lead: "mr", l2: "en", ind: "kn" }, ONE],
  english: [{ lang: "en", lead: "mr", l2: "en" }, ONE],
  "english-iast": [{ lang: "en", lead: "mr", l2: "en", tr: "iast" }, ONE],
  "marathi-english": [{ lang: "both", lead: "mr", l2: "en" }, BOTH],
  "kannada-english": [{ lang: "both", lead: "mr", l2: "en", ind: "kn" }, BOTH],
  "marathi-english-iast": [{ lang: "both", lead: "mr", l2: "en", tr: "iast" }, BOTH],
  "english-marathi": [{ lang: "both", lead: "en", l2: "mr" }, BOTH],
  "english-kannada": [{ lang: "both", lead: "en", l2: "mr", ind: "kn" }, BOTH],
};
const FONTS = { standard: "std", classic: "classic", bold: "bold", handwritten: "hand" };
const DHRUPAD = { "dhrupad-once": 1, "dhrupad-every-verse": 0 };
const PAPERS = { letter: ["Letter", "en-US"], a4: ["A4", "en-IN"] };

for (const [view, [prefs, layouts]] of Object.entries(VIEWS))
  for (const [layout, [choice, mode]] of Object.entries(layouts))
    for (const [font, fnt] of Object.entries(FONTS))
      for (const [dh, ref] of Object.entries(DHRUPAD))
        for (const [pp, [paper, locale]] of Object.entries(PAPERS)) {
          const name = `${view}/${layout}/${font}-${dh}-${pp}`;
          test(name, async ({ browser }) => {
            const r = await printOnce(browser, { prefs: { ...prefs, fnt, ref }, choice, mode, paper, locale, save: name + ".pdf", lines: true });
            const a = auditLines(r.marked, await pdfMarks(r.pdf.buf), mode);
            const out = { name, view, layout, font, dhrupad: dh, paper: pp, pages: r.pdf.pages.length, ...a };
            writeFileSync(fileURLToPath(new URL(`./pdfs/${name}.json`, import.meta.url)), JSON.stringify(out, null, 1));
            checkPrintout(r, paper);
          });
        }

// How big each script looks in each text font at the same point size: the numbers behind SCRIPTS in
// js/print/profiles.js. When adding a script or a font, add its families and sample text here and set its
// size so its letters come out about as tall as the others (tests/pdfs/FONT-SIZES.md).
const FAMILIES = {
  deva: { std: '"Noto Sans Devanagari"', classic: '"SC Classic"', bold: '"SC Bold"', hand: '"SC Hand"' },
  knda: { std: '"Noto Sans Kannada"', classic: '"SC Kn Classic"', bold: '"SC Kn Bold"', hand: '"SC Kn Hand"' },
  latn: { std: "Inter", classic: '"SC Classic"', bold: '"SC Bold"', hand: '"SC Hand"' },
};
// ordinary letters, without tall or deep marks: their height is how big the script looks
const LETTERS = { deva: "कमन", knda: "ಕಮನ", latn: "xzu" };
test("font sizes", async ({ page }) => {
  await openSite(page, { lang: "mr" });
  const rows = await page.evaluate(
    async ({ FAMILIES, LETTERS }) => {
      const c = document.createElement("canvas").getContext("2d"),
        out = [];
      for (const [sc, fs] of Object.entries(FAMILIES))
        for (const [f, fam] of Object.entries(fs)) {
          await document.fonts.load(`100px ${fam}`, LETTERS[sc]);
          c.font = `100px ${fam}`;
          const m = c.measureText(LETTERS[sc]);
          out.push([sc, f, Math.round(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)]);
        }
      return out;
    },
    { FAMILIES, LETTERS },
  );
  const md = ["# Font sizes", "", "Height of ordinary letters at 100px, per script and text font (see SCRIPTS in js/print/profiles.js).", "", "| Script | Font | Height |", "|---|---|---|"];
  for (const [sc, f, h] of rows) md.push(`| ${sc} | ${f} | ${h} |`);
  writeFileSync(fileURLToPath(new URL("./pdfs/FONT-SIZES.md", import.meta.url)), md.join("\n") + "\n");
});

// Print, text by text: every text in the Library printed on its own, and checked page by page and line by line.
//
// A text's printed pages depend only on the text and the print choices, never on what else is printed with it
// (js/print/compose.js builds each piece from the texts, and js/print/fit.js sizes each piece by itself). So a text
// that passes here prints the same inside any printout, and print.spec.mjs only checks how a printout is put together
// (the contents page, the browser's menu, Safari, the iPhone).
//
// Each test prints one text, through the print link for just that text (?print=…&t=<id>, read in js/render.js), and
// checks that:
//   - the printout holds that text alone, with no contents page, on upright pages or sideways as chosen
//   - every unbroken block sits on one page and was printed, every page has its footer, every English line is there
//   - no line is lost and none runs past its column (the print audit, print-audit-helpers.mjs)
//   - nothing is set smaller than the fitting allows
//   - in two columns, no line runs past its column
//   - its pages, size, columns, column split and audit counts match its saved result (__snapshots__/print-items.spec.mjs/)
//
// The tests are generated from content/library.json, so a new text gets its tests, and the first run saves its result
// (look at its PDF once: SAVE_PDFS=1 keeps it in tests/pdfs/). Every test is tagged @text:<id>, so one text's tests
// run alone:
//   npx playwright test print-items.spec.mjs --grep "@text:sukhkarta "
// and npm run quick does that for every text whose file changed (tests/quick.mjs). PDFs can only be made by Chromium.
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { SETUPS, SNAP_ENV } from "./helpers.mjs";
import { printText, checkPages } from "./print-helpers.mjs";
import { pdfMarks, auditLines } from "./print-audit-helpers.mjs";

test.describe.configure({ mode: "parallel" });

const LIBRARY = JSON.parse(readFileSync(new URL("../content/library.json", import.meta.url), "utf8")).texts;

// How each text is printed: Marathi and English on upright pages, both languages side by side on sideways pages,
// in the printout's default font (Best for each text: Classic, and Tiro Devanagari Sanskrit for a Vedic text) on A4
const VIEWS = [
  { name: "marathi-portrait", prefs: SETUPS.marathi, mode: "one" },
  { name: "english-portrait", prefs: SETUPS.english, mode: "one" },
  { name: "both-landscape", prefs: { ...SETUPS.both, por: "land" }, mode: "side" },
];
// The four fonts the Print pop-up offers besides, and the other scripts, on the hardest texts only (all texts in every font: npm run print:audit):
// the longest aarti lines side by side, Shree Rudra side by side, a Vedic text in Kannada letters and in IAST
const HARD = [
  { id: "yei-o-vitthale", name: "both-landscape", prefs: { ...SETUPS.both, por: "land" }, mode: "side" },
  { id: "shree-rudra", name: "both-landscape", prefs: { ...SETUPS.both, por: "land" }, mode: "side" },
  { id: "atharvashirsha", name: "kannada-portrait", prefs: SETUPS.kannada, mode: "one" },
  { id: "atharvashirsha", name: "iast-portrait", prefs: SETUPS["english-iast"], mode: "one" },
];
const FONTS = ["std", "classic", "bold", "hand"];
// The smallest a line may be set, against its size before fitting, for every reason together (LAYOUT.floor in
// js/print/profiles.js)
const SMALLEST = 0.8;

const CASES = [
  ...LIBRARY.flatMap((t) => VIEWS.map((v) => ({ ...v, id: t.id, fnt: "" }))),
  ...HARD.flatMap((h) => FONTS.map((fnt) => ({ ...h, fnt }))),
];

for (const c of CASES) {
  const name = c.fnt ? `${c.name}-${c.fnt}` : c.name;
  test(`${c.id} · ${name} @text:${c.id} @chromium-only`, async ({ browser }) => {
    const r = await printText(browser, { id: c.id, prefs: c.fnt ? { ...c.prefs, pfn: c.fnt } : c.prefs, mode: c.mode, paper: "A4", locale: "en-IN" });
    expect(r.errors, "no script errors").toEqual([]);
    expect(r.pv.mode, "print mode set on the page").toBe(c.mode);
    expect(r.pv.pieces, "that text alone").toEqual(r.sids);
    expect(r.sids).toHaveLength(1);
    expect(r.pv.toc, "no contents page for one text").toEqual([]);
    expect(r.pdf.landscape, "sideways pages side by side, upright pages otherwise").toBe(c.mode === "side");
    checkPages(r);
    const a = auditLines(r.marked, await pdfMarks(r.pdf.buf), c.mode);
    // a failure names the lines, so it can be understood from the log alone
    const which = (kind) => kind + ": " + a.findings.filter((f) => f.kind.startsWith(kind)).slice(0, 12).map((f) => `\n  ${f.lines || ""} ${f.text}`).join("");
    expect(a.missing, which("text missing")).toBe(0);
    expect(a.overflow, which("runs past its column")).toBe(0);
    expect(r.past, "lines running past their column in two columns").toBe(0);
    const size = Math.round((a.smallest / 100) * r.zoom * 100) / 100;
    expect(size, "the smallest line's size against its size before fitting").toBeGreaterThanOrEqual(SMALLEST - 0.005);
    const result = {
      pages: r.pdf.pages.length,
      // its first column's size as printed, in points
      pt: Math.round(r.pt * r.zoom * 10) / 10,
      size,
      zoom: r.zoom,
      ...(r.cols === 2 ? { cols: 2 } : {}),
      ...(r.split ? { split: r.split } : {}),
      lines: a.lines,
      resized: a.resized,
      wrapped: a.wrapped,
      brokeMidPhrase: a.brokeMidPhrase,
      outOfStep: a.outOfStep,
      lowFill: a.lowFill,
      ...(r.pv.tall.length ? { tall: r.pv.tall.length } : {}),
    };
    expect(JSON.stringify(result, null, 1)).toMatchSnapshot([SNAP_ENV, c.id, `${name}.json`]);
  });
}

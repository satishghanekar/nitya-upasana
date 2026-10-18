// Print typography: every number the print layout chooses sizes with, in one place
// Read by js/print/fit.js. The sizes of each part of a printout (a stanza line, the English under it, a
// heading) are set by the print styles (css/03-menus-print-view.css); this file says how each script may
// be adjusted from there to fit the paper, so that lines stay whole and side by side stays in step.
//
// To print a new language or script, nothing here is required: the fitting measures the actual text, in the
// reader's font, on the paper as it is turned, and works out each line's script from its letters (scriptOf).
// A script with no entry in SCRIPTS is set at its styled size and may shrink as much as the others. Give it
// an entry only when npm run print:audit ("font sizes") shows it looks larger or smaller than the others.

// Each script the printed text can be in:
//   size:   its size against the print styles' size for that line (1 = as styled), in the standard font.
//           A script whose letters look large for their point size is set a little smaller, so that on
//           paper it looks the size of the others.
//   font:   the same, for the other text fonts (Settings → Text font) where they differ from size: the
//           fonts of one script are not all drawn the same size. Measured, not guessed: the height of the
//           script's ordinary letters at one point size (tests/print-audit.spec.mjs prints the table:
//           "font sizes"). At the same point size Devanagari is about 63 in every font, while Kannada is
//           80 (standard), 82 (classic), 74 (bold) and 54 (handwritten). Kannada is set to look a little
//           larger than Devanagari, about 70 (its letters read better a little larger); the handwritten
//           one is drawn small but wide, so it stays at its own size: any larger and its lines no longer
//           fit beside their English (checked with npm run print:audit).
//   minFit: the smallest the fitting may set a piece in it, against that size, to keep a line whole
//           (0.85: never more than 15% smaller). A line that would need more wraps instead, at a
//           preferred break where it has one.
export var SCRIPTS = {
  deva: { size: 1, minFit: 0.85 }, // Devanagari: Marathi, Hindi, Sanskrit
  knda: { size: 0.9, font: { classic: 0.86, hand: 1 }, minFit: 0.85 }, // Kannada letters (Settings → Main language → ಕನ್ನಡ)
  latn: { size: 1, minFit: 0.85 }, // English, in either spelling (simple or IAST)
};

// The size a script is set at in a text font (std, classic, bold or hand)
export function sizeOf(sc, fnt) {
  return (sc.font && sc.font[fnt]) || sc.size;
}

// Which script a printed text is in, from its letters: each Indian script has its own block of 128 Unicode
// letters, in this order from U+0900 (Devanagari) to U+0D7F (Malayalam), and anything else counts as Latin.
// The script with the most letters wins (an English word inside Kannada text does not change it).
var BLOCKS = ["deva", "beng", "guru", "gujr", "orya", "taml", "telu", "knda", "mlym"];
export function scriptOf(text) {
  var n = {},
    top = "latn";
  n.latn = 0;
  for (var i = 0; i < text.length; i++) {
    var c = text.charCodeAt(i),
      k = c >= 0x900 && c < 0xd80 ? BLOCKS[(c - 0x900) >> 7] : /[A-Za-z\u00c0-\u024f\u1e00-\u1eff]/.test(text[i]) ? "latn" : "";
    if (!k) continue;
    n[k] = (n[k] || 0) + 1;
    if (n[k] > n[top]) top = k;
  }
  return top;
}

// A script with no entry above
export var OTHER = { size: 1, minFit: 0.85 };

// The Print pop-up offers Portrait and Landscape for one language, which prints in a column (prose pieces as
// running paragraphs) on either. The original with its English prints side by side on Landscape only: stacked
// (one above the other, upright) took 21 to 27 pages against 16 to 21 side by side, so it is no longer offered
// (Satish, 2026-10). page: the choice focused until the reader has chosen one (P.por), from npm run print:audit
// (every font, dhrupad setting and paper):
//   - one language: upright has no wrapped lines and the largest text, in about 13 pages, for English, Marathi
//     and Kannada alike;
//   - both languages: side by side, sideways, has its rows in step and almost nothing wrapped, in about 18 pages.
// A new language is checked the same way, and gets its own entry here (keyed by P.ind) only if it differs.
export var CHOICE = {
  one: { page: "up" },
  both: { page: "land" },
};

export var LAYOUT = {
  // Side by side: the share of the width the original's column may take. For each piece, the fitting tries
  // every share in this range (in steps of 1%) and keeps the one that leaves the fewest rows out of step.
  // (One share for a whole piece, so its dividing rule runs straight down every page of it.)
  side: { min: 0.36, max: 0.62, step: 0.01 },
  // Side by side: a line written in two lines in one language is broken in the other too, at its preferred
  // break nearest the same place: no further from it than this share of the line (fit.js, step 1b)
  matchBreak: 0.25,
  // A line counts as fitting only with this much to spare. The page-sized copy the text is measured in
  // predicts the paper to within 1% on one computer (checked against Chrome's PDFs: a line measured at 99% of its column
  // never wrapped on paper, one at 101% always did), so 2% is kept spare. (The print styles turn font hinting off,
  // text-rendering: geometricPrecision: with it on, Linux printed the same words up to 3% wider or narrower,
  // depending on the computer's font settings, while the copy measured the same everywhere.)
  margin: 0.98,
  // Pages: a piece is set smaller as a whole (to no less than this) when that makes it take fewer pages:
  // when it would spill a little onto another page, or its stanzas are too big to share a page.
  page: { minZoom: 0.8 },
  // How bad each outcome is, when choosing sizes. A row out of step side by side is the worst (the reader
  // loses their place), then a line broken in the middle of a phrase, then a line that wraps at a
  // preferred break; setting a piece smaller costs a little for every 1% (shrink, per 1%).
  cost: { outOfStep: 10, midPhrase: 3, wrap: 1, shrink: 0.04 },
};

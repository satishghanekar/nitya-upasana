// @ts-check
// Print: about how many pages a printout takes, for the Print pop-up ("about 12 pages", and the hints' "about 2 pages
// more"). js/features/print.js lays the printout out in a hidden frame as wide as the page's text and hands its blocks'
// places here; the pages are broken by the four rules of css/15-print.css ("Pages"): every text starts a page, a block
// is never split, a title stays with what follows it, and a Vedic paragraph splits between lines, never leaving one
// line alone. Chrome breaks the same way; Safari prints a little smaller, so it often takes a page fewer.
// Pure functions only (no page), so the unit tests (tests/unit/pages.test.mjs) run them in Node.

/**
 * A block of the printout as laid out in one long column: its top and bottom (px), whether it stays with the block
 * after it (a title), and for a paragraph that may be split between pages, the height of its lines
 * @typedef {{ top: number, bottom: number, keep?: boolean, line?: number }} Block
 */

// (a pixel either way: the places are measured, the page's height worked out from millimetres)
var EPS = 1;

/**
 * The pages a printout takes
 * @param {Block[][]} texts each text's blocks, in order (each text starts on a new page)
 * @param {number} h the height of a page's text (px)
 * @returns {number}
 */
export function countPages(texts, h) {
  var pages = 0;
  texts.forEach(function (bs) {
    if (!bs.length) return;
    pages++;
    var start = bs[0].top; // where the page being filled starts
    bs.forEach(function (b, i) {
      if (b.bottom - start <= h + EPS) return;
      // a paragraph of at least four lines may split: two at the foot of a page at least, two at the top of the next
      var line = b.line && (b.bottom - b.top) / b.line >= 3.5 ? b.line : 0,
        top = b.top, // the top of what is still to be placed
        prev = bs[i - 1];
      // to the next page (unless it already starts one, or two of its lines fit here), the title before it along
      if (b.top > start + EPS && !(line && Math.floor((start + h - top) / line + 0.01) >= 2)) {
        pages++;
        start = prev && prev.keep && prev.top > start + EPS ? prev.top : b.top;
      }
      // what is taller than what is left of the page runs on: a paragraph by whole lines, anything else at the foot
      while (b.bottom - start > h + EPS) {
        var fit = line ? Math.min(Math.floor((start + h - top) / line + 0.01), Math.round((b.bottom - top) / line) - 2) : 0;
        if (fit >= 2) top += fit * line;
        else if (!line || top <= start + EPS) top = start + h;
        pages++;
        start = top;
      }
    });
  });
  return pages;
}

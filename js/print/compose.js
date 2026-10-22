// Print: the pieces to print, built from the texts (CONTENT) rather than copied from the reading page
// Called by js/features/print.js each time it builds the print view. The reading page shows one text at a time
// and hides the rest in several ways (Home, a session being read, folded sections), so print no longer copies it:
// each piece is built here as the reading page builds it (js/render.js renderPiece), and the same steps the page
// runs at start-up are run on this copy, in the same order:
//   the chosen script (Kannada letters: SCR.el), the English style (IAST: englishStyle), the grid places of
//   stanzas and lines (gridItems), the tappable dhrupad markers (markTappable), the stanza numbers (numberStanzas),
//   the preferred line breaks (breakLines), and the two languages in the order chosen (leadOrder).
// The copy sits in the page, out of sight, while the print view is built (the print styles decide what is shown
// from the page's settings, as for the reading page), and is removed straight after.
import { P, LEAD } from "../core/state.js";
import { englishStyle } from "../text/iast.js";
import { gridItems } from "../text/layout.js";
import { markTappable } from "../text/dhrupad-markers.js";
import { numberStanzas } from "../text/stanza-numbers.js";
import { breakLines } from "../text/line-breaks.js";
import { leadOrder } from "../features/bars.js";
import { dv } from "../core/words.js";

/**
 * Every piece, in reading order, and the Library categories they are listed under in the printed contents.
 * @param {string[] | null} [ids]  only these texts (their Library ids), still in reading order; without it, every text
 * @param {string} [lang]  the language printed (P.lang's values: mr, en or both); without it, as the page shows it
 * @param {boolean} [ordered]  a routine printout (print redesign P5): the texts in the order given, not the Library's,
 *   numbered 1, 2, 3… in that order, as one group
 * @returns {{ el: HTMLElement, secs: HTMLElement[], groups: { name: HTMLElement[], secs: HTMLElement[] }[] }}
 */
export function compose(ids, lang, ordered) {
  /** @type {any} */
  var w = window,
    C = w.CONTENT,
    el = document.createElement("div");
  // a list naming no text in the Library (an old print link) prints everything
  if (
    ids &&
    !C.categories.some(function (/** @type {any} */ g) {
      return g.pieces.some(function (/** @type {any} */ p) {
        return ids.indexOf(p.text) >= 0;
      });
    })
  )
    ids = null;
  var cats = C.categories.map(function (/** @type {any} */ g) {
    return {
      name: g.name,
      pieces: g.pieces.filter(function (/** @type {any} */ p) {
        return !ids || ids.indexOf(p.text) >= 0;
      }),
    };
  });
  if (ordered && ids) {
    /** @type {any[]} */
    var all = [];
    cats.forEach(function (/** @type {any} */ g) {
      all = all.concat(g.pieces);
    });
    var list = /** @type {string[]} */ (ids);
    cats = [
      {
        name: { mr: "", en: "" },
        pieces: list
          .map(function (id) {
            return all.filter(function (p) {
              return p.text === id;
            })[0];
          })
          .filter(Boolean)
          .map(function (/** @type {any} */ p, /** @type {number} */ i) {
            // its number in this printout (the copy only: CONTENT keeps the Library's)
            var n = i + 1;
            return Object.assign({}, p, { no: { mr: dv(n) + ".", en: n + "." } });
          }),
      },
    ];
  }
  el.id = "pvsrc";
  el.setAttribute("aria-hidden", "true");
  // out of sight and out of the page's flow, but laid out, so the print styles' choices can be read from it
  el.style.cssText = "position:absolute;left:-10000px;top:0;width:800px;visibility:hidden;pointer-events:none";
  el.innerHTML = cats
    .map(function (/** @type {any} */ g) {
      return g.pieces
        .map(function (/** @type {any} */ p) {
          return w.renderPiece(p, C);
        })
        .join("");
    })
    .join("");
  /** @type {HTMLElement[]} */
  var secs = [].slice.call(el.querySelectorAll(":scope > .ash"));
  secs.forEach(function (s) {
    w.SCR.el(s);
  });
  englishStyle(el);
  gridItems(el);
  markTappable(el);
  numberStanzas(el);
  breakLines(el);
  leadOrder(el.querySelectorAll(".verse, .ash header h2"), LEAD);
  secs.forEach(function (s) {
    s.setAttribute("data-lang", lang || P.lang);
  });
  var at = 0,
    groups = cats.map(function (/** @type {any} */ g) {
      // the category's name in both languages, as a piece's title is shown
      var row = document.createElement("div");
      row.innerHTML = '<span class="mr">' + g.name.mr + '</span><span class="en" lang="en">' + g.name.en + "</span>";
      w.SCR.el(row);
      var mine = secs.slice(at, at + g.pieces.length);
      at += g.pieces.length;
      return { name: [].slice.call(row.children), secs: mine };
    });
  document.body.appendChild(el);
  return { el: el, secs: secs, groups: groups };
}

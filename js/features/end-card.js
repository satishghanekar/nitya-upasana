// The card at the end of the text being read (#endc): one text is read at a time (.solo, js/features/history.js), so
// the next one no longer runs on below it. The card says where to go from here:
// - from the Library, search or the side menu: Next and Previous in the Library's order (the piece's own .pn links);
// - in a session (Start, or a text of Home's list): where you are ("Evening session · 2 of 4") and Done · next, which
//   ticks the text and opens the next one, as Next › in the bottom bar does; on the last text, Back to Home.
// The card sits after the piece in the page, not inside it, so Print (which copies the pieces) never prints it.
// Drawn again by endCard() whenever the bottom bar's labels change (js/features/bottom-bar.js asLabel(): another
// piece, a session started, another menu language).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "../core/state.js";
import { dv, esc, lead } from "../core/words.js";
import { runAt, sessionStep } from "./today-card.js";
import { pieceData } from "../core/page.js";
import { titleText } from "../text/iast.js";

const W = {
  en: {
    card: "End of the text",
    next: "Next",
    prev: "Previous",
    doneNext: "Done · next",
    /** @param {string} s */
    ended: function (s) {
      return "Done · the " + s.toLowerCase() + " session is complete";
    },
    home: "Back to Home",
    /** @param {string} s @param {number} i @param {number} n */
    pos: function (s, i, n) {
      return s + " session · <b>" + i + " of " + n + "</b>";
    },
  },
  mr: {
    card: "रचनेचा शेवट",
    next: "पुढील",
    prev: "मागील",
    doneNext: "झाले · पुढील",
    /** @param {string} s */
    ended: function (s) {
      return "झाले · " + s + "ची उपासना पूर्ण";
    },
    home: "मुखपृष्ठावर परत",
    /** @param {string} s @param {number} i @param {number} n */
    pos: function (s, i, n) {
      return s + " · <b>" + dv(n) + " पैकी " + dv(i) + "</b>";
    },
  },
};

const NEXT = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const PREV = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const TICK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const HOME = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.6 12 3.5l9 7.1"/><path d="M5.2 9v11h13.6V9"/></svg>';

/** @type {HTMLElement | null} */
var card = null;

/** A text's title as its heading shows it, in the first reading language, with its number (४. शंकराची आरती), even
 * when it has not been opened yet (js/core/page.js) */
/** @param {string} sec @param {boolean} num */
function title(sec, num) {
  /** @type {any} */
  var p = pieceData(sec);
  if (!p) return "";
  var en = lead() === "en";
  return (num ? (en ? p.no.en : /** @type {any} */ (window).SCR.to(p.no.mr)) + " " : "") + titleText(sec, en);
}

/**
 * One button of the card
 * @param {string} dir "next" or "prev" @param {string} icon @param {string} small @param {string} big
 * @param {boolean} main  the large one @param {boolean} after  the icon after the words (an arrow pointing on)
 */
function button(dir, icon, small, big, main, after) {
  return (
    '<button type="button" class="ecb' + (main ? " ecm" : "") + '" data-ec="' + dir + '">' +
    (after ? "" : icon) +
    '<span class="ect"><small>' + small + "</small><span>" + esc(big) + "</span></span>" +
    (after ? icon : "") +
    "</button>"
  );
}

export function endCard() {
  if (!card) return;
  var el = /** @type {HTMLElement | null} */ (document.querySelector("#main > .ash.solo")),
    w = P.ui === "mr" ? W.mr : W.en,
    h = "";
  if (el) {
    var r = runAt(el.id);
    if (r) {
      h += '<div class="ecpips" aria-hidden="true">' + r.done.map(function (d, k) {
        return '<i class="' + (k === r.i ? "c" : d ? "d" : "") + '"></i>';
      }).join("") + "</div>";
      h += '<p class="ecpos">' + w.pos(esc(r.name), r.i + 1, r.n) + "</p>";
      if (r.i < r.n - 1) h += button("next", TICK, w.doneNext, title(r.secs[r.i + 1], false), true, false);
      else h += button("next", HOME, w.ended(r.name), w.home, true, false);
      if (r.i > 0) h += button("prev", PREV, w.prev, title(r.secs[r.i - 1], false), false, false);
    } else {
      var nx = /** @type {HTMLElement | null} */ (el.querySelector(".pn a.next")),
        pv = /** @type {HTMLElement | null} */ (el.querySelector(".pn a.prev"));
      if (nx && nx.dataset.go) h += button("next", NEXT, w.next, title(nx.dataset.go, true), true, true);
      if (pv && pv.dataset.go) h += button("prev", PREV, w.prev, title(pv.dataset.go, true), false, false);
    }
  }
  card.hidden = !h;
  card.lang = P.ui === "mr" ? "mr" : "en";
  card.setAttribute("aria-label", w.card);
  card.innerHTML = h;
  // right after the text being read (the other pieces are not shown, so it ends the page)
  if (el && card.previousElementSibling !== el) el.after(card);
}

// The card's buttons: in a session they step through it (ticking the text going forwards); otherwise they follow
// the piece's own Previous / Next links, as the bottom bar does
/** @param {string} dir */
function go(dir) {
  var el = document.querySelector("#main > .ash.solo");
  if (!el) return;
  var ss = sessionStep(el.id, dir === "prev" ? -1 : 1);
  if (ss) return ss.go();
  var a = /** @type {HTMLElement | null} */ (el.querySelector(".pn a." + (dir === "prev" ? "prev" : "next")));
  if (a) a.click();
}

export function init() {
  var main = document.getElementById("main");
  if (!main) return;
  card = document.createElement("nav");
  card.id = "endc";
  card.hidden = true;
  main.appendChild(card);
  card.addEventListener("click", function (e) {
    var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest("[data-ec]"));
    if (b) go(b.getAttribute("data-ec") || "next");
  });
}

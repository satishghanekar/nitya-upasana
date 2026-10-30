// Page basics: the <html> element, the short message (flash), and the pieces on the reading page
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "./state.js";

/** @type {HTMLElement} */
export var root;
/** @type {HTMLElement | null} */
export var bt;
// The pieces built so far (pieceEl), in reading order. Only the text being read is shown (.solo, css/10-today.css),
// so a piece is built the first time it is opened, not all of them at start-up.
/** @type {HTMLElement[]} */
export var secs = [];
/** @type {((sec: HTMLElement) => void)[]} */
var steps = [];
/** @type {Record<string, number>} */
var at = {};
/** @type {any[]} */
var order = [];

export function init() {
  root = document.documentElement;
  // Safari and every iOS browser (WebKit) need a different print layout trick; mark them with class "wk"
  (function (u) {
    if (/AppleWebKit/.test(u) && !/Chrome\/|Chromium|Edg\/|OPR\//.test(u)) root.classList.add("wk");
  })(navigator.userAgent);
  bt = document.getElementById("bt");
  // every piece in reading order: by category, as the Library lists them (js/text/content.js)
  /** @type {any} */
  var C = /** @type {any} */ (window).CONTENT;
  secs = [];
  steps = [];
  at = {};
  order = [];
  if (C)
    C.categories.forEach(function (/** @type {any} */ c) {
      c.pieces.forEach(function (/** @type {any} */ p) {
        at[p.id] = order.length;
        order.push(p);
      });
    });
}

/**
 * What a part does to each piece when it is built: the steps the parts used to run over every piece at start-up
 * (the English style, grid places, stanza numbers, line breaks, the fold button…), in the order the parts start.
 * A piece built before a part starts (the one opened at start-up) gets that part's step straight away.
 * @param {(sec: HTMLElement) => void} fn
 */
export function onPiece(fn) {
  steps.push(fn);
  secs.slice().forEach(function (s) {
    fn(s);
  });
}

/**
 * The element with this id. A piece (a3) not opened before is built first, from CONTENT (js/render.js renderPiece,
 * with the pieces before and after it for its Previous / Next), in the chosen script, and each part's step is run on it.
 * @param {string} id
 * @returns {HTMLElement | null}
 */
export function pieceEl(id) {
  if (!id) return null;
  var el = document.getElementById(id);
  if (el || !(id in at)) return el;
  /** @type {any} */
  var w = window,
    i = at[id],
    // in reading order, before the next piece built so far (or where index.html keeps their place, #pieces)
    next = secs.filter(function (s) {
      return at[s.id] > i;
    })[0],
    mark = next || /** @type {HTMLElement} */ (document.getElementById("pieces"));
  mark.insertAdjacentHTML("beforebegin", w.renderPiece(order[i], w.CONTENT, order[i - 1], order[i + 1]));
  el = /** @type {HTMLElement} */ (mark.previousElementSibling);
  w.SCR.add(el);
  secs.splice(next ? secs.indexOf(next) : secs.length, 0, el);
  steps.forEach(function (f) {
    f(/** @type {HTMLElement} */ (el));
  });
  return el;
}

// Short message near the top of the screen (Marathi text m, English text e). It has its own element,
// separate from the text-size bubble, so a pinch can't wipe it and screen readers hear it on its own.
export function flash(m, e, ms) {
  var x = document.getElementById("fl");
  x.textContent = P.ui === "en" ? e : m;
  x.classList.remove("err");
  x.classList.add("on");
  clearTimeout(flash.t);
  flash.t = setTimeout(function () {
    x.classList.remove("on");
  }, ms || 1600);
}

/** The short message, already in the menu language (words from js/core/strings.js menuWords())
 * @param {string} text @param {number} [ms] */
export function note(text, ms) {
  flash(text, text, ms);
}

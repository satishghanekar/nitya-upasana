// @ts-check
// A text sung in more than one way (content/library.json "versions"; Satish, 2026-11-15: the Hanuman Chalisa as
// Tulsidas wrote it and as it is commonly sung). Each version is a text file of its own; js/text/content.js builds a
// piece from each, all with the text's id, and this part puts the one the person chose (P.ver, text id → file id) in
// the text's place in CONTENT, so the Library, sessions, Go to, search, print and Follow all read that one. The switch
// under the title (js/render.js) changes it; the text is built again where it stands.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P, change } from "../core/state.js";
import { replacePiece } from "../core/page.js";

export function init() {
  useVersions();
  document.addEventListener("click", function (e) {
    var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest(".ver button[data-ver]"));
    var sec = b && b.closest("section");
    if (!b || !sec || b.getAttribute("aria-pressed") === "true") return;
    var id = sec.id,
      text = textOf(id),
      ver = /** @type {string} */ (b.dataset.ver);
    if (!text) return;
    /** @type {Record<string, string>} */
    var all = Object.assign({}, P.ver);
    all[text] = ver;
    change({ ver: all }, function () {
      useVersions();
      // the switch was built again with its text: the button pressed keeps the focus
      var now = /** @type {HTMLElement | null} */ (document.querySelector("#" + id + ' .ver button[data-ver="' + ver + '"]'));
      if (now) now.focus();
    });
  });
}

/** The id of the text a piece on the page is (its section id is the piece's, a3 for an older text) @param {string} id */
function textOf(id) {
  /** @type {any} */
  var C = /** @type {any} */ (window).CONTENT;
  for (var t in (C && C.versions) || {}) if (C.versions[t][0].piece.id === id) return t;
  return "";
}

/**
 * Every text with versions shows the one its reader chose (the text's own, as Tulsidas wrote it, until they choose
 * another, or when the one chosen is no longer there). Run at start-up and whenever P.ver may have changed: the
 * switch, another person on this phone (js/features/profiles.js).
 */
export function useVersions() {
  /** @type {any} */
  var C = /** @type {any} */ (window).CONTENT;
  if (!C || !C.versions) return;
  var mine = P.ver || {};
  for (var t in C.versions) {
    var all = C.versions[t],
      v =
        all.filter(function (/** @type {any} */ x) {
          return x.ver === mine[t];
        })[0] || all[0];
    put(C, v.piece);
  }
}

/** The piece in its text's place, if another version was there @param {any} C @param {any} p */
function put(C, p) {
  C.categories.forEach(function (/** @type {any} */ c) {
    c.pieces.forEach(function (/** @type {any} */ q, /** @type {number} */ i) {
      if (q.id !== p.id || q === p) return;
      c.pieces[i] = p;
      // the parts that keep a copy of the pieces (Go to's outline, search's index, Follow's texts) take the new one,
      // then the text is built again, if it was
      document.dispatchEvent(new CustomEvent("nitya-version", { detail: { piece: p } }));
      replacePiece(p);
    });
  });
}

// Current piece, menus and apply()
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { secs } from "./page.js";
import { P, change } from "./state.js";
import { mark } from "../features/bars.js";

export var pn, aa, jp, LANGS;

export function init() {
  pn = document.getElementById("panel");
  aa = document.getElementById("aa");
  jp = document.getElementById("jump");
  // The languages a piece can be read in: n is the name in its own script
  LANGS = {
    mr: { n: "मराठी" },
    en: { n: "English" },
    kn: { n: "ಕನ್ನಡ" },
  };
  // Each piece has a ⌃ button in its heading that folds it down to the heading
  if (!Array.isArray(P.af)) P.af = [];
  secs.forEach(function (x) {
    var h = x.querySelector("header");
    if (!h) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "afb";
    b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';
    b.onclick = function () {
      var y = h.getBoundingClientRect().top,
        af = P.af.slice(),
        i = af.indexOf(x.id);
      if (i >= 0) af.splice(i, 1);
      else af.push(x.id);
      change({ af: af }, foldSet);
      // keep the heading where it was on screen
      scrollBy(0, h.getBoundingClientRect().top - y);
      mark();
    };
    h.appendChild(b);
    // One-hand use: a tap anywhere on the heading folds or opens the piece, not only on ⌃
    // (the ⌃ stays for keyboards and screen readers; links in the heading still work)
    h.addEventListener("click", function (e) {
      if (e.target.closest("a,button,input") || String(getSelection()).trim()) return;
      b.onclick();
    });
  });
}

// The page has two places for text: the original ("mr", which shows Marathi or, in Kannada letters, Kannada)
// and English ("en"). P.lead, P.l2 and P.lang name the place; LK gives the language in it.
export function LK(slot) {
  return slot === "mr" ? P.ind : slot;
}

// The piece being read: the last one whose top has passed just under the top bar
export function cur() {
  var c = null,
    y = 90;
  secs.forEach(function (x) {
    if (x.offsetParent !== null && x.getBoundingClientRect().top <= y) c = x;
  });
  // a short text read on its own on a wide screen (.solo, css/10-today.css) may never reach the top: it is still the one
  var s = !c && document.querySelector(".ash.solo"),
    h = document.getElementById("home");
  if (s && s.offsetParent !== null && h && h.offsetParent === null) c = s;
  return c;
}

export function foldSet() {
  var mr = P.ui === "mr";
  // each piece's ⌃ is named by what it does, with aria-expanded giving the state
  secs.forEach(function (x) {
    var f = P.af.indexOf(x.id) >= 0,
      ab = x.querySelector(".afb");
    x.classList.toggle("af", f);
    if (ab) {
      ab.setAttribute("aria-expanded", String(!f));
      ab.setAttribute("aria-label", f ? (mr ? "उघडा" : "Show this piece") : mr ? "मिटवा" : "Fold this piece");
    }
  });
}

// Going to a piece (or a line in it) opens it if it is folded
export function unfold(el) {
  var sec = el && el.closest && el.closest(".ash");
  if (sec && P.af.indexOf(sec.id) >= 0)
    change(
      {
        af: P.af.filter(function (x) {
          return x !== sec.id;
        }),
      },
      foldSet,
    );
}

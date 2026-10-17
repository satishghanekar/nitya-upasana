// Current piece, menus and apply()
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { root, secs } from "./page.js";
import { P, save } from "./state.js";
import { apply, mark } from "../features/bars.js";

export var pn, aa, jp, hb, LANGS;
var allB;

export function init() {
  pn = document.getElementById("panel");
  aa = document.getElementById("aa");
  jp = document.getElementById("jump");
  hb = document.getElementById("home-btn");
  // The languages a piece can be read in: n is the name in its own script
  LANGS = {
    mr: { n: "मराठी" },
    en: { n: "English" },
    kn: { n: "ಕನ್ನಡ" },
  };
  // Pooja section fold: the pieces between the Pooja and Aarti headings get class "pj"; folding hides them.
  // Going to a Pooja piece (Contents, search, Previous, a link) opens the section again.
  (function () {
    var e = document.getElementById("g-pooja");
    while (e && (e = e.nextElementSibling) && !e.classList.contains("grp")) {
      if (e.classList.contains("ash")) e.classList.add("pj");
    }
    // The same for the Aarti section: its pieces get class "ar"
    e = document.getElementById("g-aarti");
    while (e && (e = e.nextElementSibling) && !e.classList.contains("grp")) {
      if (e.classList.contains("ash")) e.classList.add("ar");
    }
  })();
  // Open all / Fold all: a pill in a section row (beside its arrow) folds or opens every piece in that section.
  // Shown only for sections with two or more pieces (Aarti today; Pooja has one), and not while the section
  // itself is folded. It reads "Fold all" while any piece is open, "Open all" when all are folded.
  allB = [];
  [["g-pooja", "pj", "pf"], ["g-aarti", "ar", "xf"]].forEach(function (a) {
    var g = document.getElementById(a[0]),
      ps = secs.filter(function (x) {
        return x.classList.contains(a[1]);
      });
    if (!g || ps.length < 2) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "allb";
    b.onclick = function () {
      var y = g.getBoundingClientRect().top,
        open = b.dataset.open === "1";
      ps.forEach(function (x) {
        var i = P.af.indexOf(x.id);
        if (open && i >= 0) P.af.splice(i, 1);
        if (!open && i < 0) P.af.push(x.id);
      });
      save();
      pfSet();
      scrollBy(0, g.getBoundingClientRect().top - y);
      mark();
    };
    g.appendChild(b);
    allB.push({ b: b, ps: ps, k: a[2] });
  });
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
        i = P.af.indexOf(x.id);
      if (i >= 0) P.af.splice(i, 1);
      else P.af.push(x.id);
      save();
      pfSet();
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
  document.getElementById("tfb").onclick = function () {
    P.tf = P.tf ? 0 : 1;
    save();
    pfSet();
  };
  [["pfb", "g-pooja", "pf"], ["xfb", "g-aarti", "xf"]].forEach(function (a) {
    document.getElementById(a[0]).onclick = function () {
      var g = document.getElementById(a[1]),
        y = g.getBoundingClientRect().top;
      P[a[2]] = P[a[2]] ? 0 : 1;
      save();
      apply();
      // keep the heading where it was on screen
      scrollBy(0, g.getBoundingClientRect().top - y);
    };
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
  return c;
}

function allSet() {
  var mr = P.ui === "mr";
  allB.forEach(function (o) {
    var open = o.ps.every(function (x) {
      return P.af.indexOf(x.id) >= 0;
    });
    o.b.dataset.open = open ? "1" : "0";
    o.b.hidden = !!P[o.k];
    o.b.lang = mr ? "mr" : "en";
    o.b.textContent = open ? (mr ? "सर्व उघडा" : "Open all") : mr ? "सर्व मिटवा" : "Fold all";
  });
}

export function pfSet() {
  var mr = P.ui === "mr",
    tb = document.getElementById("tfb");
  if (P.tf) root.setAttribute("data-tf", "1");
  else root.removeAttribute("data-tf");
  // The Contents, पूजा and आरती rows are named by their visible words, with aria-expanded giving the state,
  // so voice control users can say what they see (WCAG 2.5.3)
  if (tb) tb.setAttribute("aria-expanded", String(!P.tf));
  secs.forEach(function (x) {
    var f = P.af.indexOf(x.id) >= 0,
      ab = x.querySelector(".afb");
    x.classList.toggle("af", f);
    if (ab) {
      ab.setAttribute("aria-expanded", String(!f));
      ab.setAttribute("aria-label", f ? (mr ? "उघडा" : "Show this piece") : mr ? "मिटवा" : "Fold this piece");
    }
  });
  var xb = document.getElementById("xfb");
  if (P.xf) root.setAttribute("data-xf", "1");
  else root.removeAttribute("data-xf");
  if (xb) xb.setAttribute("aria-expanded", String(!P.xf));
  allSet();
  var b = document.getElementById("pfb");
  if (P.pf) root.setAttribute("data-pf", "1");
  else root.removeAttribute("data-pf");
  if (!b) return;
  b.setAttribute("aria-expanded", String(!P.pf));
}

// Going to a piece (or a line in it) opens it if it is folded, and the Pooja section if that is folded
export function pjOpen(el, onlyPooja) {
  // a section row (side menu पूजा / आरती): open that section if it is folded
  if (el && el.id === "g-pooja" && P.pf) {
    P.pf = 0;
    save();
    pfSet();
  }
  if (el && el.id === "g-aarti" && P.xf) {
    P.xf = 0;
    save();
    pfSet();
  }
  var sec = el && el.closest && el.closest(".ash");
  if (!sec) return;
  var ch = false;
  if (P.pf && sec.classList.contains("pj")) {
    P.pf = 0;
    ch = true;
  }
  if (P.xf && sec.classList.contains("ar")) {
    P.xf = 0;
    ch = true;
  }
  if (!onlyPooja && P.af.indexOf(sec.id) >= 0) {
    P.af = P.af.filter(function (x) {
      return x !== sec.id;
    });
    ch = true;
  }
  if (ch) {
    save();
    pfSet();
  }
}

// Auto-fit text size
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { root, secs } from "../core/page.js";
import { P, dfs } from "../core/state.js";

var MQP;
// FSA: the automatic size for this screen (read by the size readouts in Settings, the reading sheet and the pinch);
// fontN: how many web fonts had loaded at the last fit
export var FSA = 0;
var fontN = -1;

export function init() {
  // FSA: the automatic size for this screen, worked out even when the reader has chosen a size,
  // so the pinch bubble can show sizes as a percentage of it (100% = default)
  FSA = 0;
  addEventListener("resize", pullSoon);
  fontN = -1;
  MQP = matchMedia("print");
  addEventListener("afterprint", function () {
    setTimeout(fontsIn, 0);
  });
  if (document.fonts) {
    try {
      document.fonts.ready.then(fontsIn);
      document.fonts.addEventListener("loadingdone", fontsIn);
    } catch (e) {}
  }
}

// The text's size: the default for this screen (dfs(), js/core/state.js), the same for every text, unless the reader
// chose one (pinch, A− / A+). It once shrank (to 18px) until the widest line fitted the screen, measured on the first
// text opened, so texts read small on phones and the size hung on which text came first (Satish, 2026-11-02): a long
// line now wraps instead, its two rows closer together than two lines (css/02-core.css).
export function autoFs() {
  var f = dfs();
  FSA = f;
  // the Library's list is sized from it: the same share of its own size as the text is of this one (13-library.css)
  root.style.setProperty("--fsa", String(f));
  if (P.fsu) return;
  if (f !== P.fs) {
    P.fs = f;
    root.style.setProperty("--fs", f + "px");
  }
}

// Web fonts can arrive after the first fit; measure again once they have loaded
export function refit() {
  autoFs();
  pullSoon();
}

// Two columns (Marathi or English only): a piece of short lines leaves a wide gap between its stanza
// columns, so the left column moves right and the right column left until the piece's widest lines
// are 48px apart. It is a CSS translate (--pull on the piece), so the
// column widths that auto-fit measures stay the same. Worked out again after every fit and resize.
function pull() {
  var on = root.getAttribute("data-cols") === "2" && P.lang !== "both";
  secs.forEach(function (sec) {
    var v = 0;
    // (not a Vedic chant running on as paragraphs: one column)
    if (on && sec.offsetParent !== null && !sec.classList.contains("prose")) {
      var lw = 0,
        cw = 0,
        rg = document.createRange();
      [].forEach.call(sec.querySelectorAll(".items > .c1 .verse ." + P.lang + " p, .items > .c2 .verse ." + P.lang + " p"), function (p) {
        if (!p.offsetParent) return;
        rg.selectNodeContents(p);
        var w = rg.getBoundingClientRect().width,
          cs = getComputedStyle(p);
        if (w > lw) lw = w;
        cw = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      });
      // the column gap is 64px; the widest lines of the two columns end up 48px apart
      if (lw && cw) v = Math.max(0, Math.floor((cw - lw) / 2 + 8));
    }
    if (v) sec.style.setProperty("--pull", v + "px");
    else sec.style.removeProperty("--pull");
  });
}

export function pullSoon() {
  clearTimeout(pull.tm);
  pull.tm = setTimeout(pull, 80);
}

// How many web fonts have arrived. Part of the auto-fit cache key, and the font events below fit the
// text again only when it has changed: "loadingdone" and fonts.ready both fire when the fonts arrive,
// and fitting on each (plus once more at start-up) used to measure the whole page four times on load.
export function fontsN() {
  var n = 0;
  try {
    document.fonts.forEach(function (f) {
      if (f.status === "loaded") n++;
    });
  } catch (e) {}
  return n;
}

function fontsIn() {
  // Fonts used only by the printout arrive while printing; measuring then would fit the screen's text
  // to the printed page's layout. Wait until printing is over (afterprint below).
  if (MQP.matches) return;
  var n = fontsN();
  if (n === fontN) return;
  fontN = n;
  autoFs();
  pullSoon();
}

// The fonts in place at start-up (a repeat visit) need no second fit (js/core/startup.js); fontsIn() handles any that
// arrive later
export function fontsNow() {
  fontN = fontsN();
}

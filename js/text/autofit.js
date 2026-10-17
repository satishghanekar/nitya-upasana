// Auto-fit text size
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { root, secs } from "../core/page.js";
import { shared, P, dfs } from "../core/state.js";
import { skDot } from "../features/date-card.js";
import { ZW } from "./line-breaks.js";

var VW, MQL, FR, CW, MQP;

export function init() {
  // Performance: the window size, read once and kept until the window is resized. On phones the browser has to
  // lay the whole page out before it can answer innerWidth/innerHeight if anything on the page changed, so
  // reading them in apply() and the auto-fit (after a language switch, say) cost an extra full-page layout.
  // (Where only a comparison is needed, apply() and ratio() ask media queries instead, which never wait for layout.)
  VW = 0;
  MQL = matchMedia("(orientation: landscape)");
  addEventListener("resize", vwReset);
  addEventListener("orientationchange", vwReset);
  // Auto-fit: largest text size (up to the device default) at which every verse line fits the screen width on one row.
  FR = {};
  // FSA: the automatic size for this screen, worked out even when the reader has chosen a size,
  // so the pinch bubble can show sizes as a percentage of it (100% = default)
  shared.FSA = 0;
  // The column width depends only on the window and layout, not on the text size or language,
  // so it is remembered: reading it would make the browser lay out the whole page an extra time
  CW = {};
  addEventListener("resize", pullSoon);
  shared.fontN = -1;
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

function vw() {
  return VW || (VW = innerWidth);
}

function vwReset() {
  VW = 0;
}

function segs(p) {
  var o = [],
    t = "";
  [].forEach.call(p.childNodes, function (n) {
    if (n.nodeName === "BR") {
      o.push(t);
      t = "";
    } else {
      t += n.textContent;
    }
  });
  o.push(t);
  var r = [];
  o.forEach(function (x) {
    x.split(ZW).forEach(function (y) {
      y = y.trim();
      if (y) r.push(y);
    });
  });
  return r;
}

function ratio() {
  // cached per language / dhrupad / layout / orientation
  var k = [
    P.lang,
    shared.LEAD,
    P.ind,
    P.fnt,
    P.tr,
    P.ref,
    P.pf,
    P.xf,
    root.getAttribute("data-cols"),
    root.getAttribute("data-rail"),
    MQL.matches ? "l" : "p",
    fontsN(),
  ].join("|");
  if (FR[k]) return FR[k];
  // measured at the device default size, as on first load: some layouts (two columns) size their columns in em,
  // so measuring at the current size would give a different answer each time and the size would creep down
  var was = root.style.getPropertyValue("--fs"),
    base = dfs(),
    // (setting the same size again would still make the browser redo the page's styles, so it is skipped)
    same = was === base + "px";
  if (!same) root.style.setProperty("--fs", base + "px");
  // Performance: the page is read in three passes so the browser lays it out only twice, instead of once
  // for every verse line (the old one-span-per-line loop cost over a second on a mid-range phone).
  // 1. read: each visible line's free width and font (every read here shares one layout)
  var w = document.querySelector(".wrap"),
    W = w ? w.clientWidth : vw() - 32,
    r = 0,
    rows = [];
  [].forEach.call(document.querySelectorAll(P.lang === "en" || shared.LEAD === "en" ? ".verse .en p" : ".verse .mr p"), function (p) {
    if (!p.offsetParent) return;
    var cs = getComputedStyle(p),
      avail = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (!avail) return;
    rows.push({ p: p, inset: (W - avail) / base, ff: cs.fontFamily, fz: cs.fontSize, fw: cs.fontWeight });
  });
  // 2. write: one off-screen span per line segment, in the paragraph's font, each on its own row
  var m = document.createElement("div"),
    spans = [];
  m.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;contain:layout style size;width:0;height:0";
  rows.forEach(function (row) {
    segs(row.p).forEach(function (t) {
      var s = document.createElement("span");
      s.style.fontFamily = row.ff;
      s.style.fontSize = row.fz;
      s.style.fontWeight = row.fw;
      s.textContent = t;
      m.appendChild(s);
      m.appendChild(document.createElement("br"));
      spans.push({ s: s, inset: row.inset });
    });
  });
  document.body.appendChild(m);
  // 3. read: the widths (one layout for all of them); the widest line, in ems plus its column's inset, wins
  spans.forEach(function (x) {
    var q = x.s.getBoundingClientRect().width / base + x.inset;
    if (q > r) r = q;
  });
  m.remove();
  if (!same) root.style.setProperty("--fs", was);
  return (FR[k] = r);
}

export function autoFs() {
  // ratio() first: it lays the page out anyway, so the reads below come free (when the size is unchanged)
  var r = ratio(),
    wk = [vw(), root.getAttribute("data-cols"), root.getAttribute("data-rail")].join("|"),
    w = document.querySelector(".wrap"),
    cw = CW[wk] || (CW[wk] = w ? w.clientWidth : vw() - 32);
  if (!r || !cw) return;
  var f = Math.max(18, Math.min(dfs(), Math.floor((cw * 0.98) / r)));
  shared.FSA = f;
  if (P.fsu) return;
  if (f !== P.fs) {
    P.fs = f;
    root.style.setProperty("--fs", f + "px");
  }
}

// Web fonts can arrive after the first fit; measure again once they have loaded
export function refit() {
  for (var k in FR) delete FR[k];
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
    if (on && sec.offsetParent !== null) {
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
  if (n === shared.fontN) return;
  shared.fontN = n;
  autoFs();
  pullSoon();
  // the date card's chips may wrap differently in the arrived font
  try {
    skDot();
  } catch (e) {}
}

// Bottom bar (#asc): ‹ Prev, Home, Library (#hm, js/features/history.js), Aa (the reading sheet), Next ›; on Home only
// Library and Aa. Print is in the top bar.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { root } from "../core/page.js";
import { P } from "../core/state.js";
import { cur } from "../core/apply.js";
import { goHomeNav } from "./history.js";
import { pageEls } from "./overlays.js";
import { sessionStep } from "./today-card.js";
import { menuWords } from "../core/strings.js";

export var asc;

export function init() {
  // The bottom bar is the footer menu on every page. Its parts share the "as" prefix (asc, asv, ash, asn)
  // because it began as the autoscroll bar (Autoscroll and Tilt to scroll were removed for now on 2026-10-21; they
  // are in git history up to v1.20).
  asc = document.getElementById("asc");
  document.getElementById("asv").onclick = function () {
    asGo(".prev");
  };
  document.getElementById("asn").onclick = function () {
    asGo(".next");
  };
  document.getElementById("ash").onclick = function () {
    goHomeNav();
  };
  // The bar is always there, like the top bar (data-asb leaves room for it under the text).
  // asShow() keeps Prev / Next with the piece on screen.
  asc.hidden = false;
  root.setAttribute("data-asb", "1");
  // the bar steps aside while one of the pages is open: Settings, the Library, the Vedic calendar or the routine
  // builder (pageEls(), js/features/overlays.js); data-menu names the page, since on wide screens the Library and the
  // calendar open beside Home's column with the bar still under them (css/07-bottom-bar-folds.css)
  (function () {
    var ms = pageEls();
    function menu() {
      var m = ms.filter(function (m) {
        return m && !m.hidden;
      })[0];
      if (m) root.setAttribute("data-menu", m.id);
      else root.removeAttribute("data-menu");
    }
    var mo = new MutationObserver(menu);
    ms.forEach(function (m) {
      if (m) mo.observe(m, { attributes: true, attributeFilter: ["hidden"] });
    });
    menu();
  })();
  addEventListener("scroll", asShow, { passive: true });
  // a session started on the Today card: Prev and Next now follow it, even on the piece already on screen; and
  // another text opened (js/features/history.js solo()), which may leave the page where it was, with no scroll
  function again() {
    asShow.id = undefined;
    asShow();
  }
  document.addEventListener("nitya-session", again);
  document.addEventListener("nitya-solo", function () {
    again();
    // once the page has gone to the text (the jump may come after)
    requestAnimationFrame(again);
  });
}

// the bottom of whatever sits at the top of the screen: the top bar, or the slim strip while it is tucked away
export function topEdge() {
  var bar = document.querySelector(root.hasAttribute("data-tuck") ? "#tuck" : "body > .bar");
  return bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 60;
}

// Prev and Next named for where they go, in the menu language
export function asLabel() {
  var mr = P.ui === "mr",
    w = menuWords("bottomBar"),
    c = cur();
  [
    ["asv", w.prev, ".prev"],
    ["asn", w.next, ".next"],
  ].forEach(function (x) {
    var b = document.getElementById(x[0]),
      // from the home page, Next opens the first text in the Library (asGo)
      a = c ? c.querySelector(".pn " + x[2]) : x[2] === ".next" ? document.querySelector("#jl a[data-go]") : null,
      t = c && a && a.querySelector(mr ? ":scope > .mr" : ":scope > .en"),
      // reading a session from the Today card: Prev and Next follow it (js/features/today-card.js)
      ss = c && sessionStep(c.id, x[2] === ".next" ? 1 : -1),
      name = ss ? ss.label : t ? t.textContent : "";
    // the word in its own span: the smallest phones show only the arrow, to fit the bar (css/07-bottom-bar-folds.css)
    b.innerHTML = x[1].replace(/([^‹›]+)/, '<span class="asw2">$1</span>');
    b.lang = mr ? "mr" : "en";
    b.setAttribute("aria-label", x[1].replace(/[‹›]/g, "").trim() + (name ? ": " + name : ""));
    b.disabled = !a && !ss;
  });
}

// Previous / Next follow the links in each piece's .pn block (kept in the page but never shown on screen,
// the bar replaced it), or the session being read; Home and Search work as in the top bar
/** @param {string} sel */
function asGo(sel) {
  var c = cur(),
    ss = c && sessionStep(c.id, sel === ".next" ? 1 : -1),
    a = /** @type {HTMLElement | null} */ (c && c.querySelector(".pn " + sel));
  if (ss) ss.go();
  else if (a) a.click();
  else if (!c && sel === ".next") {
    // from the home page: the first text in the Library
    var f = /** @type {HTMLElement | null} */ (document.querySelector("#jl a[data-go]"));
    if (f) f.click();
  }
}

export function asShow() {
  var c = cur(),
    id = c ? c.id : "";
  if (id !== asShow.id) {
    asShow.id = id;
    asLabel();
  }
}

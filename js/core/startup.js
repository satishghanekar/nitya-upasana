// Start-up
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "./state.js";
import { onPiece, pieceEl } from "./page.js";
import { fontsNow } from "../text/autofit.js";
import { cur } from "./apply.js";
import { apply, mark } from "../features/bars.js";
import { wake } from "../features/wake-lock.js";
import { homeAlone, homeInView, homeView, solo } from "../features/history.js";

var tk, rzT, h, el, PK, posT, sp, moved, goPos;

// The page width without the scrollbar, for the styles that centre the text column and the side rail
// (--vw; css/04-columns-rail.css). 100vw includes a classic scrollbar (Windows, or a Mac set to always
// show scrollbars), which put the column and the rail about 8px off centre. Phones and most Macs have
// scrollbars that float over the page, so nothing is set there and the styles keep using 100vw.
function setVw() {
  var r = document.documentElement,
    w = r.clientWidth;
  if (w && w < innerWidth) r.style.setProperty("--vw", w + "px");
  else r.style.removeProperty("--vw");
}

export function init() {
  setVw();
  // While scrolling: highlight the current piece in the menus and move the progress line (once per frame)
  tk = 0;
  window.addEventListener(
    "scroll",
    function () {
      if (tk) return;
      tk = requestAnimationFrame(function () {
        tk = 0;
        mark();
      });
    },
    { passive: true },
  );
  // the highlighted line, in its piece when that is built (js/core/page.js)
  onPiece(function (sec) {
    if (P.hl) hlMark(P.hl, sec);
  });
  // Home on its own (data-hv, js/features/history.js), unless the page opens at a piece: a link such as …/#a3, or
  // the reading position kept below (a piece read in the last 12 hours)
  h = (location.hash || "").slice(1);
  sp = null;
  try {
    sp = JSON.parse(localStorage.getItem("aarti2-pos") || "null");
  } catch (e) {}
  el = h && pieceEl(h);
  var reading =
    el && el.id !== "home"
      ? true
      : !h && !!(sp && sp.id && Date.now() - sp.t < 12 * 3600000 && pieceEl(sp.id));
  solo(el && el.id !== "home" ? el.id : !h && reading && sp ? sp.id : "");
  if (reading) document.documentElement.removeAttribute("data-hv");
  else document.documentElement.setAttribute("data-hv", "1");
  apply();
  // fonts already in place (a repeat visit) need no second fit; fontsIn() above handles any that arrive later
  fontsNow();
  rzT = 0;
  window.addEventListener("resize", function () {
    setVw();
    clearTimeout(rzT);
    rzT = setTimeout(function () {
      apply();
    }, 150);
  });
  // Opened with a link such as …/#a3: go to that piece
  h = (location.hash || "").slice(1);
  if (h) {
    el = pieceEl(h);
    // (a folded piece stays folded here: the address follows the piece you read, so a reload would open it)
    if (el && el.classList.contains("ash"))
      setTimeout(function () {
        el.scrollIntoView();
      }, 50);
  }
  if (P.wake) wake(true);
  // Reading position: phones often reload a home-screen app after switching away, so remember
  // the piece and how far into it you were, and return there when reopened within 12 hours
  PK = "aarti2-pos";
  posT = 0;
  window.addEventListener(
    "scroll",
    function () {
      clearTimeout(posT);
      posT = setTimeout(savePos, 400);
    },
    { passive: true },
  );
  window.addEventListener("pagehide", savePos);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) savePos();
  });
  sp = null;
  try {
    sp = JSON.parse(localStorage.getItem(PK) || "null");
  } catch (e) {}
  // A link to a piece wins, unless it is the piece you were already reading
  if (!h || (sp && sp.id === h)) {
    if (sp && Date.now() - sp.t < 12 * 3600000 && (sp.id || sp.y > 0)) {
      moved = false;
      goPos = function () {
          if (moved) return;
          var el = sp.id && pieceEl(sp.id);
          // a piece not shown: stay at the top, on Home on its own
          if (el && el.offsetParent === null) return homeView(true);
          scrollTo(0, el ? el.getBoundingClientRect().top + scrollY + sp.y : sp.y);
        };
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      setTimeout(goPos, 50);
      setTimeout(goPos, 400);
      // Text sizes settle once the fonts load; go there again unless the reader has already moved
      if (document.fonts && document.fonts.ready)
        document.fonts.ready.then(function () {
          setTimeout(goPos, 60);
        });
      ["touchstart", "wheel", "keydown"].forEach(function (ev) {
        addEventListener(
          ev,
          function () {
            moved = true;
            // touched before the page got back to the piece: it stays on Home, on its own
            if (homeInView()) homeAlone();
          },
          { once: true, passive: true },
        );
      });
    }
  }
}

// highlight a tapped line (each copy of it: Marathi, English, a repeated dhrupad) and the stanza around it, in the
// page or in one piece (r)
export function hlMark(id, r) {
  [].forEach.call((r || document).querySelectorAll('[data-l="' + id + '"]'), function (x) {
    x.classList.add("hl");
    var st = x.closest(".items > .item, .rftop");
    if (st) st.classList.add("hli");
  });
}

function savePos() {
  var c = cur(),
    y = c ? scrollY - (c.getBoundingClientRect().top + scrollY) : scrollY;
  try {
    localStorage.setItem(PK, JSON.stringify({ id: c ? c.id : "", y: Math.round(y), t: Date.now() }));
  } catch (e) {}
}

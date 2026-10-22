// Back button
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { bt, onPiece, pieceEl } from "../core/page.js";
import { aa, cur, jp, unfold, pn } from "../core/apply.js";
import { TK, apply, goHome, mark, tuckHold } from "./bars.js";
import { anyOpen, closeForBack, pageEls, setC, setJ, setP, setR, trapped } from "./overlays.js";

var NAV, popSkip, adT, hmb, ovFrom, sub, subSkip, keep;

export function init() {
  // Opening a panel or dialog adds a Back step, so the phone's Back closes it instead of leaving the site.
  // Going to a piece (or home) adds a Back step that returns to where you were. As you read, the address
  // follows the piece on screen (#a5) without adding steps. Each step remembers its scroll position (y).
  NAV = !!(history.pushState && history.replaceState);
  popSkip = 0;
  homeOnScroll();
  // The script puts the page back in place itself (the browser's own guess can land at the top)
  if (NAV && "scrollRestoration" in history) history.scrollRestoration = "manual";
  addEventListener("popstate", function (e) {
    // a sheet over a page (Add texts in the routine builder, on a phone) has its own Back step: Back closes only it
    if (subSkip) {
      subSkip = 0;
      return;
    }
    if (sub) {
      var f = sub;
      sub = null;
      f();
      return;
    }
    var was = ovOpen();
    setP(false);
    setJ(false);
    setC(false);
    setR(false);
    var shut = closeForBack();
    // Closed with the phone's Back: focus goes back to the button that opened it, as with ✕ or Escape, so a
    // screen reader doesn't start again from the top of the page (WCAG 2.4.3)
    if (shut) {
      document.documentElement.style.overflow = "";
      if (ovFrom && ovFrom.isConnected && ovFrom.getClientRects().length)
        try {
          ovFrom.focus({ preventScroll: true });
        } catch (x) {}
    }
    if (popSkip) {
      popSkip--;
      // Firefox moves focus when it steps back to an address with a #piece in it: the close (✕, Escape) had put it
      // back on the button that opened the pop-up, so it goes back there
      var k = keep;
      keep = null;
      var back = function () {
        if (k && k !== document.activeElement && k.isConnected && k.getClientRects().length)
          try {
            k.focus({ preventScroll: true });
          } catch (x) {}
      };
      back();
      // (and once more after the browser has finished stepping back, unless focus has gone somewhere on purpose)
      requestAnimationFrame(function () {
        if (document.activeElement === document.body) back();
      });
      return;
    }
    if (was) return;
    var st = e.state,
      el = location.hash && pieceEl(location.hash.slice(1));
    // back on the bare address: Home on its own; on a piece's address: the reading page
    homeView(!el || el.id === "home");
    solo(el ? el.id : "");
    unfold(el);
    if (st && typeof st.y === "number") scrollTo(0, st.y);
    else if (el) el.scrollIntoView();
    else scrollTo(0, 0);
  });
  // Keyboard: Tab stays inside an open dialog (those marked trap in LAYERS, js/features/overlays.js: Restore, the
  // profile sheet, the categories sheet, Help, QR, Print, Add to Home Screen, the picture, the reading sheet, Settings)
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var d = trapped();
    if (!d) return;
    // Everything Tab can land on, dropdowns included: leaving <select> out made Tab from the language dropdowns
    // jump back to the top of Settings, so the rest of the page could not be reached by keyboard (WCAG 2.1.1).
    // Visibility is tested with getClientRects, which (unlike offsetParent) also works inside fixed layers.
    // (a tab list's other tabs, tabindex -1, are reached with the arrow keys, not Tab)
    var f = [].filter.call(d.querySelectorAll("button,a[href],input,select,textarea,summary,[tabindex]:not([tabindex='-1'])"), function (x) {
      return !x.disabled && x.tabIndex >= 0 && x.getClientRects().length > 0 && getComputedStyle(x).visibility !== "hidden";
    });
    if (!f.length) return;
    var a = document.activeElement,
      i = f.indexOf(a);
    // Firefox also stops on a box that scrolls (the print builder's list): that is still inside, so Tab goes on from
    // it as usual rather than back to the top
    if (i < 0 && a && d.contains(a)) return;
    if (e.shiftKey ? i <= 0 : i === f.length - 1 || i < 0) {
      e.preventDefault();
      f[e.shiftKey ? f.length - 1 : 0].focus();
    }
  });
  adT = 0;
  window.addEventListener(
    "scroll",
    function () {
      clearTimeout(adT);
      adT = setTimeout(function () {
        if (!NAV || hs().ov || ovOpen()) return;
        var c = cur();
        try {
          history.replaceState({ y: scrollY }, "", c ? "#" + c.id : location.pathname);
        } catch (e) {}
      }, 500);
    },
    { passive: true },
  );
  bt.addEventListener("click", function (e) {
    e.preventDefault();
    goHomeNav();
  });
  hmb = document.getElementById("hm");
  hmb.onclick = function () {
    setJ(jp.hidden);
    // With a mouse and keyboard, the cursor goes straight into the search box (on phones it doesn't,
    // so the keyboard doesn't pop up over the list)
    if (!jp.hidden && matchMedia("(hover: hover) and (pointer: fine)").matches) document.getElementById("q").focus();
  };
  // Home and Search at the end of each piece do exactly what the top bar's buttons do
  onPiece(function (sec) {
    [].forEach.call(sec.querySelectorAll(".pnh"), function (h) {
      h.addEventListener("click", function (e) {
        e.preventDefault();
        goHomeNav();
      });
    });
    [].forEach.call(sec.querySelectorAll(".pns"), function (b) {
      b.onclick = hmb.onclick;
    });
  });
  // Skip link: focus goes to the first text on screen (a piece, or the page), without changing the address
  document.getElementById("skip").addEventListener("click", function (e) {
    e.preventDefault();
    var c = cur(),
      h = c && c.querySelector("h2"),
      m = document.getElementById("main");
    if (h) h.tabIndex = -1;
    try {
      (h || m).focus({ preventScroll: !!h });
    } catch (x) {}
  });
  // Tabbing out of an open panel closes it, so it doesn't stay over the page you have moved on to
  pageEls().forEach(function (el) {
    el.addEventListener("focusout", function (e) {
      var t = e.relatedTarget;
      // (not into the categories sheet, which opens over the Library, nor the profile sheet, over the routine builder)
      if (el.hidden || !t || el.contains(t) || t.closest(".bar,#help,#lbm,#pfm")) return;
      el._ret = null;
      if (el === pn) setP(false);
      else if (el === jp) setJ(false);
      else if (el.id === "rtb") setR(false);
      else setC(false);
    });
  });
  document.getElementById("xc").onclick = function () {
    setP(false);
  };
  aa.onclick = function () {
    setP(pn.hidden);
  };
}

function hs() {
  return history.state || {};
}

// Something is open over the page (LAYERS in js/features/overlays.js)
function ovOpen() {
  return anyOpen();
}

export function ovPush() {
  if (!NAV || hs().ov || ovOpen()) return;
  ovFrom = document.activeElement;
  try {
    history.replaceState({ y: scrollY }, "", location.href);
    history.pushState({ ov: 1, y: scrollY }, "", location.href);
  } catch (e) {}
}

// A sheet opened over a page that is open already (the routine builder's Add texts on a phone): a Back step of its
// own, so the phone's Back closes the sheet (close is called) and leaves the page open
export function ovSub(close) {
  if (!NAV || !hs().ov) return;
  sub = close;
  try {
    history.pushState({ ov: 1, sub: 1, y: scrollY }, "", location.href);
  } catch (e) {}
}

// The sheet was closed another way (Done, Escape, a tap outside): take its Back step off again
export function ovSubDone() {
  if (!sub) return;
  sub = null;
  if (!NAV || !hs().sub) return;
  subSkip = 1;
  history.back();
}

// Closed with ✕, Escape or a tap outside: take the panel's Back step off again. Only once: history.back()
// lands later, so a second close in the same moment (Escape closes both panels) must not step back again.
export function ovDone() {
  if (!NAV || !hs().ov || ovOpen() || popSkip) return;
  popSkip++;
  keep = /** @type {HTMLElement | null} */ (document.activeElement);
  history.back();
}

// A dialog closed to print: its Back step becomes a plain one, without stepping back. Stepping back
// (history.back()) lands a moment later, and a page moving through its history just as it asks to print
// may lose the print on iPhone, so printing never steps back.
export function ovDrop() {
  if (!NAV || !hs().ov) return;
  try {
    history.replaceState({ y: scrollY }, "", location.href);
  } catch (e) {}
}

// Go somewhere in the page: go() scrolls, url is "#a3" (a piece) or the bare address (home)
export function jumpTo(go, url) {
  var ov = NAV && hs().ov;
  if (typeof TK === "object" && TK) tuckHold();
  try {
    if (NAV) history.replaceState({ y: scrollY }, "", location.href);
  } catch (e) {}
  setP(false);
  setJ(false);
  setC(false);
  // a piece (#a3): the reading page with every piece; the bare address: Home on its own
  solo(url && url.charAt(0) === "#" ? url.slice(1) : "");
  homeView(!(url && url.charAt(0) === "#" && url !== "#home"));
  go();
  // the page may not have scrolled (a short text read on its own, css/10-today.css): the bars follow anyway
  mark();
  try {
    if (NAV) history[ov ? "replaceState" : "pushState"]({ y: scrollY }, "", url);
  } catch (e) {}
  // Focus follows to the piece's heading, so the next Tab or screen reader line starts there
  var el = url && url.charAt(0) === "#" && pieceEl(url.slice(1)),
    h = el && el.querySelector("h2");
  if (h) {
    h.tabIndex = -1;
    try {
      h.focus({ preventScroll: true });
    } catch (e) {}
  }
}

// Home on its own: while data-hv is on <html>, the page ends after Home (More and the
// Library line) and the pieces below it are not shown (css/10-today.css, screen only). It is set by going home (the top-bar
// title, Home in the side menu or the bottom bar, the end of a session, Back to the bare address) and at start-up
// with no piece to open (js/core/startup.js), and taken off before the page goes to a piece (jumpTo(), Back to a
// piece's address, a link such as #a3, the reading position), so reading a text, ‹ Prev and Next ›, and scrolling
// between pieces work as before. Scrolling up from a piece back to Home, or picking a session there, sets it again
// (homeOnScroll(), js/features/today-card.js).
// Coming back to the pieces, the text is fitted to the screen again (apply()), since it could not be measured
// while hidden.
/** @param {boolean} on */
export function homeView(on) {
  var r = document.documentElement;
  if (on === r.hasAttribute("data-hv")) return;
  if (on) {
    r.setAttribute("data-hv", "1");
    mark();
  } else {
    r.removeAttribute("data-hv");
    apply();
  }
}

// The text being read (.solo on its piece): the page shows only that one text, on every screen (css/10-today.css);
// ‹ Prev / Next › in the bottom bar or the side menu change it. Set
// wherever the page goes to a piece: jumpTo(), Back, and start-up (js/core/startup.js). Another address (Home)
// leaves it where it was.
/** @param {string} id  the piece's id (a3) */
export function solo(id) {
  var el = id && pieceEl(id);
  if (!el || !el.classList.contains("ash")) return;
  [].forEach.call(document.querySelectorAll(".ash.solo"), function (/** @type {HTMLElement} */ x) {
    if (x !== el) x.classList.remove("solo");
  });
  if (el.classList.contains("solo")) return;
  el.classList.add("solo");
  // another text is being read: the bottom bar names where ‹ Prev / Next › go from it now, even when the page did not
  // scroll (js/features/bottom-bar.js)
  document.dispatchEvent(new CustomEvent("nitya-solo"));
}

// Scrolling up from a piece back to Home: once the Morning / Afternoon / Evening switch is on screen, Home is on its
// own again (data-hv), so the page ends after the session's texts, More and the Library line instead of showing every
// piece below them, even when Home is short (a session with nothing planned). Only on the way up, so scrolling down
// from Home never hides a piece you are reading, nor does the reading position going down to a piece at start-up.
function homeOnScroll() {
  var y0 = scrollY,
    hT = 0;
  addEventListener(
    "scroll",
    function () {
      var up = scrollY < y0;
      y0 = scrollY;
      if (!up || hT || document.documentElement.hasAttribute("data-hv")) return;
      hT = requestAnimationFrame(function () {
        hT = 0;
        if (homeInView()) homeAlone();
      });
    },
    { passive: true },
  );
}

// The Morning / Afternoon / Evening switch is on screen: the reader is on Home
export function homeInView() {
  // on wide screens Home's column stays beside the text being read (css/10-today.css): always on screen, never a
  // reason to leave the text
  var h = document.documentElement;
  if (h.hasAttribute("data-rail") && !h.hasAttribute("data-hv")) return false;
  var t = document.getElementById("tss"),
    r = t && t.getBoundingClientRect();
  return !!r && r.bottom > 0 && r.top < innerHeight;
}

// Home on its own, the address back to the bare one (so a reload stays on Home too); the page keeps its place
export function homeAlone() {
  homeView(true);
  try {
    if (NAV && location.hash) history.replaceState({ y: scrollY }, "", location.pathname);
  } catch (e) {}
}

// Home buttons (top-bar title, Home in the bottom bar): back to the top of the home page
export function goHomeNav() {
  jumpTo(goHome, location.pathname);
}

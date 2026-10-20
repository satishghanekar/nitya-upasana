// Back button
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { bt, flash } from "../core/page.js";
import { P, save } from "../core/state.js";
import { LANGS, LK, aa, cur, hb, jp, pjOpen, pn } from "../core/apply.js";
import { TK, apply, goHome, tuckHold } from "./bars.js";
import { setC, setJ, setP, setR } from "./overlays.js";

var NAV, popSkip, adT, hmb, ovFrom, sub, subSkip;

export function init() {
  // Opening a panel or dialog adds a Back step, so the phone's Back closes it instead of leaving the site.
  // Going to a piece (or home) adds a Back step that returns to where you were. As you read, the address
  // follows the piece on screen (#a5) without adding steps. Each step remembers its scroll position (y).
  NAV = !!(history.pushState && history.replaceState);
  popSkip = 0;
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
    var shut = 0;
    ["qrm", "prm", "inm", "pzv", "rsh", "bkm"].forEach(function (i) {
      var d = document.getElementById(i);
      if (d && !d.hidden) {
        d.hidden = true;
        shut = 1;
        if (i === "rsh") document.getElementById("rsb").setAttribute("aria-expanded", "false");
      }
    });
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
      return;
    }
    if (was) return;
    var st = e.state,
      el = location.hash && document.getElementById(location.hash.slice(1));
    // back on the bare address: Home on its own; on a piece's address: the reading page
    homeView(!el || el.id === "home");
    pjOpen(el);
    if (st && typeof st.y === "number") scrollTo(0, st.y);
    else if (el) el.scrollIntoView();
    else scrollTo(0, 0);
  });
  // Keyboard: Tab stays inside an open dialog (Restore, the profile sheet, the categories sheet, QR, Print, Add to Home
  // Screen, Help, Settings)
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var d = ["bkm", "pfm", "lbm", "help", "qrm", "prm", "inm", "pzv", "rsh", "panel"]
      .map(function (i) {
        return document.getElementById(i);
      })
      .filter(function (x) {
        return x && !x.hidden;
      })[0];
    if (!d) return;
    // Everything Tab can land on, dropdowns included: leaving <select> out made Tab from the language dropdowns
    // jump back to the top of Settings, so the rest of the page could not be reached by keyboard (WCAG 2.1.1).
    // Visibility is tested with getClientRects, which (unlike offsetParent) also works inside fixed layers.
    var f = [].filter.call(d.querySelectorAll("button,a[href],input,select,textarea,summary,[tabindex]:not([tabindex='-1'])"), function (x) {
      return !x.disabled && x.getClientRects().length > 0 && getComputedStyle(x).visibility !== "hidden";
    });
    if (!f.length) return;
    var i = f.indexOf(document.activeElement);
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
  [].forEach.call(document.querySelectorAll(".pnh"), function (h) {
    h.addEventListener("click", function (e) {
      e.preventDefault();
      goHomeNav();
    });
  });
  [].forEach.call(document.querySelectorAll(".pns"), function (b) {
    b.onclick = hmb.onclick;
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
  [pn, jp, document.getElementById("cal"), document.getElementById("rtb")].forEach(function (el) {
    if (!el) return;
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
  // Language button cycles main → second → both (only the two chosen languages ever show). With no second
  // language chosen it opens Settings at the second language's list.
  hb.onclick = function () {
    if (!P.l2) {
      setP(true);
      document.getElementById("sl2s").focus();
      return;
    }
    var c = cur(),
      o = [P.lead, P.l2, "both"];
    P.lang = o[(o.indexOf(P.lang) + 1) % 3];
    apply();
    save();
    if (c) c.scrollIntoView();
    function nm(l) {
      return l === "both" ? LANGS[LK(P.lead)].n + " + " + LANGS[LK(P.l2)].n : LANGS[LK(l)].n;
    }
    // what is shown now, and what the next tap shows, long enough to read: a tap by mistake mid-aarti is then
    // easy to undo
    var L = nm(P.lang),
      N = nm(o[(o.indexOf(P.lang) + 1) % 3]);
    flash(L + " · पुढे: " + N, L + " · Next tap: " + N, 3500);
  };
}

function hs() {
  return history.state || {};
}

function ovOpen() {
  return (
    !pn.hidden ||
    !jp.hidden ||
    ["cal", "rtb", "qrm", "prm", "inm", "help", "pzv", "rsh", "pfm", "bkm", "lbm"].some(function (i) {
      var e = document.getElementById(i);
      return e && !e.hidden;
    })
  );
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
  // a piece (#a3): the reading page with every piece; the bare address: Home on its own
  homeView(!(url && url.charAt(0) === "#" && url !== "#home"));
  go();
  try {
    if (NAV) history[ov ? "replaceState" : "pushState"]({ y: scrollY }, "", url);
  } catch (e) {}
  // Focus follows to the piece's heading, so the next Tab or screen reader line starts there
  var el = url && url.charAt(0) === "#" && document.getElementById(url.slice(1)),
    h = el && el.querySelector("h2");
  if (h) {
    h.tabIndex = -1;
    try {
      h.focus({ preventScroll: true });
    } catch (e) {}
  }
}

// Home on its own (Home v3, docs/decisions.md): while data-hv is on <html>, the page ends after Home (More and the
// Library line) and the pieces below it are not shown (css/10-today.css, screen only). They are still in the page:
// the Library, search, print and the reading position read them as before. It is set by going home (the top-bar
// title, Home in the side menu or the bottom bar, the end of a session, Back to the bare address) and at start-up
// with no piece to open (js/core/startup.js), and taken off before the page goes to a piece (jumpTo(), Back to a
// piece's address, a link such as #a3, the reading position), so reading a text, ‹ Prev and Next ›, and scrolling
// between pieces work as before. Scrolling up from a piece to Home keeps the pieces (it is not a way home).
// Coming back to the pieces, the text is fitted to the screen again (apply()), since it could not be measured
// while hidden.
/** @param {boolean} on */
export function homeView(on) {
  var r = document.documentElement;
  if (on === r.hasAttribute("data-hv")) return;
  if (on) r.setAttribute("data-hv", "1");
  else {
    r.removeAttribute("data-hv");
    apply();
  }
}

// Home buttons (top-bar title, Ganesha in the bottom bar, the rail's Home): back to the top of the home page
export function goHomeNav() {
  jumpTo(goHome, location.pathname);
}

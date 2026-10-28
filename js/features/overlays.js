// Overlays: everything that opens over the page, listed once.
// - The four pages: Settings (#panel, setP), the Library (#jump, setJ), the Vedic calendar (#cal, setC,
//   js/features/vedic-calendar.js) and the routine builder (#rtb, setR, js/features/routine-builder.js). One is open at
//   a time: opening one closes the open one. They share one way of opening and closing (page() below); what is
//   particular to each is in PAGES.
// - The dialogs and sheets (Restore, the profile and categories sheets, Help, QR, Print, Add to Home Screen, the
//   full-screen picture, the reading sheet): each part opens and closes its own. LAYERS says which keep Tab inside and
//   which the phone's Back closes; js/features/history.js and js/features/bottom-bar.js read it.
// A new page or dialog is added to PAGES and LAYERS, and the Back button, Tab, the bottom bar and the other pages follow.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { root } from "../core/page.js";
import { jp, pn } from "../core/apply.js";
import { mark } from "./bars.js";
import { fsFlush, spTab, szSet } from "./settings-panel.js";
import { ovDone, ovPush } from "./history.js";
import { spSet } from "./languages.js";
import { clearSearch, libTab } from "./contents-list.js";

/**
 * Everything that opens over the page, dialogs first: the first one open in this order is the one on top.
 * page: one of the four pages (one open at a time; Tabbing out of it closes it; the bottom bar steps aside for it);
 * trap: Tab stays inside it while it is open; back: the phone's Back closes it in js/features/history.js (the others
 * listen for Back themselves).
 * @type {{ id: string, page?: boolean, trap?: boolean, back?: boolean }[]}
 */
export const LAYERS = [
  { id: "bkm", trap: true, back: true },
  { id: "pfm", trap: true },
  { id: "lbm", trap: true },
  { id: "help", trap: true },
  { id: "qrm", trap: true, back: true },
  { id: "prm", trap: true, back: true },
  { id: "inm", trap: true, back: true },
  { id: "pzv", trap: true, back: true },
  { id: "rsh", trap: true, back: true },
  { id: "panel", page: true, trap: true },
  { id: "jump", page: true },
  { id: "cal", page: true },
  { id: "rtb", page: true },
];

/** @param {string} id */
function shown(id) {
  var e = document.getElementById(id);
  return !!e && !e.hidden;
}

/** Something is open over the page */
export function anyOpen() {
  return LAYERS.some(function (l) {
    return shown(l.id);
  });
}

/** The open layer that keeps Tab inside it (the one on top), or null @returns {HTMLElement | null} */
export function trapped() {
  var l = LAYERS.filter(function (x) {
    return x.trap && shown(x.id);
  })[0];
  return l ? document.getElementById(l.id) : null;
}

/** The four pages, those in the page @returns {HTMLElement[]} */
export function pageEls() {
  /** @type {HTMLElement[]} */
  var out = [];
  LAYERS.forEach(function (l) {
    var e = l.page && document.getElementById(l.id);
    if (e) out.push(e);
  });
  return out;
}

/** The phone's Back: closes the dialogs marked back, and says whether one was open */
export function closeForBack() {
  var shut = false;
  LAYERS.forEach(function (l) {
    if (!l.back || !shown(l.id)) return;
    /** @type {HTMLElement} */ (document.getElementById(l.id)).hidden = true;
    shut = true;
    if (l.id === "rsh") /** @type {HTMLElement} */ (document.getElementById("rsb")).setAttribute("aria-expanded", "false");
  });
  return shut;
}

// Keyboard and screen reader users: opening a page moves focus into it; closing it puts focus back on
// the button that opened it (only if focus was still in the page, so a jump to a piece isn't undone)
/** @param {any} el @param {boolean} o */
function ovFocus(el, o) {
  var a = document.activeElement;
  if (o) {
    if (el.hidden) el._ret = a;
    return;
  }
  var r = el._ret;
  if (r && (el.contains(a) || a === document.body || !a)) {
    var go = function () {
      try {
        r.focus({ preventScroll: true });
      } catch (e) {}
    };
    // the button that opened it may not be shown yet: the bottom bar comes back once no page is open (data-menu,
    // js/features/bottom-bar.js), a moment after this one is hidden
    if (r.getClientRects().length) go();
    else Promise.resolve().then(go);
  }
  el._ret = null;
}

// Desktop B: the calendar and Settings sit under the top bar in the right-hand area (css/10-today.css reads --bb)
function barBottom() {
  var b = document.querySelector(".bar");
  if (b) root.style.setProperty("--bb", Math.round(b.getBoundingClientRect().bottom) + "px");
}

/** @param {string} sel @param {boolean} o */
function expanded(sel, o) {
  if (!sel) return;
  [].forEach.call(document.querySelectorAll(sel), function (/** @type {HTMLElement} */ b) {
    b.setAttribute("aria-expanded", String(o));
  });
}

/**
 * What is particular to each page.
 * openers: the buttons whose aria-expanded follows it; below: placed under the top bar (style.top); bb: sets --bb;
 * focus: "always" (scrolled to its top and focused), "outside" (focused only if focus isn't in it already) or ""
 * (scrolled to its top; its part focuses it); shown(): after it is shown; hidden(was): after it is hidden, by any way
 * (was: it was open).
 * @type {Record<string, { el: () => HTMLElement | null, openers: string, below?: boolean, bb?: boolean, focus: string, shown?: () => void, hidden?: (was: boolean) => void }>}
 */
const PAGES = {
  panel: {
    el: function () {
      return pn;
    },
    openers: "#aa",
    // under the top bar on every screen, as the Library and the calendar are, so the top bar is always there
    below: true,
    bb: true,
    focus: "always",
    shown: function () {
      spSet();
      szSet(); // a pinch on the page changes the size without passing through here
      // the Settings page covers the whole page; the page under it doesn't scroll
      root.setAttribute("data-sp", "1");
    },
    hidden: function () {
      fsFlush();
      root.removeAttribute("data-sp");
      // it opens on Reading next time
      spTab("read");
    },
  },
  jump: {
    el: function () {
      return jp;
    },
    openers: "#hm,.pns",
    below: true,
    focus: "outside",
    shown: function () {
      fsFlush();
    },
    hidden: function () {
      // the search starts empty next time, with the whole list, on the Texts tab
      clearSearch();
      libTab("texts");
    },
  },
  // The Vedic calendar page (#cal): opened by the line on Home (#panb) or Next 15 days (#upwm), under the top bar like the Library; Back, the
  // phone's Back or Escape closes it and focus returns to that line
  cal: {
    el: function () {
      return document.getElementById("cal");
    },
    openers: "#panb, #upwm",
    below: true,
    bb: true,
    focus: "always",
  },
  // The routine builder (#rtb): opened by Edit beside the session on Home, Add texts in an empty session, or Settings →
  // Routine; under the top bar like the Library. Back, the phone's Back or Escape closes it and focus returns to where
  // it was opened from (js/features/routine-builder.js puts it there, and focuses the builder's heading on opening).
  rtb: {
    el: function () {
      return document.getElementById("rtb");
    },
    openers: "",
    below: true,
    focus: "",
    hidden: function (was) {
      if (was) /** @type {HTMLElement} */ (document.getElementById("rtb")).dispatchEvent(new Event("rtb-closed"));
    },
  },
};

/** A page closes because another is opening: no focus return and no Back step (the new page has them) @param {string} id */
function hideFor(id) {
  var p = PAGES[id],
    e = /** @type {any} */ (p.el());
  if (!e || e.hidden) return;
  e._ret = null;
  e.hidden = true;
  expanded(p.openers, false);
  if (p.hidden) p.hidden(true);
}

/** Open (o true) or close one of the four pages @param {string} id @param {boolean} o */
function page(id, o) {
  var p = PAGES[id],
    e = /** @type {any} */ (p.el());
  if (!e) return;
  if (o) {
    ovPush();
    if (p.below) mark();
    if (p.bb) barBottom();
    if (p.below) e.style.top = Math.round(/** @type {HTMLElement} */ (document.querySelector(".bar")).getBoundingClientRect().bottom) + "px";
    ovFocus(e, true);
    e.hidden = false;
    expanded(p.openers, true);
    if (p.shown) p.shown();
    // the others close after this one is shown, so their closing does not take this page's Back step
    Object.keys(PAGES).forEach(function (k) {
      if (k !== id) hideFor(k);
    });
    if (p.focus !== "outside") e.scrollTop = 0;
    if (p.focus === "always" || (p.focus === "outside" && !e.contains(document.activeElement))) e.focus({ preventScroll: true });
    return;
  }
  var was = !e.hidden;
  // hidden first, so the bottom bar (and its Library button) can come back to take the focus
  e.hidden = true;
  ovFocus(e, false);
  expanded(p.openers, false);
  if (p.hidden) p.hidden(was);
  ovDone();
}

/** Settings @param {boolean} o */
export function setP(o) {
  page("panel", o);
}
/** The Library @param {boolean} o */
export function setJ(o) {
  page("jump", o);
}
/** The Vedic calendar page @param {boolean} o */
export function setC(o) {
  page("cal", o);
}
/** The routine builder @param {boolean} o */
export function setR(o) {
  page("rtb", o);
}

// @ts-check
// Pinch with two fingers to change the text size (the page itself never zooms)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { byId, root } from "../core/page.js";
import { P, change, dfs } from "../core/state.js";
import { FSA } from "../text/autofit.js";
import { pn } from "../core/apply.js";
import { apply, fsuMark } from "./bars.js";
import { fsTap, szSet } from "./settings-panel.js";
import { LAYERS, setJ, setP } from "./overlays.js";
import { menuWords } from "../core/strings.js";

/** @type {{ d: number, fs: number, at: any } | null} the pinch under way: the fingers' first distance, the size then, the
 * place kept between them (anchorAt()) */
var pz;
// the timers: the bubble, the Default size button, the spoken size, the trackpad pinch
/** @type {any} */
var szTm;
/** @type {any} */
var szrTm;
/** @type {any} */
var szaT;
/** @type {any} */
var wzT;
/** @type {HTMLElement} the size bubble */
var szt;
/** @type {HTMLElement} the Default size button */
var szr;
/** @type {number} the frame that puts the size in */
var pzF;
/** @type {number} the trackpad pinch's size so far */
var wz;
// Where a pinch does nothing (neither resizes the text nor zooms): the home page
var NO_PINCH = "#home";
// What may be open over the text while a pinch still resizes it: Settings (its preview follows the fingers), the
// Library (its list has the text's size) and the reading sheet. Over anything else (the calendar, the routine builder, a
// dialog) a pinch does nothing, as on Home: the text it would resize is hidden behind it (Satish, 2026-11-02).
var PINCH_OVER = ["panel", "jump", "rsh", "pzv"];

/** A pinch (or Ctrl + and −) here leaves the text size alone @param {EventTarget | null} t */
function still(t) {
  var el = /** @type {Element | null} */ (t);
  if (el && el.closest && el.closest(NO_PINCH)) return true;
  return LAYERS.some(function (l) {
    var e = document.getElementById(l.id);
    return PINCH_OVER.indexOf(l.id) < 0 && !!e && !e.hidden;
  });
}

export function init() {
  pz = null;
  szTm = 0;
  szrTm = 0;
  szaT = 0;
  szt = byId("szt");
  szr = byId("szr");
  szr.onclick = function () {
    szr.hidden = true;
    change({ fsu: 0, fs: dfs() }, apply);
    showSz();
  };
  // Pinch changes the text size, never the page zoom. The two-finger touch is cancelled as soon as it
  // starts (not only when the fingers move), so Safari can't begin its own zoom first; the size is
  // applied once per frame, so the page keeps up with the fingers; and if the page still ends up
  // zoomed (a pinch that began mid-scroll can't be cancelled), it is put back to normal straight away.
  pzF = 0;
  // The page never zooms anywhere (decided 2026-10-16): a page that zooms on some parts and not others looks
  // broken on a phone. On the home page a pinch does nothing at all, since it has no verses to resize.
  document.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length === 2 && byId("pzv").hidden) {
        if (e.cancelable) e.preventDefault();
        if (still(e.target)) {
          pz = null;
          return;
        }
        szr.hidden = true;
        // the words between the fingers stay between them as the text grows or shrinks
        pz = {
          d: dist(e) || 1,
          fs: P.fs,
          at: anchorAt((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2),
        };
      }
    },
    { passive: false },
  );
  document.addEventListener(
    "touchmove",
    function (e) {
      // a two-finger move that is not resizing the text (it began on Home or over the calendar) is stopped too
      if (!pz && e.touches.length === 2 && e.cancelable && byId("pzv").hidden) e.preventDefault();
      if (pz && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        var v = Math.max(14, Math.min(52, Math.round((pz.fs * dist(e)) / pz.d)));
        // on the Settings page only the page and its preview follow the fingers; the reading view catches up after
        if (!pn.hidden) {
          if (v !== P.fs) fsTap(v, 1);
          return;
        }
        if (v !== P.fs) {
          P.fs = v;
          P.fsu = 1;
          fsuMark();
          if (!pzF)
            pzF = requestAnimationFrame(function () {
              pzF = 0;
              root.style.setProperty("--fs", P.fs + "px");
              if (pz) keepAt(pz.at);
            });
        }
        showSz();
      }
    },
    { passive: false },
  );
  document.addEventListener(
    "touchend",
    function (e) {
      if (e.touches.length < 2) unzoom();
      if (pz && e.touches.length < 2) {
        var at = pz.at;
        pz = null;
        // (and once the last size is in, and again once anything that follows it has settled)
        requestAnimationFrame(function () {
          keepAt(at);
        });
        setTimeout(function () {
          keepAt(at);
        }, 300);
        change({}); // the size the fingers set (written to P as they moved)
        szSet();
        // Offer a one-tap way back to the default size for a few seconds (Settings has its own reset)
        if (P.fs !== (FSA || dfs()) && pn.hidden) {
          clearTimeout(szTm);
          szTm = setTimeout(function () {
            szt.classList.remove("on");
            szr.hidden = false;
            inView(szr);
            clearTimeout(szrTm);
            szrTm = setTimeout(function () {
              szr.hidden = true;
            }, 4000);
          }, 700);
        }
      }
    },
    { passive: true },
  );
  // Safari's own gesture events: always stopped (pinch resizes the text)
  addEventListener("gestureend", unzoom);
  ["gesturestart", "gesturechange"].forEach(function (n) {
    document.addEventListener(
      n,
      function (e) {
        e.preventDefault();
      },
      { passive: false },
    );
  });
  // Keep the size bubble and the Default size button where the reader can see them while either is up
  if (window.visualViewport)
    ["scroll", "resize"].forEach(function (n) {
      /** @type {VisualViewport} */ (window.visualViewport).addEventListener(n, function () {
        if (szt.classList.contains("on")) inView(szt);
        if (!szr.hidden) inView(szr);
      });
    });
  wz = 0;
  wzT = 0;
  addEventListener(
    "wheel",
    function (e) {
      if (!e.ctrlKey || !byId("pzv").hidden) return;
      e.preventDefault();
      if (still(e.target)) return;
      wz = (wz || P.fs) * Math.exp(-e.deltaY * 0.01);
      clearTimeout(wzT);
      wzT = setTimeout(function () {
        wz = 0;
      }, 400);
      var v = Math.round(wz);
      if (v !== P.fs) deskSz(v, 1);
    },
    { passive: false },
  );
  document.addEventListener("keydown", function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || !byId("pzv").hidden) return;
    var k = e.key;
    if (k !== "+" && k !== "=" && k !== "-" && k !== "_" && k !== "0") return;
    e.preventDefault();
    if (still(null)) return;
    if (k === "0") deskSz(0, 0);
    else deskSz(P.fs + (k === "+" || k === "=" ? 2 : -2), 1);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      setP(false);
      setJ(false);
    }
  });
}

// A place in the text under a point on the screen, to keep there while the text is resized: the letter there (or, between
// lines, the element there and how far down it the point is)
/** @param {number} x @param {number} y */
function anchorAt(x, y) {
  var r = null,
    d = /** @type {any} */ (document);
  try {
    if (d.caretRangeFromPoint) r = d.caretRangeFromPoint(x, y);
    else if (d.caretPositionFromPoint) {
      var c = d.caretPositionFromPoint(x, y);
      if (c) {
        r = document.createRange();
        r.setStart(c.offsetNode, c.offset);
      }
    }
  } catch (e) {
    r = null;
  }
  if (r && r.startContainer.nodeType === 3) {
    var n = /** @type {Text} */ (r.startContainer),
      o = Math.min(r.startOffset, n.data.length - 1);
    if (o >= 0) {
      r.setStart(n, o);
      r.setEnd(n, o + 1);
      var b = r.getBoundingClientRect();
      if (b.height) return { r: r, t: b.top };
    }
  }
  var el = document.elementFromPoint(x, y);
  if (!el) return null;
  var eb = el.getBoundingClientRect();
  return { el: el, y: y, f: eb.height ? (y - eb.top) / eb.height : 0 };
}
// Scroll so that place is back where it was on the screen (the page, or the list it is in when that scrolls itself)
/** @param {any} a */
function keepAt(a) {
  if (!a) return;
  var dy, node;
  if (a.r) {
    node = a.r.startContainer;
    if (!node.isConnected) return;
    var b = a.r.getBoundingClientRect();
    if (!b.height) return;
    dy = b.top - a.t;
  } else {
    node = a.el;
    if (!node.isConnected) return;
    var e = a.el.getBoundingClientRect();
    dy = e.top + a.f * e.height - a.y;
  }
  if (Math.abs(dy) < 1) return;
  for (var x = node.parentElement; x && x !== document.body && x !== document.documentElement; x = x.parentElement) {
    var oy = getComputedStyle(x).overflowY;
    if ((oy === "auto" || oy === "scroll") && x.scrollHeight > x.clientHeight) {
      x.scrollTop += dy;
      return;
    }
  }
  window.scrollBy(0, dy);
}

/** @param {TouchEvent} e */
function dist(e) {
  var a = e.touches[0],
    b = e.touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function showSz() {
  var m = menuWords("languages").size(String(Math.round((P.fs / (FSA || dfs())) * 100)));
  szt.textContent = m;
  // The bubble changes with every move of the fingers, so screen readers don't read it;
  // the size is announced once, when the fingers (or the wheel) stop
  clearTimeout(szaT);
  szaT = setTimeout(function () {
    byId("sza").textContent = m;
  }, 700);
  inView(szt);
  szt.classList.add("on");
  clearTimeout(szTm);
  szTm = setTimeout(function () {
    szt.classList.remove("on");
  }, 900);
}

// The bubble and the button are fixed near the top of the screen. On iPhones, "fixed" follows the layout
// viewport, which can differ from what is on screen (at the bottom of the page as the toolbar collapses, or
// while a pinch the browser could not stop has the page zoomed), so they could end up out of view or out of
// reach. They are placed in the visible part of the page instead (the same place when the two agree).
// The distance from the top comes from the CSS (below the top bar, and below the notch on iPhones).
/** @param {HTMLElement} el */
function inView(el) {
  var vv = window.visualViewport;
  el.style.top = el.style.left = "";
  if (!vv || (vv.scale === 1 && !vv.offsetTop && !vv.offsetLeft)) return;
  var t = parseFloat(getComputedStyle(el).top) || 84;
  el.style.top = Math.round(vv.offsetTop + t / vv.scale) + "px";
  el.style.left = Math.round(vv.offsetLeft + vv.width / 2) + "px";
}

function unzoom() {
  var vv = window.visualViewport,
    vm = document.querySelector('meta[name="viewport"]');
  if (!vv || !vm || vv.scale < 1.01) return;
  var meta = vm,
    c = vm.getAttribute("content") || "";
  meta.setAttribute("content", c + ",maximum-scale=1");
  setTimeout(function () {
    meta.setAttribute("content", c);
  }, 300);
}

// On a computer: Ctrl/⌘ + and −, Ctrl/⌘ 0 and a trackpad pinch (which the browser sends as Ctrl + wheel) change
// the text size the same way a pinch does on a phone, instead of zooming the whole page
/** @param {number} v @param {0 | 1} fsu */
function deskSz(v, fsu) {
  v = Math.max(14, Math.min(52, v));
  if (!pn.hidden) return fsTap(v, fsu);
  change({ fsu: fsu, fs: fsu ? v : dfs() }, function () {
    if (!fsu) return apply();
    fsuMark();
    if (!pzF)
      pzF = requestAnimationFrame(function () {
        pzF = 0;
        root.style.setProperty("--fs", P.fs + "px");
      });
  });
  szSet();
  showSz();
}

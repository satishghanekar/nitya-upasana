// Keep the screen on (Wake Lock) for the minutes chosen in Settings (P.wake: 0 off, 15, 30, 45 or 60), counted from
// the last touch, key or scroll (autoscroll too), so a phone left on the stand dims and locks as it normally would
// (Satish, 2026-10-30). Browsers drop the lock when the page is hidden, so it is asked for again on the way back.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P, change } from "../core/state.js";
import { apply } from "./bars.js";

// The screen lock while it is held, else null
/** @type {any} */
var wl = null;
/** a lock asked for and not yet granted, so a burst of taps asks once */
var asking = false;
/** when the reader last touched, typed or scrolled (Date.now()) */
var last = 0;
/** the timer that lets the lock go once the minutes have passed since then */
var tm = 0;

export function init() {
  wl = null;
  asking = false;
  last = Date.now();
  tm = 0;
  if (!("wakeLock" in navigator)) document.getElementById("twrow").hidden = true;
  document.getElementById("tw").onclick = function (e) {
    var b = /** @type {HTMLElement} */ (e.target).closest("button");
    if (!b) return;
    change({ wake: +b.dataset.v }, apply);
    // the minutes chosen count from now (a shorter choice must not wait out the longer one's timer)
    clearTimeout(tm);
    tm = 0;
    wake(!!P.wake);
  };
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") used();
  });
  // Some browsers only grant the lock after a tap; any tap, key or scroll starts the minutes again. Scroll does not
  // bubble, so it is heard on the way down (capture), from the page and from Settings, the Library and the sheets
  ["touchend", "click", "keydown", "wheel"].forEach(function (n) {
    document.addEventListener(n, used, { passive: true });
  });
  document.addEventListener("scroll", used, { passive: true, capture: true });
}

// the reader is here: the minutes start again, and the lock is asked for again if it had gone
function used() {
  if (P.wake) wake(true);
}

/**
 * Hold the screen on for P.wake minutes from now, or let it go
 * @param {boolean} on
 */
export function wake(on) {
  if (!("wakeLock" in navigator)) return;
  if (on) {
    last = Date.now();
    if (!tm) wait(P.wake * 60000);
    if (wl || asking) return;
    asking = true;
    navigator.wakeLock
      .request("screen")
      .then(function (l) {
        asking = false;
        wl = l;
        l.addEventListener("release", function () {
          if (wl === l) wl = null;
        });
      })
      .catch(function () {
        asking = false;
      });
  } else {
    clearTimeout(tm);
    tm = 0;
    release();
  }
}

/**
 * Check again after ms: the lock goes once P.wake minutes have passed since the last use. One timer, moved on as
 * needed, rather than a new one on every scroll
 * @param {number} ms
 */
function wait(ms) {
  tm = setTimeout(function () {
    tm = 0;
    if (!P.wake) return;
    var left = last + P.wake * 60000 - Date.now();
    if (left > 0) wait(left);
    else release();
  }, ms);
}

function release() {
  if (!wl) return;
  try {
    wl.release();
  } catch (e) {}
  wl = null;
}

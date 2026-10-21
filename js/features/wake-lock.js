// Keep the screen on (Wake Lock). Browsers drop the lock when the page is hidden, so it is re-requested.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P, change } from "../core/state.js";
import { apply } from "./bars.js";

// The screen lock while it is held, else null
/** @type {any} */
var wl = null;

export function init() {
  wl = null;
  if (!("wakeLock" in navigator)) document.getElementById("tw").hidden = true;
  document.getElementById("tw").onclick = function () {
    change({ wake: P.wake ? 0 : 1 }, apply);
    wake(!!P.wake);
  };
  document.addEventListener("visibilitychange", function () {
    if (P.wake && document.visibilityState === "visible" && !wl) wake(true);
  });
  // Some browsers only grant the lock after a tap
  ["touchend", "click"].forEach(function (n) {
    document.addEventListener(
      n,
      function () {
        if (P.wake && !wl) wake(true);
      },
      { passive: true },
    );
  });
}

export function wake(on) {
  if (!("wakeLock" in navigator)) return;
  if (on) {
    navigator.wakeLock
      .request("screen")
      .then(function (l) {
        wl = l;
        l.addEventListener("release", function () {
          wl = null;
        });
      })
      .catch(function () {});
  } else if (wl) {
    try {
      wl.release();
    } catch (e) {}
    wl = null;
  }
}

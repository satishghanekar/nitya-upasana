// Keep the screen on (Wake Lock). Browsers drop the lock when the page is hidden, so it is re-requested.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { shared, P, save } from "../core/state.js";
import { apply } from "./bars.js";

export function init() {
  shared.wl = null;
  if (!("wakeLock" in navigator)) document.getElementById("tw").hidden = true;
  document.getElementById("tw").onclick = function () {
    P.wake = P.wake ? 0 : 1;
    apply();
    save();
    wake(!!P.wake);
  };
  document.addEventListener("visibilitychange", function () {
    if (P.wake && document.visibilityState === "visible" && !shared.wl) wake(true);
  });
  // Some browsers only grant the lock after a tap
  ["touchend", "click"].forEach(function (n) {
    document.addEventListener(
      n,
      function () {
        if (P.wake && !shared.wl) wake(true);
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
        shared.wl = l;
        l.addEventListener("release", function () {
          shared.wl = null;
        });
      })
      .catch(function () {});
  } else if (shared.wl) {
    try {
      shared.wl.release();
    } catch (e) {}
    shared.wl = null;
  }
}

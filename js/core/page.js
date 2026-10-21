// Page basics: the <html> element and the short message (flash)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "./state.js";

export var root, secs, bt;

export function init() {
  root = document.documentElement;
  // Safari and every iOS browser (WebKit) need a different print layout trick; mark them with class "wk"
  (function (u) {
    if (/AppleWebKit/.test(u) && !/Chrome\/|Chromium|Edg\/|OPR\//.test(u)) root.classList.add("wk");
  })(navigator.userAgent);
  secs = [].slice.call(document.querySelectorAll(".ash"));
  bt = document.getElementById("bt");
}

// Short message near the top of the screen (Marathi text m, English text e). It has its own element,
// separate from the text-size bubble, so a pinch can't wipe it and screen readers hear it on its own.
export function flash(m, e, ms) {
  var x = document.getElementById("fl");
  x.textContent = P.ui === "en" ? e : m;
  x.classList.remove("err");
  x.classList.add("on");
  clearTimeout(flash.t);
  flash.t = setTimeout(function () {
    x.classList.remove("on");
  }, ms || 1600);
}

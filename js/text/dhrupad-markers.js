// Tappable dhrupad markers (Aartis 1–5, 7 and 9)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { shared } from "../core/state.js";
import { topEdge } from "../features/bottom-bar.js";

var RMKTAP;

export function init() {
  // Tapping ↻ ध्रुपद shows the dhrupad in a bubble just above the marker, over the stanza just sung,
  // so the next stanza stays clear. Tap again, tap elsewhere or press Escape to close; it also closes by itself.
  RMKTAP = ["a1", "a2", "a3", "a4", "a5", "a7", "a9"];
  shared.rmkPop = null;
  RMKTAP.forEach(function (id) {
    [].forEach.call(document.querySelectorAll("#" + id + " .items > .rmk"), function (m) {
      m.classList.add("rmkt");
      m.setAttribute("role", "button");
      m.setAttribute("tabindex", "0");
      m.setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("click", function (e) {
    var m = e.target.closest && e.target.closest(".rmkt");
    if (m) {
      e.stopPropagation();
      rmkOpen(m);
    } else rmkClose();
  }, true);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && shared.rmkPop) return rmkClose();
    var m = e.target.closest && e.target.closest(".rmkt");
    if (m && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      rmkOpen(m);
    }
  });
  addEventListener("scroll", function () {
    if (shared.rmkPop && !shared.rmkPop.m.getBoundingClientRect().height) rmkClose();
  }, { passive: true });
  addEventListener("resize", function () {
    if (shared.rmkPop) shared.rmkPop.el.place();
  });
}

export function rmkClose() {
  if (!shared.rmkPop) return;
  shared.rmkPop.m.setAttribute("aria-expanded", "false");
  if (shared.rmkPop.el.ro) shared.rmkPop.el.ro.disconnect();
  shared.rmkPop.el.remove();
  shared.rmkPop = null;
}

export function rmkOpen(m) {
  var was = shared.rmkPop && shared.rmkPop.m === m;
  rmkClose();
  if (was) return;
  var src = m.closest("section.ash").querySelector(".rftop .verse");
  if (!src) return;
  var el = document.createElement("div");
  el.className = "rmkpop";
  el.setAttribute("role", "status");
  el.appendChild(src.cloneNode(true));
  m.appendChild(el);
  m.setAttribute("aria-expanded", "true");
  // Keep the bubble on screen: shift it sideways if needed; if there is no room above (under the top bar), put it below.
  // Placed again whenever the bubble changes size (text size, fonts, the iPhone toolbar hiding or showing)
  // or the window resizes, so an earlier shift can't leave it off the edge.
  function place() {
    // Placed in pixels, without CSS transforms: Safari can report the box before a transform
    // applies, which made the old centring shift the bubble off the left edge.
    el.style.left = "0px";
    var b0 = el.getBoundingClientRect(),
      mr = m.getBoundingClientRect(),
      w = b0.width,
      pad = 8,
      vv = window.visualViewport,
      W = document.documentElement.clientWidth || innerWidth,
      L = Math.max(0, vv ? vv.offsetLeft : 0),
      R = Math.min(W, vv ? vv.offsetLeft + vv.width : W);
    if (R - L < w + 2 * pad) {
      L = 0;
      R = W;
    }
    var x = mr.left + mr.width / 2 - w / 2;
    x = Math.min(x, R - pad - w);
    x = Math.max(x, L + pad, pad);
    el.style.left = Math.round(x - b0.left) + "px";
  }
  place();
  var r = el.getBoundingClientRect();
  if (r.top < topEdge() + 4) el.classList.add("below");
  el.place = place;
  if (window.ResizeObserver) {
    el.ro = new ResizeObserver(function () {
      place();
    });
    el.ro.observe(el);
  }
  // no time limit (WCAG 2.2.1): a refrain can take longer to sing than any timer; it closes on a second tap,
  // a tap elsewhere, Escape, or when its marker scrolls out of sight
  shared.rmkPop = { m: m, el: el };
}

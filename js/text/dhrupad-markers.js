// @ts-check
// Tappable dhrupad markers (every text with refrain: every-verse)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { onPiece, topEdge } from "../core/page.js";

// The open bubble, { m: its marker, el: the bubble, place: puts it on screen, ro: watches its size }, or null
/** @type {{ m: HTMLElement, el: HTMLElement, place: () => void, ro: ResizeObserver | null } | null} */
export var rmkPop = null;

export function init() {
  // Tapping ↻ ध्रुपद shows the dhrupad in a bubble just above the marker, over the stanza just sung,
  // so the next stanza stays clear. Tap again, tap elsewhere or press Escape to close; it also closes by itself.
  rmkPop = null;
  onPiece(markTappable);
  document.addEventListener(
    "click",
    function (e) {
      var m = tapped(e);
      if (m) {
        e.stopPropagation();
        rmkOpen(m);
      } else rmkClose();
    },
    true,
  );
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && rmkPop) return rmkClose();
    var m = tapped(e);
    if (m && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      rmkOpen(m);
    }
  });
  addEventListener(
    "scroll",
    function () {
      if (rmkPop && !rmkPop.m.getBoundingClientRect().height) rmkClose();
    },
    { passive: true },
  );
  addEventListener("resize", function () {
    if (rmkPop) rmkPop.place();
  });
}

/** The tappable marker an event happened in, if any @param {Event} e @returns {HTMLElement | null} */
function tapped(e) {
  var t = /** @type {any} */ (e.target);
  return t && t.closest ? t.closest(".rmkt") : null;
}

// The tappable markers in the pieces inside r (the page, or a printout's copy: js/print/compose.js, which keeps them
// as the page has them, so the printout is laid out the same)
// Every dhrupad marker (not a [note] of the text's own, .nt) in a piece with the dhrupad at the top (.rftop)
export function markTappable(/** @type {ParentNode} */ r) {
  r.querySelectorAll(".ash .items > .rmk:not(.nt)").forEach(function (m) {
    var sec = m.closest("section.ash");
    if (!sec || !sec.querySelector(".rftop .verse")) return;
    m.classList.add("rmkt");
    m.setAttribute("role", "button");
    m.setAttribute("tabindex", "0");
    m.setAttribute("aria-expanded", "false");
  });
}

export function rmkClose() {
  if (!rmkPop) return;
  rmkPop.m.setAttribute("aria-expanded", "false");
  if (rmkPop.ro) rmkPop.ro.disconnect();
  rmkPop.el.remove();
  rmkPop = null;
}

/** @param {HTMLElement} m */
export function rmkOpen(m) {
  var was = rmkPop && rmkPop.m === m;
  rmkClose();
  if (was) return;
  var sec = m.closest("section.ash"),
    src = sec && sec.querySelector(".rftop .verse");
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
  var ro = null;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(function () {
      place();
    });
    ro.observe(el);
  }
  // no time limit (WCAG 2.2.1): a refrain can take longer to sing than any timer; it closes on a second tap,
  // a tap elsewhere, Escape, or when its marker scrolls out of sight
  rmkPop = { m: m, el: el, place: place, ro: ro };
}

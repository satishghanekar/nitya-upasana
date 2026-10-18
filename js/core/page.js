// Page basics: the <html> element, the language button icons, the short message (flash)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "./state.js";

export var root, secs, bt, LI, RB_LOOP, RB_ONCE;
var LI0, k;

export function init() {
  root = document.documentElement;
  // Safari and every iOS browser (WebKit) need a different print layout trick; mark them with class "wk"
  (function (u) {
    if (/AppleWebKit/.test(u) && !/Chrome\/|Chromium|Edg\/|OPR\//.test(u)) root.classList.add("wk");
  })(navigator.userAgent);
  secs = [].slice.call(document.querySelectorAll(".ash"));
  bt = document.getElementById("bt");
  // Icons for the language button (Marathi / English / Both)
  LI = {
    mr: '<svg viewBox="0 0 40 34" width="40" height="34" aria-hidden="true"><rect x="14" y="3" width="20" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".55"/><text x="24" y="16.5" text-anchor="middle" font-size="12" font-weight="600" style="fill:currentColor;font-family:var(--lat)" opacity=".55">A</text><rect x="4" y="11" width="20" height="18" rx="4" style="fill:var(--accent)"/><text x="14" y="25" text-anchor="middle" font-size="14" style="fill:var(--bg);font-family:var(--head)">अ</text></svg>',
    en: '<svg viewBox="0 0 40 34" width="40" height="34" aria-hidden="true"><rect x="4" y="3" width="20" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".55"/><text x="14" y="16.5" text-anchor="middle" font-size="13" style="fill:currentColor;font-family:var(--head)" opacity=".55">अ</text><rect x="14" y="11" width="20" height="18" rx="4" style="fill:var(--accent)"/><text x="24" y="24.5" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--bg);font-family:var(--lat)">A</text></svg>',
    both: '<svg viewBox="0 0 44 34" width="42" height="34" aria-hidden="true"><rect x="2" y="8" width="19" height="18" rx="4" style="fill:var(--accent)"/><text x="11.5" y="22" text-anchor="middle" font-size="14" style="fill:var(--bg);font-family:var(--head)">अ</text><rect x="23" y="8" width="19" height="18" rx="4" style="fill:var(--accent)"/><text x="32.5" y="21.5" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--bg);font-family:var(--lat)">A</text></svg>',
    // Both, English first (Settings → In Both, show first): the same two cards, A on the left
    bothEn: '<svg viewBox="0 0 44 34" width="42" height="34" aria-hidden="true"><rect x="2" y="8" width="19" height="18" rx="4" style="fill:var(--accent)"/><text x="11.5" y="21.5" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--bg);font-family:var(--lat)">A</text><rect x="23" y="8" width="19" height="18" rx="4" style="fill:var(--accent)"/><text x="32.5" y="22" text-anchor="middle" font-size="14" style="fill:var(--bg);font-family:var(--head)">अ</text></svg>',
  };
  // In Kannada letters the cards show ಕ in place of अ (set again when the main language changes)
  LI0 = {};
  for (k in LI) LI0[k] = LI[k];
  liSet();
  // Icons for the dhrupad button: repeated after every stanza / shown once
  RB_LOOP = '<svg viewBox="0 0 38 38" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M31 19a12 12 0 1 1-4-8.9"/><path d="M27.5 5.5v5h-5"/><text x="19" y="24.5" text-anchor="middle" font-size="14" stroke="none" fill="currentColor" style="font-family:var(--head)">धृ</text></svg>';
  RB_ONCE = '<svg viewBox="0 0 38 38" width="34" height="34" fill="none" aria-hidden="true"><text x="16.5" y="26" text-anchor="middle" font-size="19" fill="currentColor" style="font-family:var(--head)">धृ</text><text x="30" y="15" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor" style="font-family:var(--lat)">1</text></svg>';
}

export function liSet() {
  for (var k in LI0) LI[k] = SCR.k ? LI0[k].replace('font-family:var(--head)">अ<', "font-family:'Noto Sans Kannada'\">ಕ<") : LI0[k];
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

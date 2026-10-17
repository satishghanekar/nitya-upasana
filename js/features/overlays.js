// Overlays: settings panel (setP) and contents + search (setJ); opening one closes the other
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { root } from "../core/page.js";
import { aa, jp, pn } from "../core/apply.js";
import { mark } from "./bars.js";
import { fsFlush, szSet } from "./settings-panel.js";
import { ovDone, ovPush } from "./history.js";
import { spSet } from "./languages.js";

// Keyboard and screen reader users: opening a panel moves focus into it; closing it puts focus back on
// the button that opened it (only if focus was still in the panel, so a jump to a piece isn't undone)
function ovFocus(el, o) {
  var a = document.activeElement;
  if (o) {
    if (el.hidden) el._ret = a;
    return;
  }
  if (el._ret && (el.contains(a) || a === document.body || !a)) {
    try {
      el._ret.focus({ preventScroll: true });
    } catch (e) {}
  }
  el._ret = null;
}

export function setP(o) {
  if (!o) fsFlush();
  if (o) ovPush();
  ovFocus(pn, o);
  pn.hidden = !o;
  if (o) {
    spSet();
    szSet(); // a pinch on the page changes the size without passing through here
  }
  // the Settings page covers the whole page; the page under it doesn't scroll
  if (o) root.setAttribute("data-sp", "1");
  else root.removeAttribute("data-sp");
  if (o) {
    pn.scrollTop = 0;
    pn.focus({ preventScroll: true });
  }
  aa.setAttribute("aria-expanded", String(o));
  if (o) setJ(false);
  else ovDone();
}

export function setJ(o) {
  if (o) ovPush();
  var qq = document.getElementById("q");
  if (qq && qq.value) {
    qq.value = "";
    document.getElementById("res").innerHTML = "";
    document.getElementById("none").hidden = true;
    document.getElementById("jl").hidden = false;
  }
  if (!o && qq) qq.blur();
  if (o) {
    mark();
    var bb = document.querySelector(".bar").getBoundingClientRect();
    jp.style.top = Math.round(bb.bottom) + "px";
  }
  ovFocus(jp, o);
  jp.hidden = !o;
  if (o && !jp.contains(document.activeElement)) jp.focus({ preventScroll: true });
  [].forEach.call(document.querySelectorAll("#hm,.pns,#asq"), function (b) {
    b.setAttribute("aria-expanded", String(o));
  });
  if (o) {
    fsFlush();
    ovFocus(pn, false);
    pn.hidden = true;
    aa.setAttribute("aria-expanded", "false");
  } else ovDone();
}

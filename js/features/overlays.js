// Overlays: settings panel (setP), the Library (setJ) and the Vedic calendar page (setC, js/features/vedic-calendar.js);
// opening one closes the others
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
  if (o) calHide();
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
    calHide();
  } else ovDone();
}

// The Vedic calendar page (#cal): opened by the line on Home (#panb), under the top bar like the Library; Back, the
// phone's Back or Escape closes it and focus returns to that line
function calHide() {
  var c = document.getElementById("cal"),
    b = document.getElementById("panb");
  if (!c || c.hidden) return;
  c._ret = null;
  c.hidden = true;
  if (b) b.setAttribute("aria-expanded", "false");
}

export function setC(o) {
  var c = document.getElementById("cal"),
    b = document.getElementById("panb");
  if (!c) return;
  if (o) ovPush();
  if (o) {
    mark();
    var bb = document.querySelector(".bar").getBoundingClientRect();
    c.style.top = Math.round(bb.bottom) + "px";
  }
  ovFocus(c, o);
  c.hidden = !o;
  if (b) b.setAttribute("aria-expanded", String(o));
  if (o) {
    // the others close after this one is shown, so their closing does not take this page's Back step
    setJ(false);
    setP(false);
    c.scrollTop = 0;
    c.focus({ preventScroll: true });
  } else ovDone();
}

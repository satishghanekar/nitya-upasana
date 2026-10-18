// Reading sheet: Aa in the bottom bar slides up language, text size and dhrupad, within thumb reach
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { shared, P, dfs, save } from "../core/state.js";
import { LANGS, LK, cur } from "../core/apply.js";
import { apply } from "./bars.js";
import { szSet } from "./settings-panel.js";
import { setP } from "./overlays.js";
import { refToggle } from "./dhrupad-button.js";
import { ovDone, ovPush } from "./history.js";

var rsh, rsb, fsT, fsA;

export function init() {
  // The same choices as the top bar's language and dhrupad buttons and Settings → Text size, in one sheet over
  // the bottom bar. A tap outside it, ✕, Escape or the phone's Back closes it (history.js lists #rsh with the
  // other dialogs). The page under it doesn't scroll while it is open.
  rsh = document.getElementById("rsh");
  rsb = document.getElementById("rsb");
  fsT = 0;
  rsb.onclick = function () {
    rsOpen(rsh.hidden);
  };
  document.getElementById("rsx").onclick = function () {
    rsOpen(false);
  };
  // the dimmed page around the sheet (the bottom bar too, Aa included): a tap there closes it
  rsh.addEventListener("click", function (e) {
    if (e.target === rsh) rsOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !rsh.hidden) rsOpen(false);
  });
  // Language: what the top bar's button cycles through (main, second, both), each one tap away
  document.getElementById("rsl").onclick = function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.v === "+") return rsSettings("sl2s");
    if (b.dataset.v === P.lang) return;
    var c = cur();
    P.lang = b.dataset.v;
    apply();
    save();
    if (c) c.scrollIntoView();
    rsSet();
  };
  // Text size: A− / A+ in steps of 2px, as in Settings; the page is laid out again once the taps stop,
  // with the line at the top of the screen kept in place
  document.getElementById("rsm").onclick = function () {
    rsSize(Math.max(14, P.fs - 2), 1);
  };
  document.getElementById("rsp").onclick = function () {
    rsSize(Math.min(52, P.fs + 2), 1);
  };
  document.getElementById("rsr").onclick = function () {
    rsSize(dfs(), 0);
  };
  // Dhrupad: switched as the top bar's dhrupad button does, keeping the reader's place
  document.getElementById("rsf").onclick = function (e) {
    var b = e.target.closest("button");
    if (b && b.dataset.v !== String(P.ref)) refToggle(true);
    rsSet();
  };
  document.getElementById("rsall").onclick = function () {
    rsSettings();
  };
}

export function rsOpen(o) {
  if (o === !rsh.hidden) return;
  if (o) ovPush();
  else rsFlush();
  rsh.hidden = !o;
  rsb.setAttribute("aria-expanded", String(o));
  document.documentElement.style.overflow = o ? "hidden" : "";
  if (o) {
    // the sheet sits on the bottom bar, which stays in sight under the dimmed page
    rsh.style.setProperty("--rsb", Math.round(innerHeight - document.getElementById("asc").getBoundingClientRect().top) + "px");
    rsSet();
    rsh.querySelector(".rsc").focus({ preventScroll: true });
  } else {
    try {
      rsb.focus({ preventScroll: true });
    } catch (e) {}
    ovDone();
  }
}

// Settings from the sheet: the sheet's Back step is handed on to Settings, so Back still closes it
function rsSettings(focusId) {
  rsFlush();
  rsh.hidden = true;
  rsb.setAttribute("aria-expanded", "false");
  document.documentElement.style.overflow = "";
  setP(true);
  if (focusId) document.getElementById(focusId).focus();
}

// The choices as they are now
function rsSet() {
  var mr = P.ui === "mr",
    o = P.l2 ? [P.lead, P.l2, "both"] : [P.lead, "+"];
  document.getElementById("rsl").innerHTML = o
    .map(function (v) {
      var l = v === "both" || v === "+" ? (mr ? "mr" : "en") : LK(v) === "kn" ? "kn" : LK(v),
        t = v === "both" ? (mr ? "दोन्ही" : "Both") : v === "+" ? (mr ? "+ दुसरी भाषा" : "+ Second language") : LANGS[LK(v)].n;
      return '<button type="button" data-v="' + v + '" lang="' + l + '"' + (v === "+" ? "" : ' aria-pressed="' + (v === P.lang) + '"') + ">" + t + "</button>";
    })
    .join("");
  [].forEach.call(document.querySelectorAll("#rsf button"), function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === String(P.ref)));
  });
  document.getElementById("rsx").setAttribute("aria-label", mr ? "बंद करा" : "Close");
  document.getElementById("rsr").setAttribute("aria-label", mr ? "मूळ आकार" : "Reset text size");
  rsPct();
}

function rsPct() {
  document.getElementById("rsv").textContent = Math.round((P.fs / (shared.FSA || dfs())) * 100) + "%";
}

function rsSize(fs, fsu) {
  if (!fsT) fsA = rsAnchor();
  P.fs = fs;
  P.fsu = fsu;
  save();
  rsPct();
  szSet();
  clearTimeout(fsT);
  fsT = setTimeout(rsFlush, 400);
}

function rsFlush() {
  if (!fsT) return;
  clearTimeout(fsT);
  fsT = 0;
  apply();
  if (fsA && fsA.el.offsetParent !== null) scrollBy(0, fsA.el.getBoundingClientRect().top - fsA.t);
  fsA = null;
}

// the first verse line below the top bar, and where it is on screen
function rsAnchor() {
  var bb = document.querySelector(".bar").getBoundingClientRect().bottom,
    ps = document.querySelectorAll(".items .verse p");
  for (var i = 0; i < ps.length; i++) {
    var r = ps[i].getBoundingClientRect();
    if (r.height && r.bottom > bb + 4) return { el: ps[i], t: r.top };
  }
  return null;
}

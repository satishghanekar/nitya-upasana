// Settings panel
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { flash } from "../core/page.js";
import { shared, P, dfs, save } from "../core/state.js";
import { trSet } from "../text/iast.js";
import { refit } from "../text/autofit.js";
import { cur, pn } from "../core/apply.js";
import { apply } from "./bars.js";
import { buildIX } from "../text/search.js";

var fsT;

export function init() {
  // Text size: the Settings page and its preview change at once; the long page under it is laid out
  // again once the taps stop (or when Settings closes). Laying it out on every tap made A−/A+ feel stuck on phones.
  fsT = 0;
  document.getElementById("lg").onclick = function () {
    fsTap(Math.min(52, P.fs + 2), 1);
  };
  document.getElementById("sr").onclick = function () {
    fsTap(dfs(), 0);
  };
  document.getElementById("sm").onclick = function () {
    fsTap(Math.max(14, P.fs - 2), 1);
  };
  // Text font: switched at once; the text size is fitted again when the new font has arrived
  document.getElementById("sfn").onclick = function (e) {
    var v = (e.target.closest("button") || { dataset: {} }).dataset.v;
    if (!v || v === P.fnt) return;
    P.fnt = v;
    save();
    apply();
    refit();
  };
  document.getElementById("su").onclick = function (e) {
    var v = (e.target.closest("button") || { dataset: {} }).dataset.v;
    if (v) {
      P.ui = v;
      apply();
      save();
    }
  };
  document.getElementById("st").onclick = function (e) {
    var v = (e.target.closest("button") || { dataset: {} }).dataset.v;
    if (v) {
      P.th = v;
      apply();
      save();
    }
  };
  document.getElementById("tc").onclick = function () {
    P.hc = P.hc ? 0 : 1;
    apply();
    save();
  };
  document.getElementById("sc").onclick = function (e) {
    var v = (e.target.closest("button") || { dataset: {} }).dataset.v;
    if (!v) return;
    var c = cur();
    P.cols = +v;
    apply();
    save();
    if (c) c.scrollIntoView();
  };
}

export function fsTap(fs, fsu) {
  P.fs = fs;
  P.fsu = fsu;
  save();
  pn.style.setProperty("--fs", P.fs + "px");
  szSet();
  clearTimeout(fsT);
  fsT = setTimeout(fsFlush, 700);
}

// The size shown between A− and A+: a share of the size Reset gives (the fitted size), as the pinch shows it
export function szSet() {
  document.getElementById("szv").textContent = Math.round((P.fs / (shared.FSA || dfs())) * 100) + "%";
}

export function fsFlush() {
  if (!fsT) return;
  clearTimeout(fsT);
  fsT = 0;
  apply();
  pn.style.removeProperty("--fs");
}

// English style (picked with English in the language lists): switched in place (lines, titles, search list),
// then the text size is fitted again
export function trPick(v) {
  if (v && v !== P.tr) {
    P.tr = v;
    save();
    // each step runs on its own, so a failure in one (named with the browser's message, so it can be traced)
    // can't stop the others or leave the switch showing the old choice; apply() below always runs
    var bad = [];
    [
      ["lines", function () { trSet(v, true); }],
      ["search", buildIX],
      // the text size is fitted to the main language's lines, so only English-only text needs fitting again
      ["size", function () { if (P.lang === "en") refit(); }],
    ].forEach(function (st) {
      try {
        st[1]();
      } catch (er) {
        bad.push(st[0] + ": " + ((er && er.message) || er));
      }
    });
    if (bad.length) {
      flash("बदल पूर्ण झाला नाही (" + bad.join("; ") + ")", "Could not finish the change (" + bad.join("; ") + ")");
      var zt = document.getElementById("fl");
      zt.classList.add("err");
      clearTimeout(flash.t);
      flash.t = setTimeout(function () {
        zt.classList.remove("on", "err");
      }, 9000);
    }
    apply();
  }
}

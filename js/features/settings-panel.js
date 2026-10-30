// Settings panel. Its tabs, Reading | Screen | More (#spv, Satish, 2026-10-25; Reading has the languages too), beside Back as on the
// Library and the calendar pages: one tab's groups at a time (each .sp-grp says its tab, data-tab); Settings opens
// on Reading each time, or on the tab its opener asks for (js/features/reading-sheet.js). On desktops (WIDE) there
// are no tabs: every group at once, in two columns (css/09-settings-page.css; Satish, 2026-10-30).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { flash, note } from "../core/page.js";
import { P, change, dfs } from "../core/state.js";
import { FSA } from "../text/autofit.js";
import { trSet } from "../text/iast.js";
import { refit } from "../text/autofit.js";
import { cur, pn } from "../core/apply.js";
import { apply } from "./bars.js";
import { buildIX } from "../text/search.js";
import { fitPreview } from "./languages.js";
import { LANGS, menuWords } from "../core/strings.js";
import { esc } from "../core/words.js";

var fsT;
/** The tab last chosen, kept for when a desktop window is narrowed to tabs again */
var tab = "read";
/** iPads (upright or sideways) and desktops: no tabs, every group (as the min-width: 760px rules in the CSS) */
var WIDE = window.matchMedia("(min-width: 760px)");

/**
 * Show one tab of Settings
 * @param {"read" | "screen" | "more"} v
 */
export function spTab(v) {
  var tb = document.getElementById("spv");
  if (!tb) return;
  tab = v;
  [].forEach.call(tb.querySelectorAll("button"), function (/** @type {HTMLElement} */ b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === v));
  });
  var on = 0;
  [].forEach.call(pn.querySelectorAll(".sp-grp"), function (/** @type {HTMLElement} */ g) {
    g.hidden = !WIDE.matches && g.dataset.tab !== v;
    if (!g.hidden) on++;
  });
  // a tab with one group: its heading is the tab's name, for screen readers only
  [].forEach.call(pn.querySelectorAll(".sp-grp"), function (/** @type {HTMLElement} */ g) {
    g.classList.toggle("sp-one", on === 1);
  });
  pn.scrollTop = 0;
}

export function init() {
  var tb = document.getElementById("spv");
  if (tb)
    tb.addEventListener("click", function (e) {
      var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest("button[data-v]"));
      if (b) spTab(/** @type {any} */ (b.dataset.v));
    });
  spTab("read");
  // a window made wider or narrower across 760px: every group, or the tab chosen
  if (WIDE.addEventListener)
    WIDE.addEventListener("change", function () {
      spTab(/** @type {any} */ (tab));
    });
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
    change({ fnt: v }, apply);
    refit();
  };
  // the menu languages: one button each, from the catalog (js/strings/), named in its own letters
  var su = /** @type {HTMLElement} */ (document.getElementById("su"));
  su.innerHTML = Object.keys(LANGS)
    .map(function (code) {
      return '<button type="button" data-v="' + code + '" lang="' + code + '">' + esc(menuWords("language", code).name) + "</button>";
    })
    .join("");
  su.onclick = function (e) {
    var v = (e.target.closest("button") || { dataset: {} }).dataset.v;
    if (v) {
      change({ ui: v }, apply);
    }
  };
  document.getElementById("st").onclick = function (e) {
    var v = (e.target.closest("button") || { dataset: {} }).dataset.v;
    if (v) {
      change({ th: v }, apply);
    }
  };
  document.getElementById("tc").onclick = function () {
    change({ hc: P.hc ? 0 : 1 }, apply);
  };
  document.getElementById("sc").onclick = function (e) {
    var v = (e.target.closest("button") || { dataset: {} }).dataset.v;
    if (!v) return;
    var c = cur();
    change({ cols: +v }, apply);
    if (c) c.scrollIntoView();
  };
}

export function fsTap(fs, fsu) {
  change({ fs: fs, fsu: fsu });
  pn.style.setProperty("--fs", P.fs + "px");
  fitPreview();
  szSet();
  clearTimeout(fsT);
  fsT = setTimeout(fsFlush, 700);
}

// The size shown between A− and A+: a share of the size Reset gives (the fitted size), as the pinch shows it
export function szSet() {
  document.getElementById("szv").textContent = Math.round((P.fs / (FSA || dfs())) * 100) + "%";
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
    change({ tr: v });
    // each step runs on its own, so a failure in one (named with the browser's message, so it can be traced)
    // can't stop the others or leave the switch showing the old choice; apply() below always runs
    var bad = [];
    [
      [
        "lines",
        function () {
          trSet(v, true);
        },
      ],
      ["search", buildIX],
      // the text size is fitted to the main language's lines, so only English-only text needs fitting again
      [
        "size",
        function () {
          if (P.lang === "en") refit();
        },
      ],
    ].forEach(function (st) {
      try {
        st[1]();
      } catch (er) {
        bad.push(st[0] + ": " + ((er && er.message) || er));
      }
    });
    if (bad.length) {
      note(menuWords("settings").failed(bad.join("; ")));
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

// Settings page: languages
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P, change } from "../core/state.js";
import { refit } from "../text/autofit.js";
import { LANGS, LK, cur, pn } from "../core/apply.js";
import { apply } from "./bars.js";
import { trPick } from "./settings-panel.js";
import { buildIX } from "../text/search.js";
import { refToggle } from "./dhrupad-button.js";
import { pieceEl } from "../core/page.js";

var PICK;

export function init() {
  // The language lists: each language once, English twice (one per spelling), and None for the second language.
  // A pick is "mr", "kn", "en:simple" or "en:iast".
  PICK = ["mr", "en:simple", "en:iast", "kn"];
  document.getElementById("sl1s").onchange = function () {
    spPick(1, this.value);
  };
  document.getElementById("sl2s").onchange = function () {
    spPick(2, this.value);
  };
  // Show: the main language, the second or both, as Language in the Aa sheet does
  document.getElementById("slw").onclick = function (e) {
    var b = e.target.closest("button");
    if (!b || b.dataset.v === P.lang) return;
    var c = cur();
    change({ lang: b.dataset.v }, apply);
    if (c) c.scrollIntoView();
  };
  document.getElementById("srf").onclick = function (e) {
    var b = e.target.closest("button");
    if (b && b.dataset.v !== String(P.ref)) refToggle();
  };
}

// Show the settings that depend on the language choice
export function spSet() {
  var v1 = document.getElementById("sl1v"),
    v2 = document.getElementById("sl2v");
  var k1 = spKey(P.lead),
    k2 = P.l2 ? spKey(P.l2) : "";
  v1.textContent = spName(k1);
  v1.lang = LK(P.lead);
  v2.textContent = spName(k2);
  v2.lang = P.l2 ? LK(P.l2) : P.ui;
  spOpts(document.getElementById("sl1s"), PICK, k1, function () {
    return false;
  });
  // the second language can't be the main one, nor (for now) a second Indian language beside it
  spOpts(document.getElementById("sl2s"), PICK.concat([""]), k2, function (k) {
    var l = k.split(":")[0];
    return l === LK(P.lead) || (l !== "en" && k && P.lead !== "en");
  });
  // menus are in English or the main language, so with English as the main language there is nothing to pick
  // (nor with Kannada, which has no menus of its own yet)
  document.getElementById("surow").hidden = LK(P.lead) !== "mr";
  // Show: one button per language and Both, named in their own language (as in the Aa sheet)
  document.getElementById("slwrow").hidden = !P.l2;
  document.getElementById("slw").innerHTML = P.l2
    ? [P.lead, P.l2, "both"]
        .map(function (v) {
          var l = v === "both" ? P.ui : LK(v),
            t = v === "both" ? (P.ui === "mr" ? "दोन्ही" : "Both") : LANGS[LK(v)].n;
          return '<button type="button" data-v="' + v + '" lang="' + l + '" aria-pressed="' + (v === P.lang) + '">' + t + "</button>";
        })
        .join("")
    : "";
  [].forEach.call(document.querySelectorAll("#srf button"), function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === String(P.ref)));
  });
  if (pn.hidden) return; // the rest is the preview, made when Settings is open
  // Preview: the Ganapati aarti as the pieces will show it, main language large and second small under each line,
  // with the Dhrupad choice: "once" has the dhrupad at the top and the ↻ ध्रुपद note after the verse, "every verse"
  // has the dhrupad after it (Satish, 2026-10-26). Its size, font and line spacing come from the CSS (.sp-p1 / .sp-p2
  // in css/09-settings-page.css, which follow the same text size and font as the pieces), so A−, A+, reset and the
  // font buttons change it at once.
  var a1 = pieceEl("a1"); // (built if not opened yet: js/core/page.js)
  if (!a1) return;
  var both = P.lang === "both",
    ls = both ? [P.lead, P.l2] : [P.lang],
    // the lines of one block (the dhrupad at the top, or the first verse) in each language shown
    lines = function (sel, n) {
      return ls.map(function (l) {
        return [].slice.call(a1.querySelectorAll(sel + " .verse > ." + l + " p"), 0, n).map(function (p) {
          return p.innerHTML.replace(/ ([।॥|])/g, "\u00a0$1"); // a danda never starts a line
        });
      });
    },
    // one line: the main language, and the second under it
    row = function (b, k, cls) {
      return b
        .map(function (ps, w) {
          return ps[k] === undefined
            ? ""
            : '<div class="' + (w ? "sp-p2" : "sp-p1") + (cls ? " " + cls : "") + '" lang="' + LK(ls[w]) + '"><p>' + ps[k] + "</p></div>";
        })
        .join("");
    },
    dh = lines(".rftop", 1),
    vs = lines(".items > .item:not(.rf)", 1), // one line of the verse: the dhrupad, above or below it, stays in view
    h = P.ref ? row(dh, 0, "sp-pd") : "";
  for (var k = 0; k < vs[0].length; k++) h += row(vs, k);
  h += P.ref ? '<div class="sp-pn">' + (P.ui === "mr" ? "↻ ध्रुपद" : "↻ Refrain") + "</div>" : row(dh, 0, "sp-pd");
  // (its heading, Preview, is the group's, in index.html)
  document.getElementById("sprev").innerHTML = '<div class="sp-pw">' + h + "</div>";
  fitPreview();
}

/**
 * The preview at the size the pieces will have. The pieces fit their size to the open text (js/text/autofit.js: the
 * largest size, up to the default, at which every line fits the screen, never under 18px), but on Home no text is
 * open to measure, so the preview fits its own lines to its window by the same rule, and so shows them whole at 100%.
 * A size the reader chose (A− / A+, a pinch) is shown as it is, A+ running past the window's edges as on the page.
 */
export function fitPreview() {
  var pw = /** @type {HTMLElement | null} */ (document.querySelector("#sprev .sp-pw"));
  if (!pw) return;
  pw.style.removeProperty("--fs");
  if (P.fsu || !pw.clientWidth) return;
  var avail = pw.clientWidth - 12, // (inside its faded edges)
    widest = 0;
  [].forEach.call(pw.querySelectorAll("p"), function (/** @type {HTMLElement} */ p) {
    widest = Math.max(widest, p.getBoundingClientRect().width);
  });
  if (widest <= avail) return;
  var fs = parseFloat(getComputedStyle(pw).getPropertyValue("--fs")) || 24;
  pw.style.setProperty("--fs", Math.max(18, Math.floor((fs * avail) / widest)) + "px");
}

function spKey(slot) {
  return LK(slot) === "en" ? "en:" + P.tr : LK(slot);
}

function spName(k) {
  if (!k) return P.ui === "mr" ? "काहीही नाही" : "None";
  var l = k.split(":");
  return LANGS[l[0]].n + (l[1] ? " · " + (l[1] === "iast" ? "sukhakartā" : "Sukhkarta") : "");
}

function spOpts(sel, ks, cur, off) {
  sel.innerHTML = ks
    .map(function (k) {
      return '<option value="' + k + '"' + (k === cur ? " selected" : "") + (off(k) ? " disabled" : "") + ">" + spName(k) + "</option>";
    })
    .join("");
  sel.value = cur;
}

// w: 1 main, 2 second
function spPick(w, k) {
  var c = cur(),
    // keep showing the same thing: the main language, the second, or both
    role = P.lang === "both" ? 3 : P.lang === P.lead ? 1 : 2,
    l = k.split(":"),
    v = l[0];
  if (l[1] && l[1] !== P.tr) trPick(l[1]);
  // Marathi and Kannada share the original's place: switching between them rewrites the text in place
  var ind = v === "en" || !v ? P.ind : v;
  v = v === "en" || !v ? v : "mr";
  var lead = P.lead,
    l2 = P.l2;
  if (w === 1) {
    if (v === l2) l2 = lead;
    lead = v;
  } else l2 = v;
  /** @type {Record<string, any>} */
  var ch = { lead: lead, l2: l2, lang: !l2 || role === 1 ? lead : role === 2 ? l2 : "both" };
  if (lead === "en" || ind !== "mr") ch.ui = "en";
  var sw = ind !== P.ind;
  if (sw) ch.ind = ind;
  change(ch, function () {
    if (sw) {
      SCR.set(ind);
      buildIX();
    }
    apply();
  });
  if (sw) refit(); // Kannada lines are wider or narrower than Marathi ones
  if (c) c.scrollIntoView();
}

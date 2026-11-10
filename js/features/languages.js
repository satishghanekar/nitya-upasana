// @ts-check
// Settings page: languages
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P, change } from "../core/state.js";
import { refit } from "../text/autofit.js";
import { LANGS, LK, cur, pn } from "../core/apply.js";
import { apply } from "./bars.js";
import { trPick } from "./settings-panel.js";
import { buildIX } from "../text/search.js";
import { refToggle } from "./dhrupad-button.js";
import { btnV, byId, pieceEl } from "../core/page.js";
import { menuWords } from "../core/strings.js";

/** @type {string[]} */
var PICK;

export function init() {
  // The language lists: each language once, English twice (one per spelling), and None for the second language.
  // A pick is "mr", "en:simple", "en:iast", or the Marathi in other letters: "kn", "te", "gu".
  PICK = ["mr", "en:simple", "en:iast", "kn", "te", "gu"];
  byId("sl1s").onchange = function (e) {
    spPick(1, /** @type {HTMLSelectElement} */ (e.currentTarget).value);
  };
  byId("sl2s").onchange = function (e) {
    spPick(2, /** @type {HTMLSelectElement} */ (e.currentTarget).value);
  };
  // Show: the main language, the second or both, as Language in the Aa sheet does
  byId("slw").onclick = function (e) {
    var v = btnV(e);
    if (!v || v === P.lang) return;
    var c = cur();
    change({ lang: v }, apply);
    if (c) c.scrollIntoView();
  };
  byId("srf").onclick = function (e) {
    var v = btnV(e);
    if (v !== undefined && v !== String(P.ref)) refToggle();
  };
}

// Show the settings that depend on the language choice
export function spSet() {
  var v1 = byId("sl1v"),
    v2 = byId("sl2v");
  var k1 = spKey(P.lead),
    k2 = P.l2 ? spKey(P.l2) : "";
  v1.textContent = spName(k1);
  v1.lang = LK(P.lead);
  v2.textContent = spName(k2);
  v2.lang = P.l2 ? LK(P.l2) : P.ui;
  spOpts(/** @type {HTMLSelectElement} */ (byId("sl1s")), PICK, k1, function () {
    return false;
  });
  // the second language can't be the main one, nor (for now) a second Indian language beside it
  spOpts(/** @type {HTMLSelectElement} */ (byId("sl2s")), PICK.concat([""]), k2, function (k) {
    var l = k.split(":")[0];
    return l === LK(P.lead) || (l !== "en" && !!k && P.lead !== "en");
  });
  // menus: English, or the language the texts are shown in (js/store/migrate.js tidy()); nothing to pick with
  // English as the main language
  byId("surow").hidden = P.lead === "en";
  /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll("#su button")).forEach(function (b) {
    b.hidden = b.dataset.v !== "en" && b.dataset.v !== P.ind;
  });
  // Show: one button per language and Both, named in their own language (as in the Aa sheet)
  byId("slwrow").hidden = !P.l2;
  byId("slw").innerHTML = P.l2
    ? [P.lead, P.l2, "both"]
        .map(function (/** @type {string} */ v) {
          var l = v === "both" ? P.ui : LK(v),
            t = v === "both" ? menuWords("languages").both : LANGS[LK(v)].n;
          return '<button type="button" data-v="' + v + '" lang="' + l + '" aria-pressed="' + (v === P.lang) + '">' + t + "</button>";
        })
        .join("")
    : "";
  /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll("#srf button")).forEach(function (b) {
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
  var piece = a1;
  var both = P.lang === "both",
    ls = both ? [P.lead, P.l2] : [P.lang],
    // the lines of one block (the dhrupad at the top, or the first verse) in each language shown
    /** @type {(sel: string, n: number) => string[][]} */
    lines = function (sel, n) {
      return ls.map(function (/** @type {string} */ l) {
        return Array.prototype.slice.call(piece.querySelectorAll(sel + " .verse > ." + l + " p"), 0, n).map(function (/** @type {HTMLElement} */ p) {
          return p.innerHTML.replace(/ ([।॥|])/g, "\u00a0$1"); // a danda never starts a line
        });
      });
    },
    // one line: the main language, and the second under it
    /** @type {(b: string[][], k: number, cls?: string) => string} */
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
  h += P.ref ? '<div class="sp-pn">' + menuWords("languages").refrain + "</div>" : row(dh, 0, "sp-pd");
  // (its heading, Preview, is the group's, in index.html)
  byId("sprev").innerHTML = '<div class="sp-pw">' + h + "</div>";
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
  pw.querySelectorAll("p").forEach(function (p) {
    widest = Math.max(widest, p.getBoundingClientRect().width);
  });
  if (widest <= avail) return;
  var fs = parseFloat(getComputedStyle(pw).getPropertyValue("--fs")) || 24;
  pw.style.setProperty("--fs", Math.max(18, Math.floor((fs * avail) / widest)) + "px");
}

/** @param {string} slot */
function spKey(slot) {
  return LK(slot) === "en" ? "en:" + P.tr : LK(slot);
}

/** @param {string} k */
function spName(k) {
  if (!k) return menuWords("languages").none;
  var l = k.split(":");
  return LANGS[l[0]].n + (l[1] ? " · " + (l[1] === "iast" ? "sukhakartā" : "Sukhkarta") : "");
}

/** @param {HTMLSelectElement} sel @param {string[]} ks @param {string} cur @param {(k: string) => boolean} off */
function spOpts(sel, ks, cur, off) {
  sel.innerHTML = ks
    .map(function (k) {
      return '<option value="' + k + '"' + (k === cur ? " selected" : "") + (off(k) ? " disabled" : "") + ">" + spName(k) + "</option>";
    })
    .join("");
  sel.value = cur;
}

// w: 1 main, 2 second
/** @param {1 | 2} w @param {string} k */
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
  // Menus in English, or in the language of the letters shown (js/store/migrate.js tidy()): other letters, or English
  // as the main language, put the menus back to English (Satish, 2026-10-30)
  if (P.ui !== "en" && (lead === "en" || P.ui !== ind)) ch.ui = "en";
  var sw = ind !== P.ind;
  if (sw) ch.ind = ind;
  change(ch, function () {
    if (sw) {
      /** @type {any} */ (window).SCR.set(ind);
      buildIX();
    }
    apply();
  });
  if (sw) refit(); // Kannada lines are wider or narrower than Marathi ones
  if (c) c.scrollIntoView();
}

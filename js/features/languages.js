// Settings page: languages
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { liSet } from "../core/page.js";
import { P, save } from "../core/state.js";
import { refit } from "../text/autofit.js";
import { LANGS, LK, cur, pn } from "../core/apply.js";
import { apply } from "./bars.js";
import { trPick } from "./settings-panel.js";
import { buildIX } from "../text/search.js";

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
  document.getElementById("srf").onclick = function (e) {
    var b = e.target.closest("button");
    if (b && b.dataset.v !== String(P.ref)) document.getElementById("rb").click();
  };
}

// Show the settings that depend on the language choice
export function spSet() {
  var mr = P.ui === "mr",
    v1 = document.getElementById("sl1v"),
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
  [].forEach.call(document.querySelectorAll("#srf button"), function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === String(P.ref)));
  });
  if (pn.hidden) return; // the rest is the preview, made when Settings is open
  // Preview: the first two lines of the Ganapati aarti, main language large and second small. Its size, font and
  // line spacing come from the CSS (.sp-p1 / .sp-p2 in css/09-settings-page.css, which follow the same text size
  // and font as the pieces), so A−, A+, reset and the font buttons change it at once.
  var q = function (l, cls) {
    var ps = [].slice.call(document.querySelectorAll("#a1 .items .verse > ." + l + " p"), 0, 2);
    return ps.length
      ? '<div class="' + cls + '" lang="' + LK(l) + '">' +
          ps.map(function (p) {
            return "<p>" + p.innerHTML.replace(/ ([।॥|])/g, "\u00a0$1") + "</p>"; // a danda never starts a line
          }).join("") + "</div>"
      : "";
  };
  var h = '<div class="sp-pt">' + (mr ? "नमुना" : "Preview") + '</div><div class="sp-pw">' + q(P.lead, "sp-p1") + (P.l2 ? q(P.l2, "sp-p2") : "") + "</div>";
  document.getElementById("sprev").innerHTML = h;
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
  if (w === 1) {
    if (v === P.l2) P.l2 = P.lead;
    P.lead = v;
  } else P.l2 = v;
  if (P.lead === "en" || ind !== "mr") P.ui = "en";
  P.lang = !P.l2 || role === 1 ? P.lead : role === 2 ? P.l2 : "both";
  var sw = ind !== P.ind;
  if (sw) {
    P.ind = ind;
    SCR.set(ind);
    liSet();
    buildIX();
  }
  apply();
  save();
  if (sw) refit(); // Kannada lines are wider or narrower than Marathi ones
  if (c) c.scrollIntoView();
}

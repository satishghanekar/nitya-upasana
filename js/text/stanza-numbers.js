// Stanza numbers
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { DV } from "./line-breaks.js";
import { onPiece } from "../core/page.js";

export function init() {
  onPiece(numberStanzas);
}

// The numbers in every piece inside r (the page, or a printout's copy: js/print/compose.js)
export function numberStanzas(/** @type {ParentNode} */ r) {
  // Stanza numbers at the end of each verse (the dhrupad is not counted), in every piece but the prose ones
  // (the Atharvashirsha's numbers are part of its text) and those whose file says "stanza-numbers: as-written"
  // (section class ownsn: the numbers are written in the text, as in some ashtaks). By class, not by id, so a text without a legacy-id
  // (its section id is its own id, aarti-belaguve) is numbered too.
  [].forEach.call(r.querySelectorAll("section.ash:not(.prose):not(.ownsn) .items"), function (b) {
    var n = 0;
    [].forEach.call(b.querySelectorAll(".item:not(.rf):not(.dh)"), function (it) {
      n++;
      [
        [".mr", DV(n), "॥"],
        [".en", "" + n, "||"],
      ].forEach(function (x) {
        var ps = it.querySelectorAll(".verse>" + x[0] + ">p:not(.rf)"),
          p = ps[ps.length - 1];
        if (!p) return;
        var e = document.createElement("span");
        e.className = "sn";
        var end = p.textContent.trim();
        e.textContent = (end.slice(-x[2].length) === x[2] ? " " : " " + x[2] + " ") + x[1] + " " + x[2];
        p.appendChild(e);
      });
    });
  });
  // A number written in the text (stanza-numbers: as-written) looks like the ones added: "॥ १ ॥" at the end of a line
  [].forEach.call(r.querySelectorAll("section.ash.ownsn:not(.prose) .verse p"), function (p) {
    var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT),
      t,
      last = null;
    while ((t = w.nextNode())) if (t.data.trim()) last = t;
    var m = last && /\s*(॥|\|\|)\s*([०-९0-9]+)\s*(॥|\|\|)\s*$/.exec(last.data);
    if (!m || (last.parentElement && last.parentElement.classList.contains("sn"))) return;
    var e = document.createElement("span");
    e.className = "sn";
    // (the words kept exactly as written: only wrapped)
    e.textContent = last.data.slice(m.index);
    last.data = last.data.slice(0, m.index);
    last.parentNode.insertBefore(e, last.nextSibling);
  });
}

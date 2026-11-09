// Layout helpers that run once
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { onPiece } from "../core/page.js";

export function init() {
  onPiece(gridItems);
}

// Where each stanza and line sits in the grid of every piece inside r (the page, or a printout's copy:
// js/print/compose.js): two stanzas side by side when the screen is wide, each Marathi line beside its English
export function gridItems(/** @type {ParentNode} */ r) {
  [].forEach.call(r.querySelectorAll(".items"), function (b) {
    var row = 1,
      pair = [],
      lone = false,
      cur = null;
    function flush() {
      if (!pair.length) return;
      var h = 0;
      pair.forEach(function (g, i) {
        g.forEach(function (e, k) {
          e.style.gridRow = String(row + k);
          e.style.gridColumn = lone ? "1 / -1" : String(i + 1);
          if (i) e.classList.add("c2");
          else if (!lone) e.classList.add("c1");
        });
        h = Math.max(h, g.length);
      });
      row += h;
      pair = [];
      lone = false;
    }
    function full(e) {
      flush();
      e.style.gridRow = String(row++);
      e.style.gridColumn = "1 / -1";
    }
    [].forEach.call(b.children, function (e) {
      var main = e.classList.contains("item") && !e.classList.contains("rf");
      if (main && e.classList.contains("dh")) {
        cur = null;
        full(e);
        return;
      }
      if (main) {
        if (pair.length === 2) flush();
        if (pair.length === 1) {
          var a = nLines(pair[0][0]),
            c = nLines(e);
          if (Math.abs(a - c) > 1 && Math.min(a, c) * 2 < Math.max(a, c)) {
            lone = true;
            flush();
          }
        }
        cur = [e];
        pair.push(cur);
        return;
      }
      if (cur) cur.push(e);
      else full(e);
    });
    flush();
  });
  // Desktop + Both: each Marathi line sits beside its English line (rows matched by position)
  [].forEach.call(r.querySelectorAll(".verse"), function (v) {
    [".mr", ".en"].forEach(function (c) {
      var b = v.querySelector(":scope>" + c);
      if (b)
        [].forEach.call(b.children, function (p, i) {
          if (p.tagName === "P") p.style.gridRow = String(i + 1);
        });
    });
  });
}

// Two-column screens read across: stanza 1 | stanza 2, then 3 | 4. Each stanza keeps its own dhrupad marker/repeat under it.
// Two stanzas of very different length (Atharvashirsha: 7 lines beside 1) don't pair: the first goes alone across both columns.
function nLines(e) {
  return e.querySelectorAll(".verse > .mr > p").length || e.querySelectorAll("p").length || 1;
}

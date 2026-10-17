// Stanza numbers
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { DV } from "./line-breaks.js";

export function init() {
  // Stanza numbers at the end of each verse (the dhrupad is not counted)
  [].forEach.call(document.querySelectorAll('section.ash[id^="a"] .items'), function (b) {
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
}

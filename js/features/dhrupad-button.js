// Dhrupad button: toggle once / after every stanza, keeping the reader's place
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { flash } from "../core/page.js";
import { P, save } from "../core/state.js";
import { apply } from "./bars.js";

export function init() {
  document.getElementById("rb").onclick = function () {
    refToggle();
  };
}

// quiet: from the reading sheet, which shows the new choice itself (a note would cover the sheet)
export function refToggle(quiet) {
  var bb = document.querySelector(".bar").getBoundingClientRect().bottom,
    a = null,
    t = 0,
    ps = document.querySelectorAll(".items .verse p");
  for (var i = 0; i < ps.length; i++) {
    var x = ps[i];
    if (x.classList.contains("rf") || x.closest(".item.rf")) continue;
    var r = x.getBoundingClientRect();
    if (r.height && r.bottom > bb + 4) {
      a = x;
      t = r.top;
      break;
    }
  }
  P.ref = P.ref ? 0 : 1;
  apply();
  save();
  if (a && a.offsetParent !== null) {
    window.scrollBy(0, a.getBoundingClientRect().top - t);
  }
  if (quiet) return;
  if (P.ref) flash("ध्रुपद एकदाच", "Dhrupad shown once");
  else flash("ध्रुपद प्रत्येक कडव्यानंतर", "Dhrupad after every verse");
}

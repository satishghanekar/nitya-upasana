// Library (#jump): every text, grouped (पूजा, आरती), with search above the list (js/text/search.js). Opened by the book
// button in the top bar (#hm), the search button in the bottom bar and at the end of each piece; a title opens its
// text (js/features/clicks.js), and Back (the button here, the phone's Back, or Escape) returns. Home v2 moved the
// list here from the home page (docs/decisions.md, 2026-10-18).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { setJ } from "./overlays.js";

/** The list of texts; search hides it while results are shown */
export var ul;

export function init() {
  ul = document.getElementById("jl");
  var bk = document.getElementById("jbk");
  if (bk)
    bk.onclick = function () {
      setJ(false);
    };
}

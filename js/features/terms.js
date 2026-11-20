// @ts-check
// Settings → About ends with the maker's line (Satish, 2026-11-20: the app's name, "A volunteer offering by Satish
// Ghanekar", Contact and Terms of use). Terms of use opens here, in a dialog (#terms), not as a file: the offline copy
// (sw.js) answers every page the Home Screen app opens with the app itself, so a link to LICENSE.txt showed nothing.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { byId } from "../core/page.js";
import { ovDone, ovPush } from "./history.js";
import { focusBack } from "./more-menu.js";

export function init() {
  var dlg = byId("terms"),
    open = byId("terms-open");
  if (!dlg || !open) return;
  /** @param {boolean} o */
  function show(o) {
    if (o) ovPush();
    dlg.hidden = !o;
    if (!o) ovDone();
    if (o) byId("terms-title").focus();
    else focusBack(open);
  }
  open.addEventListener("click", function () {
    show(true);
  });
  byId("terms-close").addEventListener("click", function () {
    show(false);
  });
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) show(false);
  });
  // (caught on the way down, so Escape closes only the dialog and not Settings under it)
  document.addEventListener(
    "keydown",
    function (e) {
      if (e.key !== "Escape" || dlg.hidden) return;
      e.preventDefault();
      e.stopPropagation();
      show(false);
    },
    true,
  );
}

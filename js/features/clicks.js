// @ts-check
// Clicks: contents links (data-go) jump to a piece; tapping a verse line highlights it
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { change } from "../core/state.js";
import { pieceEl } from "../core/page.js";
import { jp, unfold, pn } from "../core/apply.js";
import { setJ, setP } from "./overlays.js";
import { jumpTo } from "./history.js";
import { hlMark } from "./startup.js";

export function init() {
  document.addEventListener("click", function (e) {
    /** @type {any} */
    var tg = e.target;
    var a = tg && tg.closest && tg.closest("a[data-go]");
    if (a) {
      e.preventDefault();
      var el = pieceEl(a.getAttribute("data-go") || "");
      unfold(el);
      if (el) {
        var to = el;
        jumpTo(
          function () {
            if (to.id === "home") scrollTo(0, 0);
            else to.scrollIntoView();
          },
          to.id === "home" ? location.pathname : "#" + to.id,
        );
      } else setJ(false);
      return;
    }
    var p = tg && tg.closest && tg.closest(".verse p[data-l]");
    if (p) {
      var id = p.getAttribute("data-l") || "",
        was = p.classList.contains("hl");
      document.querySelectorAll("p.hl, .hli").forEach(function (x) {
        x.classList.remove("hl", "hli");
      });
      if (!was) hlMark(id);
      change({ hl: was ? "" : id });
    }
  });
  // A click outside an open overlay closes it (not the page's own clicks on a hidden download link or file
  // picker, marked data-keep: saving or restoring a backup from Settings keeps Settings open; nor a click in Finish the
  // update, over Settings)
  document.addEventListener(
    "click",
    function (e) {
      /** @type {any} */
      var x = e.target;
      if (!x || !x.closest) return;
      if (x.closest("#panel,#jump,#lbm,#upm,.bar,[data-keep]")) return;
      if (!pn.hidden || !jp.hidden) {
        setP(false);
        setJ(false);
      }
    },
    true,
  );
}

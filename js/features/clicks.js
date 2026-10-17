// Clicks: contents links (data-go) jump to a piece; tapping a verse line highlights it
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P, save } from "../core/state.js";
import { jp, pjOpen, pn } from "../core/apply.js";
import { setJ, setP } from "./overlays.js";
import { goHomeNav, jumpTo } from "./history.js";
import { hlMark } from "../core/startup.js";

export function init() {
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-go]");
    if (a) {
      e.preventDefault();
      var el = document.getElementById(a.getAttribute("data-go"));
      if (el && el.id === "home" && a.closest("#rail")) return goHomeNav();
      pjOpen(el);
      if (el)
        jumpTo(
          function () {
            if (el.id === "home") scrollTo(0, 0);
            else el.scrollIntoView();
          },
          el.id === "home" ? location.pathname : "#" + el.id,
        );
      else setJ(false);
      return;
    }
    var p = e.target.closest && e.target.closest(".verse p[data-l]");
    if (p) {
      var id = p.getAttribute("data-l"),
        was = p.classList.contains("hl");
      [].forEach.call(document.querySelectorAll("p.hl, .hli"), function (x) {
        x.classList.remove("hl", "hli");
      });
      if (!was) {
        hlMark(id);
        P.hl = id;
      } else {
        P.hl = "";
      }
      save();
    }
  });
  // A click outside an open overlay closes it
  document.addEventListener(
    "click",
    function (e) {
      var x = e.target;
      if (!x.closest) return;
      if (x.closest("#panel,#jump,.bar")) return;
      if (!pn.hidden || !jp.hidden) {
        setP(false);
        setJ(false);
      }
    },
    true,
  );
}

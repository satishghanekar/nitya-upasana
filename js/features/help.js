// Help: opens over the page; the phone's Back button closes it
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { aa, pn } from "../core/apply.js";
import { setP } from "./overlays.js";
import { ovDone, ovPush } from "./history.js";

export function init() {
  (function () {
    var hp = document.getElementById("help");
    function open() {
      // Help's text waits in a <template> until the first time it is opened, so it adds nothing to the page on load
      var t = document.getElementById("hlpc");
      if (t) t.parentNode.replaceChild(t.content, t);
      ovPush();
      // From Settings, focus goes back to the ⚙ button when Help closes
      hp._ret = pn.hidden ? document.activeElement : aa;
      hp.hidden = false;
      setP(false);
      hp.scrollTop = 0;
      document.documentElement.style.overflow = "hidden";
      document.getElementById("hlpx").focus();
    }
    function close(fromPop) {
      if (hp.hidden) return;
      hp.hidden = true;
      document.documentElement.style.overflow = "";
      if (!fromPop) ovDone();
      if (hp._ret) {
        try {
          hp._ret.focus({ preventScroll: true });
        } catch (e) {}
        hp._ret = null;
      }
    }
    document.getElementById("hlpb").onclick = open;
    document.getElementById("hlp2").onclick = open;
    document.getElementById("hlpx").onclick = function () {
      close();
    };
    addEventListener("popstate", function () {
      close(true);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    if (location.hash === "#help") {
      try {
        history.replaceState(null, "", location.pathname);
      } catch (e) {}
      open();
    }
  })();
}

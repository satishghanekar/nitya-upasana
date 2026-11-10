// @ts-check
// Help: opens over the page; the phone's Back button closes it
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { aa, pn } from "../core/apply.js";
import { setP } from "./overlays.js";
import { ovDone, ovPush } from "./history.js";

export function init() {
  (function () {
    var hp = /** @type {HTMLElement} */ (document.getElementById("help"));
    // where focus goes back to when Help closes
    /** @type {HTMLElement | null} */
    var ret = null;
    function open() {
      // Help's text waits in a <template> until the first time it is opened, so it adds nothing to the page on load
      var t = /** @type {HTMLTemplateElement | null} */ (document.getElementById("hlpc"));
      if (t && t.parentNode) t.parentNode.replaceChild(t.content, t);
      ovPush();
      // From Settings, focus goes back to the ⚙ button when Help closes
      ret = pn.hidden ? /** @type {HTMLElement | null} */ (document.activeElement) : aa;
      hp.hidden = false;
      setP(false);
      hp.scrollTop = 0;
      document.documentElement.style.overflow = "hidden";
      /** @type {HTMLElement} */ (document.getElementById("hlpx")).focus();
    }
    /** @param {boolean} [fromPop] */
    function close(fromPop) {
      if (hp.hidden) return;
      hp.hidden = true;
      document.documentElement.style.overflow = "";
      if (!fromPop) ovDone();
      if (ret) {
        try {
          ret.focus({ preventScroll: true });
        } catch (e) {}
        ret = null;
      }
    }
    /** @type {HTMLElement} */ (document.getElementById("hlpb")).onclick = open;
    /** @type {HTMLElement} */ (document.getElementById("hlp2")).onclick = open;
    /** @type {HTMLElement} */ (document.getElementById("hlpx")).onclick = function () {
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

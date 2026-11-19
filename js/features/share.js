// @ts-check
// Share and the QR code (the Add to Home Screen buttons open the install page, js/features/install-page.js)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { byId, note } from "../core/page.js";
import { skCache, skFmt, skLoc, skMid, skNext, skTemple } from "./sankashti.js";
import { ovDone, ovPush } from "./history.js";
import { focusBack } from "./more-menu.js";
import { menuWords } from "../core/strings.js";
import { addLink } from "../core/install-kind.js";

export function init() {
  (function () {
    // the shared link carries ?add: it opens the install page (js/features/install-page.js)
    var url = addLink(location.origin, location.pathname),
      title = "Nitya Upasana"; // the app's name is always in English (share, install, page title)
    var qm = byId("qrm");
    /** @param {boolean} o */
    function qr(o) {
      if (o) ovPush();
      qm.hidden = !o;
      if (!o) ovDone();
      if (o) {
        byId("qrx").focus();
      } else {
        focusBack(byId("qrb"));
      }
    }
    byId("qrb").onclick = function () {
      qr(true);
    };
    byId("qrx").onclick = function () {
      qr(false);
    };
    qm.addEventListener("click", function (e) {
      if (e.target === qm) qr(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !qm.hidden) qr(false);
    });
    // Share: the app's name, then a ready reminder for the group chat (next Sankathara Chaturthi, pooja time near the temple, moonrise) plus the link
    // sep = true: leave the link out, because the share sheet is given it separately (it lands at the end)
    /** @param {boolean} [sep] */
    function shareText(sep) {
      skNext();
      var C = skCache,
        L = skLoc(),
        w = menuWords("share");
      if (!C || !L) return w.plain(title) + (sep ? "" : "\n" + url) + w.tip;
      var o = C.list[C.sel].day >= skMid() ? C.list[C.sel] : C.list[C.ni],
        f = skFmt(o),
        t = skTemple(L),
        ang = f.ang ? "Angaraki " : ""; // with the name, which is always English
      return w.next(title, ang, f.day, t ? w.temple : "", o.rise ? f.time : "") + (sep ? "" : "\n" + url) + w.tip;
    }
    byId("shb").onclick = function () {
      var txt = shareText();
      if (navigator.share) {
        // The link goes in url, not inside the text, so the iPhone/Android share sheet shows the site's
        // icon and name, and WhatsApp/Messages show a link card (from the og: tags in <head>).
        navigator.share({ title: title, text: shareText(true), url: url }).catch(function () {});
      } else {
        try {
          navigator.clipboard.writeText(txt).then(function () {
            note(menuWords("share").copied);
          });
        } catch (e) {
          window.open("https://wa.me/?text=" + encodeURIComponent(txt));
        }
      }
    };
  })();
}

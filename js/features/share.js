// @ts-check
// Share and the QR code (the Add to Home Screen buttons open the install page, js/features/install-page.js)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { byId, note } from "../core/page.js";
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
    // Share: the app's name, the link and what the link does. Nothing about Sankashti: this is a daily prayer app
    // (Sankathara Chaturthi, the sister app, puts the next Sankashti and its pooja in its own message).
    // sep = true: leave the link out, because the share sheet is given it separately (it lands at the end)
    /** @param {boolean} [sep] */
    function shareText(sep) {
      // in English whatever the menu language: the people it is sent to may read no Marathi
      var w = menuWords("share", "en");
      return w.plain(title) + (sep ? "" : "\n" + url) + w.tip;
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

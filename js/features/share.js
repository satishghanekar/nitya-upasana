// Share, QR code and the Add to Home Screen buttons
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { note } from "../core/page.js";
import { skCache, skFmt, skLoc, skMid, skNext, skTemple } from "./sankashti.js";
import { ovDone, ovPush } from "./history.js";
import { focusBack } from "./more-menu.js";
import { menuWords } from "../core/strings.js";

export function init() {
  (function () {
    var url = location.origin + location.pathname,
      title = "Nitya Upasana"; // the app's name is always in English (share, install, page title)
    var qm = document.getElementById("qrm");
    function qr(o) {
      if (o) ovPush();
      qm.hidden = !o;
      if (!o) ovDone();
      if (o) {
        document.getElementById("qrx").focus();
      } else {
        focusBack(document.getElementById("qrb"));
      }
    }
    document.getElementById("qrb").onclick = function () {
      qr(true);
    };
    document.getElementById("qrx").onclick = function () {
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
    document.getElementById("shb").onclick = function () {
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
    var ua = navigator.userAgent,
      ios = !/Android/.test(ua) && (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)),
      standalone = navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches),
      safari = ios && (/CriOS|FxiOS|EdgiOS/.test(ua) || /Safari\//.test(ua)) && !/GSA\/|FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat/.test(ua),
      deferred = null;
    // Add to Home Screen buttons (home page and Settings), always there until the site is opened from its icon.
    // Chrome/Edge/Android: the browser's own install prompt when it offers one; otherwise (iPhone, or the prompt
    // already used or dismissed) a pop-up with the steps for this device.
    var ib = [document.getElementById("inb"), document.getElementById("inb2")],
      im = document.getElementById("inm"),
      ibFrom = null;
    function ibShow(o) {
      ib.forEach(function (b) {
        b.hidden = !o;
      });
    }
    function installed() {
      ibShow(false);
    }
    function steps(o) {
      if (o) ovPush();
      im.hidden = !o;
      if (!o) ovDone();
      if (o) {
        var which = ios
          ? safari
            ? "inios"
            : "inapp"
          : /Android/.test(ua)
            ? "inand"
            : /Firefox\//.test(ua)
              ? "inff"
              : /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)
                ? "inmac"
                : "indesk";
        ["inios", "inapp", "inand", "indesk", "inmac", "inff"].forEach(function (id) {
          document.getElementById(id).hidden = id !== which;
        });
        document.getElementById("inx").focus();
      } else if (ibFrom) focusBack(ibFrom);
    }
    function install(e) {
      ibFrom = e && e.currentTarget;
      if (!deferred) return steps(true);
      var d = deferred;
      deferred = null;
      d.prompt();
      d.userChoice.then(function (c) {
        if (c && c.outcome === "accepted") installed();
      });
    }
    ibShow(!standalone);
    ib.forEach(function (b) {
      b.onclick = install;
    });
    document.getElementById("inx").onclick = function () {
      steps(false);
    };
    im.addEventListener("click", function (e) {
      if (e.target === im) steps(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !im.hidden) steps(false);
    });
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferred = e;
    });
    window.addEventListener("appinstalled", installed);
  })();
}

// Offline use: home-screen app details and the service worker (sw.js)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { flash } from "../core/page.js";

var FONTS, hd, l1, m1, m2, ofb, offv, OFV, CACHE, me, upd, updv, UPD, PARTS, ofSaved;

export function init() {
  // The cache name below must match the one in sw.js; change both on every deploy.
  // Font files kept for offline use (the list is in js/parts.js, shared with sw.js)
  FONTS = SITE_PARTS.fonts;
  if (/^https?:$/.test(location.protocol)) {
    try {
      hd = document.head;
      l1 = document.createElement("link");
      l1.rel = "manifest";
      l1.href = "manifest.json";
      hd.appendChild(l1);
      m1 = document.createElement("meta");
      m1.name = "apple-mobile-web-app-capable";
      m1.content = "yes";
      hd.appendChild(m1);
      m2 = document.createElement("meta");
      m2.name = "apple-mobile-web-app-title";
      m2.content = "Sankathara Chaturthi";
      hd.appendChild(m2);
    } catch (e) {}
    // Offline: a small cloud in the top bar while there is no internet (#ofb), and in Settings → About whether the
    // site is saved for offline use (#offv). A short note says so once, when the first visit has saved it.
    ofb = document.getElementById("ofb");
    offv = document.getElementById("offv");
    OFV = {
        idle: ["तयार", "Ready"],
        save: ["जतन करत आहे…", "Saving…"],
        off: ["इंटरनेट नाही · जतन केलेली प्रत", "No internet · saved copy in use"],
      };
    // The offline copy's name ("aarti-v1.0") from <meta name="version"> in index.html, and the version shown ("1.0")
    CACHE = (document.querySelector('meta[name="version"]') || {}).content || "aarti-v1.0";
    me = (CACHE.match(/^aarti-v([\d.]+)$/) || [])[1];
    document.getElementById("ver").textContent = me ? "v" + me : "";
    // both menu languages, so the text follows a change of menu language
    function two(t) {
      return '<span class="mr">' + t[0] + '</span><span class="en" lang="en">' + t[1] + "</span>";
    }
    function ofSet(st) {
      offv.setAttribute("data-s", st);
      offv.innerHTML = two(OFV[st]);
      ofb.hidden = st !== "off";
    }
    // Check for updates (Settings → About): what it says beside the label, in the menu language
    upd = document.getElementById("upd");
    updv = document.getElementById("updv");
    UPD = {
        busy: ["तपासत आहे…", "Checking…"],
        ok: ["सर्व अद्ययावत आहे", "Up to date"],
        off: ["इंटरनेट नाही", "No internet"],
      };
    function updSet(st) {
      upd.setAttribute("data-s", st);
      updv.innerHTML = st ? two(UPD[st]) : "";
    }
    // Author lines: the Wikipedia link on a poet's name works only online; offline the name is plain text
    function crNet() {
      var on = navigator.onLine !== false;
      [].forEach.call(document.querySelectorAll(".cr a"), function (a) {
        if (on && a.getAttribute("data-href")) {
          a.setAttribute("href", a.getAttribute("data-href"));
          a.removeAttribute("data-href");
          a.removeAttribute("aria-disabled");
        } else if (!on && a.hasAttribute("href")) {
          a.setAttribute("data-href", a.getAttribute("href"));
          a.removeAttribute("href");
          a.setAttribute("aria-disabled", "true");
        }
      });
    }
    crNet();
    addEventListener("online", crNet);
    addEventListener("offline", crNet);
    ofSet(navigator.onLine === false ? "off" : "idle");
    addEventListener("online", function () {
      if (offv.getAttribute("data-s") === "off") ofSet("idle");
      if (upd.getAttribute("data-s") === "off") updSet("");
    });
    addEventListener("offline", function () {
      ofSet("off");
    });
    // Files the page is built from besides itself (js/parts.js, shared with sw.js)
    PARTS = SITE_PARTS.all;
    // Resolves to true if the page or any of its parts differs from the saved copy, false if not; fails with no internet.
    // The saved copy is read first, because fetching goes through the service worker, which saves what it fetches.
    function partsChanged() {
      var files = ["./"].concat(PARTS);
      return Promise.all(
        files.map(function (u) {
          if (!("caches" in window)) return null;
          return caches
            .open(CACHE)
            .then(function (c) {
              return c.match(new URL(u, location.href).href);
            })
            .then(function (m) {
              return m ? m.text() : null;
            })
            .catch(function () {
              return null;
            });
        }),
      ).then(function (old) {
        return Promise.all(
          files.map(function (u, i) {
            return fetch(u, { cache: "no-store" }).then(function (r) {
              if (!r.ok) throw new Error(r.status);
              return r.text().then(function (t) {
                return old[i] !== null && t !== old[i];
              });
            });
          }),
        ).then(function (a) {
          return a.indexOf(true) >= 0;
        });
      });
    }
    upd.onclick = function () {
      if (upd.getAttribute("data-s") === "busy") return;
      if (navigator.onLine === false) {
        ofSet("off");
        updSet("off");
        flash("इंटरनेट नाही. जतन केलेली प्रत वापरत आहे.", "No internet. Using the saved copy.");
        return;
      }
      updSet("busy");
      var t0 = Date.now();
      // Newer if the page, its styles, its script or the pieces' text differ from the copy running now
      partsChanged()
        .then(function (changed) {
          setTimeout(function () {
            if (changed) {
              flash("नवीन आवृत्ती, उघडत आहे…", "New version, loading…");
              try {
                navigator.serviceWorker.getRegistration().then(function (g) {
                  if (g) g.update();
                });
              } catch (e) {}
              setTimeout(function () {
                location.reload();
              }, 700);
              return;
            }
            updSet("ok");
          }, Math.max(0, 900 - (Date.now() - t0)));
        })
        .catch(function () {
          ofSet("off");
          updSet("off");
          flash("इंटरनेट नाही. जतन केलेली प्रत वापरत आहे.", "No internet. Using the saved copy.");
        });
    };
    if ("serviceWorker" in navigator) {
      // The badge shows straight away. On a first visit (no service worker in charge yet) it says "Saving for offline…"
      // while the files are saved; it never waits more than 8 s, because some phones are slow to report back.
      ofSaved = function () {
        if (offv.getAttribute("data-s") !== "save") return;
        ofSet("idle");
        flash("ऑफलाइन वापरासाठी तयार", "Ready to use offline");
      };
      if (!navigator.serviceWorker.controller && navigator.onLine !== false) {
        ofSet("save");
        setTimeout(ofSaved, 8000);
      }
      navigator.serviceWorker
        .register("sw.js")
        .then(function () {
          return navigator.serviceWorker.ready;
        })
        .then(function () {
          if (!("caches" in window)) return;
          caches.open(CACHE).then(function (c) {
            // Keep the page, its parts and every font file, then show the offline badge (sw.js caches the same files)
            var done = ofSaved;
            c.add(new Request("./", { cache: "reload" })).catch(function () {});
            Promise.all(
              PARTS.concat(FONTS).map(function (u) {
                return c.match(u).then(function (h) {
                  return h || c.add(u);
                });
              }),
            )
              .then(done)
              .catch(function () {
                done();
              });
          });
        })
        .catch(function () {});
    }
  }
}

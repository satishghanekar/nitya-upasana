// Offline use: home-screen app details and the service worker (sw.js)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { flash, onPiece } from "../core/page.js";

var FONTS, IMAGES, hd, l1, m1, m2, ofb, offv, OFV, CACHE, me, upd, updv, UPD, PARTS, ofSaved, fill;
// whether every file is in the saved copy: null until known, false while one is missing
var whole = null;

export function init() {
  // The cache name below must match the one in sw.js; change both on every deploy.
  // Font files and pictures kept for offline use (the lists are in js/parts.js, shared with sw.js)
  FONTS = SITE_PARTS.fonts;
  IMAGES = SITE_PARTS.images;
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
      m2.content = "Nitya Upasana";
      hd.appendChild(m2);
    } catch (e) {}
    // Offline: a small cloud in the top bar while there is no internet (#ofb), and in Settings → More → About whether the
    // site is saved for offline use (#offv). A short note says so once, when the first visit has saved it.
    ofb = document.getElementById("ofb");
    offv = document.getElementById("offv");
    OFV = {
        idle: ["ऑफलाइन तयार", "Offline ready"],
        save: ["ऑफलाइनसाठी जतन…", "Saving for offline…"],
        off: ["जतन केलेली प्रत", "Saved copy in use"],
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
    // Check for updates (Settings → More → About, a tap on the version line): what it says on the right, in the menu language
    upd = document.getElementById("upd");
    updv = document.getElementById("updv");
    UPD = {
        "": ["अपडेट तपासा", "Check for updates"],
        busy: ["तपासत आहे…", "Checking…"],
        ok: ["सर्व अद्ययावत आहे", "Up to date"],
        off: ["इंटरनेट नाही", "No internet"],
      };
    function updSet(st) {
      upd.setAttribute("data-s", st);
      updv.innerHTML = two(UPD[st]);
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
    // (a piece built later: js/core/page.js)
    onPiece(function () {
      crNet();
    });
    addEventListener("online", crNet);
    addEventListener("offline", crNet);
    ofSet(navigator.onLine === false ? "off" : "idle");
    addEventListener("online", function () {
      if (offv.getAttribute("data-s") === "off") ofSet(whole === false ? "save" : "idle");
      if (upd.getAttribute("data-s") === "off") updSet("");
    });
    updSet("");
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
    // The page opens from the saved copy (sw.js), so before reloading, the new files must be in it: a new version
    // installs its own copy (sw.js changed), and files changed under the same version are saved over the old ones.
    // Resolves once that is done, or after 20 s at most.
    function newCopy() {
      var fresh = Promise.resolve();
      if ("caches" in window)
        fresh = caches
          .open(CACHE)
          .then(function (c) {
            return c.addAll(
              ["./"].concat(PARTS).map(function (u) {
                return new Request(u, { cache: "reload" });
              }),
            );
          })
          .catch(function () {});
      var next = Promise.resolve();
      if ("serviceWorker" in navigator)
        next = navigator.serviceWorker
          .getRegistration()
          .then(function (g) {
            return g && g.update().then(function () {
              // a new version is installing: wait until it is in charge
              if (!g.installing && !g.waiting) return;
              return new Promise(function (res) {
                navigator.serviceWorker.addEventListener("controllerchange", res);
              });
            });
          })
          .catch(function () {});
      return Promise.race([
        Promise.all([fresh, next]),
        new Promise(function (res) {
          setTimeout(res, 20000);
        }),
      ]);
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
              newCopy().then(function () {
                location.reload();
              });
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
      // while the files are saved. "Offline ready" only once every file is in the saved copy: a file that could not be
      // saved (a weak connection) is tried again when the internet is back or the page is shown again, and until then
      // the badge keeps saying "Saving for offline…" (sw.js saves the same files, but goes on without one that fails).
      ofSaved = function () {
        whole = true;
        if (offv.getAttribute("data-s") !== "save") return;
        ofSet("idle");
        flash("ऑफलाइन वापरासाठी तयार", "Ready to use offline");
      };
      if (!navigator.serviceWorker.controller && navigator.onLine !== false) ofSet("save");
      var files = PARTS.concat(FONTS, IMAGES),
        filling = false;
      // Keep the page, its parts, every font file and the pictures (each one not saved yet), then say so
      fill = function () {
        if (filling || whole || !("caches" in window) || navigator.onLine === false) return;
        filling = true;
        caches
          .open(CACHE)
          .then(function (c) {
            // the page too, only when the saved copy lacks it: it is downloaded again only with a new version (sw.js)
            c.match("./")
              .then(function (h) {
                return h || c.add(new Request("./", { cache: "reload" }));
              })
              .catch(function () {});
            return Promise.all(
              files.map(function (u) {
                return c.match(u).then(function (h) {
                  return h || c.add(u);
                });
              }),
            );
          })
          .then(ofSaved, function () {
            whole = false;
            if (offv.getAttribute("data-s") !== "off") ofSet("save");
          })
          .then(function () {
            filling = false;
          });
      };
      addEventListener("online", fill);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") fill();
      });
      navigator.serviceWorker
        .register("sw.js")
        .then(function () {
          return navigator.serviceWorker.ready;
        })
        .then(fill)
        .catch(function () {});
    }
  }
}

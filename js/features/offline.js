// Offline use: home-screen app details and the service worker (sw.js)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { note, onPiece } from "../core/page.js";
import { fillWords, menuWords } from "../core/strings.js";

var FONTS, IMAGES, hd, l1, m1, m2, ofb, offv, CACHE, me, upd, updv, PARTS, ofSaved, fill;
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

    // The offline copy's name ("aarti-v1.0") from <meta name="version"> in index.html, and the version shown ("1.0")
    CACHE = (document.querySelector('meta[name="version"]') || {}).content || "aarti-v1.0";
    me = (CACHE.match(/^aarti-v([\d.]+)$/) || [])[1];
    document.getElementById("ver").textContent = me ? "v" + me : "";
    // the words as the page's own (data-w), so they follow a change of menu language (js/core/strings.js fillWords)
    /** @param {HTMLElement} el @param {string} path */
    function words(el, path) {
      el.innerHTML = '<span data-w="' + path + '"></span>';
      fillWords(el);
    }
    function ofSet(st) {
      offv.setAttribute("data-s", st);
      words(offv, "offline.state." + st);
      ofb.hidden = st !== "off";
    }
    // Check for updates (Settings → More → About, a tap on the version line): what it says on the right, in the menu language
    upd = document.getElementById("upd");
    updv = document.getElementById("updv");

    function updSet(st) {
      upd.setAttribute("data-s", st);
      words(updv, "offline.update." + (st || "check"));
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
    // A file's address marked to be fetched from the network, past the saved copy (sw.js lets ?fresh through). The
    // request's cache mode ('no-store', 'reload') is not enough: Safari's service worker never sees it, so it answered
    // from the saved copy and Check for updates compared that copy with itself ("Up to date", stuck on 1.37.3).
    /** @param {string} u */
    function fresh(u) {
      return u + (u.indexOf("?") < 0 ? "?" : "&") + "fresh=" + Date.now();
    }
    // The saved copy of this version, or null when there is none: caches.open() would make an empty one. Safari installs
    // a new version as the app opens and removes this version's copy, while the page on screen is still this version.
    function savedCopy() {
      if (!("caches" in window)) return Promise.resolve(null);
      return caches.has(CACHE).then(function (h) {
        return h ? caches.open(CACHE) : null;
      });
    }
    // Resolves to true if the page names another version than the one on screen, or the page or any of its parts
    // differs from the saved copy; false if not; fails with no internet.
    function partsChanged() {
      var files = ["./"].concat(PARTS);
      return Promise.all(
        files.map(function (u) {
          return savedCopy()
            .then(function (c) {
              return c && c.match(new URL(u, location.href).href);
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
            return fetch(fresh(u), { cache: "no-store" }).then(function (r) {
              if (!r.ok) throw new Error(r.status);
              return r.text().then(function (t) {
                // (the page: its <meta name="version">, which the saved copy may no longer have to compare with)
                var v = i === 0 && /<meta name="version" content="([^"]+)"/.exec(t);
                if (v && v[1] !== CACHE) return true;
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
    // Resolves once that is done, or after 20 s at most. Every file is fetched before any is saved, so a file that fails
    // leaves the saved copy as it was (as addAll did).
    function newCopy() {
      var saved = Promise.resolve();
      if ("caches" in window) {
        var files = ["./"].concat(PARTS);
        saved = Promise.all(
          files.map(function (u) {
            return fetch(fresh(u), { cache: "reload" }).then(function (r) {
              if (!r.ok) throw new Error(r.status);
              return r;
            });
          }),
        )
          .then(function (rs) {
            // (a new version saves its own copy, sw.js: only this version's copy, if it is still there, is saved over)
            return savedCopy().then(function (c) {
              if (c)
                return Promise.all(
                  rs.map(function (r, i) {
                    return c.put(new URL(files[i], location.href).href, r);
                  }),
                );
            });
          })
          .catch(function () {});
      }
      var next = Promise.resolve();
      if ("serviceWorker" in navigator)
        next = navigator.serviceWorker
          .getRegistration()
          .then(function (g) {
            return (
              g &&
              g.update().then(function () {
                // a new version is installing: wait until it is in charge
                if (!g.installing && !g.waiting) return;
                return new Promise(function (res) {
                  navigator.serviceWorker.addEventListener("controllerchange", res);
                });
              })
            );
          })
          .catch(function () {});
      return Promise.race([
        Promise.all([saved, next]),
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
        note(menuWords("offline").usingSaved);
        return;
      }
      updSet("busy");
      var t0 = Date.now();
      // Newer if the page, its styles, its script or the pieces' text differ from the copy running now
      partsChanged()
        .then(function (changed) {
          setTimeout(
            function () {
              if (changed) {
                note(menuWords("offline").loading);
                newCopy().then(function () {
                  location.reload();
                });
                return;
              }
              updSet("ok");
            },
            Math.max(0, 900 - (Date.now() - t0)),
          );
        })
        .catch(function () {
          ofSet("off");
          updSet("off");
          note(menuWords("offline").usingSaved);
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
        note(menuWords("offline").ready);
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

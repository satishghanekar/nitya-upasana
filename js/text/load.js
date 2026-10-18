// @ts-check
// Loading the texts: fetches content/library.json and every text file it lists (content/texts/), builds CONTENT
// from them (js/text/content.js), then has js/render.js write the pieces into the page where index.html keeps
// their place (#pieces), in Kannada letters when that is the chosen language. js/main.js waits for this before it
// starts the other parts, so they find the page as it was when the pieces were written into index.html.
// The files are on the offline list (js/parts.js), so this works without internet too.
// It also fetches content/routines.json, the default routine the Today card shows (js/features/today-card.js),
// and content/categories.json, the library's categories (js/features/library.js), at the same time; without them
// the texts still load, the card shows empty sessions and the list keeps the reading page's groups.

import { buildContent } from "./content.js";

/**
 * What was loaded, for the parts that need it after start-up: the library (content/library.json), the
 * routine (content/routines.json) and the categories (content/categories.json); null when one could not be loaded.
 * @type {{ library: import("./content.js").Library | null, routine: import("../core/routine.js").Routine | null,
 *   categories: import("../core/library.js").BundledCategory[] | null }}
 */
export const loaded = { library: null, routine: null, categories: null };

/**
 * @param {string} url
 * @returns {Promise<Response>}
 */
function get(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error(url + ": " + r.status);
    return r;
  });
}

/** @returns {Promise<void>} */
export function load() {
  var routine = get("content/routines.json")
    .then(function (r) {
      return r.json();
    })
    .then(
      function (/** @type {import("../core/routine.js").Routine} */ o) {
        loaded.routine = o && typeof o === "object" ? o : null;
      },
      function (/** @type {unknown} */ e) {
        console.warn(e);
      },
    );
  var categories = get("content/categories.json")
    .then(function (r) {
      return r.json();
    })
    .then(
      function (/** @type {any} */ o) {
        loaded.categories = Array.isArray(o) ? o : null;
      },
      function (/** @type {unknown} */ e) {
        console.warn(e);
      },
    );
  var texts = get("content/library.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (/** @type {import("./content.js").Library} */ lib) {
      loaded.library = lib;
      return Promise.all(
        lib.texts.map(function (t) {
          return get("content/" + t.file).then(function (r) {
            return r.text();
          });
        }),
      ).then(function (raw) {
        /** @type {Record<string, string>} */
        var files = {};
        lib.texts.forEach(function (t, i) {
          files[t.id] = raw[i];
        });
        /** @type {any} */
        var w = window;
        w.CONTENT = buildContent(lib, files);
        var at = /** @type {HTMLElement} */ (document.getElementById("pieces"));
        at.insertAdjacentHTML("beforebegin", w.renderPieces(w.CONTENT));
        at.parentNode && at.parentNode.removeChild(at);
        w.SCR.page();
      });
    });
  return Promise.all([texts, routine, categories]).then(function () {});
}

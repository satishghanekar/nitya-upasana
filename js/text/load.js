// @ts-check
// Loading the texts: fetches content/library.json and every text file it lists (content/texts/), builds CONTENT
// from them (js/text/content.js), and puts the rest of the page in Kannada letters when that is the chosen language.
// js/main.js waits for this before it starts the other parts. The pieces themselves are built one at a time, the
// first time each is opened (js/core/page.js, with js/render.js).
// The files are on the offline list (js/parts.js), so this works without internet too.
// It also fetches content/routines.json, the default routine the Today card shows (js/features/today-card.js),
// at the same time; without it the texts still load and the card shows empty sessions. And content/festivals.json, the
// festival rules the Vedic calendar marks (js/core/festivals.js); without it no festivals are marked. And
// content/holidays.json, the public holidays it marks (js/core/holidays.js); without it no holidays are marked. And
// content/categories.json, the library's categories, which also set the reading order and the numbers
// (js/text/content.js, js/core/library.js, js/features/library.js); without it each category is named by its id. And
// content/pdfs.json, the PDFs the Library's PDFs tab lists (js/features/pdfs.js); without it the tab is not shown.

import { buildContent } from "./content.js";

/**
 * What was loaded, for the parts that need it after start-up: the library (content/library.json) and the
 * routine (content/routines.json; null when it could not be loaded) and the festival rules (content/festivals.json;
 * null when it could not be loaded) and the holidays (content/holidays.json; null when it could not be loaded) and the categories (content/categories.json; null when it could not be loaded) and the PDFs (content/pdfs.json, as read; null when it could not be loaded).
 * @type {{
 *   library: import("./content.js").Library | null,
 *   routine: import("../core/routine.js").Routine | null,
 *   festivals: import("../core/festivals.js").FestivalList | null,
 *   holidays: import("../core/holidays.js").HolidayList | null,
 *   categories: import("../core/library.js").BundledCategory[] | null,
 *   pdfs: unknown
 * }}
 */
export const loaded = { library: null, routine: null, festivals: null, holidays: null, categories: null, pdfs: null };

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
  var festivals = get("content/festivals.json")
    .then(function (r) {
      return r.json();
    })
    .then(
      function (/** @type {import("../core/festivals.js").FestivalList} */ o) {
        loaded.festivals = o && Array.isArray(o.festivals) ? o : null;
      },
      function (/** @type {unknown} */ e) {
        console.warn(e);
      },
    );
  var holidays = get("content/holidays.json")
    .then(function (r) {
      return r.json();
    })
    .then(
      function (/** @type {import("../core/holidays.js").HolidayList} */ o) {
        loaded.holidays = o && Array.isArray(o.holidays) ? o : null;
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
  var pdfs = get("content/pdfs.json")
    .then(function (r) {
      return r.json();
    })
    .then(
      function (/** @type {unknown} */ o) {
        loaded.pdfs = o;
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
      // the categories set the reading order and the numbers (js/text/content.js), so they are waited for
      return Promise.all(
        lib.texts.map(function (t) {
          return get("content/" + t.file).then(function (r) {
            return r.text();
          });
        }),
      )
        .then(function (raw) {
          return categories.then(function () {
            return raw;
          });
        })
        .then(function (raw) {
          /** @type {Record<string, string>} */
          var files = {};
          lib.texts.forEach(function (t, i) {
            files[t.id] = raw[i];
          });
          /** @type {any} */
          var w = window;
          w.CONTENT = buildContent(lib, files, loaded.categories);
          w.SCR.page();
        });
    });
  return Promise.all([texts, routine, festivals, holidays, categories, pdfs]).then(function () {});
}

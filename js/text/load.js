// @ts-check
// Loading the texts: fetches content/library.json (the categories, each with its texts in reading order),
// content/timing.json (the chanting paces: js/core/timing.js), content/credits.json (who and what the texts come from,
// each once), content/wiki.json (each page a link names, with its title on each Wikipedia: js/core/wiki.js) and every
// text file the library lists (content/texts/), builds CONTENT from them (js/text/content.js), and puts the rest of
// the page in Kannada letters when that is the chosen language. js/main.js waits for this before it starts the other
// parts. The pieces themselves are built one at a time, the first time each is opened (js/core/page.js, with js/render.js).
// The files are on the offline list (js/parts.js), so this works without internet too.
// It also fetches content/routines.json, the ready-made routines (js/core/routine.js BASES) the Today card shows for a
// person who follows one (js/features/today-card.js), at the same time; without it the texts still load and the card
// shows empty sessions. And content/festivals.json, the festival rules the Vedic calendar marks (js/core/festivals.js);
// without it no festivals are marked. And content/holidays.json, the public holidays it marks (js/core/holidays.js);
// without it no holidays are marked. And content/pdfs.json, the PDFs the Library's PDFs tab lists
// (js/features/pdfs.js); without it the tab is not shown.

import { buildContent } from "./content.js";

/**
 * What was loaded, for the parts that need it after start-up: the library (content/library.json), the ready-made routines by id (content/routines.json), the festival rules
 * (content/festivals.json), the holidays (content/holidays.json) and the PDFs (content/pdfs.json, as read); each null
 * when it could not be loaded.
 * @type {{
 *   library: import("./content.js").Library | null,
 *   routines: Record<string, import("../core/routine.js").Routine> | null,
 *   festivals: import("../core/festivals.js").FestivalList | null,
 *   holidays: import("../core/holidays.js").HolidayList | null,
 *   pdfs: unknown
 * }}
 */
export const loaded = { library: null, routines: null, festivals: null, holidays: null, pdfs: null };

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

/** @param {(part: string, lang: string) => any} [words]  the menu words (menuWords): the site's words around a text and
 *   Wikipedia's names, in each language (given by js/main.js: the menu words can't be loaded from here, which the store
 *   loads early) @returns {Promise<void>} */
export function load(words) {
  var routine = get("content/routines.json")
    .then(function (r) {
      return r.json();
    })
    .then(
      function (/** @type {Record<string, import("../core/routine.js").Routine>} */ o) {
        loaded.routines = o && typeof o === "object" ? o : null;
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
  /** @param {string} url */
  var json = function (url) {
    return get(url).then(function (r) {
      return r.json();
    });
  };
  // (without the Wikipedia pages, a credit's link goes to the English page it names)
  var wiki = json("content/wiki.json").catch(function (/** @type {unknown} */ e) {
    console.warn(e);
    return null;
  });
  // (without the credits, the texts show none)
  var credits = json("content/credits.json").catch(function (/** @type {unknown} */ e) {
    console.warn(e);
    return null;
  });
  var texts = Promise.all([json("content/library.json"), json("content/timing.json"), wiki, credits]).then(function (both) {
    /** @type {import("./content.js").Library} */
    var lib = both[0];
    loaded.library = lib;
    // every text the library lists, each from its own file
    /** @type {string[]} */
    var ids = [];
    lib.categories.forEach(function (c) {
      ids = ids.concat(c.texts);
    });
    return Promise.all(
      ids.map(function (/** @type {string} */ id) {
        return get("content/texts/" + id + ".txt").then(function (r) {
          return r.text();
        });
      }),
    ).then(function (raw) {
      /** @type {Record<string, string>} */
      var files = {};
      ids.forEach(function (/** @type {string} */ id, i) {
        files[id] = raw[i];
      });
      /** @type {any} */
      var w = window;
      w.CONTENT = buildContent(lib, files, { wiki: both[2], credits: both[3], words: words || null, timing: both[1] });
      w.SCR.page();
    });
  });
  return Promise.all([texts, routine, festivals, holidays, pdfs]).then(function () {});
}

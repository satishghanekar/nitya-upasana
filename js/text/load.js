// @ts-check
// Loading the texts: fetches content/library.json and every text file it lists (content/texts/), builds CONTENT
// from them (js/text/content.js), then has js/render.js write the pieces into the page where index.html keeps
// their place (#pieces), in Kannada letters when that is the chosen language. js/main.js waits for this before it
// starts the other parts, so they find the page as it was when the pieces were written into index.html.
// The files are on the offline list (js/parts.js), so this works without internet too.

import { buildContent } from "./content.js";

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
  return get("content/library.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (/** @type {import("./content.js").Library} */ lib) {
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
}

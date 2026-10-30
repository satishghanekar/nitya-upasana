// @ts-check
// The menu words, in every menu language. Each language has one file in js/strings/ (en.js, mr.js) holding each
// part's words under the part's name, and menuWords("backup") gives the backup part's words in the menu language
// (P.ui). A word a language lacks is taken from English, so a new language can be added a part at a time.
// No init(): nothing here touches the page, so the unit tests (tests/unit/strings.test.mjs) run it in Node.
//
// To add a menu language: copy js/strings/en.js to js/strings/<code>.js, translate it, and add it to LANGS below,
// to js/parts.js and to the modulepreload links in index.html. tests/unit/strings.test.mjs checks that every language
// has the same words, and that each sentence with a value in it takes the same values.
//
// The parts move here one at a time, from the tables of words they used to keep ("const W = { en, mr }"); the
// list of parts already moved is in tests/unit/strings.test.mjs (MOVED), which also checks they keep no Marathi
// of their own.

import en from "../strings/en.js";
import mr from "../strings/mr.js";
import { ui } from "./words.js";

/** @typedef {typeof en} Words */

/** The menu languages: their code (as P.ui keeps it) and their words */
/** @type {Record<string, Partial<Words>>} */
export const LANGS = { en: en, mr: mr };

/** @type {Record<string, any>} */
var made = {};

/**
 * A part's words in the menu language, any word the language lacks taken from English
 * @template {keyof Words} K @param {K} part @param {string} [lang] the menu language, else the reader's
 * @returns {Words[K]}
 */
export function menuWords(part, lang) {
  var l = lang || ui(),
    k = l + ":" + part;
  if (!made[k]) made[k] = l === "en" || !LANGS[l] ? en[part] : fill(en[part], /** @type {any} */ (LANGS[l])[part]);
  return made[k];
}

/** English's words with a language's own over them, a level of words (such as backup.problems) at a time
 * @param {any} base @param {any} over */
function fill(base, over) {
  if (!over) return base;
  /** @type {any} */
  var out = {};
  Object.keys(base).forEach(function (key) {
    var b = base[key],
      o = over[key];
    out[key] = o === undefined ? b : b && typeof b === "object" && !Array.isArray(b) ? fill(b, o) : o;
  });
  return out;
}

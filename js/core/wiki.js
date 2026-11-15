// @ts-check
// Which Wikipedia page a link opens (Satish, 2026-11-15: the Kannada-only map gave way to every language). A link names
// a page by its English Wikipedia title, as in its address (a text's credit [name](wiki:Samarth_Ramdas), a festival's or
// holiday's "wiki": "Vijayadashami"; or its Wikidata item, wiki:Q…); content/wiki.json, written by npm run wiki, holds
// its Wikidata item and its page title on each Wikipedia the site can open. ORDER says, for each language a reader
// reads or has menus in, which Wikipedias to try (Marathi: Marathi, Hindi, English), and the menu words (js/strings/,
// "wiki", given by the caller: this file is loaded with the texts, before the menu words can be) name each Wikipedia to
// screen readers. Pure, unit-tested in tests/unit/wiki.test.mjs; no init().

/**
 * @typedef {Record<string, Record<string, string>>} Pages  by the name a link uses: its Wikidata item ("wikidata") and
 *   its page title on each Wikipedia, by language
 * @typedef {{ lang: string, url: string }} Page
 */

/** For each language a page is read in (the original's, a Hindi text's, English, and the letters Marathi can be shown
 * in) or the menus are in: the Wikipedias to try, in order. The nearest language first, then Hindi for Marathi (a
 * Devanagari reader reads it), then English, which has the most pages. @type {Record<string, string[]>} */
export const ORDER = {
  mr: ["mr", "hi", "en"],
  hi: ["hi", "mr", "en"],
  en: ["en"],
  kn: ["kn", "en"],
  te: ["te", "en"],
  gu: ["gu", "en"],
};

/** Every Wikipedia a page may be opened on (npm run wiki keeps their titles) */
export const LANGUAGES = Object.keys(ORDER);

/** The page a link opens for a reader of `lang`: the first Wikipedia in that language's order with a page for it,
 * else any it has (so a link never goes nowhere), else null @param {string} q  the name the link uses
 * @param {string} lang @param {Pages} pages @returns {Page | null} */
export function pageFor(q, lang, pages) {
  var have = pages[q];
  if (!have) return null;
  var order = (ORDER[lang] || []).concat(LANGUAGES);
  for (var i = 0; i < order.length; i++)
    if (have[order[i]]) return { lang: order[i], url: "https://" + order[i] + ".wikipedia.org/wiki/" + encodeURIComponent(have[order[i]].replace(/ /g, "_")) };
  return null;
}

/** What a screen reader hears for a link to a page: the name shown, then which Wikipedia it opens and that it opens in a
 * new tab, in `lang`'s menu words ("समर्थ रामदास — हिंदी विकिपीडिया (नवीन टॅबमध्ये उघडेल)")
 * @param {string} shown @param {Page} page @param {string} lang
 * @param {Record<string, string>} words  that language's "wiki" menu words (menuWords("wiki", lang)) */
export function wikiLabel(shown, page, lang, words) {
  return shown + (lang === "en" ? ": " : " — ") + words[page.lang] + " (" + words.tab + ")";
}

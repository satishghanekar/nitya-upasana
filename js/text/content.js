// @ts-check
// Builds CONTENT, the data js/render.js turns into the reading page, from content/library.json, content/site.json and the text
// files in content/texts/ (read by js/text/format.js). Pure: the files come in as strings, so the unit test
// (tests/unit/content.test.mjs) can prove the result is exactly what the site showed before the texts became files.
//
// What the files leave to the app:
// - the reading order and the piece numbers (१. 1.): content/library.json's categories in order, each with its texts in
//   order, numbered from 1 in each category as the Library lists them;
// - each text's facts (CONTENT.texts): what it is from its own file's header, its category from the library;
// - the language tag (मराठी Marathi) from site.json's "languages";
// - with "refrain: every-verse", the dhrupad label at the top and, after every stanza, the "↻ ध्रुपद" note and
//   the dhrupad again (site.json's "refrain"); [once] lines and [note]s before the dhrupad go above it (lead);
// - line ids: the text's "line-ids" prefix and a count of the lines as shown (repeats included);
// - the credit links: [name](address) becomes a link that opens in a new tab, with its label and ↗.

import { parseText, RECORDING, toHtml } from "./format.js";
import { LANGUAGES, pageFor, wikiLabel } from "../core/wiki.js";

/**
 * @typedef {import("./format.js").Text} Text
 * @typedef {import("./format.js").Pair} Pair
 * @typedef {{ id: string, name: Pair, texts: string[] }} LibraryCategory   a category of content/library.json, its texts
 *   in reading order
 * @typedef {{ categories: LibraryCategory[] }} Library   content/library.json
 * @typedef {{ pageLanguage: string, languages: Record<string, Pair>, refrain: { label: Pair, note: Pair },
 *   ui: { prev: Pair, next: Pair }, outline?: { minLines: number, group: number },
 *   timing?: any }} Site   content/site.json
 * @typedef {{ pages: import("../core/wiki.js").Pages, words: (lang: string) => Record<string, string> }} Wiki   which
 *   page a link opens: content/wiki.json's pages; and each language's "wiki" menu words (js/strings/), given by
 *   js/main.js (this file is loaded with the store, before the menu words can be)
 * @typedef {{ id: string, title: string, titleEn: string, language: string, category: string, lines: number,
 *   letters: number }} TextFacts   what a text is (its file's header) and where it stands (the library's category)
 * @typedef {{ l: string, rf?: true, mr: string, en: string }} Line
 * @typedef {{ kind?: string, bold?: true, para?: true, lines?: Line[], rmk?: Pair, nt?: true }} Item
 *   rmk: a small line between blocks: the dhrupad's marker (↻ ध्रुपद), or, with nt, a [note] from the text file (Phalashruti,
 *   ↻ ३ वेळा), which is part of the text and always shown, whatever the dhrupad setting
 * @typedef {{ id: string, text: string, lang?: string, cls?: string, prose?: true, no: Pair, title: Pair, tag: Pair,
 *   lead?: Item[], refrain?: { label: Pair, lines: Pair[] }, items: Item[], credit: string, partName?: Pair }} Piece
 *   lead: what comes before the dhrupad at the top (refrain), [once] lines and [note]s, shown above it
 * @typedef {{ ui: Site["ui"], wiki: Wiki | null, outline?: Site["outline"], timing?: any, languages: Site["languages"],
 *   texts: Record<string, TextFacts>, categories: { id: string, name: Pair,
 *   pieces: Piece[] }[] }} Content
 */

const DIGITS = "०१२३४५६७८९";

/** @param {Pair} p */
function pair(p) {
  return { mr: p.mr, en: p.en };
}

/** @param {string} s */
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// A credit line: [name](wiki:Samarth_Ramdas) becomes a link to the Wikipedia page of the person (or source) it names, opening in a new
// tab: in the side's own language where Wikipedia has one (the original's side: Marathi, then Hindi, then English; a
// Hindi text's: Hindi first; the English side: English), else the nearest there is (js/core/wiki.js). On the original's
// side it also carries the page for each script the original can be shown in (data-kn, data-te, data-gu: "kn https://…",
// and what is heard, data-kn-label), which js/render.js puts in place when Kannada, Telugu or Gujarati letters are chosen.
/**
 * @param {string} s
 * @param {"mr" | "en"} side
 * @param {Wiki | null} wiki  content/wiki.json's pages (null: each link goes to the English page it names, as when a test
 *   builds a piece without them)
 * @param {string} lang  the original's language, which Wikipedia its side tries first ("mr", or "hi" for a Hindi text)
 */
function credit(s, side, wiki, lang) {
  var out = "",
    re = /\[([^\]]+)\]\(wiki:([^()\s]+)\)/g,
    last = 0,
    m;
  while ((m = re.exec(s))) {
    var name = m[1],
      q = m[2],
      as = side === "en" ? "en" : lang,
      words = side === "en" ? "en" : "mr",
      page = wiki && pageFor(q, as, wiki.pages),
      attrs = "";
    if (page && wiki) {
      attrs = ' hreflang="' + page.lang + '" aria-label="' + esc(wikiLabel(name, page, words, wiki.words(words))) + '"';
      // (the other scripts the original can be shown in: each its own Wikipedia first)
      if (side === "mr")
        LANGUAGES.forEach(function (code) {
          if (code === "mr" || code === "hi" || code === "en") return;
          var p2 = pageFor(q, code, /** @type {Wiki} */ (wiki).pages);
          if (p2)
            attrs +=
              " data-" +
              code +
              '="' +
              p2.lang +
              " " +
              esc(p2.url) +
              '" data-' +
              code +
              '-label="' +
              esc(wikiLabel("", p2, code, /** @type {Wiki} */ (wiki).words(code))) +
              '"';
        });
    }
    out +=
      esc(s.slice(last, m.index)) +
      '<a href="' +
      esc(page ? page.url : /^Q[0-9]+$/.test(q) ? "https://www.wikidata.org/wiki/" + q : "https://en.wikipedia.org/wiki/" + encodeURIComponent(q)) +
      '" target="_blank" rel="noopener" data-wiki="' +
      q +
      '"' +
      attrs +
      ">" +
      esc(name) +
      '<span class="crx" aria-hidden="true"> ↗</span></a>';
    last = re.lastIndex;
  }
  return out + esc(s.slice(last));
}
/**
 * The recordings to hear, under the credit: "▶ YouTube: Challakere Brothers ↗", each opening in a new tab at the second
 * the text starts. YouTube and the chanters' names read the same in every language, so the line has no menu words.
 * @param {string} [s]  the header's recording line, checked by js/text/format.js
 */
function recordings(s) {
  if (!s) return "";
  var links = s.split(", ").map(function (r) {
    var m = /** @type {RegExpExecArray} */ (RECORDING.exec(r));
    return (
      '<a href="' +
      esc(m[2]) +
      '" target="_blank" rel="noopener" aria-label="' +
      esc(m[1] + ": YouTube (opens in a new tab)") +
      '">' +
      esc(m[1]) +
      '<span class="crx" aria-hidden="true"> ↗</span></a>'
    );
  });
  return '<span class="rec" lang="en"><span aria-hidden="true">▶ </span>YouTube: ' + links.join(" · ") + "</span>";
}
/**
 * @param {string | undefined} mr
 * @param {string | undefined} en
 * @param {Wiki | null} wiki
 * @param {string} lang
 */
function credits(mr, en, wiki, lang) {
  return '<span class="mr">' + credit(mr || "", "mr", wiki, lang) + '</span><span class="en" lang="en">' + credit(en || "", "en", wiki, lang) + "</span>";
}

/**
 * One text as a piece of CONTENT.
 * @param {Text} t
 * @param {number} n  its number in its category, from 1
 * @param {Site} lib  content/site.json
 * @param {Wiki | null} [wiki]  content/wiki.json's pages with content/site.json's "wikipedia", for the credits' links
 * @returns {Piece}
 */
export function toPiece(t, n, lib, wiki) {
  if (!wiki) wiki = null;
  // (a Hindi text's credit tries Hindi Wikipedia first)
  var wl = t.language === "hi" ? "hi" : "mr";
  var prefix = t.lineIds || t.id + ".",
    ex = t.lineIdExceptions || {},
    count = 0;
  function nextId() {
    var id = prefix + ++count;
    return ex[id] || id;
  }
  /** @param {import("./format.js").TextLine} x */
  function line(x) {
    // (the keys in this order: l, rf, mr, en, as they always were)
    var l = /** @type {Line} */ ({ l: nextId() });
    if (x.rf) l.rf = true;
    l.mr = toHtml(x.orig);
    l.en = toHtml(x.en);
    return l;
  }
  /** @type {Piece} */
  // id: the piece's section on the page (an older text keeps its first one, a1 or p1); text: its id in library.json
  var p = /** @type {any} */ ({ id: t.legacyId || t.id, text: t.id });
  if (t.language !== lib.pageLanguage) p.lang = t.language;
  if (t.refrain === "always") p.cls = "norf";
  // stanza-numbers: as-written: the numbers are part of the text, so js/text/stanza-numbers.js adds none
  if (t.stanzaNumbers === "as-written") p.cls = (p.cls ? p.cls + " " : "") + "ownsn";
  // layout: lines is a Vedic chant too (its font, its references glued, its printout), set line by line as its booklet
  // is rather than run on (css/02-core.css, "Vedic chants line by line")
  if (t.layout === "prose" || t.layout === "lines") p.prose = true;
  if (t.layout === "lines") p.cls = (p.cls ? p.cls + " " : "") + "lines";
  p.no = {
    mr:
      String(n).replace(/[0-9]/g, function (d) {
        return DIGITS[+d];
      }) + ".",
    en: n + ".",
  };
  p.title = { mr: t.title, en: t.titleEn };
  // what its parts are called, for Go to (js/text/outline.js)
  if (t.partName) {
    var pn = t.partName.split(" | ");
    p.partName = { mr: pn[0], en: pn[1] };
  }
  p.tag = pair(lib.languages[t.language]);
  /** @type {Item[]} */
  var items = [];
  var blocks = t.blocks;
  if (t.refrain === "every-verse") {
    // the dhrupad is the first block that is not [once] lines or a [note] (js/text/format.js checks there is one)
    var d = 0;
    while (blocks[d].kind === "once" || blocks[d].kind === "note") d++;
    var lead = blocks.slice(0, d),
      dh = blocks[d],
      rep = blocks[d + 1] && blocks[d + 1].kind === "dhrupad-repeated" ? blocks[d + 1] : dh;
    blocks = blocks.slice(rep === dh ? d + 1 : d + 2);
    p.refrain = {
      label: pair(lib.refrain.label),
      lines: dh.lines.map(function (x) {
        return { mr: toHtml(x.orig), en: toHtml(x.en) };
      }),
    };
    var again = function () {
      items.push({ rmk: pair(lib.refrain.note) });
      items.push({
        kind: "rf",
        lines: rep.lines.map(function (x) {
          return line({ orig: x.orig, en: x.en, rf: true });
        }),
      });
    };
    // a [note] of the text's own, [once] lines or a closing [dhrupad bold] (shown as a line said once, the last in bold):
    // where they stand, no dhrupad after them
    /** @param {import("./format.js").Block} b @returns {Item} */
    var own = function (b) {
      if (b.kind === "note") return { rmk: pair(/** @type {Pair} */ (b.note)), nt: true };
      /** @type {Item} */
      var it = { kind: "dh" };
      if (b.bold) it.bold = true;
      it.lines = b.lines.map(line);
      return it;
    };
    if (lead.length) p.lead = lead.map(own);
    if (t.refrainFirst) again();
    blocks.forEach(function (b) {
      if (b.kind === "note" || b.kind === "once" || b.kind === "dhrupad") items.push(own(b));
      else {
        items.push(b.para ? { para: true, lines: b.lines.map(line) } : { lines: b.lines.map(line) });
        again();
      }
    });
  } else {
    // [once] lines at the very top (an invocation: ॥ श्री गणेशाय नमः ॥) go above the text (lead), as in a text with a dhrupad
    var top = 0;
    while (blocks[top] && blocks[top].kind === "once") top++;
    if (top)
      p.lead = blocks.slice(0, top).map(function (b) {
        return /** @type {Item} */ ({ kind: "dh", lines: b.lines.map(line) });
      });
    blocks.slice(top).forEach(function (b) {
      /** @type {Item} */
      var it = {};
      if (b.kind === "note") {
        it.rmk = pair(/** @type {Pair} */ (b.note));
        it.nt = true;
      } else {
        if (b.kind === "dhrupad" || b.kind === "once") it.kind = "dh";
        if (b.bold) it.bold = true;
        if (b.para) it.para = true;
        it.lines = b.lines.map(line);
      }
      items.push(it);
    });
  }
  p.items = items;
  p.credit =
    credits(t.credit, t.creditEn, wiki, wl) +
    (t.creditNote || t.creditNoteEn ? "<small>" + credits(t.creditNote, t.creditNoteEn, wiki, wl) + "</small>" : "") +
    recordings(t.recording);
  return p;
}

/**
 * CONTENT from the library, the site's settings and the text files.
 * @param {Library} lib  content/library.json: the categories in reading order, each with its texts' ids in order
 * @param {Site} site  content/site.json: the words and settings every text shares
 * @param {Record<string, string>} files  each text's file, by text id
 * @param {{ pages: import("../core/wiki.js").Pages } | null} [wikiPages]  content/wiki.json: each page a link names, its
 *   title on each Wikipedia (without it, a credit's link goes to the English page it names)
 * @param {(lang: string) => Record<string, string>} [wikiWords]  each language's "wiki" menu words, what a link's
 *   screen reader name says (menuWords("wiki", lang))
 * @returns {Content}
 */
export function buildContent(lib, site, files, wikiPages, wikiWords) {
  /** @type {Wiki | null} */
  var wiki = wikiPages && wikiWords ? { pages: wikiPages.pages, words: wikiWords } : null;
  /** @type {Record<string, TextFacts>} */
  var facts = {};
  var categories = lib.categories.map(function (c) {
    return {
      id: c.id,
      name: pair(c.name),
      pieces: c.texts.map(function (id, i) {
        var file = "texts/" + id + ".txt";
        if (facts[id]) throw new Error("library.json: " + id + " is listed twice");
        if (typeof files[id] !== "string") throw new Error(file + ": not loaded");
        var t = parseText(files[id], file);
        if (t.id !== id) throw new Error(file + ': its id is "' + t.id + '", library.json says "' + id + '"');
        // what a text is, from its own file; where it stands, from the library
        facts[id] = { id: id, title: t.title, titleEn: t.titleEn, language: t.language, category: c.id, lines: t.lines || 0, letters: t.letters || 0 };
        return toPiece(t, i + 1, site, wiki);
      }),
    };
  });
  return {
    ui: site.ui,
    // which Wikipedia page a link opens (js/core/wiki.js): the credits' links are written with theirs, and
    // js/render.js and the Vedic calendar's festivals and holidays choose from these
    wiki: wiki,
    // when a text has Go to, and how many verses make a group (js/text/outline.js)
    outline: site.outline,
    // the chanting paces and the time between texts, for how long a text or a session takes (js/core/timing.js, where
    // the app has one: Nitya Upasana)
    timing: site.timing,
    // the language names (मराठी, Marathi), by code
    languages: site.languages,
    texts: facts,
    // every category, those with no texts yet too (the family can move texts into them, js/features/library.js)
    categories: categories,
  };
}

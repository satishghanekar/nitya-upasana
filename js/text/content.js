// @ts-check
// Builds CONTENT, the data js/render.js turns into the reading page, from content/library.json and the text files in
// content/texts/ (read by js/text/format.js). Pure: the files come in as strings, so the unit test
// (tests/unit/content.test.mjs) can prove the result is exactly what the site showed before the texts became files.
//
// What the files leave to the app:
// - the reading order and the piece numbers (१. 1.): content/library.json's categories in order, each with its texts in
//   order, numbered from 1 in each category as the Library lists them;
// - each text's facts (CONTENT.texts): what it is from its own file's header, its category from the library;
// - the language tag (मराठी Marathi), in the menu words (js/strings/, "text");
// - with "refrain: every-verse", the dhrupad label at the top and, after every stanza, the "↻ ध्रुपद" note and
//   the dhrupad again; [once] lines and [note]s before the dhrupad go above it (lead);
// - line ids: the text's "line-ids" prefix and a count of the lines as shown (repeats included);
// - the credit links: [name](address) becomes a link that opens in a new tab, with its label and ↗.

import { parseText, RECORDING, toHtml } from "./format.js";
import { LANGUAGES, pageFor, wikiLabel } from "../core/wiki.js";

// The language the page is in: index.html's <html lang="mr"> (tests/unit/content.test.mjs checks they agree). A text
// in it needs no lang of its own; a Sanskrit or Hindi text carries its own, for screen readers and the fonts.
export const PAGE_LANGUAGE = "mr";

// the scripts the original can be shown in besides its own (js/render.js SCRIPTS): Kannada, Telugu, Gujarati
var SCRIPTS = LANGUAGES.filter(function (l) {
  return l !== "mr" && l !== "hi" && l !== "en";
});

/**
 * @typedef {import("./format.js").Text} Text
 * @typedef {import("./format.js").Pair} Pair
 * @typedef {{ id: string, name: Pair, texts: string[] }} LibraryCategory   a category of content/library.json, its texts
 *   in reading order
 * @typedef {{ categories: LibraryCategory[] }} Library   content/library.json
 * @typedef {{ pages: import("../core/wiki.js").Pages }} Wiki   which page a link opens: content/wiki.json's pages
 * @typedef {{ name: Pair, time?: Pair, wiki?: string }} Credit   a person or a source in content/credits.json
 * @typedef {{ people: Record<string, Credit>, sources: Record<string, Credit> }} Credits   content/credits.json
 * @typedef {{ wiki: Wiki | null, credits: Credits | null, words: ((part: string, lang: string) => any) | null }} Ctx
 *   what a piece is built with besides its file: the Wikipedia pages, the credits, and the menu words in a language
 *   (menuWords(part, lang), given by js/main.js: this file is loaded with the store, before the menu words can be)
 * @typedef {{ id: string, title: string, titleEn: string, language: string, category: string, lines: number,
 *   letters: number }} TextFacts   what a text is (its file's header) and where it stands (the library's category)
 * @typedef {{ l: string, rf?: true, mr: string, en: string }} Line
 * @typedef {{ kind?: string, bold?: true, para?: true, lines?: Line[], rmk?: Pair, nt?: true }} Item
 *   rmk: a small line between blocks: the dhrupad's marker (↻ ध्रुपद), or, with nt, a [note] from the text file (Phalashruti,
 *   ↻ ३ वेळा), which is part of the text and always shown, whatever the dhrupad setting
 * @typedef {{ id: string, text: string, lang?: string, cls?: string, prose?: true, no: Pair, title: Pair, tag: Pair,
 *   lead?: Item[], refrain?: { label: Pair, lines: Pair[] }, items: Item[], credit: string, partName?: Pair }} Piece
 *   lead: what comes before the dhrupad at the top (refrain), [once] lines and [note]s, shown above it
 * @typedef {{ pageLanguage: string, ui: { prev: Pair, next: Pair }, text: Record<string, any>, wiki: Wiki | null,
 *   timing: any, texts: Record<string, TextFacts>, categories: { id: string, name: Pair,
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

// A name that links to the Wikipedia page of the person (or source) it names, opening in a new tab: in the side's own
// language where Wikipedia has one (the original's side: Marathi, then Hindi, then English; a Hindi text's: Hindi
// first; the English side: English), else the nearest there is (js/core/wiki.js). On the original's side it also
// carries the page for each script the original can be shown in (data-kn, data-te, data-gu: "kn https://…", and what is
// heard, data-kn-label), which js/render.js puts in place when Kannada, Telugu or Gujarati letters are chosen.
/**
 * @param {string} name  as shown
 * @param {string | undefined} q  the page it names (content/credits.json "wiki"), or none: no link
 * @param {"mr" | "en"} side
 * @param {Ctx} ctx
 * @param {string} lang  the original's language, which Wikipedia its side tries first ("mr", or "hi" for a Hindi text)
 */
function wikiLink(name, q, side, ctx, lang) {
  if (!q) return esc(name);
  var wiki = ctx.wiki,
    words = ctx.words,
    as = side === "en" ? "en" : lang,
    said = side === "en" ? "en" : "mr",
    page = wiki && pageFor(q, as, wiki.pages),
    attrs = "";
  if (page && wiki && words) {
    attrs = ' hreflang="' + page.lang + '" aria-label="' + esc(wikiLabel(name, page, said, words("wiki", said))) + '"';
    // (the other scripts the original can be shown in: each its own Wikipedia first)
    if (side === "mr")
      SCRIPTS.forEach(function (code) {
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
            esc(wikiLabel("", p2, code, /** @type {any} */ (words)("wiki", code))) +
            '"';
      });
  }
  return (
    '<a href="' +
    esc(page ? page.url : /^Q[0-9]+$/.test(q) ? "https://www.wikidata.org/wiki/" + q : "https://en.wikipedia.org/wiki/" + encodeURIComponent(q)) +
    '" target="_blank" rel="noopener" data-wiki="' +
    q +
    '"' +
    attrs +
    ">" +
    esc(name) +
    '<span class="crx" aria-hidden="true"> ↗</span></a>'
  );
}

/**
 * A text's credit in both its languages, from its header's credit line and content/credits.json (Satish, 2026-11-15:
 * each person and source written once, a text's credit in one line): "रचना : संत नरहरी सोनार (१३ वे शतक)" / "By Sant
 * Narahari Sonar (13th century)", "आदि शंकराचार्य यांचे मानले जाते", a source's name, Traditional; what only the text
 * says in brackets after the name (in place of a person's time); and under it, smaller, the one it is also credited to.
 * The words around the names are the site's (js/strings/, "text"); on the original's side each carries its key
 * (data-tw), so js/render.js puts the language's own words in when Kannada, Telugu or Gujarati letters are chosen.
 * @param {Text} t @param {Ctx} ctx @returns {string}
 */
function creditOf(t, ctx) {
  var lang = t.language === "hi" ? "hi" : "mr",
    c = t.credit;
  /** a person (or, with source, a source) by their key: a key not there stops the build, naming the text
   * @param {string} key @param {"people" | "sources"} group @returns {Credit} */
  var entry = function (key, group) {
    var e = ctx.credits && ctx.credits[group][key];
    if (!e) throw new Error("texts/" + t.id + ".txt: " + key + " is not one of content/credits.json's " + group);
    return e;
  };
  /** @param {"mr" | "en"} side @param {boolean} [note]  the line under it: also credited to */
  function line(side, note) {
    if (!ctx.words || !ctx.credits || !c) return "";
    var W = ctx.words("text", side),
      detail = c.detail ? c.detail[side] : "";
    /** a word of the site's, marked with its key on the original's side @param {string} key @param {string} txt */
    var tw = function (key, txt) {
      return side === "mr" ? '<span data-tw="' + key + '">' + esc(txt) + "</span>" : esc(txt);
    };
    /** a person or a source, linked @param {Credit} e */
    var named = function (e) {
      return wikiLink(e.name[side], e.wiki, side, ctx, lang);
    };
    /** a sentence with a name in it, at {name} @param {string} key @param {string} name */
    var sentence = function (key, name) {
      var at = /** @type {string} */ (W[key]).split("{name}");
      return tw(key + ":0", at[0]) + name + tw(key + ":1", at[1] || "");
    };
    /** the name, then the detail or (a person's own text) their time in brackets @param {Credit} e @param {boolean} time */
    var withDetail = function (e, time) {
      var after = detail ? detail : time && e.time ? e.time[side] : "";
      return named(e) + (after ? " (" + esc(after) + ")" : "");
    };
    if (note) return c.also ? sentence("also", named(entry(c.also, "people"))) : "";
    if (c.role === "traditional") return tw("traditional", W.traditional);
    if (c.role === "source") return withDetail(entry(/** @type {string} */ (c.who), "sources"), false);
    var e = entry(/** @type {string} */ (c.who), "people");
    if (c.role === "author") return tw("by", W.by) + " " + withDetail(e, true);
    if (c.role === "attributed") return sentence("attributed", withDetail(e, false));
    // a compilation: what else it gathers goes on from the name ("संत नामदेव व संस्कृत स्तोत्रे")
    return tw("compiledBy", W.compiledBy) + " " + named(e) + (detail ? " " + esc(detail) : "");
  }
  /** @param {boolean} [note] */
  var both = function (note) {
    return '<span class="mr">' + line("mr", note) + '</span><span class="en" lang="en">' + line("en", note) + "</span>";
  };
  return both() + (c && c.also ? "<small>" + both(true) + "</small>" : "");
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
 * One text as a piece of CONTENT.
 * @param {Text} t
 * @param {number} n  its number in its category, from 1
 * @param {Ctx} [ctx]  the Wikipedia pages, the credits and the site's words (without them, as npm run texts builds a
 *   piece to count its letters: no credit, and no words around the text)
 * @returns {Piece}
 */
export function toPiece(t, n, ctx) {
  var c = ctx || { wiki: null, credits: null, words: null };
  /** the site's words for a text, in a side's language @param {"mr" | "en"} side */
  var W = function (side) {
    return c.words ? c.words("text", side) : { refrainLabel: "", refrainNote: "", lang: {} };
  };
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
  if (t.language !== PAGE_LANGUAGE) p.lang = t.language;
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
  // its language, in the site's words (js/strings/, "text")
  p.tag = { mr: W("mr").lang[t.language] || "", en: W("en").lang[t.language] || "" };
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
      label: { mr: W("mr").refrainLabel, en: W("en").refrainLabel },
      lines: dh.lines.map(function (x) {
        return { mr: toHtml(x.orig), en: toHtml(x.en) };
      }),
    };
    var again = function () {
      items.push({ rmk: { mr: W("mr").refrainNote, en: W("en").refrainNote } });
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
  p.credit = creditOf(t, c) + recordings(t.recording);
  return p;
}

/**
 * CONTENT from the library and the text files.
 * @param {Library} lib  content/library.json: the categories in reading order, each with its texts' ids in order
 * @param {Record<string, string>} files  each text's file, by text id
 * @param {{ wiki?: { pages: import("../core/wiki.js").Pages } | null, credits?: Credits | null,
 *   words?: ((part: string, lang: string) => any) | null, timing?: any }} [more]  content/wiki.json (each page a link
 *   names, its title on each Wikipedia), content/credits.json (who and what the texts come from), the menu words
 *   (menuWords(part, lang): the site's words around a text, "text", and Wikipedia's names, "wiki"), and, where the app
 *   has one, content/timing.json (the chanting paces, read by js/core/timing.js), given by js/text/load.js
 * @returns {Content}
 */
export function buildContent(lib, files, more) {
  var m = more || {},
    words = m.words || null;
  /** @type {Ctx} */
  var ctx = { wiki: m.wiki ? { pages: m.wiki.pages } : null, credits: m.credits || null, words: words };
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
        return toPiece(t, i + 1, ctx);
      }),
    };
  });
  /** the site's words in a side's language @param {string} l */
  var W = function (l) {
    return words ? words("text", l) : {};
  };
  /** @type {Record<string, any>} the site's words in each script the original can be shown in, for js/render.js */
  var text = {};
  SCRIPTS.forEach(function (code) {
    text[code] = W(code);
  });
  return {
    // the language the page is in (index.html's <html lang>): a piece in another carries its own (Piece "lang")
    pageLanguage: PAGE_LANGUAGE,
    // Previous / Next under a text (js/render.js), in its languages
    ui: { prev: { mr: W("mr").prev, en: W("en").prev }, next: { mr: W("mr").next, en: W("en").next } },
    text: text,
    // which Wikipedia page a link opens (js/core/wiki.js): the credits' links are written with theirs, and
    // js/render.js and the Vedic calendar's festivals and holidays choose from these
    wiki: ctx.wiki,
    // the chanting paces and the time between texts, for how long a text or a session takes (js/core/timing.js, where
    // the app has one: Nitya Upasana)
    timing: m.timing || null,
    texts: facts,
    // every category, those with no texts yet too (the family can move texts into them, js/features/library.js)
    categories: categories,
  };
}

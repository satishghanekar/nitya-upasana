// @ts-check
// Builds CONTENT, the data js/render.js turns into the reading page, from content/library.json and the text
// files in content/texts/ (read by js/text/format.js). Pure: the files come in as strings, so the unit test
// (tests/unit/content.test.mjs) can prove the result is exactly what the site showed before the texts became files.
//
// What the files leave to the app:
// - the reading order and the piece numbers (१. 1.): the texts by category, in the order of content/categories.json,
//   each category numbered from 1 as the Library lists them, the texts in their order in library.json;
// - the language tag (मराठी Marathi) from library.json's "languages";
// - with "refrain: every-verse", the dhrupad label at the top and, after every stanza, the "↻ ध्रुपद" note and
//   the dhrupad again (library.json's "refrain"); [once] lines and [note]s before the dhrupad go above it (lead);
// - line ids: the text's "line-ids" prefix and a count of the lines as shown (repeats included);
// - the credit links: [name](address) becomes a link that opens in a new tab, with its label and ↗.

import { parseText, toHtml } from "./format.js";

/**
 * @typedef {import("./format.js").Text} Text
 * @typedef {import("./format.js").Pair} Pair
 * @typedef {{ id: string, file: string, title: string, titleEn: string, category: string, language: string, lines: number }} LibraryText
 * @typedef {{ id: string, name: Pair, order: number }} Category   one entry of content/categories.json
 * @typedef {{ texts: LibraryText[], pageLanguage: string, languages: Record<string, Pair>,
 *   refrain: { label: Pair, note: Pair }, ui: { prev: Pair, next: Pair }, wiki: Record<string, Record<string, string>> }} Library
 * @typedef {{ l: string, rf?: true, mr: string, en: string }} Line
 * @typedef {{ kind?: string, bold?: true, para?: true, lines?: Line[], rmk?: Pair, nt?: true }} Item
 *   rmk: a small line between blocks: the dhrupad's marker (↻ ध्रुपद), or, with nt, a [note] from the text file (Phalashruti,
 *   ↻ ३ वेळा), which is part of the text and always shown, whatever the dhrupad setting
 * @typedef {{ id: string, text: string, lang?: string, cls?: string, prose?: true, no: Pair, title: Pair, tag: Pair,
 *   lead?: Item[], refrain?: { label: Pair, lines: Pair[] }, items: Item[], credit: string }} Piece
 *   lead: what comes before the dhrupad at the top (refrain), [once] lines and [note]s, shown above it
 * @typedef {{ ui: Library["ui"], wiki: Library["wiki"], categories: { id: string, name: Pair, pieces: Piece[] }[] }} Content
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

// A credit line: [name](address) becomes a link that opens in a new tab
/**
 * @param {string} s
 * @param {"mr" | "en"} side
 */
function credit(s, side) {
  var out = "",
    re = /\[([^\]]+)\]\(([^)\s]+)\)/g,
    last = 0,
    m;
  while ((m = re.exec(s))) {
    var label = side === "mr" ? m[1] + " — विकिपीडिया (नवीन टॅबमध्ये उघडेल)" : m[1] + ": Wikipedia (opens in a new tab)";
    out +=
      esc(s.slice(last, m.index)) +
      '<a href="' +
      esc(m[2]) +
      '" target="_blank" rel="noopener" aria-label="' +
      esc(label) +
      '">' +
      esc(m[1]) +
      '<span class="crx" aria-hidden="true"> ↗</span></a>';
    last = re.lastIndex;
  }
  return out + esc(s.slice(last));
}
/**
 * @param {string} [mr]
 * @param {string} [en]
 */
function credits(mr, en) {
  return '<span class="mr">' + credit(mr || "", "mr") + '</span><span class="en" lang="en">' + credit(en || "", "en") + "</span>";
}

/**
 * One text as a piece of CONTENT.
 * @param {Text} t
 * @param {number} n  its number in its category, from 1
 * @param {Library} lib
 * @returns {Piece}
 */
export function toPiece(t, n, lib) {
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
  if (t.layout === "prose") p.prose = true;
  p.no = {
    mr:
      String(n).replace(/[0-9]/g, function (d) {
        return DIGITS[+d];
      }) + ".",
    en: n + ".",
  };
  p.title = { mr: t.title, en: t.titleEn };
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
    // a [note] of the text's own, or [once] lines (shown as a line said once): where they stand, no dhrupad after them
    /** @param {import("./format.js").Block} b @returns {Item} */
    var own = function (b) {
      return b.kind === "note" ? { rmk: pair(/** @type {Pair} */ (b.note)), nt: true } : { kind: "dh", lines: b.lines.map(line) };
    };
    if (lead.length) p.lead = lead.map(own);
    if (t.refrainFirst) again();
    blocks.forEach(function (b) {
      if (b.kind === "note" || b.kind === "once") items.push(own(b));
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
  p.credit = credits(t.credit, t.creditEn) + (t.creditNote || t.creditNoteEn ? "<small>" + credits(t.creditNote, t.creditNoteEn) + "</small>" : "");
  return p;
}

/**
 * CONTENT from the library and the text files.
 * @param {Library} lib  content/library.json
 * @param {Record<string, string>} files  each text's file, by text id
 * @param {Category[] | null} [cats]  content/categories.json (without it, the categories in the order the texts name
 *   them, each called by its id)
 * @returns {Content}
 */
export function buildContent(lib, files, cats) {
  /** @type {Record<string, Text>} */
  var texts = {};
  lib.texts.forEach(function (x) {
    if (typeof files[x.id] !== "string") throw new Error(x.file + ": not loaded");
    var t = parseText(files[x.id], x.file);
    if (t.id !== x.id) throw new Error(x.file + ': its id is "' + t.id + '", library.json says "' + x.id + '"');
    texts[x.id] = t;
  });
  var list = (cats || [])
    .slice()
    .sort(function (a, b) {
      return a.order - b.order;
    })
    .map(function (c) {
      return { id: c.id, name: pair(c.name) };
    });
  lib.texts.forEach(function (x) {
    // a category not in categories.json (tests/unit/content.test.mjs checks there is none) goes last, named by its id
    if (
      !list.some(function (c) {
        return c.id === x.category;
      })
    )
      list.push({ id: x.category, name: { mr: x.category, en: x.category } });
  });
  // every category, those with no texts yet too (the family can move texts into them, js/features/library.js)
  return {
    ui: lib.ui,
    wiki: lib.wiki,
    categories: list.map(function (c) {
      return {
        id: c.id,
        name: c.name,
        pieces: lib.texts
          .filter(function (x) {
            return x.category === c.id;
          })
          .map(function (x, i) {
            return toPiece(texts[x.id], i + 1, lib);
          }),
      };
    }),
  };
}

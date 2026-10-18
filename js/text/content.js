// @ts-check
// Builds CONTENT, the data js/render.js turns into the reading page, from content/library.json and the text
// files in content/texts/ (read by js/text/format.js). Pure: the files come in as strings, so the unit test
// (tests/unit/content.test.mjs) can prove the result is exactly what the site showed before the texts became files.
//
// What the files leave to the app:
// - the piece numbers (१. 1.) come from the order in library.json's groups;
// - the language tag (मराठी Marathi) from library.json's "languages";
// - with "refrain: every-verse", the dhrupad label at the top and, after every stanza, the "↻ ध्रुपद" note and
//   the dhrupad again (library.json's "refrain");
// - line ids: the text's "line-ids" prefix and a count of the lines as shown (repeats included);
// - the credit links: [name](address) becomes a link that opens in a new tab, with its label and ↗.

import { parseText, toHtml } from "./format.js";

/**
 * @typedef {import("./format.js").Text} Text
 * @typedef {import("./format.js").Pair} Pair
 * @typedef {{ id: string, file: string, title: string, titleEn: string, category: string, language: string, lines: number }} LibraryText
 * @typedef {{ id: string, btn: string, name: Pair, texts: string[] }} LibraryGroup
 * @typedef {{ texts: LibraryText[], groups: LibraryGroup[], pageLanguage: string, languages: Record<string, Pair>,
 *   refrain: { label: Pair, note: Pair }, ui: { prev: Pair, next: Pair }, wiki: Record<string, Record<string, string>> }} Library
 * @typedef {{ l: string, rf?: true, mr: string, en: string }} Line
 * @typedef {{ kind?: string, bold?: true, para?: true, lines?: Line[], rmk?: Pair }} Item
 * @typedef {{ id: string, lang?: string, cls?: string, prose?: true, no: Pair, title: Pair, tag: Pair,
 *   refrain?: { label: Pair, lines: Pair[] }, items: Item[], credit: string }} Piece
 * @typedef {{ ui: Library["ui"], wiki: Library["wiki"], groups: { id: string, btn: string, name: Pair, pieces: Piece[] }[] }} Content
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
      '<a href="' + esc(m[2]) + '" target="_blank" rel="noopener" aria-label="' + esc(label) + '">' + esc(m[1]) +
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
 * @param {number} n  its number in its group, from 1
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
  var p = /** @type {any} */ ({ id: t.legacyId || t.id });
  if (t.language !== lib.pageLanguage) p.lang = t.language;
  if (t.refrain === "always") p.cls = "norf";
  if (t.layout === "prose") p.prose = true;
  p.no = { mr: String(n).replace(/[0-9]/g, function (d) { return DIGITS[+d]; }) + ".", en: n + "." };
  p.title = { mr: t.title, en: t.titleEn };
  p.tag = pair(lib.languages[t.language]);
  /** @type {Item[]} */
  var items = [];
  var blocks = t.blocks;
  if (t.refrain === "every-verse") {
    var dh = blocks[0],
      rep = blocks[1] && blocks[1].kind === "dhrupad-repeated" ? blocks[1] : dh;
    blocks = blocks.slice(rep === dh ? 1 : 2);
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
    if (t.refrainFirst) again();
    blocks.forEach(function (b) {
      if (b.kind === "note") items.push({ rmk: pair(/** @type {Pair} */ (b.note)) });
      else {
        items.push(b.para ? { para: true, lines: b.lines.map(line) } : { lines: b.lines.map(line) });
        again();
      }
    });
  } else
    blocks.forEach(function (b) {
      /** @type {Item} */
      var it = {};
      if (b.kind === "note") it.rmk = pair(/** @type {Pair} */ (b.note));
      else {
        if (b.kind === "dhrupad") it.kind = "dh";
        if (b.bold) it.bold = true;
        if (b.para) it.para = true;
        it.lines = b.lines.map(line);
      }
      items.push(it);
    });
  p.items = items;
  p.credit = credits(t.credit, t.creditEn) + (t.creditNote || t.creditNoteEn ? "<small>" + credits(t.creditNote, t.creditNoteEn) + "</small>" : "");
  return p;
}

/**
 * CONTENT from the library and the text files.
 * @param {Library} lib  content/library.json
 * @param {Record<string, string>} files  each text's file, by text id
 * @returns {Content}
 */
export function buildContent(lib, files) {
  /** @type {Record<string, Text>} */
  var texts = {};
  lib.texts.forEach(function (x) {
    if (typeof files[x.id] !== "string") throw new Error(x.file + ": not loaded");
    var t = parseText(files[x.id], x.file);
    if (t.id !== x.id) throw new Error(x.file + ': its id is "' + t.id + '", library.json says "' + x.id + '"');
    texts[x.id] = t;
  });
  return {
    ui: lib.ui,
    wiki: lib.wiki,
    groups: lib.groups.map(function (g) {
      return {
        id: g.id,
        btn: g.btn,
        name: pair(g.name),
        pieces: g.texts.map(function (id, i) {
          if (!texts[id]) throw new Error('library.json: group "' + g.id + '" lists "' + id + '", which is not in its texts');
          return toPiece(texts[id], i + 1, lib);
        }),
      };
    }),
  };
}

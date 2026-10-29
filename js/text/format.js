// @ts-check
// The text file format: one plain-text file per text in content/texts/ (see "How to add a text" in README.md).
// parseText() reads a file into a Text; formatText() writes one back (parseText(formatText(t)) gives t again).
// Pure functions only: no page, no fetch, so the unit tests (tests/unit/format.test.mjs) run them in Node.
//
// A file is a header, a line "---", then blocks separated by blank lines:
//
//   id: aarti-sukhkarta                 header: "name: value", one per line
//   title: सुखकर्ता दुःखहर्ता
//   …
//   ---
//   [dhrupad]                           a block starts with its name in brackets
//   जय देव जय देव, जय मंगल मूर्ती ।       then its lines: the original line,
//   Jai Dev Jai Dev, Jai Mangal Murti |   then its everyday English line
//
// The words are kept exactly as written: nothing is trimmed, normalised or corrected. In a line, "¦" marks a
// place where a long line may break (shown as a zero-width space) and " // " a place where it always breaks
// (shown as a line break); toHtml() makes that change and toMarks() undoes it.

/**
 * @typedef {{ orig: string, en: string, rf: boolean }} TextLine
 *   one line pair as written in the file; rf: after [refrain] in its block (shown as a refrain line)
 * @typedef {{ mr: string, en: string }} Pair
 * @typedef {{ kind: "dhrupad" | "dhrupad-repeated" | "stanza" | "note" | "once", n?: number, para?: boolean, bold?: boolean,
 *   note?: Pair, lines: TextLine[] }} Block
 * @typedef {{
 *   id: string, title: string, titleEn: string, category: string, language: string,
 *   legacyId?: string, lineIds?: string, lineIdExceptions?: Record<string, string>,
 *   refrain: "every-verse" | "always" | "none", refrainFirst?: boolean, layout?: "prose", stanzaNumbers?: "as-written",
 *   credit?: string, creditEn?: string, creditNote?: string, creditNoteEn?: string, source?: string,
 *   blocks: Block[]
 * }} Text
 */

// Header fields: [name in the file, property of Text, required]. Also the order formatText() writes them in.
/** @type {[string, keyof Text, boolean][]} */
const FIELDS = [
  ["id", "id", true],
  ["title", "title", true],
  ["title-en", "titleEn", true],
  ["category", "category", true],
  ["language", "language", true],
  ["legacy-id", "legacyId", false],
  ["line-ids", "lineIds", false],
  ["line-id-exceptions", "lineIdExceptions", false],
  ["refrain", "refrain", false],
  ["refrain-before-first", "refrainFirst", false],
  ["layout", "layout", false],
  ["stanza-numbers", "stanzaNumbers", false],
  ["credit", "credit", false],
  ["credit-en", "creditEn", false],
  ["credit-note", "creditNote", false],
  ["credit-note-en", "creditNoteEn", false],
  ["source", "source", false],
];
export const LANGUAGES = ["mr", "hi", "sa", "te", "kn", "ta"];
const REFRAINS = ["every-verse", "always", "none"];
// Letters of the Indian scripts (Devanagari to Malayalam, Vedic extensions): an original line has at least one,
// an English line none, so a missing or swapped line is caught
const INDIC = /[ऀ-෿᳐-᳿꣠-ꣿ]/;
const ZWSP = "​";

/** "¦" → zero-width space, " // " → <br>, after & < > are written as HTML entities. */
export function toHtml(/** @type {string} */ s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/ \/\/ /g, "<br>")
    .replace(/¦/g, ZWSP);
}
/** The reverse of toHtml(). */
export function toMarks(/** @type {string} */ s) {
  return s.replace(/​/g, "¦").replace(/<br>/g, " // ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

/**
 * @param {string} where
 * @param {string} msg
 */
function fail(where, msg) {
  throw new Error(where + ": " + msg);
}

/**
 * Read one text file.
 * @param {string} raw  the file's contents
 * @param {string} [name]  for error messages (the file name)
 * @returns {Text}
 */
export function parseText(raw, name) {
  var file = name || "text";
  var rows = raw.replace(/^﻿/, "").split(/\r?\n/);
  /** @type {Record<string, any>} */
  var t = { refrain: "none", blocks: [] };
  var i = 0;
  /** @type {Record<string, boolean>} */
  var seen = {};
  for (; i < rows.length && rows[i] !== "---"; i++) {
    var at = file + " line " + (i + 1);
    if (rows[i] === "") continue;
    var m = /^([a-z-]+): (.*)$/.exec(rows[i]);
    if (!m) fail(at, 'expected "name: value" in the header, or "---" to end it');
    var key = /** @type {string} */ (m && m[1]),
      val = /** @type {string} */ (m && m[2]);
    var f = FIELDS.find(function (x) {
      return x[0] === key;
    });
    if (!f) fail(at, 'unknown header field "' + key + '"');
    if (seen[key]) fail(at, '"' + key + '" given twice');
    seen[key] = true;
    var prop = /** @type {[string, keyof Text, boolean]} */ (f)[1];
    if (key === "language" && LANGUAGES.indexOf(val) < 0) fail(at, "language must be one of " + LANGUAGES.join(", "));
    if (key === "refrain" && REFRAINS.indexOf(val) < 0) fail(at, "refrain must be one of " + REFRAINS.join(", "));
    if (key === "layout" && val !== "prose") fail(at, 'layout can only be "prose"');
    if (key === "stanza-numbers" && val !== "as-written") fail(at, 'stanza-numbers can only be "as-written"');
    if (key === "refrain-before-first") {
      if (val !== "yes") fail(at, 'refrain-before-first can only be "yes"');
      t[prop] = true;
    } else if (key === "line-id-exceptions") {
      /** @type {Record<string, string>} */
      var ex = {};
      val.split(", ").forEach(function (p) {
        var q = /^(\S+)=(\S+)$/.exec(p);
        if (!q) fail(at, 'line-id-exceptions is a list like "s7l4=s7l4r, s7l9=s7l9b"');
        else ex[q[1]] = q[2];
      });
      t[prop] = ex;
    } else t[prop] = val;
  }
  if (i >= rows.length) fail(file, 'no "---" line after the header');
  FIELDS.forEach(function (x) {
    if (x[2] && !seen[x[0]]) fail(file, 'header field "' + x[0] + '" is missing');
  });

  /** @type {Block | null} */
  var cur = null;
  var orig = /** @type {string | null} */ (null),
    origAt = 0,
    rf = false,
    stanzas = 0;
  /** @param {number} n */
  function close(n) {
    if (orig !== null) fail(file + " line " + origAt, "an original line with no English line after it");
    if (cur && cur.kind !== "note" && !cur.lines.length) fail(file + " line " + n, "a block with no lines");
  }
  for (i++; i < rows.length; i++) {
    var r = rows[i],
      where = file + " line " + (i + 1);
    if (r === "") {
      close(i);
      cur = null;
      continue;
    }
    var h = /^\[(.*)\]$/.exec(r);
    if (h && h[1] === "refrain") {
      if (!cur || cur.kind === "note" || orig !== null) fail(where, "[refrain] goes inside a block, between line pairs");
      rf = true;
      continue;
    }
    if (h) {
      close(i);
      var b = h[1],
        s;
      rf = false;
      if (b === "dhrupad") cur = { kind: "dhrupad", lines: [] };
      else if (b === "dhrupad bold") cur = { kind: "dhrupad", bold: true, lines: [] };
      else if (b === "dhrupad repeated") cur = { kind: "dhrupad-repeated", lines: [] };
      else if (b === "once") cur = { kind: "once", lines: [] };
      else if ((s = /^(para )?([1-9][0-9]*)$/.exec(b))) {
        stanzas++;
        if (+s[2] !== stanzas) fail(where, "stanza [" + s[2] + "] should be [" + stanzas + "]");
        cur = { kind: "stanza", n: stanzas, lines: [] };
        if (s[1]) cur.para = true;
      } else if ((s = /^note: (.+) \| (.+)$/.exec(b))) cur = { kind: "note", note: { mr: s[1], en: s[2] }, lines: [] };
      else fail(where, 'unknown block "[' + b + ']"');
      t.blocks.push(cur);
      continue;
    }
    if (!cur) fail(where, "a line outside a block (a block starts with a name in brackets, like [1])");
    else if (cur.kind === "note") fail(where, "a [note] block has no lines");
    else if (orig === null) {
      if (!INDIC.test(r)) fail(where, "expected an original line (in an Indian script) here");
      orig = r;
      origAt = i + 1;
    } else {
      if (INDIC.test(r)) fail(where, "expected the everyday English line here");
      cur.lines.push({ orig: orig, en: r, rf: rf });
      orig = null;
    }
  }
  close(rows.length);

  // How the blocks fit the refrain pattern
  /** @type {Block[]} */
  var bl = t.blocks;
  // with refrain: every-verse, the dhrupad is the first block that is not [once] lines or a [note]
  var d = 0;
  if (t.refrain === "every-verse") while (bl[d] && (bl[d].kind === "once" || bl[d].kind === "note")) d++;
  bl.forEach(function (b, k) {
    if (b.kind === "dhrupad-repeated" && !(t.refrain === "every-verse" && k === d + 1))
      fail(file, "[dhrupad repeated] comes right after the [dhrupad] of a text with refrain: every-verse");
  });
  if (t.refrain === "every-verse") {
    if (!bl[d] || bl[d].kind !== "dhrupad" || bl[d].bold)
      fail(file, "refrain: every-verse needs a [dhrupad] block first (only [once] lines and [note]s may come before it)");
    bl.slice(d + 1).forEach(function (b) {
      if (b.kind === "dhrupad") fail(file, "refrain: every-verse has one [dhrupad] block, the first");
    });
    bl.slice(d, d + 2).forEach(function (b) {
      if (
        b.lines.some(function (l) {
          return l.rf;
        })
      )
        fail(file, "the [dhrupad] of refrain: every-verse is all refrain: no [refrain] inside it");
    });
    if (bl[d + 1] && bl[d + 1].kind === "dhrupad-repeated" && bl[d + 1].lines.length !== bl[d].lines.length)
      fail(file, "[dhrupad repeated] needs as many lines as [dhrupad]");
  } else if (t.refrainFirst) fail(file, "refrain-before-first needs refrain: every-verse");
  return /** @type {Text} */ (t);
}

/**
 * Write a text back as a file (the reverse of parseText).
 * @param {Text} t
 * @returns {string}
 */
export function formatText(t) {
  /** @type {Record<string, any>} */
  var o = t;
  var out = [];
  FIELDS.forEach(function (f) {
    var v = o[f[1]];
    if (v === undefined || (f[0] === "refrain" && v === "none")) return;
    if (f[0] === "refrain-before-first") v = "yes";
    if (f[0] === "line-id-exceptions")
      v = Object.keys(v)
        .map(function (k) {
          return k + "=" + v[k];
        })
        .join(", ");
    out.push(f[0] + ": " + v);
  });
  out.push("---");
  t.blocks.forEach(function (b, k) {
    if (k) out.push("");
    if (b.kind === "dhrupad") out.push(b.bold ? "[dhrupad bold]" : "[dhrupad]");
    else if (b.kind === "dhrupad-repeated") out.push("[dhrupad repeated]");
    else if (b.kind === "once") out.push("[once]");
    else if (b.kind === "note") out.push("[note: " + (b.note && b.note.mr) + " | " + (b.note && b.note.en) + "]");
    else out.push("[" + (b.para ? "para " : "") + b.n + "]");
    var inRf = false;
    b.lines.forEach(function (l) {
      if (l.rf && !inRf) out.push("[refrain]");
      if (!l.rf && inRf) throw new Error(t.id + ": a refrain line can only be followed by refrain lines in its block");
      inRf = l.rf;
      out.push(l.orig, l.en);
    });
  });
  return out.join("\n") + "\n";
}

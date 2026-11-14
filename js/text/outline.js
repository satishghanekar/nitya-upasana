// @ts-check
// A text's outline: the places a reader can go to in it (Go to, the top bar's "where", js/features/where.js), worked out
// from what the text file already has, so a new text gets them by its own structure and nothing here names a text
// (Satish 2026-11-14: "anything long running", one design and not a patch):
//   - its headings, the [note]s that are not a ↻ repeat (Pavamana's adhyayas, the Vishnu Sahasranama's bhagas);
//   - its parts, the [para] blocks (Pavamana's suktas by their Rigveda reference, ९.४७; Shree Rudra's anuvakas, named by
//     the file's part-name and counted from 1 in each heading);
//   - its verses, by the number written in the text (stanza-numbers: as-written, a reference) or else counted, and, where
//     a heading has more of them than a few screens hold, in groups (Lalita's १०१–१२५).
// A text shorter than OUTLINE.minLines has none. Pure functions only: no page, so the unit tests run them in Node
// (tests/unit/outline.test.mjs keeps every text's outline as a snapshot).

/**
 * @typedef {import("./content.js").Piece} Piece
 * @typedef {import("./content.js").Item} Item
 * @typedef {import("./format.js").Pair} Pair
 * @typedef {{ key: string, kind: "text" | "section" | "part" | "group", label: Pair, short?: Pair, piece: string,
 *   line: string, kids?: Place[] }} Place
 *   key: stable within its text ("s3", "s3.p47", "s4.g101"): for links and to keep the reader's place; short: a part's
 *   number alone, for a grid of them ("५" where the label is "अनुवाकः ५"); line: the id of the line it starts at (data-l
 *   on the page)
 * @typedef {{ n: Pair, line: string, sec: string }} Verse   a verse's number as written, and the heading it is under
 * @typedef {{ piece: string, places: Place[], verses: Verse[] }} Outline
 */

// When a text has an outline, and how big a group of verses is (content/library.json "outline" can set both)
export const OUTLINE = { minLines: 60, group: 25 };

const DIGITS = "०१२३४५६७८९";

/** Devanagari digits as numbers, and back @param {string} s */
export function arabic(s) {
  return s.replace(/[०-९]/g, function (d) {
    return String(DIGITS.indexOf(d));
  });
}
/** @param {number | string} n */
function deva(n) {
  return String(n).replace(/[0-9]/g, function (d) {
    return DIGITS[+d];
  });
}
/** @param {number | string} n @returns {Pair} */
function num(n) {
  return { mr: deva(n), en: String(n) };
}

// A number written at the end of a line: "॥ १०८ ॥", "॥ ९.०४७.०१ ॥", "|| 108 ||"
const WRITTEN = /॥\s*([०-९0-9]+(?:\.[०-९0-9]+)*)\s*॥\s*$/;

/** The number written at the end of a stanza's lines, if any @param {Item} it @returns {string | null} */
function written(it) {
  var ls = it.lines || [];
  for (var i = ls.length - 1; i >= 0; i--) {
    var m = WRITTEN.exec(ls[i].mr.replace(/<[^>]*>/g, ""));
    if (m) return arabic(m[1]);
  }
  return null;
}

/** "9.047.01" → "9.47": a reference's hymn; a plain number stays as it is @param {string} r */
function hymnOf(r) {
  var p = r.split(".");
  return p.length > 1 ? p[0] + "." + String(+p[1]) : String(+p[0]);
}

/** A stanza of the text, not a line said once, the dhrupad, its marker or a note @param {Item} it */
function isStanza(it) {
  return !!(it.lines && it.lines.length && !it.kind);
}
/** A heading of the text's own: a [note] that is not a "↻ 3 times" @param {Item} it */
function isHeading(it) {
  return !!(it.nt && it.rmk && it.rmk.mr.trim().charAt(0) !== "↻");
}

/**
 * The outline of one text, or null when it is too short to need one.
 * @param {Piece & { partName?: Pair }} p
 * @param {{ minLines?: number, group?: number }} [opt]
 * @returns {Outline | null}
 */
export function outline(p, opt) {
  var min = (opt && opt.minLines) || OUTLINE.minLines,
    size = (opt && opt.group) || OUTLINE.group,
    items = p.items || [],
    lines = 0;
  items.forEach(function (it) {
    if (it.lines && it.kind !== "rf") lines += it.lines.length;
  });
  if (lines < min) return null;

  // the text in runs, one per heading (a first run with no heading when the text starts without one)
  /** @typedef {{ label: Pair | null, line: string, stanzas: Item[] }} Run */
  /** @type {Run[]} */
  var runs = [];
  /** @type {Run | null} */
  var run = null;
  items.forEach(function (it) {
    if (isHeading(it)) {
      run = { label: /** @type {Pair} */ (it.rmk), line: "", stanzas: [] };
      runs.push(run);
      return;
    }
    if (!it.lines || !it.lines.length || it.kind === "rf") return;
    if (!run) {
      run = { label: null, line: "", stanzas: [] };
      runs.push(run);
    }
    if (!run.line) run.line = it.lines[0].l;
    if (isStanza(it)) run.stanzas.push(it);
  });
  runs = runs.filter(function (r) {
    return r.line;
  });

  /** @type {Verse[]} */
  var verses = [];
  var counted = 0;
  /** @type {Place[]} */
  var places = [];
  runs.forEach(function (r, ri) {
    var sk = r.label ? "s" + (ri + 1) : "s0";
    /** @type {Place[]} */
    var kids = [];
    var parts = r.stanzas.filter(function (s) {
      return s.para;
    });
    r.stanzas.forEach(function (s) {
      counted++;
      var w = written(s);
      verses.push({ n: num(w || counted), line: /** @type {Line[]} */ (s.lines)[0].l, sec: sk });
    });
    if (parts.length > 1) {
      // parts: by the reference they start with (९.४७), or the file's part-name and their count in this heading
      parts.forEach(function (s, i) {
        var w = written(s),
          ref = w && w.indexOf(".") > 0 ? hymnOf(w) : null,
          label = ref ? num(ref) : p.partName ? { mr: p.partName.mr + " " + deva(i + 1), en: p.partName.en + " " + (i + 1) } : num(i + 1);
        /** @type {Place} */
        var part = { key: sk + ".p" + (ref || i + 1), kind: "part", label: label, piece: p.id, line: /** @type {Line[]} */ (s.lines)[0].l };
        if (!ref && p.partName) part.short = num(i + 1);
        kids.push(part);
      });
    } else if (r.stanzas.length > size * 1.5) {
      // a long run of verses: in groups, each named by its first and last verse as written
      var vs = verses.filter(function (v) {
        return v.sec === sk;
      });
      for (var g = 0; g < vs.length; g += size) {
        var a = vs[g],
          b = vs[Math.min(g + size, vs.length) - 1];
        kids.push({
          key: sk + ".g" + a.n.en,
          kind: "group",
          label: { mr: a.n.mr + "–" + b.n.mr, en: a.n.en + "–" + b.n.en },
          piece: p.id,
          line: a.line,
        });
      }
    }
    if (r.label) {
      /** @type {Place} */
      var sec = { key: sk, kind: "section", label: r.label, piece: p.id, line: r.line };
      if (kids.length) sec.kids = kids;
      places.push(sec);
    } else places = places.concat(kids);
  });
  if (!places.length) return null;
  return { piece: p.id, places: places, verses: verses };
}

/** @typedef {import("./content.js").Line} Line */

/**
 * A session's outline: its texts in order, each with its own places under it.
 * @param {{ id: string, title: Pair, line: string }[]} texts  the session's pieces: id, title, first line
 * @param {Record<string, Outline | null>} outlines  each text's outline, by piece id
 * @returns {Place[]}
 */
export function sessionOutline(texts, outlines) {
  return texts.map(function (t) {
    /** @type {Place} */
    var pl = { key: t.id, kind: "text", label: t.title, piece: t.id, line: t.line },
      o = outlines[t.id];
    if (o) pl.kids = o.places;
    return pl;
  });
}

/**
 * Where a position is: the path of places that start at or above it, outermost first. `top` gives where a line starts
 * on the page (its distance down the page, or null when it is not on it, folded away say); `y` is the reading line.
 * @param {Place[]} places
 * @param {(line: string) => number | null} top
 * @param {number} y
 * @returns {Place[]}
 */
export function placeAt(places, top, y) {
  /** @type {Place[]} */
  var path = [],
    level = places;
  while (level && level.length) {
    /** @type {Place | null} */
    var hit = null;
    for (var i = 0; i < level.length; i++) {
      var t = top(level[i].line);
      if (t === null) continue;
      if (t <= y) hit = level[i];
      else break;
    }
    if (!hit) break;
    path.push(hit);
    level = hit.kids || [];
  }
  return path;
}

/**
 * The verse a position is in, among the verses under one heading (or all, sec undefined), as for placeAt.
 * @param {Verse[]} verses
 * @param {(line: string) => number | null} top
 * @param {number} y
 * @param {string} [sec]
 * @returns {Verse | null}
 */
export function verseAt(verses, top, y, sec) {
  /** @type {Verse | null} */
  var hit = null;
  for (var i = 0; i < verses.length; i++) {
    var v = verses[i];
    if (sec !== undefined && v.sec !== sec) continue;
    var t = top(v.line);
    if (t === null) continue;
    if (t <= y) hit = v;
    else break;
  }
  return hit;
}

/**
 * A verse by the number the reader typed (in Devanagari or Western digits), under the heading they are in first, then
 * anywhere in the text.
 * @param {Verse[]} verses
 * @param {string} typed
 * @param {string} [sec]
 * @returns {Verse | null}
 */
export function verseByNumber(verses, typed, sec) {
  var n = arabic(String(typed))
    .trim()
    .replace(/^0+(?=\d)/, "");
  if (!n) return null;
  /** @param {Verse} v */
  function is(v) {
    return v.n.en === n || hymnOf(v.n.en) === n;
  }
  return (
    verses.filter(function (v) {
      return v.sec === sec && is(v);
    })[0] ||
    verses.filter(is)[0] ||
    null
  );
}

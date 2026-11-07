// @ts-check
// Following the chanting: where in the texts the words the chanting model heard (js/core/hearing.js) are. Pure
// functions, no page, so the unit tests (tests/unit/follow.test.mjs) check them in Node.
// - letters(): a line, or what the model heard, as only the letters that are said: the same rules as the model's own
//   labels (shravan-model, shravan/labels.py plain()), with the spaces taken out too, since the model and the book
//   split words differently where they join (sandhi);
// - a text is its lines' letters end to end (makeDoc), and what was heard is found in it allowing for mistakes: the
//   stretch of the text it differs least from, counted in letters added, dropped or changed (match(), an edit
//   distance free to start and end anywhere in the text). The chanting is at that stretch's end: the line it ends in;
// - locate(): near the place last found first (following), then the whole text, then every text (lost), each a
//   little stricter, as the model's own tests measured (shravan-model, scripts/follow.py).
// No init(): nothing here touches the page.

// Svara and other Vedic marks, the four in the Devanagari block and the Vedic Extensions block
var VEDIC_MARKS = /[॑-॔᳐-᳿]/g;
// A verse number between dandas, whole (॥ १० ॥) or in parts (॥ ९.००१.०१ ॥), the closing danda sometimes missing
var VERSE_NUMBER = /[॥।|]+\s*[०-९0-9]+(?:\.[०-९0-9]+)*\s*(?:[॥।|]+)?/g;
// Everything that is not a said Devanagari letter or sign: digits, dandas, avagraha, other scripts, marks, spaces
var NOT_SAID = /[^ऀ-ॣॱ-ॿ]|ऽ/g;

/** The letters that are said, with nothing between them: a line of a text (its HTML tags and entities left out) or
 * what the model heard @param {string} line @returns {string} */
export function letters(line) {
  return line
    .replace(/<[^>]*>/g, " ")
    .replace(/&[#a-z0-9]+;/gi, " ")
    .normalize("NFC")
    .replace(VERSE_NUMBER, " ")
    .replace(VEDIC_MARKS, "")
    .replace(NOT_SAID, "");
}

/** A text to search: its lines' letters end to end; `ends[i]` is where line i's letters end, `refrain[i]` whether it
 * is the dhrupad (said again and again, so it never tells where the chanting is)
 * @typedef {{ text: string, ends: number[], refrain: boolean[] }} Doc */

/** @param {{ text: string, refrain?: boolean }[]} lines @returns {Doc} */
export function makeDoc(lines) {
  var text = "",
    /** @type {number[]} */ ends = [],
    /** @type {boolean[]} */ refrain = [];
  lines.forEach(function (l) {
    text += letters(l.text);
    ends.push(text.length);
    refrain.push(!!l.refrain);
  });
  return { text: text, ends: ends, refrain: refrain };
}

/** A piece's lines (CONTENT, js/text/content.js) in the order the page shows them, which is the order of its
 * `.verse .mr p` (js/render.js): what comes before the dhrupad, the dhrupad at the top, then the text with the
 * dhrupad again after each stanza. The dhrupad's lines are marked as such.
 * @param {any} p @returns {{ text: string, refrain: boolean }[]} */
export function pieceLines(p) {
  /** @type {{ text: string, refrain: boolean }[]} */ var out = [];
  /** @param {any[] | undefined} items */
  function items(items) {
    (items || []).forEach(function (it) {
      (it.lines || []).forEach(function (/** @type {any} */ l) {
        out.push({ text: l.mr, refrain: !!l.rf });
      });
    });
  }
  items(p.lead);
  if (p.refrain)
    p.refrain.lines.forEach(function (/** @type {any} */ l) {
      out.push({ text: l.mr, refrain: true });
    });
  items(p.items);
  return out;
}

/** The line a letter is in @param {Doc} doc @param {number} at  the letter's place in doc.text @returns {number} */
export function lineAt(doc, at) {
  var lo = 0,
    hi = doc.ends.length - 1;
  while (lo < hi) {
    var mid = (lo + hi) >> 1;
    if (doc.ends[mid] > at) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** Where the stretch of text[from, to) closest to `heard` ends, and how many letters it differs by: the edit distance
 * with the start and the end free (Sellers' algorithm), on the earliest best end
 * @param {string} heard  letters() of what was heard @param {string} text @param {number} [from] @param {number} [to]
 * @returns {{ end: number, cost: number }}  end: the place in `text` just after the stretch's last letter */
export function match(heard, text, from, to) {
  var a = Math.max(0, from || 0),
    b = Math.min(text.length, to === undefined ? text.length : to),
    n = b - a,
    m = heard.length,
    prev = new Int32Array(n + 1),
    next = new Int32Array(n + 1);
  for (var i = 1; i <= m; i++) {
    var h = heard.charCodeAt(i - 1);
    next[0] = i;
    for (var j = 1; j <= n; j++) {
      var d = prev[j - 1] + (text.charCodeAt(a + j - 1) === h ? 0 : 1),
        up = prev[j] + 1,
        left = next[j - 1] + 1;
      next[j] = d < up ? (d < left ? d : left) : up < left ? up : left;
    }
    var t = prev;
    prev = next;
    next = t;
  }
  var best = m,
    end = a;
  for (var k = 1; k <= n; k++)
    if (prev[k] < best) {
      best = prev[k];
      end = a + k;
    }
  return { end: end, cost: best };
}

// The fewest letters heard worth searching for (less is a word or two, or the model's guess at silence)
export var LEAST = 10;
// How far ahead of the place last found the chanting is looked for first, in letters (about 30 seconds of chanting)
var AHEAD = 400;
// The most letters wrong, for each letter heard, to believe a place: near the last place, in its text, anywhere
var NEAR = 0.4,
  TEXT = 0.35,
  ANY = 0.3;

/** Where the chanting is
 * @param {string} heard  what the model wrote
 * @param {Doc[]} docs  the texts that may be chanted (the one being read, the session's, the Library's)
 * @param {{ doc: number, line: number } | null} here  the place last found, if any
 * @returns {{ doc: number, line: number, scope: "near" | "text" | "any", held: boolean, rate: number } | null}
 *   held: the place stays where it was, as what was heard is the dhrupad */
export function locate(heard, docs, here) {
  var h = letters(heard);
  if (h.length < LEAST) return null;
  /** @param {number} k @param {number} from @param {number} to @param {number} most @param {"near" | "text" | "any"} scope */
  function look(k, from, to, most, scope) {
    var doc = docs[k],
      r = match(h, doc.text, from, to),
      rate = r.cost / h.length;
    if (rate > most || r.end <= from) return null;
    var line = lineAt(doc, r.end - 1);
    if (doc.refrain[line] && here) return { doc: here.doc, line: here.line, scope: scope, held: true, rate: rate };
    return { doc: k, line: line, scope: scope, held: false, rate: rate };
  }
  if (here && docs[here.doc]) {
    var d = docs[here.doc],
      start = d.ends[here.line - 2] || 0,
      near = look(here.doc, start, d.ends[here.line] + AHEAD, NEAR, "near");
    if (near) return near;
    var whole = look(here.doc, 0, d.text.length, TEXT, "text");
    if (whole) return whole;
  }
  /** @type {ReturnType<typeof locate>} */ var best = null;
  for (var k = 0; k < docs.length; k++) {
    var r = look(k, 0, docs[k].text.length, ANY, "any");
    if (r && (!best || r.rate < best.rate)) best = r;
  }
  return best;
}

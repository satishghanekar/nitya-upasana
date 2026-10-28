// @ts-check
// Search across the whole library: the rules, without the page.
// - Texts are found by their title (Marathi, English, and the scholarly spelling of the Marathi one), their id
//   ("sukhkarta", "jai-ganesh-deva") and their category's name. They rank first, so a title found is a tap away; what is
//   found only inside a text (its first line too) is listed under its lines.
// - Lines are found in the original (svara marks and punctuation ignored) and in both English spellings.
// - Spellings people type still match ("sukhakarta" = "sukhkarta", "vithal" = "vitthal", "chi" = "ci"), Devanagari
//   typed is also matched through its English letters ("सुखकर्ता" finds the text whose id is aarti-sukhkarta), and a typo
//   is forgiven: one wrong letter per four typed.
// Pure: js/text/search.js gives it the texts and lines from the page and shows the results; the unit test
// (tests/unit/search.test.mjs) gives it the text files and checks the ranking.

/**
 * @typedef {(s: string) => string} Fn
 * @typedef {{ id: string, name?: string, sec: string, title: string, titleEn: string, categories: string[] }} TextIn
 *   name: the id without its category (sukhkarta, of aarti-sukhkarta), found as the id is; sec: the reading page's
 *   section id (a1); categories: the names of its category (Marathi, English)
 * @typedef {{ id: string, sec: string, text: string, m: string, e: string, extra?: string }} LineIn
 *   id: the line id (s1l3); text: its text's id; m: the original line; e: its English as shown; extra: more English
 *   to search but not show (the everyday spelling while the scholarly one is shown)
 * @typedef {{ t: TextIn, names: string[], latin: string[], loose: string[], cats: string[],
 *   words: string[] }} TextKey
 * @typedef {{ l: LineIn, t: string, lo: string, words: string[] }} LineKey
 * @typedef {{ texts: TextKey[], lines: LineKey[], roman: Fn | null, from: Fn | null }} Index
 * @typedef {{ kind: "text", id: string, sec: string, score: number }} TextHit
 * @typedef {{ kind: "line", id: string, sec: string, text: string, m: string, e: string, score: number }} LineHit
 * @typedef {{ texts: TextHit[], lines: LineHit[], more: boolean }} Found
 */

// The score of each kind of match: a higher one is listed first; equal ones keep reading order.
export const SCORE = {
  title: 1000, // the whole query is a title or the id
  titleStart: 900, // a title or the id starts with it
  titleWords: 800, // every word typed starts a word of a title or the id
  titleIn: 700, // every word typed is inside a title or the id
  titleLoose: 650, // the same, spelt loosely (or Devanagari typed, matched through its English letters)
  category: 500, // its category's name
  titleTypo: 400, // a title, with a typo forgiven
  phrase: 300, // a line holding the words as typed, together
  line: 250, // a line holding every word typed
  lineLoose: 200, // the same, spelt loosely
  lineTypo: 100, // the same, with a typo forgiven
};
export const LIMIT = 40;

/**
 * The form both the query and the text are compared in: Kannada letters back to Devanagari (from), IAST letters
 * as plain ones (ā → a, ṣ → s), svara marks, joiners and break marks dropped, punctuation as spaces, lower case.
 * @param {string} s
 * @param {Fn | null} [from]
 */
export function fold(s, from) {
  return (from ? from(s) : s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[​‌‍॒॑᳚¦]/g, "")
    .replace(/[।॥|,.\-–—_'"‘’“”!?;:()[\]/\\]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A forgiving form of English letters, so the spellings people type still match: ch = c (IAST च), sh = s (श ष),
 * dny = jn (ज्ञ: Dnyaneshwar = Jñāneśvar), w = v, ee = i, oo = u, double letters count once (vitthal = vithal), and
 * the short "a" between consonants or at a word's end is ignored (ganapati = ganpati, sukhakarta = sukhkarta,
 * jagadish = jagdish). Devanagari is left alone.
 * @param {string} s  folded
 */
export function loose(s) {
  return s
    .replace(/dny/g, "jn")
    .replace(/ch/g, "c")
    .replace(/sh/g, "s")
    .replace(/w/g, "v")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/([bcdfghjklmnpqrstvwxyz])a(?=[bcdfghjklmnpqrstvwxyz])/g, "$1")
    .replace(/([bcdfghjklmnpqrstvwxyz])a\b/g, "$1");
}

/** @param {string} s */
export function hasDeva(s) {
  return /[ऀ-ॿ]/.test(s);
}

/**
 * Edit distance (letters added, dropped or changed), counting no further than max: anything beyond is max + 1
 * @param {string} a
 * @param {string} b
 * @param {number} max
 */
export function distance(a, b, max) {
  var A = Array.from(a),
    B = Array.from(b);
  if (Math.abs(A.length - B.length) > max) return max + 1;
  var prev = [],
    i,
    j;
  for (j = 0; j <= B.length; j++) prev[j] = j;
  for (i = 1; i <= A.length; i++) {
    var row = [i],
      low = i;
    for (j = 1; j <= B.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
      if (row[j] < low) low = row[j];
    }
    if (low > max) return max + 1;
    prev = row;
  }
  return prev[B.length];
}

/**
 * How many typos a word typed may have: one per four letters (none below four)
 * @param {string} w
 */
export function typos(w) {
  return Math.floor(Array.from(w).length / 4);
}

/**
 * Does a typed word match a word of the text, allowing its typos? (The text's word may run on: "vitthl" in
 * "vitthalachi".)
 * @param {string} tok
 * @param {string} word
 */
export function near(tok, word) {
  var k = typos(tok);
  if (!k) return false;
  var n = Array.from(tok).length;
  return distance(tok, word, k) <= k || distance(tok, Array.from(word).slice(0, n).join(""), k) <= k;
}

/** @param {string} s */
function words(s) {
  return s.split(" ").filter(Boolean);
}
/** @param {string} key @param {string} tok */
function startsWord(key, tok) {
  return key.indexOf(tok) === 0 || key.indexOf(" " + tok) >= 0;
}
/** @param {string[]} toks @param {string} key */
function allIn(toks, key) {
  return toks.every(function (t) {
    return key.indexOf(t) >= 0;
  });
}

/**
 * Build the index, once (and again when the script, English spelling or categories change)
 * @param {{ texts: TextIn[], lines: LineIn[], roman?: Fn | null, from?: Fn | null }} o
 *   roman: Devanagari → English letters (js/text/iast.js IA); from: Kannada letters → Devanagari (SCR.from)
 * @returns {Index}
 */
export function buildIndex(o) {
  var roman = o.roman || null,
    from = o.from || null;
  /** @param {string} s */
  function f(s) {
    return fold(s, from);
  }
  /** @param {string} s */
  function r(s) {
    return roman && hasDeva(f(s)) ? f(roman(f(s))) : "";
  }
  return {
    roman: roman,
    from: from,
    texts: o.texts.map(function (t) {
      var latin = [f(t.id), t.name ? f(t.name) : "", f(t.titleEn), r(t.title)].filter(Boolean),
        names = [f(t.title)].concat(latin);
      return {
        t: t,
        names: names,
        latin: latin,
        loose: latin.map(loose),
        cats: t.categories.map(f),
        words: names.join(" ").split(" ").concat(latin.map(loose).join(" ").split(" ")).filter(Boolean),
      };
    }),
    lines: o.lines.map(function (l) {
      var m = f(l.m),
        e = f(l.e + (l.extra ? " " + l.extra : "")),
        t = m + " " + e,
        lo = loose(e) + " " + loose(r(l.m));
      return { l: l, t: t, lo: lo, words: words(t).concat(words(lo)) };
    }),
  };
}

/**
 * The query, folded: its words, their loose forms, and (when Devanagari was typed) its English letters' loose words
 * @param {Index} ix
 * @param {string} q
 */
export function prepare(ix, q) {
  var p = fold(q, ix.from),
    toks = words(p),
    ro = ix.roman && hasDeva(p) ? fold(ix.roman(p)) : "",
    rtoks = words(loose(ro));
  return { phrase: p, toks: toks, lo: toks.map(loose), ro: loose(ro), rtoks: rtoks };
}

/**
 * Search. Texts first (every text that matches), then up to LIMIT lines, each list best first.
 * @param {Index} ix
 * @param {string} q
 * @param {{ limit?: number }} [opt]
 * @returns {Found}
 */
export function search(ix, q, opt) {
  var limit = (opt && opt.limit) || LIMIT,
    Q = prepare(ix, q);
  if (Array.from(Q.phrase.replace(/ /g, "")).length < 2) return { texts: [], lines: [], more: false };
  /** @type {TextHit[]} */
  var texts = [];
  ix.texts.forEach(function (k, i) {
    var s = textScore(k, Q);
    if (s) texts.push(/** @type {any} */ ({ kind: "text", id: k.t.id, sec: k.t.sec, score: s, _i: i }));
  });
  sortHits(texts);
  /** @type {LineHit[]} */
  var lines = [];
  ix.lines.forEach(function (k, i) {
    var s = lineScore(k, Q, false);
    if (s) lines.push(lineHit(k, s, i));
  });
  // typos are forgiven only while there is room for more lines
  if (lines.length < limit)
    ix.lines.forEach(function (k, i) {
      if (lines.length >= limit * 2) return;
      if (lineScore(k, Q, false)) return;
      var s = lineScore(k, Q, true);
      if (s) lines.push(lineHit(k, s, i));
    });
  sortHits(lines);
  var more = lines.length > limit;
  return { texts: texts.map(clean), lines: lines.slice(0, limit).map(clean), more: more };
}

/** @param {any} h */
function clean(h) {
  delete h._i;
  return h;
}
/** @param {any[]} a */
function sortHits(a) {
  a.sort(function (x, y) {
    return y.score - x.score || x._i - y._i;
  });
}
/** @param {LineKey} k @param {number} s @param {number} i @returns {LineHit} */
function lineHit(k, s, i) {
  return /** @type {any} */ ({ kind: "line", id: k.l.id, sec: k.l.sec, text: k.l.text, m: k.l.m, e: k.l.e, score: s, _i: i });
}

/**
 * @param {TextKey} k
 * @param {ReturnType<typeof prepare>} Q
 */
export function textScore(k, Q) {
  var best = 0,
    i;
  for (i = 0; i < k.names.length; i++) {
    var n = k.names[i],
      s = n === Q.phrase
        ? SCORE.title
        : n.indexOf(Q.phrase) === 0
          ? SCORE.titleStart
          : Q.toks.every(function (t) {
                return startsWord(n, t);
              })
            ? SCORE.titleWords
            : allIn(Q.toks, n)
              ? SCORE.titleIn
              : 0;
    if (s > best) best = s;
  }
  if (best) return best;
  for (i = 0; i < k.loose.length; i++) {
    var lk = k.loose[i];
    // Devanagari typed, and its English letters are the whole title or id: as good as the title itself
    if (Q.ro && lk === Q.ro) return SCORE.titleStart;
    if ((Q.lo.length && allIn(Q.lo, lk)) || (Q.rtoks.length && allIn(Q.rtoks, lk))) return SCORE.titleLoose;
  }
  for (i = 0; i < k.cats.length; i++) {
    var c = k.cats[i];
    if (
      Q.toks.every(function (t) {
        return startsWord(c, t);
      })
    )
      return SCORE.category;
  }
  if (
    Q.toks.every(function (t, j) {
      return k.words.some(function (w) {
        return w.indexOf(t) >= 0 || near(t, w) || near(Q.lo[j], w);
      });
    })
  )
    return SCORE.titleTypo;
  return 0;
}

/**
 * @param {LineKey} k
 * @param {ReturnType<typeof prepare>} Q
 * @param {boolean} typo
 */
export function lineScore(k, Q, typo) {
  if (!typo) {
    if (k.t.indexOf(Q.phrase) >= 0) return SCORE.phrase;
    if (allIn(Q.toks, k.t)) return SCORE.line;
    if ((Q.lo.length && allIn(Q.lo, k.lo)) || (Q.rtoks.length && allIn(Q.rtoks, k.lo))) return SCORE.lineLoose;
    return 0;
  }
  return Q.toks.every(function (t, j) {
    return k.words.some(function (w) {
      return w.indexOf(t) >= 0 || w.indexOf(Q.lo[j]) >= 0 || near(t, w) || near(Q.lo[j], w);
    });
  })
    ? SCORE.lineTypo
    : 0;
}

/**
 * Should this word of a result be marked (shown in bold) for the query?
 * @param {Index} ix
 * @param {string} word  as shown
 * @param {string} q
 */
export function marks(ix, word, q) {
  var Q = prepare(ix, q),
    w = fold(word, ix.from);
  if (!w) return false;
  var lw = loose(w),
    rw = ix.roman && hasDeva(w) ? loose(fold(ix.roman(w))) : "";
  return Q.toks.some(function (t, j) {
    if (Array.from(t).length < 2) return false;
    var lt = Q.lo[j];
    return w.indexOf(t) >= 0 || (lt.length > 1 && lw.indexOf(lt) >= 0) || near(t, w) || near(lt, lw) || (!!rw && !!Q.rtoks[j] && rw.indexOf(Q.rtoks[j]) >= 0);
  });
}

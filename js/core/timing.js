// @ts-check
// How long a text or a session takes to chant (Satish, 2026-11-15: "how much a routine would take"). Pure functions,
// no page, so the unit tests (tests/unit/timing.test.mjs) check them in Node. No init().
//
// - A text's length is counted from the text itself, as it is chanted: what comes before the dhrupad, then the text
//   with the dhrupad after every stanza (and before the first where the file says so), the lines said once where they
//   stand. The dhrupad setting (once / after every verse) only saves scrolling on a phone; the chanter sings every
//   repeat whatever it is set to, so it never changes the time. The length is in letters said, the unit Follow
//   measures the chanting in (letters() in core/follow.js), so a pace Follow measures applies as it is.
// - A pace is seconds per letter, the pauses within a text included; the time between one text and the next is apart
//   ("between"). Both, and the three ready-made paces, are in content/library.json ("timing"), measured from the
//   family's recordings and published ones (shravan-model, 2026-11-15: a home chant 0.09–0.15 s a letter, 0.107 its
//   middle; published recordings 0.12–0.24, 0.173).
// - A person's own pace is learned while Follow hears them: each stretch followed steadily through one text (no jump,
//   no long silence) adds its seconds and letters to the person's log (paceLog), and once the log holds enough, its
//   seconds per letter is their pace. Until then a time is a range, from the quick pace to the slow one.

import { letters } from "./follow.js";

/**
 * @typedef {{ quick: number, steady: number, slow: number }} Paces  seconds per letter
 * @typedef {{ paces: Paces, between: number, learn: { least: number, pause: number, enough: number, keep: number } }} Timing
 *   between: seconds from one text to the next; learn.least: the shortest stretch counted, in seconds; learn.pause: a
 *   silence this many seconds long ends a stretch; learn.enough: the letters the log needs before its pace is used;
 *   learn.keep: the letters it keeps (older chanting fades as new is added)
 * @typedef {{ lo: number, hi: number }} Span  seconds; the same when the pace is known
 * @typedef {"" | "quick" | "steady" | "slow"} PaceChoice  "": learned from Follow, a range until then
 * @typedef {{ s: number, n: number }} PaceLog  seconds and letters heard
 * @typedef {{ id: string, pos: number, t: number }} Heard  a place Follow found: the letter `pos` of text `id` at `t` ms
 * @typedef {{ id: string, from: number, at: number, pos: number, t: number }} Stretch  a stretch being followed:
 *   from its first place (`from`, at `at` ms) to its latest (`pos`, `t`)
 */

export const PACE_CHOICES = /** @type {PaceChoice[]} */ (["", "quick", "steady", "slow"]);

/** @type {Timing} the paces measured on 2026-11-15, should content/library.json lack them */
export const TIMING = {
  paces: { quick: 0.1, steady: 0.135, slow: 0.17 },
  between: 8,
  learn: { least: 30, pause: 20, enough: 1500, keep: 20000 },
};

/** content/library.json's "timing", each number checked; anything missing or odd is the measured default
 * @param {any} o @returns {Timing} */
export function cleanTiming(o) {
  var d = TIMING,
    ok = function (/** @type {any} */ v, /** @type {number} */ def) {
      return typeof v === "number" && isFinite(v) && v > 0 ? v : def;
    },
    p = (o && o.paces) || {},
    l = (o && o.learn) || {};
  return {
    paces: { quick: ok(p.quick, d.paces.quick), steady: ok(p.steady, d.paces.steady), slow: ok(p.slow, d.paces.slow) },
    between: o && o.between === 0 ? 0 : ok(o && o.between, d.between),
    learn: {
      least: ok(l.least, d.learn.least),
      pause: ok(l.pause, d.learn.pause),
      enough: ok(l.enough, d.learn.enough),
      keep: ok(l.keep, d.learn.keep),
    },
  };
}

/** A piece's letters as they are chanted (a piece of CONTENT, js/text/content.js): its lead, then its items, which
 * already hold the dhrupad after every stanza and before the first where it is sung there. The dhrupad shown at the
 * top (`refrain`) is a heading for the reader, not sung there, so it is not counted.
 * @param {{ lead?: { lines?: { mr: string }[] }[], items: { lines?: { mr: string }[] }[] }} p @returns {number} */
export function chantedLetters(p) {
  var n = 0;
  (p.lead || []).concat(p.items).forEach(function (it) {
    (it.lines || []).forEach(function (l) {
      n += letters(l.mr).length;
    });
  });
  return n;
}

/** The pace a person's times use: the one they chose, else the one learned from Follow once there is enough of it,
 * else the range from quick to slow @param {PaceChoice} choice @param {PaceLog | null | undefined} log @param {Timing} t
 * @returns {{ lo: number, hi: number, how: "chosen" | "learned" | "range" }} */
export function paceFor(choice, log, t) {
  if (choice === "quick" || choice === "steady" || choice === "slow") return { lo: t.paces[choice], hi: t.paces[choice], how: "chosen" };
  var own = learned(log, t);
  if (own) return { lo: own, hi: own, how: "learned" };
  return { lo: t.paces.quick, hi: t.paces.slow, how: "range" };
}

/** The pace in a log, once it holds enough letters; else null @param {PaceLog | null | undefined} log @param {Timing} t */
export function learned(log, t) {
  if (!log || !(log.n >= t.learn.enough) || !(log.s > 0)) return null;
  return log.s / log.n;
}

/** The time for texts of these lengths (letters) chanted one after another: each at the pace, with the time between
 * them @param {number[]} lengths @param {{ lo: number, hi: number }} pace @param {Timing} t @returns {Span} */
export function spanOf(lengths, pace, t) {
  var n = 0;
  lengths.forEach(function (x) {
    n += x;
  });
  var gaps = Math.max(0, lengths.length - 1) * t.between;
  return { lo: n * pace.lo + gaps, hi: n * pace.hi + gaps };
}

/** Seconds as whole minutes, never under 1 (a short aarti is "1 min", not "0") @param {number} sec */
export function minutes(sec) {
  return Math.max(1, Math.round(sec / 60));
}

/** A span in whole minutes: one number when its ends round alike @param {Span} s @returns {{ lo: number, hi: number }} */
export function spanMinutes(s) {
  return { lo: minutes(s.lo), hi: minutes(s.hi) };
}

/**
 * The next place Follow found, taken into the stretch being followed. A stretch goes on while the places move forward
 * through one text at a believable pace with no long silence; anything else ends it (another text, a jump back or far
 * ahead, a pause), and a new one starts from this place. `done` is the stretch that ended, when it was long enough to
 * count, as seconds and letters.
 * @param {Stretch | null} st @param {Heard} h @param {Timing} t @returns {{ st: Stretch, done: PaceLog | null }}
 */
export function measure(st, h, t) {
  if (st && st.id === h.id) {
    var dt = (h.t - st.t) / 1000,
      dp = h.pos - st.pos;
    // (a place found a few letters behind the last, as Follow often does, leaves the stretch as it was)
    if (dp < 0 && dp > -25 && dt <= t.learn.pause) return { st: st, done: null };
    // forward, not faster than half the quick pace, and no silence longer than learn.pause
    if (dp >= 0 && dt >= 0 && dt <= t.learn.pause && dp * t.paces.quick * 0.5 <= dt + 1)
      return { st: { id: st.id, from: st.from, at: st.at, pos: h.pos, t: h.t }, done: null };
  }
  return { st: { id: h.id, from: h.pos, at: h.t, pos: h.pos, t: h.t }, done: ended(st, t) };
}

/** A stretch that has ended, as seconds and letters, when long enough to count and at a believable pace; else null
 * @param {Stretch | null} st @param {Timing} t @returns {PaceLog | null} */
export function ended(st, t) {
  if (!st) return null;
  var s = (st.t - st.at) / 1000,
    n = st.pos - st.from;
  if (s < t.learn.least || n <= 0) return null;
  var pace = s / n;
  // (a pace outside half the quick one to twice the slow one is a mistake in following, not the chanting)
  if (pace < t.paces.quick / 2 || pace > t.paces.slow * 2) return null;
  return { s: s, n: n };
}

/** A log with a stretch added; past learn.keep letters the older chanting is scaled down, so the pace follows the
 * person as they chant now @param {PaceLog | null | undefined} log @param {PaceLog} add @param {Timing} t @returns {PaceLog} */
export function addToLog(log, add, t) {
  var s = (log && log.s > 0 ? log.s : 0) + add.s,
    n = (log && log.n > 0 ? log.n : 0) + add.n;
  if (n > t.learn.keep) {
    var k = t.learn.keep / n;
    s *= k;
    n *= k;
  }
  return { s: Math.round(s * 10) / 10, n: Math.round(n) };
}

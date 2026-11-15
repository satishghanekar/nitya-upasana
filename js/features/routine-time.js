// @ts-check
// How long a text or a session takes (Satish, 2026-11-15): the one place the other parts ask, so every screen says
// the same. Home's sessions and their texts (js/features/today-card.js), the time left while a session is read
// (js/features/where.js), the routine builder's lists and days (js/features/routine-builder.js) and the Library
// (js/features/library.js) call spanFor() and the words below; Settings → Chanting pace (#spc) is here, and so is
// learning the reader's pace while Follow hears them (heard(), heardEnd(), called by js/features/listen.js). The rules
// are pure functions in js/core/timing.js; the numbers are content/library.json's "timing".
// A change of pace (picked, learned or forgotten) is told with the event "nitya-pace": the parts showing times draw
// them again.

import { P, change } from "../core/state.js";
import { byId } from "../core/page.js";
import { menuWords } from "../core/strings.js";
import { esc, ui } from "../core/words.js";
import { addToLog, chantedLetters, cleanTiming, ended, learned, measure, minutes, paceFor, spanMinutes, spanOf } from "../core/timing.js";
import { SESSIONS, textsFor } from "../core/routine.js";
import { apply } from "./bars.js";

/** @typedef {import("../core/timing.js").Span} Span */

/** each text's letters as chanted, by its id in library.json (worked out the first time a time is asked for)
 * @type {Record<string, number> | null} */
var lengths = null;
/** @type {import("../core/timing.js").Timing | null} */
var rules = null;
/** the stretch Follow is hearing now @type {import("../core/timing.js").Stretch | null} */
var stretch = null;

/** The timing rules, from content/library.json through CONTENT */
function timing() {
  if (!rules) {
    /** @type {any} */
    var C = /** @type {any} */ (window).CONTENT;
    rules = cleanTiming(C && C.timing);
  }
  return rules;
}

/** A text's letters as chanted, by its id (0 for one not in the library) @param {string} id */
export function lettersOf(id) {
  if (!lengths) {
    lengths = {};
    /** @type {any} */
    var C = /** @type {any} */ (window).CONTENT;
    if (C)
      C.categories.forEach(function (/** @type {any} */ c) {
        c.pieces.forEach(function (/** @type {any} */ p) {
          /** @type {Record<string, number>} */ (lengths)[p.text] = chantedLetters(p);
        });
      });
  }
  return lengths[id] || 0;
}

/** How long these texts take, one after another, at the reading person's pace (a range until it is known)
 * @param {string[]} ids  texts' ids in library.json @returns {Span} */
export function spanFor(ids) {
  var t = timing();
  return spanOf(
    ids.map(lettersOf).filter(function (n) {
      return n > 0;
    }),
    paceFor(P.pace, P.paceLog, t),
    t,
  );
}

/** A span as the menus write it: "18 min", or "18–30 min" while the pace is not known @param {Span} s */
export function short(s) {
  var w = menuWords("time"),
    m = spanMinutes(s);
  return m.lo === m.hi ? w.min(m.lo) : w.range(m.lo, m.hi);
}

/** The same with "about" for a session: "about 18 min", or "18–30 min" @param {Span} s */
export function about(s) {
  var w = menuWords("time"),
    m = spanMinutes(s);
  return m.lo === m.hi ? w.about(m.lo) : w.range(m.lo, m.hi);
}

/** The same in words, for screen readers: "about 18 minutes", "18 to 30 minutes" @param {Span} s */
export function spoken(s) {
  var w = menuWords("time"),
    m = spanMinutes(s);
  return m.lo === m.hi ? w.aboutL(m.lo) : w.rangeL(m.lo, m.hi);
}

/** A day's time in a routine, all its sessions: each session's texts one after another, the sessions apart
 * @param {import("../core/routine.js").Routine | null | undefined} r @param {number} d  the weekday (Date.getDay()) @returns {Span} */
export function dayTime(r, d) {
  var lo = 0,
    hi = 0;
  SESSIONS.forEach(function (s) {
    var x = spanFor(textsFor(r, d, s));
    lo += x.lo;
    hi += x.hi;
  });
  return { lo: lo, hi: hi };
}

/** A routine's time a day over the week, from its shortest day to its longest (what a ready-made one says it takes)
 * @param {import("../core/routine.js").Routine | null | undefined} r @returns {Span} */
export function weekTime(r) {
  var lo = Infinity,
    hi = 0;
  for (var d = 0; d < 7; d++) {
    var x = dayTime(r, d);
    lo = Math.min(lo, x.lo);
    hi = Math.max(hi, x.hi);
  }
  return { lo: lo === Infinity ? 0 : lo, hi: hi };
}

/** A span as markup: the menus' short form seen, the words heard ("18–30 min" would be read as a dash), both in the
 * menu language @param {Span} s @param {boolean} [withAbout]  "about 18 min", for a session @param {string} [cls]
 * the class of what is seen */
export function timeHtml(s, withAbout, cls) {
  var l = ui();
  return (
    '<span class="' +
    (cls || "tmv") +
    '" lang="' +
    l +
    '" aria-hidden="true">' +
    esc(withAbout ? about(s) : short(s)) +
    '</span><span class="sr" lang="' +
    l +
    '">' +
    esc(spoken(s)) +
    "</span>"
  );
}

/** Minutes a span takes, for drawing a bar (its middle) @param {Span} s */
export function mid(s) {
  return (s.lo + s.hi) / 120;
}

// ---- learning the pace while Follow hears the chanting ----

/** A place Follow found: the letter `pos` of the piece `id`, chanted at `t` (performance.now()). A stretch followed
 * steadily that has just ended adds to the reading person's log @param {string} id @param {number} pos @param {number} t */
export function heard(id, pos, t) {
  var r = measure(stretch, { id: id, pos: pos, t: t }, timing());
  stretch = r.st;
  if (r.done) keep(r.done);
}

/** Follow stopped, or the reader went elsewhere: the stretch heard so far ends here */
export function heardEnd() {
  var done = ended(stretch, timing());
  stretch = null;
  if (done) keep(done);
}

/** @param {import("../core/timing.js").PaceLog} done */
function keep(done) {
  var was = learned(P.paceLog, timing());
  change({ paceLog: addToLog(P.paceLog, done, timing()) }, function () {
    draw();
    // (the times change only when they use the log: a pace learned, newly or anew)
    if (!P.pace && (was || learned(P.paceLog, timing()))) told();
  });
}

/** Tell the parts that show times @param {boolean} [now] */
function told(now) {
  document.dispatchEvent(new CustomEvent("nitya-pace", { detail: { now: !!now } }));
}

// ---- Settings → Chanting pace ----

/** The row in the menu language: the pace picked, and what is known of the reader's own (also called by apply(),
 * js/features/bars.js) */
export function timeLang() {
  draw();
}

function draw() {
  var g = document.getElementById("spc");
  if (!g) return;
  /** @type {NodeListOf<HTMLElement>} */ (g.querySelectorAll("button")).forEach(function (b) {
    b.setAttribute("aria-pressed", String((b.dataset.v || "") === P.pace));
  });
  var w = menuWords("time"),
    t = timing(),
    log = P.paceLog,
    heardMin = log && log.n > 0 ? w.min(minutes(log.s)) : "",
    s = byId("spcs");
  s.lang = ui();
  s.textContent = P.pace ? w.chosen : learned(log, t) ? w.learned(heardMin) : heardMin ? w.learning(heardMin) : w.range0;
  byId("spcf").hidden = !(log && log.n > 0);
}

export function init() {
  lengths = null;
  rules = null;
  stretch = null;
  var g = byId("spc");
  g.onclick = function (e) {
    var b = /** @type {HTMLElement} */ (e.target).closest("button");
    if (!b) return;
    change({ pace: b.dataset.v || "" }, function () {
      apply();
      told(true);
    });
  };
  byId("spcf").onclick = function () {
    change({ paceLog: {} }, function () {
      apply();
      told(true);
      // (said aloud, as the button that was pressed has gone)
      byId("spcl").textContent = menuWords("time").forgot;
      var to = /** @type {HTMLElement | null} */ (g.querySelector('[aria-pressed="true"]'));
      if (to) to.focus();
    });
  };
  draw();
}

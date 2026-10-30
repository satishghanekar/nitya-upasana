// @ts-check
// Print: what a routine printout holds (print redesign P5, PLAN §3). From a person's routine and the days and sessions
// chosen in the print builder's Routine tab (js/print/what.js), each text once, in routine order (Monday first, then
// Morning, Afternoon and Evening, each session's texts in their order), with a tag saying when it is said
// ("Daily · Morning, Evening", "Mon, Sat, Sun · Morning"), and the week at a glance printed on page 1 (the days ×
// sessions grid, each cell the numbers of its texts in the printout).
// Pure functions only (no page), so the unit tests (tests/unit/print-select.test.mjs) run them in Node.

import { SESSIONS, WEEK_ORDER, textsFor } from "../core/routine.js";

/**
 * @typedef {import("../core/routine.js").Routine} Routine
 * @typedef {import("../core/time-of-day.js").Session} Session
 * @typedef {Record<string, Partial<Record<Session, number[]>>>} Where  for each text, the days of each session it is in
 * @typedef {{ ids: string[], where: Where }} Selection
 * @typedef {{ session: Session, cells: { day: number, nums: number[] }[] }} GridRow
 */

/** The words of a tag: the weekdays, Sunday first (as Date.getDay() counts them), the sessions, and every day */
/** @type {Record<string, { days: string[], sessions: Record<string, string>, daily: string }>} */
export const TAG_WORDS = {
  en: {
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    sessions: { morning: "Morning", afternoon: "Afternoon", evening: "Evening" },
    daily: "Daily",
  },
  mr: {
    days: ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"],
    sessions: { morning: "सकाळ", afternoon: "दुपार", evening: "सायंकाळ" },
    daily: "रोज",
  },
  // the original printed or the menus in other letters take that language's own words, not Marathi's written in them
  kn: {
    days: ["ಭಾನು", "ಸೋಮ", "ಮಂಗಳ", "ಬುಧ", "ಗುರು", "ಶುಕ್ರ", "ಶನಿ"],
    sessions: { morning: "ಬೆಳಿಗ್ಗೆ", afternoon: "ಮಧ್ಯಾಹ್ನ", evening: "ಸಂಜೆ" },
    daily: "ಪ್ರತಿದಿನ",
  },
  te: {
    days: ["ఆది", "సోమ", "మంగళ", "బుధ", "గురు", "శుక్ర", "శని"],
    sessions: { morning: "ఉదయం", afternoon: "మధ్యాహ్నం", evening: "సాయంత్రం" },
    daily: "ప్రతిరోజూ",
  },
  gu: {
    days: ["રવિ", "સોમ", "મંગળ", "બુધ", "ગુરુ", "શુક્ર", "શનિ"],
    sessions: { morning: "સવાર", afternoon: "બપોર", evening: "સાંજ" },
    daily: "દરરોજ",
  },
};

/**
 * The days chosen, Monday first, each once
 * @param {number[]} days  0 Sunday … 6 Saturday
 * @returns {number[]}
 */
export function weekOrder(days) {
  return WEEK_ORDER.filter(function (d) {
    return days.indexOf(d) >= 0;
  });
}

/**
 * Each text once, in routine order, and where it is in the routine
 * @param {Routine | null | undefined} routine
 * @param {number[]} days  0 Sunday … 6 Saturday
 * @param {Session[]} sessions
 * @param {(id: string) => boolean} [known]  only texts the Library has (a routine can name one since removed)
 * @returns {Selection}
 */
export function selectRoutine(routine, days, sessions, known) {
  /** @type {string[]} */
  var ids = [];
  /** @type {Where} */
  var where = {};
  weekOrder(days).forEach(function (d) {
    SESSIONS.forEach(function (s) {
      if (sessions.indexOf(s) < 0) return;
      textsFor(routine, d, s).forEach(function (id) {
        if (known && !known(id)) return;
        if (ids.indexOf(id) < 0) {
          ids.push(id);
          where[id] = {};
        }
        var w = where[id],
          list = w[s] || (w[s] = []);
        if (list.indexOf(d) < 0) list.push(d);
      });
    });
  });
  return { ids: ids, where: where };
}

/**
 * Days as a tag writes them: "Daily" for all seven, a run of three or more in a row (Monday first) as "Mon–Fri", the
 * rest one by one: "Mon, Sat, Sun"
 * @param {number[]} days
 * @param {string} lang  a menu or reading language: en, mr, kn, te or gu (English for any other)
 */
export function dayList(days, lang) {
  var w = TAG_WORDS[lang] || TAG_WORDS.en,
    ord = weekOrder(days);
  if (ord.length === 7) return w.daily;
  /** @type {string[]} */
  var out = [];
  for (var i = 0; i < ord.length;) {
    var j = i;
    while (j + 1 < ord.length && WEEK_ORDER.indexOf(ord[j + 1]) === WEEK_ORDER.indexOf(ord[j]) + 1) j++;
    if (j - i >= 2) out.push(w.days[ord[i]] + "–" + w.days[ord[j]]);
    else for (var k = i; k <= j; k++) out.push(w.days[ord[k]]);
    i = j + 1;
  }
  return out.join(", ");
}

/**
 * A text's tag: its sessions, grouped by the days they fall on: "Daily · Morning, Evening", or
 * "Daily · Evening; Mon, Sat, Sun · Morning" when they differ
 * @param {Partial<Record<Session, number[]>> | undefined} at  where the text is (Selection.where[id])
 * @param {string} lang  a menu or reading language: en, mr, kn, te or gu (English for any other)
 */
export function tagFor(at, lang) {
  var w = TAG_WORDS[lang] || TAG_WORDS.en;
  /** @type {{ days: string, names: string[] }[]} */
  var groups = [];
  SESSIONS.forEach(function (s) {
    var d = at && at[s];
    if (!d || !d.length) return;
    var key = dayList(d, lang),
      g = groups.filter(function (x) {
        return x.days === key;
      })[0];
    if (g) g.names.push(w.sessions[s]);
    else groups.push({ days: key, names: [w.sessions[s]] });
  });
  return groups
    .map(function (g) {
      return g.days + " · " + g.names.join(", ");
    })
    .join("; ");
}

/**
 * The week at a glance: a row for each session chosen that has a text on a day chosen, a cell for each day (Monday
 * first) with the numbers its texts have in the printout (1 for the first text printed)
 * @param {Routine | null | undefined} routine
 * @param {number[]} days
 * @param {Session[]} sessions
 * @param {string[]} ids  the texts printed, in order (Selection.ids)
 * @returns {GridRow[]}
 */
export function weekGrid(routine, days, sessions, ids) {
  var ord = weekOrder(days);
  /** @type {GridRow[]} */
  var rows = [];
  SESSIONS.forEach(function (s) {
    if (sessions.indexOf(s) < 0) return;
    var cells = ord.map(function (d) {
      return {
        day: d,
        nums: textsFor(routine, d, s)
          .map(function (id) {
            return ids.indexOf(id) + 1;
          })
          .filter(function (n) {
            return n > 0;
          }),
      };
    });
    if (
      cells.some(function (c) {
        return c.nums.length;
      })
    )
      rows.push({ session: s, cells: cells });
  });
  return rows;
}

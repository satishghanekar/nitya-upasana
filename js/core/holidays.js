// @ts-check
// Public holidays for the Vedic calendar (Satish, 2026-10-24): US federal, India national, Maharashtra and Karnataka,
// from the rules in content/holidays.json. Pure functions, no page: the list is passed in (js/text/load.js fetches the
// file; tests/unit/holidays.test.mjs reads it).
// A holiday's day is a civil date, the same everywhere: a date every year (Republic Day, 26 January), the nth weekday
// of a month (Thanksgiving, the fourth Thursday of November; nth -1 is the last), or days from Easter Sunday (Good
// Friday, -2; the Gregorian computus). A holiday set by a tithi (Ugadi, Buddha Purnima) follows the festivals' rules at
// the place (js/core/festivals.js).

import { festivalsBetween } from "./festivals.js";

/**
 * @typedef {import("./festivals.js").LunarRule} LunarRule
 * @typedef {import("./panchang.js").Place} Place
 * @typedef {import("./panchang-names.js").Name} Name
 * @typedef {{ date: string } | { month: number, weekday: number, nth: number } | { easter: number }} CivilRule
 * @typedef {import("./festivals.js").Wiki} Wiki
 * @typedef {{ id: string, groups: string[], mr: string, en: string, short: Name, wiki?: Wiki, rule: CivilRule | LunarRule }} Holiday
 * @typedef {{ version: number, groups: Record<string, Name>, holidays: Holiday[] }} HolidayList  content/holidays.json
 * @typedef {{ id: string, groups: string[], mr: string, en: string, short: Name, wiki?: Wiki, date: string }} HolidayDay
 *   date "YYYY-MM-DD"
 */

/** @param {number} n */
function two(n) {
  return (n < 10 ? "0" : "") + n;
}
/** "YYYY-MM-DD" of a UTC date @param {Date} d */
function key(d) {
  return d.getUTCFullYear() + "-" + two(d.getUTCMonth() + 1) + "-" + two(d.getUTCDate());
}

/**
 * Easter Sunday of a year (Gregorian; the anonymous computus)
 * @param {number} y
 * @returns {Date} midnight UTC
 */
export function easter(y) {
  var a = y % 19,
    b = Math.floor(y / 100),
    c = y % 100,
    d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31),
    day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}

/**
 * A civil rule's day in a year, "YYYY-MM-DD"
 * @param {CivilRule} r @param {number} y
 * @returns {string}
 */
export function civilDay(r, y) {
  if ("date" in r) return y + "-" + r.date;
  if ("easter" in r) {
    var e = easter(y);
    e.setUTCDate(e.getUTCDate() + r.easter);
    return key(e);
  }
  var d;
  if (r.nth > 0) {
    // the first such weekday of the month, then whole weeks on
    d = new Date(Date.UTC(y, r.month - 1, 1));
    d.setUTCDate(1 + ((r.weekday - d.getUTCDay() + 7) % 7) + 7 * (r.nth - 1));
  } else {
    // the last such weekday: back from the month's last day
    d = new Date(Date.UTC(y, r.month, 0));
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - r.weekday + 7) % 7));
  }
  return key(d);
}

/** @param {CivilRule | LunarRule} r @returns {r is LunarRule} */
function lunar(r) {
  return "masa" in r;
}

/**
 * The holidays on the days from `from` to `to` (inclusive) at a place, in date order
 * @param {string} from "YYYY-MM-DD" @param {string} to "YYYY-MM-DD"
 * @param {Place} place  (for the holidays set by a tithi)
 * @param {HolidayList | null | undefined} list content/holidays.json
 * @returns {HolidayDay[]}
 */
export function holidaysBetween(from, to, place, list) {
  var all = (list && list.holidays) || [];
  if (!all.length || from > to) return [];
  /** @type {HolidayDay[]} */
  var out = [];
  /** @param {Holiday} h @param {string} date */
  function add(h, date) {
    out.push({ id: h.id, groups: h.groups, mr: h.mr, en: h.en, short: h.short, wiki: h.wiki, date: date });
  }
  var y0 = +from.slice(0, 4),
    y1 = +to.slice(0, 4);
  all.forEach(function (h) {
    if (lunar(h.rule)) return;
    for (var y = y0; y <= y1; y++) {
      var k = civilDay(h.rule, y);
      if (k >= from && k <= to) add(h, k);
    }
  });
  var moon = all.filter(function (h) {
    return lunar(h.rule);
  });
  festivalsBetween(from, to, place, /** @type {any} */ (moon)).forEach(function (f) {
    add(
      /** @type {Holiday} */ (
        moon.filter(function (h) {
          return h.id === f.id;
        })[0]
      ),
      f.date,
    );
  });
  return out.sort(function (a, b) {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  });
}

/**
 * The holidays in a month, by date
 * @param {number} year @param {number} month 1–12
 * @param {Place} place
 * @param {HolidayList | null | undefined} list
 * @returns {Record<string, HolidayDay[]>}
 */
export function holidaysInMonth(year, month, place, list) {
  var last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  /** @type {Record<string, HolidayDay[]>} */
  var by = {};
  holidaysBetween(year + "-" + two(month) + "-01", year + "-" + two(month) + "-" + two(last), place, list).forEach(function (h) {
    (by[h.date] = by[h.date] || []).push(h);
  });
  return by;
}

// @ts-check
// Festival days (सण) for the Vedic calendar, worked out on this device from the rules in content/festivals.json
// (Satish said yes to marking festivals such as Dasara, 2026-10-19). Pure functions, no page:
// the list is passed in (js/text/load.js fetches the file; the unit tests read it), so tests/unit/festivals.test.mjs
// runs them in Node.
//
// How a lunar festival's day is chosen (the usual dharmashastra way, as Kalnirnay and Drik Panchang apply it):
// 1. Its tithi: each occurrence of the rule's paksha and tithi whose amanta month (at the tithi) is the rule's month
//    and is NOT adhika. In a year with an adhika month the festival falls in the nija month (2026: Vat Purnima in nija
//    Jyeshtha, 29 June, not in Adhika Jyeshtha). A kshaya month (very rare; none 1983–2124) is not handled.
// 2. Its candidate days: the days (sunrise to next sunrise, at the place) in which that tithi is current at some time,
//    one to three of them.
// 3. Its karmakala on each candidate day, the part of the day the rule names (kala):
//    - sunrise: the moment of sunrise (udaya tithi);
//    - madhyahna / aparahna: the 3rd / 4th of the five equal parts of daylight (sunrise to sunset);
//    - pradosh: the first fifth of the night after sunset (3 of its 15 muhurtas, about 2 h 24 min);
//    - nishita: the 8th of the night's 15 muhurtas (around midnight, about 48 min);
//    - moonrise: the moment of moonrise on that calendar day (sunrise when the moon does not rise).
// 4. The day: the one candidate whose karmakala the tithi touches (vyapti, any part of it). When it touches the
//    karmakala on two days, or on none (vriddhi / kshaya at that time), the rule's `tie` decides: "first" (purva-viddha,
//    the earlier day) or "second" (para-viddha, the later one); on none, only among the days it is current in daylight
//    (sunrise to sunset), so a tithi that begins in the small hours does not go to the day before (Kojagiri 2026 in
//    Columbus: purnima from 2:26 am on 25 October to 0:11 am on the 26th is at neither midnight, and is kept on the
//    25th). For a sunrise rule "none" means a kshaya tithi, which lies in only one day, so that day is taken (Gudi Padwa 2026: pratipada begins after sunrise on 19 March and is over
//    before the next, so 19 March); "two" is a vriddhi tithi, at two sunrises, and the first is taken.
// The tie choices in content/festivals.json: "second" for Holi (pradosh), Lakshmi Pujan (pradosh) and Bhaubeej
// (aparahna: the dvitiya that fills the afternoon, 11 November 2026), "first" for the rest (Ganesh Chaturthi takes the tritiya-mixed chaturthi, Dasara the first aparahna dashami, Smarta ekadashis the
// first day). Nothing else (nakshatra such as Shravan for Dasara or Rohini for Janmashtami, bhadra for Holi and Raksha
// Bandhan, Vaishnava ekadashi) is considered; a printed calendar may differ on such years.
//
// A solar festival (Makar Sankranti) is on the day the sun enters the sidereal sign (Lahiri), counted from sunset to
// sunset: a sankranti between sunset and the next sunrise is kept the next day (its punyakala is then), one before
// sunset on that day.
//
// Times and days are the place's (the same place and clock as the rest of the calendar); festival days may differ by a
// day between India and America, as printed calendars for those places do.

import { dayTimes, masaOf, panchangDay, sunSidereal, tithiAt } from "./panchang.js";

/**
 * @typedef {import("./panchang.js").Place} Place
 * @typedef {"sunrise" | "madhyahna" | "aparahna" | "pradosh" | "nishita" | "moonrise"} Kala
 * @typedef {{ masa: number, paksha: "shukla" | "krishna", tithi: number, kala: Kala, tie: "first" | "second" }} LunarRule
 *   masa 1 Chaitra … 12 Phalgun (amanta, nija); tithi 1–15 within the paksha (krishna 15 is amavasya)
 * @typedef {{ rashi: number }} SolarRule  rashi 1 Mesha … 10 Makara … 12 Meena: the sidereal sign the sun enters
 * @typedef {import("./panchang-names.js").Name} Name
 * @typedef {{ id: string, mr: string, en: string, short: Name, rule: LunarRule | SolarRule }} Festival
 *   mr / en the full names (the festival is itself a Name); short the label for a day in the month grid
 * @typedef {{ version: number, adhika: "nija", festivals: Festival[] }} FestivalList  content/festivals.json
 * @typedef {{ id: string, mr: string, en: string, short: Name, date: string, from: Date, to: Date }} FestivalDay
 *   date "YYYY-MM-DD" on the place's clock; from / to: the tithi's start and end (a solar festival: the sankranti's
 *   moment, both)
 */

/** The parts of the day a rule may name */
export var KALAS = ["sunrise", "madhyahna", "aparahna", "pradosh", "nishita", "moonrise"];

var DAY = 86400000;

/** @param {string} k "YYYY-MM-DD" @param {number} n days */
function addDays(k, n) {
  var p = k.split("-"),
    d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
  return d.toISOString().slice(0, 10);
}
/** @param {number} x */
function n360(x) {
  x %= 360;
  return x < 0 ? x + 360 : x;
}

/**
 * The day's times, kept per date while one question is answered
 * @param {Place} place
 */
function timesCache(place) {
  /** @type {Record<string, ReturnType<typeof dayTimes>>} */
  var c = {};
  /** @param {string} k */
  return function (k) {
    return c[k] || (c[k] = dayTimes(k, place));
  };
}

/**
 * The karmakala of `kala` on day k, as [start, end] in ms (start = end for a moment)
 * @param {ReturnType<typeof dayTimes>} d @param {Kala} kala
 * @returns {[number, number]}
 */
export function kalaWindow(d, kala) {
  var sr = d.ref.getTime(),
    ss = d.sunset ? d.sunset.getTime() : sr + DAY / 2,
    nx = d.next.getTime(),
    day = ss - sr,
    night = nx - ss;
  switch (kala) {
    case "madhyahna":
      return [sr + (2 * day) / 5, sr + (3 * day) / 5];
    case "aparahna":
      return [sr + (3 * day) / 5, sr + (4 * day) / 5];
    case "pradosh":
      return [ss, ss + night / 5];
    case "nishita":
      return [ss + (7 * night) / 15, ss + (8 * night) / 15];
    case "moonrise":
      var m = d.moonrise ? d.moonrise.getTime() : sr;
      return [m, m];
    default:
      return [sr, sr];
  }
}

/** @param {LunarRule | SolarRule} r @returns {r is LunarRule} */
function lunar(r) {
  return "masa" in r;
}
/** tithi 1–30 of a lunar rule @param {LunarRule} r */
function tithiN(r) {
  return r.paksha === "krishna" ? r.tithi + 15 : r.tithi;
}

/**
 * The festivals on the days from `from` to `to` (inclusive) at a place, in date order.
 * @param {string} from "YYYY-MM-DD" @param {string} to "YYYY-MM-DD"
 * @param {Place} place
 * @param {FestivalList | Festival[] | null | undefined} list content/festivals.json (or its festivals)
 * @returns {FestivalDay[]}
 */
export function festivalsBetween(from, to, place, list) {
  var all = !list ? [] : Array.isArray(list) ? list : list.festivals || [];
  if (!all.length || from > to) return [];
  var times = timesCache(place);
  /** @type {FestivalDay[]} */
  var out = [];
  /** @param {Festival} f @param {string} date @param {number} a @param {number} b */
  function add(f, date, a, b) {
    if (date >= from && date <= to)
      out.push({ id: f.id, mr: f.mr, en: f.en, short: f.short, date: date, from: new Date(a), to: new Date(b) });
  }

  // lunar festivals, by tithi: every tithi current at some time from `from`'s sunrise to the sunrise after `to`
  /** @type {Record<number, Festival[]>} */
  var byTithi = {};
  all.forEach(function (f) {
    if (lunar(f.rule)) (byTithi[tithiN(f.rule)] = byTithi[tithiN(f.rule)] || []).push(f);
  });
  var t = times(from).ref.getTime(),
    stop = times(to).next.getTime();
  while (t < stop) {
    var ti = tithiAt(new Date(t)),
      s = ti.startsAt.getTime(),
      e = ti.endsAt.getTime(),
      fs = byTithi[ti.n];
    if (fs) {
      var masa = masaOf(new Date((s + e) / 2));
      if (!masa.adhika) {
        // the days it is current in
        /** @type {string[]} */
        var cand = [];
        for (var k = panchangDay(new Date(s), place); times(k).ref.getTime() < e && cand.length < 4; k = addDays(k, 1))
          cand.push(k);
        fs.forEach(function (f) {
          var r = /** @type {LunarRule} */ (f.rule);
          if (r.masa !== masa.n) return;
          var hits = cand.filter(function (k) {
            var w = kalaWindow(times(k), r.kala);
            return s <= w[1] && e > w[0];
          });
          // one day: that day; two: the rule's tie between them; none: the rule's tie between the days it is
          // current in daylight (so a tithi that only begins in a day's last hours before sunrise does not claim it)
          var lit = cand.filter(function (k) {
              var d = times(k);
              return s <= (d.sunset ? d.sunset.getTime() : d.ref.getTime() + DAY / 2) && e > d.ref.getTime();
            }),
            pool = hits.length ? hits : lit.length ? lit : cand;
          add(f, r.tie === "second" ? pool[pool.length - 1] : pool[0], s, e);
        });
      }
    }
    t = e + 1000;
  }

  // solar festivals: the sun enters the sign between the day before's sunset and this day's
  all.forEach(function (f) {
    if (lunar(f.rule)) return;
    var L = (f.rule.rashi - 1) * 30;
    /** @param {string} k */
    var dusk = function (k) {
      var d = times(k);
      return d.sunset ? d.sunset.getTime() : d.ref.getTime() + DAY / 2;
    };
    for (var k = from, a = dusk(addDays(from, -1)); k <= to; k = addDays(k, 1)) {
      var b = dusk(k);
      if (n360(sunSidereal(a) - L) > 180 && n360(sunSidereal(b) - L) < 180) {
        var lo = a,
          hi = b;
        for (var i = 0; i < 30; i++) {
          var m = (lo + hi) / 2;
          if (n360(sunSidereal(m) - L) > 180) lo = m;
          else hi = m;
        }
        add(f, k, hi, hi);
      }
      a = b;
    }
  });

  return out.sort(function (x, y) {
    return x.date < y.date ? -1 : x.date > y.date ? 1 : 0;
  });
}

/**
 * The festivals on one day at a place (empty on most days).
 * @param {Date | string} date a Date (its calendar day on the place's clock, as dayPanchang reads it) or "YYYY-MM-DD"
 * @param {Place} place
 * @param {FestivalList | Festival[] | null | undefined} list
 * @returns {FestivalDay[]}
 */
export function festivalsFor(date, place, list) {
  var k = typeof date === "string" ? date : dateKey(date, place);
  return festivalsBetween(k, k, place, list);
}

/** "YYYY-MM-DD" of a Date on the place's clock @param {Date} d @param {Place} place */
function dateKey(d, place) {
  if (!place.tz) {
    var m = d.getMonth() + 1,
      x = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (x < 10 ? "0" : "") + x;
  }
  /** @type {Record<string, string>} */
  var p = {};
  new Intl.DateTimeFormat("en-US", { timeZone: place.tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(d)
    .forEach(function (x) {
      p[x.type] = x.value;
    });
  return p.year + "-" + p.month + "-" + p.day;
}

/**
 * The festivals of a month, by day ("YYYY-MM-DD" → festivals on it).
 * @param {number} year @param {number} month 1–12 @param {Place} place
 * @param {FestivalList | Festival[] | null | undefined} list
 * @returns {Record<string, FestivalDay[]>}
 */
export function festivalsInMonth(year, month, place, list) {
  var last = new Date(Date.UTC(year, month, 0)).getUTCDate(),
    mm = (month < 10 ? "0" : "") + month;
  /** @type {Record<string, FestivalDay[]>} */
  var by = {};
  festivalsBetween(year + "-" + mm + "-01", year + "-" + mm + "-" + last, place, list).forEach(function (f) {
    (by[f.date] = by[f.date] || []).push(f);
  });
  return by;
}

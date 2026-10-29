// @ts-check
// The Vedic calendar (panchang), computed on this device: no network, no data files.
// Pure functions only (no page), so the unit tests (tests/unit/panchang.test.mjs) run them in Node.
//
// Convention (Satish's choice, Kalnirnay / Drik Panchang style):
// - amanta months (a month runs new moon to new moon), named by the sun's sidereal sign at the new moon that starts it
//   (sun in Meena → Chaitra, in Mesha → Vaishakha, …); a month with no sankranti in it is adhika, and has the name of
//   the month after it
// - sidereal (nirayana) longitudes with the Lahiri (Chitrapaksha) ayanamsha
// - a day's tithi, nakshatra, yoga, karana and month are the ones in effect at that day's sunrise at the place
// - sunrise and sunset are the upper limb on a sea-level horizon with standard refraction (centre at −0.833°)
//
// Positions come from js/features/astronomy.js (SK: Meeus's low-precision sun and moon, also used for the Sankashti
// card), taken at Terrestrial Time (UT + ΔT). Against the Swiss Ephemeris over 2020–2032 (tests/unit/panchang.test.mjs,
// every 11th day at Pune and Columbus): sunrise and sunset within 0.2 minute; tithi end times within 1.5 minutes
// (typically 0.5), nakshatra within 0.5, yoga within 1.5. So a day whose tithi begins or ends within BORDERLINE_MIN
// minutes of sunrise is flagged `borderline`: a printed panchang may give it the neighbouring tithi.
// Moonrise is SK.rise, exactly as the Sankashti card shows it: within 0.5 minute of the Swiss Ephemeris's
// upper-limb moonrise (typically 0.1).

import { SK, init as initSky } from "../features/astronomy.js";
import { AYANA, KARANA, MASA, NAKSHATRA, PAKSHA, RITU, SAMVATSARA, VARA, YOGA, ADHIKA, tithiName } from "./panchang-names.js";

/**
 * @typedef {import("./panchang-names.js").Name} Name
 * @typedef {{ lat: number, lon: number, tz?: string }} Place
 *   lat, lon in degrees (east and north positive); tz an IANA time zone such as "Asia/Kolkata" (the phone's own
 *   time zone when left out)
 * @typedef {{ n: number, endsAt: Date, name: Name }} Limb  n is 1-based; endsAt is when it gives way to the next
 * @typedef {Limb & { paksha: "shukla" | "krishna", pakshaName: Name, startsAt: Date, borderline: boolean }} Tithi
 *   n 1–30 (1–15 shukla, 16–30 krishna: 15 पौर्णिमा, 30 अमावास्या); name is the tithi's own name (प्रतिपदा …)
 * @typedef {{ n: number, adhika: boolean, name: Name, adhikaName: Name | null, startsAt: Date, endsAt: Date }} Masa
 *   n 1–12, Chaitra = 1; startsAt / endsAt are the new moons around it
 * @typedef {{
 *   date: string, sunrise: Date | null, sunset: Date | null, moonrise: Date | null,
 *   vara: { n: number, name: Name }, tithi: Tithi, nakshatra: Limb, yoga: Limb, karana: Limb, masa: Masa,
 *   samvatsara: { shaka: number, n: number, name: Name }, ritu: { n: number, name: Name },
 *   ayana: { key: "uttarayana" | "dakshinayana", name: Name }
 * }} DayPanchang
 *   date "YYYY-MM-DD"; vara.n 0 Sunday … 6 Saturday; samvatsara.n 1–60 (1 प्रभव); ritu.n 1–6 (1 वसंत)
 * @typedef {{
 *   date: string, day: number, vara: number, sunrise: Date | null, tithi: Tithi, masa: Masa,
 *   kshaya: number[], vriddhi: boolean, purnima: boolean, amavasya: boolean, ekadashi: boolean, sankashti: boolean
 * }} MonthDay
 *   kshaya: tithis (1–30) that begin and end between this sunrise and the next, so are at no sunrise;
 *   vriddhi: this day has the same tithi at sunrise as the day before; purnima / amavasya / ekadashi: that tithi is
 *   at this sunrise or is a kshaya tithi of this day; sankashti: the app's Sankashti day (the Sankashti card's own
 *   rule in js/features/astronomy.js, in the phone's time zone)
 * @typedef {{
 *   elong: (t: number) => number, moonLon: (t: number) => number, sunLon: (t: number) => number,
 *   rise: (t0: number, t1: number, lat: number, lon: number) => number | null,
 *   upcoming: (from: number, lat: number, lon: number, count: number) => { day: number }[]
 * }} Sky
 */

/** Tithi boundaries closer to sunrise than this (minutes) are flagged borderline. */
export var BORDERLINE_MIN = 5;

var D2R = Math.PI / 180,
  DAY = 86400000,
  HOUR = 3600000,
  SPAN = 360 / 27,
  SYNODIC = 29.530589 * DAY;

/** @returns {Sky} */
function sk() {
  if (!SK) initSky();
  return /** @type {Sky} */ (SK);
}
// SK's formulas take Terrestrial Time; clocks keep UT, ΔT ≈ 69 s behind (63.8 s in 2000, ~0.2 s more a year since).
// Without it every end time comes out about a minute late. The Sankashti days still use SK as the card does.
/** @param {number} t UT ms */
function dt(t) {
  return t + (63.8 + 0.2 * (t / (365.25 * DAY) - 30)) * 1000;
}
var SKY = {
  /** @param {number} t */
  elong: function (t) {
    return sk().elong(dt(t));
  },
  /** @param {number} t */
  moonLon: function (t) {
    return sk().moonLon(dt(t));
  },
  /** @param {number} t */
  sunLon: function (t) {
    return sk().sunLon(dt(t));
  },
};
/** UT-corrected positions (elong, moonLon, sunLon) */
function sky() {
  return SKY;
}

/** @param {number} x */
function n360(x) {
  x %= 360;
  return x < 0 ? x + 360 : x;
}
/** Julian centuries from J2000 @param {number} t ms */
function cent(t) {
  return (t / DAY + 2440587.5 - 2451545) / 36525;
}

// Lahiri ayanamsha: the mean value fitted to the Swiss Ephemeris (SIDM_LAHIRI) 1950–2100 within 0.0001°, plus the
// nutation in longitude (the same main term SK's apparent longitudes carry), so sidereal = apparent − ayanamsha.
/** @param {number} t ms */
export function ayanamsha(t) {
  var x = cent(t);
  return 23.857073 + 1.396862 * x + 0.000333 * x * x - 0.00478 * Math.sin((125.04452 - 1934.136261 * x) * D2R);
}
/** Sidereal longitude of the sun, degrees @param {number} t ms */
export function sunSidereal(t) {
  return n360(sky().sunLon(t) - ayanamsha(t));
}
/** Sidereal longitude of the moon, degrees @param {number} t ms */
export function moonSidereal(t) {
  return n360(sky().moonLon(t) - ayanamsha(t));
}

// 0-based indices of the five limbs at time t
/** @param {number} t */
function tithiIx(t) {
  return Math.floor(sky().elong(t) / 12);
}
/** @param {number} t */
function nakIx(t) {
  return Math.floor(moonSidereal(t) / SPAN) % 27;
}
/** @param {number} t */
function yogaIx(t) {
  return Math.floor(n360(sunSidereal(t) + moonSidereal(t)) / SPAN) % 27;
}
/** half-tithi 0–59 @param {number} t */
function halfIx(t) {
  return Math.floor(sky().elong(t) / 6);
}
/** Karana (0-based into KARANA) of half-tithi k: 0 किंस्तुघ्न, 57–59 शकुनि चतुष्पाद नाग, else the 7 that repeat
 * @param {number} k */
function karanaOf(k) {
  if (k === 0) return 10;
  if (k >= 57) return k - 50;
  return (k - 1) % 7;
}

/**
 * The first moment after t (forwards, or before t backwards) when f changes value; limbs last at least ~4 hours,
 * so hourly steps cannot jump over one. Bisected to well under a second.
 * @param {(t: number) => number} f
 * @param {number} t
 * @param {number} dir 1 forwards, -1 backwards
 */
function change(f, t, dir) {
  var v = f(t),
    a = t,
    b = t + dir * HOUR;
  for (var i = 0; i < 24 * 4 && f(b) === v; i++) {
    a = b;
    b += dir * HOUR;
  }
  for (var j = 0; j < 24; j++) {
    var m = (a + b) / 2;
    if (f(m) === v) a = m;
    else b = m;
  }
  return dir > 0 ? b : a;
}

/**
 * The moment near `guess` when the moon–sun elongation equals `angle` (0 new moon, 180 full moon).
 * @param {number} angle
 * @param {number} guess ms
 */
function phase(angle, guess) {
  var t = guess;
  for (var i = 0; i < 12; i++) {
    var d = n360(sky().elong(t) - angle + 180) - 180,
      rate = n360(sky().elong(t + HOUR) - sky().elong(t) + 180) - 180; // degrees per hour
    var step = (-d / rate) * HOUR;
    t += step;
    if (Math.abs(step) < 500) break;
  }
  return t;
}
/** The last moment at or before t when the elongation was `angle` @param {number} angle @param {number} t */
function phaseBefore(angle, t) {
  var back = n360(sky().elong(t) - angle),
    p = phase(angle, t - (back / 12.19) * DAY);
  if (p > t) p = phase(angle, p - SYNODIC);
  if (t - p > 30 * DAY) p = phase(angle, p + SYNODIC);
  return p;
}
/** The first moment after t when the elongation is `angle` @param {number} angle @param {number} t */
function phaseAfter(angle, t) {
  var p = phase(angle, t + (n360(angle - sky().elong(t)) / 12.19) * DAY);
  if (p <= t + 60000) p = phase(angle, p + SYNODIC);
  if (p - t > 30 * DAY) p = phase(angle, p - SYNODIC);
  return p;
}

/** The first new moon (amavasya's end) after `date` @param {Date} date */
export function newMoonAfter(date) {
  return new Date(phaseAfter(0, date.getTime()));
}
/** The first full moon (purnima's end) after `date` @param {Date} date */
export function fullMoonAfter(date) {
  return new Date(phaseAfter(180, date.getTime()));
}

// ----- time zones -----

/** @type {Record<string, Intl.DateTimeFormat>} */
var FMT = {};
/** Minutes the place's clock is ahead of UTC at t @param {number} t @param {string | undefined} tz */
function offset(t, tz) {
  if (!tz) return -new Date(t).getTimezoneOffset();
  var f =
    FMT[tz] ||
    (FMT[tz] = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }));
  /** @type {Record<string, number>} */
  var p = {};
  f.formatToParts(new Date(t)).forEach(function (x) {
    p[x.type] = +x.value;
  });
  var u = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return Math.round((u - Math.floor(t / 1000) * 1000) / 60000);
}
/** Midnight at the start of y-m-d (m 1–12) on the place's clock, as ms @param {number} y @param {number} m @param {number} d @param {string | undefined} tz */
function midnight(y, m, d, tz) {
  var g = Date.UTC(y, m - 1, d),
    t = g - offset(g, tz) * 60000;
  return g - offset(t, tz) * 60000;
}
/** The place's calendar date at t @param {number} t @param {string | undefined} tz */
function ymd(t, tz) {
  var u = new Date(t + offset(t, tz) * 60000);
  return { y: u.getUTCFullYear(), m: u.getUTCMonth() + 1, d: u.getUTCDate() };
}
/** @param {number} y @param {number} m @param {number} d */
function key(y, m, d) {
  return y + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
}

// ----- sunrise and sunset -----

/** The sun's altitude (degrees) at t from lat/lon @param {number} t @param {number} lat @param {number} lon */
function sunAlt(t, lat, lon) {
  var x = cent(t),
    l = sky().sunLon(t) * D2R,
    eps = (23.439291 - 0.0130042 * x + 0.00256 * Math.cos((125.04 - 1934.136 * x) * D2R)) * D2R;
  var ra = Math.atan2(Math.cos(eps) * Math.sin(l), Math.cos(l)),
    dec = Math.asin(Math.sin(eps) * Math.sin(l));
  var gmst = n360(280.46061837 + 360.98564736629 * (t / DAY + 2440587.5 - 2451545) + 0.000387933 * x * x),
    h = (gmst + lon) * D2R - ra,
    p = lat * D2R;
  return Math.asin(Math.sin(p) * Math.sin(dec) + Math.cos(p) * Math.cos(dec) * Math.cos(h)) / D2R;
}
/**
 * The first sunrise (up) or sunset in [t0, t1), or null (polar day or night).
 * @param {number} t0 @param {number} t1 @param {number} lat @param {number} lon @param {boolean} up
 */
function sunCross(t0, t1, lat, lon, up) {
  var h0 = -0.833,
    st = 20 * 60000,
    a = sunAlt(t0, lat, lon) - h0;
  for (var t = t0 + st; t <= t1; t += st) {
    var b = sunAlt(t, lat, lon) - h0;
    if (up ? a < 0 && b >= 0 : a >= 0 && b < 0) {
      var lo = t - st,
        hi = t;
      for (var i = 0; i < 16; i++) {
        var m = (lo + hi) / 2;
        if (sunAlt(m, lat, lon) - h0 < 0 === up) lo = m;
        else hi = m;
      }
      return Math.round(hi);
    }
    a = b;
  }
  return null;
}

/**
 * The day's start on the place's clock and its sunrise (ms; local 06:00 stands in where the sun does not rise).
 * @param {number} y @param {number} m @param {number} d @param {Place} place
 */
function dayStart(y, m, d, place) {
  var m0 = midnight(y, m, d, place.tz),
    m1 = midnight(y, m, d + 1, place.tz),
    sr = sunCross(m0, m1, place.lat, place.lon, true);
  return { m0: m0, m1: m1, sunrise: sr, ref: sr === null ? m0 + 6 * HOUR : sr };
}

// ----- the limbs -----

/** The tithi in effect at t @param {number} t @returns {Tithi} */
function tithiMs(t) {
  var i = tithiIx(t),
    n = i + 1,
    s = change(tithiIx, t, -1),
    e = change(tithiIx, t, 1),
    /** @type {"shukla" | "krishna"} */
    pk = n <= 15 ? "shukla" : "krishna";
  return {
    n: n,
    paksha: pk,
    pakshaName: PAKSHA[pk],
    name: tithiName(n),
    startsAt: new Date(s),
    endsAt: new Date(e),
    borderline: Math.min(t - s, e - t) < BORDERLINE_MIN * 60000,
  };
}

/**
 * The tithi in effect at any moment (for rules that look at midday, aparahna or pradosh rather than sunrise);
 * borderline here means within BORDERLINE_MIN of that moment.
 * @param {Date} date
 * @returns {Tithi}
 */
export function tithiAt(date) {
  return tithiMs(date.getTime());
}

/** The amanta month in effect at t @param {number} t @returns {Masa} */
function masaAt(t) {
  var p = phaseBefore(0, t),
    q = phase(0, p + SYNODIC),
    sp = Math.floor(sunSidereal(p) / 30),
    sq = Math.floor(sunSidereal(q) / 30),
    i = (sp + 1) % 12,
    adhika = sp === sq;
  return {
    n: i + 1,
    adhika: adhika,
    name: MASA[i],
    adhikaName: adhika ? ADHIKA : null,
    startsAt: new Date(p),
    endsAt: new Date(q),
  };
}

/** Shaka year and the 60-year cycle, given the month @param {Masa} masa */
function samvatsaraAt(masa) {
  // back to about the start of Chaitra (Feb–Apr whatever adhika months lie between), then its Gregorian year
  var chaitra = masa.startsAt.getTime() - (masa.n - 1) * SYNODIC + 15 * DAY,
    shaka = new Date(chaitra).getUTCFullYear() - 78,
    i = (((shaka + 11) % 60) + 60) % 60;
  return { shaka: shaka, n: i + 1, name: SAMVATSARA[i] };
}

/**
 * Accepts a Date (its calendar day on the place's clock) or "YYYY-MM-DD".
 * @param {Date | string} date @param {Place} place
 */
function dayOf(date, place) {
  if (typeof date === "string") {
    var s = date.split("-");
    return { y: +s[0], m: +s[1], d: +s[2] };
  }
  return ymd(date.getTime(), place.tz);
}

/**
 * The panchang of one day at a place: everything is as at that day's sunrise (local 06:00 if the sun does not rise).
 * @param {Date | string} date a Date (read as its calendar day in place.tz) or "YYYY-MM-DD"
 * @param {Place} place
 * @returns {DayPanchang}
 */
export function dayPanchang(date, place) {
  var c = dayOf(date, place),
    ds = dayStart(c.y, c.m, c.d, place),
    t = ds.ref,
    ss = sunCross(ds.m0, ds.m1, place.lat, place.lon, false),
    mr = sk().rise(ds.m0, ds.m1, place.lat, place.lon),
    vara = new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay(),
    ni = nakIx(t),
    yi = yogaIx(t),
    k = halfIx(t),
    ki = karanaOf(k),
    masa = masaAt(t),
    ritu = Math.floor((masa.n - 1) / 2),
    sun = sunSidereal(t),
    /** @type {"uttarayana" | "dakshinayana"} */
    ay = sun >= 270 || sun < 90 ? "uttarayana" : "dakshinayana";
  return {
    date: key(c.y, c.m, c.d),
    sunrise: ds.sunrise === null ? null : new Date(ds.sunrise),
    sunset: ss === null ? null : new Date(ss),
    moonrise: mr === null ? null : new Date(mr),
    vara: { n: vara, name: VARA[vara] },
    tithi: tithiMs(t),
    nakshatra: { n: ni + 1, name: NAKSHATRA[ni], endsAt: new Date(change(nakIx, t, 1)) },
    yoga: { n: yi + 1, name: YOGA[yi], endsAt: new Date(change(yogaIx, t, 1)) },
    karana: { n: ki + 1, name: KARANA[ki], endsAt: new Date(change(halfIx, t, 1)) },
    masa: masa,
    samvatsara: samvatsaraAt(masa),
    ritu: { n: ritu + 1, name: RITU[ritu] },
    ayana: { key: ay, name: AYANA[ay] },
  };
}

/**
 * A day's sunrise, sunset, moonrise and the next day's sunrise at a place, without the rest of the panchang (for the
 * festival rules in js/core/festivals.js, which need the parts of the day: midday, afternoon, pradosh, midnight).
 * `ref` is the sunrise, or local 06:00 where the sun does not rise; `next` is the same for the following day.
 * @param {string} date "YYYY-MM-DD" (a day on the place's clock)
 * @param {Place} place
 * @returns {{ date: string, sunrise: Date | null, sunset: Date | null, moonrise: Date | null, ref: Date, next: Date }}
 */
export function dayTimes(date, place) {
  var c = dayOf(date, place),
    ds = dayStart(c.y, c.m, c.d, place),
    nx = dayStart(c.y, c.m, c.d + 1, place),
    ss = sunCross(ds.m0, ds.m1, place.lat, place.lon, false),
    mr = sk().rise(ds.m0, ds.m1, place.lat, place.lon);
  return {
    date: key(c.y, c.m, c.d),
    sunrise: ds.sunrise === null ? null : new Date(ds.sunrise),
    sunset: ss === null ? null : new Date(ss),
    moonrise: mr === null ? null : new Date(mr),
    ref: new Date(ds.ref),
    next: new Date(nx.ref),
  };
}

/**
 * The day on the place's clock ("YYYY-MM-DD") whose sunrise-to-sunrise span holds `date` (the panchang's day: the
 * hours before sunrise belong to the day before).
 * @param {Date} date @param {Place} place
 */
export function panchangDay(date, place) {
  var t = date.getTime(),
    c = ymd(t, place.tz),
    ds = dayStart(c.y, c.m, c.d, place);
  if (t >= ds.ref) return key(c.y, c.m, c.d);
  var p = ymd(ds.m0 - HOUR, place.tz);
  return key(p.y, p.m, p.d);
}

/**
 * The amanta month in effect at a moment (adhika when no sankranti falls in it).
 * @param {Date} date
 * @returns {Masa}
 */
export function masaOf(date) {
  return masaAt(date.getTime());
}

/**
 * The tithi at sunrise for each day of a month, with kshaya / vriddhi tithis and the days to mark.
 * @param {number} year @param {number} month 1–12 @param {Place} place
 * @returns {MonthDay[]}
 */
export function monthPanchang(year, month, place) {
  var last = new Date(Date.UTC(year, month, 0)).getUTCDate(),
    days = [];
  for (var d = 0; d <= last + 1; d++) days.push(dayStart(year, month, d, place));
  var nums = days.map(function (x) {
    return tithiIx(x.ref) + 1;
  });
  // Sankashti days, exactly as the Sankashti card finds them (phone's time zone, js/features/astronomy.js)
  /** @type {Record<string, boolean>} */
  var sank = {};
  sk()
    .upcoming(new Date(year, month - 1, 1).getTime(), place.lat, place.lon, 3)
    .forEach(function (o) {
      var x = new Date(o.day);
      sank[key(x.getFullYear(), x.getMonth() + 1, x.getDate())] = true;
    });
  /** @type {MonthDay[]} */
  var out = [];
  for (var i = 1; i <= last; i++) {
    var n = nums[i];
    /** @type {number[]} */
    var kshaya = [];
    if (nums[i + 1] !== n) for (var j = n % 30; j + 1 !== nums[i + 1] && kshaya.length < 2; j = (j + 1) % 30) kshaya.push(j + 1);
    /** @param {number} x */
    var has = function (x) {
      return n === x || kshaya.indexOf(x) >= 0;
    };
    var k = key(year, month, i);
    out.push({
      date: k,
      day: i,
      vara: new Date(Date.UTC(year, month - 1, i)).getUTCDay(),
      sunrise: days[i].sunrise === null ? null : new Date(days[i].ref),
      tithi: tithiMs(days[i].ref),
      masa: masaAt(days[i].ref),
      kshaya: kshaya,
      vriddhi: n === nums[i - 1],
      purnima: has(15),
      amavasya: has(30),
      ekadashi: has(11) || has(26),
      sankashti: !!sank[k],
    });
  }
  return out;
}

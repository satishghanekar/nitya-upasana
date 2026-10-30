// @ts-check
// The Vedic calendar (panchang), worked out on this phone by js/core/panchang.js for the place moonrise uses
// (skLoc() in js/features/sankashti.js); nothing is fetched or sent anywhere. Approved design: mockups/home-v2-a.html
// (the line on Home) and mockups/vedic-calendar.html (the calendar page) on branch mockup-home-v2.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// - Home (#pan): a card under the date (its button, #panb, over all of it), "आश्विन शुद्ध अष्टमी" / "नक्षत्र … · शके १९४८ · पराभव संवत्सर" / sunrise,
//   sunset and the place. Only the day Home shows is worked out (one dayPanchang(), a few milliseconds), after the page
//   is shown: today, or another day picked with ‹ › under the date (homeDay(), from js/features/today-card.js).
// - The calendar page (#cal), opened by that button: like the Library page (#jump) it sits under the top bar with a
//   Back button, the phone's Back closes it (js/features/history.js) and focus returns to the button (overlays.js
//   setC). A day card (tithi, nakshatra and yoga with their end times, vara, sunrise and sunset, moonrise, month,
//   samvatsara, ritu and ayana) and the month as a table of buttons: each day's tithi at sunrise,
//   shukla / krishna shading, full and new moon, Ekadashi and Sankashti, kshaya and vriddhi tithis, today. A month is
//   worked out only when it is shown (monthPanchang(), ~50 ms) and kept while the page is open.
// - Festivals (content/festivals.json, rules in js/core/festivals.js): a short label on the day in the month, a tag
//   and a row in the day card, and on Home, on the day only (or on the day Home shows: "उद्या …", "Wednesday: …"), one line under the calendar line (#fst): "आज दसरा" /
//   "Today: Dasara". Their names follow the reading languages like the panchang's (nameH / nameH2).
// Words: the panchang's names (tithi, paksha, masa, nakshatra, yoga, samvatsara, ritu, ayana, the weekdays, the day's
// marks) follow the reading languages in Settings, as the pieces do: the first language (P.lead) everywhere, and the
// second (P.l2) as the small line of the day card's rows; Marathi in Kannada letters when that is the script (P.ind),
// English plain ("Ashvin Shukla Ashtami") or scholarly (IAST, P.tr). The words around them (glosses, times, dates,
// buttons, the key, the footnote) follow the menu language, P.ui, with Devanagari digits in Marathi menus.

import { P, change } from "../core/state.js";
import { dayPanchang, monthPanchang } from "../core/panchang.js";
import { festivalsBetween, festivalsFor, festivalsInMonth } from "../core/festivals.js";
import { holidaysBetween, holidaysInMonth } from "../core/holidays.js";
import { festIcon, festLook, festMark, holIcon, holMark, iconHtml, markHtml } from "../core/fest-icons.js";
import { loaded } from "../text/load.js";
import { skDay, skLang, skLoc } from "./sankashti.js";
import { openPicture } from "./picture-viewer.js";
import { setC } from "./overlays.js";
import { ovSub, ovSubDone } from "./history.js";
import { IA } from "../text/iast.js";
import { PAKSHA } from "../core/panchang-names.js";
import { DAYS, dv, esc, lead, mrLang, nameLang, nameOf, num, scr, second, ui } from "../core/words.js";
import { menuWords } from "../core/strings.js";

/**
 * @typedef {import("../core/panchang.js").DayPanchang} DayPanchang
 * @typedef {import("../core/panchang.js").MonthDay} MonthDay
 * @typedef {import("../core/panchang-names.js").Name} Name
 * @typedef {import("../core/festivals.js").FestivalDay} FestivalDay
 * @typedef {import("../core/holidays.js").HolidayDay} HolidayDay
 * @typedef {{ lat: number, lon: number, mr: string, en: string }} Where
 */

const MR_WD = ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"];
/** Words said with the names, in each reading language (ia: the scholarly English, when not worked out from mr) */
const N = {
  tithi: { mr: "तिथी", en: "Tithi", ia: "Tithi" },
  nakshatra: { mr: "नक्षत्र", en: "Nakshatra" },
  yoga: { mr: "योग", en: "Yoga" },
  vara: { mr: "वार", en: "Weekday", ia: "Weekday" },
  sunrise: { mr: "सूर्योदय", en: "Sunrise", ia: "Sunrise" },
  moonrise: { mr: "चंद्रोदय", en: "Moonrise", ia: "Moonrise" },
  masa: { mr: "मास", en: "Month", ia: "Month" },
  samvatsara: { mr: "संवत्सर", en: "Samvatsara" },
  rituAyana: { mr: "ऋतु · अयन", en: "Ritu · Ayana" },
  purnima: { mr: "पौर्णिमा", en: "Purnima" },
  amavasya: { mr: "अमावास्या", en: "Amavasya" },
  ekadashi: { mr: "एकादशी", en: "Ekadashi" },
  sankashti: { mr: "संकष्टी", en: "Sankashti" },
  angaraki: { mr: "अंगारकी", en: "Angaraki" },
  angSk: { mr: "अंगारकी संकष्टी", en: "Angaraki Sankashti" },
  skFull: { mr: "संकष्टी चतुर्थी", en: "Sankashti Chaturthi" },
  angSkFull: { mr: "अंगारकी संकष्टी चतुर्थी", en: "Angaraki Sankashti Chaturthi" },
  festival: { mr: "सण", en: "Festival", ia: "Festival" },
  holiday: { mr: "सुट्टी", en: "Holiday", ia: "Holiday" },
};

// The words around the names, in the menu language

const ICON = {
  // the sunrise and sunset beside their times: the app's own round pictures, small (kept offline by js/parts.js)
  sunrise: '<img src="picture-sunrise-360.webp" alt="" width="16" height="16">',
  sunset: '<img src="picture-sunset-360.webp" alt="" width="16" height="16">',
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  prev: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  fold: '<svg class="upwc" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>',
};

/** The calendar page's state while it is open */
var view = {
  /** @type {string} the day shown in the day card, "YYYY-MM-DD" */
  day: "",
  y: 0,
  /** 1–12 */
  m: 0,
  /** @type {"day" | "month" | "up"} the tab shown: the day card, the month, or 15 days */
  mode: "day",
  /** @type {"" | "month" | "up"} the tab a date or an entry was tapped in, which Back returns to */
  from: "",
  /** the 15 days' first day, "YYYY-MM-DD" */
  uFrom: "",
};
/** @type {Record<string, MonthDay[]>} months worked out while the page is open, by place and month */
var months = {};
// the day Home shows ("YYYY-MM-DD", picked with ‹ › under the date: js/features/today-card.js), or "" for today
var homeAt = "";
var homeKey = "",
  calKey = "";
/** @type {ReturnType<typeof setTimeout> | undefined} */
var homeT;

// ----- small helpers -----

function words() {
  return menuWords("calendar");
}
/** A Marathi name, escaped, in the chosen script, marked with its language @param {string} s @param {string} [cls] */
function mr(s, cls) {
  return '<span lang="' + mrLang() + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + esc(scr(s)) + "</span>";
}
/** Text in the menu language, marked with it @param {string} s */
function say(s) {
  return ui() === "mr" ? mr(s) : '<span lang="' + ui() + '">' + esc(s) + "</span>";
}
/** @param {"mr" | "en"} l */
function langOf(l) {
  return l === "en" ? "en" : mrLang();
}
/** A name's scholarly English: given, or worked out from its Marathi, each word capitalised @param {Name} n */
function iaOf(n) {
  return (
    n.ia ||
    IA(n.mr).replace(/(^|[\s(])(\S)/g, function (_, a, b) {
      return a + b.toUpperCase();
    })
  );
}
/** A name's text in a reading language: Marathi in the chosen script, English plain or IAST @param {Name} n @param {"mr" | "en"} l */
function txt(n, l) {
  return l === "mr" ? scr(n.mr) : P && P.tr === "iast" ? iaOf(n) : n.en;
}
/** A name in the first reading language, escaped and marked @param {Name} n @param {string} [cls] */
function nameH(n, cls) {
  var l = lead();
  return '<span lang="' + langOf(l) + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + esc(txt(n, l)) + "</span>";
}
/** The same in the second reading language, or "" when there is none @param {Name} n */
function nameH2(n) {
  var l = second();
  return l ? '<span lang="' + langOf(l) + '">' + esc(txt(n, l)) + "</span>" : "";
}
/** Names joined into one (for a title or a line) @param {string} sep @param {Name[]} ns @returns {Name} */
function cat(sep, ns) {
  return {
    mr: ns
      .map(function (n) {
        return n.mr;
      })
      .join(sep),
    en: ns
      .map(function (n) {
        return n.en;
      })
      .join(sep),
    ia: P && P.tr === "iast" ? ns.map(iaOf).join(sep) : undefined,
  };
}
/** "Shaka 1948", Devanagari digits in Marathi @param {number} y @returns {Name} */
function shaka(y) {
  return { mr: "शके\u00a0" + dv(y), en: "Shaka\u00a0" + y, ia: "Śaka\u00a0" + y };
}
// Where an English name may break in a narrow day of the month ("Chatur-dashi"), when it must
const HY = {
  Pratipada: "Prati-pada",
  Dvitiya: "Dvi-tiya",
  Tritiya: "Tri-tiya",
  Chaturthi: "Chatur-thi",
  Panchami: "Pan-chami",
  Shashthi: "Shash-thi",
  Saptami: "Sap-tami",
  Ashtami: "Ash-tami",
  Navami: "Nav-ami",
  Dashami: "Dash-ami",
  Ekadashi: "Eka-dashi",
  Dvadashi: "Dva-dashi",
  Trayodashi: "Trayo-dashi",
  Chaturdashi: "Chatur-dashi",
  Purnima: "Pur-nima",
  Amavasya: "Ama-vasya",
  Sankashti: "San-kashti",
  Angaraki: "Anga-raki",
};
/** @param {string} h an escaped English name (IAST: before its last part only) */
function hy(h) {
  return Object.prototype.hasOwnProperty.call(HY, h)
    ? HY[/** @type {keyof typeof HY} */ (h)].replace("-", "&shy;")
    : h.replace(/^(\S{3,}?)(daśī|pada|thī|mī|vāsyā|kaṣṭī)$/, "$1&shy;$2");
}
/** @param {Date} d */
function keyOf(d) {
  var m = d.getMonth() + 1,
    x = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (x < 10 ? "0" : "") + x;
}
/** @param {string} k "YYYY-MM-DD" */
function dateOf(k) {
  var p = k.split("-");
  return new Date(+p[0], +p[1] - 1, +p[2]);
}
/** @param {string} k "YYYY-MM-DD" @param {number} n days */
function addDays(k, n) {
  var d = dateOf(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}
/** "Tue 28 Jul" / "मंगळवार २८ जुलै" @param {string} k */
function dayLabel(k) {
  var d = dateOf(k);
  return words().dayLabel(d.getDay(), d.getDate(), d.getMonth());
}

/**
 * A clock time on this phone: "7:45 am", or in Marathi "सकाळी ७:४५" (रात्री, पहाटे, सकाळी, दुपारी, सायं.)
 * @param {Date} t
 */
function clock(t) {
  return words().clock(t.getHours(), ("0" + t.getMinutes()).slice(-2));
}
/**
 * "until 1:21 am" (with the weekday when it ends on another day than `day`): "until Mon 1:21 am" / "सोमवारी रात्री
 * १:२१ पर्यंत"
 * @param {Date} t @param {string} day
 */
function until(t, day) {
  return words().until(keyOf(t) !== day ? t.getDay() : -1, clock(t));
}
/** The place's name in the menu language @param {Where} L */
function placeName(L) {
  return nameOf(L);
}
/** @returns {{ lat: number, lon: number } | null} */
function where() {
  var L = skLoc();
  return L ? { lat: L.lat, lon: L.lon } : null;
}

/**
 * "आश्विन शुद्ध अष्टमी": the month (अधिक when so), the paksha and the tithi; पौर्णिमा and अमावास्या take no paksha
 * @param {DayPanchang} p @returns {Name}
 */
function title(p) {
  return cat(" ", (p.masa.adhikaName ? [p.masa.adhikaName] : []).concat([p.masa.name, tithiName(p.tithi)]));
}
/** The paksha and tithi: "शुद्ध अष्टमी" @param {DayPanchang["tithi"]} t @returns {Name} */
function tithiName(t) {
  return t.n === 15 || t.n === 30 ? t.name : cat(" ", [t.pakshaName, t.name]);
}
/** @param {DayPanchang["tithi"]} t @param {"mr" | "en"} l */
function tithiText(t, l) {
  return (t.n === 15 || t.n === 30 ? "" : t.pakshaName[l] + " ") + t.name[l];
}

// ----- Home: the calendar line -----

/** Fill the line on Home (#pan) with today's panchang; hidden when no place is known */
function homeRender() {
  var box = document.getElementById("pan"),
    L = skLoc(),
    pl = where();
  if (!box) return;
  if (!L || !pl) {
    box.hidden = true;
    box.innerHTML = "";
    upHome(null);
    return;
  }
  var p;
  try {
    p = dayPanchang(homeAt || new Date(), pl);
  } catch (e) {
    box.hidden = true;
    return;
  }
  var w = words(),
    l = ui(),
    s = p.samvatsara,
    sr = p.sunrise ? clock(p.sunrise) : "—",
    ss = p.sunset ? clock(p.sunset) : "—";
  box.lang = l;
  // the day's own entries (the holidays chosen in Settings among them): the first gives the card its tint
  var k = homeAt || keyOf(new Date()),
    own = loaded.festivals ? upList(k, k, pl, (P && P.hol) || []) : [],
    tint = own.length ? upTint(own[0]) : "";
  // A card, not one button, so the place's pin can sit beside the place: the card's button (#panb) lies over all of it
  // (named by the lines, read in order) and the pin (#ploc) over that; a tap anywhere else opens the calendar
  box.innerHTML =
    '<div class="pcard' +
    (tint ? " fday " + tint : "") +
    '">' +
    '<span class="pt">' +
    '<span id="pn1">' +
    nameH(title(p), "p1") +
    // the day's drawing, small, after the tithi (its line's height, so the card keeps one height on every day)
    (own.length ? '<span class="pdi">' + upIcon(own[0]) + "</span>" : "") +
    "</span>" +
    '<span class="p2" id="pn2">' +
    // "\u00a0·" keeps each dot with the word before it when the line wraps
    nameH(cat("\u00a0· ", [cat(" ", [N.nakshatra, p.nakshatra.name]), shaka(s.shaka), lead() === "mr" ? cat(" ", [s.name, N.samvatsara]) : s.name])) +
    "</span>" +
    // the sunrise and the sunset, each with its picture, are buttons that show the picture full screen
    // (js/features/picture-viewer.js); the card's button is named by their times (#pnr, #pns)
    '<span class="p3">' +
    '<button type="button" class="psun" id="psr" data-pic="sunrise">' +
    ICON.sunrise +
    '<span id="pnr"><span class="sr">' +
    esc(w.sunrise) +
    " </span>" +
    esc(sr) +
    '</span><span class="sr"> · ' +
    esc(w.pic) +
    "</span></button>" +
    '<button type="button" class="psun" id="pss" data-pic="sunset">' +
    ICON.sunset +
    '<span id="pns"><span class="sr">' +
    esc(w.sunset) +
    " </span>" +
    esc(ss) +
    '</span><span class="sr"> · ' +
    esc(w.pic) +
    "</span></button>" +
    // the place: a tap asks the phone where it is (js/features/sankashti.js useMyLocation)
    '<button type="button" id="ploc">' +
    ICON.pin +
    esc(placeName(L)) +
    '<span class="sr"> · ' +
    esc(w.loc) +
    "</span></button>" +
    "</span>" +
    // the day's festivals, Pradosh, Sankashti and holidays, heard with the card's name; seen as the drawing beside the
    // lines and the card's tint, and in Coming up under it (its first row, "today"), so the card keeps one height
    '<span class="sr" id="pn4">' +
    (own.length
      ? say(", ") +
        own
          .map(function (u) {
            return nameH(u.name);
          })
          .join(say(", "))
      : "") +
    "</span>" +
    "</span>" +
    '<button type="button" id="panb" aria-haspopup="dialog" aria-expanded="false" aria-controls="cal" aria-labelledby="pn1 pn2 pnr pns pn4 pno">' +
    '<span class="sr" id="pno">' +
    esc(w.open) +
    "</span>" +
    ICON.chev +
    "</button></div>";
  box.hidden = false;
  upHome(pl);
}

// ----- festivals (content/festivals.json; js/core/festivals.js) -----

/** A festival's name (a Name: mr and en) in the first reading language, like the panchang's names
 * @param {Name} n @param {string} [cls] */
function fname(n, cls) {
  return nameH(n, cls);
}
/** A festival's or holiday's name as a link to its Wikipedia page (Marathi with Marathi menus, where there is one),
 * opening in a new tab with ↗, as the texts' credits do; just the name when it has none
 * @param {Name & { wiki?: import("../core/festivals.js").Wiki }} f */
function fwiki(f) {
  if (!f.wiki) return fname(f);
  var M = ui() === "mr" && !!f.wiki.mr,
    url = M ? "https://mr.wikipedia.org/wiki/" + f.wiki.mr : "https://en.wikipedia.org/wiki/" + f.wiki.en,
    // (the name as shown first, so what is heard starts with what is seen)
    shown = txt(f, lead() === "en" ? "en" : "mr"),
    label = words().wiki(shown);
  return (
    '<a href="' +
    esc(encodeURI(url)) +
    '" target="_blank" rel="noopener" aria-label="' +
    esc(label) +
    '">' +
    fname(f) +
    '<span class="crx" aria-hidden="true"> ↗</span></a>'
  );
}
/** @type {Record<string, Record<string, FestivalDay[]>>} months' festivals worked out while the page is open */
var fmonths = {};
/** @param {number} y @param {number} m 1–12 @returns {Record<string, FestivalDay[]>} */
function monthFests(y, m) {
  var pl = where();
  if (!pl || !loaded.festivals) return {};
  var k = pl.lat + "," + pl.lon + ":" + y + "-" + m;
  if (!fmonths[k]) fmonths[k] = festivalsInMonth(y, m, pl, loaded.festivals);
  return fmonths[k];
}
// ----- public holidays (content/holidays.json; js/core/holidays.js) -----

/** @type {Record<string, Record<string, HolidayDay[]>>} months' holidays worked out while the page is open */
var hmonths = {};
/** @param {number} y @param {number} m 1–12 @returns {Record<string, HolidayDay[]>} */
function monthHols(y, m) {
  var pl = where();
  if (!pl || !loaded.holidays) return {};
  var k = pl.lat + "," + pl.lon + ":" + y + "-" + m;
  if (!hmonths[k]) hmonths[k] = holidaysInMonth(y, m, pl, loaded.holidays);
  return hmonths[k];
}
/** The holidays on one day ("YYYY-MM-DD", or now) @param {string | Date} k @param {{ lat: number, lon: number }} pl */
function holsOn(k, pl) {
  if (!loaded.holidays) return [];
  if (typeof k === "string") {
    var d = dateOf(k);
    return monthHols(d.getFullYear(), d.getMonth() + 1)[k] || [];
  }
  return holidaysBetween(keyOf(k), keyOf(k), pl, loaded.holidays);
}
/** A holiday's name with where it is kept: "Republic Day (India)", "स्वातंत्र्य दिन (अमेरिका)", and its Wikipedia page
 * @param {HolidayDay} h @returns {Name & { wiki?: import("../core/festivals.js").Wiki }} */
function holName(h) {
  var g = (loaded.holidays && loaded.holidays.groups) || {},
    gs = h.groups.map(function (x) {
      return g[x] || { mr: x, en: x };
    });
  return {
    mr:
      h.mr +
      " (" +
      gs
        .map(function (x) {
          return x.mr;
        })
        .join(", ") +
      ")",
    en:
      h.en +
      " (" +
      gs
        .map(function (x) {
          return x.en;
        })
        .join(", ") +
      ")",
    wiki: h.wiki,
  };
}

/** The festivals on one day ("YYYY-MM-DD", or now), [] when the rules did not load
 * @param {string | Date} k @param {{ lat: number, lon: number }} pl */
function festsOn(k, pl) {
  if (!loaded.festivals) return [];
  if (typeof k === "string") {
    var d = dateOf(k);
    return monthFests(d.getFullYear(), d.getMonth() + 1)[k] || [];
  }
  return festivalsFor(k, pl, loaded.festivals);
}
// ----- Upcoming: 15 days at a time (the calendar's 15 days tab, #calu) and the next week on Home (#upw) -----
// The festivals (Pradosh apart), Pradosh, Sankashti with its moonrise (the month's mark, as the calendar shows it) and
// the public holidays; a festival of several days (the Utsav's Day 1 … Day 9) is one entry, "Day 1–9 · until Tue 28
// Jul", and a festival on one of its days says which ("Utsav 5"). Home shows the 7 days after today (today's own are
// the lines above it, #fst and #skt) and the first one after them; holidays only in the 15 days, when asked.

/**
 * @typedef {"fest" | "pradosh" | "sk" | "hol"} UpKind
 * @typedef {{ date: string, kind: UpKind, name: Name, id?: string, groups?: string[], end?: string, d1?: number, d2?: number,
 *   rise?: Date | null, set?: Date | null, also?: Name }} Up  one entry; id: a festival's (its drawing); groups: a holiday's
 *   (its flag); end, d1, d2: a festival of several days (its last date and day numbers); rise: Sankashti's moonrise;
 *   set: Pradosh's sunset
 */

/** What the 15 days show (its buttons), while the app is open */
var upShow = { fest: true, pradosh: true, sk: true, hol: false };
/** @type {UpKind[]} */
const KINDS = ["fest", "pradosh", "sk", "hol"];

/** A festival's name without its day's number: "Shri Gondhavlekar Maharaj Utsav" @param {FestivalDay} f @returns {Name} */
function runName(f) {
  var all = (loaded.festivals && loaded.festivals.festivals) || [],
    r = all.filter(function (x) {
      return x.id === f.id;
    })[0];
  /** @param {string} s */
  function cut(s) {
    return s.replace(/\s*[·—]\s*[^·—]*\{n\}.*$/, "");
  }
  return r ? { mr: cut(r.mr), en: cut(r.en) } : f;
}

/**
 * The entries from `from` to `to` (inclusive), in date order
 * @param {string} from "YYYY-MM-DD" @param {string} to @param {{ lat: number, lon: number }} pl
 * @param {string[]} [groups] only these public holidays ("us", "in", "mh", "ka": Home's Coming up, as chosen in
 *   Settings), none for []; every one when not given
 * @returns {Up[]}
 */
function upList(from, to, pl, groups) {
  /** @type {Up[]} */
  var out = [];
  /** @type {Record<string, Up>} the festival of several days running, by id */
  var runs = {};
  /** @type {Record<string, Name>} a day's number in such a festival: "Utsav 5", by date */
  var inRun = {};
  (loaded.festivals ? festivalsBetween(from, to, pl, loaded.festivals) : []).forEach(function (f) {
    /** @type {UpKind} */
    var kind = f.id === "pradosh" ? "pradosh" : "fest";
    if (f.n) {
      inRun[f.date] = f.short;
      var r = runs[f.id];
      if (r && r.end === addDays(f.date, -1)) {
        r.end = f.date;
        r.d2 = f.n;
        return;
      }
      out.push((runs[f.id] = { date: f.date, kind: kind, name: runName(f), id: f.id, end: f.date, d1: f.n, d2: f.n }));
      return;
    }
    var set = null;
    if (kind === "pradosh")
      try {
        set = dayPanchang(f.date, pl).sunset;
      } catch (e) {}
    out.push({ date: f.date, kind: kind, name: f, id: f.id, set: set });
  });
  /** @type {Record<string, MonthDay>} */
  var md = {};
  for (var k = from; k <= to; k = addDays(k, 1)) {
    var d = dateOf(k),
      m = monthOf(d.getFullYear(), d.getMonth() + 1)[d.getDate() - 1];
    if (!m) continue;
    md[k] = m;
    if (m.sankashti) {
      var rise = null;
      try {
        rise = dayPanchang(k, pl).moonrise;
      } catch (e) {}
      out.push({ date: k, kind: "sk", name: m.vara === 2 ? N.angSkFull : N.skFull, rise: rise });
    }
  }
  if (loaded.holidays && (!groups || groups.length))
    holidaysBetween(from, to, pl, loaded.holidays).forEach(function (h) {
      if (
        !groups ||
        h.groups.some(function (g) {
          return groups.indexOf(g) >= 0;
        })
      )
        out.push({ date: h.date, kind: "hol", name: holName(h), groups: h.groups });
    });
  out.forEach(function (u) {
    if (!u.end && inRun[u.date]) u.also = inRun[u.date];
  });
  return out.sort(function (a, b) {
    // on a day, a festival of several days first
    return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.end ? 0 : 1) - (b.end ? 0 : 1) || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind);
  });
}

/** Days from `today` to `k` @param {string} k @param {string} today "YYYY-MM-DD" */
function daysTo(k, today) {
  return Math.round((dateOf(k).getTime() - dateOf(today).getTime()) / 864e5);
}
/** When an entry is, from today: "today", "tomorrow", "in 5 days", "3 days ago" @param {string} k @param {string} today */
function whenOf(k, today) {
  var w = words(),
    n = daysTo(k, today);
  return n === 0 ? w.uToday : n === 1 ? w.uTomorrow : n === -1 ? w.uYesterday : n < 0 ? w.uAgo(-n) : w.uIn(n);
}
/** An entry's drawing in its tinted circle (js/core/fest-icons.js): a festival's own, Sankashti's moon, a holiday's flag
 * @param {Up} u */
function upIcon(u) {
  return u.kind === "sk" ? iconHtml("crescent", "gan") : u.kind === "hol" ? holIcon(u.groups || []) : festIcon(u.id || "");
}

/** An entry's tint (js/core/fest-icons.js), which Home's card takes on the entry's day @param {Up} u */
function upTint(u) {
  return u.kind === "sk" ? "gan" : u.kind === "hol" ? "hol" : festLook(u.id || "")[1];
}

/**
 * One entry, a button that shows its day in the calendar: the date (in the 15 days a column, on Home the start of the
 * small line), its drawing, its name, and when it is
 * @param {Up} u @param {string} today "YYYY-MM-DD" @param {boolean} [home] Home's Coming up
 */
function upRow(u, today, home) {
  var w = words(),
    E = nameLang() === "en",
    d = dateOf(u.date),
    n = daysTo(u.date, today),
    when = whenOf(u.date, today),
    other = d.getMonth() !== dateOf(today).getMonth(),
    full = menuWords("dates").day(d.getDay(), d.getDate(), d.getMonth()),
    // the small line: the name in the second reading language, then what is particular to the entry
    det =
      u.end && u.d1
        ? w.uDays(u.d1, u.d2 || u.d1) + (u.end !== u.date ? " · " + w.uUntil(dayLabel(u.end)) : "")
        : u.kind === "sk"
          ? u.rise
            ? txt(N.moonrise, E ? "en" : "mr") + " " + clock(u.rise)
            : w.noRise
          : u.kind === "pradosh" && u.set
            ? w.sunset + " " + clock(u.set)
            : "",
    two = nameH2(u.name),
    small = [two, det ? say(det) : "", u.also ? nameH(u.also) : ""].filter(Boolean).join(say(" · "));
  // on Home the date starts the small line (heard already, in full, before the name)
  if (home) small = '<span aria-hidden="true">' + say(dayLabel(u.date) + (small ? " · " : "")) + "</span>" + small;
  return (
    '<li><button type="button" class="upr ' +
    u.kind +
    '" data-d="' +
    u.date +
    '">' +
    (home
      ? ""
      : '<span class="upd" aria-hidden="true"><span>' +
        esc(scr(menuWords("dates").daysShort[d.getDay()])) +
        "</span>" +
        "<b>" +
        num(d.getDate()) +
        "</b>" +
        (other ? "<span>" + esc(scr(menuWords("dates").monthsShort[d.getMonth()])) + "</span>" : "") +
        "</span>") +
    '<span class="upi">' +
    upIcon(u) +
    "</span>" +
    '<span class="upn"><span class="sr">' +
    say(full + ": ") +
    "</span>" +
    nameH(u.name, "un") +
    (small ? "<small>" + small + "</small>" : "") +
    "</span>" +
    '<span class="upw' +
    (n >= 0 && n < 2 ? " soon" : "") +
    '"><span class="sr">, </span>' +
    say(when) +
    "</span>" +
    "</button></li>"
  );
}

/** Home: Coming up (#upw), at the bottom of the calendar card: the next three from the day shown (five on tablets and
 * computers; its own first, "today"),
 * festivals, Pradosh, Sankashti and the public holidays chosen in Settings (P.hol), each with its drawing (Satish,
 * 2026-10-30: the "Nitya Home cards" mockups). Its heading folds it (P.upf, each person's): folded, one line with the
 * first ("दसरा · in 2 days"). The same number of rows on every day, so it keeps one height as ‹ › move through the days; hidden
 * when nothing is marked in the month from the day.
 * @param {{ lat: number, lon: number } | null} pl */
function upHome(pl) {
  var box = document.getElementById("upw");
  if (!box) return;
  var t = keyOf(new Date()),
    k = homeAt || t,
    // five: phones show three, tablets and computers all five (css/12-calendar.css)
    rows = pl && loaded.festivals ? upList(k, addDays(k, 30), pl, (P && P.hol) || []).slice(0, 5) : [];
  if (!rows.length) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  var w = words(),
    open = !(P && P.upf);
  box.lang = ui();
  box.innerHTML =
    '<div class="uph"><h2 id="upwh">' +
    '<button type="button" id="upwf" aria-expanded="' +
    open +
    '" aria-controls="upwl">' +
    '<span class="upwt">' +
    say(w.coming) +
    "</span>" +
    // folded: the first one, after the heading (heard as part of the button's name)
    '<span class="upws">' +
    nameH(rows[0].name) +
    say(" · " + whenOf(rows[0].date, t)) +
    "</span>" +
    ICON.fold +
    "</button></h2></div>" +
    '<div id="upwl"' +
    (open ? "" : " hidden") +
    '><ul class="upl">' +
    rows
      .map(function (u) {
        return upRow(u, t, true);
      })
      .join("") +
    "</ul>" +
    // the calendar's 15 days, from the day shown
    '<button type="button" id="upwm" aria-haspopup="dialog" aria-expanded="false" aria-controls="cal">' +
    say(w.nextU) +
    ICON.chev +
    "</button></div>";
  box.hidden = false;
}

/** Fold or open Coming up (its heading's button), and keep it so for the person reading */
function upFold() {
  var b = document.getElementById("upwf"),
    l = document.getElementById("upwl");
  if (!b || !l) return;
  var open = b.getAttribute("aria-expanded") !== "true";
  b.setAttribute("aria-expanded", String(open));
  l.hidden = !open;
  change({ upf: open ? 0 : 1 });
}

/** What the words and names are drawn in: the menu language, the script and the reading languages */
function langKey() {
  return ui() + mrLang() + lead() + second() + (P && P.tr);
}

/** The person's own choices Home's card shows: the holidays (Settings) and Coming up folded */
function homeOwn() {
  return JSON.stringify([P.hol || [], P.upf || 0]);
}

/** Re-draw the Home line and This week (soon after the page is shown), when the languages, the day or the place changed */
function homeSoon() {
  var k = langKey() + new Date().toDateString() + homeAt + JSON.stringify(P.loc || null) + homeOwn();
  if (k === homeKey) return;
  homeKey = k;
  // before the page is first shown (js/main.js data-ready), drawn at once, with This week, so nothing jumps when it
  // shows (about 30 ms); later, just after the page is drawn
  if (!document.documentElement.hasAttribute("data-ready")) {
    clearTimeout(homeT);
    homeDraw();
    return;
  }
  var box = document.getElementById("pan");
  // keep the line's room while today is worked out, so the list below does not jump
  if (box && box.hidden && skLoc()) {
    box.innerHTML = '<span class="pwait" aria-hidden="true"></span>';
    box.hidden = false;
  }
  clearTimeout(homeT);
  homeT = setTimeout(function () {
    homeDraw();
    if (isOpen()) calRender();
  }, 0);
}

// ----- Home's lines kept for the rest of the day -----
// Working out the Home line, the festival line and This week takes about 30 ms on a phone (a month of tithis and the
// festivals' rules), and is done before the page first shows, so nothing jumps. What they show depends only on the
// day, the place, the languages and the site's version, so today's are kept on this phone (localStorage): opening the
// app again the same day draws them as they were, without working anything out. Another day shown on Home is not kept.
var KEPT = "nitya-home-lines",
  KEPT_BOXES = ["pan", "upw"];
/** Everything the lines depend on: a kept copy is used only when all of it is the same */
function keptKey() {
  var tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {}
  return [
    (document.querySelector('meta[name="version"]') || /** @type {any} */ ({})).content,
    keyOf(new Date()),
    langKey(),
    tz,
    JSON.stringify(P.loc || null),
    homeOwn(),
    // the festival and holiday rules (the version covers the site's own; a test may give others)
    hash(JSON.stringify([loaded.festivals || null, loaded.holidays || null])),
  ].join("|");
}
/** A short fingerprint of a long string @param {string} s */
function hash(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return s.length + ":" + h;
}
/** Draw Home's lines: today's from the kept copy when there is one, else worked out (and today's then kept) */
function homeDraw() {
  if (homeAt) {
    homeRender();
    return;
  }
  var k = keptKey();
  try {
    var o = JSON.parse(localStorage.getItem(KEPT) || "null");
    if (o && o.k === k && o.b.length === KEPT_BOXES.length) {
      KEPT_BOXES.forEach(function (id, i) {
        var e = document.getElementById(id),
          b = o.b[i];
        if (e && b) {
          e.hidden = b[0];
          e.lang = b[1];
          e.innerHTML = b[2];
        }
      });
      return;
    }
  } catch (e) {}
  homeRender();
  try {
    localStorage.setItem(
      KEPT,
      JSON.stringify({
        k: k,
        b: KEPT_BOXES.map(function (id) {
          var e = document.getElementById(id);
          return e ? [e.hidden, e.lang, e.innerHTML] : null;
        }),
      }),
    );
  } catch (e) {}
}

// ----- the calendar page -----

function page() {
  return /** @type {HTMLElement | null} */ (document.getElementById("cal"));
}
function isOpen() {
  var c = page();
  return !!c && !c.hidden;
}

/** The month (worked out once while the page is open) @param {number} y @param {number} m 1–12 */
function monthOf(y, m) {
  var pl = where();
  if (!pl) return [];
  var k = pl.lat + "," + pl.lon + ":" + y + "-" + m;
  if (!months[k]) months[k] = monthPanchang(y, m, pl);
  return months[k];
}

/** One row of the day card: a label (a name), a value and its small line @param {Name} dt @param {string} dd @param {string} small */
function row(dt, dd, small) {
  return "<dt>" + nameH(dt) + "</dt><dd>" + dd + (small ? '<small lang="' + (ui() === "mr" ? mrLang() : ui()) + '">' + small + "</small>" : "") + "</dd>";
}

/** The day card for view.day */
function dayRender() {
  var box = document.getElementById("cald"),
    L = skLoc(),
    pl = where();
  if (!box || !L || !pl) return;
  var w = words(),
    k = view.day,
    d = dateOf(k),
    p = dayPanchang(k, pl),
    md = monthOf(d.getFullYear(), d.getMonth() + 1)[d.getDate() - 1],
    pic = /** @type {HTMLImageElement | null} */ (document.querySelector("#iconb img")),
    src = pic ? pic.getAttribute("src") || "" : "",
    s = p.samvatsara,
    dateLine = menuWords("dates").dayYear(d.getDay(), d.getDate(), d.getMonth(), d.getFullYear());
  // the small lines: the name in the second reading language and when it ends; the tithi's also has kshaya / vriddhi /
  // borderline notes
  var two = !!second();
  /** @param {Name} n @param {Date} t */
  var then = function (n, t) {
    return (two ? nameH2(n) + " · " : "") + esc(until(t, k));
  };
  var tSmall = then(tithiName(p.tithi), p.tithi.endsAt);
  if (md && md.kshaya.length)
    tSmall +=
      "<br>" +
      esc(w.kshaya) +
      md.kshaya
        .map(function (n) {
          var t = monthTithi(n);
          return two ? nameH2(t) : nameH(t);
        })
        .join(", ");
  if (md && md.vriddhi) tSmall += "<br>" + esc(w.vriddhi);
  if (p.tithi.borderline) tSmall += "<br>" + esc(w.near);
  var fs = festsOn(k, pl),
    hr = holsOn(k, pl),
    hs = hr.map(holName),
    tags = md ? marks(md) : [],
    masa = cat(" ", (p.masa.adhikaName ? [p.masa.adhikaName] : []).concat([p.masa.name]));
  // "शके १९४८ · पराभव संवत्सर" / "Shaka 1948 · Parabhava"; "शरद ऋतु · दक्षिणायन" / "Sharad · Dakshinayana"
  /** @param {string} l */
  var sam = function (l) {
    return cat(" · ", [shaka(s.shaka), l === "mr" ? cat(" ", [s.name, N.samvatsara]) : s.name]);
  };
  /** @param {string} l */
  var ritu = function (l) {
    return cat(" · ", [l === "mr" ? cat(" ", [p.ritu.name, { mr: "ऋतु", en: "" }]) : p.ritu.name, p.ayana.name]);
  };
  var today = keyOf(new Date());
  box.innerHTML =
    // on the Day tab, ‹ › to the day before or after, and Today
    (view.mode === "day"
      ? '<div class="cdnav">' +
        '<button type="button" class="cnav" data-dd="-1">' +
        ICON.prev +
        '<span class="sr">' +
        esc(w.prevDay) +
        "</span></button>" +
        '<span class="cdnt">' +
        say(dayLabel(k)) +
        "</span>" +
        '<button type="button" class="cnav" data-dd="1">' +
        ICON.next +
        '<span class="sr">' +
        esc(w.nextDay) +
        "</span></button>" +
        // Today keeps its room on today (out of sight and out of reach), so ‹ the date › never move
        '<button type="button" class="ctod' +
        (k === today ? " off" : "") +
        '" data-dd="0">' +
        say(w.todayB) +
        "</button>" +
        "</div>"
      : "") +
    '<div class="cdh">' +
    (src ? '<img src="' + esc(src) + '" alt="" width="64" height="64">' : "") +
    "<div>" +
    '<h3 id="cdt" tabindex="-1">' +
    nameH(title(p)) +
    "</h3>" +
    '<p class="cdd">' +
    say(dateLine) +
    (k === today ? " · " + say(w.today) : "") +
    "</p>" +
    (tags.length || fs.length || hs.length
      ? '<p class="cdg">' +
        // each with its drawing (js/core/fest-icons.js)
        fs
          .map(function (f) {
            return '<span class="tgi">' + festIcon(f.id) + fname(f, "tag fest") + "</span>";
          })
          .concat(
            hs.map(function (h, i) {
              return '<span class="tgi">' + holIcon(hr[i].groups) + nameH(h, "tag hol") + "</span>";
            }),
          )
          .join(" ") +
        ((fs.length || hs.length) && tags.length ? " " : "") +
        tags
          .map(function (t) {
            return nameH(t, "tag");
          })
          .join(" ") +
        "</p>"
      : "") +
    "</div></div>" +
    "<dl>" +
    (fs.length
      ? row(
          N.festival,
          fs
            .map(function (f) {
              return fwiki(f);
            })
            .join(say(", ")),
          two
            ? fs
                .map(function (f) {
                  return nameH2(f);
                })
                .join(say(", "))
            : "",
        )
      : "") +
    (hs.length
      ? row(
          N.holiday,
          hs
            .map(function (h) {
              return fwiki(h);
            })
            .join(say(", ")),
          two
            ? hs
                .map(function (h) {
                  return nameH2(h);
                })
                .join(say(", "))
            : "",
        )
      : "") +
    row(N.tithi, nameH(tithiName(p.tithi)), tSmall) +
    row(N.nakshatra, nameH(p.nakshatra.name), then(p.nakshatra.name, p.nakshatra.endsAt)) +
    row(N.yoga, nameH(p.yoga.name), then(p.yoga.name, p.yoga.endsAt)) +
    row(N.vara, nameH(p.vara.name), nameH2(p.vara.name)) +
    row(N.sunrise, say(p.sunrise ? clock(p.sunrise) : "—"), esc(w.sunset + " " + (p.sunset ? clock(p.sunset) : "—") + " · " + placeName(L))) +
    row(N.moonrise, say(p.moonrise ? clock(p.moonrise) : "—"), p.moonrise ? "" : esc(w.noRise)) +
    row(N.masa, nameH(masa), two ? nameH2(masa) + esc(" (" + w.amanta + ")") : esc(w.amanta)) +
    row(N.samvatsara, nameH(sam(lead())), two ? nameH2(sam(second() || "en")) : "") +
    row(N.rituAyana, nameH(ritu(lead())), two ? nameH2(ritu(second() || "en")) : "") +
    "</dl>";
}

/** The tithi name for 1–30 (for kshaya notes) @param {number} n @returns {Name} */
function monthTithi(n) {
  if (n === 15) return N.purnima;
  if (n === 30) return N.amavasya;
  var i = (n - 1) % 15;
  return cat(" ", [n < 15 ? PAKSHA.shukla : PAKSHA.krishna, { mr: TN.mr[i], en: TN.en[i] }]);
}
const TN = {
  mr: ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी", "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी"],
  en: [
    "Pratipada",
    "Dvitiya",
    "Tritiya",
    "Chaturthi",
    "Panchami",
    "Shashthi",
    "Saptami",
    "Ashtami",
    "Navami",
    "Dashami",
    "Ekadashi",
    "Dvadashi",
    "Trayodashi",
    "Chaturdashi",
  ],
};

/** The day's marks: पौर्णिमा, अमावास्या, एकादशी, संकष्टी (अंगारकी on a Tuesday) @param {MonthDay} md */
function marks(md) {
  /** @type {Name[]} */
  var t = [];
  if (md.purnima) t.push(N.purnima);
  if (md.amavasya) t.push(N.amavasya);
  if (md.ekadashi) t.push(N.ekadashi);
  if (md.sankashti) t.push(md.vara === 2 ? N.angSk : N.sankashti);
  return t;
}

/** A name in a day of the month: the first reading language only, a long English one may break
 * @param {Name} n @param {string} cls @param {string} [mark] a small drawing before it (a festival's, a holiday's flag) */
function cell(n, cls, mark) {
  var l = lead();
  return '<span lang="' + langOf(l) + '" class="' + cls + '">' + (mark || "") + (l === "en" ? hy(esc(txt(n, l))) : esc(txt(n, l))) + "</span>";
}

/** The month table for view.y / view.m */
function monthRender() {
  var box = document.getElementById("calm");
  if (!box) return;
  var w = words(),
    E = nameLang() === "en",
    y = view.y,
    m = view.m,
    days = monthOf(y, m),
    fm = monthFests(y, m),
    hm = monthHols(y, m),
    today = keyOf(new Date()),
    first = new Date(y, m - 1, 1).getDay(),
    py = m === 1 ? y - 1 : y,
    pm = m === 1 ? 12 : m - 1,
    ny = m === 12 ? y + 1 : y,
    nm = m === 12 ? 1 : m + 1;
  // which lunar months the Gregorian month spans: "भाद्रपद → आश्विन (११ ऑक्टोबरपासून)"; the months' names in the
  // first reading language, the date in the menu language
  var sub = "";
  days.forEach(function (d, i) {
    var nmM = nameH(cat(" ", (d.masa.adhika ? [{ mr: "अधिक", en: "Adhika" }] : []).concat([d.masa.name])));
    if (i === 0) sub = nmM;
    else if (d.masa.n !== days[i - 1].masa.n || d.masa.adhika !== days[i - 1].masa.adhika) sub += " → " + nmM + say(menuWords("dates").from(d.day, m - 1));
  });
  var mName = menuWords("dates").monthYear(m - 1, y);
  var html =
    '<div class="cmh">' +
    '<button type="button" class="cnav" id="calp" data-y="' +
    py +
    '" data-m="' +
    pm +
    '">' +
    ICON.prev +
    '<span class="sr">' +
    esc(w.prev) +
    ": " +
    esc(menuWords("dates").monthYear(pm - 1, py)) +
    "</span></button>" +
    '<h3 id="cmt">' +
    say(mName) +
    '<span class="cms">' +
    sub +
    "</span></h3>" +
    '<button type="button" class="cnav" id="caln" data-y="' +
    ny +
    '" data-m="' +
    nm +
    '">' +
    ICON.next +
    '<span class="sr">' +
    esc(w.nextM) +
    ": " +
    esc(menuWords("dates").monthYear(nm - 1, ny)) +
    "</span></button>" +
    "</div>" +
    '<table class="cgr" aria-labelledby="cmt"><thead><tr>' +
    MR_WD.map(function (x, i) {
      var wd = { mr: x, en: DAYS.en[i].slice(0, 3), ia: DAYS.en[i].slice(0, 3) };
      return (
        '<th scope="col"><span aria-hidden="true" lang="' +
        langOf(lead()) +
        '">' +
        esc(txt(wd, lead())) +
        '</span><span class="sr">' +
        esc(scr(menuWords("dates").days[i])) +
        "</span></th>"
      );
    }).join("") +
    "</tr></thead><tbody><tr>";
  var col = 0;
  for (; col < first; col++) html += '<td class="ce"></td>';
  // the one day Tab lands on: the day shown in the card when it is in this month, else today, else the 1st
  var focusDay = days.some(function (d) {
    return d.date === view.day;
  })
    ? view.day
    : days.some(function (d) {
          return d.date === today;
        })
      ? today
      : days.length
        ? days[0].date
        : "";
  days.forEach(function (d) {
    if (col === 7) {
      html += "</tr><tr>";
      col = 0;
    }
    col++;
    var t = d.tithi,
      kr = t.paksha === "krishna",
      isT = d.date === today,
      sel = d.date === view.day,
      tn = t.name,
      fs = fm[d.date] || [],
      hs = hm[d.date] || [],
      // a festival's own label stands for एकादशी on आषाढी / कार्तिकी एकादशी
      lab = d.ekadashi && !fs.length ? N.ekadashi : null,
      skl = d.sankashti ? (d.vara === 2 ? N.angaraki : N.sankashti) : null,
      moon = d.purnima ? "full" : d.amavasya ? "new" : "",
      // what a screen reader hears beyond what is shown: the date, the paksha, today, the marks
      srBefore = menuWords("dates").before(m - 1, d.vara),
      srAfter = [E ? tithiText(t, "en") : t.n === 15 || t.n === 30 ? "" : t.pakshaName.mr + " पक्ष"]
        .concat(d.purnima && t.n !== 15 ? [E ? "Purnima" : "पौर्णिमा"] : [])
        .concat(d.amavasya && t.n !== 30 ? [E ? "Amavasya" : "अमावास्या"] : [])
        .concat(
          d.kshaya.length
            ? [
                w.kshaya +
                  d.kshaya
                    .map(function (n) {
                      return E ? monthTithi(n).en : monthTithi(n).mr;
                    })
                    .join(", "),
              ]
            : [],
        )
        .concat(
          fs.length && E
            ? fs.map(function (f) {
                return f.en;
              })
            : [],
        )
        .concat(
          hs.length && E
            ? hs.map(function (h) {
                return h.en;
              })
            : [],
        )
        .concat(d.vriddhi ? [w.vriddhi] : [])
        .concat(isT ? [w.today] : [])
        .filter(Boolean)
        .join(", ");
    html +=
      '<td class="' +
      (kr ? "kr" : "sh") +
      '">' +
      '<button type="button" class="cd' +
      (isT ? " today" : "") +
      '" data-d="' +
      d.date +
      '" tabindex="' +
      (d.date === focusDay ? "0" : "-1") +
      '" aria-pressed="' +
      sel +
      '"' +
      (isT ? ' aria-current="date"' : "") +
      ">" +
      '<b lang="' +
      (E ? "en" : mrLang()) +
      '">' +
      num(d.day) +
      "</b>" +
      '<span class="sr" lang="' +
      (E ? "en" : mrLang()) +
      '">' +
      esc(scr(srBefore)) +
      "</span>" +
      cell(tn, "t") +
      (d.kshaya.length
        ? '<span class="kx" lang="' +
          langOf(lead()) +
          '">+' +
          d.kshaya
            .map(function (n) {
              return hy(esc(txt(n === 15 ? N.purnima : n === 30 ? N.amavasya : { mr: TN.mr[(n - 1) % 15], en: TN.en[(n - 1) % 15] }, lead())));
            })
            .join(" +") +
          "</span>"
        : "") +
      (moon ? '<span class="mn ' + moon + '" aria-hidden="true"></span>' : "") +
      fs
        .map(function (f) {
          return cell(f.short, "fs", festMark(f.id));
        })
        .join("") +
      hs
        .map(function (h) {
          return cell(h.short, "hs", holMark(h.groups));
        })
        .join("") +
      (lab ? cell(lab, "f") : "") +
      (skl ? cell(skl, "f", markHtml("crescent")) : "") +
      (d.vriddhi ? '<span class="vr" aria-hidden="true">' + (E ? "vriddhi" : esc(scr("वृद्धी"))) + "</span>" : "") +
      '<span class="sr" lang="' +
      (E ? "en" : mrLang()) +
      '">, ' +
      esc(scr(srAfter)) +
      "</span>" +
      "</button></td>";
  });
  for (; col < 7; col++) html += '<td class="ce"></td>';
  html +=
    "</tr></tbody></table>" +
    '<p class="ckey">' +
    '<span><i class="ks" aria-hidden="true"></i>' +
    say(w.key[0]) +
    "</span>" +
    '<span><i class="kk" aria-hidden="true"></i>' +
    say(w.key[1]) +
    "</span>" +
    '<span><i class="mn full" aria-hidden="true"></i>' +
    say(w.key[2]) +
    "</span>" +
    '<span><i class="mn new" aria-hidden="true"></i>' +
    say(w.key[3]) +
    "</span>" +
    '<span class="kn">' +
    say(w.keyNote) +
    "</span>" +
    "</p>";
  box.innerHTML = html;
}

/** The 15 days (#calu): from view.uFrom (at first the day the calendar was opened at, or the Day tab's), by week, with ‹ › to the 15 before or after, and the buttons
 * that choose what it shows */
function upRender() {
  var box = document.getElementById("calu"),
    L = skLoc(),
    pl = where();
  if (!box || !L || !pl) return;
  var w = words(),
    t = keyOf(new Date()),
    s = view.uFrom || t,
    now = s === t,
    end = addDays(s, 14),
    mid = addDays(s, 6),
    all = upList(s, end, pl).filter(function (u) {
      return upShow[u.kind];
    }),
    a = all.filter(function (u) {
      return u.date <= mid;
    }),
    b = all.filter(function (u) {
      return u.date > mid;
    });
  /** @param {string} x @param {string} y */
  function range(x, y) {
    return dayLabel(x) + " – " + dayLabel(y);
  }
  /** @param {string} h @param {Up[]} us */
  function group(h, us) {
    return us.length
      ? '<h4 class="uph4">' +
          say(h) +
          '</h4><ul class="upl">' +
          us
            .map(function (u) {
              return upRow(u, t);
            })
            .join("") +
          "</ul>"
      : "";
  }
  box.innerHTML =
    '<div class="cmh">' +
    '<button type="button" class="cnav" data-u="-15">' +
    ICON.prev +
    '<span class="sr">' +
    esc(w.prevU) +
    "</span></button>" +
    '<h3 id="cut" tabindex="-1">' +
    // the same lines on every day (the title, the dates, the place), each short enough for a phone, so the list below
    // never moves as ‹ › go from today (the dates and the place on one line wrapped on phones on today only)
    say(now ? w.upTitle : w.up) +
    '<span class="cms">' +
    say(range(s, end)) +
    "</span>" +
    '<span class="cms">' +
    say(placeName(L)) +
    "</span></h3>" +
    '<button type="button" class="cnav" data-u="15">' +
    ICON.next +
    '<span class="sr">' +
    esc(w.nextU) +
    "</span></button>" +
    "</div>" +
    // Today keeps its room on today, so the list below does not jump down when the 15 days move away from today
    '<p class="cto"><button type="button" data-u="0"' +
    (now ? ' class="off"' : "") +
    ">" +
    say(w.todayB) +
    "</button></p>" +
    '<div class="upk" role="group" aria-label="' +
    esc(w.view) +
    '">' +
    KINDS.map(function (k) {
      return '<button type="button" data-k="' + k + '" aria-pressed="' + upShow[k] + '"><span>' + say(w.kinds[k]) + "</span></button>";
    }).join("") +
    "</div>" +
    group(now ? w.week : range(s, mid), a) +
    group(now ? w.nextWeek : range(addDays(mid, 1), end), b) +
    (a.length || b.length ? "" : '<p class="upe">' + say(w.uNone) + "</p>");
}

/** Draw the whole page in the menu language */
function calRender() {
  var c = page(),
    L = skLoc();
  if (!c) return;
  var l = ui(),
    // Back's word in the menu language (css/02-core.css: .mr / .en by data-lang)
    bar = /** @type {HTMLElement | null} */ (c.querySelector(".calbar"));
  if (bar) bar.setAttribute("data-lang", l);
  c.lang = l;
  calKey = langKey();
  var note = document.getElementById("caln0"),
    w = words(),
    mode = view.mode;
  c.setAttribute("data-mode", mode);
  if (note) note.innerHTML = L ? say(w.note(placeName(L))) : "";
  // Day | 15 days | Month: one at a time, filling the page, the same on every screen (Satish, 2026-10-24)
  var v = document.getElementById("calv");
  if (v) {
    var tabs = /** @type {("day" | "up" | "month")[]} */ (["day", "up", "month"]);
    v.className = "n" + tabs.length;
    v.innerHTML = tabs
      .map(function (m) {
        return (
          '<button type="button" data-v="' + m + '" aria-pressed="' + (mode === m) + '">' + say(m === "up" ? w.up : m === "day" ? w.day : w.month) + "</button>"
        );
      })
      .join("");
  }
  /** @param {string} id @param {boolean} show */
  function show(id, show) {
    var e = document.getElementById(id);
    if (e) e.hidden = !show;
    return show;
  }
  if (show("cald", mode === "day")) dayRender();
  show("caln0", mode === "month");
  if (show("calm", mode === "month")) monthRender();
  if (show("calu", mode === "up")) upRender();
}

/**
 * The day Home shows ("YYYY-MM-DD", or "" for today), from ‹ › beside the date (js/features/today-card.js): the
 * calendar card, its tint and Coming up follow it, and the card opens the calendar at it
 * @param {string} k
 */
export function homeDay(k) {
  if (k === homeAt) return;
  homeAt = k;
  skDay(k);
  // the day's festivals, heard with the card's name, were the day before's: emptied until the new day's are worked out
  // (homeSoon)
  var f = document.getElementById("pn4");
  if (f) f.textContent = "";
  homeSoon();
}

/**
 * Open the calendar at a tab: the day (today, or `day`), the 15 days from it or the month
 * @param {"day" | "month" | "up"} [mode] @param {string} [day] "YYYY-MM-DD"
 * @param {string} [by] the card it was opened from, "#panb" or "#upwm": only that one is marked open
 */
export function calOpen(mode, day, by) {
  var c = page();
  if (!c || !skLoc()) return;
  var now = day ? dateOf(day) : new Date();
  view.day = keyOf(now);
  view.y = now.getFullYear();
  view.m = now.getMonth() + 1;
  view.mode = mode || "day";
  view.from = "";
  subOn = false;
  // the 15 days start at the day it was opened at (the day Home shows), as the Day tab and the month do
  view.uFrom = view.day;
  // drawn before the page is shown, so it never shows empty for a moment (a day or 15 days take a few ms; on wide
  // screens the month too, about 50 ms, less once worked out)
  calRender();
  setC(true);
  // (setC marks every card that opens the calendar; the other one is not open)
  var other = by === "#upwm" ? "#panb" : "#upwm",
    o = document.querySelector(other);
  if (o) o.setAttribute("aria-expanded", "false");
  if (day && view.mode === "month") focusDay(day);
}

/** The day shown in the card, and its month @param {string} k "YYYY-MM-DD" */
function setDay(k) {
  var d = dateOf(k);
  view.day = k;
  view.y = d.getFullYear();
  view.m = d.getMonth() + 1;
}
/** Say which day the card shows (screen readers) */
function announce() {
  var live = document.getElementById("call"),
    p = /** @type {HTMLElement | null} */ (document.getElementById("cdt")),
    d = dateOf(view.day);
  if (live) live.textContent = words().showing(d.getDate(), d.getMonth(), p ? p.textContent || "" : "");
}
// The Day tab at a day tapped in the month or the 15 days has its own step in the browser's history, so the
// phone's Back returns to that tab, as the page's Back does (ovSub in js/features/history.js)
var subOn = false;
function subPush() {
  if (subOn) return;
  subOn = true;
  ovSub(function () {
    subOn = false;
    back(true);
  });
}
function subDrop() {
  if (!subOn) return;
  subOn = false;
  ovSubDone();
}
/** The Day tab at a day tapped in the month or the 15 days, which Back returns to
 * @param {string} k @param {"month" | "up"} from */
function toDay(k, from) {
  setDay(k);
  view.mode = "day";
  view.from = from;
  subPush();
  calRender();
  // the month, out of sight, marks the day too
  if (from === "month") monthRender();
  announce();
  var h = document.getElementById("cdt");
  if (h) h.focus();
}
/** Back (the page's button, Escape, or the phone's Back): to the tab the day was tapped in, else close the page
 * @param {boolean} [fromPop] the phone's Back, which has taken its step already */
function back(fromPop) {
  if (view.mode === "day" && view.from) {
    if (!fromPop) subDrop();
    view.mode = view.from;
    view.from = "";
    if (view.mode === "month") setDay(view.day);
    calRender();
    var b = /** @type {HTMLElement | null} */ (
      document.querySelector(view.mode === "month" ? '#calm button[data-d="' + view.day + '"]' : '#calu .upr[data-d="' + view.day + '"]')
    );
    if (b) {
      if (view.mode === "month") focusDay(view.day);
      else b.focus();
    } else {
      var t = document.querySelector('#calv [aria-pressed="true"]');
      if (t) /** @type {HTMLElement} */ (t).focus();
    }
    return;
  }
  if (fromPop) return;
  subDrop();
  setC(false);
}

/** @param {string} k */
function focusDay(k) {
  var b = /** @type {HTMLElement | null} */ (document.querySelector('#calm button[data-d="' + k + '"]'));
  if (b) {
    [].forEach.call(document.querySelectorAll("#calm button.cd"), function (/** @type {HTMLElement} */ x) {
      x.tabIndex = x === b ? 0 : -1;
    });
    b.focus();
  }
}

/** Another month in the table (the card keeps its day) @param {number} y @param {number} m @param {string} [focusKey] */
function showMonth(y, m, focusKey) {
  view.y = y;
  view.m = m;
  monthRender();
  if (focusKey) focusDay(focusKey);
}

/** Re-draw for the languages, the script, the day and the place (called by apply(), js/features/bars.js) */
export function calLang() {
  holSet();
  homeSoon();
  if (isOpen() && calKey !== langKey()) calRender();
}

/** Settings' holiday buttons (#shol) as the person reading has them (P.hol) */
function holSet() {
  var h = (P && P.hol) || [];
  [].forEach.call(document.querySelectorAll("#shol button"), function (/** @type {HTMLElement} */ b) {
    b.setAttribute("aria-pressed", String(h.indexOf(b.dataset.v || "") >= 0));
  });
}

export function init() {
  // Settings: a holiday group's button adds it to Coming up, or takes it away
  var shol = document.getElementById("shol");
  if (shol)
    shol.addEventListener("click", function (e) {
      var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest("button"));
      if (!b || !b.dataset.v) return;
      var g = b.dataset.v,
        h = ((P && P.hol) || []).filter(function (/** @type {string} */ x) {
          return x !== g;
        });
      if (h.length === ((P && P.hol) || []).length) h.push(g);
      change({ hol: h }, function () {
        holSet();
        homeSoon();
      });
    });
  holSet();
  var pan = document.getElementById("pan"),
    c = page();
  if (pan)
    pan.addEventListener("click", function (e) {
      var t = /** @type {HTMLElement} */ (e.target),
        sun = /** @type {HTMLElement | null} */ (t.closest(".psun"));
      if (sun) openPicture(sun.getAttribute("data-pic") === "sunset" ? "sunset" : "sunrise", sun);
      else if (t.closest("#panb")) calOpen("day", homeAt || undefined, "#panb");
    });
  // the date above the line is the top of the same card: a tap there opens the calendar too
  var tdd = document.getElementById("tdd");
  if (tdd)
    tdd.addEventListener("click", function (e) {
      // (‹ › under the date are its own buttons: js/features/today-card.js)
      if (/** @type {HTMLElement} */ (e.target).closest("#tdn")) return;
      if (skLoc()) calOpen("day", homeAt || undefined, "#panb");
    });
  // The date is not a button: a press there would move focus to the page (#main), which closes the calendar when it is
  // open (history.js, focusout) before the click opens it again; focus stays where it is
  var tdm = document.getElementById("tdd");
  if (tdm)
    tdm.addEventListener("mousedown", function (e) {
      if (!(/** @type {HTMLElement} */ (e.target).closest("#tdn"))) e.preventDefault();
    });
  var upw = document.getElementById("upw");
  if (upw)
    upw.addEventListener("click", function (e) {
      var t = /** @type {HTMLElement} */ (e.target),
        r = /** @type {HTMLElement | null} */ (t.closest(".upr"));
      // the heading folds or opens the list
      if (t.closest("#upwf")) {
        upFold();
        return;
      }
      // the row tapped stays marked while its day is open (css/12-calendar.css)
      [].forEach.call(document.querySelectorAll("#upw .on"), function (/** @type {HTMLElement} */ x) {
        x.classList.remove("on");
      });
      if (r && r.dataset.d) {
        r.classList.add("on");
        calOpen("day", r.dataset.d, "#upwm");
      }
      // 15 days ›: the calendar's 15 days, from the day shown
      else if (t.closest("#upwm")) calOpen("up", homeAt || undefined, "#upwm");
    });
  if (c) {
    var bk = document.getElementById("cbk");
    if (bk)
      bk.addEventListener("click", function () {
        back();
      });
    c.addEventListener("click", function (e) {
      var t = /** @type {HTMLElement} */ (e.target),
        b = /** @type {HTMLElement | null} */ (t.closest("button"));
      if (!b) return;
      if (b.classList.contains("cd") && b.dataset.d) {
        // a day in the month: its day on the Day tab (Back returns to the month)
        toDay(b.dataset.d, "month");
      } else if (b.dataset.v) {
        // Day | 15 days | Month
        view.mode = /** @type {"day" | "month" | "up"} */ (b.dataset.v);
        view.from = "";
        subDrop();
        if (view.mode === "month") {
          var vd = dateOf(view.day);
          view.y = vd.getFullYear();
          view.m = vd.getMonth() + 1;
        }
        // the 15 days from the day shown on the Day tab or picked in the month
        if (view.mode === "up") view.uFrom = view.day;
        calRender();
        var v = /** @type {HTMLElement | null} */ (document.querySelector('#calv [data-v="' + view.mode + '"]'));
        if (v) v.focus();
      } else if (b.dataset.k && b.closest(".upk")) {
        // what the 15 days show
        var k = /** @type {UpKind} */ (b.dataset.k);
        upShow[k] = !upShow[k];
        upRender();
        var again0 = /** @type {HTMLElement | null} */ (document.querySelector('#calu [data-k="' + k + '"]'));
        if (again0) again0.focus();
      } else if (b.classList.contains("upr") && b.dataset.d) {
        // an entry: its day on the Day tab (Back returns to the 15 days)
        toDay(b.dataset.d, "up");
      } else if (b.dataset.u) {
        // the 15 days before or after, or from today
        var u = +b.dataset.u;
        view.uFrom = u ? addDays(view.uFrom || keyOf(new Date()), u) : keyOf(new Date());
        upRender();
        var again1 = /** @type {HTMLElement | null} */ (u ? document.querySelector('#calu [data-u="' + u + '"]') : document.getElementById("cut"));
        if (again1) again1.focus();
      } else if (b.dataset.dd) {
        // the day before or after, or today
        var dd = +b.dataset.dd;
        setDay(dd ? addDays(view.day, dd) : keyOf(new Date()));
        dayRender();
        announce();
        var again2 = /** @type {HTMLElement | null} */ (dd ? document.querySelector('#cald [data-dd="' + dd + '"]') : document.getElementById("cdt"));
        if (again2) again2.focus();
      } else if (b.classList.contains("cnav")) {
        var id = b.id;
        showMonth(+(b.dataset.y || 0), +(b.dataset.m || 0));
        var again = document.getElementById(id);
        if (again) again.focus();
      }
    });
    // Keyboard in the month: arrows move a day or a week (into the next or previous month at the ends), Page Up /
    // Page Down a month, Home / End the week's ends; Enter or Space shows the day (it is a button)
    c.addEventListener("keydown", function (e) {
      var b = /** @type {HTMLElement} */ (e.target);
      if (!b.classList || !b.classList.contains("cd") || !b.dataset.d) return;
      var d = dateOf(b.dataset.d),
        n = new Date(d);
      if (e.key === "ArrowLeft") n.setDate(d.getDate() - 1);
      else if (e.key === "ArrowRight") n.setDate(d.getDate() + 1);
      else if (e.key === "ArrowUp") n.setDate(d.getDate() - 7);
      else if (e.key === "ArrowDown") n.setDate(d.getDate() + 7);
      else if (e.key === "Home") n.setDate(d.getDate() - d.getDay());
      else if (e.key === "End") n.setDate(d.getDate() + 6 - d.getDay());
      else if (e.key === "PageUp" || e.key === "PageDown") {
        n = new Date(d.getFullYear(), d.getMonth() + (e.key === "PageUp" ? -1 : 1), 1);
        var last = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
        n.setDate(Math.min(d.getDate(), last));
      } else return;
      e.preventDefault();
      var k = keyOf(n);
      if (n.getFullYear() !== view.y || n.getMonth() + 1 !== view.m) showMonth(n.getFullYear(), n.getMonth() + 1, k);
      else focusDay(k);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) back();
    });
  }
  // the day can change while the page is open: check again when it comes back into view
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) homeSoon();
  });
  // a new place (the pin, js/features/sankashti.js useMyLocation)
  document.addEventListener("nitya-place", homeSoon);
  homeSoon();
  midnight();
}

// A page left open on screen (Keep screen on, an iPad on a stand): at midnight the Home line, the festival line, This week
// and the Sankashti line move to the new day with the date (js/features/today-card.js has its own timer)
/** @type {ReturnType<typeof setTimeout> | undefined} */
var midT;
function midnight() {
  var n = new Date(),
    m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 1);
  clearTimeout(midT);
  midT = setTimeout(function () {
    homeSoon();
    skLang();
    midnight();
  }, m.getTime() - n.getTime());
}

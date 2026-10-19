// @ts-check
// The Vedic calendar (panchang), worked out on this phone by js/core/panchang.js for the place moonrise uses
// (skLoc() in js/features/sankashti.js); nothing is fetched or sent anywhere. Approved design: mockups/home-v2-a.html
// (the line on Home) and mockups/vedic-calendar.html (the calendar page) on branch mockup-home-v2; docs/decisions.md.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// - Home (#pan): one button under the date, "आश्विन शुद्ध अष्टमी" / "नक्षत्र … · शके १९४८ · पराभव संवत्सर" / sunrise,
//   sunset and the place. Only today is worked out (one dayPanchang(), a few milliseconds), after the page is shown.
// - The calendar page (#cal), opened by that button: like the Library page (#jump) it sits under the top bar with a
//   Back button, the phone's Back closes it (js/features/history.js) and focus returns to the button (overlays.js
//   setC). A day card (tithi, nakshatra and yoga with their end times, vara, sunrise and sunset, moonrise, month,
//   samvatsara, ritu and ayana, the next Sankashti) and the month as a table of buttons: each day's tithi at sunrise,
//   shukla / krishna shading, full and new moon, Ekadashi and Sankashti, kshaya and vriddhi tithis, today. A month is
//   worked out only when it is shown (monthPanchang(), ~50 ms) and kept while the page is open.
// Words: the panchang's names are Marathi (as the approved design and the Home date's first line); the words around
// them (glosses, times, dates, buttons, the key, the footnote) follow the menu language, P.ui, with Devanagari digits
// in Marathi menus. In Kannada letters (Settings), the Marathi names are shown in Kannada letters, as titles are.

import { P } from "../core/state.js";
import { dayPanchang, monthPanchang } from "../core/panchang.js";
import { skLoc, skNext, skFmt, skMid } from "./sankashti.js";
import { setC } from "./overlays.js";

/**
 * @typedef {import("../core/panchang.js").DayPanchang} DayPanchang
 * @typedef {import("../core/panchang.js").MonthDay} MonthDay
 * @typedef {import("../core/panchang-names.js").Name} Name
 * @typedef {{ lat: number, lon: number, mr: string, en: string }} Where
 */

const MR_MONTHS = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MR_DAYS = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MR_WD = ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"];

// The words around the names, in the menu language
const W = {
  en: {
    open: " (open the Vedic calendar)",
    sunrise: "Sunrise",
    sunset: "Sunset",
    moonrise: "Moonrise",
    noRise: "No moonrise this day",
    until: "until ",
    amanta: "amanta",
    today: "today",
    next: "Next",
    skToday: "Sankashti Chaturthi today",
    prev: "Previous month",
    nextM: "Next month",
    key: ["Shukla paksha", "Krishna paksha", "Purnima", "Amavasya"],
    keyNote: "Tithi at sunrise · + a tithi that begins and ends before the next sunrise (kshaya)",
    vriddhi: "same tithi as the day before (vriddhi)",
    kshaya: "kshaya tithi: ",
    near: "Close to sunrise: a printed calendar may give the neighbouring tithi.",
    /** @param {string} p */
    note: function (p) {
      return "Worked out on this phone for " + p + ". Tap a day to see its details.";
    },
    showing: "Showing ",
  },
  mr: {
    open: " (पंचांग उघडा)",
    sunrise: "सूर्योदय",
    sunset: "सूर्यास्त",
    moonrise: "चंद्रोदय",
    noRise: "या दिवशी चंद्रोदय नाही",
    until: "",
    amanta: "अमान्त",
    today: "आज",
    next: "पुढील",
    skToday: "संकष्टी चतुर्थी आज",
    prev: "मागचा महिना",
    nextM: "पुढचा महिना",
    key: ["शुद्ध पक्ष", "वद्य पक्ष", "पौर्णिमा", "अमावास्या"],
    keyNote: "सूर्योदयाची तिथी · + पुढच्या सूर्योदयापूर्वीच संपणारी (क्षय) तिथी",
    vriddhi: "आदल्या दिवसाचीच तिथी (वृद्धी)",
    kshaya: "क्षय तिथी: ",
    near: "सूर्योदयाच्या अगदी जवळ: छापील पंचांगात शेजारची तिथी असू शकते.",
    /** @param {string} p */
    note: function (p) {
      return "हे पंचांग या फोनवर " + p + " साठी काढले आहे. तपशील पाहण्यासाठी एखादा दिवस निवडा.";
    },
    showing: "",
  },
};

const ICON = {
  cal: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v5M9.5 6.5 12 4l2.5 2.5"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v5M9.5 6.5 12 9l2.5-2.5"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  prev: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" fill="currentColor"/></svg>',
};

/** The calendar page's state while it is open */
var view = {
  /** @type {string} the day shown in the day card, "YYYY-MM-DD" */
  day: "",
  y: 0,
  /** 1–12 */
  m: 0,
};
/** @type {Record<string, MonthDay[]>} months worked out while the page is open, by place and month */
var months = {};
var homeKey = "",
  calKey = "";
/** @type {ReturnType<typeof setTimeout> | undefined} */
var homeT;

// ----- small helpers -----

function ui() {
  return P && P.ui === "mr" ? "mr" : "en";
}
function words() {
  return W[ui()];
}
/** @param {number | string} n Devanagari digits */
function dv(n) {
  return String(n).replace(/[0-9]/g, function (d) {
    return "०१२३४५६७८९"[+d];
  });
}
/** Digits as the menu language writes them @param {number | string} n */
function num(n) {
  return ui() === "mr" ? dv(n) : String(n);
}
/** @param {string} s */
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// Marathi shown in Kannada letters when that is the chosen script (SCR in js/render.js)
/** @param {string} s */
function scr(s) {
  /** @type {any} */
  var w = window;
  return w.SCR && w.SCR.k ? w.SCR.to(s) : s;
}
function mrLang() {
  /** @type {any} */
  var w = window;
  return (w.SCR && w.SCR.k) || "mr";
}
/** A Marathi name, escaped, in the chosen script, marked with its language @param {string} s @param {string} [cls] */
function mr(s, cls) {
  return '<span lang="' + mrLang() + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + esc(scr(s)) + "</span>";
}
/** @param {string} s @param {string} [cls] */
function en(s, cls) {
  return '<span lang="en"' + (cls ? ' class="' + cls + '"' : "") + ">" + esc(s) + "</span>";
}
/** Text in the menu language, marked with it @param {string} s */
function say(s) {
  return ui() === "mr" ? mr(s) : en(s);
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

/**
 * A clock time on this phone: "7:45 am", or in Marathi "सकाळी ७:४५" (रात्री, पहाटे, सकाळी, दुपारी, सायं.)
 * @param {Date} t
 */
function clock(t) {
  var h = t.getHours(),
    mi = ("0" + t.getMinutes()).slice(-2),
    h12 = ((h + 11) % 12) + 1;
  if (ui() === "en") return h12 + ":" + mi + (h >= 12 ? " pm" : " am");
  var part = h < 4 ? "रात्री" : h < 6 ? "पहाटे" : h < 12 ? "सकाळी" : h < 16 ? "दुपारी" : h < 20 ? "सायं." : "रात्री";
  return part + " " + dv(h12) + ":" + dv(mi);
}
/**
 * "until 1:21 am" (with the weekday when it ends on another day than `day`): "until Mon 1:21 am" / "सोमवारी रात्री
 * १:२१ पर्यंत"
 * @param {Date} t @param {string} day
 */
function until(t, day) {
  var other = keyOf(t) !== day,
    w = words();
  if (ui() === "en") return w.until + (other ? EN_DAYS[t.getDay()].slice(0, 3) + " " : "") + clock(t);
  return (other ? MR_DAYS[t.getDay()] + "ी " : "") + clock(t) + " पर्यंत";
}
/** The place's name in the menu language @param {Where} L */
function placeName(L) {
  return ui() === "mr" ? L.mr : L.en;
}
/** @returns {{ lat: number, lon: number } | null} */
function where() {
  var L = skLoc();
  return L ? { lat: L.lat, lon: L.lon } : null;
}

/**
 * "आश्विन शुद्ध अष्टमी": the month (अधिक when so), the paksha and the tithi; पौर्णिमा and अमावास्या take no paksha
 * @param {DayPanchang} p @param {"mr" | "en"} l
 */
function title(p, l) {
  var t = p.tithi,
    ad = p.masa.adhikaName ? p.masa.adhikaName[l] + " " : "",
    pk = t.n === 15 || t.n === 30 ? "" : t.pakshaName[l] + " ";
  return ad + p.masa.name[l] + " " + pk + t.name[l];
}
/** The paksha and tithi: "शुद्ध अष्टमी" @param {DayPanchang["tithi"]} t @param {"mr" | "en"} l */
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
    return;
  }
  var p;
  try {
    p = dayPanchang(new Date(), pl);
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
  box.innerHTML =
    '<button type="button" id="panb" aria-haspopup="dialog" aria-expanded="false" aria-controls="cal">' +
    ICON.cal +
    '<span class="pt">' +
    mr(title(p, "mr"), "p1") +
    '<span class="p2">' +
    mr("नक्षत्र " + p.nakshatra.name.mr + " · शके " + dv(s.shaka) + " · " + s.name.mr + " संवत्सर") +
    "</span>" +
    '<span class="p3"><span>' +
    ICON.up +
    '<span class="sr">' + esc(w.sunrise) + " </span>" +
    esc(sr) +
    "</span><span>" +
    ICON.down +
    '<span class="sr">' + esc(w.sunset) + " </span>" +
    esc(ss) +
    "</span><span>" +
    esc(placeName(L)) +
    "</span></span></span>" +
    '<span class="sr">' + esc(w.open) + "</span>" +
    ICON.chev +
    "</button>";
  box.hidden = false;
}

/** Re-draw the Home line soon (after the page is shown), when the menu language, the day or the place changed */
function homeSoon() {
  var k = ui() + mrLang() + new Date().toDateString() + JSON.stringify(P.loc || null);
  if (k === homeKey) return;
  homeKey = k;
  var box = document.getElementById("pan");
  // keep the line's room while today is worked out, so the list below does not jump
  if (box && box.hidden && skLoc()) {
    box.innerHTML = '<span class="pwait" aria-hidden="true"></span>';
    box.hidden = false;
  }
  clearTimeout(homeT);
  homeT = setTimeout(function () {
    homeRender();
    if (isOpen()) calRender();
  }, 0);
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

/** One row of the day card: a Marathi label, a value and its small line @param {string} dt @param {string} dd @param {string} small */
function row(dt, dd, small) {
  return "<dt>" + mr(dt) + "</dt><dd>" + dd + (small ? '<small lang="' + (ui() === "mr" ? mrLang() : "en") + '">' + small + "</small>" : "") + "</dd>";
}

/** The day card for view.day */
function dayRender() {
  var box = document.getElementById("cald"),
    L = skLoc(),
    pl = where();
  if (!box || !L || !pl) return;
  var w = words(),
    l = ui(),
    k = view.day,
    d = dateOf(k),
    p = dayPanchang(k, pl),
    md = monthOf(d.getFullYear(), d.getMonth() + 1)[d.getDate() - 1],
    E = l === "en",
    pic = /** @type {HTMLImageElement | null} */ (document.querySelector("#iconb img")),
    src = pic ? pic.getAttribute("src") || "" : "",
    s = p.samvatsara,
    dateLine = E
      ? EN_DAYS[d.getDay()] + ", " + d.getDate() + " " + EN_MONTHS[d.getMonth()] + " " + d.getFullYear()
      : MR_DAYS[d.getDay()] + ", " + dv(d.getDate()) + " " + MR_MONTHS[d.getMonth()] + " " + dv(d.getFullYear());
  // the tithi row's small line: its English name (English menus), when it ends, and kshaya / vriddhi / borderline notes
  var tSmall = (E ? esc(tithiText(p.tithi, "en")) + " · " : "") + esc(until(p.tithi.endsAt, k));
  if (md && md.kshaya.length)
    tSmall +=
      "<br>" +
      esc(w.kshaya) +
      md.kshaya
        .map(function (n) {
          var t = monthTithi(n);
          return E ? esc(t.en) : esc(scr(t.mr));
        })
        .join(", ");
  if (md && md.vriddhi) tSmall += "<br>" + esc(w.vriddhi);
  if (p.tithi.borderline) tSmall += "<br>" + esc(w.near);
  var tags = md ? marks(md) : [];
  var sk = skLine(L);
  box.innerHTML =
    '<div class="cdh">' +
    (src ? '<img src="' + esc(src) + '" alt="" width="64" height="64">' : "") +
    "<div>" +
    '<h3 id="cdt">' + mr(title(p, "mr")) + "</h3>" +
    '<p class="cdd">' + say(dateLine) + (k === keyOf(new Date()) ? " · " + say(w.today) : "") + "</p>" +
    (tags.length
      ? '<p class="cdg">' +
        tags
          .map(function (t) {
            return mr(t, "tag");
          })
          .join(" ") +
        "</p>"
      : "") +
    "</div></div>" +
    "<dl>" +
    row("तिथी", mr(tithiText(p.tithi, "mr")), tSmall) +
    row("नक्षत्र", mr(p.nakshatra.name.mr), (E ? esc(p.nakshatra.name.en) + " · " : "") + esc(until(p.nakshatra.endsAt, k))) +
    row("योग", mr(p.yoga.name.mr), (E ? esc(p.yoga.name.en) + " · " : "") + esc(until(p.yoga.endsAt, k))) +
    row("वार", mr(p.vara.name.mr), E ? esc(p.vara.name.en) : "") +
    row(
      "सूर्योदय",
      say(p.sunrise ? clock(p.sunrise) : "—"),
      esc(w.sunset + " " + (p.sunset ? clock(p.sunset) : "—") + " · " + placeName(L)),
    ) +
    row("चंद्रोदय", say(p.moonrise ? clock(p.moonrise) : "—"), p.moonrise ? "" : esc(w.noRise)) +
    row(
      "मास",
      mr((p.masa.adhikaName ? p.masa.adhikaName.mr + " " : "") + p.masa.name.mr),
      esc((E ? (p.masa.adhikaName ? p.masa.adhikaName.en + " " : "") + p.masa.name.en + " (" + w.amanta + ")" : w.amanta)),
    ) +
    row("संवत्सर", mr("शके " + dv(s.shaka) + " · " + s.name.mr + " संवत्सर"), E ? esc("Shaka " + s.shaka + " · " + s.name.en) : "") +
    row("ऋतु · अयन", mr(p.ritu.name.mr + " ऋतु · " + p.ayana.name.mr), E ? esc(p.ritu.name.en + " · " + p.ayana.name.en) : "") +
    "</dl>" +
    sk;
}

/** The tithi name for 1–30 (for kshaya notes) @param {number} n @returns {Name} */
function monthTithi(n) {
  var pk = n <= 15 ? { mr: "शुद्ध ", en: "Shukla " } : { mr: "वद्य ", en: "Krishna " };
  var names = TN;
  if (n === 15) return { mr: "पौर्णिमा", en: "Purnima" };
  if (n === 30) return { mr: "अमावास्या", en: "Amavasya" };
  var i = (n - 1) % 15;
  return { mr: pk.mr + names.mr[i], en: pk.en + names.en[i] };
}
const TN = {
  mr: ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी", "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी"],
  en: ["Pratipada", "Dvitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dvadashi", "Trayodashi", "Chaturdashi"],
};

/** The day's marks, in Marathi: पौर्णिमा, अमावास्या, एकादशी, संकष्टी (अंगारकी on a Tuesday) @param {MonthDay} md */
function marks(md) {
  /** @type {string[]} */
  var t = [];
  if (md.purnima) t.push("पौर्णिमा");
  if (md.amavasya) t.push("अमावास्या");
  if (md.ekadashi) t.push("एकादशी");
  if (md.sankashti) t.push(md.vara === 2 ? "अंगारकी संकष्टी" : "संकष्टी");
  return t;
}

/** The next Sankashti, with moonrise and the place (as on Home and in the Share message) @param {Where} L */
function skLine(L) {
  var o = skNext();
  if (!o) return "";
  var f = skFmt(o),
    E = ui() === "en",
    today = Math.round((o.day - skMid()) / 86400000) === 0,
    w = words(),
    head = today
      ? E
        ? en(w.skToday + (f.ang ? " (Angaraki)" : ""))
        : mr((f.ang ? "अंगारकी " : "") + w.skToday)
      : E
        ? en(w.next + " ") + "<b>" + mr((f.ang ? "अंगारकी " : "") + "संकष्टी चतुर्थी") + "</b>" + en(": " + f.den)
        : mr(w.next + " ") + "<b>" + mr((f.ang ? "अंगारकी " : "") + "संकष्टी चतुर्थी") + "</b>" + mr(": " + f.dmr);
  return (
    '<p class="csk"><span class="dot">' +
    ICON.moon +
    "</span><span>" +
    head +
    '<br><span class="muted" lang="' + (E ? "en" : mrLang()) + '">' +
    esc((E ? w.moonrise + " " + f.ten : w.moonrise + " " + f.tmr) + " · " + placeName(L)) +
    "</span></span></p>"
  );
}

/** The month table for view.y / view.m */
function monthRender() {
  var box = document.getElementById("calm");
  if (!box) return;
  var w = words(),
    E = ui() === "en",
    y = view.y,
    m = view.m,
    days = monthOf(y, m),
    today = keyOf(new Date()),
    first = new Date(y, m - 1, 1).getDay(),
    py = m === 1 ? y - 1 : y,
    pm = m === 1 ? 12 : m - 1,
    ny = m === 12 ? y + 1 : y,
    nm = m === 12 ? 1 : m + 1;
  // which lunar months the Gregorian month spans: "भाद्रपद → आश्विन (११ ऑक्टोबरपासून)"
  var sub = "";
  days.forEach(function (d, i) {
    var nmM = (d.masa.adhika ? (E ? "Adhika " : "अधिक ") : "") + (E ? d.masa.name.en : d.masa.name.mr);
    if (i === 0) sub = nmM;
    else if (d.masa.n !== days[i - 1].masa.n || d.masa.adhika !== days[i - 1].masa.adhika)
      sub += " → " + nmM + (E ? " from " + d.day + " " + EN_MONTHS[m - 1].slice(0, 3) : " (" + dv(d.day) + " " + MR_MONTHS[m - 1] + "पासून)");
  });
  var mName = E ? EN_MONTHS[m - 1] + " " + y : MR_MONTHS[m - 1] + " " + dv(y);
  var html =
    '<div class="cmh">' +
    '<button type="button" class="cnav" id="calp" data-y="' + py + '" data-m="' + pm + '">' + ICON.prev + '<span class="sr">' + esc(w.prev) + ": " + esc(E ? EN_MONTHS[pm - 1] + " " + py : MR_MONTHS[pm - 1] + " " + dv(py)) + "</span></button>" +
    '<h3 id="cmt">' + say(mName) + '<span class="cms">' + say(sub) + "</span></h3>" +
    '<button type="button" class="cnav" id="caln" data-y="' + ny + '" data-m="' + nm + '">' + ICON.next + '<span class="sr">' + esc(w.nextM) + ": " + esc(E ? EN_MONTHS[nm - 1] + " " + ny : MR_MONTHS[nm - 1] + " " + dv(ny)) + "</span></button>" +
    "</div>" +
    '<table class="cgr" aria-labelledby="cmt"><thead><tr>' +
    MR_WD.map(function (x, i) {
      return '<th scope="col"><span aria-hidden="true" lang="' + mrLang() + '">' + esc(scr(x)) + '</span><span class="sr">' + esc(E ? EN_DAYS[i] : scr(MR_DAYS[i])) + "</span></th>";
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
      tn = t.n === 15 ? "पौर्णिमा" : t.n === 30 ? "अमावास्या" : TN.mr[(t.n - 1) % 15],
      lab = d.ekadashi ? "एकादशी" : "",
      skl = d.sankashti ? (d.vara === 2 ? "अंगारकी" : "संकष्टी") : "",
      moon = d.purnima ? "full" : d.amavasya ? "new" : "",
      // what a screen reader hears beyond what is shown: the date, the paksha, today, the marks
      srBefore = E ? " " + EN_MONTHS[m - 1] + ", " + EN_DAYS[d.vara] + ", " : " " + MR_MONTHS[m - 1] + ", " + MR_DAYS[d.vara] + ", ",
      srAfter = [E ? tithiText(t, "en") : t.n === 15 || t.n === 30 ? "" : t.pakshaName.mr + " पक्ष"]
        .concat(d.purnima && t.n !== 15 ? [E ? "Purnima" : "पौर्णिमा"] : [])
        .concat(d.amavasya && t.n !== 30 ? [E ? "Amavasya" : "अमावास्या"] : [])
        .concat(d.kshaya.length ? [w.kshaya + d.kshaya.map(function (n) {
          return E ? monthTithi(n).en : monthTithi(n).mr;
        }).join(", ")] : [])
        .concat(d.vriddhi ? [w.vriddhi] : [])
        .concat(isT ? [w.today] : [])
        .filter(Boolean)
        .join(", ");
    html +=
      '<td class="' + (kr ? "kr" : "sh") + '">' +
      '<button type="button" class="cd' + (isT ? " today" : "") + '" data-d="' + d.date + '" tabindex="' + (d.date === focusDay ? "0" : "-1") + '" aria-pressed="' + sel + '"' + (isT ? ' aria-current="date"' : "") + ">" +
      '<b lang="' + (E ? "en" : mrLang()) + '">' + num(d.day) + "</b>" +
      '<span class="sr" lang="' + (E ? "en" : mrLang()) + '">' + esc(scr(srBefore)) + "</span>" +
      mr(tn, "t") +
      (d.kshaya.length
        ? '<span class="kx" lang="' + mrLang() + '">+' + esc(scr(d.kshaya.map(function (n) {
            return n === 15 ? "पौर्णिमा" : n === 30 ? "अमावास्या" : TN.mr[(n - 1) % 15];
          }).join(" +"))) + "</span>"
        : "") +
      (moon ? '<span class="mn ' + moon + '" aria-hidden="true"></span>' : "") +
      (lab ? mr(lab, "f") : "") +
      (skl ? mr(skl, "f") : "") +
      (d.vriddhi ? '<span class="vr" aria-hidden="true">' + (E ? "vriddhi" : esc(scr("वृद्धी"))) + "</span>" : "") +
      '<span class="sr" lang="' + (E ? "en" : mrLang()) + '">, ' + esc(scr(srAfter)) + "</span>" +
      "</button></td>";
  });
  for (; col < 7; col++) html += '<td class="ce"></td>';
  html +=
    "</tr></tbody></table>" +
    '<p class="ckey">' +
    '<span><i class="ks" aria-hidden="true"></i>' + say(w.key[0]) + "</span>" +
    '<span><i class="kk" aria-hidden="true"></i>' + say(w.key[1]) + "</span>" +
    '<span><i class="mn full" aria-hidden="true"></i>' + say(w.key[2]) + "</span>" +
    '<span><i class="mn new" aria-hidden="true"></i>' + say(w.key[3]) + "</span>" +
    '<span class="kn">' + say(w.keyNote) + "</span>" +
    "</p>";
  box.innerHTML = html;
}

/** Draw the whole page in the menu language */
function calRender() {
  var c = page(),
    L = skLoc();
  if (!c) return;
  var l = ui(),
    hd = /** @type {HTMLElement | null} */ (c.querySelector(".libhd"));
  if (hd) hd.setAttribute("data-lang", l);
  c.lang = l;
  calKey = l + mrLang();
  var note = document.getElementById("caln0");
  if (note) note.innerHTML = L ? say(words().note(placeName(L))) : "";
  dayRender();
  monthRender();
}

/** Open the calendar at today */
export function calOpen() {
  var c = page();
  if (!c || !skLoc()) return;
  var now = new Date();
  view.day = keyOf(now);
  view.y = now.getFullYear();
  view.m = now.getMonth() + 1;
  setC(true);
  // the page is shown first; the month is worked out right after (about 50 ms)
  var wait = document.getElementById("calm");
  if (wait) wait.innerHTML = '<p class="cwait">…</p>';
  setTimeout(function () {
    if (isOpen()) calRender();
  }, 0);
}

/**
 * Show a day in the card, and its month in the table; focus stays with the day picked
 * @param {string} k "YYYY-MM-DD" @param {boolean} [focus]
 */
function pick(k, focus) {
  var d = dateOf(k);
  view.day = k;
  view.y = d.getFullYear();
  view.m = d.getMonth() + 1;
  dayRender();
  monthRender();
  var live = document.getElementById("call");
  if (live) {
    var p = /** @type {HTMLElement | null} */ (document.getElementById("cdt"));
    live.textContent =
      words().showing +
      (ui() === "en" ? d.getDate() + " " + EN_MONTHS[d.getMonth()] : dv(d.getDate()) + " " + MR_MONTHS[d.getMonth()]) +
      ": " +
      (p ? p.textContent : "");
  }
  if (focus) focusDay(k);
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

/** Re-draw for the menu language, the script, the day and the place (called by apply(), js/features/bars.js) */
export function calLang() {
  homeSoon();
  if (isOpen() && calKey !== ui() + mrLang()) calRender();
}

export function init() {
  var pan = document.getElementById("pan"),
    c = page();
  if (pan)
    pan.addEventListener("click", function (e) {
      if (/** @type {HTMLElement} */ (e.target).closest("#panb")) calOpen();
    });
  if (c) {
    var bk = document.getElementById("cbk");
    if (bk)
      bk.addEventListener("click", function () {
        setC(false);
      });
    c.addEventListener("click", function (e) {
      var t = /** @type {HTMLElement} */ (e.target),
        b = /** @type {HTMLElement | null} */ (t.closest("button"));
      if (!b) return;
      if (b.classList.contains("cd") && b.dataset.d) pick(b.dataset.d, true);
      else if (b.classList.contains("cnav")) {
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
      if (e.key === "Escape" && isOpen()) setC(false);
    });
  }
  // the day can change while the page is open: check again when it comes back into view
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) homeSoon();
  });
  homeSoon();
}

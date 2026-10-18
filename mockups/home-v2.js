// Mockups only (Home v2 and Vedic calendar). Not app code.
// Titles and the evening list are read from content/library.json and content/routines.json, never retyped.
// Panchang values: computed on the phone by the Meeus sun and moon formulas in js/features/astronomy.js
// (Lahiri ayanamsha, amanta months, Columbus OH, Sun 18 Oct 2026). Still to be checked against Kalnirnay.
var PAN = {
  place: "Columbus, OH",
  vara: { mr: "रविवार", en: "Sunday" },
  dateMr: "१८ ऑक्टोबर २०२६", dateEn: "18 October 2026",
  masa: { mr: "आश्विन", en: "Ashvin" }, paksha: { mr: "शुद्ध", en: "Shukla" },
  tithi: { mr: "अष्टमी", en: "Ashtami", ends: "Mon 1:24 am" },
  nak: { mr: "उत्तराषाढा", en: "Uttara Ashadha", ends: "Mon 6:14 am" },
  yoga: { mr: "सुकर्मा", en: "Sukarma" },
  sunrise: "7:44 am", sunset: "6:49 pm",
  samvat: { mr: "शके १९४८ · पराभव संवत्सर", en: "Shaka 1948 · Parabhava" },
  ritu: { mr: "शरद ऋतु", en: "Sharad" }, ayana: { mr: "दक्षिणायन", en: "Dakshinayana" },
};
// Tithi at sunrise, 1 to 31 October 2026 (1–15 shukla, 16–29 krishna 1–14, 30 amavasya)
var OCT = [21,22,23,24,25,26,27,28,29,30,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,22];
var TN = ["", "प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी", "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी", "पौर्णिमा"];
var TS = ["", "प्र", "द्वि", "तृ", "च", "पं", "ष", "स", "अ", "न", "द", "ए", "द्वा", "त्र", "च", "पौ"];
function tname(t, short) {
  if (t === 30) return short ? "अमा" : "अमावास्या";
  var k = t > 15 ? t - 15 : t, a = short ? TS : TN;
  if (t === 15) return a[15];
  return (t > 15 ? (short ? "व " : "वद्य ") : (short ? "शु " : "शुद्ध ")) + a[k];
}
var SPECIAL = { 10: "अमावास्या", 20: "दसरा", 21: "एकादशी", 25: "पौर्णिमा", 28: "संकष्टी" };
I.book = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h8"/></svg>';
I.sunUp = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v5M9.5 6.5 12 4l2.5 2.5"/></svg>';
I.sunDn = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v5M9.5 6.5 12 9l2.5-2.5"/></svg>';
I.chev = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
// The evening routine with titles from the content files
function loadEvening() {
  return Promise.all([fetch("../content/library.json").then(function (r) { return r.json(); }), fetch("../content/routines.json").then(function (r) { return r.json(); })])
    .then(function (a) {
      var by = {}; a[0].texts.forEach(function (t) { by[t.id] = t; });
      return a[1].evening.texts.map(function (id) { return by[id]; });
    });
}
function trows(list, done) {
  return '<ol class="list">' + list.map(function (t, i) {
    var d = i < done;
    return '<li class="row' + (d ? " done" : "") + '"><span class="tk" role="checkbox" aria-checked="' + d + '" aria-label="Done: ' + t.titleEn + '">' + (d ? I.check : "") + "</span>" +
      '<span class="tt"><span class="t1">' + t.title + '</span><span class="t2">' + t.titleEn + "</span></span></li>";
  }).join("") + "</ol>";
}
// The sunset picture with today's (Sunday's) star lit, as on the live app
function pic(size) {
  return '<span class="pic" style="width:' + size + "px;height:" + size + 'px" role="img" aria-label="Sunset, Sunday"><span class="star" style="left:13.8%;top:39.3%"></span></span>';
}
function topbar2() {
  return '<header class="top"><span class="brand">' + I.logo + "नित्य उपासना</span>" +
    '<button class="chip" aria-label="Profile: Me. Change profile"><span class="av">Me</span></button>' +
    '<button class="ib" aria-label="Library">' + I.book + '</button><button class="ib" aria-label="Settings">' + I.gear + "</button></header>";
}

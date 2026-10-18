// Mockups only (Step 2): sample data and icons shared by the mockup pages. Not app code.
// Add ?dark to a mockup's address to see it in the dark theme.
if (/[?&]dark\b/.test(location.search)) document.documentElement.dataset.theme = "dark";

var I = {
  logo: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.6 5.5c.5-1.9 1.8-3.1 3.4-3.7 1.6.6 2.9 1.8 3.4 3.7"/><path d="M8.4 5.6h7.2"/><path d="M8.4 5.6c-.4 3.6.6 6.3 2.4 7.4.1 3.3 0 6.3 1.9 7.6 1.6 1 3.5 0 3.2-1.8-.2-1-1.3-1.3-1.8-.6"/><path d="M15.6 5.6c.4 3.6-.6 6.2-2.6 7.2"/><path d="M8.4 5.6C5.6 4.5 2.4 6 2.8 9.6c.3 2.6 2.4 3.7 4.8 3"/><path d="M15.6 5.6c2.8-1.1 6 .4 5.6 4-.3 2.6-2.4 3.7-4.8 3"/><path d="M12 7v1.8"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h14M4 11h8M4 16h5"/><circle cx="16" cy="15.5" r="3.6"/><path d="M18.6 18.1l2.6 2.6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  lang: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="2" y="7" width="13" height="13" rx="2" fill="currentColor"/><text x="8.5" y="17.3" text-anchor="middle" font-size="10" font-weight="700" fill="var(--bg)" font-family="Noto Sans Devanagari">अ</text><text x="18" y="12" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor" font-family="Inter">A</text></svg>',
  check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 18h18"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M12 6v3M5.6 10.6l1.8 1.4M18.4 10.6 16.6 12"/></svg>',
  noon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  lamp: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1.6 2 2 3.6 0 5.5C10 6.6 10.4 5 12 3z"/><path d="M4 12h16c0 3.3-3.6 6-8 6s-8-2.7-8-6z"/><path d="M9 21h6"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  app: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 8v6M9 11l3 3 3-3"/></svg>',
  share: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  print: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="9" rx="2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  help: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  grip: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  prev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  full: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  cal: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
};

// The texts (titles as on today's site). ids as planned (Q1).
var T = [
  { id: "atharvashirsha", mr: "गणपत्यथर्वशीर्षोपनिषत्", en: "Ganapati Atharvashirsha", cat: "Vedic Chant", lang: "संस्कृत" },
  { id: "sukhkarta", mr: "गणपतीची आरती", en: "Ganapati Aarti", cat: "Aarti", lang: "मराठी" },
  { id: "ganapati-ji", mr: "गणपति जी की आरती", en: "Ganapati Ji ki Aarti", cat: "Aarti", lang: "हिंदी" },
  { id: "devi", mr: "देवीची आरती", en: "Devi Aarti", cat: "Aarti", lang: "मराठी" },
  { id: "shankar", mr: "शंकराची आरती", en: "Shankar Aarti", cat: "Aarti", lang: "मराठी" },
  { id: "datta", mr: "दत्ताची आरती", en: "Dattatreya Aarti", cat: "Aarti", lang: "मराठी" },
  { id: "dnyaneshwar", mr: "ज्ञानेश्वरांची आरती", en: "Dnyaneshwar Aarti", cat: "Aarti", lang: "मराठी" },
  { id: "vitthal", mr: "विठ्ठलाची आरती", en: "Vitthal Aarti", cat: "Aarti", lang: "मराठी" },
  { id: "ghalin-lotangan", mr: "घालीन लोटांगण", en: "Ghalin Lotangan", cat: "Aarti", lang: "मराठी" },
  { id: "jai-ganesh-deva", mr: "आरती जय गणेश देवा", en: "Aarti Jai Ganesh Deva", cat: "Aarti", lang: "हिंदी" },
  { id: "jagdish-hare", mr: "आरती जय जगदीश हरे", en: "Aarti Jai Jagdish Hare", cat: "Aarti", lang: "हिंदी" },
];
// Sample family profiles (relation names only, no real names)
var PEOPLE = [
  { n: "Aai", d: "आई", c: "#7b1113" }, { n: "Baba", d: "बाबा", c: "#2f5d8a" }, { n: "Aaji", d: "आजी", c: "#6b4a8a" }, { n: "Ajoba", d: "आजोबा", c: "#2f6b3a" },
];
var DAYS = [["Mon", 12], ["Tue", 13], ["Wed", 14], ["Thu", 15], ["Fri", 16], ["Sat", 17], ["Sun", 18]];
var DEVN = "०१२३४५६७८९";
function dn(n) { return String(n).replace(/\d/g, function (d) { return DEVN[d]; }); }

function week(on, sp) {
  return '<div class="week" role="radiogroup" aria-label="Day">' + DAYS.map(function (d) {
    return '<button class="day' + (d[0] === on ? " on" : "") + (sp && sp.indexOf(d[0]) >= 0 ? " sp" : "") + '" role="radio" aria-checked="' + (d[0] === on) + '">' + d[0] + "<b>" + d[1] + "</b></button>";
  }).join("") + "</div>";
}
function seg(on, short) {
  var s = [["Morning", I.sun], ["Afternoon", I.noon], ["Evening", I.lamp]];
  return '<div class="seg" role="radiogroup" aria-label="Session">' + s.map(function (x) {
    return '<button class="' + (x[0] === on ? "on" : "") + '" role="radio" aria-checked="' + (x[0] === on) + '">' + x[1] + (short ? x[0].slice(0, 3) : x[0]) + "</button>";
  }).join("") + "</div>";
}
function rows(ids, done, opt) {
  opt = opt || {};
  return '<ol class="list">' + ids.map(function (k, i) {
    var t = T[k], d = done.indexOf(k) >= 0;
    return '<li class="row' + (d ? " done" : "") + '"><span class="tk" role="checkbox" aria-checked="' + d + '" aria-label="Done: ' + t.en + '">' + (d ? I.check : "") + "</span>" +
      (opt.num ? '<span class="no">' + dn(i + 1) + ".</span>" : "") +
      '<span class="tt"><span class="t1">' + t.mr + '</span><span class="t2">' + t.en + "</span></span>" +
      (opt.tag ? '<span class="tag">' + t.lang + "</span>" : "") + "</li>";
  }).join("") + "</ol>";
}
function topbar(extra) {
  return '<header class="top"><span class="brand">' + I.logo + "नित्य उपासना</span>" + (extra || "") +
    '<button class="ib" aria-label="Library and search">' + I.search + '</button><button class="ib" aria-label="Settings">' + I.gear + "</button></header>";
}
function tools() {
  return '<div class="tools"><button>' + I.app + "App</button><button>" + I.share + "Share</button><button>" + I.print + "Print</button><button>" + I.help + "Help</button></div>";
}
var EVENING = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// The real text of a piece, read from content/pieces.js (never retyped): k = index in T
function piece(k) {
  var all = [];
  window.CONTENT.groups.forEach(function (g) { all = all.concat(g.pieces); });
  return all[k];
}
// A piece rendered as on today's site, dhrupad once at the top. en: show the English line under each line.
function renderPiece(k, o) {
  o = o || {};
  var p = piece(k), h = "", n = 0;
  function ls(lines) {
    return lines.map(function (l, i) {
      var last = o.num && i === lines.length - 1;
      // as js/text/stanza-numbers.js: "॥ १ ॥" after the line, sharing a ॥ the line already ends with
      function sn(t, num, mark) { return last ? ' <span class="sn">' + (t.trim().slice(-mark.length) === mark ? "" : mark + " ") + num + " " + mark + "</span>" : ""; }
      return "<p>" + l.mr + sn(l.mr, dn(o.num), "॥") + "</p>" + (o.en ? '<p class="e">' + l.en + sn(l.en, o.num, "||") + "</p>" : "");
    }).join("");
  }
  if (p.refrain) h += '<div class="dh"><div class="lab">' + (o.en ? "Refrain" : "ध्रुपद") + '</div><div class="v">' + ls(p.refrain.lines) + "</div></div>";
  p.items.forEach(function (it) {
    if (o.max && n >= o.max) return;
    if (it.rmk) { h += '<span class="rmk">' + it.rmk.mr + "</span>"; return; }
    if (it.kind === "rf") return;
    if (it.kind === "dh") { h += '<div class="dh"><div class="v">' + ls(it.lines) + "</div></div>"; return; }
    n++;
    var save = o.num; o.num = n; h += '<div class="st v">' + ls(it.lines) + "</div>"; o.num = save;
  });
  return h;
}
var LOTUS = '<svg class="fin" viewBox="0 0 160 28" width="160" height="28" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 20H56"/><path d="M104 20H152"/><path d="M80 4C75 9 74.5 15 80 21C85.5 15 85 9 80 4Z"/><path d="M80 21C73 20 68.5 15.5 67.5 10.5C73 11.5 77.5 15 80 21Z"/><path d="M80 21C87 20 91.5 15.5 92.5 10.5C87 11.5 82.5 15 80 21Z"/><path d="M70 22.5C74 24.5 86 24.5 90 22.5"/></svg>';

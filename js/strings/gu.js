// @ts-check
// The menu words in Gujarati (ગુજરાતી), every part's under its name, as in js/strings/en.js (js/core/strings.js).
// Digits stay as they are (1, 2, 3): Gujarati menus on phones write them so.

import { DAYS, MONTHS } from "../core/words.js";
import { INITIALS_MAX, MAX_PROFILES } from "../store/profiles.js";
import { MAX_ADDED } from "../core/library.js";

/** "સવારે 7:45": the part of the day, then the time @param {number} h 0–23 @param {string} mi */
function clock(h, mi) {
  var part = h < 4 ? "રાત્રે" : h < 6 ? "વહેલી સવારે" : h < 12 ? "સવારે" : h < 16 ? "બપોરે" : h < 20 ? "સાંજે" : "રાત્રે";
  return part + " " + (((h + 11) % 12) + 1) + ":" + mi;
}

/** "1 પાઠ", "3 પાઠ" (one word for both) @param {number} n */
function texts(n) {
  return n + " પાઠ";
}

export default {
  // Backup and restore (js/features/backup.js)
  backup: {
    months: MONTHS.gu,
    never: "હજી સાચવ્યું નથી",
    /** @param {string} d */
    last: function (d) {
      return "છેલ્લે સાચવ્યું " + d;
    },
    saved: "બેકઅપ ફાઇલ સાચવી",
    shared: "બેકઅપ ફાઇલ તૈયાર છે",
    remindFirst: "તમારી સેટિંગ્સ અને દિનચર્યા ફક્ત આ ફોનમાં છે. ફોન વેબસાઇટ ડેટા ભૂંસી નાખે તો પણ બચે તે માટે, વખતોવખત બેકઅપ ફાઇલ સાચવો.",
    /** @param {string} d */
    remind: function (d) {
      return "તમારી છેલ્લી બેકઅપ ફાઇલ " + d + " ના રોજ સાચવી હતી. નવી સાચવવી છે?";
    },
    ask: "આ ફાઇલમાંથી પાછું લાવવું છે?",
    /** @param {string} d @param {string} v */
    from: function (d, v) {
      return d + " ના રોજ સાચવી" + (v ? " (આવૃત્તિ " + v + ")" : "") + ".";
    },
    inFile: "ફાઇલમાં છે તે લોકો: ",
    added: "આ ફોનમાં નવા: ",
    replaced: "ફાઇલની નકલથી બદલ્યું (સેટિંગ્સ અને દિનચર્યા): ",
    removed: "આ ફોનમાંથી કાઢ્યું: ",
    /** @param {string} n */
    then: function (n) {
      return "હવે પછી વાંચનાર: " + n + ".";
    },
    restore: "પાછું લાવો",
    cancel: "રદ કરો",
    ok: "બરાબર",
    done: "બેકઅપ ફાઇલમાંથી પાછું લાવ્યા",
    bad: "આ ફાઇલમાંથી પાછું લાવી શકાતું નથી",
    unsaved: "બેકઅપ આ ફોનમાં સાચવી શકાયો નહીં. ફરી પ્રયત્ન કરો, અથવા બેકઅપ ફાઇલ રાખી મૂકો.",
    problems: {
      "not-json": "આ નિત્ય ઉપાસના બેકઅપ ફાઇલ (.nitya) નથી.",
      "not-nitya": "આ નિત્ય ઉપાસના બેકઅપ ફાઇલ (.nitya) નથી.",
      newer: "આ ફાઇલ ઍપની નવી આવૃત્તિએ સાચવી છે. અપડેટ માટે તપાસો (સેટિંગ્સ → વધુ → વિશે, આવૃત્તિની લીટી દબાવો) અને ફરી પ્રયત્ન કરો.",
      kind: "આ .nitya ફાઇલ પૂરો બેકઅપ નથી.",
      checksum: "સાચવ્યા પછી આ ફાઇલ બદલાઈ છે અથવા બગડી છે (તેનો ચેકસમ મળતો નથી), તેથી કંઈ પાછું લાવ્યા નથી.",
      empty: "આ બેકઅપમાં કોઈ નથી.",
      read: "ફાઇલ વાંચી શકાઈ નહીં.",
    },
  },
  // People on this phone: the badge and the profile sheet (js/features/profiles.js)
  profiles: {
    title: "કોણ વાંચે છે?",
    add: "વ્યક્તિ ઉમેરો",
    info: "દરેક જણ પોતાનું અક્ષરનું કદ, ભાષાઓ, થીમ અને દિનચર્યા આ ફોનમાં રાખે છે.",
    now: "હમણાં વાંચનાર",
    edit: "બદલો",
    addTitle: "વ્યક્તિ ઉમેરો",
    editTitle: "બદલો: ",
    name: "નામ",
    initials: "બેજ પરના અક્ષરો",
    initialsHint: INITIALS_MAX + " અક્ષરો સુધી. ખાલી રાખો તો નામમાંથી લેવાશે.",
    colour: "રંગ",
    save: "સાચવો",
    cancel: "રદ કરો",
    del: "આ વ્યક્તિને કાઢી નાખો",
    /** @param {string} n */
    ask: function (n) {
      return n + " ને કાઢી નાખવા છે? તેમની સેટિંગ્સ અને દિનચર્યા આ ફોનમાંથી નીકળી જશે. અગાઉ સાચવેલી બેકઅપ ફાઇલમાં તે હજી રહેશે.";
    },
    yes: "કાઢી નાખો",
    close: "બંધ કરો",
    empty: "કૃપા કરી નામ લખો.",
    taken: "આ ફોનમાં આ નામનું કોઈ પહેલેથી છે.",
    full: "ફક્ત " + MAX_PROFILES + " લોકો માટે જગ્યા છે.",
    /** @param {string} n */
    switched: function (n) {
      return "હમણાં વાંચનાર: " + n;
    },
    /** @param {string} n */
    deleted: function (n) {
      return n + " ને કાઢી નાખ્યા";
    },
    chip: "પ્રોફાઇલ: ",
  },
  // The Library by category and the categories sheet (js/features/library.js)
  library: {
    open: "વિભાગો બદલો",
    title: "વિભાગો",
    texts: "પાઠ",
    textsInfo: "દરેક પાઠ કયા વિભાગમાં હોય તે પસંદ કરો.",
    info: "અહીં વાંચનારા બધા માટે આ ફોનમાં રખાય છે, અને બેકઅપ ફાઇલોમાં સચવાય છે. પાઠના શબ્દો કદી બદલાતા નથી.",
    add: "વિભાગ ઉમેરો",
    rename: "નામ બદલો",
    addTitle: "વિભાગ ઉમેરો",
    renameTitle: "નામ બદલો: ",
    mrName: "મરાઠીમાં નામ",
    enName: "અંગ્રેજીમાં નામ",
    hint: "એક પૂરતું છે: તે જ બંને માટે વપરાશે.",
    save: "સાચવો",
    cancel: "રદ કરો",
    /** @param {string} n */
    reset: function (n) {
      return "મૂળ નામ વાપરો: " + n;
    },
    del: "આ વિભાગ કાઢી નાખો",
    builtIn: "મૂળથી છે: આ ફોનમાં નામ બદલી શકાય, કાઢી ન શકાય.",
    /** @param {string} n */
    ask: function (n) {
      return n + " કાઢી નાખવો છે? તેના પાઠ જે વિભાગોમાં હતા ત્યાં પાછા જશે.";
    },
    yes: "કાઢી નાખો",
    close: "બંધ કરો",
    empty: "કૃપા કરી નામ લખો.",
    taken: "બીજા વિભાગનું આ નામ પહેલેથી છે.",
    full: "તમારા પોતાના " + MAX_ADDED + " વિભાગો માટે જગ્યા છે.",
    /** @param {number} n */
    count: function (n) {
      return n === 0 ? "હજી પાઠ નથી (સંગ્રહમાં દેખાતો નથી)" : texts(n);
    },
    /** @param {string} t @param {string} c */
    moved: function (t, c) {
      return t + ": હવે " + c + " વિભાગમાં";
    },
    /** @param {string} t */
    catFor: function (t) {
      return t + ": વિભાગ";
    },
    /** @param {string} n */
    added: function (n) {
      return n + " ઉમેર્યો";
    },
    /** @param {string} n */
    renamed: function (n) {
      return "નામ બદલ્યું: " + n;
    },
    /** @param {string} n */
    deleted: function (n) {
      return n + " કાઢી નાખ્યો";
    },
  },
  // Home: the date, the sessions and their texts (js/features/today-card.js)
  today: {
    days: DAYS.gu,
    months: MONTHS.gu,
    sessions: { morning: "સવાર", afternoon: "બપોર", evening: "સાંજ" },
    tabs: "સમય",
    unset: "કંઈ નક્કી નથી",
    texts: texts,
    none: "કંઈ યોજેલું નથી",
    /** @param {string} s */
    empty: function (s) {
      return s + " માટે હજી કંઈ યોજેલું નથી. ";
    },
    add: "પાઠ ઉમેરો",
    edit: "બદલો",
    /** @param {string} s */
    editL: function (s) {
      return "દિનચર્યા બદલો: " + s;
    },
    end: "આજ",
    ended: "આ સમય પૂરો થયો",
    prev: "આગલો દિવસ",
    next: "પછીનો દિવસ",
    today: "આજે",
    tomorrow: "આવતીકાલે",
    yesterday: "ગઈકાલે",
    /** @param {number} n */
    later: function (n) {
      return n + " દિવસમાં";
    },
    /** @param {number} n */
    ago: function (n) {
      return n + " દિવસ પહેલાં";
    },
    /** @param {string} d the weekday's name, as HTML */
    showing: function (d) {
      return "<b>" + d + "</b> બતાવે છે";
    },
    back: "આજ ›",
  },
  // The routine builder and its Add texts picker (js/features/routine-builder.js)
  routine: {
    /** @param {string} n */
    title: function (n) {
      return n + " ની દિનચર્યા";
    },
    sessions: { morning: "સવાર", afternoon: "બપોર", evening: "સાંજ" },
    sessionG: "સમય",
    modes: { fixed: "દરરોજ એક જ", weekday: "વારે વારે જુદું" },
    modeG: "કયા દિવસો",
    days: DAYS.gu,
    short: ["રવિ", "સોમ", "મંગળ", "બુધ", "ગુરુ", "શુક્ર", "શનિ"],
    dayG: "દિવસ",
    texts: texts,
    /** @param {string} s @param {number | null} d */
    what: function (s, d) {
      return d === null ? "દરરોજ " + s : this.days[d] + " " + s;
    },
    copy: "બીજા દિવસોમાં નકલ કરો…",
    /** @param {string} w */
    copyTo: function (w) {
      return w + ": આ યાદીની નકલ આમાં કરો:";
    },
    copyGo: "નકલ કરો",
    cancel: "રદ કરો",
    /** @param {string[]} d */
    copied: function (d) {
      return d.length ? d.join(", ") + " માં નકલ કરી" : "કોઈ દિવસ પસંદ કર્યો નથી";
    },
    /** @param {string} t */
    up: function (t) {
      return t + " ઉપર ખસેડો";
    },
    /** @param {string} t */
    down: function (t) {
      return t + " નીચે ખસેડો";
    },
    /** @param {string} t */
    remove: function (t) {
      return t + " કાઢો";
    },
    /** @param {string} t @param {number} i @param {number} n */
    moved: function (t, i, n) {
      return t + " હવે " + n + " માંથી " + i + " મા સ્થાને";
    },
    /** @param {string} t */
    removed: function (t) {
      return t + " કાઢ્યો";
    },
    /** @param {string} t @param {number} n */
    added: function (t, n) {
      return t + " ઉમેર્યો, " + n + " માંથી " + n + " મો";
    },
    /** @param {string} w */
    empty: function (w) {
      return w + ": હજી પાઠ નથી. શરૂ કરવા પાઠ ઉમેરો.";
    },
    hint: "કીબોર્ડ પર Alt+↑/↓ ખસેડે છે",
    add: "પાઠ ઉમેરો",
    /** @param {string} w */
    addTo: function (w) {
      return w + ": પાઠ ઉમેરો";
    },
    search: "શોધો (મરાઠી કે અંગ્રેજી)",
    none: "કંઈ મળ્યું નહીં",
    done: "થઈ ગયું",
    /** @param {number} n */
    found: function (n) {
      return n + " પાઠ મળ્યા";
    },
    /** @param {string} d */
    toFixed: function (d) {
      return d + ": આ યાદી હવે દરરોજ વપરાશે";
    },
    toWeek: "હવે અઠવાડિયાના દરેક દિવસની પોતાની યાદી હોઈ શકે",
    /** @param {string} d */
    fixAsk: function (d) {
      return d + ": આ યાદી દરરોજ વાપરવી છે? બીજા દિવસોની પોતાની યાદીઓ નીકળી જશે.";
    },
    fixGo: "દરરોજ વાપરો",
  },
  // The print builder's What step: Texts, Today, Routine (js/print/what.js)
  printWhat: {
    what: "શું છાપવું",
    search: "સંગ્રહમાં શોધો",
    all: "બધા પાઠ",
    selectAll: "બધું પસંદ કરો",
    clear: "સાફ કરો",
    none: "કોઈ પાઠ મળતો નથી",
    texts: texts,
    pick: "ઓછામાં ઓછો એક પાઠ પસંદ કરો",
    tabs: { texts: "સંગ્રહ", today: "આજ", routine: "દિનચર્યા" },
    todayInfo: "કોઈ સમયના પાઠ છાપવા તેને દબાવો.",
    allToday: "આજનું બધું",
    /** @param {string} d the weekday */
    allDay: function (d) {
      return d + ": બધું";
    },
    empty: "પાઠ નથી",
    who: "કોની દિનચર્યા",
    week: "આખું અઠવાડિયું",
    oneDay: "એક દિવસ",
    days: "દિવસો",
    sessions: "સમય",
    order: "દરેક એક વાર, દિનચર્યાના ક્રમમાં",
    noTexts: "પાઠ નથી",
    nothing: "પસંદ કરેલા દિવસો અને સમયે પાઠ નથી",
  },
  // The Vedic calendar: the line on Home, the calendar page, This week and 15 days (js/features/vedic-calendar.js)
  calendar: {
    /** @param {string} name */
    wiki: function (name) {
      return name + ": વિકિપીડિયા (નવા ટૅબમાં ખૂલશે)";
    },
    clock: clock,
    /** "મંગળવાર 28 જુલાઈ" @param {number} wd @param {number} d @param {number} m */
    dayLabel: function (wd, d, m) {
      return DAYS.gu[wd] + " " + d + " " + MONTHS.gu[m];
    },
    open: " (પંચાંગ ખોલો)",
    sunrise: "સૂર્યોદય",
    sunset: "સૂર્યાસ્ત",
    noRise: "આ દિવસે ચંદ્રોદય નથી",
    /** @param {number} d @param {string} time */
    until: function (d, time) {
      return (d >= 0 ? DAYS.gu[d] + " " : "") + time + " સુધી";
    },
    amanta: "અમાંત",
    today: "આજે",
    loc: "મારું સ્થાન વાપરો",
    pic: "ચિત્ર આખા પડદે બતાવો",
    prev: "આગલો મહિનો",
    nextM: "પછીનો મહિનો",
    key: ["શુક્લ પક્ષ", "કૃષ્ણ પક્ષ", "પૂનમ", "અમાસ"],
    keyNote: "સૂર્યોદય વખતની તિથિ · + પછીના સૂર્યોદય પહેલાં શરૂ થઈ પૂરી થતી (ક્ષય) તિથિ",
    vriddhi: "આગલા દિવસની જ તિથિ (વૃદ્ધિ)",
    kshaya: "ક્ષય તિથિ: ",
    near: "સૂર્યોદયની ઘણી નજીક: છાપેલા પંચાંગમાં બાજુની તિથિ હોઈ શકે.",
    /** @param {string} p */
    note: function (p) {
      return "આ ફોન પર " + p + " માટે ગણ્યું છે. વિગતો જોવા કોઈ દિવસ દબાવો.";
    },
    /** @param {number} d @param {number} m @param {string} what */
    showing: function (d, m, what) {
      return d + " " + MONTHS.gu[m] + ": " + what;
    },
    fToday: "આજે: ",
    fTomorrow: "આવતીકાલે: ",
    fYesterday: "ગઈકાલે: ",
    /** @param {number} d the weekday */
    fOn: function (d) {
      return DAYS.gu[d] + ": ";
    },
    week: "આ અઠવાડિયે",
    next15: "પછીના 15 દિવસ",
    day: "દિવસ",
    month: "મહિનો",
    up: "15 દિવસ",
    prevDay: "આગલો દિવસ",
    nextDay: "પછીનો દિવસ",
    prevU: "આગલા 15 દિવસ",
    nextU: "પછીના 15 દિવસ",
    todayB: "આજ",
    view: "બતાવો",
    upTitle: "પછીના 15 દિવસ",
    nextWeek: "આવતું અઠવાડિયું",
    uYesterday: "ગઈકાલે",
    /** @param {number} n */
    uAgo: function (n) {
      return n + " દિવસ પહેલાં";
    },
    uToday: "આજે",
    uTomorrow: "આવતીકાલે",
    /** @param {number} n */
    uIn: function (n) {
      return n + " દિવસમાં";
    },
    /** @param {number} a @param {number} b */
    uDays: function (a, b) {
      return "દિવસ " + a + (a === b ? "" : "–" + b);
    },
    /** @param {string} d */
    uUntil: function (d) {
      return d + " સુધી";
    },
    uNext: "પછી",
    uNone: "આ દિવસોમાં કંઈ નોંધ્યું નથી.",
    kinds: { fest: "તહેવારો", sk: "સંકષ્ટી", pradosh: "પ્રદોષ", hol: "રજાઓ" },
  },
  // The top bar (js/features/bars.js)
  bar: {
    /** @param {string} t */
    home: function (t) {
      return "મુખ્ય પાનું: " + t;
    },
    find: "પાઠ કે લીટી શોધો",
  },
  // The bottom bar's Prev and Next (js/features/bottom-bar.js)
  bottomBar: {
    prev: "‹ પાછળ",
    next: "આગળ ›",
  },
  // A piece's fold button (js/core/apply.js)
  fold: {
    open: "આ ભાગ બતાવો",
    fold: "આ ભાગ વાળી દો",
  },
  // The reading sheet (js/features/reading-sheet.js) and Settings → Languages (js/features/languages.js)
  languages: {
    both: "બંને",
    second: "+ બીજી ભાષા",
    none: "કોઈ નહીં",
    refrain: "↻ ધ્રુવપદ",
    close: "બંધ કરો",
    reset: "અક્ષરનું કદ મૂળ કરો",
    /** @param {string} pct */
    size: function (pct) {
      return "અક્ષરનું કદ " + pct + "%";
    },
  },
  // Dhrupad once or after every verse (js/features/dhrupad-button.js)
  dhrupad: {
    once: "ધ્રુપદ એક વાર બતાવ્યું",
    every: "દરેક કડી પછી ધ્રુપદ",
  },
  // Settings (js/features/settings-panel.js)
  settings: {
    /** @param {string} why */
    failed: function (why) {
      return "ફેરફાર પૂરો થઈ શક્યો નહીં (" + why + ")";
    },
  },
  // The full-screen picture (js/features/picture-viewer.js)
  pictureViewer: {
    hint: "મોટું કરવા બે આંગળીથી પહોળું કરો અથવા બે વાર દબાવો",
  },
  // The Books tab's clouds (js/features/pdfs.js)
  pdfs: {
    saved: "આ ફોનમાં સાચવ્યું",
    online: "ફક્ત ઑનલાઇન",
  },
  // Offline use and Check for updates (js/features/offline.js): Settings → More → About
  offline: {
    state: { idle: "ઑફલાઇન માટે તૈયાર", save: "ઑફલાઇન માટે સાચવે છે…", off: "સાચવેલી નકલ વપરાય છે" },
    update: { check: "અપડેટ માટે તપાસો", busy: "તપાસે છે…", ok: "તાજું છે", off: "ઇન્ટરનેટ નથી", restart: "બંધ કરીને ફરી ખોલો" },
    usingSaved: "ઇન્ટરનેટ નથી. સાચવેલી નકલ વાપરીએ છીએ.",
    loading: "નવી આવૃત્તિ, ખૂલે છે…",
    ready: "ઑફલાઇન વાપરવા તૈયાર",
    /** @param {string} v the new version ("v1.37.17") */
    reopen: function (v) {
      return "આવૃત્તિ " + v + " સચવાઈ ગઈ. પૂરું કરવા ઍપ બંધ કરીને ફરી ખોલો.";
    },
  },
  // Search and Recent (js/text/search.js)
  search: {
    /** @param {string} name */
    remove: function (name) {
      return "કાઢો: " + name;
    },
    nothing: "કંઈ મળ્યું નહીં",
    /** @param {number} n -1: 40 or more */
    lines: function (n) {
      return (n < 0 ? "40 કે વધુ" : n) + " પરિણામ";
    },
    /** @param {number} t @param {number} n the lines; -1: 40 or more */
    both: function (t, n) {
      return texts(t) + " અને " + (n < 0 ? "40 કે વધુ" : n) + " લીટી";
    },
    texts: "પાઠ",
    linesHead: "લીટીઓ",
  },
  // Share (js/features/share.js): the message for the group chat
  share: {
    tip: "\nસૂચન: ફોનમાં ઍપની જેમ રાખવા લિંક ખોલીને Add to Home Screen દબાવો.",
    /** @param {string} title */
    plain: function (title) {
      return title;
    },
    temple: " · પૂજા સાંજે 7:00–8:30, ભારતીય હિંદુ મંદિર, પૉવેલ",
    /** @param {string} title @param {string} ang @param {string} date @param {string} temple @param {string} rise */
    next: function (title, ang, date, temple, rise) {
      return title + "\nહવે પછીની " + ang + "Sankathara Chaturthi: " + date + temple + (rise ? " · ચંદ્રોદય " + rise : "");
    },
    copied: "સંદેશની નકલ થઈ",
  },
  // Print (js/features/print.js): the Print pop-up in the menu language, the printout's own words in its language
  print: {
    langs: { mr: "મરાઠી", kn: "કન્નડ", te: "તેલુગુ", gu: "ગુજરાતી", en: "અંગ્રેજી" },
    portrait: "ઊભું",
    landscape: "આડું",
    both: "બંને",
    /** @param {string} l1 @param {string} l2 */
    stacked: function (l1, l2) {
      return "ઊભું: ઉપર " + l1 + ", નીચે " + l2;
    },
    side: "આડું, બાજુ બાજુમાં",
    preview: "પહેલા પાનાની ઝલક",
    /** @param {string} paper */
    use: function (paper) {
      return paper + " વાપરો";
    },
    cancel: "રદ કરો",
    linkCopied: "લિંકની નકલ થઈ: તેને Safari માં ચોંટાડો",
    gone: "પસંદ કરેલા પાઠ હવે સંગ્રહમાં નથી: ફરી પસંદ કરો.",
    /** @param {number} m @param {number} y */
    cover: function (m, y) {
      return "નિત્ય ઉપાસના · " + MONTHS.gu[m] + " " + y;
    },
    week: "અઠવાડિયું એક નજરે",
    contents: "અનુક્રમણિકા",
  },
  // The page's own words (index.html: data-w="page.…"); {icon} is the icon written in the page
  page: {
    appAddToHomeScreen: 'ઍપ<span class="sr"> (હોમ સ્ક્રીન પર ઉમેરો)</span>',
    share: "શેર કરો",
    qrCode: 'QR<span class="sr"> કોડ</span>',
    help: "મદદ",
    back: "પાછળ",
    chants: "પાઠ",
    books: "પુસ્તકો",
    recent: "તાજેતરના",
    clear: "સાફ કરો",
    nothingFound: "કંઈ મળ્યું નહીં",
    reading: "વાંચન",
    screen: "પડદો",
    more: "વધુ",
    preview: "ઝલક",
    languageAndText: "ભાષા અને પાઠ",
    mainLanguage: "મુખ્ય ભાષા",
    largeText: "મોટા અક્ષર",
    secondLanguage: "બીજી ભાષા",
    smallerUnderEachLine: "નાના, દરેક લીટી નીચે",
    show: "બતાવો",
    textSize: "અક્ષરનું કદ",
    textFont: "અક્ષરની શૈલી",
    traditional: "પરંપરાગત",
    modern: "આધુનિક",
    bold: "ઘાટા",
    verses: "કડીઓ",
    dhrupad: "ધ્રુપદ",
    once: "એક વાર",
    everyVerse: "દરેક કડી",
    layout: "ગોઠવણ",
    n1Column: "1 સ્તંભ",
    n2Columns: "2 સ્તંભ",
    menusAndButtons: "મેનુ અને બટન",
    theme: "થીમ",
    auto: "આપમેળે",
    light: "આછું",
    sepia: "સેપિયા",
    dark: "ઘેરું",
    highContrast: "વધુ કૉન્ટ્રાસ્ટ",
    keepScreenOn: "પડદો ચાલુ રાખો",
    profilesAndBackup: "પ્રોફાઇલ અને બેકઅપ",
    thisBrowserCanTSave: "આ બ્રાઉઝર અહીં સાચવી શકતું નથી. બંધ કરતાં પહેલાં બેકઅપ ફાઇલ સાચવો.",
    whoIsReading: "કોણ વાંચે છે",
    routine: "દિનચર્યા",
    theTextsForEachSession: "દરેક સમયના પાઠ, ક્રમમાં",
    saveABackupFile: "બેકઅપ ફાઇલ સાચવો",
    restoreFromAFile: "ફાઇલમાંથી પાછું લાવો",
    aNityaFileSavedBefore: "અગાઉ સાચવેલી .nitya ફાઇલ",
    about: "વિશે",
    helpAndHowToUse: "મદદ અને વાપરવાની રીત",
    addToHomeScreen: "હોમ સ્ક્રીન પર ઉમેરો",
    nityaUpasana: "નિત્ય ઉપાસના",
    notNow: "હમણાં નહીં",
    scanWithTheCameraTo: "ખોલવા કૅમેરાથી સ્કૅન કરો",
    close: "બંધ કરો",
    whatToPrint: "‹ શું છાપવું",
    printPdf: "છાપો / PDF",
    whatToPrint2: "શું છાપવું",
    howToPrint: "કેવી રીતે છાપવું",
    language: "ભાષા",
    dhrupad2: 'ધ્રુપદ (<span lang="mr">धृ</span>)',
    once2: "એક વાર",
    page: "પાનું",
    printFont: "છાપવાની અક્ષર શૈલી",
    everyTextStartsOnA: 'દરેક પાઠ નવા પાને શરૂ થાય છે. કાગળ: <b class="prpaper">Letter</b>',
    forLandscapePickItIn: "આડા માટે, Safari ના સંવાદમાં પણ તે જ પસંદ કરો.",
    pickA4PaperInSafari: 'Safari ના સંવાદમાં પણ <span class="przp">A4</span> કાગળ પસંદ કરો.',
    chromePrintsItBest: "Chrome તેને સૌથી સારું છાપે છે.",
    readyPrintNow: "તૈયાર: હમણાં છાપો",
    openInSafari: "Safari માં ખોલો",
    copyLink: "લિંકની નકલ કરો",
    printingDoesNotOpenFrom:
      "iPhone પર હોમ સ્ક્રીન ઍપમાંથી છાપવાનું ખૂલતું નથી. <b>Safari માં ખોલો</b> દબાવો: તમારી પસંદગીઓ સાથે જશે અને છાપવાનું ત્યાં તૈયાર થશે. Safari ન ખૂલે તો, લિંકની નકલ કરી Safari માં ચોંટાડો.",
    thisBrowserDidNotOpen:
      'આ બ્રાઉઝરે છાપવાનો સંવાદ ખોલ્યો નહીં. બ્રાઉઝરનું <b lang="en">Share</b> બટન દબાવી <b lang="en">Print</b> પસંદ કરો. આ પાનું બીજી ઍપની અંદર ખૂલ્યું હોય તો, <b>Safari માં ખોલો</b> દબાવો: તમારી પસંદગીઓ સાથે જશે.',
    nextHowToPrint: "આગળ: કેવી રીતે છાપવું ›",
    print: "છાપો",
    addToHomeScreen2: "હોમ સ્ક્રીન પર ઉમેરો",
    tapTheShareButtonAt: '<b lang="en">Share</b> બટન {icon} દબાવો (Safari માં નીચે, Chrome માં ઉપર જમણે).',
    scrollDownAndTapAdd: 'નીચે સરકાવી <b lang="en">Add to Home Screen</b> દબાવો.',
    tapAdd: '<b lang="en">Add</b> દબાવો.',
    openThisPageInSafari: 'આ પાનું <b lang="en">Safari</b> કે <b lang="en">Chrome</b> માં ખોલો (⋯ કે Share → Open in Safari/Chrome).',
    thenShareAddToHome: 'પછી Share {icon} → <b lang="en">Add to Home Screen</b> → <b lang="en">Add</b>.',
    openChromeSMenuTop: "Chrome નું <b>⋮</b> મેનુ ખોલો (ઉપર જમણે).",
    tapAddToHomeScreen: '<b lang="en">Add to Home screen</b> કે <b lang="en">Install app</b> દબાવો.',
    tapInstallOrAdd: '<b lang="en">Install</b> કે <b lang="en">Add</b> દબાવો.',
    clickTheInstallIconAt: 'સરનામાની પટ્ટીના જમણા છેડે ઇન્સ્ટૉલ આઇકન પર ક્લિક કરો, કે બ્રાઉઝરના મેનુમાંથી <b lang="en">Install</b> પસંદ કરો.',
    clickTheShareButtonIn: 'Safari ની ટૂલબારમાં <b lang="en">Share</b> બટન {icon} પર ક્લિક કરો, કે <b lang="en">File</b> મેનુ ખોલો.',
    chooseAddToDockThen: '<b lang="en">Add to Dock</b> પસંદ કરો, પછી <b lang="en">Add</b> પર ક્લિક કરો.',
    firefoxCanTAddThis: "Firefox આ સાઇટને ઍપ તરીકે ઉમેરી શકતું નથી. આ પાનું Chrome, Edge કે Safari માં ખોલી આ બટન ફરી દબાવો.",
    itWillThenOpenLike: "પછી તે ઇન્ટરનેટ વિના પણ ઍપની જેમ ખૂલશે.",
    ok: "બરાબર",
    home: "મુખ્ય પાનું",
    library: "સંગ્રહ",
    smaller: " નાનું",
    larger: " મોટું",
    allSettings: "બધી સેટિંગ્સ",
    settings: "સેટિંગ્સ",
    fontThemeLayout: "અક્ષર શૈલી, થીમ, ગોઠવણ",
    defaultSize: "↺ મૂળ કદ",
  },
  // Dates in the menu language (js/features/vedic-calendar.js)
  dates: {
    days: DAYS.gu,
    daysShort: ["રવિ", "સોમ", "મંગળ", "બુધ", "ગુરુ", "શુક્ર", "શનિ"],
    months: MONTHS.gu,
    monthsShort: MONTHS.gu,
    /** @param {number} wd @param {number} d @param {number} m */
    day: function (wd, d, m) {
      return DAYS.gu[wd] + ", " + d + " " + MONTHS.gu[m];
    },
    /** @param {number} wd @param {number} d @param {number} m @param {number} y */
    dayYear: function (wd, d, m, y) {
      return DAYS.gu[wd] + ", " + d + " " + MONTHS.gu[m] + " " + y;
    },
    /** @param {number} m @param {number} y */
    monthYear: function (m, y) {
      return MONTHS.gu[m] + " " + y;
    },
    /** @param {number} d @param {number} m */
    from: function (d, m) {
      return " (" + d + " " + MONTHS.gu[m] + " થી)";
    },
    /** @param {number} m @param {number} wd */
    before: function (m, wd) {
      return " " + MONTHS.gu[m] + ", " + DAYS.gu[wd] + ", ";
    },
  },
  // The language's own name, in its own letters: Settings → Menus and buttons (js/features/settings-panel.js)
  language: {
    name: "ગુજરાતી",
  },
  // The Sankashti line on Home, its place and its dates (js/features/sankashti.js)
  sankashti: {
    name: "સંકષ્ટી ચતુર્થી",
    angName: "અંગારકી સંકષ્ટી ચતુર્થી",
    /** @param {string} name */
    today: function (name) {
      return "આજે " + name;
    },
    /** @param {string} time */
    moonrise: function (time) {
      return "ચંદ્રોદય <b>" + time + "</b>";
    },
    /** @param {number} wd @param {number} d @param {number} m @param {number} y */
    day: function (wd, d, m, y) {
      return DAYS.gu[wd] + ", " + d + " " + MONTHS.gu[m] + (y ? " " + y : "");
    },
    /** @param {number} h @param {string} mi */
    time: function (h, mi) {
      return (h >= 20 || h < 4 ? "રાત્રે " : h >= 16 ? "સાંજે " : "") + (((h + 11) % 12) + 1) + ":" + mi;
    },
    late: " (મધરાત પછી)",
    yourPlace: "તમારું સ્થાન",
    /** @param {string} place */
    near: function (place) {
      return place + " નજીક";
    },
    /** @param {string} place */
    place: function (place) {
      return "સ્થાન: " + place;
    },
    noGeo: "આ બ્રાઉઝરમાં સ્થાન મળતું નથી",
    noPlace: "તમારું સ્થાન મળ્યું નહીં",
  },
};

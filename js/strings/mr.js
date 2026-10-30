// @ts-check
// The menu words in Marathi (मराठी), every part's under its name, as in js/strings/en.js (js/core/strings.js).

import { DAYS, dv, MONTHS, num } from "../core/words.js";
import { INITIALS_MAX, MAX_PROFILES } from "../store/profiles.js";
import { MAX_ADDED } from "../core/library.js";

export default {
  // Backup and restore (js/features/backup.js)
  backup: {
    months: MONTHS.mr,
    never: "अजून जतन केलेली नाही",
    /** @param {string} d */
    last: function (d) {
      return "शेवटची " + d + " रोजी";
    },
    saved: "बॅकअप फाइल जतन झाली",
    shared: "बॅकअप फाइल तयार",
    remindFirst: "तुमची सेटिंग्ज आणि दिनक्रम फक्त या फोनवर आहेत. फोनने वेबसाइटचा डेटा पुसला तर उपयोगी पडावी म्हणून अधूनमधून बॅकअप फाइल जतन करा.",
    /** @param {string} d */
    remind: function (d) {
      return "शेवटची बॅकअप फाइल " + d + " रोजी जतन केली होती. नवी जतन करायची?";
    },
    ask: "या फाइलमधून परत आणायचे?",
    /** @param {string} d @param {string} v */
    from: function (d, v) {
      return d + " रोजी जतन केलेली" + (v ? " (आवृत्ती " + v + ")" : "") + ".";
    },
    inFile: "फाइलमधील व्यक्ती: ",
    added: "या फोनवर नव्या: ",
    replaced: "फाइलमधील प्रतीने बदलल्या जातील (सेटिंग्ज आणि दिनक्रम): ",
    removed: "या फोनवरून काढल्या जातील: ",
    /** @param {string} n */
    then: function (n) {
      return "पुढे वाचणार: " + n + ".";
    },
    restore: "परत आणा",
    cancel: "रद्द करा",
    ok: "ठीक आहे",
    done: "बॅकअप फाइलमधून परत आणले",
    bad: "ही फाइल वापरता येत नाही",
    unsaved: "बॅकअप या फोनवर जतन होऊ शकला नाही. पुन्हा प्रयत्न करा, किंवा बॅकअप फाइल जपून ठेवा.",
    problems: {
      "not-json": "ही नित्य उपासनेची बॅकअप फाइल (.nitya) नाही.",
      "not-nitya": "ही नित्य उपासनेची बॅकअप फाइल (.nitya) नाही.",
      newer: "ही फाइल ॲपच्या नव्या आवृत्तीने जतन केली आहे. अपडेट तपासा (सेटिंग्ज → अधिक → माहिती, आवृत्तीची ओळ दाबा) आणि पुन्हा प्रयत्न करा.",
      kind: "ही .nitya फाइल पूर्ण बॅकअप नाही.",
      checksum: "जतन केल्यानंतर ही फाइल बदलली किंवा खराब झाली आहे (चेकसम जुळत नाही), त्यामुळे काहीही परत आणले नाही.",
      empty: "या बॅकअपमध्ये एकही व्यक्ती नाही.",
      read: "फाइल वाचता आली नाही.",
    },
  },
  // People on this phone: the badge and the profile sheet (js/features/profiles.js)
  profiles: {
    title: "कोण वाचत आहे?",
    add: "व्यक्ती जोडा",
    info: "प्रत्येकाचा अक्षरांचा आकार, भाषा, रंगसंगती आणि दिनक्रम या फोनवर वेगळ्या राहतात.",
    now: "आता वाचत आहे",
    edit: "बदला",
    addTitle: "व्यक्ती जोडा",
    editTitle: "बदला: ",
    name: "नाव",
    initials: "बॅजवरील अक्षरे",
    initialsHint: "जास्तीत जास्त " + "०१२३४५६७८९"[INITIALS_MAX] + ". रिकामे ठेवल्यास नावावरून.",
    colour: "रंग",
    save: "जतन करा",
    cancel: "रद्द करा",
    del: "ही व्यक्ती काढून टाका",
    /** @param {string} n */
    ask: function (n) {
      return n + " यांना काढून टाकायचे? त्यांची सेटिंग्ज आणि दिनक्रम या फोनवरून काढले जातील. आधी जतन केलेल्या बॅकअप फाइलमध्ये ते राहतील.";
    },
    yes: "काढून टाका",
    close: "बंद करा",
    empty: "कृपया नाव लिहा.",
    taken: "या फोनवर हे नाव आधीच आहे.",
    full: "जास्तीत जास्त " + dv(MAX_PROFILES) + " व्यक्ती ठेवता येतात.",
    /** @param {string} n */
    switched: function (n) {
      return "आता वाचत आहे: " + n;
    },
    /** @param {string} n */
    deleted: function (n) {
      return n + " काढले";
    },
    chip: "प्रोफाइल: ",
  },
  // The Library by category and the categories sheet (js/features/library.js)
  library: {
    open: "विभाग बदला",
    title: "विभाग",
    texts: "रचना",
    textsInfo: "प्रत्येक रचना कोणत्या विभागात दिसावी ते निवडा.",
    info: "हे या फोनवर इथे वाचणाऱ्या सर्वांसाठी राहते आणि बॅकअप फाइलमध्ये जतन होते. रचनांचे शब्द कधीही बदलत नाहीत.",
    add: "विभाग जोडा",
    rename: "नाव बदला",
    addTitle: "विभाग जोडा",
    renameTitle: "नाव बदला: ",
    mrName: "मराठी नाव",
    enName: "इंग्रजी नाव",
    hint: "एक पुरे: तेच दोन्हीसाठी वापरले जाईल.",
    save: "जतन करा",
    cancel: "रद्द करा",
    /** @param {string} n */
    reset: function (n) {
      return "मूळ नाव वापरा: " + n;
    },
    del: "हा विभाग काढून टाका",
    builtIn: "मूळचा विभाग: या फोनवर नाव बदलता येते, काढता येत नाही.",
    /** @param {string} n */
    ask: function (n) {
      return n + " काढून टाकायचा? त्यातील रचना आपापल्या मूळ विभागात परत जातील.";
    },
    yes: "काढून टाका",
    close: "बंद करा",
    empty: "कृपया नाव लिहा.",
    taken: "हे नाव दुसऱ्या विभागाला आधीच आहे.",
    full: "स्वतःचे जास्तीत जास्त " + dv(MAX_ADDED) + " विभाग ठेवता येतात.",
    /** @param {number} n */
    count: function (n) {
      return n === 0 ? "अजून एकही रचना नाही (संग्रहात दिसत नाही)" : dv(n) + " रचना";
    },
    /** @param {string} t @param {string} c */
    moved: function (t, c) {
      return t + ": आता " + c + " विभागात";
    },
    /** @param {string} t */
    catFor: function (t) {
      return t + " हिचा विभाग";
    },
    /** @param {string} n */
    added: function (n) {
      return n + " जोडला";
    },
    /** @param {string} n */
    renamed: function (n) {
      return "नवे नाव: " + n;
    },
    /** @param {string} n */
    deleted: function (n) {
      return n + " काढला";
    },
  },
  // Home: the date, the sessions and their texts (js/features/today-card.js)
  today: {
    days: DAYS.mr,
    months: MONTHS.mr,
    sessions: { morning: "सकाळ", afternoon: "दुपार", evening: "सायंकाळ" },
    tabs: "वेळ",
    unset: "काहीच नाही",
    /** @param {number} n */
    texts: function (n) {
      return dv(n) + " रचना";
    },
    none: "काही ठरलेले नाही",
    /** @param {string} s */
    empty: function (s) {
      return s + "साठी अजून काही ठरवलेले नाही. ";
    },
    add: "रचना जोडा",
    edit: "बदला",
    /** @param {string} s */
    editL: function (s) {
      return "बदला: " + s + "चा दिनक्रम";
    },
    end: "आज",
    ended: "या वेळेची उपासना पूर्ण",
    prev: "आधीचा दिवस",
    next: "पुढचा दिवस",
    today: "आज",
    tomorrow: "उद्या",
    yesterday: "काल",
    /** @param {number} n */
    later: function (n) {
      return dv(n) + " दिवसांनी";
    },
    /** @param {number} n */
    ago: function (n) {
      return dv(n) + " दिवसांपूर्वी";
    },
  },
  // The routine builder and its Add texts picker (js/features/routine-builder.js)
  routine: {
    /** @param {string} n */
    title: function (n) {
      return "दिनक्रम: " + n;
    },
    sessions: { morning: "सकाळ", afternoon: "दुपार", evening: "सायंकाळ" },
    sessionG: "वेळ",
    modes: { fixed: "रोज तेच", weekday: "वारानुसार वेगळे" },
    modeG: "कोणते दिवस",
    days: DAYS.mr,
    short: ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"],
    dayG: "वार",
    /** @param {number} n */
    texts: function (n) {
      return dv(n) + " रचना";
    },
    /** @param {string} s @param {number | null} d */
    what: function (s, d) {
      return d === null ? "रोज " + s : this.days[d] + " " + s;
    },
    copy: "इतर वारांना हीच यादी…",
    /** @param {string} w */
    copyTo: function (w) {
      return w + "ची यादी या वारांना द्या:";
    },
    copyGo: "द्या",
    cancel: "रद्द करा",
    /** @param {string[]} d */
    copied: function (d) {
      return d.length ? d.join(", ") + " यांना दिली" : "एकही वार निवडला नाही";
    },
    /** @param {string} t */
    up: function (t) {
      return "वर हलवा: " + t;
    },
    /** @param {string} t */
    down: function (t) {
      return "खाली हलवा: " + t;
    },
    /** @param {string} t */
    remove: function (t) {
      return "काढा: " + t;
    },
    /** @param {string} t @param {number} i @param {number} n */
    moved: function (t, i, n) {
      return t + " " + dv(n) + " पैकी " + dv(i) + " वर हलवली";
    },
    /** @param {string} t */
    removed: function (t) {
      return t + " काढली";
    },
    /** @param {string} t @param {number} n */
    added: function (t, n) {
      return t + " जोडली, " + dv(n) + " पैकी " + dv(n);
    },
    /** @param {string} w */
    empty: function (w) {
      return w + "साठी अजून रचना नाहीत. सुरुवात करण्यासाठी रचना जोडा.";
    },
    hint: "कीबोर्डवर Alt+↑/↓ ने हलवा",
    add: "रचना जोडा",
    /** @param {string} w */
    addTo: function (w) {
      return w + "साठी रचना जोडा";
    },
    search: "शोधा (मराठी किंवा इंग्रजी)",
    none: "काही सापडले नाही",
    done: "झाले",
    /** @param {number} n */
    found: function (n) {
      return dv(n) + " रचना सापडल्या";
    },
    /** @param {string} d */
    toFixed: function (d) {
      return "आता रोज " + d + "चीच यादी";
    },
    toWeek: "आता प्रत्येक वाराची यादी वेगळी ठेवता येईल",
    /** @param {string} d */
    fixAsk: function (d) {
      return d + "ची यादी रोज वापरायची? इतर वारांच्या वेगळ्या याद्या काढल्या जातील.";
    },
    fixGo: "रोज वापरा",
  },
  // The print builder's What step: Texts, Today, Routine (js/print/what.js)
  printWhat: {
    what: "काय प्रिंट करायचे",
    search: "संग्रहात शोधा",
    all: "सर्व रचना",
    selectAll: "सर्व निवडा",
    clear: "सर्व काढा",
    none: "अशी रचना नाही",
    /** @param {number} n */
    texts: function (n) {
      return num(n) + " रचना";
    },
    pick: "किमान एक रचना निवडा",
    tabs: { texts: "संग्रह", today: "आज", routine: "दिनक्रम" },
    todayInfo: "सत्र निवडा: त्यातील रचना प्रिंट होतील.",
    allToday: "आजचे सर्व",
    /** @param {string} d the weekday */
    allDay: function (d) {
      return d + "चे सर्व";
    },
    empty: "एकही रचना नाही",
    who: "कोणाचा दिनक्रम",
    week: "पूर्ण आठवडा",
    oneDay: "एक दिवस",
    days: "वार",
    sessions: "वेळ",
    order: "प्रत्येक रचना एकदाच, दिनक्रमाच्या क्रमाने",
    noTexts: "रचना नाहीत",
    nothing: "निवडलेल्या वारी आणि वेळी एकही रचना नाही",
  },
  // The Vedic calendar: the line on Home, the calendar page, This week and 15 days (js/features/vedic-calendar.js)
  calendar: {
    /** @param {string} name */
    wiki: function (name) {
      return name + " — विकिपीडिया (नवीन टॅबमध्ये उघडेल)";
    },
    /** "सकाळी ७:४५": the part of the day, then the time @param {number} h @param {string} mi */
    clock: function (h, mi) {
      var part = h < 4 ? "रात्री" : h < 6 ? "पहाटे" : h < 12 ? "सकाळी" : h < 16 ? "दुपारी" : h < 20 ? "सायं." : "रात्री";
      return part + " " + dv(((h + 11) % 12) + 1) + ":" + dv(mi);
    },
    /** "मंगळवार २८ जुलै" @param {number} wd @param {number} d @param {number} m */
    dayLabel: function (wd, d, m) {
      return DAYS.mr[wd] + " " + dv(d) + " " + MONTHS.mr[m];
    },
    open: " (पंचांग उघडा)",
    sunrise: "सूर्योदय",
    sunset: "सूर्यास्त",
    noRise: "या दिवशी चंद्रोदय नाही",
    /** @param {number} d @param {string} time */
    until: function (d, time) {
      return (d >= 0 ? DAYS.mr[d] + "ी " : "") + time + " पर्यंत";
    },
    amanta: "अमान्त",
    today: "आज",
    loc: "माझे ठिकाण वापरा",
    pic: "चित्र मोठे पाहा",
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
    /** @param {number} d @param {number} m @param {string} what */
    showing: function (d, m, what) {
      return dv(d) + " " + MONTHS.mr[m] + ": " + what;
    },
    week: "या आठवड्यात",
    /** Home's card of what comes next (#upw): the next two after the day shown */
    coming: "येत्या दिवसांत",
    next15: "पुढचे १५ दिवस",
    day: "दिवस",
    month: "महिना",
    up: "१५ दिवस",
    prevDay: "मागचा दिवस",
    nextDay: "पुढचा दिवस",
    prevU: "मागचे १५ दिवस",
    nextU: "पुढचे १५ दिवस",
    todayB: "आज",
    view: "दाखवा",
    upTitle: "पुढचे १५ दिवस",
    nextWeek: "पुढच्या आठवड्यात",
    uYesterday: "काल",
    /** @param {number} n */
    uAgo: function (n) {
      return dv(n) + " दिवसांपूर्वी";
    },
    uToday: "आज",
    uTomorrow: "उद्या",
    /** @param {number} n */
    uIn: function (n) {
      return dv(n) + " दिवसांनी";
    },
    /** @param {number} a @param {number} b */
    uDays: function (a, b) {
      return "दिवस " + dv(a) + (a === b ? "" : "–" + dv(b));
    },
    /** @param {string} d */
    uUntil: function (d) {
      return d + "पर्यंत";
    },
    uNext: "पुढे",
    uNone: "या दिवसांत काही नाही.",
    kinds: { fest: "सण", sk: "संकष्टी", pradosh: "प्रदोष", hol: "सुट्ट्या" },
  },
  bar: {
    /** @param {string} t */
    home: function (t) {
      return "मुख्य पान: " + t;
    },
    find: "रचना किंवा ओळ शोधा",
  },
  bottomBar: {
    prev: "‹ मागील",
    next: "पुढील ›",
  },
  fold: {
    open: "उघडा",
    fold: "मिटवा",
  },
  languages: {
    both: "दोन्ही",
    second: "+ दुसरी भाषा",
    none: "काहीही नाही",
    refrain: "↻ ध्रुपद",
    close: "बंद करा",
    reset: "मूळ आकार",
    /** @param {string} pct */
    size: function (pct) {
      return "अक्षरांचा आकार " + pct + "%";
    },
  },
  dhrupad: {
    once: "ध्रुपद एकदाच",
    every: "ध्रुपद प्रत्येक कडव्यानंतर",
  },
  settings: {
    /** @param {string} why */
    failed: function (why) {
      return "बदल पूर्ण झाला नाही (" + why + ")";
    },
  },
  pictureViewer: {
    hint: "मोठे करण्यासाठी दोन बोटांनी पसरा किंवा दोनदा टॅप करा",
  },
  pdfs: {
    saved: "या फोनवर जतन",
    online: "फक्त ऑनलाइन",
  },
  offline: {
    state: { idle: "ऑफलाइन तयार", save: "ऑफलाइनसाठी जतन…", off: "जतन केलेली प्रत" },
    update: { check: "अपडेट तपासा", busy: "तपासत आहे…", ok: "सर्व अद्ययावत आहे", off: "इंटरनेट नाही", restart: "ॲप बंद करून पुन्हा उघडा" },
    usingSaved: "इंटरनेट नाही. जतन केलेली प्रत वापरत आहे.",
    loading: "नवीन आवृत्ती, उघडत आहे…",
    /** @param {string} v the new version ("v1.37.17") */
    reopen: function (v) {
      return "आवृत्ती " + v + " जतन झाली. पूर्ण करण्यासाठी ॲप बंद करून पुन्हा उघडा.";
    },
  },
  search: {
    /** @param {string} name */
    remove: function (name) {
      return "काढा: " + name;
    },
    nothing: "काही सापडले नाही",
    /** @param {number} n */
    lines: function (n) {
      return (n < 0 ? "४० किंवा अधिक" : dv(n)) + " ओळी सापडल्या";
    },
    /** @param {number} t @param {number} n */
    both: function (t, n) {
      return dv(t) + " रचना आणि " + (n < 0 ? "४० किंवा अधिक" : dv(n)) + " ओळी सापडल्या";
    },
    texts: "रचना",
    linesHead: "ओळी",
  },
  share: {
    tip: "\nफोनवर ॲपसारखे ठेवण्यासाठी: लिंक उघडा आणि होम स्क्रीनवर जोडा (Add to Home Screen) दाबा.",
    /** @param {string} title */
    plain: function (title) {
      return title + " — पूजा आणि आरती";
    },
    temple: " · पूजा सायं. ७:०० ते ८:३०, भारतीय हिंदू मंदिर, पॉवेल",
    /** @param {string} title @param {string} ang @param {string} date @param {string} temple @param {string} rise */
    next: function (title, ang, date, temple, rise) {
      return title + " — पूजा आणि आरती\nपुढील " + ang + "Sankathara Chaturthi: " + date + temple + (rise ? " · चंद्रोदय " + rise : "");
    },
    copied: "संदेश कॉपी झाला",
  },
  print: {
    langs: { mr: "मराठी", kn: "कन्नड", te: "तेलुगू", gu: "गुजराती", en: "इंग्रजी" },
    portrait: "उभे",
    landscape: "आडवे",
    both: "दोन्ही",
    /** @param {string} l1 @param {string} l2 */
    stacked: function (l1, l2) {
      return "उभे: वर " + l1 + ", खाली " + l2;
    },
    side: "आडवे: शेजारी शेजारी",
    preview: "पहिल्या पानाची झलक",
    /** @param {string} paper */
    use: function (paper) {
      return paper + " वापरा";
    },
    cancel: "रद्द",
    linkCopied: "लिंक कॉपी झाली: Safari मध्ये पेस्ट करा",
    gone: "निवडलेल्या रचना आता संग्रहात नाहीत: पुन्हा निवडा.",
    /** @param {number} m @param {number} y */
    cover: function (m, y) {
      return "नित्य उपासना · " + MONTHS.mr[m] + " " + dv(y);
    },
    week: "आठवडा एका नजरेत",
    contents: "अनुक्रमणिका",
  },
  page: {
    appAddToHomeScreen: 'ॲप<span class="sr"> (होम स्क्रीनवर ठेवा)</span>',
    share: "शेअर",
    qrCode: 'QR<span class="sr"> कोड</span>',
    help: "मदत",
    back: "मागे",
    chants: "पाठ",
    books: "पोथी",
    recent: "अलीकडे",
    clear: "सर्व काढा",
    nothingFound: "काही सापडले नाही",
    reading: "वाचन",
    screen: "स्क्रीन",
    more: "अधिक",
    preview: "नमुना",
    languageAndText: "भाषा आणि अक्षरे",
    mainLanguage: "मुख्य भाषा",
    largeText: "मोठ्या अक्षरांत",
    secondLanguage: "दुसरी भाषा",
    smallerUnderEachLine: "लहान, प्रत्येक ओळीखाली",
    show: "दाखवा",
    textSize: "अक्षरांचा आकार",
    textFont: "अक्षरशैली",
    traditional: "पारंपरिक",
    modern: "आधुनिक",
    bold: "ठळक",
    verses: "कडवी",
    dhrupad: "ध्रुपद",
    once: "एकदा",
    everyVerse: "प्रत्येक कडव्यानंतर",
    layout: "मांडणी",
    n1Column: "१ स्तंभ",
    n2Columns: "२ स्तंभ",
    menusAndButtons: "मेनू आणि बटणे",
    theme: "रंगसंगती",
    auto: "आपोआप",
    light: "फिकट",
    sepia: "सेपिया",
    dark: "गडद",
    highContrast: "अधिक ठळक",
    keepScreenOn: "स्क्रीन चालू ठेवा",
    afterLastTouch: "शेवटच्या स्पर्शानंतर, मिनिटे",
    off: "बंद",
    profilesAndBackup: "प्रोफाइल आणि बॅकअप",
    thisBrowserCanTSave: "हा ब्राउझर इथे काहीही जतन करू शकत नाही. पान बंद करण्यापूर्वी बॅकअप फाइल जतन करा.",
    whoIsReading: "कोण वाचत आहे",
    routine: "दिनक्रम",
    theTextsForEachSession: "प्रत्येक वेळेच्या रचना आणि त्यांचा क्रम",
    saveABackupFile: "बॅकअप फाइल जतन करा",
    restoreFromAFile: "फाइलमधून परत आणा",
    aNityaFileSavedBefore: "आधी जतन केलेली .nitya फाइल",
    about: "माहिती",
    helpAndHowToUse: "मदत आणि वापर",
    addToHomeScreen: "होम स्क्रीनवर ठेवा",
    nityaUpasana: "नित्य उपासना",
    notNow: "आता नको",
    scanWithTheCameraTo: "उघडण्यासाठी कॅमेऱ्याने स्कॅन करा",
    close: "बंद",
    whatToPrint: "‹ काय प्रिंट करायचे",
    printPdf: "प्रिंट / PDF",
    whatToPrint2: "काय प्रिंट करायचे",
    howToPrint: "कसे प्रिंट करायचे",
    language: "भाषा",
    dhrupad2: "ध्रुपद (धृ)",
    once2: "एकदाच",
    page: "पान",
    printFont: "प्रिंटची अक्षरशैली",
    everyTextStartsOnA: 'प्रत्येक रचना नव्या पानावर सुरू होते. कागद: <b class="prpaper">Letter</b>',
    forLandscapePickItIn: 'आडव्या पानासाठी Safari च्या प्रिंट विंडोतही <span lang="en">Landscape</span> निवडा.',
    pickA4PaperInSafari: 'Safari च्या प्रिंट विंडोतही <span class="przp" lang="en">A4</span> कागद निवडा.',
    chromePrintsItBest: "Chrome मधून प्रिंट अधिक चांगली येते.",
    readyPrintNow: "तयार आहे: प्रिंट करा",
    openInSafari: "Safari मध्ये उघडा",
    copyLink: "लिंक कॉपी करा",
    printingDoesNotOpenFrom:
      "iPhone वर होम स्क्रीनवरील ॲपमधून प्रिंट उघडत नाही. <b>Safari मध्ये उघडा</b> दाबा: तुमच्या निवडी सोबत जातात आणि तिथे प्रिंट तयार होते. Safari उघडले नाही तर लिंक कॉपी करा आणि Safari मध्ये पेस्ट करा.",
    thisBrowserDidNotOpen:
      "या ब्राउझरने प्रिंट विंडो उघडली नाही. ब्राउझरचे <b>शेअर</b> बटण दाबा आणि <b>प्रिंट</b> निवडा. दुसऱ्या ॲपमधून उघडले असल्यास <b>Safari मध्ये उघडा</b> दाबा: तुमच्या निवडी सोबत जातात.",
    nextHowToPrint: "पुढे: कसे प्रिंट करायचे ›",
    print: "प्रिंट",
    addToHomeScreen2: "होम स्क्रीनवर जोडा",
    tapTheShareButtonAt: "शेअर बटण {icon} दाबा (Safari मध्ये खाली, Chrome मध्ये वर उजवीकडे).",
    scrollDownAndTapAdd: 'खाली स्क्रोल करून <b lang="en">Add to Home Screen</b> दाबा.',
    tapAdd: '<b lang="en">Add</b> दाबा.',
    openThisPageInSafari: 'हे पान <b lang="en">Safari</b> किंवा <b lang="en">Chrome</b> मध्ये उघडा (⋯ किंवा शेअर → Open in Safari/Chrome).',
    thenShareAddToHome: 'मग शेअर {icon} → <b lang="en">Add to Home Screen</b> → <b lang="en">Add</b>.',
    openChromeSMenuTop: "Chrome चा <b>⋮</b> मेनू (वर उजवीकडे) उघडा.",
    tapAddToHomeScreen: '<b lang="en">Add to Home screen</b> किंवा <b lang="en">Install app</b> दाबा.',
    tapInstallOrAdd: '<b lang="en">Install</b> किंवा <b lang="en">Add</b> दाबा.',
    clickTheInstallIconAt: 'पत्त्याच्या पट्टीच्या उजव्या टोकाला असलेले Install चिन्ह दाबा, किंवा ब्राउझरच्या मेनूतून <b lang="en">Install</b> निवडा.',
    clickTheShareButtonIn: 'Safari च्या टूलबारवरील शेअर बटण {icon} दाबा, किंवा <b lang="en">File</b> मेनू उघडा.',
    chooseAddToDockThen: '<b lang="en">Add to Dock</b> निवडा, मग <b lang="en">Add</b> दाबा.',
    firefoxCanTAddThis: "Firefox मध्ये हे ॲप म्हणून जोडता येत नाही. हे पान Chrome, Edge किंवा Safari मध्ये उघडा आणि हे बटण पुन्हा दाबा.",
    itWillThenOpenLike: "मग ते ॲपसारखे उघडेल, इंटरनेटशिवायही.",
    ok: "ठीक आहे",
    home: "मुख्यपृष्ठ",
    library: "संग्रह",
    vedicCalendar: "पंचांग",
    smaller: " लहान",
    larger: " मोठे",
    allSettings: "सर्व सेटिंग्ज",
    settings: "सेटिंग्ज",
    fontThemeLayout: "अक्षरशैली, रंगसंगती, मांडणी",
    defaultSize: "↺ मूळ आकार",
  },
  dates: {
    days: DAYS.mr,
    daysShort: ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"],
    months: MONTHS.mr,
    monthsShort: MONTHS.mr,
    /** @param {number} wd @param {number} d @param {number} m */
    day: function (wd, d, m) {
      return DAYS.mr[wd] + ", " + dv(d) + " " + MONTHS.mr[m];
    },
    /** @param {number} wd @param {number} d @param {number} m @param {number} y */
    dayYear: function (wd, d, m, y) {
      return DAYS.mr[wd] + ", " + dv(d) + " " + MONTHS.mr[m] + " " + dv(y);
    },
    /** @param {number} m @param {number} y */
    monthYear: function (m, y) {
      return MONTHS.mr[m] + " " + dv(y);
    },
    /** @param {number} d @param {number} m */
    from: function (d, m) {
      return " (" + dv(d) + " " + MONTHS.mr[m] + "पासून)";
    },
    /** @param {number} m @param {number} wd */
    before: function (m, wd) {
      return " " + MONTHS.mr[m] + ", " + DAYS.mr[wd] + ", ";
    },
  },
  language: {
    name: "मराठी",
  },
  sankashti: {
    name: "संकष्टी चतुर्थी",
    angName: "अंगारकी संकष्टी चतुर्थी",
    /** @param {string} name */
    today: function (name) {
      return name + " आज";
    },
    /** @param {string} time */
    moonrise: function (time) {
      return "चंद्रोदय <b>" + time + "</b>";
    },
    /** @param {number} wd @param {number} d @param {number} m @param {number} y */
    day: function (wd, d, m, y) {
      return DAYS.mr[wd] + ", " + dv(d) + " " + MONTHS.mr[m] + (y ? " " + dv(y) : "");
    },
    /** @param {number} h @param {string} mi */
    time: function (h, mi) {
      return (h >= 20 || h < 4 ? "रात्री " : h >= 16 ? "सायं. " : "") + dv(((h + 11) % 12) + 1) + ":" + dv(mi);
    },
    late: " (मध्यरात्रीनंतर)",
    yourPlace: "तुमचे ठिकाण",
    /** @param {string} place */
    near: function (place) {
      return place + " जवळ";
    },
    /** @param {string} place */
    place: function (place) {
      return "ठिकाण: " + place;
    },
    noGeo: "हे ब्राउझर ठिकाण देऊ शकत नाही",
    noPlace: "ठिकाण मिळाले नाही",
  },
};

// @ts-check
// The menu words in Telugu (తెలుగు), every part's under its name, as in js/strings/en.js (js/core/strings.js).
// Digits stay as they are (1, 2, 3): Telugu menus on phones write them so.

import { DAYS, MONTHS } from "../core/words.js";
import { INITIALS_MAX, MAX_PROFILES } from "../store/profiles.js";
import { MAX_ADDED } from "../core/library.js";

/** "ఉదయం 7:45": the part of the day, then the time @param {number} h 0–23 @param {string} mi */
function clock(h, mi) {
  var part = h < 4 ? "రాత్రి" : h < 6 ? "తెల్లవారుజాము" : h < 12 ? "ఉదయం" : h < 16 ? "మధ్యాహ్నం" : h < 20 ? "సాయంత్రం" : "రాత్రి";
  return part + " " + (((h + 11) % 12) + 1) + ":" + mi;
}

/** "1 పాఠం", "3 పాఠాలు" @param {number} n */
function texts(n) {
  return n + (n === 1 ? " పాఠం" : " పాఠాలు");
}

export default {
  // Backup and restore (js/features/backup.js)
  backup: {
    months: MONTHS.te,
    never: "ఇంకా సేవ్ చేయలేదు",
    /** @param {string} d */
    last: function (d) {
      return "చివరిగా సేవ్ చేసింది " + d;
    },
    saved: "బ్యాకప్ ఫైల్ సేవ్ అయింది",
    shared: "బ్యాకప్ ఫైల్ సిద్ధంగా ఉంది",
    remindFirst: "మీ సెట్టింగ్‌లు, దినచర్య ఈ ఫోన్‌లో మాత్రమే ఉన్నాయి. ఫోన్ వెబ్‌సైట్ డేటాను తొలగించినా మిగిలి ఉండేలా, అప్పుడప్పుడు బ్యాకప్ ఫైల్ సేవ్ చేయండి.",
    /** @param {string} d */
    remind: function (d) {
      return "మీ చివరి బ్యాకప్ ఫైల్ " + d + " న సేవ్ అయింది. కొత్తది సేవ్ చేయాలా?";
    },
    ask: "ఈ ఫైల్ నుండి పునరుద్ధరించాలా?",
    /** @param {string} d @param {string} v */
    from: function (d, v) {
      return d + " న సేవ్ చేయబడింది" + (v ? " (వెర్షన్ " + v + ")" : "") + ".";
    },
    inFile: "ఫైల్‌లో ఉన్నవారు: ",
    added: "ఈ ఫోన్‌లో కొత్తవారు: ",
    replaced: "ఫైల్‌లోని ప్రతితో మార్చబడింది (సెట్టింగ్‌లు, దినచర్య): ",
    removed: "ఈ ఫోన్ నుండి తీసివేయబడింది: ",
    /** @param {string} n */
    then: function (n) {
      return "తర్వాత చదివేవారు: " + n + ".";
    },
    restore: "పునరుద్ధరించు",
    cancel: "రద్దు చేయి",
    ok: "సరే",
    done: "బ్యాకప్ ఫైల్ నుండి పునరుద్ధరించబడింది",
    bad: "ఈ ఫైల్ నుండి పునరుద్ధరించడం సాధ్యం కాదు",
    unsaved: "బ్యాకప్‌ను ఈ ఫోన్‌లో సేవ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి, లేదా బ్యాకప్ ఫైల్‌ను ఉంచుకోండి.",
    problems: {
      "not-json": "ఇది నిత్య ఉపాసన బ్యాకప్ ఫైల్ (.nitya) కాదు.",
      "not-nitya": "ఇది నిత్య ఉపాసన బ్యాకప్ ఫైల్ (.nitya) కాదు.",
      newer:
        "ఈ ఫైల్‌ను యాప్ యొక్క కొత్త వెర్షన్ సేవ్ చేసింది. అప్‌డేట్‌ల కోసం చూడండి (సెట్టింగ్‌లు → మరిన్ని → గురించి, వెర్షన్ పంక్తిని నొక్కండి), మళ్లీ ప్రయత్నించండి.",
      kind: "ఈ .nitya ఫైల్ పూర్తి బ్యాకప్ కాదు.",
      checksum: "సేవ్ చేసిన తర్వాత ఈ ఫైల్ మారింది లేదా పాడైంది (దాని చెక్‌సమ్ సరిపోలడం లేదు), కాబట్టి ఏదీ పునరుద్ధరించబడలేదు.",
      empty: "ఈ బ్యాకప్‌లో ఎవరూ లేరు.",
      read: "ఫైల్‌ను చదవలేకపోయాం.",
    },
  },
  // People on this phone: the badge and the profile sheet (js/features/profiles.js)
  profiles: {
    title: "ఎవరు చదువుతున్నారు?",
    add: "వ్యక్తిని జోడించు",
    info: "ప్రతి ఒక్కరూ తమ సొంత అక్షర పరిమాణం, భాషలు, థీమ్, దినచర్యను ఈ ఫోన్‌లో ఉంచుకుంటారు.",
    now: "ఇప్పుడు చదువుతున్నవారు",
    edit: "మార్చు",
    addTitle: "వ్యక్తిని జోడించు",
    editTitle: "మార్చు: ",
    name: "పేరు",
    initials: "బ్యాడ్జ్‌పై అక్షరాలు",
    initialsHint: INITIALS_MAX + " అక్షరాల వరకు. ఖాళీగా వదిలితే పేరు నుండి తీసుకుంటాం.",
    colour: "రంగు",
    save: "సేవ్ చేయి",
    cancel: "రద్దు చేయి",
    del: "ఈ వ్యక్తిని తొలగించు",
    /** @param {string} n */
    ask: function (n) {
      return n + " ను తొలగించాలా? వారి సెట్టింగ్‌లు, దినచర్య ఈ ఫోన్ నుండి తీసివేయబడతాయి. ముందు సేవ్ చేసిన బ్యాకప్ ఫైల్‌లో అవి ఇంకా ఉంటాయి.";
    },
    yes: "తొలగించు",
    close: "మూసివేయి",
    empty: "దయచేసి పేరు రాయండి.",
    taken: "ఈ ఫోన్‌లో ఇప్పటికే ఈ పేరుతో ఒకరు ఉన్నారు.",
    full: MAX_PROFILES + " మందికి మాత్రమే చోటు ఉంది.",
    /** @param {string} n */
    switched: function (n) {
      return "ఇప్పుడు చదువుతున్నవారు: " + n;
    },
    /** @param {string} n */
    deleted: function (n) {
      return n + " తొలగించబడ్డారు";
    },
    chip: "ప్రొఫైల్: ",
  },
  // The Library by category and the categories sheet (js/features/library.js)
  library: {
    open: "విభాగాలను మార్చు",
    title: "విభాగాలు",
    texts: "పాఠాలు",
    textsInfo: "ప్రతి పాఠం ఏ విభాగంలో ఉండాలో ఎంచుకోండి.",
    info: "ఇక్కడ చదివే అందరి కోసం ఈ ఫోన్‌లో ఉంచబడుతుంది, బ్యాకప్ ఫైల్‌లలో సేవ్ అవుతుంది. పాఠాల పదాలు ఎప్పటికీ మారవు.",
    add: "విభాగాన్ని జోడించు",
    rename: "పేరు మార్చు",
    addTitle: "విభాగాన్ని జోడించు",
    renameTitle: "పేరు మార్చు: ",
    mrName: "మరాఠీలో పేరు",
    enName: "ఇంగ్లీషులో పేరు",
    hint: "ఒకటి చాలు: రెండింటికీ అదే వాడతాం.",
    save: "సేవ్ చేయి",
    cancel: "రద్దు చేయి",
    /** @param {string} n */
    reset: function (n) {
      return "అసలు పేరు వాడు: " + n;
    },
    del: "ఈ విభాగాన్ని తొలగించు",
    builtIn: "అంతర్నిర్మితం: ఈ ఫోన్‌లో పేరు మార్చవచ్చు, తొలగించలేరు.",
    /** @param {string} n */
    ask: function (n) {
      return n + " ను తొలగించాలా? దాని పాఠాలు మొదట ఉన్న విభాగాలకు తిరిగి వెళ్తాయి.";
    },
    yes: "తొలగించు",
    close: "మూసివేయి",
    empty: "దయచేసి పేరు రాయండి.",
    taken: "మరో విభాగానికి ఇప్పటికే ఈ పేరు ఉంది.",
    full: "మీ సొంత " + MAX_ADDED + " విభాగాలకు చోటు ఉంది.",
    /** @param {number} n */
    count: function (n) {
      return n === 0 ? "ఇంకా పాఠాలు లేవు (సంగ్రహంలో చూపబడదు)" : texts(n);
    },
    /** @param {string} t @param {string} c */
    moved: function (t, c) {
      return t + ": ఇప్పుడు " + c + " విభాగంలో";
    },
    /** @param {string} t */
    catFor: function (t) {
      return t + ": విభాగం";
    },
    /** @param {string} n */
    added: function (n) {
      return n + " జోడించబడింది";
    },
    /** @param {string} n */
    renamed: function (n) {
      return "పేరు మారింది: " + n;
    },
    /** @param {string} n */
    deleted: function (n) {
      return n + " తొలగించబడింది";
    },
  },
  // Home: the date, the sessions and their texts (js/features/today-card.js)
  today: {
    days: DAYS.te,
    months: MONTHS.te,
    sessions: { morning: "ఉదయం", afternoon: "మధ్యాహ్నం", evening: "సాయంత్రం" },
    tabs: "సమయం",
    unset: "ఏదీ నిర్ణయించలేదు",
    texts: texts,
    none: "ఏదీ ప్రణాళిక లేదు",
    /** @param {string} s */
    empty: function (s) {
      return s + " సమయానికి ఇంకా ఏదీ ప్రణాళిక లేదు. ";
    },
    add: "పాఠాలు జోడించు",
    edit: "మార్చు",
    /** @param {string} s */
    editL: function (s) {
      return "దినచర్య మార్చు: " + s;
    },
    end: "ఈరోజు",
    ended: "ఈ సమయం ముగిసింది",
    prev: "ముందటి రోజు",
    next: "తర్వాతి రోజు",
    today: "ఈరోజు",
    tomorrow: "రేపు",
    yesterday: "నిన్న",
    /** @param {number} n */
    later: function (n) {
      return n + " రోజుల్లో";
    },
    /** @param {number} n */
    ago: function (n) {
      return n + " రోజుల క్రితం";
    },
    /** @param {string} d the weekday's name, as HTML */
    showing: function (d) {
      return "<b>" + d + "</b> చూపబడుతోంది";
    },
    back: "ఈరోజు ›",
  },
  // The routine builder and its Add texts picker (js/features/routine-builder.js)
  routine: {
    /** @param {string} n */
    title: function (n) {
      return n + " దినచర్య";
    },
    sessions: { morning: "ఉదయం", afternoon: "మధ్యాహ్నం", evening: "సాయంత్రం" },
    sessionG: "సమయం",
    modes: { fixed: "ప్రతిరోజూ ఒకటే", weekday: "వారంలో రోజును బట్టి వేరు" },
    modeG: "ఏ రోజులు",
    days: DAYS.te,
    short: ["ఆది", "సోమ", "మంగళ", "బుధ", "గురు", "శుక్ర", "శని"],
    dayG: "రోజు",
    texts: texts,
    /** @param {string} s @param {number | null} d */
    what: function (s, d) {
      return d === null ? "ప్రతిరోజూ " + s : this.days[d] + " " + s;
    },
    copy: "ఇతర రోజులకు కాపీ చేయి…",
    /** @param {string} w */
    copyTo: function (w) {
      return w + ": ఈ జాబితాను వీటికి కాపీ చేయి:";
    },
    copyGo: "కాపీ చేయి",
    cancel: "రద్దు చేయి",
    /** @param {string[]} d */
    copied: function (d) {
      return d.length ? d.join(", ") + " రోజులకు కాపీ అయింది" : "ఏ రోజూ ఎంచుకోలేదు";
    },
    /** @param {string} t */
    up: function (t) {
      return t + " ను పైకి జరుపు";
    },
    /** @param {string} t */
    down: function (t) {
      return t + " ను కిందికి జరుపు";
    },
    /** @param {string} t */
    remove: function (t) {
      return t + " ను తీసివేయి";
    },
    /** @param {string} t @param {number} i @param {number} n */
    moved: function (t, i, n) {
      return t + " ఇప్పుడు " + n + " లో " + i + "వ స్థానంలో";
    },
    /** @param {string} t */
    removed: function (t) {
      return t + " తీసివేయబడింది";
    },
    /** @param {string} t @param {number} n */
    added: function (t, n) {
      return t + " జోడించబడింది, " + n + " లో " + n + "వది";
    },
    /** @param {string} w */
    empty: function (w) {
      return w + ": ఇంకా పాఠాలు లేవు. మొదలుపెట్టడానికి పాఠాలు జోడించండి.";
    },
    hint: "కీబోర్డ్‌లో Alt+↑/↓ జరుపుతుంది",
    add: "పాఠాలు జోడించు",
    /** @param {string} w */
    addTo: function (w) {
      return w + ": పాఠాలు జోడించు";
    },
    search: "వెతుకు (మరాఠీ లేదా ఇంగ్లీషు)",
    none: "ఏదీ దొరకలేదు",
    done: "పూర్తయింది",
    /** @param {number} n */
    found: function (n) {
      return n === 1 ? "1 పాఠం దొరికింది" : n + " పాఠాలు దొరికాయి";
    },
    /** @param {string} d */
    toFixed: function (d) {
      return d + ": ఈ జాబితా ఇప్పుడు ప్రతిరోజూ వాడబడుతుంది";
    },
    toWeek: "ఇప్పుడు వారంలో ప్రతి రోజుకూ సొంత జాబితా ఉండవచ్చు",
    /** @param {string} d */
    fixAsk: function (d) {
      return d + ": ఈ జాబితాను ప్రతిరోజూ వాడాలా? ఇతర రోజుల సొంత జాబితాలు తీసివేయబడతాయి.";
    },
    fixGo: "ప్రతిరోజూ వాడు",
  },
  // The print builder's What step: Texts, Today, Routine (js/print/what.js)
  printWhat: {
    what: "ఏమి ముద్రించాలి",
    search: "సంగ్రహంలో వెతుకు",
    all: "అన్ని పాఠాలు",
    selectAll: "అన్నీ ఎంచుకో",
    clear: "తుడిచివేయి",
    none: "ఏ పాఠమూ సరిపోలలేదు",
    texts: texts,
    pick: "కనీసం ఒక పాఠాన్ని ఎంచుకోండి",
    tabs: { texts: "సంగ్రహం", today: "ఈరోజు", routine: "దినచర్య" },
    todayInfo: "ఒక సమయం పాఠాలను ముద్రించడానికి దాన్ని నొక్కండి.",
    allToday: "ఈరోజువన్నీ",
    /** @param {string} d the weekday */
    allDay: function (d) {
      return d + ": అన్నీ";
    },
    empty: "పాఠాలు లేవు",
    who: "ఎవరి దినచర్య",
    week: "వారమంతా",
    oneDay: "ఒక రోజు",
    days: "రోజులు",
    sessions: "సమయాలు",
    order: "ప్రతిదీ ఒకసారి, దినచర్య క్రమంలో",
    noTexts: "పాఠాలు లేవు",
    nothing: "ఎంచుకున్న రోజుల్లో, సమయాల్లో పాఠాలు లేవు",
  },
  // The Vedic calendar: the line on Home, the calendar page, This week and 15 days (js/features/vedic-calendar.js)
  calendar: {
    /** @param {string} name */
    wiki: function (name) {
      return name + ": వికీపీడియా (కొత్త ట్యాబ్‌లో తెరుచుకుంటుంది)";
    },
    clock: clock,
    /** "మంగళవారం 28 జులై" @param {number} wd @param {number} d @param {number} m */
    dayLabel: function (wd, d, m) {
      return DAYS.te[wd] + " " + d + " " + MONTHS.te[m];
    },
    open: " (పంచాంగం తెరువు)",
    sunrise: "సూర్యోదయం",
    sunset: "సూర్యాస్తమయం",
    noRise: "ఈ రోజు చంద్రోదయం లేదు",
    /** @param {number} d @param {string} time */
    until: function (d, time) {
      return (d >= 0 ? DAYS.te[d] + " " : "") + time + " వరకు";
    },
    amanta: "అమాంత",
    today: "ఈరోజు",
    loc: "నా స్థానాన్ని వాడు",
    pic: "చిత్రాన్ని పూర్తి తెరపై చూపు",
    prev: "ముందటి నెల",
    nextM: "తర్వాతి నెల",
    key: ["శుక్ల పక్షం", "కృష్ణ పక్షం", "పౌర్ణమి", "అమావాస్య"],
    keyNote: "సూర్యోదయం నాటి తిథి · + తర్వాతి సూర్యోదయానికి ముందే మొదలై ముగిసే (క్షయ) తిథి",
    vriddhi: "ముందటి రోజు తిథే (వృద్ధి)",
    kshaya: "క్షయ తిథి: ",
    near: "సూర్యోదయానికి చాలా దగ్గర: ముద్రిత పంచాంగంలో పక్క తిథి ఉండవచ్చు.",
    /** @param {string} p */
    note: function (p) {
      return "ఈ ఫోన్‌లో " + p + " కోసం లెక్కించబడింది. వివరాలు చూడడానికి ఒక రోజును నొక్కండి.";
    },
    /** @param {number} d @param {number} m @param {string} what */
    showing: function (d, m, what) {
      return d + " " + MONTHS.te[m] + ": " + what;
    },
    fToday: "ఈరోజు: ",
    fTomorrow: "రేపు: ",
    fYesterday: "నిన్న: ",
    /** @param {number} d the weekday */
    fOn: function (d) {
      return DAYS.te[d] + ": ";
    },
    week: "ఈ వారం",
    next15: "తర్వాతి 15 రోజులు",
    day: "రోజు",
    month: "నెల",
    up: "15 రోజులు",
    prevDay: "ముందటి రోజు",
    nextDay: "తర్వాతి రోజు",
    prevU: "ముందటి 15 రోజులు",
    nextU: "తర్వాతి 15 రోజులు",
    todayB: "ఈరోజు",
    view: "చూపు",
    upTitle: "తర్వాతి 15 రోజులు",
    nextWeek: "వచ్చే వారం",
    uYesterday: "నిన్న",
    /** @param {number} n */
    uAgo: function (n) {
      return n + " రోజుల క్రితం";
    },
    uToday: "ఈరోజు",
    uTomorrow: "రేపు",
    /** @param {number} n */
    uIn: function (n) {
      return n + " రోజుల్లో";
    },
    /** @param {number} a @param {number} b */
    uDays: function (a, b) {
      return "రోజు " + a + (a === b ? "" : "–" + b);
    },
    /** @param {string} d */
    uUntil: function (d) {
      return d + " వరకు";
    },
    uNext: "తర్వాత",
    uNone: "ఈ రోజుల్లో ఏదీ గుర్తించలేదు.",
    kinds: { fest: "పండుగలు", sk: "సంకష్టి", pradosh: "ప్రదోషం", hol: "సెలవులు" },
  },
  // The top bar (js/features/bars.js)
  bar: {
    /** @param {string} t */
    home: function (t) {
      return "ముఖపుట: " + t;
    },
    find: "పాఠం లేదా పంక్తిని వెతుకు",
  },
  // The bottom bar's Prev and Next (js/features/bottom-bar.js)
  bottomBar: {
    prev: "‹ ముందటిది",
    next: "తర్వాతి ›",
  },
  // A piece's fold button (js/core/apply.js)
  fold: {
    open: "ఈ భాగాన్ని చూపు",
    fold: "ఈ భాగాన్ని మడువు",
  },
  // The reading sheet (js/features/reading-sheet.js) and Settings → Languages (js/features/languages.js)
  languages: {
    both: "రెండూ",
    second: "+ రెండవ భాష",
    none: "ఏదీ వద్దు",
    refrain: "↻ పల్లవి",
    close: "మూసివేయి",
    reset: "అక్షర పరిమాణాన్ని మొదటికి తెచ్చు",
    /** @param {string} pct */
    size: function (pct) {
      return "అక్షర పరిమాణం " + pct + "%";
    },
  },
  // Dhrupad once or after every verse (js/features/dhrupad-button.js)
  dhrupad: {
    once: "ధ్రుపదం ఒకసారి చూపబడింది",
    every: "ప్రతి పద్యం తర్వాత ధ్రుపదం",
  },
  // Settings (js/features/settings-panel.js)
  settings: {
    /** @param {string} why */
    failed: function (why) {
      return "మార్పును పూర్తి చేయలేకపోయాం (" + why + ")";
    },
  },
  // The full-screen picture (js/features/picture-viewer.js)
  pictureViewer: {
    hint: "పెద్దగా చూడడానికి రెండు వేళ్లతో విడదీయండి లేదా రెండుసార్లు నొక్కండి",
  },
  // The Books tab's clouds (js/features/pdfs.js)
  pdfs: {
    saved: "ఈ ఫోన్‌లో సేవ్ అయింది",
    online: "ఆన్‌లైన్‌లో మాత్రమే",
  },
  // Offline use and Check for updates (js/features/offline.js): Settings → More → About
  offline: {
    state: { idle: "ఆఫ్‌లైన్‌కు సిద్ధం", save: "ఆఫ్‌లైన్ కోసం సేవ్ అవుతోంది…", off: "సేవ్ చేసిన ప్రతి వాడుకలో ఉంది" },
    update: { check: "అప్‌డేట్‌ల కోసం చూడు", busy: "చూస్తోంది…", ok: "తాజాగా ఉంది", off: "ఇంటర్నెట్ లేదు" },
    usingSaved: "ఇంటర్నెట్ లేదు. సేవ్ చేసిన ప్రతిని వాడుతున్నాం.",
    loading: "కొత్త వెర్షన్, తెరుచుకుంటోంది…",
    ready: "ఆఫ్‌లైన్ వాడకానికి సిద్ధం",
  },
  // Search and Recent (js/text/search.js)
  search: {
    /** @param {string} name */
    remove: function (name) {
      return "తీసివేయి: " + name;
    },
    nothing: "ఏదీ దొరకలేదు",
    /** @param {number} n -1: 40 or more */
    lines: function (n) {
      return (n < 0 ? "40 లేదా ఎక్కువ" : n) + (n == 1 ? " ఫలితం" : " ఫలితాలు");
    },
    /** @param {number} t @param {number} n the lines; -1: 40 or more */
    both: function (t, n) {
      return texts(t) + ", " + (n < 0 ? "40 లేదా ఎక్కువ" : n) + (n == 1 ? " పంక్తి" : " పంక్తులు");
    },
    texts: "పాఠాలు",
    linesHead: "పంక్తులు",
  },
  // Share (js/features/share.js): the message for the group chat
  share: {
    tip: "\nసూచన: ఫోన్‌లో యాప్ లాగా ఉంచుకోవడానికి లింక్ తెరిచి Add to Home Screen నొక్కండి.",
    /** @param {string} title */
    plain: function (title) {
      return title;
    },
    temple: " · పూజ సాయంత్రం 7:00–8:30, భారతీయ హిందూ దేవాలయం, పావెల్",
    /** @param {string} title @param {string} ang @param {string} date @param {string} temple @param {string} rise */
    next: function (title, ang, date, temple, rise) {
      return title + "\nతర్వాతి " + ang + "Sankathara Chaturthi: " + date + temple + (rise ? " · చంద్రోదయం " + rise : "");
    },
    copied: "సందేశం కాపీ అయింది",
  },
  // Print (js/features/print.js): the Print pop-up in the menu language, the printout's own words in its language
  print: {
    langs: { mr: "మరాఠీ", kn: "కన్నడ", te: "తెలుగు", gu: "గుజరాతీ", en: "ఇంగ్లీషు" },
    portrait: "నిలువు",
    landscape: "అడ్డం",
    both: "రెండూ",
    /** @param {string} l1 @param {string} l2 */
    stacked: function (l1, l2) {
      return "నిలువు: పైన " + l1 + ", కింద " + l2;
    },
    side: "అడ్డం, పక్కపక్కనే",
    preview: "మొదటి పేజీ ముందుచూపు",
    /** @param {string} paper */
    use: function (paper) {
      return paper + " వాడు";
    },
    cancel: "రద్దు చేయి",
    linkCopied: "లింక్ కాపీ అయింది: దాన్ని Safari లో అతికించండి",
    gone: "ఎంచుకున్న పాఠాలు ఇప్పుడు సంగ్రహంలో లేవు: మళ్లీ ఎంచుకోండి.",
    /** @param {number} m @param {number} y */
    cover: function (m, y) {
      return "నిత్య ఉపాసన · " + MONTHS.te[m] + " " + y;
    },
    week: "వారం ఒక చూపులో",
    contents: "విషయ సూచిక",
  },
  // The page's own words (index.html: data-w="page.…"); {icon} is the icon written in the page
  page: {
    appAddToHomeScreen: 'యాప్<span class="sr"> (హోమ్ స్క్రీన్‌కు జోడించు)</span>',
    share: "పంచుకో",
    qrCode: 'QR<span class="sr"> కోడ్</span>',
    help: "సహాయం",
    back: "వెనుకకు",
    chants: "పాఠాలు",
    books: "పుస్తకాలు",
    recent: "ఇటీవలివి",
    clear: "తుడిచివేయి",
    nothingFound: "ఏదీ దొరకలేదు",
    reading: "పఠనం",
    screen: "తెర",
    more: "మరిన్ని",
    preview: "ముందుచూపు",
    languageAndText: "భాష, పాఠం",
    mainLanguage: "ప్రధాన భాష",
    largeText: "పెద్ద అక్షరాలు",
    secondLanguage: "రెండవ భాష",
    smallerUnderEachLine: "చిన్నగా, ప్రతి పంక్తి కింద",
    show: "చూపు",
    textSize: "అక్షర పరిమాణం",
    textFont: "అక్షర శైలి",
    traditional: "సాంప్రదాయ",
    modern: "ఆధునిక",
    bold: "బోల్డ్",
    verses: "పద్యాలు",
    dhrupad: "ధ్రుపదం",
    once: "ఒకసారి",
    everyVerse: "ప్రతి పద్యం",
    layout: "అమరిక",
    n1Column: "1 నిలువు వరుస",
    n2Columns: "2 నిలువు వరుసలు",
    menusAndButtons: "మెనూలు, బటన్‌లు",
    theme: "థీమ్",
    auto: "ఆటో",
    light: "లేత",
    sepia: "సెపియా",
    dark: "ముదురు",
    highContrast: "అధిక కాంట్రాస్ట్",
    keepScreenOn: "తెరను ఆన్‌లో ఉంచు",
    profilesAndBackup: "ప్రొఫైల్‌లు, బ్యాకప్",
    thisBrowserCanTSave: "ఈ బ్రౌజర్ ఇక్కడ సేవ్ చేయలేదు. మూసే ముందు బ్యాకప్ ఫైల్ సేవ్ చేయండి.",
    whoIsReading: "ఎవరు చదువుతున్నారు",
    routine: "దినచర్య",
    theTextsForEachSession: "ప్రతి సమయం పాఠాలు, క్రమంగా",
    saveABackupFile: "బ్యాకప్ ఫైల్ సేవ్ చేయి",
    restoreFromAFile: "ఫైల్ నుండి పునరుద్ధరించు",
    aNityaFileSavedBefore: "ముందు సేవ్ చేసిన .nitya ఫైల్",
    about: "గురించి",
    helpAndHowToUse: "సహాయం, వాడే విధానం",
    addToHomeScreen: "హోమ్ స్క్రీన్‌కు జోడించు",
    nityaUpasana: "నిత్య ఉపాసన",
    notNow: "ఇప్పుడు వద్దు",
    scanWithTheCameraTo: "తెరవడానికి కెమెరాతో స్కాన్ చేయండి",
    close: "మూసివేయి",
    whatToPrint: "‹ ఏమి ముద్రించాలి",
    printPdf: "ముద్రించు / PDF",
    whatToPrint2: "ఏమి ముద్రించాలి",
    howToPrint: "ఎలా ముద్రించాలి",
    language: "భాష",
    dhrupad2: 'ధ్రుపదం (<span lang="mr">धृ</span>)',
    once2: "ఒకసారి",
    page: "పేజీ",
    printFont: "ముద్రణ అక్షర శైలి",
    everyTextStartsOnA: 'ప్రతి పాఠం కొత్త పేజీలో మొదలవుతుంది. కాగితం: <b class="prpaper">Letter</b>',
    forLandscapePickItIn: "అడ్డం కోసం, Safari డైలాగ్‌లోనూ దాన్నే ఎంచుకోండి.",
    pickA4PaperInSafari: 'Safari డైలాగ్‌లోనూ <span class="przp">A4</span> కాగితం ఎంచుకోండి.',
    chromePrintsItBest: "Chrome దీన్ని బాగా ముద్రిస్తుంది.",
    readyPrintNow: "సిద్ధం: ఇప్పుడు ముద్రించు",
    openInSafari: "Safari లో తెరువు",
    copyLink: "లింక్ కాపీ చేయి",
    printingDoesNotOpenFrom:
      "iPhone లో హోమ్ స్క్రీన్ యాప్ నుండి ముద్రణ తెరుచుకోదు. <b>Safari లో తెరువు</b> నొక్కండి: మీ ఎంపికలు దానితో వెళ్తాయి, ముద్రణ అక్కడ సిద్ధమవుతుంది. Safari తెరుచుకోకపోతే, లింక్ కాపీ చేసి Safari లో అతికించండి.",
    thisBrowserDidNotOpen:
      'ఈ బ్రౌజర్ ముద్రణ డైలాగ్‌ను తెరవలేదు. బ్రౌజర్ <b lang="en">Share</b> బటన్ నొక్కి <b lang="en">Print</b> ఎంచుకోండి. ఈ పేజీ వేరే యాప్ లోపల తెరుచుకుంటే, <b>Safari లో తెరువు</b> నొక్కండి: మీ ఎంపికలు దానితో వెళ్తాయి.',
    nextHowToPrint: "తర్వాత: ఎలా ముద్రించాలి ›",
    print: "ముద్రించు",
    addToHomeScreen2: "హోమ్ స్క్రీన్‌కు జోడించు",
    tapTheShareButtonAt: '<b lang="en">Share</b> బటన్ {icon} నొక్కండి (Safari లో కింద, Chrome లో పైన కుడివైపు).',
    scrollDownAndTapAdd: 'కిందికి జరిపి <b lang="en">Add to Home Screen</b> నొక్కండి.',
    tapAdd: '<b lang="en">Add</b> నొక్కండి.',
    openThisPageInSafari: 'ఈ పేజీని <b lang="en">Safari</b> లేదా <b lang="en">Chrome</b> లో తెరవండి (⋯ లేదా Share → Open in Safari/Chrome).',
    thenShareAddToHome: 'తర్వాత Share {icon} → <b lang="en">Add to Home Screen</b> → <b lang="en">Add</b>.',
    openChromeSMenuTop: "Chrome <b>⋮</b> మెనూ తెరవండి (పైన కుడివైపు).",
    tapAddToHomeScreen: '<b lang="en">Add to Home screen</b> లేదా <b lang="en">Install app</b> నొక్కండి.',
    tapInstallOrAdd: '<b lang="en">Install</b> లేదా <b lang="en">Add</b> నొక్కండి.',
    clickTheInstallIconAt: 'అడ్రస్ బార్ కుడి చివర ఉన్న ఇన్‌స్టాల్ ఐకాన్‌ను క్లిక్ చేయండి, లేదా బ్రౌజర్ మెనూ నుండి <b lang="en">Install</b> ఎంచుకోండి.',
    clickTheShareButtonIn: 'Safari టూల్‌బార్‌లో <b lang="en">Share</b> బటన్ {icon} క్లిక్ చేయండి, లేదా <b lang="en">File</b> మెనూ తెరవండి.',
    chooseAddToDockThen: '<b lang="en">Add to Dock</b> ఎంచుకోండి, తర్వాత <b lang="en">Add</b> క్లిక్ చేయండి.',
    firefoxCanTAddThis: "Firefox ఈ సైట్‌ను యాప్‌గా జోడించలేదు. ఈ పేజీని Chrome, Edge లేదా Safari లో తెరిచి ఈ బటన్‌ను మళ్లీ నొక్కండి.",
    itWillThenOpenLike: "తర్వాత ఇది ఇంటర్నెట్ లేకపోయినా యాప్ లాగా తెరుచుకుంటుంది.",
    ok: "సరే",
    home: "ముఖపుట",
    library: "సంగ్రహం",
    smaller: " చిన్నది",
    larger: " పెద్దది",
    allSettings: "అన్ని సెట్టింగ్‌లు",
    fontThemeLayout: "అక్షర శైలి, థీమ్, అమరిక",
    defaultSize: "↺ మొదటి పరిమాణం",
  },
  // Dates in the menu language (js/features/vedic-calendar.js)
  dates: {
    days: DAYS.te,
    daysShort: ["ఆది", "సోమ", "మంగళ", "బుధ", "గురు", "శుక్ర", "శని"],
    months: MONTHS.te,
    monthsShort: MONTHS.te,
    /** @param {number} wd @param {number} d @param {number} m */
    day: function (wd, d, m) {
      return DAYS.te[wd] + ", " + d + " " + MONTHS.te[m];
    },
    /** @param {number} wd @param {number} d @param {number} m @param {number} y */
    dayYear: function (wd, d, m, y) {
      return DAYS.te[wd] + ", " + d + " " + MONTHS.te[m] + " " + y;
    },
    /** @param {number} m @param {number} y */
    monthYear: function (m, y) {
      return MONTHS.te[m] + " " + y;
    },
    /** @param {number} d @param {number} m */
    from: function (d, m) {
      return " (" + d + " " + MONTHS.te[m] + " నుండి)";
    },
    /** @param {number} m @param {number} wd */
    before: function (m, wd) {
      return " " + MONTHS.te[m] + ", " + DAYS.te[wd] + ", ";
    },
  },
  // The language's own name, in its own letters: Settings → Menus and buttons (js/features/settings-panel.js)
  language: {
    name: "తెలుగు",
  },
  // The Sankashti line on Home, its place and its dates (js/features/sankashti.js)
  sankashti: {
    name: "సంకష్టి చతుర్థి",
    angName: "అంగారక సంకష్టి చతుర్థి",
    /** @param {string} name */
    today: function (name) {
      return "ఈరోజు " + name;
    },
    /** @param {string} time */
    moonrise: function (time) {
      return "చంద్రోదయం <b>" + time + "</b>";
    },
    /** @param {number} wd @param {number} d @param {number} m @param {number} y */
    day: function (wd, d, m, y) {
      return DAYS.te[wd] + ", " + d + " " + MONTHS.te[m] + (y ? " " + y : "");
    },
    /** @param {number} h @param {string} mi */
    time: function (h, mi) {
      return (h >= 20 || h < 4 ? "రాత్రి " : h >= 16 ? "సాయంత్రం " : "") + (((h + 11) % 12) + 1) + ":" + mi;
    },
    late: " (అర్ధరాత్రి తర్వాత)",
    yourPlace: "మీ స్థానం",
    /** @param {string} place */
    near: function (place) {
      return place + " దగ్గర";
    },
    /** @param {string} place */
    place: function (place) {
      return "స్థానం: " + place;
    },
    noGeo: "ఈ బ్రౌజర్‌లో స్థానం అందుబాటులో లేదు",
    noPlace: "మీ స్థానం దొరకలేదు",
  },
};

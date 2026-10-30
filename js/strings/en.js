// @ts-check
// The menu words in English, every part's under its name (js/core/strings.js menuWords()). English is the complete
// set: another language's file has the same words, and a word it lacks is taken from here.

import { DAYS, MONTHS } from "../core/words.js";
import { INITIALS_MAX, MAX_PROFILES } from "../store/profiles.js";
import { MAX_ADDED } from "../core/library.js";

export default {
  // Backup and restore (js/features/backup.js)
  backup: {
    months: MONTHS.en,
    never: "Not saved yet",
    /** @param {string} d */
    last: function (d) {
      return "Last saved " + d;
    },
    saved: "Backup file saved",
    shared: "Backup file ready",
    remindFirst: "Your settings and routine are kept only on this phone. Save a backup file now and then, in case the phone clears website data.",
    /** @param {string} d */
    remind: function (d) {
      return "Your last backup file was saved on " + d + ". Save a new one?";
    },
    ask: "Restore from this file?",
    /** @param {string} d @param {string} v */
    from: function (d, v) {
      return "Saved on " + d + (v ? " (version " + v + ")" : "") + ".";
    },
    inFile: "People in the file: ",
    added: "New on this phone: ",
    replaced: "Replaced by the file's copy (settings and routine): ",
    removed: "Removed from this phone: ",
    /** @param {string} n */
    then: function (n) {
      return "Reading next: " + n + ".";
    },
    restore: "Restore",
    cancel: "Cancel",
    ok: "OK",
    done: "Restored from the backup file",
    bad: "This file can't be restored",
    unsaved: "The backup could not be saved on this phone. Try again, or keep the backup file.",
    problems: {
      "not-json": "This is not a Nitya Upasana backup file (.nitya).",
      "not-nitya": "This is not a Nitya Upasana backup file (.nitya).",
      newer: "This file was saved by a newer version of the app. Check for updates (Settings → More → About, tap the version line) and try again.",
      kind: "This .nitya file is not a full backup.",
      checksum: "This file has been changed or damaged since it was saved (its checksum does not match), so nothing was restored.",
      empty: "This backup has no people in it.",
      read: "The file could not be read.",
    },
  },
  // People on this phone: the badge and the profile sheet (js/features/profiles.js)
  profiles: {
    title: "Who is reading?",
    add: "Add a person",
    info: "Each person keeps their own text size, languages, theme and routine on this phone.",
    now: "Reading now",
    edit: "Edit",
    addTitle: "Add a person",
    editTitle: "Edit: ",
    name: "Name",
    initials: "Letters on the badge",
    initialsHint: "Up to " + INITIALS_MAX + ". Left empty, they come from the name.",
    colour: "Colour",
    save: "Save",
    cancel: "Cancel",
    del: "Delete this person",
    /** @param {string} n */
    ask: function (n) {
      return "Delete " + n + "? Their settings and routine will be removed from this phone. A backup file saved earlier still has them.";
    },
    yes: "Delete",
    close: "Close",
    empty: "Please type a name.",
    taken: "Someone on this phone already has this name.",
    full: "There is room for " + MAX_PROFILES + " people.",
    /** @param {string} n */
    switched: function (n) {
      return "Now reading: " + n;
    },
    /** @param {string} n */
    deleted: function (n) {
      return n + " was deleted";
    },
    chip: "Profile: ",
  },
  // The Library by category and the categories sheet (js/features/library.js)
  library: {
    open: "Edit categories",
    title: "Categories",
    texts: "Texts",
    textsInfo: "Choose the category each text is listed under.",
    info: "Kept on this phone for everyone who reads here, and saved in backup files. The words of the texts never change.",
    add: "Add a category",
    rename: "Rename",
    addTitle: "Add a category",
    renameTitle: "Rename: ",
    mrName: "Name in Marathi",
    enName: "Name in English",
    hint: "One is enough: it is used for both.",
    save: "Save",
    cancel: "Cancel",
    /** @param {string} n */
    reset: function (n) {
      return "Use the original name: " + n;
    },
    del: "Delete this category",
    builtIn: "Built in: it can be renamed on this phone, not deleted.",
    /** @param {string} n */
    ask: function (n) {
      return "Delete " + n + "? Its texts go back to the categories they came with.";
    },
    yes: "Delete",
    close: "Close",
    empty: "Please type a name.",
    taken: "Another category already has this name.",
    full: "There is room for " + MAX_ADDED + " categories of your own.",
    /** @param {number} n */
    count: function (n) {
      return n === 0 ? "No texts yet (not shown in the Library)" : n === 1 ? "1 text" : n + " texts";
    },
    /** @param {string} t @param {string} c */
    moved: function (t, c) {
      return t + ": now in " + c;
    },
    /** @param {string} t */
    catFor: function (t) {
      return "Category for " + t;
    },
    /** @param {string} n */
    added: function (n) {
      return n + " added";
    },
    /** @param {string} n */
    renamed: function (n) {
      return "Renamed: " + n;
    },
    /** @param {string} n */
    deleted: function (n) {
      return n + " deleted";
    },
  },
  // Home: the date, the sessions and their texts (js/features/today-card.js)
  today: {
    days: DAYS.en,
    months: MONTHS.en,
    sessions: { morning: "Morning", afternoon: "Afternoon", evening: "Evening" },
    tabs: "Session",
    unset: "Nothing set",
    /** @param {number} n */
    texts: function (n) {
      return n + (n === 1 ? " text" : " texts");
    },
    none: "Nothing planned",
    /** @param {string} s */
    empty: function (s) {
      return "Nothing is planned for " + s.toLowerCase() + " yet. ";
    },
    add: "Add texts",
    edit: "Edit",
    /** @param {string} s */
    editL: function (s) {
      return "Edit routine: " + s;
    },
    end: "Today",
    ended: "End of the session",
    prev: "Previous day",
    next: "Next day",
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    /** @param {number} n */
    later: function (n) {
      return "In " + n + " days";
    },
    /** @param {number} n */
    ago: function (n) {
      return n + " days ago";
    },
    /** @param {string} d the weekday's name, as HTML */
    showing: function (d) {
      return "Showing <b>" + d + "</b>";
    },
    back: "Today ›",
  },
  // The routine builder and its Add texts picker (js/features/routine-builder.js)
  routine: {
    /** @param {string} n */
    title: function (n) {
      return n + "’s routine";
    },
    sessions: { morning: "Morning", afternoon: "Afternoon", evening: "Evening" },
    sessionG: "Session",
    modes: { fixed: "Same every day", weekday: "Different by weekday" },
    modeG: "Which days",
    days: DAYS.en,
    short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    dayG: "Day",
    /** @param {number} n */
    texts: function (n) {
      return n + (n === 1 ? " text" : " texts");
    },
    /** @param {string} s @param {number | null} d */
    what: function (s, d) {
      return d === null ? s + ", every day" : this.days[d] + " " + s.toLowerCase();
    },
    copy: "Copy to other days…",
    /** @param {string} w */
    copyTo: function (w) {
      return "Copy " + w + "’s list to:";
    },
    copyGo: "Copy",
    cancel: "Cancel",
    /** @param {string[]} d */
    copied: function (d) {
      return d.length ? "Copied to " + d.join(", ") : "No day chosen";
    },
    /** @param {string} t */
    up: function (t) {
      return "Move " + t + " up";
    },
    /** @param {string} t */
    down: function (t) {
      return "Move " + t + " down";
    },
    /** @param {string} t */
    remove: function (t) {
      return "Remove " + t;
    },
    /** @param {string} t @param {number} i @param {number} n */
    moved: function (t, i, n) {
      return t + " moved to " + i + " of " + n;
    },
    /** @param {string} t */
    removed: function (t) {
      return t + " removed";
    },
    /** @param {string} t @param {number} n */
    added: function (t, n) {
      return t + " added, " + n + " of " + n;
    },
    /** @param {string} w */
    empty: function (w) {
      return "No texts for " + w + " yet. Add texts to start.";
    },
    hint: "Alt+↑/↓ moves with a keyboard",
    add: "Add texts",
    /** @param {string} w */
    addTo: function (w) {
      return "Add texts to " + w;
    },
    search: "Search (Marathi or English)",
    none: "Nothing found",
    done: "Done",
    /** @param {number} n */
    found: function (n) {
      return n === 1 ? "1 text found" : n + " texts found";
    },
    /** @param {string} d */
    toFixed: function (d) {
      return d + "’s list is now used every day";
    },
    toWeek: "Each weekday can now have its own list",
    /** @param {string} d */
    fixAsk: function (d) {
      return "Use " + d + "’s list every day? The other days’ own lists will be removed.";
    },
    fixGo: "Use every day",
  },
  // The print builder's What step: Texts, Today, Routine (js/print/what.js)
  printWhat: {
    what: "What to print",
    search: "Search the Library",
    all: "All texts",
    selectAll: "Select all",
    clear: "Clear",
    none: "No text matches",
    /** @param {number} n */
    texts: function (n) {
      return n + (n === 1 ? " text" : " texts");
    },
    pick: "Pick at least one text",
    tabs: { texts: "Library", today: "Today", routine: "Routine" },
    todayInfo: "Tap a session to print its texts.",
    allToday: "All of today",
    /** @param {string} d the weekday */
    allDay: function (d) {
      return "All of " + d;
    },
    empty: "No texts",
    who: "Whose routine",
    week: "Whole week",
    oneDay: "One day",
    days: "Days",
    sessions: "Sessions",
    order: "Printed once each, in routine order",
    noTexts: "no texts",
    nothing: "No texts on the days and at the times chosen",
  },
  // The Vedic calendar: the line on Home, the calendar page, This week and 15 days (js/features/vedic-calendar.js)
  calendar: {
    /** A festival's Wikipedia link, spoken @param {string} name */
    wiki: function (name) {
      return name + ": Wikipedia (opens in a new tab)";
    },
    /** A clock time: "7:45 am" @param {number} h 0–23 @param {string} mi the minutes, two digits */
    clock: function (h, mi) {
      return ((h + 11) % 12) + 1 + ":" + mi + (h >= 12 ? " pm" : " am");
    },
    /** A day in a list: "Tue 28 Jul" @param {number} wd the weekday (0 = Sunday) @param {number} d @param {number} m (0 = January) */
    dayLabel: function (wd, d, m) {
      return DAYS.en[wd].slice(0, 3) + " " + d + " " + MONTHS.en[m].slice(0, 3);
    },
    open: " (open the Vedic calendar)",
    sunrise: "Sunrise",
    sunset: "Sunset",
    noRise: "No moonrise this day",
    /** "until 1:21 am", with the weekday when it ends on another day: "until Mon 1:21 am"
     * @param {number} d that weekday (0 = Sunday), or -1 @param {string} time */
    until: function (d, time) {
      return "until " + (d >= 0 ? DAYS.en[d].slice(0, 3) + " " : "") + time;
    },
    amanta: "amanta",
    today: "today",
    loc: "Use my location",
    pic: "show the picture full screen",
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
    /** What the day card shows, for screen readers: "Showing 18 October: …"
     * @param {number} d the day of the month @param {number} m the month (0 = January) @param {string} what */
    showing: function (d, m, what) {
      return "Showing " + d + " " + MONTHS.en[m] + ": " + what;
    },
    fToday: "Today: ",
    fTomorrow: "Tomorrow: ",
    fYesterday: "Yesterday: ",
    /** @param {number} d the weekday */
    fOn: function (d) {
      return DAYS.en[d] + ": ";
    },
    week: "This week",
    next15: "Next 15 days",
    day: "Day",
    month: "Month",
    up: "15 days",
    prevDay: "Previous day",
    nextDay: "Next day",
    prevU: "Previous 15 days",
    nextU: "Next 15 days",
    todayB: "Today",
    view: "Show",
    upTitle: "The next 15 days",
    nextWeek: "Next week",
    uYesterday: "Yesterday",
    /** @param {number} n */
    uAgo: function (n) {
      return n + " days ago";
    },
    uToday: "Today",
    uTomorrow: "Tomorrow",
    /** @param {number} n */
    uIn: function (n) {
      return "in " + n + " days";
    },
    /** @param {number} a @param {number} b */
    uDays: function (a, b) {
      return "Day " + a + (a === b ? "" : "–" + b);
    },
    /** @param {string} d */
    uUntil: function (d) {
      return "until " + d;
    },
    uNext: "Next",
    uNone: "Nothing is marked on these days.",
    kinds: { fest: "Festivals", sk: "Sankashti", pradosh: "Pradosh", hol: "Holidays" },
  },
  // The top bar (js/features/bars.js)
  bar: {
    /** The title's spoken name: what it does, then the words shown @param {string} t */
    home: function (t) {
      return "Home: " + t;
    },
    find: "Find a text or a line",
  },
  // The bottom bar's Prev and Next (js/features/bottom-bar.js): the arrow stays, the word may be left out on small phones
  bottomBar: {
    prev: "‹ Prev",
    next: "Next ›",
  },
  // A piece's fold button (js/core/apply.js)
  fold: {
    open: "Show this piece",
    fold: "Fold this piece",
  },
  // The reading sheet (js/features/reading-sheet.js) and Settings → Languages (js/features/languages.js)
  languages: {
    both: "Both",
    second: "+ Second language",
    none: "None",
    refrain: "↻ Refrain",
    close: "Close",
    reset: "Reset text size",
    /** @param {string} pct */
    size: function (pct) {
      return "Text size " + pct + "%";
    },
  },
  // Dhrupad once or after every verse (js/features/dhrupad-button.js)
  dhrupad: {
    once: "Dhrupad shown once",
    every: "Dhrupad after every verse",
  },
  // Settings (js/features/settings-panel.js)
  settings: {
    /** @param {string} why */
    failed: function (why) {
      return "Could not finish the change (" + why + ")";
    },
  },
  // The full-screen picture (js/features/picture-viewer.js)
  pictureViewer: {
    hint: "Pinch or double-tap to zoom",
  },
  // The Books tab's clouds (js/features/pdfs.js)
  pdfs: {
    saved: "saved on this phone",
    online: "online only",
  },
  // Offline use and Check for updates (js/features/offline.js): Settings → More → About
  offline: {
    state: { idle: "Offline ready", save: "Saving for offline…", off: "Saved copy in use" },
    update: { check: "Check for updates", busy: "Checking…", ok: "Up to date", off: "No internet" },
    usingSaved: "No internet. Using the saved copy.",
    loading: "New version, loading…",
    ready: "Ready to use offline",
  },
  // Search and Recent (js/text/search.js)
  search: {
    /** @param {string} name */
    remove: function (name) {
      return "Remove: " + name;
    },
    nothing: "Nothing found",
    /** How many lines were found; -1: 40 or more @param {number} n */
    lines: function (n) {
      return (n < 0 ? "40 or more" : n) + (n == 1 ? " result" : " results");
    },
    /** Texts and lines found @param {number} t @param {number} n the lines; -1: 40 or more */
    both: function (t, n) {
      return t + (t == 1 ? " text" : " texts") + " and " + (n < 0 ? "40 or more" : n) + (n == 1 ? " line" : " lines");
    },
    texts: "Texts",
    linesHead: "Lines",
  },
  // Share (js/features/share.js): the message for the group chat
  share: {
    tip: "\nTip: open the link and tap Add to Home Screen to keep it on your phone like an app.",
    /** @param {string} title */
    plain: function (title) {
      return title;
    },
    temple: " · Pooja 7:00–8:30 pm at Bharatiya Hindu Temple, Powell",
    /** @param {string} title @param {string} ang "Angaraki " or "" @param {string} date @param {string} temple the line above, or ""
     * @param {string} rise the moonrise, or "" */
    next: function (title, ang, date, temple, rise) {
      return title + "\nNext " + ang + "Sankathara Chaturthi: " + date + temple + (rise ? " · Moonrise " + rise : "");
    },
    copied: "Message copied",
  },
  // Print (js/features/print.js): the Print pop-up in the menu language, the printout's own words in its language
  print: {
    langs: { mr: "Marathi", kn: "Kannada", te: "Telugu", gu: "Gujarati", en: "English" },
    portrait: "Portrait",
    landscape: "Landscape",
    both: "Both",
    /** @param {string} l1 @param {string} l2 */
    stacked: function (l1, l2) {
      return "Portrait: " + l1 + " above " + l2;
    },
    side: "Landscape, side by side",
    preview: "Preview of the first page",
    /** @param {string} paper */
    use: function (paper) {
      return "Use " + paper;
    },
    cancel: "Cancel",
    linkCopied: "Link copied: paste it into Safari",
    gone: "The texts chosen are no longer in the Library: choose again.",
    /** The printout's first page, under the name @param {number} m the month (0 = January) @param {number} y */
    cover: function (m, y) {
      return "Nitya Upasana · " + MONTHS.en[m] + " " + y;
    },
    week: "The week at a glance",
    contents: "Contents",
  },
  // The page's own words (index.html: data-w="page.…", filled by fillWords(), js/core/strings.js); {icon} is the
  // icon written in the page, kept where each language puts it
  page: {
    appAddToHomeScreen: 'App<span class="sr"> (add to Home Screen)</span>',
    share: "Share",
    qrCode: 'QR<span class="sr"> code</span>',
    help: "Help",
    back: "Back",
    chants: "Chants",
    books: "Books",
    recent: "Recent",
    clear: "Clear",
    nothingFound: "Nothing found",
    reading: "Reading",
    screen: "Screen",
    more: "More",
    preview: "Preview",
    languageAndText: "Language and text",
    mainLanguage: "Main language",
    largeText: "Large text",
    secondLanguage: "Second language",
    smallerUnderEachLine: "Smaller, under each line",
    show: "Show",
    textSize: "Text size",
    textFont: "Text font",
    traditional: "Traditional",
    modern: "Modern",
    bold: "Bold",
    verses: "Verses",
    dhrupad: "Dhrupad",
    once: "Once",
    everyVerse: "Every verse",
    layout: "Layout",
    n1Column: "1 column",
    n2Columns: "2 columns",
    menusAndButtons: "Menus and buttons",
    theme: "Theme",
    auto: "Auto",
    light: "Light",
    sepia: "Sepia",
    dark: "Dark",
    highContrast: "High contrast",
    keepScreenOn: "Keep screen on",
    profilesAndBackup: "Profiles and backup",
    thisBrowserCanTSave: "This browser can't save here. Use Save a backup file before closing.",
    whoIsReading: "Who is reading",
    routine: "Routine",
    theTextsForEachSession: "The texts for each session, in order",
    saveABackupFile: "Save a backup file",
    restoreFromAFile: "Restore from a file",
    aNityaFileSavedBefore: "A .nitya file saved before",
    about: "About",
    helpAndHowToUse: "Help and how to use",
    addToHomeScreen: "Add to Home Screen",
    nityaUpasana: "Nitya Upasana",
    notNow: "Not now",
    scanWithTheCameraTo: "Scan with the camera to open",
    close: "Close",
    whatToPrint: "‹ What to print",
    printPdf: "Print / PDF",
    whatToPrint2: "What to print",
    howToPrint: "How to print",
    language: "Language",
    dhrupad2: 'Dhrupad (<span lang="mr">धृ</span>)',
    once2: "Once",
    page: "Page",
    printFont: "Print font",
    everyTextStartsOnA: 'Every text starts on a new page. Paper: <b class="prpaper">Letter</b>',
    forLandscapePickItIn: "For Landscape, pick it in Safari's dialog too.",
    pickA4PaperInSafari: 'Pick <span class="przp">A4</span> paper in Safari\'s dialog too.',
    chromePrintsItBest: "Chrome prints it best.",
    readyPrintNow: "Ready: Print now",
    openInSafari: "Open in Safari",
    copyLink: "Copy link",
    printingDoesNotOpenFrom:
      "Printing does not open from the Home Screen app on iPhone. Tap <b>Open in Safari</b>: your choices go with it and the printout is made ready there. If Safari does not open, copy the link and paste it into Safari.",
    thisBrowserDidNotOpen:
      "This browser did not open the print dialog. Tap the browser's <b>Share</b> button and choose <b>Print</b>. If this page opened inside another app, tap <b>Open in Safari</b>: your choices go with it.",
    nextHowToPrint: "Next: how to print ›",
    print: "Print",
    addToHomeScreen2: "Add to Home Screen",
    tapTheShareButtonAt: 'Tap the <b lang="en">Share</b> button {icon} (at the bottom in Safari, top right in Chrome).',
    scrollDownAndTapAdd: 'Scroll down and tap <b lang="en">Add to Home Screen</b>.',
    tapAdd: 'Tap <b lang="en">Add</b>.',
    openThisPageInSafari: 'Open this page in <b lang="en">Safari</b> or <b lang="en">Chrome</b> (⋯ or Share → Open in Safari/Chrome).',
    thenShareAddToHome: 'Then Share {icon} → <b lang="en">Add to Home Screen</b> → <b lang="en">Add</b>.',
    openChromeSMenuTop: "Open Chrome's <b>⋮</b> menu (top right).",
    tapAddToHomeScreen: 'Tap <b lang="en">Add to Home screen</b> or <b lang="en">Install app</b>.',
    tapInstallOrAdd: 'Tap <b lang="en">Install</b> or <b lang="en">Add</b>.',
    clickTheInstallIconAt: 'Click the install icon at the right end of the address bar, or choose <b lang="en">Install</b> from the browser menu.',
    clickTheShareButtonIn: 'Click the <b lang="en">Share</b> button {icon} in Safari\'s toolbar, or open the <b lang="en">File</b> menu.',
    chooseAddToDockThen: 'Choose <b lang="en">Add to Dock</b>, then click <b lang="en">Add</b>.',
    firefoxCanTAddThis: "Firefox can't add this site as an app. Open this page in Chrome, Edge or Safari and tap this button again.",
    itWillThenOpenLike: "It will then open like an app, even without internet.",
    ok: "OK",
    home: "Home",
    library: "Library",
    smaller: " smaller",
    larger: " larger",
    allSettings: "All settings",
    settings: "Settings",
    fontThemeLayout: "Font, theme, layout",
    defaultSize: "↺ Default size",
  },
  // Dates in the menu language: the names, and the dates the Vedic calendar writes (js/features/vedic-calendar.js)
  dates: {
    days: DAYS.en,
    daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: MONTHS.en,
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    /** "Tuesday, 28 July" @param {number} wd the weekday (0 = Sunday) @param {number} d @param {number} m the month (0 = January) */
    day: function (wd, d, m) {
      return DAYS.en[wd] + ", " + d + " " + MONTHS.en[m];
    },
    /** "Tuesday, 28 July 2026" @param {number} wd @param {number} d @param {number} m @param {number} y */
    dayYear: function (wd, d, m, y) {
      return DAYS.en[wd] + ", " + d + " " + MONTHS.en[m] + " " + y;
    },
    /** "July 2026" @param {number} m @param {number} y */
    monthYear: function (m, y) {
      return MONTHS.en[m] + " " + y;
    },
    /** A lunar month starting within the month: " from 5 Oct" @param {number} d @param {number} m */
    from: function (d, m) {
      return " from " + d + " " + MONTHS.en[m].slice(0, 3);
    },
    /** What a screen reader hears before a day of the month: " July, Tuesday, " @param {number} m @param {number} wd */
    before: function (m, wd) {
      return " " + MONTHS.en[m] + ", " + DAYS.en[wd] + ", ";
    },
  },
  // The language's own name, in its own letters: Settings → Menus and buttons (js/features/settings-panel.js)
  language: {
    name: "English",
  },
  // The Sankashti line on Home, its place and its dates (js/features/sankashti.js); the Share message's date and time
  sankashti: {
    name: "Sankashti Chaturthi",
    angName: "Sankashti Chaturthi (Angaraki)",
    /** @param {string} name */
    today: function (name) {
      return name + " today";
    },
    /** @param {string} time */
    moonrise: function (time) {
      return "Moonrise <b>" + time + "</b>";
    },
    /** "Tue, Oct 28" (with the year when not this year: "Tue, Oct 28, 2027")
     * @param {number} wd the weekday (0 = Sunday) @param {number} d @param {number} m (0 = January) @param {number} y or 0 */
    day: function (wd, d, m, y) {
      return DAYS.en[wd].slice(0, 3) + ", " + MONTHS.en[m].slice(0, 3) + " " + d + (y ? ", " + y : "");
    },
    /** A moonrise: "8:47 pm" @param {number} h 0–23 @param {string} mi two digits */
    time: function (h, mi) {
      return ((h + 11) % 12) + 1 + ":" + mi + (h >= 12 ? " pm" : " am");
    },
    late: " (after midnight)",
    yourPlace: "Your location",
    /** @param {string} place */
    near: function (place) {
      return "near " + place;
    },
    /** @param {string} place */
    place: function (place) {
      return "Place: " + place;
    },
    noGeo: "Location is not available in this browser",
    noPlace: "Could not get your location",
  },
};

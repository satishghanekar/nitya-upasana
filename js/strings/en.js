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
};

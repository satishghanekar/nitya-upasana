// @ts-check
// The menu words in Kannada (ಕನ್ನಡ), every part's under its name, as in js/strings/en.js (js/core/strings.js).
// Digits stay as they are (1, 2, 3): Kannada menus on phones write them so.

import { DAYS, MONTHS } from "../core/words.js";
import { INITIALS_MAX, MAX_PROFILES } from "../store/profiles.js";
import { MAX_ADDED } from "../core/library.js";

/** "ಬೆಳಿಗ್ಗೆ 7:45": the part of the day, then the time @param {number} h 0–23 @param {string} mi */
function clock(h, mi) {
  var part = h < 4 ? "ರಾತ್ರಿ" : h < 6 ? "ಮುಂಜಾನೆ" : h < 12 ? "ಬೆಳಿಗ್ಗೆ" : h < 16 ? "ಮಧ್ಯಾಹ್ನ" : h < 20 ? "ಸಂಜೆ" : "ರಾತ್ರಿ";
  return part + " " + (((h + 11) % 12) + 1) + ":" + mi;
}

/** "1 ಪಠ್ಯ", "3 ಪಠ್ಯಗಳು" @param {number} n */
function texts(n) {
  return n + (n === 1 ? " ಪಠ್ಯ" : " ಪಠ್ಯಗಳು");
}

export default {
  // Backup and restore (js/features/backup.js)
  backup: {
    months: MONTHS.kn,
    never: "ಇನ್ನೂ ಉಳಿಸಿಲ್ಲ",
    /** @param {string} d */
    last: function (d) {
      return "ಕೊನೆಯದಾಗಿ ಉಳಿಸಿದ್ದು " + d;
    },
    saved: "ಬ್ಯಾಕಪ್ ಫೈಲ್ ಉಳಿಸಲಾಗಿದೆ",
    shared: "ಬ್ಯಾಕಪ್ ಫೈಲ್ ಸಿದ್ಧವಾಗಿದೆ",
    remindFirst: "ನಿಮ್ಮ ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಮತ್ತು ದಿನಚರಿ ಈ ಫೋನಿನಲ್ಲಿ ಮಾತ್ರ ಇವೆ. ಫೋನ್ ವೆಬ್‌ಸೈಟ್ ಡೇಟಾವನ್ನು ಅಳಿಸಿದರೂ ಉಳಿಯಲು, ಆಗಾಗ ಬ್ಯಾಕಪ್ ಫೈಲ್ ಉಳಿಸಿ.",
    /** @param {string} d */
    remind: function (d) {
      return "ನಿಮ್ಮ ಕೊನೆಯ ಬ್ಯಾಕಪ್ ಫೈಲ್ ಅನ್ನು " + d + " ರಂದು ಉಳಿಸಲಾಗಿತ್ತು. ಹೊಸದನ್ನು ಉಳಿಸುವಿರಾ?";
    },
    ask: "ಈ ಫೈಲ್‌ನಿಂದ ಮರುಸ್ಥಾಪಿಸುವುದೇ?",
    /** @param {string} d @param {string} v */
    from: function (d, v) {
      return d + " ರಂದು ಉಳಿಸಲಾಗಿದೆ" + (v ? " (ಆವೃತ್ತಿ " + v + ")" : "") + ".";
    },
    inFile: "ಫೈಲ್‌ನಲ್ಲಿರುವವರು: ",
    added: "ಈ ಫೋನಿನಲ್ಲಿ ಹೊಸಬರು: ",
    replaced: "ಫೈಲ್‌ನ ಪ್ರತಿಯಿಂದ ಬದಲಾಯಿಸಲಾಗಿದೆ (ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಮತ್ತು ದಿನಚರಿ): ",
    removed: "ಈ ಫೋನಿನಿಂದ ತೆಗೆದುಹಾಕಲಾಗಿದೆ: ",
    /** @param {string} n */
    then: function (n) {
      return "ಮುಂದೆ ಓದುವವರು: " + n + ".";
    },
    restore: "ಮರುಸ್ಥಾಪಿಸಿ",
    cancel: "ರದ್ದುಮಾಡಿ",
    ok: "ಸರಿ",
    done: "ಬ್ಯಾಕಪ್ ಫೈಲ್‌ನಿಂದ ಮರುಸ್ಥಾಪಿಸಲಾಗಿದೆ",
    bad: "ಈ ಫೈಲ್‌ನಿಂದ ಮರುಸ್ಥಾಪಿಸಲು ಆಗುವುದಿಲ್ಲ",
    unsaved: "ಬ್ಯಾಕಪ್ ಅನ್ನು ಈ ಫೋನಿನಲ್ಲಿ ಉಳಿಸಲು ಆಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ, ಅಥವಾ ಬ್ಯಾಕಪ್ ಫೈಲ್ ಅನ್ನು ಇಟ್ಟುಕೊಳ್ಳಿ.",
    problems: {
      "not-json": "ಇದು ನಿತ್ಯ ಉಪಾಸನಾ ಬ್ಯಾಕಪ್ ಫೈಲ್ (.nitya) ಅಲ್ಲ.",
      "not-nitya": "ಇದು ನಿತ್ಯ ಉಪಾಸನಾ ಬ್ಯಾಕಪ್ ಫೈಲ್ (.nitya) ಅಲ್ಲ.",
      newer:
        "ಈ ಫೈಲ್ ಅನ್ನು ಆ್ಯಪ್‌ನ ಹೊಸ ಆವೃತ್ತಿ ಉಳಿಸಿದೆ. ಅಪ್‌ಡೇಟ್‌ಗಳಿಗಾಗಿ ಪರಿಶೀಲಿಸಿ (ಸೆಟ್ಟಿಂಗ್‌ಗಳು → ಇನ್ನಷ್ಟು → ಕುರಿತು, ಆವೃತ್ತಿಯ ಸಾಲನ್ನು ಒತ್ತಿ) ಮತ್ತು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
      kind: "ಈ .nitya ಫೈಲ್ ಪೂರ್ಣ ಬ್ಯಾಕಪ್ ಅಲ್ಲ.",
      checksum: "ಉಳಿಸಿದ ನಂತರ ಈ ಫೈಲ್ ಬದಲಾಗಿದೆ ಅಥವಾ ಹಾಳಾಗಿದೆ (ಅದರ ಚೆಕ್‌ಸಮ್ ಹೊಂದುವುದಿಲ್ಲ), ಆದ್ದರಿಂದ ಏನನ್ನೂ ಮರುಸ್ಥಾಪಿಸಿಲ್ಲ.",
      empty: "ಈ ಬ್ಯಾಕಪ್‌ನಲ್ಲಿ ಯಾರೂ ಇಲ್ಲ.",
      read: "ಫೈಲ್ ಅನ್ನು ಓದಲು ಆಗಲಿಲ್ಲ.",
    },
  },
  // People on this phone: the badge and the profile sheet (js/features/profiles.js)
  profiles: {
    title: "ಯಾರು ಓದುತ್ತಿದ್ದಾರೆ?",
    add: "ವ್ಯಕ್ತಿಯನ್ನು ಸೇರಿಸಿ",
    info: "ಪ್ರತಿಯೊಬ್ಬರೂ ತಮ್ಮದೇ ಅಕ್ಷರದ ಗಾತ್ರ, ಭಾಷೆಗಳು, ಥೀಮ್ ಮತ್ತು ದಿನಚರಿಯನ್ನು ಈ ಫೋನಿನಲ್ಲಿ ಇಟ್ಟುಕೊಳ್ಳುತ್ತಾರೆ.",
    now: "ಈಗ ಓದುತ್ತಿರುವವರು",
    edit: "ಬದಲಿಸಿ",
    addTitle: "ವ್ಯಕ್ತಿಯನ್ನು ಸೇರಿಸಿ",
    editTitle: "ಬದಲಿಸಿ: ",
    name: "ಹೆಸರು",
    initials: "ಬ್ಯಾಡ್ಜ್ ಮೇಲಿನ ಅಕ್ಷರಗಳು",
    initialsHint: INITIALS_MAX + " ಅಕ್ಷರಗಳವರೆಗೆ. ಖಾಲಿ ಬಿಟ್ಟರೆ ಹೆಸರಿನಿಂದ ತೆಗೆದುಕೊಳ್ಳಲಾಗುತ್ತದೆ.",
    colour: "ಬಣ್ಣ",
    save: "ಉಳಿಸಿ",
    cancel: "ರದ್ದುಮಾಡಿ",
    del: "ಈ ವ್ಯಕ್ತಿಯನ್ನು ಅಳಿಸಿ",
    /** @param {string} n */
    ask: function (n) {
      return n + " ಅವರನ್ನು ಅಳಿಸುವುದೇ? ಅವರ ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಮತ್ತು ದಿನಚರಿ ಈ ಫೋನಿನಿಂದ ತೆಗೆದುಹಾಕಲ್ಪಡುತ್ತವೆ. ಹಿಂದೆ ಉಳಿಸಿದ ಬ್ಯಾಕಪ್ ಫೈಲ್‌ನಲ್ಲಿ ಅವು ಇನ್ನೂ ಇರುತ್ತವೆ.";
    },
    yes: "ಅಳಿಸಿ",
    close: "ಮುಚ್ಚಿ",
    empty: "ದಯವಿಟ್ಟು ಹೆಸರನ್ನು ಬರೆಯಿರಿ.",
    taken: "ಈ ಫೋನಿನಲ್ಲಿ ಈಗಾಗಲೇ ಈ ಹೆಸರಿನವರು ಇದ್ದಾರೆ.",
    full: MAX_PROFILES + " ಜನರಿಗೆ ಮಾತ್ರ ಸ್ಥಳವಿದೆ.",
    /** @param {string} n */
    switched: function (n) {
      return "ಈಗ ಓದುತ್ತಿರುವವರು: " + n;
    },
    /** @param {string} n */
    deleted: function (n) {
      return n + " ಅವರನ್ನು ಅಳಿಸಲಾಗಿದೆ";
    },
    chip: "ಪ್ರೊಫೈಲ್: ",
  },
  // The Library by category and the categories sheet (js/features/library.js)
  library: {
    open: "ವಿಭಾಗಗಳನ್ನು ಬದಲಿಸಿ",
    title: "ವಿಭಾಗಗಳು",
    texts: "ಪಠ್ಯಗಳು",
    textsInfo: "ಪ್ರತಿ ಪಠ್ಯವು ಯಾವ ವಿಭಾಗದಲ್ಲಿ ಇರಬೇಕು ಎಂದು ಆರಿಸಿ.",
    info: "ಇಲ್ಲಿ ಓದುವ ಎಲ್ಲರಿಗಾಗಿ ಈ ಫೋನಿನಲ್ಲಿ ಇಡಲಾಗುತ್ತದೆ, ಮತ್ತು ಬ್ಯಾಕಪ್ ಫೈಲ್‌ಗಳಲ್ಲಿ ಉಳಿಸಲಾಗುತ್ತದೆ. ಪಠ್ಯಗಳ ಪದಗಳು ಎಂದಿಗೂ ಬದಲಾಗುವುದಿಲ್ಲ.",
    add: "ವಿಭಾಗವನ್ನು ಸೇರಿಸಿ",
    rename: "ಹೆಸರು ಬದಲಿಸಿ",
    addTitle: "ವಿಭಾಗವನ್ನು ಸೇರಿಸಿ",
    renameTitle: "ಹೆಸರು ಬದಲಿಸಿ: ",
    mrName: "ಮರಾಠಿಯಲ್ಲಿ ಹೆಸರು",
    enName: "ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಹೆಸರು",
    hint: "ಒಂದು ಸಾಕು: ಅದನ್ನೇ ಎರಡಕ್ಕೂ ಬಳಸಲಾಗುತ್ತದೆ.",
    save: "ಉಳಿಸಿ",
    cancel: "ರದ್ದುಮಾಡಿ",
    /** @param {string} n */
    reset: function (n) {
      return "ಮೂಲ ಹೆಸರನ್ನು ಬಳಸಿ: " + n;
    },
    del: "ಈ ವಿಭಾಗವನ್ನು ಅಳಿಸಿ",
    builtIn: "ಅಂತರ್ಗತ: ಈ ಫೋನಿನಲ್ಲಿ ಹೆಸರು ಬದಲಿಸಬಹುದು, ಅಳಿಸಲಾಗದು.",
    /** @param {string} n */
    ask: function (n) {
      return n + " ಅಳಿಸುವುದೇ? ಅದರ ಪಠ್ಯಗಳು ಮೊದಲು ಇದ್ದ ವಿಭಾಗಗಳಿಗೆ ಮರಳುತ್ತವೆ.";
    },
    yes: "ಅಳಿಸಿ",
    close: "ಮುಚ್ಚಿ",
    empty: "ದಯವಿಟ್ಟು ಹೆಸರನ್ನು ಬರೆಯಿರಿ.",
    taken: "ಇನ್ನೊಂದು ವಿಭಾಗಕ್ಕೆ ಈಗಾಗಲೇ ಈ ಹೆಸರಿದೆ.",
    full: "ನಿಮ್ಮದೇ ಆದ " + MAX_ADDED + " ವಿಭಾಗಗಳಿಗೆ ಸ್ಥಳವಿದೆ.",
    /** @param {number} n */
    count: function (n) {
      return n === 0 ? "ಇನ್ನೂ ಪಠ್ಯಗಳಿಲ್ಲ (ಸಂಗ್ರಹದಲ್ಲಿ ತೋರಿಸುವುದಿಲ್ಲ)" : texts(n);
    },
    /** @param {string} t @param {string} c */
    moved: function (t, c) {
      return t + ": ಈಗ " + c + " ವಿಭಾಗದಲ್ಲಿ";
    },
    /** @param {string} t */
    catFor: function (t) {
      return t + ": ವಿಭಾಗ";
    },
    /** @param {string} n */
    added: function (n) {
      return n + " ಸೇರಿಸಲಾಗಿದೆ";
    },
    /** @param {string} n */
    renamed: function (n) {
      return "ಹೆಸರು ಬದಲಾಗಿದೆ: " + n;
    },
    /** @param {string} n */
    deleted: function (n) {
      return n + " ಅಳಿಸಲಾಗಿದೆ";
    },
  },
  // Home: the date, the sessions and their texts (js/features/today-card.js)
  today: {
    days: DAYS.kn,
    months: MONTHS.kn,
    sessions: { morning: "ಬೆಳಿಗ್ಗೆ", afternoon: "ಮಧ್ಯಾಹ್ನ", evening: "ಸಂಜೆ" },
    tabs: "ಸಮಯ",
    unset: "ಏನೂ ನಿಗದಿಯಾಗಿಲ್ಲ",
    texts: texts,
    none: "ಏನೂ ಯೋಜಿಸಿಲ್ಲ",
    /** @param {string} s */
    empty: function (s) {
      return s + " ಸಮಯಕ್ಕೆ ಇನ್ನೂ ಏನೂ ಯೋಜಿಸಿಲ್ಲ. ";
    },
    add: "ಪಠ್ಯಗಳನ್ನು ಸೇರಿಸಿ",
    edit: "ಬದಲಿಸಿ",
    /** @param {string} s */
    editL: function (s) {
      return "ದಿನಚರಿ ಬದಲಿಸಿ: " + s;
    },
    end: "ಇಂದು",
    ended: "ಈ ಸಮಯ ಮುಗಿಯಿತು",
    prev: "ಹಿಂದಿನ ದಿನ",
    next: "ಮುಂದಿನ ದಿನ",
    today: "ಇಂದು",
    tomorrow: "ನಾಳೆ",
    yesterday: "ನಿನ್ನೆ",
    /** @param {number} n */
    later: function (n) {
      return n + " ದಿನಗಳಲ್ಲಿ";
    },
    /** @param {number} n */
    ago: function (n) {
      return n + " ದಿನಗಳ ಹಿಂದೆ";
    },
    /** @param {string} d the weekday's name, as HTML */
    showing: function (d) {
      return "<b>" + d + "</b> ತೋರಿಸಲಾಗುತ್ತಿದೆ";
    },
    back: "ಇಂದು ›",
  },
  // The routine builder and its Add texts picker (js/features/routine-builder.js)
  routine: {
    /** @param {string} n */
    title: function (n) {
      return n + " ಅವರ ದಿನಚರಿ";
    },
    sessions: { morning: "ಬೆಳಿಗ್ಗೆ", afternoon: "ಮಧ್ಯಾಹ್ನ", evening: "ಸಂಜೆ" },
    sessionG: "ಸಮಯ",
    modes: { fixed: "ಪ್ರತಿದಿನ ಒಂದೇ", weekday: "ವಾರದ ದಿನಕ್ಕೆ ತಕ್ಕಂತೆ ಬೇರೆ" },
    modeG: "ಯಾವ ದಿನಗಳು",
    days: DAYS.kn,
    short: ["ಭಾನು", "ಸೋಮ", "ಮಂಗಳ", "ಬುಧ", "ಗುರು", "ಶುಕ್ರ", "ಶನಿ"],
    dayG: "ದಿನ",
    texts: texts,
    /** @param {string} s @param {number | null} d */
    what: function (s, d) {
      return d === null ? "ಪ್ರತಿದಿನ " + s : this.days[d] + " " + s;
    },
    copy: "ಇತರ ದಿನಗಳಿಗೆ ನಕಲಿಸಿ…",
    /** @param {string} w */
    copyTo: function (w) {
      return w + ": ಈ ಪಟ್ಟಿಯನ್ನು ಇಲ್ಲಿಗೆ ನಕಲಿಸಿ:";
    },
    copyGo: "ನಕಲಿಸಿ",
    cancel: "ರದ್ದುಮಾಡಿ",
    /** @param {string[]} d */
    copied: function (d) {
      return d.length ? d.join(", ") + " ದಿನಗಳಿಗೆ ನಕಲಿಸಲಾಗಿದೆ" : "ಯಾವ ದಿನವನ್ನೂ ಆರಿಸಿಲ್ಲ";
    },
    /** @param {string} t */
    up: function (t) {
      return t + " ಮೇಲೆ ಸರಿಸಿ";
    },
    /** @param {string} t */
    down: function (t) {
      return t + " ಕೆಳಗೆ ಸರಿಸಿ";
    },
    /** @param {string} t */
    remove: function (t) {
      return t + " ತೆಗೆದುಹಾಕಿ";
    },
    /** @param {string} t @param {number} i @param {number} n */
    moved: function (t, i, n) {
      return t + " ಈಗ " + n + " ರಲ್ಲಿ " + i + "ನೇ ಸ್ಥಾನದಲ್ಲಿ";
    },
    /** @param {string} t */
    removed: function (t) {
      return t + " ತೆಗೆದುಹಾಕಲಾಗಿದೆ";
    },
    /** @param {string} t @param {number} n */
    added: function (t, n) {
      return t + " ಸೇರಿಸಲಾಗಿದೆ, " + n + " ರಲ್ಲಿ " + n + "ನೇ";
    },
    /** @param {string} w */
    empty: function (w) {
      return w + ": ಇನ್ನೂ ಪಠ್ಯಗಳಿಲ್ಲ. ಆರಂಭಿಸಲು ಪಠ್ಯಗಳನ್ನು ಸೇರಿಸಿ.";
    },
    hint: "ಕೀಬೋರ್ಡ್‌ನಲ್ಲಿ Alt+↑/↓ ಸರಿಸುತ್ತದೆ",
    add: "ಪಠ್ಯಗಳನ್ನು ಸೇರಿಸಿ",
    /** @param {string} w */
    addTo: function (w) {
      return w + ": ಪಠ್ಯಗಳನ್ನು ಸೇರಿಸಿ";
    },
    search: "ಹುಡುಕಿ (ಮರಾಠಿ ಅಥವಾ ಇಂಗ್ಲಿಷ್)",
    none: "ಏನೂ ಸಿಗಲಿಲ್ಲ",
    done: "ಮುಗಿಯಿತು",
    /** @param {number} n */
    found: function (n) {
      return n === 1 ? "1 ಪಠ್ಯ ಸಿಕ್ಕಿದೆ" : n + " ಪಠ್ಯಗಳು ಸಿಕ್ಕಿವೆ";
    },
    /** @param {string} d */
    toFixed: function (d) {
      return d + ": ಈ ಪಟ್ಟಿಯನ್ನು ಈಗ ಪ್ರತಿದಿನ ಬಳಸಲಾಗುತ್ತದೆ";
    },
    toWeek: "ಈಗ ವಾರದ ಪ್ರತಿ ದಿನಕ್ಕೂ ತನ್ನದೇ ಪಟ್ಟಿ ಇರಬಹುದು",
    /** @param {string} d */
    fixAsk: function (d) {
      return d + ": ಈ ಪಟ್ಟಿಯನ್ನು ಪ್ರತಿದಿನ ಬಳಸುವುದೇ? ಇತರ ದಿನಗಳ ಸ್ವಂತ ಪಟ್ಟಿಗಳು ತೆಗೆದುಹಾಕಲ್ಪಡುತ್ತವೆ.";
    },
    fixGo: "ಪ್ರತಿದಿನ ಬಳಸಿ",
  },
  // The print builder's What step: Texts, Today, Routine (js/print/what.js)
  printWhat: {
    what: "ಏನನ್ನು ಮುದ್ರಿಸಬೇಕು",
    search: "ಸಂಗ್ರಹದಲ್ಲಿ ಹುಡುಕಿ",
    all: "ಎಲ್ಲ ಪಠ್ಯಗಳು",
    selectAll: "ಎಲ್ಲವನ್ನೂ ಆರಿಸಿ",
    clear: "ತೆರವುಗೊಳಿಸಿ",
    none: "ಯಾವ ಪಠ್ಯವೂ ಹೊಂದುವುದಿಲ್ಲ",
    texts: texts,
    pick: "ಕನಿಷ್ಠ ಒಂದು ಪಠ್ಯವನ್ನು ಆರಿಸಿ",
    tabs: { texts: "ಸಂಗ್ರಹ", today: "ಇಂದು", routine: "ದಿನಚರಿ" },
    todayInfo: "ಒಂದು ಸಮಯದ ಪಠ್ಯಗಳನ್ನು ಮುದ್ರಿಸಲು ಅದನ್ನು ಒತ್ತಿ.",
    allToday: "ಇಂದಿನ ಎಲ್ಲವೂ",
    /** @param {string} d the weekday */
    allDay: function (d) {
      return d + ": ಎಲ್ಲವೂ";
    },
    empty: "ಪಠ್ಯಗಳಿಲ್ಲ",
    who: "ಯಾರ ದಿನಚರಿ",
    week: "ಇಡೀ ವಾರ",
    oneDay: "ಒಂದು ದಿನ",
    days: "ದಿನಗಳು",
    sessions: "ಸಮಯಗಳು",
    order: "ಪ್ರತಿಯೊಂದೂ ಒಮ್ಮೆ, ದಿನಚರಿಯ ಕ್ರಮದಲ್ಲಿ",
    noTexts: "ಪಠ್ಯಗಳಿಲ್ಲ",
    nothing: "ಆರಿಸಿದ ದಿನಗಳಲ್ಲಿ ಮತ್ತು ಸಮಯಗಳಲ್ಲಿ ಪಠ್ಯಗಳಿಲ್ಲ",
  },
  // The Vedic calendar: the line on Home, the calendar page, This week and 15 days (js/features/vedic-calendar.js)
  calendar: {
    /** @param {string} name */
    wiki: function (name) {
      return name + ": ವಿಕಿಪೀಡಿಯ (ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆಯುತ್ತದೆ)";
    },
    clock: clock,
    /** "ಮಂಗಳವಾರ 28 ಜುಲೈ" @param {number} wd @param {number} d @param {number} m */
    dayLabel: function (wd, d, m) {
      return DAYS.kn[wd] + " " + d + " " + MONTHS.kn[m];
    },
    open: " (ಪಂಚಾಂಗ ತೆರೆಯಿರಿ)",
    sunrise: "ಸೂರ್ಯೋದಯ",
    sunset: "ಸೂರ್ಯಾಸ್ತ",
    noRise: "ಈ ದಿನ ಚಂದ್ರೋದಯವಿಲ್ಲ",
    /** @param {number} d @param {string} time */
    until: function (d, time) {
      return (d >= 0 ? DAYS.kn[d] + " " : "") + time + " ವರೆಗೆ";
    },
    amanta: "ಅಮಾಂತ",
    today: "ಇಂದು",
    loc: "ನನ್ನ ಸ್ಥಳ ಬಳಸಿ",
    pic: "ಚಿತ್ರವನ್ನು ಪೂರ್ಣ ಪರದೆಯಲ್ಲಿ ತೋರಿಸಿ",
    prev: "ಹಿಂದಿನ ತಿಂಗಳು",
    nextM: "ಮುಂದಿನ ತಿಂಗಳು",
    key: ["ಶುಕ್ಲ ಪಕ್ಷ", "ಕೃಷ್ಣ ಪಕ್ಷ", "ಹುಣ್ಣಿಮೆ", "ಅಮಾವಾಸ್ಯೆ"],
    keyNote: "ಸೂರ್ಯೋದಯದ ತಿಥಿ · + ಮುಂದಿನ ಸೂರ್ಯೋದಯಕ್ಕೆ ಮೊದಲೇ ಆರಂಭವಾಗಿ ಮುಗಿಯುವ (ಕ್ಷಯ) ತಿಥಿ",
    vriddhi: "ಹಿಂದಿನ ದಿನದ ಅದೇ ತಿಥಿ (ವೃದ್ಧಿ)",
    kshaya: "ಕ್ಷಯ ತಿಥಿ: ",
    near: "ಸೂರ್ಯೋದಯಕ್ಕೆ ತುಂಬಾ ಹತ್ತಿರ: ಮುದ್ರಿತ ಪಂಚಾಂಗದಲ್ಲಿ ಪಕ್ಕದ ತಿಥಿ ಇರಬಹುದು.",
    /** @param {string} p */
    note: function (p) {
      return "ಈ ಫೋನಿನಲ್ಲಿ " + p + " ಗಾಗಿ ಲೆಕ್ಕ ಹಾಕಲಾಗಿದೆ. ವಿವರಗಳನ್ನು ನೋಡಲು ಒಂದು ದಿನವನ್ನು ಒತ್ತಿ.";
    },
    /** @param {number} d @param {number} m @param {string} what */
    showing: function (d, m, what) {
      return d + " " + MONTHS.kn[m] + ": " + what;
    },
    fToday: "ಇಂದು: ",
    fTomorrow: "ನಾಳೆ: ",
    fYesterday: "ನಿನ್ನೆ: ",
    /** @param {number} d the weekday */
    fOn: function (d) {
      return DAYS.kn[d] + ": ";
    },
    week: "ಈ ವಾರ",
    next15: "ಮುಂದಿನ 15 ದಿನಗಳು",
    day: "ದಿನ",
    month: "ತಿಂಗಳು",
    up: "15 ದಿನಗಳು",
    prevDay: "ಹಿಂದಿನ ದಿನ",
    nextDay: "ಮುಂದಿನ ದಿನ",
    prevU: "ಹಿಂದಿನ 15 ದಿನಗಳು",
    nextU: "ಮುಂದಿನ 15 ದಿನಗಳು",
    todayB: "ಇಂದು",
    view: "ತೋರಿಸಿ",
    upTitle: "ಮುಂದಿನ 15 ದಿನಗಳು",
    nextWeek: "ಮುಂದಿನ ವಾರ",
    uYesterday: "ನಿನ್ನೆ",
    /** @param {number} n */
    uAgo: function (n) {
      return n + " ದಿನಗಳ ಹಿಂದೆ";
    },
    uToday: "ಇಂದು",
    uTomorrow: "ನಾಳೆ",
    /** @param {number} n */
    uIn: function (n) {
      return n + " ದಿನಗಳಲ್ಲಿ";
    },
    /** @param {number} a @param {number} b */
    uDays: function (a, b) {
      return "ದಿನ " + a + (a === b ? "" : "–" + b);
    },
    /** @param {string} d */
    uUntil: function (d) {
      return d + " ವರೆಗೆ";
    },
    uNext: "ಮುಂದೆ",
    uNone: "ಈ ದಿನಗಳಲ್ಲಿ ಏನೂ ಗುರುತಿಸಿಲ್ಲ.",
    kinds: { fest: "ಹಬ್ಬಗಳು", sk: "ಸಂಕಷ್ಟಿ", pradosh: "ಪ್ರದೋಷ", hol: "ರಜಾದಿನಗಳು" },
  },
  // The top bar (js/features/bars.js)
  bar: {
    /** @param {string} t */
    home: function (t) {
      return "ಮುಖಪುಟ: " + t;
    },
    find: "ಪಠ್ಯ ಅಥವಾ ಸಾಲನ್ನು ಹುಡುಕಿ",
  },
  // The bottom bar's Prev and Next (js/features/bottom-bar.js)
  bottomBar: {
    prev: "‹ ಹಿಂದೆ",
    next: "ಮುಂದೆ ›",
  },
  // A piece's fold button (js/core/apply.js)
  fold: {
    open: "ಈ ಭಾಗವನ್ನು ತೋರಿಸಿ",
    fold: "ಈ ಭಾಗವನ್ನು ಮಡಚಿ",
  },
  // The reading sheet (js/features/reading-sheet.js) and Settings → Languages (js/features/languages.js)
  languages: {
    both: "ಎರಡೂ",
    second: "+ ಎರಡನೇ ಭಾಷೆ",
    none: "ಯಾವುದೂ ಇಲ್ಲ",
    refrain: "↻ ಪಲ್ಲವಿ",
    close: "ಮುಚ್ಚಿ",
    reset: "ಅಕ್ಷರದ ಗಾತ್ರ ಮರುಹೊಂದಿಸಿ",
    /** @param {string} pct */
    size: function (pct) {
      return "ಅಕ್ಷರದ ಗಾತ್ರ " + pct + "%";
    },
  },
  // Dhrupad once or after every verse (js/features/dhrupad-button.js)
  dhrupad: {
    once: "ಧ್ರುಪದ ಒಮ್ಮೆ ತೋರಿಸಲಾಗಿದೆ",
    every: "ಪ್ರತಿ ಪದ್ಯದ ನಂತರ ಧ್ರುಪದ",
  },
  // Settings (js/features/settings-panel.js)
  settings: {
    /** @param {string} why */
    failed: function (why) {
      return "ಬದಲಾವಣೆಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಲು ಆಗಲಿಲ್ಲ (" + why + ")";
    },
  },
  // The full-screen picture (js/features/picture-viewer.js)
  pictureViewer: {
    hint: "ಹಿಗ್ಗಿಸಲು ಎರಡು ಬೆರಳಿನಿಂದ ಅಗಲಿಸಿ ಅಥವಾ ಎರಡು ಬಾರಿ ಒತ್ತಿ",
  },
  // The Books tab's clouds (js/features/pdfs.js)
  pdfs: {
    saved: "ಈ ಫೋನಿನಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ",
    online: "ಆನ್‌ಲೈನ್ ಮಾತ್ರ",
  },
  // Offline use and Check for updates (js/features/offline.js): Settings → More → About
  offline: {
    state: { idle: "ಆಫ್‌ಲೈನ್‌ಗೆ ಸಿದ್ಧ", save: "ಆಫ್‌ಲೈನ್‌ಗಾಗಿ ಉಳಿಸಲಾಗುತ್ತಿದೆ…", off: "ಉಳಿಸಿದ ಪ್ರತಿ ಬಳಕೆಯಲ್ಲಿದೆ" },
    update: { check: "ಅಪ್‌ಡೇಟ್‌ಗಳಿಗಾಗಿ ಪರಿಶೀಲಿಸಿ", busy: "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…", ok: "ಇತ್ತೀಚಿನ ಆವೃತ್ತಿ", off: "ಇಂಟರ್ನೆಟ್ ಇಲ್ಲ" },
    usingSaved: "ಇಂಟರ್ನೆಟ್ ಇಲ್ಲ. ಉಳಿಸಿದ ಪ್ರತಿಯನ್ನು ಬಳಸಲಾಗುತ್ತಿದೆ.",
    loading: "ಹೊಸ ಆವೃತ್ತಿ, ತೆರೆಯುತ್ತಿದೆ…",
    ready: "ಆಫ್‌ಲೈನ್ ಬಳಕೆಗೆ ಸಿದ್ಧ",
  },
  // Search and Recent (js/text/search.js)
  search: {
    /** @param {string} name */
    remove: function (name) {
      return "ತೆಗೆದುಹಾಕಿ: " + name;
    },
    nothing: "ಏನೂ ಸಿಗಲಿಲ್ಲ",
    /** @param {number} n -1: 40 or more */
    lines: function (n) {
      return (n < 0 ? "40 ಅಥವಾ ಹೆಚ್ಚು" : n) + (n == 1 ? " ಫಲಿತಾಂಶ" : " ಫಲಿತಾಂಶಗಳು");
    },
    /** @param {number} t @param {number} n the lines; -1: 40 or more */
    both: function (t, n) {
      return texts(t) + " ಮತ್ತು " + (n < 0 ? "40 ಅಥವಾ ಹೆಚ್ಚು" : n) + (n == 1 ? " ಸಾಲು" : " ಸಾಲುಗಳು");
    },
    texts: "ಪಠ್ಯಗಳು",
    linesHead: "ಸಾಲುಗಳು",
  },
  // Share (js/features/share.js): the message for the group chat
  share: {
    tip: "\nಸಲಹೆ: ಫೋನಿನಲ್ಲಿ ಆ್ಯಪ್‌ನಂತೆ ಇಟ್ಟುಕೊಳ್ಳಲು ಲಿಂಕ್ ತೆರೆದು Add to Home Screen ಒತ್ತಿ.",
    /** @param {string} title */
    plain: function (title) {
      return title;
    },
    temple: " · ಪೂಜೆ ಸಂಜೆ 7:00–8:30, ಭಾರತೀಯ ಹಿಂದೂ ದೇವಾಲಯ, ಪೊವೆಲ್",
    /** @param {string} title @param {string} ang @param {string} date @param {string} temple @param {string} rise */
    next: function (title, ang, date, temple, rise) {
      return title + "\nಮುಂದಿನ " + ang + "Sankathara Chaturthi: " + date + temple + (rise ? " · ಚಂದ್ರೋದಯ " + rise : "");
    },
    copied: "ಸಂದೇಶ ನಕಲಾಗಿದೆ",
  },
  // Print (js/features/print.js): the Print pop-up in the menu language, the printout's own words in its language
  print: {
    langs: { mr: "ಮರಾಠಿ", kn: "ಕನ್ನಡ", en: "ಇಂಗ್ಲಿಷ್" },
    portrait: "ಲಂಬ",
    landscape: "ಅಡ್ಡ",
    both: "ಎರಡೂ",
    /** @param {string} l1 @param {string} l2 */
    stacked: function (l1, l2) {
      return "ಲಂಬ: ಮೇಲೆ " + l1 + ", ಕೆಳಗೆ " + l2;
    },
    side: "ಅಡ್ಡ, ಅಕ್ಕಪಕ್ಕದಲ್ಲಿ",
    preview: "ಮೊದಲ ಪುಟದ ಮುನ್ನೋಟ",
    /** @param {string} paper */
    use: function (paper) {
      return paper + " ಬಳಸಿ";
    },
    cancel: "ರದ್ದುಮಾಡಿ",
    linkCopied: "ಲಿಂಕ್ ನಕಲಾಗಿದೆ: ಅದನ್ನು Safari ಯಲ್ಲಿ ಅಂಟಿಸಿ",
    gone: "ಆರಿಸಿದ ಪಠ್ಯಗಳು ಈಗ ಸಂಗ್ರಹದಲ್ಲಿಲ್ಲ: ಮತ್ತೆ ಆರಿಸಿ.",
    /** @param {number} m @param {number} y */
    cover: function (m, y) {
      return "ನಿತ್ಯ ಉಪಾಸನಾ · " + MONTHS.kn[m] + " " + y;
    },
    week: "ವಾರದ ನೋಟ",
    contents: "ಪರಿವಿಡಿ",
  },
  // The page's own words (index.html: data-w="page.…"); {icon} is the icon written in the page
  page: {
    appAddToHomeScreen: 'ಆ್ಯಪ್<span class="sr"> (ಹೋಮ್ ಸ್ಕ್ರೀನ್‌ಗೆ ಸೇರಿಸಿ)</span>',
    share: "ಹಂಚಿಕೊಳ್ಳಿ",
    qrCode: 'QR<span class="sr"> ಕೋಡ್</span>',
    help: "ಸಹಾಯ",
    back: "ಹಿಂದೆ",
    chants: "ಪಾಠ",
    books: "ಪುಸ್ತಕಗಳು",
    recent: "ಇತ್ತೀಚಿನವು",
    clear: "ತೆರವುಗೊಳಿಸಿ",
    nothingFound: "ಏನೂ ಸಿಗಲಿಲ್ಲ",
    reading: "ಓದು",
    screen: "ಪರದೆ",
    more: "ಇನ್ನಷ್ಟು",
    preview: "ಮುನ್ನೋಟ",
    languageAndText: "ಭಾಷೆ ಮತ್ತು ಪಠ್ಯ",
    mainLanguage: "ಮುಖ್ಯ ಭಾಷೆ",
    largeText: "ದೊಡ್ಡ ಅಕ್ಷರ",
    secondLanguage: "ಎರಡನೇ ಭಾಷೆ",
    smallerUnderEachLine: "ಚಿಕ್ಕದಾಗಿ, ಪ್ರತಿ ಸಾಲಿನ ಕೆಳಗೆ",
    show: "ತೋರಿಸಿ",
    textSize: "ಅಕ್ಷರದ ಗಾತ್ರ",
    textFont: "ಅಕ್ಷರಶೈಲಿ",
    traditional: "ಸಾಂಪ್ರದಾಯಿಕ",
    modern: "ಆಧುನಿಕ",
    bold: "ದಪ್ಪ",
    verses: "ಪದ್ಯಗಳು",
    dhrupad: "ಧ್ರುಪದ",
    once: "ಒಮ್ಮೆ",
    everyVerse: "ಪ್ರತಿ ಪದ್ಯ",
    layout: "ವಿನ್ಯಾಸ",
    n1Column: "1 ಕಾಲಮ್",
    n2Columns: "2 ಕಾಲಮ್‌ಗಳು",
    menusAndButtons: "ಮೆನುಗಳು ಮತ್ತು ಬಟನ್‌ಗಳು",
    theme: "ಥೀಮ್",
    auto: "ಸ್ವಯಂ",
    light: "ತಿಳಿ",
    sepia: "ಸೆಪಿಯಾ",
    dark: "ಗಾಢ",
    highContrast: "ಹೆಚ್ಚಿನ ಕಾಂಟ್ರಾಸ್ಟ್",
    keepScreenOn: "ಪರದೆ ಆನ್ ಇರಲಿ",
    profilesAndBackup: "ಪ್ರೊಫೈಲ್‌ಗಳು ಮತ್ತು ಬ್ಯಾಕಪ್",
    thisBrowserCanTSave: "ಈ ಬ್ರೌಸರ್ ಇಲ್ಲಿ ಉಳಿಸಲಾರದು. ಮುಚ್ಚುವ ಮೊದಲು ಬ್ಯಾಕಪ್ ಫೈಲ್ ಉಳಿಸಿ.",
    whoIsReading: "ಯಾರು ಓದುತ್ತಿದ್ದಾರೆ",
    routine: "ದಿನಚರಿ",
    theTextsForEachSession: "ಪ್ರತಿ ಸಮಯದ ಪಠ್ಯಗಳು, ಕ್ರಮವಾಗಿ",
    saveABackupFile: "ಬ್ಯಾಕಪ್ ಫೈಲ್ ಉಳಿಸಿ",
    restoreFromAFile: "ಫೈಲ್‌ನಿಂದ ಮರುಸ್ಥಾಪಿಸಿ",
    aNityaFileSavedBefore: "ಹಿಂದೆ ಉಳಿಸಿದ .nitya ಫೈಲ್",
    about: "ಕುರಿತು",
    helpAndHowToUse: "ಸಹಾಯ ಮತ್ತು ಬಳಸುವ ವಿಧಾನ",
    addToHomeScreen: "ಹೋಮ್ ಸ್ಕ್ರೀನ್‌ಗೆ ಸೇರಿಸಿ",
    nityaUpasana: "ನಿತ್ಯ ಉಪಾಸನಾ",
    notNow: "ಈಗ ಬೇಡ",
    scanWithTheCameraTo: "ತೆರೆಯಲು ಕ್ಯಾಮೆರಾದಿಂದ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
    close: "ಮುಚ್ಚಿ",
    whatToPrint: "‹ ಏನನ್ನು ಮುದ್ರಿಸಬೇಕು",
    printPdf: "ಮುದ್ರಿಸಿ / PDF",
    whatToPrint2: "ಏನನ್ನು ಮುದ್ರಿಸಬೇಕು",
    howToPrint: "ಹೇಗೆ ಮುದ್ರಿಸಬೇಕು",
    language: "ಭಾಷೆ",
    dhrupad2: 'ಧ್ರುಪದ (<span lang="mr">धृ</span>)',
    once2: "ಒಮ್ಮೆ",
    page: "ಪುಟ",
    printFont: "ಮುದ್ರಣದ ಅಕ್ಷರಶೈಲಿ",
    everyTextStartsOnA: 'ಪ್ರತಿ ಪಠ್ಯ ಹೊಸ ಪುಟದಲ್ಲಿ ಆರಂಭವಾಗುತ್ತದೆ. ಕಾಗದ: <b class="prpaper">Letter</b>',
    forLandscapePickItIn: "ಅಡ್ಡ ಮುದ್ರಣಕ್ಕೆ, Safari ಯ ಸಂವಾದದಲ್ಲೂ ಅದನ್ನೇ ಆರಿಸಿ.",
    pickA4PaperInSafari: 'Safari ಯ ಸಂವಾದದಲ್ಲೂ <span class="przp">A4</span> ಕಾಗದವನ್ನು ಆರಿಸಿ.',
    chromePrintsItBest: "Chrome ಇದನ್ನು ಅತ್ಯುತ್ತಮವಾಗಿ ಮುದ್ರಿಸುತ್ತದೆ.",
    readyPrintNow: "ಸಿದ್ಧ: ಈಗ ಮುದ್ರಿಸಿ",
    openInSafari: "Safari ಯಲ್ಲಿ ತೆರೆಯಿರಿ",
    copyLink: "ಲಿಂಕ್ ನಕಲಿಸಿ",
    printingDoesNotOpenFrom:
      "iPhone ನಲ್ಲಿ ಹೋಮ್ ಸ್ಕ್ರೀನ್ ಆ್ಯಪ್‌ನಿಂದ ಮುದ್ರಣ ತೆರೆಯುವುದಿಲ್ಲ. <b>Safari ಯಲ್ಲಿ ತೆರೆಯಿರಿ</b> ಒತ್ತಿ: ನಿಮ್ಮ ಆಯ್ಕೆಗಳು ಜೊತೆಗೆ ಹೋಗುತ್ತವೆ ಮತ್ತು ಮುದ್ರಣ ಅಲ್ಲಿ ಸಿದ್ಧವಾಗುತ್ತದೆ. Safari ತೆರೆಯದಿದ್ದರೆ, ಲಿಂಕ್ ನಕಲಿಸಿ Safari ಯಲ್ಲಿ ಅಂಟಿಸಿ.",
    thisBrowserDidNotOpen:
      'ಈ ಬ್ರೌಸರ್ ಮುದ್ರಣ ಸಂವಾದವನ್ನು ತೆರೆಯಲಿಲ್ಲ. ಬ್ರೌಸರ್‌ನ <b lang="en">Share</b> ಬಟನ್ ಒತ್ತಿ <b lang="en">Print</b> ಆರಿಸಿ. ಈ ಪುಟ ಬೇರೆ ಆ್ಯಪ್‌ನೊಳಗೆ ತೆರೆದಿದ್ದರೆ, <b>Safari ಯಲ್ಲಿ ತೆರೆಯಿರಿ</b> ಒತ್ತಿ: ನಿಮ್ಮ ಆಯ್ಕೆಗಳು ಜೊತೆಗೆ ಹೋಗುತ್ತವೆ.',
    nextHowToPrint: "ಮುಂದೆ: ಹೇಗೆ ಮುದ್ರಿಸಬೇಕು ›",
    print: "ಮುದ್ರಿಸಿ",
    addToHomeScreen2: "ಹೋಮ್ ಸ್ಕ್ರೀನ್‌ಗೆ ಸೇರಿಸಿ",
    tapTheShareButtonAt: '<b lang="en">Share</b> ಬಟನ್ {icon} ಒತ್ತಿ (Safari ಯಲ್ಲಿ ಕೆಳಗೆ, Chrome ನಲ್ಲಿ ಮೇಲೆ ಬಲಕ್ಕೆ).',
    scrollDownAndTapAdd: 'ಕೆಳಗೆ ಸರಿಸಿ <b lang="en">Add to Home Screen</b> ಒತ್ತಿ.',
    tapAdd: '<b lang="en">Add</b> ಒತ್ತಿ.',
    openThisPageInSafari: 'ಈ ಪುಟವನ್ನು <b lang="en">Safari</b> ಅಥವಾ <b lang="en">Chrome</b> ನಲ್ಲಿ ತೆರೆಯಿರಿ (⋯ ಅಥವಾ Share → Open in Safari/Chrome).',
    thenShareAddToHome: 'ನಂತರ Share {icon} → <b lang="en">Add to Home Screen</b> → <b lang="en">Add</b>.',
    openChromeSMenuTop: "Chrome ನ <b>⋮</b> ಮೆನು ತೆರೆಯಿರಿ (ಮೇಲೆ ಬಲಕ್ಕೆ).",
    tapAddToHomeScreen: '<b lang="en">Add to Home screen</b> ಅಥವಾ <b lang="en">Install app</b> ಒತ್ತಿ.',
    tapInstallOrAdd: '<b lang="en">Install</b> ಅಥವಾ <b lang="en">Add</b> ಒತ್ತಿ.',
    clickTheInstallIconAt: 'ವಿಳಾಸ ಪಟ್ಟಿಯ ಬಲ ತುದಿಯಲ್ಲಿರುವ ಇನ್‌ಸ್ಟಾಲ್ ಐಕಾನ್ ಕ್ಲಿಕ್ ಮಾಡಿ, ಅಥವಾ ಬ್ರೌಸರ್ ಮೆನುವಿನಿಂದ <b lang="en">Install</b> ಆರಿಸಿ.',
    clickTheShareButtonIn: 'Safari ಯ ಟೂಲ್‌ಬಾರ್‌ನಲ್ಲಿ <b lang="en">Share</b> ಬಟನ್ {icon} ಕ್ಲಿಕ್ ಮಾಡಿ, ಅಥವಾ <b lang="en">File</b> ಮೆನು ತೆರೆಯಿರಿ.',
    chooseAddToDockThen: '<b lang="en">Add to Dock</b> ಆರಿಸಿ, ನಂತರ <b lang="en">Add</b> ಕ್ಲಿಕ್ ಮಾಡಿ.',
    firefoxCanTAddThis: "Firefox ಈ ತಾಣವನ್ನು ಆ್ಯಪ್ ಆಗಿ ಸೇರಿಸಲಾರದು. ಈ ಪುಟವನ್ನು Chrome, Edge ಅಥವಾ Safari ಯಲ್ಲಿ ತೆರೆದು ಮತ್ತೆ ಈ ಬಟನ್ ಒತ್ತಿ.",
    itWillThenOpenLike: "ನಂತರ ಇದು ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದಿದ್ದರೂ ಆ್ಯಪ್‌ನಂತೆ ತೆರೆಯುತ್ತದೆ.",
    ok: "ಸರಿ",
    home: "ಮುಖಪುಟ",
    library: "ಸಂಗ್ರಹ",
    smaller: " ಚಿಕ್ಕದು",
    larger: " ದೊಡ್ಡದು",
    allSettings: "ಎಲ್ಲ ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    fontThemeLayout: "ಅಕ್ಷರಶೈಲಿ, ಥೀಮ್, ವಿನ್ಯಾಸ",
    defaultSize: "↺ ಮೂಲ ಗಾತ್ರ",
  },
  // Dates in the menu language (js/features/vedic-calendar.js)
  dates: {
    days: DAYS.kn,
    daysShort: ["ಭಾನು", "ಸೋಮ", "ಮಂಗಳ", "ಬುಧ", "ಗುರು", "ಶುಕ್ರ", "ಶನಿ"],
    months: MONTHS.kn,
    monthsShort: MONTHS.kn,
    /** @param {number} wd @param {number} d @param {number} m */
    day: function (wd, d, m) {
      return DAYS.kn[wd] + ", " + d + " " + MONTHS.kn[m];
    },
    /** @param {number} wd @param {number} d @param {number} m @param {number} y */
    dayYear: function (wd, d, m, y) {
      return DAYS.kn[wd] + ", " + d + " " + MONTHS.kn[m] + " " + y;
    },
    /** @param {number} m @param {number} y */
    monthYear: function (m, y) {
      return MONTHS.kn[m] + " " + y;
    },
    /** @param {number} d @param {number} m */
    from: function (d, m) {
      return " (" + d + " " + MONTHS.kn[m] + " ರಿಂದ)";
    },
    /** @param {number} m @param {number} wd */
    before: function (m, wd) {
      return " " + MONTHS.kn[m] + ", " + DAYS.kn[wd] + ", ";
    },
  },
  // The language's own name, in its own letters: Settings → Menus and buttons (js/features/settings-panel.js)
  language: {
    name: "ಕನ್ನಡ",
  },
  // The Sankashti line on Home, its place and its dates (js/features/sankashti.js)
  sankashti: {
    name: "ಸಂಕಷ್ಟಿ ಚತುರ್ಥಿ",
    angName: "ಅಂಗಾರಕ ಸಂಕಷ್ಟಿ ಚತುರ್ಥಿ",
    /** @param {string} name */
    today: function (name) {
      return "ಇಂದು " + name;
    },
    /** @param {string} time */
    moonrise: function (time) {
      return "ಚಂದ್ರೋದಯ <b>" + time + "</b>";
    },
    /** @param {number} wd @param {number} d @param {number} m @param {number} y */
    day: function (wd, d, m, y) {
      return DAYS.kn[wd] + ", " + d + " " + MONTHS.kn[m] + (y ? " " + y : "");
    },
    /** @param {number} h @param {string} mi */
    time: function (h, mi) {
      return (h >= 20 || h < 4 ? "ರಾತ್ರಿ " : h >= 16 ? "ಸಂಜೆ " : "") + (((h + 11) % 12) + 1) + ":" + mi;
    },
    late: " (ಮಧ್ಯರಾತ್ರಿಯ ನಂತರ)",
    yourPlace: "ನಿಮ್ಮ ಸ್ಥಳ",
    /** @param {string} place */
    near: function (place) {
      return place + " ಹತ್ತಿರ";
    },
    /** @param {string} place */
    place: function (place) {
      return "ಸ್ಥಳ: " + place;
    },
    noGeo: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಸ್ಥಳ ಲಭ್ಯವಿಲ್ಲ",
    noPlace: "ನಿಮ್ಮ ಸ್ಥಳ ಸಿಗಲಿಲ್ಲ",
  },
};

// @ts-check
// The menu words in English, every part's under its name (js/core/strings.js menuWords()). English is the complete
// set: another language's file has the same words, and a word it lacks is taken from here.

import { MONTHS } from "../core/words.js";

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
};

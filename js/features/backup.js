// @ts-check
// Backup and restore (an iPhone can clear a website's data):
// - Save a backup file (Settings, and the reminder on the home page): every person on this phone with their settings,
//   routine and today's ticks, and the device's settings, as a .nitya file (plain JSON with a checksum,
//   js/store/backup.js).
//   On a phone or tablet with the share sheet (iPhone: Save to Files, AirDrop, Messages) it is shared, since an
//   iPhone has no Downloads folder to speak of; elsewhere it downloads.
// - Restore from a file: the file is read and checked first (a wrong checksum stops it), then a dialog (#bkm) says
//   what will change (who is new, who is replaced, who is removed) and Restore puts it in place.
// - The browser is asked to keep the data (navigator.storage.persist()) after a backup, a restore or a new person:
//   not at start-up, because some browsers ask the reader first.
// - A gentle reminder on the home page (#bkn) when no backup was saved for 30 days (or never, 14 days after the first
//   visit), with Not now; and a warning (#stw) when this browser can't save here at all (IndexedDB failed).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P, dfs } from "../core/state.js";
import { flash } from "../core/page.js";
import { ovDone, ovPush } from "./history.js";
import { applyPrefs } from "./profiles.js";
import { refresh as refreshLibrary } from "./library.js";
import { describeRestore, fileName, makeBackup, needsReminder, parseBackup, serialise } from "../store/backup.js";
import { exportData, getMeta, kind, list, markBackup, onChange, restore, snooze } from "../store/store.js";
import { MONTHS, dv, esc } from "../core/words.js";

/** @typedef {import("../store/backup.js").Payload} Payload */

const W = {
  en: {
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
    problems: {
      "not-json": "This is not a Nitya Upasana backup file (.nitya).",
      "not-nitya": "This is not a Nitya Upasana backup file (.nitya).",
      newer: "This file was saved by a newer version of the app. Check for updates (Settings → About, tap the version line) and try again.",
      kind: "This .nitya file is not a full backup.",
      checksum: "This file has been changed or damaged since it was saved (its checksum does not match), so nothing was restored.",
      empty: "This backup has no people in it.",
      read: "The file could not be read.",
    },
  },
  mr: {
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
    problems: {
      "not-json": "ही नित्य उपासनेची बॅकअप फाइल (.nitya) नाही.",
      "not-nitya": "ही नित्य उपासनेची बॅकअप फाइल (.nitya) नाही.",
      newer: "ही फाइल ॲपच्या नव्या आवृत्तीने जतन केली आहे. अपडेट तपासा (सेटिंग्ज → माहिती, आवृत्तीची ओळ दाबा) आणि पुन्हा प्रयत्न करा.",
      kind: "ही .nitya फाइल पूर्ण बॅकअप नाही.",
      checksum: "जतन केल्यानंतर ही फाइल बदलली किंवा खराब झाली आहे (चेकसम जुळत नाही), त्यामुळे काहीही परत आणले नाही.",
      empty: "या बॅकअपमध्ये एकही व्यक्ती नाही.",
      read: "फाइल वाचता आली नाही.",
    },
  },
};

/** @type {HTMLElement} */
var dlg;
/** @type {Element | null} */
var ret = null;
/** @type {Payload | null} */
var pendingData = null;

function words() {
  return P && P.ui === "mr" ? W.mr : W.en;
}

/** @param {string} id */
function el(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/** A date as the menus write it: 18 October 2026, or १८ ऑक्टोबर २०२६ */
/** @param {string} iso */
function day(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  var mr = P.ui === "mr",
    s = d.getDate() + " " + words().months[d.getMonth()] + " " + d.getFullYear();
  return mr ? dv(s) : s;
}

/** The app's version (aarti-v1.4), written into the file */
function version() {
  var m = /** @type {HTMLMetaElement | null} */ (document.querySelector('meta[name="version"]'));
  return (m && m.content) || "";
}

/** Ask the browser to keep this site's data rather than clear it when space runs low (Safari, Chrome, Firefox) */
export function persist() {
  try {
    var st = navigator.storage;
    if (!st || !st.persist || !st.persisted) return;
    st.persisted()
      .then(function (yes) {
        return yes || st.persist();
      })
      .catch(function () {});
  } catch (e) {}
}

// ---- Save a backup file ----
export function saveBackup() {
  var now = new Date(),
    w = words(),
    text = serialise(makeBackup(exportData(), { app: version(), created: now.toISOString() })),
    name = fileName(now);
  /** @param {boolean} shared */
  function done(shared) {
    markBackup(now);
    persist();
    flash(shared ? W.mr.shared : W.mr.saved, shared ? W.en.shared : W.en.saved, 2500);
    void w;
  }
  /** @type {File | null} */
  var file = null;
  try {
    file = new File([text], name, { type: "application/json" });
  } catch (e) {}
  // The share sheet where downloads are awkward (phones and tablets, iPhone above all): Save to Files, AirDrop, …
  var touch = !!(typeof window.matchMedia === "function" && matchMedia("(pointer: coarse)").matches),
    /** @type {any} */
    nav = navigator;
  if (file && touch && nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: name }).then(
      function () {
        done(true);
      },
      function (e) {
        // closed without choosing: nothing was saved, and that's fine
        if (e && e.name === "AbortError") return;
        download(text, name);
        done(false);
      },
    );
    return;
  }
  download(text, name);
  done(false);
}

/** @param {string} text @param {string} name */
function download(text, name) {
  var url = URL.createObjectURL(new Blob([text], { type: "application/json" })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.hidden = true;
  // not a click outside Settings (js/features/clicks.js), so Settings stays open
  a.setAttribute("data-keep", "");
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1500);
}

// ---- Restore from a file ----
function pick() {
  var f = /** @type {HTMLInputElement} */ (el("bkf"));
  f.value = "";
  f.click();
}

/** @param {File} file */
function readFile(file) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () {
      resolve(String(r.result || ""));
    };
    r.onerror = function () {
      reject(r.error);
    };
    r.readAsText(file);
  });
}

/**
 * Read a backup file's text and show what a restore would change (or why it can't be used)
 * @param {string} text
 */
export function offerRestore(text) {
  var desk = !!(typeof window.matchMedia === "function" && !matchMedia("(any-pointer:coarse)").matches),
    r = parseBackup(text, { desk: desk, fs: dfs() });
  if (!r.ok) return showProblem(r.problem);
  var w = words(),
    d = describeRestore(list(), r.data),
    v = (r.backup.app || "").replace(/^aarti-v/, ""),
    names = r.data.profiles.map(function (p) {
      return p.name;
    });
  pendingData = r.data;
  /** @param {string} label @param {string[]} who */
  function line(label, who) {
    return who.length ? "<li>" + esc(label) + "<b>" + who.map(esc).join(", ") + "</b></li>" : "";
  }
  el("bkmt").textContent = w.ask;
  el("bkmd").innerHTML =
    "<p>" + esc(w.from(day(r.backup.created), P.ui === "mr" ? dv(v) : v)) + "</p>" +
    '<ul class="bkl">' + line(w.inFile, names) + line(w.added, d.added) + line(w.replaced, d.replaced) + line(w.removed, d.removed) + "</ul>" +
    "<p>" + esc(w.then(d.active)) + "</p>";
  el("bkok").textContent = w.restore;
  el("bkok").hidden = false;
  el("bkno").textContent = w.cancel;
  openDialog();
}

/** @param {string} problem */
function showProblem(problem) {
  var w = words();
  pendingData = null;
  el("bkmt").textContent = w.bad;
  el("bkmd").innerHTML = "<p>" + esc(/** @type {Record<string, string>} */ (w.problems)[problem] || w.problems.read) + "</p>";
  el("bkok").hidden = true;
  el("bkno").textContent = w.ok;
  openDialog();
}

function openDialog() {
  var c = /** @type {HTMLElement} */ (dlg.querySelector(".pfc"));
  c.setAttribute("data-lang", P.ui === "mr" ? "mr" : "en");
  c.lang = P.ui === "mr" ? "mr" : "en";
  if (dlg.hidden) {
    ovPush();
    ret = ret || document.activeElement;
    dlg.hidden = false;
    document.documentElement.style.overflow = "hidden";
    // from Settings: it stays open underneath
  }
  try {
    el("bkno").focus({ preventScroll: true });
  } catch (e) {}
}

/** @param {boolean} [fromPop] */
function closeDialog(fromPop) {
  if (dlg.hidden) return;
  dlg.hidden = true;
  pendingData = null;
  var pn = document.getElementById("panel");
  if (!pn || pn.hidden) document.documentElement.style.overflow = "";
  if (!fromPop) ovDone();
  var r = /** @type {HTMLElement | null} */ (ret);
  ret = null;
  if (r && r.isConnected && r.getClientRects().length)
    try {
      r.focus({ preventScroll: true });
    } catch (e) {}
}

function doRestore() {
  var data = pendingData;
  if (!data) return closeDialog();
  pendingData = null;
  restore(data).then(function (prefs) {
    applyPrefs(prefs);
    refreshLibrary();
    persist();
    closeDialog();
    flash(W.mr.done, W.en.done, 2500);
    notes();
  });
}

// ---- the notes on the home page and the lines in Settings ----
export function notes() {
  var w = words(),
    m = getMeta(),
    mem = kind() === "memory",
    remind = !mem && needsReminder(m, new Date());
  el("stw").hidden = !mem;
  el("stw2").hidden = !mem;
  el("bkn").hidden = !remind;
  if (remind) el("bknt").textContent = m.lastBackup ? w.remind(day(m.lastBackup)) : w.remindFirst;
  el("pfnt").hidden = !mem && !remind;
  el("bksv").textContent = m.lastBackup ? w.last(day(m.lastBackup)) : w.never;
}

export function init() {
  dlg = el("bkm");
  if (!dlg) return;
  notes();
  onChange(notes);
  // the menu language may change: the notes follow it
  document.addEventListener("click", function (e) {
    if (/** @type {HTMLElement} */ (e.target).closest && /** @type {HTMLElement} */ (e.target).closest("#su")) setTimeout(notes);
  });
  el("bks").addEventListener("click", saveBackup);
  el("bkns").addEventListener("click", saveBackup);
  el("stws").addEventListener("click", saveBackup);
  el("bknx").addEventListener("click", function () {
    snooze(new Date());
    var s = document.getElementById("tsh");
    if (s)
      try {
        s.focus({ preventScroll: true });
      } catch (e) {}
  });
  el("bko").addEventListener("click", function () {
    ret = el("bko");
    pick();
  });
  el("bkf").addEventListener("change", function () {
    var f = /** @type {HTMLInputElement} */ (el("bkf")).files;
    if (!f || !f[0]) return;
    readFile(f[0]).then(offerRestore, function () {
      showProblem("read");
    });
  });
  el("bkok").addEventListener("click", doRestore);
  el("bkno").addEventListener("click", function () {
    closeDialog();
  });
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) closeDialog();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !dlg.hidden) {
      e.stopPropagation();
      closeDialog();
    }
  });
  addEventListener("popstate", function () {
    if (!dlg.hidden) closeDialog(true);
  });
  // a new person was added: ask the browser to keep the data
  document.addEventListener("nitya-people", persist);
}

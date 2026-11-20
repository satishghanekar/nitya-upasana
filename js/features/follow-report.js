// @ts-check
// Follow's report (Satish, 2026-11-20): while Follow listens (js/features/listen.js), what happens is counted here,
// and once it stops after half a minute or more, the time's account is kept on this device (localStorage
// "nitya-follow-report", the last KEEP of them, about 600 bytes each). Nothing is sent by itself: Settings → About shows
// "How Follow went" (#follow-report) with Share Follow report, the device's share sheet (WhatsApp, a message), or the
// report copied where there is none. js/core/follow-report.js makes the accounts and the text.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { KEEP, LEAST_MS, reportText, summarize } from "../core/follow-report.js";
import { menuWords } from "../core/strings.js";
import * as fast from "./fast-mode-report.js";

var KEY = "nitya-follow-report";

/** @type {import("../core/follow-report.js").Raw | null} the time being counted */
var cur = null;
/** the device, asked for when Settings opens, so Share can open the share sheet at once in the tap (Safari opens it
 * only there) @type {Record<string, any>} */
var phone = {};
var t0 = 0,
  /** the text the mark is on, and since when @type {string} */ on = "",
  onSince = 0;

/** @returns {import("../core/follow-report.js").Account[]} */
function stored() {
  try {
    var a = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(a) ? a : [];
  } catch (e) {
    return [];
  }
}

export function init() {
  cur = null;
  var share = document.getElementById("follow-report-share");
  if (share) share.addEventListener("click", send);
  document.addEventListener("nitya-settings", show);
}

/** Settings → About: the row, when there is a time to share */
export function show() {
  var row = document.getElementById("follow-report");
  if (row) row.hidden = !stored().length;
  /** @type {any} */ var f = fast;
  if (row && !row.hidden && typeof f.phoneInfo === "function")
    f.phoneInfo().then(function (/** @type {Record<string, any>} */ p) {
      phone = p;
    });
}

/** Follow starts: a time begun @param {"gpu" | "cpu"} mode @param {string} model @param {boolean} downloading */
export function start(mode, model, downloading) {
  var meta = document.querySelector('meta[name="version"]');
  t0 = performance.now();
  on = "";
  cur = {
    at: new Date().toISOString(),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    app: ((meta && meta.getAttribute("content")) || "").replace(/^aarti-v/, ""),
    mode: mode,
    model: model,
    ort: "",
    ms: 0,
    ready: 0,
    downloaded: downloading,
    first: -1,
    heard: [],
    failed: 0,
    quiet: 0,
    levels: [],
    near: 0,
    search: 0,
    lost: [],
    toText: 0,
    back: 0,
    forward: 0,
    paces: [],
    hand: 0,
    end: "",
    texts: {},
  };
}

/** The GPU failed and the CPU took over: the time goes on in standard mode */
export function mode(/** @type {"gpu" | "cpu"} */ m) {
  if (cur) cur.mode = m;
}

/** The version of ONNX Runtime that runs the model @param {string} v */
export function library(v) {
  if (cur) cur.ort = v;
}

/** The model listens from now on */
export function ready() {
  if (cur && !cur.ready) cur.ready = Math.max(1, performance.now() - t0);
}

/** The time on the text being followed, added up to now @param {number} now */
function settle(now) {
  if (!cur || !on) return;
  var t = cur.texts[on] || (cur.texts[on] = { ms: 0, heard: 0, found: 0 });
  t.ms += now - onSince;
  onSince = now;
}

/** A hearing: how long the model took, how loud the sound was, and the text the mark was on
 * @param {number} ms @param {number} level @param {string} text */
export function hearing(ms, level, text) {
  if (!cur) return;
  cur.heard.push(ms);
  cur.levels.push(level);
  if (text && cur.texts[text]) cur.texts[text].heard++;
}

/** A window too quiet to hear */
export function quiet() {
  if (cur) cur.quiet++;
}

/** A hearing that failed */
export function failed() {
  if (cur) cur.failed++;
}

/** A place found: near the mark, or by searching the texts
 * @param {"near" | "search"} how @param {string} text
 * @param {number} moved  letters from where the mark was (0 for another text) @param {boolean} other  another text */
export function found(how, text, moved, other) {
  if (!cur) return;
  var now = performance.now();
  if (how === "near") cur.near++;
  else cur.search++;
  if (cur.first < 0) cur.first = now - t0;
  if (other && on) cur.toText++;
  else if (moved < -40) cur.back++;
  else if (moved > 120) cur.forward++;
  if (text !== on) {
    settle(now);
    on = text;
    onSince = now;
  }
  var t = cur.texts[text] || (cur.texts[text] = { ms: 0, heard: 0, found: 0 });
  // (the hearing that found it is counted with the text it found)
  if (other || !t.heard) t.heard++;
  t.found++;
}

/** The pace measured, letters a second @param {number} p */
export function pace(p) {
  if (cur && p > 0) cur.paces.push(p);
}

/** Nothing found for a while: the mark stopped @param {string} text @param {number} line */
export function lost(text, line) {
  if (cur) cur.lost.push({ text: text, line: line });
}

/** The reader scrolled by hand while Follow listened */
export function hand() {
  if (cur) cur.hand++;
}

/** Follow stopped: the time's account kept, if it listened long enough @param {string} why */
export function end(why) {
  if (!cur) return;
  var r = cur;
  cur = null;
  var now = performance.now();
  settle(now);
  on = "";
  if (!r.ready) return;
  r.ms = now - t0 - r.ready;
  if (r.ms < LEAST_MS) return;
  r.end = why;
  var all = [summarize(r)].concat(stored()).slice(0, KEEP);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) {}
  show();
}

/** Whether a time is being counted */
export function counting() {
  return !!cur;
}

/** Share Follow report: the phone's share sheet, else the report copied */
function send() {
  var times = stored();
  if (!times.length) return;
  var meta = document.querySelector('meta[name="version"]'),
    text = reportText(times, phone, ((meta && meta.getAttribute("content")) || "").replace(/^aarti-v/, "")),
    /** @type {Record<string, any>} */ w = menuWords("listen") || {},
    live = document.getElementById("follow-report-said");
  function copy() {
    if (navigator.clipboard)
      navigator.clipboard.writeText(text).then(
        function () {
          if (live) live.textContent = w.reportCopied || "";
        },
        function () {},
      );
  }
  if (navigator.share)
    navigator.share({ title: "Nitya Upasana: Follow report", text: text }).catch(function (e) {
      // (the reader closed the sheet: nothing to do; anything else: copied instead)
      if (e && e.name === "AbortError") return;
      copy();
    });
  else copy();
}

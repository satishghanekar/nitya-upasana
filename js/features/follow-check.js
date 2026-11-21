// @ts-check
// Settings → About → Follow: Check Follow on this phone (Satish, 2026-11-21), for family phones far away. It tries the
// phone's GPU a few ways (core/gpu-report.js checkTries): one try each time the app opens, since a library once loaded
// stays in the page, and the app opens again by itself between them, back on About. Each try's answers (works or not,
// the time a hearing, what the GPU was asked for) are kept on this phone (localStorage "nitya-follow-check") and shared
// as one report in English (checkText); the reader sees only plain words. A try that brings the app down is found out
// on the next opening, its mark still set (inTry). Hidden until unlocked by five taps on About's version line
// ("nitya-follow-check-on"); five more taps start it afresh. The check never changes how Follow runs here.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { checkText, checkTries } from "../core/gpu-report.js";
import { menuWords } from "../core/strings.js";
import { num } from "../core/words.js";
import { gpuInfo, phoneInfo, share } from "./fast-mode-report.js";
import * as models from "./follow-model.js";
import { spTab } from "./settings-panel.js";

var KEY = "nitya-follow-check",
  ON = "nitya-follow-check-on",
  // five taps on the version line, each within this many ms of the last
  TAPS = 5,
  TAP_GAP = 1500,
  // what the row says the check takes
  MINUTES = 2,
  // the most console lines kept for a try
  LOG_LINES = 20;

/** @typedef {{ at: string, app: string, model: string, tries: ("app" | "none" | "on" | "off")[], results: any[],
 *   next: number, inTry: number, gpu?: Record<string, any>, phone?: Record<string, any> }} Check */

var taps = 0,
  lastTap = 0,
  // asking before the GPU's download
  asking = false,
  busy = false;

/** @returns {Check | null} */
function get() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch (e) {
    return null;
  }
}

/** @param {Check | null} s */
function put(s) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch (e) {}
}

function unlocked() {
  try {
    return localStorage.getItem(ON) === "1";
  } catch (e) {
    return false;
  }
}

/** @param {string} id */
function el(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/** The row as the check is now @param {number} [pct] the download's progress, during a try */
function paint(pct) {
  var row = el("follow-check");
  if (!row) return;
  row.hidden = !unlocked();
  if (row.hidden) return;
  var w = menuWords("listen"),
    s = get(),
    running = !!s && s.next < s.tries.length,
    done = !!s && !running,
    title = el("follow-check-title");
  el("follow-check-start").hidden = !!s || asking;
  title.hidden = !s && !asking;
  title.textContent = done ? w.checkDone : running && s ? w.checking(num(s.next + 1), num(s.tries.length)) : w.checkTitle;
  el("follow-check-note").textContent = done
    ? w.checkThanks
    : running
      ? pct !== undefined && pct < 100
        ? w.dlBusy(num(pct))
        : w.checkKeepOpen
      : asking
        ? w.checkNeeds(num(models.WAYS.gpu.mb))
        : w.checkNote(num(MINUTES));
  el("follow-check-ask").hidden = !asking || !!s;
  el("follow-check-share").hidden = !done;
}

/** The app opened again for the next try (a moment first, for the row to say so) */
function reopen() {
  setTimeout(function () {
    location.reload();
  }, 600);
}

/** The check begun: its tries chosen from the GPU this browser gives, kept, and the first run after the app opens again */
async function begin() {
  asking = false;
  var both = await Promise.all([gpuInfo(), phoneInfo()]),
    g = both[0],
    meta = document.querySelector('meta[name="version"]'),
    /** @type {Check} */ s = {
      at: new Date().toISOString(),
      app: ((meta && meta.getAttribute("content")) || "").replace(/^aarti-v/, ""),
      model: models.modelName(models.WAYS.gpu),
      tries: g.features ? checkTries(g, g.features) : [],
      results: [],
      next: 0,
      inTry: -1,
      gpu: g,
      phone: both[1],
    };
  // (no GPU given to this browser: nothing to try, and that is the result)
  if (!s.tries.length) s.results.push({ mode: "app", ok: false, error: "no GPU given to this browser (" + (g.description || "") + ")" });
  put(s);
  paint();
  if (s.tries.length) reopen();
}

/** The row's title tapped: asks first where the GPU's download isn't here yet */
async function tapStart() {
  if (busy || models.state().follow) return;
  busy = true;
  try {
    if (/** @type {any} */ (navigator).gpu && !(await models.gpuKept())) {
      asking = true;
      paint();
      el("follow-check-go").focus();
    } else await begin();
  } finally {
    busy = false;
  }
}

/** One try, in this opening of the app @param {Check} s */
async function run(s) {
  s.inTry = s.next;
  put(s);
  paint();
  // the console's warnings and errors during the try, kept with it: ONNX Runtime and the browser say there what went
  // wrong on the GPU (put back as they were after)
  /** @type {any} */ var con = console,
    /** @type {string[]} */ log = [],
    /** @type {Record<string, any>} */ was = { warn: con.warn, error: con.error };
  Object.keys(was).forEach(function (k) {
    con[k] = function () {
      log.push(
        k +
          ": " +
          Array.prototype.map
            .call(arguments, function (/** @type {any} */ x) {
              return x && x.message ? x.message : String(x);
            })
            .join(" ")
            .slice(0, 300),
      );
      if (log.length > LOG_LINES) log.shift();
      return was[k].apply(con, arguments);
    };
  });
  try {
    var r = await models.checkTry(s.tries[s.next], function (p) {
      paint(p);
    });
  } finally {
    Object.assign(con, was);
  }
  if (log.length) r.log = log;
  s.results[s.next] = r;
  s.next++;
  s.inTry = -1;
  put(s);
  paint();
  if (s.next < s.tries.length) reopen();
}

/** The version line tapped: the fifth tap in a row shows the check (afresh, if it had finished) */
function tapVersion() {
  var now = Date.now();
  taps = now - lastTap < TAP_GAP ? taps + 1 : 1;
  lastTap = now;
  if (taps < TAPS) return;
  taps = 0;
  try {
    localStorage.setItem(ON, "1");
  } catch (e) {}
  var s = get();
  if (s && s.next >= s.tries.length) put(null);
  asking = false;
  paint();
  el("follow-check-said").textContent = menuWords("listen").checkShown;
}

export function init() {
  if (!el("follow-check")) return;
  el("follow-check-start").addEventListener("click", tapStart);
  el("follow-check-go").addEventListener("click", function () {
    begin();
  });
  el("follow-check-cancel").addEventListener("click", function () {
    asking = false;
    paint();
    el("follow-check-start").focus();
  });
  el("follow-check-share").addEventListener("click", function () {
    var s = get();
    if (s) share("Nitya Upasana: Follow check", checkText(s), "follow-check-said", "resultsCopied");
  });
  var ver = document.getElementById("ver");
  if (ver && ver.parentElement) ver.parentElement.addEventListener("click", tapVersion);
  document.addEventListener("nitya-settings", function () {
    paint();
  });
  var s = get();
  if (!s || s.next >= s.tries.length) return;
  // a try whose mark is still set never finished: the app or the GPU stopped during it
  if (s.inTry === s.next) {
    s.results[s.next] = { mode: s.tries[s.next], ok: false, error: "the app or the GPU stopped during this try" };
    s.next++;
    s.inTry = -1;
    put(s);
  }
  // back on About, where the reader started it, to see how far it has come
  var gear = document.getElementById("aa");
  if (gear) gear.click();
  spTab("about");
  if (s.next < s.tries.length) run(s);
  else paint();
}

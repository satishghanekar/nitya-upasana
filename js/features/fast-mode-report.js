// @ts-check
// Fast mode's report (Satish, 2026-11-20): Follow tries the phone's GPU first (js/features/listen.js); when the GPU
// fails, or the app closes while it starts, Follow carries on in standard mode (the CPU) and keeps a report of what
// happened. Settings → You → About then shows "Fast mode did not work on this phone" (#lswf), with Share report: the
// phone's share sheet (WhatsApp, a message), or the report copied where there is none, so a reader far away can send it
// in one go (js/core/gpu-report.js writes it). The report is kept on this phone (localStorage "nitya-fast-mode") while
// fast mode is tried ("trying"), so a page that dies meanwhile is found out on the next opening ("closed"); once the GPU
// has heard the check sound right and gone on listening, it is let go. A phone that has a report runs Follow on the CPU.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { reportText } from "../core/gpu-report.js";
import { menuWords } from "../core/strings.js";

var KEY = "nitya-fast-mode",
  // where the GPU's failure was kept before this report (only "1"): let go, so every phone tries the GPU once more and
  // keeps why it fails this time
  OLD = "nitya-listen-cpu",
  // the most lines the log keeps, and the most letters of each
  LOG_LINES = 60,
  LINE_LETTERS = 300;

/** @type {import("../core/gpu-report.js").Report | null} the report being written while the GPU is tried */
var cur = null;
var t0 = 0;

/** @returns {import("../core/gpu-report.js").Report | null} */
function stored() {
  try {
    var r = JSON.parse(localStorage.getItem(KEY) || "null");
    return r && r.status ? r : null;
  } catch (e) {
    return null;
  }
}

/** @param {import("../core/gpu-report.js").Report | null} r */
function keep(r) {
  try {
    if (r) localStorage.setItem(KEY, JSON.stringify(r));
    else localStorage.removeItem(KEY);
  } catch (e) {}
}

export function init() {
  cur = null;
  try {
    localStorage.removeItem(OLD);
  } catch (e) {}
  // fast mode was being tried when the page went: while downloading, only the download stopped (it is tried again);
  // after that, the app closed while the GPU worked, which is what a GPU that brings the page down looks like
  var r = stored();
  if (r && r.status === "trying") {
    if (r.step === "downloading") keep(null);
    else {
      r.status = "closed";
      keep(r);
    }
  }
  var share = document.getElementById("lswfs");
  if (share) share.addEventListener("click", send);
  document.addEventListener("nitya-settings", show);
}

/** Whether fast mode did not work on this phone: Follow runs on the CPU (a GPU that failed with its subgroups used is
 * tried once more without them first, retryWithoutSubgroups()) */
export function failedHere() {
  var r = stored();
  return !!r && (r.status === "failed" || r.status === "closed") && r.subgroups !== "on";
}

/** Whether fast mode failed here with the GPU's subgroups used: tried once more without them */
export function retryWithoutSubgroups() {
  var r = stored();
  return !!r && (r.status === "failed" || r.status === "closed") && r.subgroups === "on";
}

/** Whether the try being written used the GPU's subgroups */
export function subgroupsOn() {
  return !!cur && cur.subgroups === "on";
}

/** Whether the GPU's subgroups were used, turned off, or not offered @param {"on" | "off" | "none"} v
 * @param {string[]} asked  the features ONNX Runtime asked the GPU for */
export function subgroups(v, asked) {
  if (!cur) return;
  cur.subgroups = v;
  note("GPU features asked: " + (asked.join(", ") || "none") + "; subgroups " + v);
}

/** Settings → You → About: the row, when there is a report to share */
export function show() {
  var row = document.getElementById("lswf");
  if (row) row.hidden = !failedHere();
}

/** @param {any} e */
function errorText(e) {
  if (!e) return "unknown";
  if (typeof e === "string") return e;
  // (ONNX Runtime's WebAssembly throws a bare number for some failures; its words go to the console, kept in the log)
  if (typeof e === "number") return "ONNX Runtime error " + e + " (see the log)";
  return ((e.name ? e.name + ": " : "") + (e.message || String(e))).slice(0, 1000);
}

/** A line in the log, with the ms since fast mode started @param {string} what */
export function note(what) {
  if (!cur) return;
  cur.log.push("+" + Math.round(performance.now() - t0) + " ms " + String(what).slice(0, LINE_LETTERS));
  if (cur.log.length > LOG_LINES) cur.log.splice(1, cur.log.length - LOG_LINES);
  keep(cur);
}

/** The console's warnings and errors while fast mode is on trial, kept in the log too: ONNX Runtime and the browser say
 * there what went wrong on the GPU (wrapped once, and passed on as they were) */
var hooked = false;
function hookConsole() {
  if (hooked) return;
  hooked = true;
  ["warn", "error"].forEach(function (k) {
    /** @type {any} */ var con = console,
      was = con[k];
    con[k] = function () {
      if (cur && cur.status === "trying")
        note(
          k +
            ": " +
            Array.prototype.map
              .call(arguments, function (/** @type {any} */ x) {
                return x && x.message ? errorText(x) : String(x);
              })
              .join(" "),
        );
      return was.apply(con, arguments);
    };
  });
}

/** The GPU's name, limits and features (asked again: a fresh adapter tells as much as Follow's) */
async function gpuInfo() {
  /** @type {any} */ var nav = navigator,
    /** @type {Record<string, any>} */ out = {};
  try {
    var a = nav.gpu && (await nav.gpu.requestAdapter());
    if (!a) return { description: "no adapter given" };
    var info = a.info || (a.requestAdapterInfo ? await a.requestAdapterInfo() : {});
    ["vendor", "architecture", "device", "description", "subgroupMinSize", "subgroupMaxSize"].forEach(function (k) {
      if (info && info[k]) out[k] = info[k];
    });
    out.fallback = !!(a.isFallbackAdapter || (info && info.isFallbackAdapter));
    /** @type {Record<string, number>} */ var lim = {};
    for (var k in a.limits) if (typeof a.limits[k] === "number") lim[k] = a.limits[k];
    out.limits = lim;
    out.features = Array.from(a.features || []);
  } catch (e) {
    out.description = "could not be read: " + errorText(e);
  }
  return out;
}

/** The phone and the browser: model, system, cores, memory, screen; nothing personal */
async function phoneInfo() {
  /** @type {any} */ var nav = navigator,
    /** @type {Record<string, any>} */ out = {
      cores: nav.hardwareConcurrency,
      memory: nav.deviceMemory,
      installed: matchMedia("(display-mode: standalone)").matches || !!nav.standalone,
      isolated: !!window.crossOriginIsolated,
      screen: screen.width + "×" + screen.height + " @" + devicePixelRatio,
      ua: nav.userAgent,
    };
  try {
    if (nav.userAgentData && nav.userAgentData.getHighEntropyValues) {
      var h = await nav.userAgentData.getHighEntropyValues(["model", "platform", "platformVersion", "fullVersionList"]);
      out.model = h.model;
      out.platform = h.platform;
      out.platformVersion = h.platformVersion;
      out.browser = (h.fullVersionList || [])
        .filter(function (/** @type {any} */ b) {
          return !/Not/.test(b.brand);
        })
        .map(function (/** @type {any} */ b) {
          return b.brand + " " + b.version;
        })
        .join(", ");
    }
  } catch (e) {}
  return out;
}

/** Fast mode is tried: a report begun and kept, so a page that dies from now on is found out
 * @param {string} model */
export async function begin(model) {
  t0 = performance.now();
  var now = new Date(),
    meta = document.querySelector('meta[name="version"]'),
    // a try before this one that failed: kept in this report, so one message tells both
    old = stored();
  cur = {
    status: "trying",
    step: "downloading",
    at: now.toISOString(),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    app: ((meta && meta.getAttribute("content")) || "").replace(/^aarti-v/, ""),
    model: model,
    ort: "",
    log: [],
    timings: {},
  };
  if (old && old.status !== "trying") cur.before = reportText(old).slice(0, 6000);
  keep(cur);
  hookConsole();
  note("fast mode tried");
  var both = await Promise.all([gpuInfo(), phoneInfo()]);
  if (!cur) return;
  cur.gpu = both[0];
  cur.phone = both[1];
  keep(cur);
}

/** The version of ONNX Runtime that runs it @param {string} v */
export function library(v) {
  if (!cur) return;
  cur.ort = v;
  keep(cur);
}

/** The step fast mode is at @param {string} what */
export function step(what) {
  if (!cur) return;
  cur.step = what;
  note(what);
}

/** How long a step took @param {string} what @param {number} ms */
export function took(what, ms) {
  if (!cur || !cur.timings) return;
  cur.timings[what] = Math.round(ms);
  keep(cur);
}

/** The check sound's answers on the GPU @param {{ ms: number, alike: number, far: number }} c */
export function checked(c) {
  if (!cur) return;
  cur.check = c;
  note("check sound: " + Math.round(c.ms) + " ms, " + Math.round(c.alike * 100) + "% alike");
}

/** Fast mode failed: the report kept, for the CPU to carry on and About to share @param {any} e */
export function failed(e) {
  if (!cur) return;
  cur.status = "failed";
  cur.error = errorText(e);
  if (e && e.stack) cur.stack = String(e.stack).split("\n").slice(0, 8).join(" | ").slice(0, 1500);
  note("failed: " + cur.error);
}

/** What came of the CPU after (kept on the report, whether it is the one being written or one from before)
 * @param {string} what */
export function cpu(what) {
  var r = cur || stored();
  if (!r || r.status === "trying") return;
  r.cpu = what;
  keep(r);
}

/** Fast mode works here: the report let go */
export function works() {
  if (cur && cur.status === "trying") keep(null);
  cur = null;
}

/** Fast mode's trial stopped by the reader before the model ran (Stop, or the page put away): nothing learned, so
 * nothing kept, and it is tried again next time */
export function drop() {
  if (cur && cur.status === "trying") keep(null);
  cur = null;
}

/** Whether fast mode is being tried now and has not been let go */
export function trying() {
  return !!cur && cur.status === "trying";
}

/** Share report: the phone's share sheet, else the report copied */
function send() {
  var r = stored();
  if (!r) return;
  var text = reportText(r),
    /** @type {Record<string, any>} */ w = menuWords("listen") || {},
    live = document.getElementById("lswfl");
  /** @param {string} s */
  function say(s) {
    if (live) live.textContent = s || "";
  }
  if (navigator.share)
    navigator.share({ title: "Nitya Upasana: fast mode report", text: text }).catch(function (e) {
      // (the reader closed the sheet: nothing to do; anything else: copied instead)
      if (e && e.name === "AbortError") return;
      copy();
    });
  else copy();
  function copy() {
    if (navigator.clipboard)
      navigator.clipboard.writeText(text).then(
        function () {
          say(w.reportCopied);
        },
        function () {},
      );
  }
}

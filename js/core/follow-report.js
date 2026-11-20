// @ts-check
// Follow's report (Satish, 2026-11-20): after each time Follow listens for half a minute or more, a short account of how
// it went is kept on this device (js/features/follow-report.js), the last few of them, and Settings → About → Share
// Follow report sends them as plain text (WhatsApp, a message). What it holds is what helps make Follow better: how
// fast the model hears on this kind of phone, how often it finds the place, where it gets lost (the texts and lines to
// record for training), its jumps, the pace, and how it ended. Never the sound, the words heard, or anything personal.
// Pure: a time's raw counts made into its account, and the accounts into the text (tests/unit/follow-report.test.mjs).

/** How many times are kept, and the shortest one kept (ms) */
export var KEEP = 6;
export var LEAST_MS = 30000;
/** At most so many places lost, and texts, in one account */
var LOST_MOST = 10,
  TEXTS_MOST = 12;

/**
 * One time Follow listened, as it was counted (js/features/follow-report.js)
 * @typedef {{ at: string, tz: string, app: string, mode: "gpu" | "cpu", model: string, ort: string, ms: number,
 *   ready: number, downloaded: boolean, first: number, heard: number[], failed: number, quiet: number, levels: number[],
 *   near: number, search: number, lost: { text: string, line: number }[], toText: number, back: number, forward: number,
 *   paces: number[], hand: number, end: string,
 *   texts: Record<string, { ms: number, heard: number, found: number }> }} Raw
 */

/**
 * The account kept: the same, with the lists made into the numbers that tell
 * @typedef {{ at: string, tz: string, app: string, mode: "gpu" | "cpu", model: string, ort: string, ms: number,
 *   ready: number, downloaded: boolean, first: number, n: number, typical: number, slow: number, failed: number,
 *   quiet: number, level: number, near: number, search: number, lost: { text: string, line: number }[], toText: number,
 *   back: number, forward: number, pace: number, paceLo: number, paceHi: number, hand: number, end: string,
 *   texts: { id: string, ms: number, heard: number, found: number }[] }} Account
 */

/** The value below which a share `q` (0 to 1) of the numbers lie (0 for none) @param {number[]} xs @param {number} q */
export function quantile(xs, q) {
  if (!xs.length) return 0;
  var s = xs.slice().sort(function (a, b) {
    return a - b;
  });
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))];
}

/** @param {number} x @param {number} places */
function round(x, places) {
  var f = Math.pow(10, places);
  return Math.round(x * f) / f;
}

/** A time's raw counts made into its account @param {Raw} r @returns {Account} */
export function summarize(r) {
  var texts = Object.keys(r.texts)
    .map(function (id) {
      return {
        id: id,
        ms: Math.round(r.texts[id].ms),
        heard: r.texts[id].heard,
        found: r.texts[id].found,
      };
    })
    .sort(function (a, b) {
      return b.ms - a.ms;
    })
    .slice(0, TEXTS_MOST);
  return {
    at: r.at,
    tz: r.tz,
    app: r.app,
    mode: r.mode,
    model: r.model,
    ort: r.ort,
    ms: Math.round(r.ms),
    ready: Math.round(r.ready),
    downloaded: r.downloaded,
    first: Math.round(r.first),
    n: r.heard.length,
    typical: Math.round(quantile(r.heard, 0.5)),
    slow: Math.round(quantile(r.heard, 0.95)),
    failed: r.failed,
    quiet: r.quiet,
    level: round(quantile(r.levels, 0.5), 3),
    near: r.near,
    search: r.search,
    lost: r.lost.slice(0, LOST_MOST),
    toText: r.toText,
    back: r.back,
    forward: r.forward,
    pace: round(quantile(r.paces, 0.5), 1),
    paceLo: round(quantile(r.paces, 0.1), 1),
    paceHi: round(quantile(r.paces, 0.9), 1),
    hand: r.hand,
    end: r.end,
    texts: texts,
  };
}

/** A count and its word: 1 time, 3 times @param {number} n @param {string} one @param {string} many */
function times(n, one, many) {
  return n + " " + (n === 1 ? one : many);
}

/** A share as a whole percent @param {number} part @param {number} all */
function pct(part, all) {
  return all ? Math.round((100 * part) / all) + "%" : "0%";
}

/** A length of time as people read it: 18 min, 45 s @param {number} ms */
function span(ms) {
  var s = Math.round(ms / 1000);
  return s >= 60 ? Math.round(s / 60) + " min" : s + " s";
}

/** Seconds with one place @param {number} ms */
function secs(ms) {
  return round(ms / 1000, 1) + " s";
}

/** m:ss @param {number} ms */
function clock(ms) {
  var s = Math.round(ms / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

/** When, in the reader's own time zone as kept @param {Account} a */
function when(a) {
  var d = new Date(a.at);
  try {
    return (
      d.toLocaleString("en-GB", {
        timeZone: a.tz || undefined,
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }) + (a.tz ? " (" + a.tz + ")" : "")
    );
  } catch (e) {
    return a.at;
  }
}

/** One time, as lines @param {Account} a @param {number} i */
function timeLines(a, i) {
  var places = a.near + a.search,
    out = [
      i + 1 + ") " + when(a) + ", " + span(a.ms) + ", " + (a.mode === "gpu" ? "fast mode (GPU)" : "standard mode (CPU)") + ", app " + a.app,
      "Start: model ready " + secs(a.ready) + (a.downloaded ? " (downloaded first)" : "") + ", first place found " + (a.first >= 0 ? secs(a.first) : "never"),
      "Speed: " + a.n + " hearings, " + a.typical + " ms typical, " + a.slow + " ms slowest 5%, " + a.failed + " failed",
      "Sound: chanting " + pct(a.n, a.n + a.quiet) + ", quiet " + pct(a.quiet, a.n + a.quiet) + ", level " + a.level + " typical",
      "Found: " + pct(places, a.n) + " of hearings (" + pct(a.near, a.n) + " near the mark, " + pct(a.search, a.n) + " by search)",
      "Lost: " +
        times(a.lost.length, "time", "times") +
        (a.lost.length
          ? " (" +
            a.lost
              .map(function (x) {
                return x.text + " line " + (x.line + 1);
              })
              .join(", ") +
            ")"
          : ""),
      "Jumps: " + a.toText + " to another text, " + a.back + " back, " + a.forward + " forward",
      "Pace: " + a.pace + " letters a second (" + a.paceLo + " to " + a.paceHi + ")",
      "Reader: scrolled by hand " + times(a.hand, "time", "times") + ", ended with " + a.end,
      "Model: " + a.model + (a.ort ? ", ONNX Runtime " + a.ort : ""),
    ];
  if (a.texts.length)
    out.push(
      "Texts: " +
        a.texts
          .map(function (t) {
            return t.id + " " + clock(t.ms) + " " + pct(t.found, t.heard);
          })
          .join(", "),
    );
  return out;
}

/**
 * The report as shared, in English whatever the menu language: for whoever makes Follow better
 * @param {Account[]} list  newest first @param {Record<string, any>} phone  the device (js/features/fast-mode-report.js)
 * @param {string} app  this version @returns {string}
 */
export function reportText(list, phone, app) {
  var p = phone || {},
    lines = [
      "Nitya Upasana " + app + ": Follow report (last " + times(list.length, "time)", "times)"),
      "Phone: " +
        [
          p.model,
          (p.platform || "") + (p.platformVersion ? " " + p.platformVersion : ""),
          p.browser,
          p.installed ? "installed app" : "in the browser",
          p.cores ? p.cores + " cores" : "",
          p.memory ? p.memory + " GB memory" : "",
        ]
          .filter(function (x) {
            return x;
          })
          .join(", "),
    ];
  if (p.ua) lines.push("User agent: " + p.ua);
  list.forEach(function (a, i) {
    lines.push("");
    lines.push.apply(lines, timeLines(a, i));
  });
  return lines.join("\n");
}

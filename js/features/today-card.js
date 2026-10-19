// @ts-check
// Home (Home v2, approved by Satish 2026-10-18; docs/decisions.md): what to chant now. The time-of-day picture with
// today's weekday star (js/features/day-picture.js) beside today's date in Marathi and English; the texts of the
// session for the time now (Morning / Afternoon / Evening), each with a tick and its title; "Not this time?" with the
// other two sessions; and Start / Continue, pinned to the bottom of the screen on phones. Every text, with search, is
// in the Library (#jump, js/features/contents-list.js).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// What it reads: the routine (content/routines.json) and the titles (content/library.json), both loaded by
// js/text/load.js; which texts a session has and the walk through it: js/core/routine.js; the ticks, kept on this
// device for today only, per person (in their profile, js/store/store.js): js/core/ticks.js. Titles are always the
// library's, never typed here. Switching person re-draws the list with their ticks (profileChanged()).
// Reading a session: Start / Continue (or a title in the list) opens the text in the reading page, and while the
// reader is on a text of that session, ‹ Prev and Next › in the bottom bar follow the session (sessionStep(), read by
// js/features/bottom-bar.js); Next after the last text comes back here.

import { P } from "../core/state.js";
import { flash } from "../core/page.js";
import { pjOpen } from "../core/apply.js";
import { jumpTo } from "./history.js";
import { setView } from "./day-picture.js";
import { loaded } from "../text/load.js";
import { nextChange, sessionAt } from "../core/time-of-day.js";
import { dateKey, firstUndone, stepInSession, textsFor } from "../core/routine.js";
import { createTicks } from "../core/ticks.js";
import { active, ticksStorage } from "../store/store.js";

/**
 * @typedef {import("../core/time-of-day.js").Session} Session
 * @typedef {{ id: string, sec: string, title: string, titleEn: string, language: string }} TextInfo
 * @typedef {{ ids: string[], day: string, session: Session }} Run
 */

// The menu words, in English and Marathi (the menu language, P.ui)
const W = {
  en: {
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    sessions: { morning: "Morning", afternoon: "Afternoon", evening: "Evening" },
    other: "Not this time?",
    show: "Show ",
    done: "Done: ",
    start: "Start: ",
    cont: "Continue: ",
    again: "Start again: ",
    /** @param {number} d @param {number} n */
    count: function (d, n) {
      return d + " of " + n + " done";
    },
    /** @param {number} n */
    texts: function (n) {
      return n + (n === 1 ? " text" : " texts");
    },
    none: "Nothing planned",
    empty: "Nothing is planned for this session. Any text can be opened from the Library at any time.",
    end: "Today",
    ended: "End of the session",
  },
  mr: {
    days: ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
    months: ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"],
    sessions: { morning: "सकाळ", afternoon: "दुपार", evening: "सायंकाळ" },
    other: "दुसरी वेळ:",
    show: "दाखवा: ",
    done: "झाले: ",
    start: "सुरू करा: ",
    cont: "पुढे चालू: ",
    again: "पुन्हा सुरू करा: ",
    /** @param {number} d @param {number} n */
    count: function (d, n) {
      return dv(n) + " पैकी " + dv(d) + " झाले";
    },
    /** @param {number} n */
    texts: function (n) {
      return dv(n) + " रचना";
    },
    none: "काही ठरलेले नाही",
    empty: "या वेळेसाठी काही ठरलेले नाही. कोणतीही रचना संग्रहातून केव्हाही उघडता येईल.",
    end: "आज",
    ended: "या वेळेची उपासना पूर्ण",
  },
};
/** @type {Record<Session, string>} */
const MR_SESSION = { morning: "सकाळ", afternoon: "दुपार", evening: "सायंकाळ" };
/** @type {Record<Session, string>} */
const EN_SESSION = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
const CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const RUN_KEY = "nitya-run";

/** @type {import("../core/ticks.js").Ticks} */
var ticks;
/** @type {Record<string, TextInfo>} */
var info = {};
/** @type {Record<string, string>} section id → text id */
var bySec = {};
// The session shown when one is picked by hand ("Not this time?"), or null to follow the clock; a new day starts
// again from the clock
/** @type {{ session: Session | null }} */
var pick = { session: null };
// The session being read (Start / Continue), so Prev and Next follow it
/** @type {Run | null} */
var run = null;
var shownToday = "",
  langKey = "";
/** @type {ReturnType<typeof setTimeout> | undefined} */
var timer;

/** @param {number | string} n Devanagari digits */
function dv(n) {
  return String(n).replace(/[0-9]/g, function (d) {
    return "०१२३४५६७८९"[+d];
  });
}

/** @param {string} s */
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Devanagari shown in Kannada letters when that is the chosen script (SCR in js/render.js)
/** @param {string} s */
function scr(s) {
  /** @type {any} */
  var w = window;
  return w.SCR && w.SCR.k ? w.SCR.to(s) : s;
}

// The script the texts are shown in: "" as written, or "kn" (Kannada letters)
function scrKey() {
  /** @type {any} */
  var w = window;
  return (w.SCR && w.SCR.k) || "";
}

function words() {
  return P && P.ui === "mr" ? W.mr : W.en;
}

/** @param {string} key YYYY-MM-DD */
function fromKey(key) {
  var p = key.split("-");
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

/** The day and session the home page shows: always today */
function current() {
  var now = new Date(),
    today = dateKey(now);
  return { today: today, day: today, session: pick.session || sessionAt(now) };
}

/** The texts of a session on a day, keeping only those in the library */
/** @param {string} day @param {Session} session */
function idsFor(day, session) {
  return textsFor(loaded.routine, fromKey(day).getDay(), session).filter(function (id) {
    return !!info[id];
  });
}

// The texts' titles and their place on the page, from content/library.json and the pieces built from it
function buildInfo() {
  info = {};
  bySec = {};
  var lib = loaded.library;
  /** @type {any} */
  var w = window;
  if (!lib || !w.CONTENT) return;
  /** @type {Record<string, import("../text/content.js").LibraryText>} */
  var t = {};
  lib.texts.forEach(function (x) {
    t[x.id] = x;
  });
  lib.groups.forEach(function (g, gi) {
    var pieces = w.CONTENT.groups[gi] ? w.CONTENT.groups[gi].pieces : [];
    g.texts.forEach(function (id, i) {
      if (!t[id] || !pieces[i]) return;
      info[id] = { id: id, sec: pieces[i].id, title: t[id].title, titleEn: t[id].titleEn, language: t[id].language };
      bySec[pieces[i].id] = id;
    });
  });
}

/** @param {string} lang @param {"mr" | "en"} ui */
function langName(lang, ui) {
  var l = loaded.library && loaded.library.languages[lang];
  return l ? l[ui] : "";
}

/** The title a reader sees for a text in the menu language (the bottom bar's labels use the same) */
/** @param {string} id */
function titleOf(id) {
  var t = info[id];
  return !t ? "" : P.ui === "mr" ? scr(t.title) : t.titleEn;
}

// Draw the date, the session's texts with their ticks, the other sessions and Start / Continue
export function render() {
  var c = current(),
    w = words(),
    ui = /** @type {"mr" | "en"} */ (P.ui === "mr" ? "mr" : "en"),
    d = fromKey(c.day),
    ids = idsFor(c.day, c.session),
    done = ticks.done(c.today, c.session),
    nDone = ids.filter(function (id) {
      return done.indexOf(id) >= 0;
    }).length,
    box = document.getElementById("tdy"),
    sc = document.getElementById("tsc");
  if (!box || !sc) return;
  shownToday = c.today;
  langKey = ui + scrKey();
  sc.lang = ui;
  // the date, in Marathi (in Kannada letters when chosen) and in English
  var dd = /** @type {HTMLElement} */ (document.getElementById("tdd"));
  /** @type {HTMLElement} */ (dd.querySelector(".d1")).textContent = scr(W.mr.days[d.getDay()] + ", " + dv(d.getDate()) + " " + W.mr.months[d.getMonth()] + " " + dv(d.getFullYear()));
  /** @type {HTMLElement} */ (dd.querySelector(".d1")).lang = scrKey() || "mr";
  /** @type {HTMLElement} */ (dd.querySelector(".d2")).textContent = W.en.days[d.getDay()] + ", " + d.getDate() + " " + W.en.months[d.getMonth()] + " " + d.getFullYear();
  // the session's heading, in both languages, and how many are done
  var head = /** @type {HTMLElement} */ (document.getElementById("tsh"));
  head.innerHTML = '<span lang="' + (scrKey() || "mr") + '">' + scr(MR_SESSION[c.session]) + '</span> <span class="tsdot" aria-hidden="true">·</span> <span lang="en">' + EN_SESSION[c.session] + "</span>";
  /** @type {HTMLElement} */ (document.getElementById("tsn")).textContent = !ids.length ? w.none : w.count(nDone, ids.length);
  var list = /** @type {HTMLElement} */ (document.getElementById("tsl"));
  list.innerHTML = ids
    .map(function (id, i) {
      var t = info[id],
        on = done.indexOf(id) >= 0,
        name = ui === "mr" ? scr(t.title) : t.titleEn;
      return (
        '<li class="' + (on ? "done" : "") + '">' +
        '<label class="ttk"><input type="checkbox" data-t="' + id + '"' + (on ? " checked" : "") + ' aria-label="' + esc(w.done + name) + '"><span class="tkc" aria-hidden="true">' + CHECK + "</span></label>" +
        '<a class="tgo" href="#' + t.sec + '" data-t="' + id + '">' +
        '<span class="tno" aria-hidden="true">' + scr(dv(i + 1)) + ".</span>" +
        '<span class="tt"><span class="t1" lang="' + (scrKey() || t.language) + '">' + esc(scr(t.title)) + '</span><span class="t2" lang="en">' + esc(t.titleEn) + "</span></span>" +
        '<span class="ttg">' + esc(langName(t.language, ui)) + "</span>" +
        "</a></li>"
      );
    })
    .join("");
  var empty = /** @type {HTMLElement} */ (document.getElementById("tse"));
  empty.hidden = ids.length > 0;
  empty.textContent = w.empty;
  // "Not this time?" and the two other sessions
  var so = /** @type {HTMLElement} */ (document.getElementById("tso"));
  so.lang = ui;
  /** @type {HTMLElement} */ (document.getElementById("tsow")).textContent = w.other;
  var first = true;
  [].forEach.call(so.querySelectorAll("button[data-s]"), function (/** @type {HTMLElement} */ b) {
    var s = /** @type {Session} */ (b.dataset.s),
      off = s === c.session,
      sep = /** @type {HTMLElement | null} */ (b.previousElementSibling);
    b.hidden = off;
    b.textContent = w.sessions[s];
    b.setAttribute("aria-label", w.show + w.sessions[s]);
    // the "·" before a button shows only between two shown buttons
    if (sep && sep.classList.contains("tsod")) sep.hidden = off || first;
    if (!off) first = false;
  });
  // Start / Continue
  var start = /** @type {HTMLElement} */ (document.getElementById("tst")),
    k = firstUndone(ids, done);
  start.hidden = !ids.length;
  /** @type {HTMLElement} */ (document.getElementById("tsb")).hidden = !ids.length;
  /** @type {HTMLElement} */ (document.getElementById("tsb")).lang = ui;
  if (ids.length)
    /** @type {HTMLElement} */ (document.getElementById("tstw")).textContent =
      (k < 0 ? w.again : nDone ? w.cont : w.start) + titleOf(ids[k < 0 ? 0 : k]);
  setView(pick.session ? { session: c.session, day: d.getDay() } : null);
}

/** Say what the card now shows (after a day or session is picked) */
function announce() {
  var c = current(),
    w = words(),
    d = fromKey(c.day),
    ids = idsFor(c.day, c.session),
    done = ticks.done(c.today, c.session),
    n = ids.filter(function (id) {
      return done.indexOf(id) >= 0;
    }).length;
  /** @type {HTMLElement} */ (document.getElementById("tlive")).textContent =
    w.sessions[c.session] + ", " + w.days[d.getDay()] + ": " + (ids.length ? w.texts(ids.length) + ", " + w.count(n, ids.length) : w.none);
}

/**
 * Open a text in the reading page, as the contents links do (js/features/clicks.js), reading this session
 * @param {string} id
 */
function openText(id) {
  var t = info[id],
    el = t && document.getElementById(t.sec);
  if (!el) return;
  pjOpen(el);
  jumpTo(function () {
    /** @type {HTMLElement} */ (el).scrollIntoView();
  }, "#" + t.sec);
  document.dispatchEvent(new Event("nitya-session"));
}

/** Read the session shown from this text on */
/** @param {string} id */
function startAt(id) {
  var c = current();
  run = { ids: idsFor(c.day, c.session), day: c.day, session: c.session };
  try {
    sessionStorage.setItem(RUN_KEY, JSON.stringify(run));
  } catch (e) {}
  openText(id);
}

// After the last text of a session: back home, with the session's heading focused
function endSession() {
  var h = document.getElementById("tsh");
  jumpTo(function () {
    scrollTo(0, 0);
  }, location.pathname);
  if (h)
    try {
      h.focus({ preventScroll: true });
    } catch (e) {}
  flash(W.mr.ended, W.en.ended);
}

/**
 * ‹ Prev (-1) or Next › (1) from the piece on screen, while reading a session: where it goes and the title for its
 * label, or null to keep the library order (js/features/bottom-bar.js).
 * @param {string} sec  the piece's id on the page (a3)
 * @param {1 | -1} dir
 * @returns {{ label: string, go: () => void } | null}
 */
export function sessionStep(sec, dir) {
  var id = bySec[sec];
  if (!run || !id) return null;
  var st = stepInSession(run.ids, id, dir);
  if (!st) return null;
  var r = run;
  // Next › on a text of the session ticks it as done today (for the person reading) before moving on; ‹ Prev
  // doesn't. A tick can still be taken off by hand on the card.
  function tick() {
    var today = dateKey(new Date());
    if (dir === 1 && r && r.day === today && id) ticks.set(today, r.session, id, true);
  }
  if ("end" in st)
    return {
      label: words().end,
      go: function () {
        tick();
        endSession();
        render();
      },
    };
  var to = st.to;
  return {
    label: titleOf(to),
    go: function () {
      tick();
      openText(to);
      render();
    },
  };
}

// A new day while the page is open: back to today and the session for the time now, and yesterday's ticks go
function check() {
  var now = new Date();
  if (dateKey(now) !== shownToday) {
    pick = { session: null };
    ticks.prune(dateKey(now));
    render();
  } else if (!pick.session) render();
  clearTimeout(timer);
  timer = setTimeout(check, nextChange(now).getTime() - now.getTime() + 1000);
}

/** Re-draw when the menu language or the script changes (called by apply(), js/features/bars.js) */
export function todayLang() {
  var ui = P.ui === "mr" ? "mr" : "en";
  if (ui + scrKey() !== langKey && document.getElementById("tdy")) render();
}

/** Another person is reading (js/features/profiles.js): their ticks, and their menu language */
export function profileChanged() {
  if (!ticks) return;
  ticks.prune(dateKey(new Date()));
  if (document.getElementById("tdy")) render();
}

export function init() {
  ticks = createTicks(ticksStorage(), undefined, function () {
    var a = active();
    return a ? a.id : "";
  });
  buildInfo();
  try {
    var r = JSON.parse(sessionStorage.getItem(RUN_KEY) || "null");
    if (r && Array.isArray(r.ids)) run = r;
  } catch (e) {}
  ticks.prune(dateKey(new Date()));
  var so = /** @type {HTMLElement} */ (document.getElementById("tso")),
    list = /** @type {HTMLElement} */ (document.getElementById("tsl"));
  if (!so || !list) return;
  // "Not this time?": another session; it stays picked until the next day (then the clock again)
  so.addEventListener("click", function (e) {
    var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest("button[data-s]"));
    if (!b) return;
    pick.session = /** @type {Session} */ (b.dataset.s);
    render();
    announce();
    // focus goes to the new list's heading, since the button pressed is now hidden
    var h = document.getElementById("tsh");
    if (h)
      try {
        h.focus({ preventScroll: true });
      } catch (x) {}
  });
  // a tick
  list.addEventListener("change", function (e) {
    var x = /** @type {HTMLInputElement} */ (e.target),
      id = x.dataset.t,
      c = current();
    if (!id) return;
    ticks.set(c.today, c.session, id, x.checked);
    render();
    var again = /** @type {HTMLElement | null} */ (list.querySelector('input[data-t="' + id + '"]'));
    if (again) again.focus();
  });
  // a title opens its text, reading the session from there
  list.addEventListener("click", function (e) {
    var a = /** @type {HTMLElement} */ (e.target).closest("a.tgo");
    if (!a) return;
    e.preventDefault();
    startAt(/** @type {string} */ (/** @type {HTMLElement} */ (a).dataset.t));
  });
  /** @type {HTMLElement} */ (document.getElementById("tst")).addEventListener("click", function () {
    var c = current(),
      ids = idsFor(c.day, c.session),
      k = firstUndone(ids, ticks.done(c.today, c.session));
    if (ids.length) startAt(ids[k < 0 ? 0 : k]);
  });
  // going to a text another way (the Library, the side menu, the hidden Previous / Next links) leaves the session:
  // Prev and Next follow the library order again
  document.addEventListener(
    "click",
    function (e) {
      var a = /** @type {HTMLElement} */ (e.target).closest && /** @type {HTMLElement} */ (e.target).closest("a[data-go]");
      if (!a || !run) return;
      run = null;
      try {
        sessionStorage.removeItem(RUN_KEY);
      } catch (x) {}
      setTimeout(function () {
        document.dispatchEvent(new Event("nitya-session"));
      });
    },
    true,
  );
  render();
  // the page can stay open for hours: the session follows the clock, and a new day starts fresh
  clearTimeout(timer);
  timer = setTimeout(check, nextChange(new Date()).getTime() - Date.now() + 1000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) check();
  });
  addEventListener("pageshow", function (e) {
    if (e.persisted) check();
  });
}

// @ts-check
// Home: what to chant now.
// The time-of-day picture with the weekday's star (js/features/day-picture.js) beside the date in Marathi and English,
// with ‹ › under it to show another day (#tdn: the day before or after, and between them Today, Tomorrow, Yesterday,
// "In 3 days" or "3 days ago"). Home opens on today; on another day all of Home follows it (the Vedic calendar line,
// the festival and Sankashti lines: homeDay() in js/features/vedic-calendar.js; the picture's star; the sessions'
// texts), This week makes way for "Showing Wednesday" with Today › (#tdb), and a title reads that day's session. A new
// day, or coming back to the page after AWAY, shows today again. A Morning | Afternoon | Evening switch (#tss, tabs: arrow keys move between them, Enter or Space picks),
// opened at the session for the time now; a session with nothing set today is greyed ("Nothing set", aria-disabled,
// still focusable, and picking it shows the empty state with Add texts); the picked session's texts, numbered, each
// title starting the session there. The Library is the top bar's book button; App, Share, QR, Print and Help are under
// More (⋯) in the top bar (js/features/more-menu.js), and Print is in the bottom bar while reading. Every text, with search, is in the Library (#jump, js/features/contents-list.js);
// the reading page's pieces are not shown under Home (data-hv, js/features/history.js).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// What it reads: the reading person's routine (their own, made in the routine builder, js/features/routine-builder.js,
// or else content/routines.json) and the titles (content/library.json), both loaded by
// js/text/load.js; which texts a session has and the walk through it: js/core/routine.js. Titles are always the
// library's, never typed here. Switching person re-draws the list with their routine (profileChanged()).
// Reading a session: a title in the list opens the reading page with the session's texts one after another, in session
// order, in one scroll (data-run, .inrun, css/10-today.css), at that text. ‹ Prev and Next › in the bottom bar stay in the
// session (sessionStep(), read by js/features/bottom-bar.js): ‹ Prev on the first text and Next › after the last come
// back here.
// Changing the routine: "Edit" beside the session's heading (#tsed), and "Add texts" when a session is empty (#tsea),
// open the routine builder for this session (the event "nitya-routine-edit"); the builder says "nitya-routine" after
// each change, and the list is drawn again (a removed text's tick just no longer shows).

import { P } from "../core/state.js";
import { note, onPiece, pieceEl } from "../core/page.js";
import { cur, unfold } from "../core/apply.js";
import { homeAlone, jumpTo } from "./history.js";
import { setView } from "./day-picture.js";
import { homeDay } from "./vedic-calendar.js";
import { loaded } from "../text/load.js";
import { nextChange, sessionAt } from "../core/time-of-day.js";
import { dateKey, stepInSession, textsFor } from "../core/routine.js";
import { onReread, routine } from "../store/store.js";
import { dv, esc, scr, scrKey } from "../core/words.js";
import { menuWords } from "../core/strings.js";

/**
 * @typedef {import("../core/time-of-day.js").Session} Session
 * @typedef {{ id: string, sec: string, title: string, titleEn: string, language: string }} TextInfo
 * @typedef {{ ids: string[], day: string, session: Session, at?: number }} Run
 */

const RUN_KEY = "nitya-run";
// a session started on another day is not carried on, unless it was started less than this long ago (an evening
// session read past midnight)
const RUN_KEEP = 3 * 3600 * 1000;
// how far ‹ › go from today, each way (days)
const SPAN = 366;
// another day shown, and the page hidden longer than this: it shows today again when it comes back
const AWAY = 30 * 60 * 1000;

/** @type {Record<string, TextInfo>} */
var info = {};
/** @type {Record<string, string>} section id → text id */
var bySec = {};
// The session shown when one is picked by hand (the Morning | Afternoon | Evening switch), or null to follow the
// clock, and the day shown ("YYYY-MM-DD", from ‹ ›), or "" for today; a new day starts again from the clock and today
/** @type {{ session: Session | null, day: string }} */
var pick = { session: null, day: "" };
// The session being read (started from a title in the list), so Prev and Next follow it
/** @type {Run | null} */
var run = null;
var shownToday = "",
  langKey = "",
  hiddenAt = 0;
/** @type {ReturnType<typeof setTimeout> | undefined} */
var timer;

function words() {
  return menuWords("today");
}

/** @param {string} key YYYY-MM-DD */
function fromKey(key) {
  var p = key.split("-");
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

/** @param {string} key YYYY-MM-DD @param {number} n days */
function addDays(key, n) {
  var d = fromKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Days from a to b @param {string} a @param {string} b */
function daysBetween(a, b) {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 864e5);
}

/** The day and session the home page shows: today, or the day picked with ‹ › */
function current() {
  var now = new Date(),
    today = dateKey(now);
  return { today: today, day: pick.day || today, session: pick.session || sessionAt(now) };
}

/** The day shown, as said beside ‹ ›: Today, Tomorrow, Yesterday, In 3 days, 3 days ago @param {string} today @param {string} day */
function dayWord(today, day) {
  var w = words(),
    n = daysBetween(today, day);
  return n === 0 ? w.today : n === 1 ? w.tomorrow : n === -1 ? w.yesterday : n > 0 ? w.later(n) : w.ago(-n);
}

/** The texts of a session on a day, from the reading person's routine, keeping only those in the library */
/** @param {string} day @param {Session} session */
function idsFor(day, session) {
  return textsFor(routine() || loaded.routine, fromKey(day).getDay(), session).filter(function (id) {
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
  w.CONTENT.categories.forEach(function (/** @type {import("../text/content.js").Content["categories"][0]} */ c) {
    c.pieces.forEach(function (p) {
      var id = p.text;
      if (!t[id]) return;
      info[id] = { id: id, sec: p.id, title: t[id].title, titleEn: t[id].titleEn, language: t[id].language };
      bySec[p.id] = id;
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

// Draw the date, the session switch and the session's texts
export function render() {
  var c = current(),
    w = words(),
    ui = /** @type {"mr" | "en"} */ (P.ui === "mr" ? "mr" : "en"),
    d = fromKey(c.day),
    ids = idsFor(c.day, c.session),
    box = document.getElementById("tdy"),
    sc = document.getElementById("tsc");
  if (!box || !sc) return;
  shownToday = c.today;
  langKey = ui + scrKey();
  sc.lang = ui;
  // the date, in Marathi (in Kannada letters when chosen) and in English
  var dd = /** @type {HTMLElement} */ (document.getElementById("tdd"));
  /** @type {HTMLElement} */ (dd.querySelector(".d1")).textContent = scr(
    menuWords("today", "mr").days[d.getDay()] + ", " + dv(d.getDate()) + " " + menuWords("today", "mr").months[d.getMonth()] + " " + dv(d.getFullYear()),
  );
  /** @type {HTMLElement} */ (dd.querySelector(".d1")).lang = scrKey() || "mr";
  /** @type {HTMLElement} */ (dd.querySelector(".d2")).textContent =
    menuWords("today", "en").days[d.getDay()] + ", " + d.getDate() + " " + menuWords("today", "en").months[d.getMonth()] + " " + d.getFullYear();
  // ‹ › and the day's word between them (Today greyed); "Showing Wednesday · Today ›" in place of This week
  var other = c.day !== c.today,
    off = daysBetween(c.today, c.day),
    rel = /** @type {HTMLElement} */ (document.getElementById("tdr")),
    bar = /** @type {HTMLElement} */ (document.getElementById("tdb")),
    tp = /** @type {HTMLButtonElement} */ (document.getElementById("tdp")),
    tx = /** @type {HTMLButtonElement} */ (document.getElementById("tdx"));
  /** @type {HTMLElement} */ (document.getElementById("tdn")).lang = ui;
  rel.textContent = dayWord(c.today, c.day);
  rel.classList.toggle("on", other);
  tp.setAttribute("aria-label", w.prev);
  tx.setAttribute("aria-label", w.next);
  tp.disabled = off <= -SPAN;
  tx.disabled = off >= SPAN;
  bar.lang = ui;
  /** @type {HTMLElement} */ (document.getElementById("tdbt")).innerHTML = w.showing(
    esc(ui === "mr" ? scr(menuWords("today", "mr").days[d.getDay()]) : menuWords("today", "en").days[d.getDay()]),
  );
  /** @type {HTMLElement} */ (document.getElementById("tdbb")).textContent = w.back;
  bar.hidden = !other;
  document.documentElement.toggleAttribute("data-day", other);
  homeDay(other ? c.day : "");
  // the session's heading, in both languages, and how many texts it has
  var head = /** @type {HTMLElement} */ (document.getElementById("tsh"));
  head.innerHTML =
    '<span lang="' +
    (scrKey() || "mr") +
    '">' +
    scr(menuWords("today", "mr").sessions[c.session]) +
    '</span> <span class="tsdot" aria-hidden="true">·</span> <span lang="en">' +
    menuWords("today", "en").sessions[c.session] +
    "</span>";
  /** @type {HTMLElement} */ (document.getElementById("tsn")).textContent = !ids.length ? w.none : w.texts(ids.length);
  var ed = document.getElementById("tsed");
  if (ed) {
    ed.textContent = w.edit;
    ed.setAttribute("aria-label", w.editL(w.sessions[c.session]));
  }
  var list = /** @type {HTMLElement} */ (document.getElementById("tsl"));
  list.innerHTML = ids
    .map(function (id, i) {
      var t = info[id];
      return (
        "<li>" +
        '<a class="tgo" href="./#' +
        t.sec +
        '" data-t="' +
        id +
        '">' +
        '<span class="tno" aria-hidden="true">' +
        scr(dv(i + 1)) +
        ".</span>" +
        '<span class="tt"><span class="t1" lang="' +
        (scrKey() || t.language) +
        '">' +
        esc(scr(t.title)) +
        '</span><span class="t2" lang="en">' +
        esc(t.titleEn) +
        "</span></span>" +
        '<span class="ttg">' +
        esc(langName(t.language, ui)) +
        "</span>" +
        "</a></li>"
      );
    })
    .join("");
  var empty = /** @type {HTMLElement} */ (document.getElementById("tse"));
  empty.hidden = ids.length > 0;
  /** @type {HTMLElement} */ (document.getElementById("tset")).textContent = w.empty(w.sessions[c.session]);
  /** @type {HTMLElement} */ (document.getElementById("tsea")).textContent = w.add;
  // Morning | Afternoon | Evening: the one shown is selected (and the one Tab reaches); one with nothing set today is
  // greyed, with "Nothing set" under its name, and stays focusable (aria-disabled)
  var tabs = /** @type {HTMLElement} */ (document.getElementById("tss"));
  tabs.lang = ui;
  tabs.setAttribute("aria-label", w.tabs);
  [].forEach.call(tabs.querySelectorAll('[role="tab"]'), function (/** @type {HTMLElement} */ b) {
    var s = /** @type {Session} */ (b.dataset.s),
      on = s === c.session,
      n = idsFor(c.day, s).length;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
    if (n) b.removeAttribute("aria-disabled");
    else b.setAttribute("aria-disabled", "true");
    /** @type {HTMLElement} */ (b.querySelector(".tsw")).textContent = w.sessions[s];
    /** @type {HTMLElement} */ (b.querySelector(".tshn")).textContent = n ? "" : w.unset;
  });
  /** @type {HTMLElement} */ (document.getElementById("tsp")).setAttribute("aria-labelledby", "tss-" + c.session);
  setView(pick.session || other ? { session: c.session, day: d.getDay() } : null);
  markNow(/** @type {HTMLElement | null} */ (cur()));
}

/**
 * The text being read, marked in the list (aria-current): on wide screens Home's column stays beside the text
 * (css/10-today.css), so the list shows where you are. Called by mark() (js/features/bars.js) as the reader moves.
 * @param {HTMLElement | null} c  the piece being read, or null on Home
 */
export function markNow(c) {
  [].forEach.call(document.querySelectorAll("#tsl a.tgo"), function (/** @type {HTMLElement} */ a) {
    var on = !!c && !!info[a.dataset.t || ""] && info[a.dataset.t || ""].sec === c.id;
    /** @type {HTMLElement} */ (a.parentElement).classList.toggle("now", on);
    if (on) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
}

/** Say what the card now shows (after a day or session is picked) */
function announce() {
  var c = current(),
    w = words(),
    d = fromKey(c.day),
    ids = idsFor(c.day, c.session);
  /** @type {HTMLElement} */ (document.getElementById("tlive")).textContent =
    (c.day !== c.today ? dayWord(c.today, c.day) + ", " : "") +
    w.sessions[c.session] +
    ", " +
    w.days[d.getDay()] +
    ": " +
    (ids.length ? w.texts(ids.length) : w.none);
}

/**
 * Open a text in the reading page, as the contents links do (js/features/clicks.js), reading this session
 * @param {string} id
 */
function openText(id) {
  var t = info[id],
    el = t && pieceEl(t.sec);
  if (!el) return;
  unfold(el);
  jumpTo(function () {
    /** @type {HTMLElement} */ (el).scrollIntoView();
  }, "#" + t.sec);
  document.dispatchEvent(new Event("nitya-session"));
}

/**
 * While a session is being read (started from a text of the list), the reading page shows that session's texts, one
 * after another in session order, in one scroll (data-run on <html>, .inrun and a CSS order on each of its pieces:
 * css/10-today.css), and nothing else; going to a text another way (the Library, search, the side menu) leaves the
 * session and shows one text at a time again.
 */
function runMark() {
  var r = document.documentElement;
  runBuild();
  [].forEach.call(document.querySelectorAll(".ash"), function (/** @type {HTMLElement} */ x) {
    runOne(x);
  });
  if (run) r.setAttribute("data-run", "1");
  else r.removeAttribute("data-run");
}

/**
 * A piece in the session being read is marked .inrun (also one built later: js/core/page.js)
 * @param {HTMLElement} x
 */
function runOne(x) {
  var id = bySec[x.id],
    i = run && id ? run.ids.indexOf(id) : -1;
  x.classList.toggle("inrun", i >= 0);
  // its place in the session (the page keeps the Library's order)
  x.style.order = i >= 0 ? String(i + 1) : "";
}

/** Read the session shown from this text on */
/** @param {string} id */
function startAt(id) {
  var c = current();
  run = { ids: idsFor(c.day, c.session), day: c.day, session: c.session, at: Date.now() };
  try {
    sessionStorage.setItem(RUN_KEY, JSON.stringify(run));
  } catch (e) {}
  runMark();
  openText(id);
}

// every text of the session is on the page, open, so the scroll runs on from one to the next (also after a reload in
// the middle of a session)
function runBuild() {
  if (!run) return;
  run.ids.forEach(function (x) {
    var el = info[x] && pieceEl(info[x].sec);
    if (el) unfold(el);
  });
}

/** The routine changed (the builder, another person, a restore) while a session is read: it follows the new list */
function runRefresh() {
  if (!run) return;
  var ids = idsFor(run.day, run.session);
  if (ids.join() === run.ids.join()) return;
  if (!ids.length) return runEnd();
  run.ids = ids;
  try {
    sessionStorage.setItem(RUN_KEY, JSON.stringify(run));
  } catch (e) {}
  runMark();
  document.dispatchEvent(new Event("nitya-session"));
}

/** Leave the session: the page shows one text at a time again */
function runEnd() {
  run = null;
  try {
    sessionStorage.removeItem(RUN_KEY);
  } catch (x) {}
  runMark();
}

/**
 * A session from an earlier day, started longer ago than RUN_KEEP: left behind when the page is opened again
 * @param {Run} r
 */
function stale(r) {
  return r.day !== dateKey(new Date()) && !(typeof r.at === "number" && Date.now() - r.at < RUN_KEEP);
}

/** The session being read (its Library ids, in order), or null: the bottom bar's Print (js/features/print.js) */
export function runIds() {
  return run ? run.ids.slice() : null;
}

/** The weekday of the session being read (the day it was started on Home), or undefined: Print's heading */
export function runDay() {
  return run ? fromKey(run.day).getDay() : undefined;
}

// After the last text of a session (or ‹ Prev on its first): back home, with the session's heading focused
/** @param {boolean} [done]  after the last text: say the session is over */
function endSession(done) {
  var h = document.getElementById("tsh");
  runEnd();
  jumpTo(function () {
    scrollTo(0, 0);
  }, location.pathname);
  if (h)
    try {
      h.focus({ preventScroll: true });
    } catch (e) {}
  if (done) note(menuWords("today").ended);
}

/**
 * ‹ Prev (-1) or Next › (1) from the piece on screen, while reading a session: where it goes and the title for its
 * label, or null to keep the library order (js/features/bottom-bar.js). Inside a session they never leave it: ‹ Prev on
 * the first text and Next › after the last go back to Home.
 * @param {string} sec  the piece's id on the page (a3)
 * @param {1 | -1} dir
 * @returns {{ label: string, go: () => void } | null}
 */
export function sessionStep(sec, dir) {
  var id = bySec[sec];
  if (!run || !id) return null;
  if (run.ids.indexOf(id) < 0) return null;
  var st = stepInSession(run.ids, id, dir);
  // (‹ Prev on the first text: Home, not the Library's text before it)
  if (!st || "end" in st)
    return {
      label: words().end,
      go: function () {
        endSession(!!st);
        render();
      },
    };
  var to = st.to;
  return {
    label: titleOf(to),
    go: function () {
      openText(to);
      render();
    },
  };
}

// A new day while the page is open: back to today and the session for the time now; coming back to the page
// (shown again) on a later day also leaves a session read the day before
/** @param {boolean} [back]  the page was shown again */
function check(back) {
  var now = new Date();
  if (back && run && stale(run)) runEnd();
  if (dateKey(now) !== shownToday) {
    pick = { session: null, day: "" };
    render();
  } else if (back && pick.day && hiddenAt && now.getTime() - hiddenAt > AWAY) {
    pick.day = "";
    render();
  } else if (!pick.session) render();
  clearTimeout(timer);
  timer = setTimeout(check, nextChange(now).getTime() - now.getTime() + 1000);
}

/** The session Home shows (the routine builder opens at it from Settings) @returns {Session} */
export function shownSession() {
  return current().session;
}

/**
 * The day Home shows: its weekday (as Date.getDay() counts them), and whether it is today (the routine builder opens
 * at it; Print heads a session with it)
 * @returns {{ key: string, day: number, today: boolean }}
 */
export function shownDay() {
  var c = current();
  return { key: c.day, day: fromKey(c.day).getDay(), today: c.day === c.today };
}

/**
 * The sessions of the day Home shows and their texts (Library ids, in routine order), named in the menu language, with
 * that day's weekday and whether it is today: Print's Today tab and the bottom bar's Print on Home (js/features/print.js)
 * @returns {{ session: Session, name: string, ids: string[], day: number, today: boolean }[]}
 */
export function shownSessions() {
  var c = shownDay(),
    names = menuWords("today").sessions;
  return /** @type {Session[]} */ (["morning", "afternoon", "evening"]).map(function (s) {
    return { session: s, name: names[s], ids: idsFor(c.key, s), day: c.day, today: c.today };
  });
}

/** Re-draw when the menu language or the script changes (called by apply(), js/features/bars.js) */
export function todayLang() {
  var ui = P.ui === "mr" ? "mr" : "en";
  if (ui + scrKey() !== langKey && document.getElementById("tdy")) render();
}

/** Another person is reading (js/features/profiles.js): their routine, and their menu language */
export function profileChanged() {
  runRefresh();
  if (document.getElementById("tdy")) render();
}

export function init() {
  // another tab changed the routine (js/store/store.js)
  onReread(profileChanged);
  buildInfo();
  onPiece(runOne);
  try {
    var r = JSON.parse(sessionStorage.getItem(RUN_KEY) || "null");
    if (r && Array.isArray(r.ids)) run = r;
  } catch (e) {}
  // a session read on an earlier day is not taken up again
  if (run && stale(run)) runEnd();
  runMark();
  var tabs = /** @type {HTMLElement} */ (document.getElementById("tss")),
    list = /** @type {HTMLElement} */ (document.getElementById("tsl"));
  if (!tabs || !list) return;
  // Morning | Afternoon | Evening: a tap (or Enter / Space) shows that session's texts for the day shown in place; it stays
  // picked until the next day (then the clock again). Picking the session of the clock follows the clock again.
  /** @param {Session} s */
  function choose(s) {
    // picking a session is being on Home: only that session's texts, no pieces below (Home on its own); on wide
    // screens Home's column is beside the text being read, so the text stays open and only the list changes
    if (!document.documentElement.hasAttribute("data-rail")) homeAlone();
    pick.session = s === sessionAt(new Date()) ? null : s;
    render();
    announce();
    var b = document.getElementById("tss-" + s);
    if (b && document.activeElement !== b)
      try {
        b.focus({ preventScroll: true });
      } catch (x) {}
  }
  // ‹ › under the date: the day before or after (no further than SPAN days from today); Today › back to today, with
  // focus on the session's heading, as the bar goes
  /** @param {number} n days from the day shown, or 0 for today */
  function toDay(n) {
    if (!document.documentElement.hasAttribute("data-rail")) homeAlone();
    var c = current(),
      k = n ? addDays(c.day, n) : c.today;
    if (Math.abs(daysBetween(c.today, k)) > SPAN) return;
    pick.day = k === c.today ? "" : k;
    render();
    announce();
  }
  [
    ["tdp", -1],
    ["tdx", 1],
  ].forEach(function (x) {
    var b = document.getElementById(/** @type {string} */ (x[0]));
    if (b)
      b.addEventListener("click", function () {
        toDay(/** @type {number} */ (x[1]));
      });
  });
  var tb = document.getElementById("tdbb");
  if (tb)
    tb.addEventListener("click", function () {
      toDay(0);
      var h = document.getElementById("tsh");
      if (h)
        try {
          h.focus({ preventScroll: true });
        } catch (x) {}
    });
  tabs.addEventListener("click", function (e) {
    var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[role="tab"]'));
    if (b) choose(/** @type {Session} */ (b.dataset.s));
  });
  // arrow keys, Home and End move between the three (focus only: Enter or Space picks, as a button does)
  tabs.addEventListener("keydown", function (e) {
    var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[role="tab"]'));
    if (!b || !/^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) return;
    e.preventDefault();
    var all = /** @type {HTMLElement[]} */ ([].slice.call(tabs.querySelectorAll('[role="tab"]'))),
      i = all.indexOf(b),
      j = e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : (i + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length;
    all.forEach(function (x, k) {
      x.tabIndex = k === j ? 0 : -1;
    });
    all[j].focus();
  });
  // leaving the switch: Tab comes back to the session shown
  tabs.addEventListener("focusout", function (e) {
    var t = /** @type {Node | null} */ (e.relatedTarget);
    if (t && tabs.contains(t)) return;
    [].forEach.call(tabs.querySelectorAll('[role="tab"]'), function (/** @type {HTMLElement} */ x) {
      x.tabIndex = x.getAttribute("aria-selected") === "true" ? 0 : -1;
    });
  });
  // Edit (beside the heading) and Add texts (an empty session): the routine builder, at this session
  [document.getElementById("tsed"), document.getElementById("tsea")].forEach(function (b) {
    if (!b) return;
    b.addEventListener("click", function () {
      document.dispatchEvent(
        new CustomEvent("nitya-routine-edit", { detail: { session: current().session, day: shownDay().day, add: b.id === "tsea", from: b } }),
      );
    });
  });
  // the routine changed (the builder) or another person's was restored: draw the list again
  document.addEventListener("nitya-routine", function () {
    runRefresh();
    render();
  });
  // a title opens its text, reading the session from there
  list.addEventListener("click", function (e) {
    var a = /** @type {HTMLElement} */ (e.target).closest("a.tgo");
    if (!a) return;
    e.preventDefault();
    startAt(/** @type {string} */ (/** @type {HTMLElement} */ (a).dataset.t));
  });
  // going to a text another way (the Library, the hidden Previous / Next links) leaves the session:
  // Prev and Next follow the library order again
  document.addEventListener(
    "click",
    function (e) {
      var a = /** @type {HTMLElement} */ (e.target).closest && /** @type {HTMLElement} */ (e.target).closest("a[data-go]");
      if (!a || !run) return;
      runEnd();
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
    if (document.hidden) hiddenAt = Date.now();
    else check(true);
  });
  addEventListener("pageshow", function (e) {
    if (e.persisted) check(true);
  });
  // Home (the top bar's name, Home in the bottom bar, Home at the end of a text) leaves the session being read
  document.addEventListener("nitya-home", function () {
    if (run) runEnd();
  });
}

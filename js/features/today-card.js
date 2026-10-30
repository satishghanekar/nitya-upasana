// @ts-check
// Home: what to chant now.
// The time-of-day picture with the weekday's star (js/features/day-picture.js) beside the date in the reading
// languages, under the day bar, as the calendar's Day view has it (#tdn: ‹ the day ›, and Today on another day; the
// day's word, Today, Tomorrow, "In 3 days", after the date). Every part keeps its place on every day, so nothing moves
// as ‹ › go through the days (Satish, 2026-10-30). Home opens on today; on another day all of Home follows it (the
// Vedic calendar line with the day's festival, Pradosh or Sankashti, and Coming up: homeDay() in
// js/features/vedic-calendar.js; the picture's star; the sessions' texts), and a title reads that day's session. A new
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
import { dv, esc, lead, mrLang, nameLang, scr, scrKey, second, ui as menuLang } from "../core/words.js";
import { iaTitle } from "../text/iast.js";
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

/** A text's title in the menu language, for the bottom bar's spoken labels: the original (in its letters) in
 * Marathi, Kannada, Telugu and Gujarati menus, English in English ones @param {string} id */
function titleOf(id) {
  var t = info[id];
  return !t ? "" : nameLang() === "mr" ? scr(t.title) : t.titleEn;
}

/** A text's title in a reading language: the original in its letters, or English plain or scholarly (IAST)
 * @param {TextInfo} t @param {"mr" | "en"} l */
function titleIn(t, l) {
  return l === "mr" ? scr(t.title) : P.tr === "iast" ? iaTitle(t.title) : t.titleEn;
}

/** The reading languages the card is in: the main one, and the second when there is one. Show (the main, the second
 * or both) is for the texts; the card, like the Vedic calendar's day card, keeps both */
function langs() {
  return /** @type {("mr" | "en")[]} */ ([lead(), second()].filter(Boolean));
}

/** What the card is drawn for: the menu language, the reading languages, the letters and the English style */
function drawnFor() {
  return [menuLang(), langs().join("+"), scrKey(), P.tr].join("|");
}

// Draw the date, the session switch and the session's texts
export function render() {
  var c = current(),
    w = words(),
    ui = menuLang(),
    ls = langs(),
    // the lang of a reading language as shown: the original's letters, or English
    code = function (/** @type {"mr" | "en"} */ l) {
      return l === "en" ? "en" : mrLang();
    },
    d = fromKey(c.day),
    ids = idsFor(c.day, c.session),
    box = document.getElementById("tdy"),
    sc = document.getElementById("tsc");
  if (!box || !sc) return;
  shownToday = c.today;
  langKey = drawnFor();
  sc.lang = ui;
  // The date and the titles in the reading languages (Settings → Reading): the main one large, the second under it;
  // with no second language, the main one alone. Each in its own words: Kannada letters bring Kannada's days and
  // months, not Marathi's written in them (Satish, 2026-10-30)
  var dd = /** @type {HTMLElement} */ (document.getElementById("tdd")),
    d1 = /** @type {HTMLElement} */ (dd.querySelector(".d1")),
    d2 = /** @type {HTMLElement} */ (dd.querySelector(".d2")),
    d2t = /** @type {HTMLElement} */ (dd.querySelector(".d2t")),
    rel = /** @type {HTMLElement} */ (document.getElementById("tdr")),
    dateIn = function (/** @type {"mr" | "en"} */ l) {
      return menuWords("dates", code(l)).dayYear(d.getDay(), d.getDate(), d.getMonth(), d.getFullYear());
    };
  d1.lang = code(ls[0]);
  d1.textContent = dateIn(ls[0]);
  // the second line: the date in the second language, then the day's word in the menu language ("· Tomorrow"); with
  // no second language, the word alone, so the card keeps its lines
  d2.lang = ui;
  d2t.lang = ls[1] ? code(ls[1]) : ui;
  d2t.textContent = ls[1] ? dateIn(ls[1]) : ""; // (the dot before the word, .dsep, shows only after a date)
  rel.textContent = dayWord(c.today, c.day);
  // The day bar: ‹ the day › and Today on another day (its room kept on today)
  var other = c.day !== c.today,
    off = daysBetween(c.today, c.day),
    tp = /** @type {HTMLButtonElement} */ (document.getElementById("tdp")),
    tx = /** @type {HTMLButtonElement} */ (document.getElementById("tdx")),
    tt = /** @type {HTMLElement} */ (document.getElementById("tdt"));
  /** @type {HTMLElement} */ (document.getElementById("tdn")).lang = ui;
  /** @type {HTMLElement} */ (document.getElementById("tdl")).textContent = menuWords("calendar").dayLabel(d.getDay(), d.getDate(), d.getMonth());
  tp.setAttribute("aria-label", w.prev);
  tx.setAttribute("aria-label", w.next);
  tp.disabled = off <= -SPAN;
  tx.disabled = off >= SPAN;
  tt.textContent = w.today;
  tt.classList.toggle("off", !other);
  document.documentElement.toggleAttribute("data-day", other);
  homeDay(other ? c.day : "");
  // the session's heading in the reading languages, and how many texts it has
  var head = /** @type {HTMLElement} */ (document.getElementById("tsh"));
  head.innerHTML = ls
    .map(function (l) {
      return '<span lang="' + code(l) + '">' + esc(menuWords("today", code(l)).sessions[c.session]) + "</span>";
    })
    .join(' <span class="tsdot" aria-hidden="true">·</span> ');
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
        (ls[0] === "en" ? i + 1 : scr(dv(i + 1))) +
        ".</span>" +
        '<span class="tt">' +
        ls
          .map(function (l, k) {
            return '<span class="t' + (k + 1) + '" lang="' + (l === "en" ? "en" : scrKey() || t.language) + '">' + esc(titleIn(t, l)) + "</span>";
          })
          .join("") +
        "</span>" +
        '<span class="ttg">' +
        esc(nameLang() === "mr" ? scr(langName(t.language, "mr")) : langName(t.language, "en")) +
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

/** Re-draw when the menu language, the reading languages, the script or the English style change (called by
 * apply(), js/features/bars.js) */
export function todayLang() {
  if (drawnFor() !== langKey && document.getElementById("tdy")) render();
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
  // Today, on another day: back to today, the focus on › (Today itself is out of sight on today)
  var tb = document.getElementById("tdt");
  if (tb)
    tb.addEventListener("click", function () {
      toDay(0);
      var x = document.getElementById("tdx");
      if (x)
        try {
          x.focus({ preventScroll: true });
        } catch (e) {}
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

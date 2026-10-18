// @ts-check
// The Today card (docs/architecture.md §5.4, mockup A): today's date, the week row (Monday to Sunday; another day
// shows that day's routine), the Morning / Afternoon / Evening switch (starting on the session for the time now),
// and the session's texts, each with a tick and its title, with Start / Continue. The picture above follows the
// day and session shown (js/features/day-picture.js); the next Sankathara Chaturthi line under the switch is the
// date card (js/features/date-card.js), with its More dates.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// What it reads: the routine (content/routines.json) and the titles (content/library.json), both loaded by
// js/text/load.js; which texts a session has and the walk through it: js/core/routine.js; the ticks, kept on this
// device for today only, per person (in their profile, js/store/store.js): js/core/ticks.js. Titles are always the
// library's, never typed here. Switching person re-draws the card with their ticks (profileChanged()).
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
import { dateKey, firstUndone, stepInSession, textsFor, weekOf } from "../core/routine.js";
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
    short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    sessions: { morning: "Morning", afternoon: "Afternoon", evening: "Evening" },
    day: "Day",
    session: "Session",
    today: "today",
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
    empty: "Nothing is planned for this session. Any text can be opened from the contents at any time.",
    end: "Today",
    ended: "End of the session",
  },
  mr: {
    days: ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
    short: ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"],
    months: ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"],
    sessions: { morning: "सकाळ", afternoon: "दुपार", evening: "सायंकाळ" },
    day: "वार",
    session: "वेळ",
    today: "आज",
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
    empty: "या वेळेसाठी काही ठरलेले नाही. कोणतीही रचना अनुक्रमणिकेतून केव्हाही उघडता येईल.",
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
// What the card shows: the day (YYYY-MM-DD) and session picked, or null to follow the clock
/** @type {{ day: string | null, session: Session | null }} */
var pick = { day: null, session: null };
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

/** The day and session the card shows */
function current() {
  var now = new Date(),
    today = dateKey(now);
  return { today: today, day: pick.day || today, session: pick.session || sessionAt(now) };
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

// Draw the date, the week row, the session switch and the session card for what is picked
export function render() {
  var c = current(),
    w = words(),
    ui = /** @type {"mr" | "en"} */ (P.ui === "mr" ? "mr" : "en"),
    d = fromKey(c.day),
    isToday = c.day === c.today,
    ids = idsFor(c.day, c.session),
    done = isToday ? ticks.done(c.today, c.session) : [],
    nDone = ids.filter(function (id) {
      return done.indexOf(id) >= 0;
    }).length,
    box = document.getElementById("tdy"),
    sc = document.getElementById("tsc");
  if (!box || !sc) return;
  shownToday = c.today;
  langKey = ui + scrKey();
  box.lang = ui;
  sc.lang = ui;
  // the date shown
  /** @type {HTMLElement} */ (document.getElementById("tdd")).textContent =
    w.days[d.getDay()] + ", " + (ui === "mr" ? dv(d.getDate()) : d.getDate()) + " " + w.months[d.getMonth()] + " " + (ui === "mr" ? dv(d.getFullYear()) : d.getFullYear());
  // the week row: Monday to Sunday of this week
  var wk = /** @type {HTMLElement} */ (document.getElementById("twk"));
  wk.setAttribute("aria-label", w.day);
  wk.innerHTML = weekOf(fromKey(c.today))
    .map(function (x) {
      var k = dateKey(x),
        on = k === c.day,
        now = k === c.today;
      return (
        '<button type="button" role="radio" class="twd' + (now ? " now" : "") + '" data-d="' + k + '" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '">' +
        "<span>" + w.short[x.getDay()] + "</span> <b>" + (ui === "mr" ? dv(x.getDate()) : x.getDate()) + "</b>" +
        (now ? '<span class="sr">, ' + w.today + "</span>" : "") +
        "</button>"
      );
    })
    .join("");
  // the session switch
  var ss = /** @type {HTMLElement} */ (document.getElementById("tss"));
  ss.setAttribute("aria-label", w.session);
  [].forEach.call(ss.querySelectorAll("[role=radio]"), function (/** @type {HTMLElement} */ b) {
    var s = /** @type {Session} */ (b.dataset.s),
      on = s === c.session;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
    /** @type {HTMLElement} */ (b.querySelector(".tsw")).textContent = w.sessions[s];
  });
  // the session card
  var head = /** @type {HTMLElement} */ (document.getElementById("tsh"));
  head.innerHTML = '<span lang="mr">' + scr(MR_SESSION[c.session]) + '</span><span class="tsdot" aria-hidden="true"> · </span><span lang="en">' + EN_SESSION[c.session] + "</span>";
  /** @type {HTMLElement} */ (document.getElementById("tsn")).textContent = !ids.length ? w.none : isToday ? w.count(nDone, ids.length) : w.texts(ids.length);
  var list = /** @type {HTMLElement} */ (document.getElementById("tsl"));
  list.innerHTML = ids
    .map(function (id, i) {
      var t = info[id],
        on = done.indexOf(id) >= 0,
        name = ui === "mr" ? scr(t.title) : t.titleEn;
      return (
        '<li class="' + (on ? "done" : "") + '">' +
        (isToday
          ? '<label class="ttk"><input type="checkbox" data-t="' + id + '"' + (on ? " checked" : "") + ' aria-label="' + esc(w.done + name) + '"><span class="tkc" aria-hidden="true">' + CHECK + "</span></label>"
          : "") +
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
  var start = /** @type {HTMLElement} */ (document.getElementById("tst")),
    k = firstUndone(ids, done);
  start.hidden = !ids.length;
  if (ids.length)
    /** @type {HTMLElement} */ (document.getElementById("tstw")).textContent =
      (k < 0 ? w.again : nDone ? w.cont : w.start) + titleOf(ids[k < 0 ? 0 : k]);
  sc.classList.toggle("preview", !isToday);
  setView(pick.day || pick.session ? { session: c.session, day: d.getDay() } : null);
}

/** Say what the card now shows (after a day or session is picked) */
function announce() {
  var c = current(),
    w = words(),
    d = fromKey(c.day),
    ids = idsFor(c.day, c.session),
    done = c.day === c.today ? ticks.done(c.today, c.session) : [],
    n = ids.filter(function (id) {
      return done.indexOf(id) >= 0;
    }).length;
  /** @type {HTMLElement} */ (document.getElementById("tlive")).textContent =
    w.sessions[c.session] + ", " + w.days[d.getDay()] + ": " + (ids.length ? w.texts(ids.length) + (c.day === c.today ? ", " + w.count(n, ids.length) : "") : w.none);
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

// After the last text of a session: back to the card, with the session's heading in view and focused
function endSession() {
  var sc = document.getElementById("tsc"),
    h = document.getElementById("tsh");
  jumpTo(function () {
    if (sc) sc.scrollIntoView();
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
    pick = { day: null, session: null };
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

/**
 * Arrow keys, Home and End in a radio group: pick the next, previous, first or last, and focus it
 * @param {KeyboardEvent} e
 * @param {HTMLElement} group
 * @param {(b: HTMLElement) => void} choose
 */
function roving(e, group, choose) {
  var bs = /** @type {HTMLElement[]} */ ([].slice.call(group.querySelectorAll("[role=radio]"))),
    i = bs.indexOf(/** @type {HTMLElement} */ (e.target)),
    n = bs.length,
    j = /** @type {Record<string, number>} */ ({ ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 })[e.key];
  if (i < 0 || j === undefined) return;
  e.preventDefault();
  choose(bs[(j + n) % n]);
  var now = /** @type {HTMLElement | null} */ (group.querySelector('[role=radio][aria-checked="true"]'));
  if (now) now.focus();
}

/**
 * The App / Share / QR / Print / Help row: on phones (below 820px) under the session card, as in mockup A, so the
 * session comes first; on wider screens in the card, as before. The row is moved in the page (not just drawn
 * elsewhere), so Tab and screen readers meet it where it is seen.
 */
function placeRow() {
  var row = document.getElementById("shr"),
    top = document.querySelector("#home > .top"),
    sc = document.getElementById("tsc");
  if (!row || !top || !sc || !sc.parentNode) return;
  var wide = typeof matchMedia === "function" && matchMedia("(min-width: 820px)").matches;
  if (wide && row.parentNode !== top) top.appendChild(row);
  else if (!wide && row.previousElementSibling !== sc) sc.parentNode.insertBefore(row, sc.nextSibling);
}

/** Another person is reading (js/features/profiles.js): their ticks, and their menu language */
export function profileChanged() {
  if (!ticks) return;
  ticks.prune(dateKey(new Date()));
  if (document.getElementById("tdy")) render();
}

export function init() {
  placeRow();
  if (typeof matchMedia === "function") {
    var mq = matchMedia("(min-width: 820px)");
    if (mq.addEventListener) mq.addEventListener("change", placeRow);
    else if (mq.addListener) mq.addListener(placeRow);
  }
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
  var wk = /** @type {HTMLElement} */ (document.getElementById("twk")),
    ss = /** @type {HTMLElement} */ (document.getElementById("tss")),
    list = /** @type {HTMLElement} */ (document.getElementById("tsl"));
  if (!wk || !ss || !list) return;
  /** @param {HTMLElement} b */
  function pickDay(b) {
    var k = b.dataset.d || null;
    pick.day = k === dateKey(new Date()) ? null : k;
    render();
    announce();
  }
  /** @param {HTMLElement} b */
  function pickSession(b) {
    // a session picked by hand stays picked; until then the switch follows the clock
    pick.session = /** @type {Session} */ (b.dataset.s);
    render();
    announce();
  }
  wk.addEventListener("click", function (e) {
    var b = /** @type {HTMLElement} */ (e.target).closest("[role=radio]");
    if (b) pickDay(/** @type {HTMLElement} */ (b));
  });
  ss.addEventListener("click", function (e) {
    var b = /** @type {HTMLElement} */ (e.target).closest("[role=radio]");
    if (b) pickSession(/** @type {HTMLElement} */ (b));
  });
  wk.addEventListener("keydown", function (e) {
    roving(e, wk, pickDay);
  });
  ss.addEventListener("keydown", function (e) {
    roving(e, ss, pickSession);
  });
  // a tick
  list.addEventListener("change", function (e) {
    var x = /** @type {HTMLInputElement} */ (e.target),
      id = x.dataset.t,
      c = current();
    if (!id || c.day !== c.today) return;
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
      k = firstUndone(ids, c.day === c.today ? ticks.done(c.today, c.session) : []);
    if (ids.length) startAt(ids[k < 0 ? 0 : k]);
  });
  // going to a text another way (contents, the side menu, the hidden Previous / Next links) leaves the session:
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

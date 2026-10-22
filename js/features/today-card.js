// @ts-check
// Home: what to chant now.
// The time-of-day picture with today's weekday star (js/features/day-picture.js) beside today's date in Marathi and
// English; a Morning | Afternoon | Evening switch (#tss, tabs: arrow keys move between them, Enter or Space picks),
// opened at the session for the time now; a session with nothing set today is greyed ("Nothing set", aria-disabled,
// still focusable, and picking it shows the empty state with Add texts); the picked session's texts, each with a tick
// and its title (a title starts the session there); Print this session (#tspr); and "Another text? Open the Library"
// (#tlibb, as the top bar's book button). App, Share, QR, Print and Help are under More (⋯) in the top bar
// (js/features/more-menu.js). Every text, with search, is in the Library (#jump, js/features/contents-list.js);
// the reading page's pieces are not shown under Home (data-hv, js/features/history.js).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// What it reads: the reading person's routine (their own, made in the routine builder, js/features/routine-builder.js,
// or else content/routines.json) and the titles (content/library.json), both loaded by
// js/text/load.js; which texts a session has and the walk through it: js/core/routine.js; the ticks, kept on this
// device for today only, per person (in their profile, js/store/store.js): js/core/ticks.js. Titles are always the
// library's, never typed here. Switching person re-draws the list with their ticks (profileChanged()).
// Reading a session: a title in the list opens the text in the reading page, and while the
// reader is on a text of that session, ‹ Prev and Next › in the bottom bar follow the session (sessionStep(), read by
// js/features/bottom-bar.js); Next after the last text comes back here.
// Changing the routine: "Edit" beside the session's heading (#tsed), and "Add texts" when a session is empty (#tsea),
// open the routine builder for this session (the event "nitya-routine-edit"); the builder says "nitya-routine" after
// each change, and the list is drawn again (a removed text's tick just no longer shows).

import { P } from "../core/state.js";
import { flash, onPiece, pieceEl } from "../core/page.js";
import { cur, unfold } from "../core/apply.js";
import { homeAlone, jumpTo } from "./history.js";
import { setView } from "./day-picture.js";
import { loaded } from "../text/load.js";
import { nextChange, sessionAt } from "../core/time-of-day.js";
import { dateKey, stepInSession, textsFor } from "../core/routine.js";
import { createTicks } from "../core/ticks.js";
import { active, routine, ticksStorage } from "../store/store.js";
import { DAYS, MONTHS, dv, esc, scr, scrKey } from "../core/words.js";

/**
 * @typedef {import("../core/time-of-day.js").Session} Session
 * @typedef {{ id: string, sec: string, title: string, titleEn: string, language: string }} TextInfo
 * @typedef {{ ids: string[], day: string, session: Session }} Run
 */

// The menu words, in English and Marathi (the menu language, P.ui)
const W = {
  en: {
    days: DAYS.en,
    months: MONTHS.en,
    sessions: { morning: "Morning", afternoon: "Afternoon", evening: "Evening" },
    tabs: "Session",
    unset: "Nothing set",
    another: "Another text?",
    library: "Open the Library",
    done: "Done: ",
    /** @param {number} d @param {number} n */
    count: function (d, n) {
      return d + " of " + n + " done";
    },
    /** @param {number} n */
    texts: function (n) {
      return n + (n === 1 ? " text" : " texts");
    },
    none: "Nothing planned",
    /** @param {string} s */
    empty: function (s) {
      return "Nothing is planned for " + s.toLowerCase() + " yet. ";
    },
    add: "Add texts",
    edit: "Edit",
    /** @param {string} s */
    editL: function (s) {
      return "Edit routine: " + s;
    },
    end: "Today",
    ended: "End of the session",
  },
  mr: {
    days: DAYS.mr,
    months: MONTHS.mr,
    sessions: { morning: "सकाळ", afternoon: "दुपार", evening: "सायंकाळ" },
    tabs: "वेळ",
    unset: "काहीच नाही",
    another: "दुसरी रचना?",
    library: "संग्रह उघडा",
    done: "झाले: ",
    /** @param {number} d @param {number} n */
    count: function (d, n) {
      return dv(n) + " पैकी " + dv(d) + " झाले";
    },
    /** @param {number} n */
    texts: function (n) {
      return dv(n) + " रचना";
    },
    none: "काही ठरलेले नाही",
    /** @param {string} s */
    empty: function (s) {
      return s + "साठी अजून काही ठरवलेले नाही. ";
    },
    add: "रचना जोडा",
    edit: "बदला",
    /** @param {string} s */
    editL: function (s) {
      return "बदला: " + s + "चा दिनक्रम";
    },
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
// The session shown when one is picked by hand (the Morning | Afternoon | Evening switch), or null to follow the
// clock; a new day starts again from the clock
/** @type {{ session: Session | null }} */
var pick = { session: null };
// The session being read (started from a title in the list), so Prev and Next follow it
/** @type {Run | null} */
var run = null;
var shownToday = "",
  langKey = "";
/** @type {ReturnType<typeof setTimeout> | undefined} */
var timer;

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

// Draw the date, the session switch, the session's texts with their ticks, Print this session and the Library line
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
  var ed = document.getElementById("tsed");
  if (ed) {
    ed.textContent = w.edit;
    ed.setAttribute("aria-label", w.editL(w.sessions[c.session]));
  }
  var list = /** @type {HTMLElement} */ (document.getElementById("tsl"));
  list.innerHTML = ids
    .map(function (id, i) {
      var t = info[id],
        on = done.indexOf(id) >= 0,
        name = ui === "mr" ? scr(t.title) : t.titleEn;
      return (
        '<li class="' + (on ? "done" : "") + '">' +
        '<label class="ttk"><input type="checkbox" data-t="' + id + '"' + (on ? " checked" : "") + ' aria-label="' + esc(w.done + name) + '"><span class="tkc" aria-hidden="true">' + CHECK + "</span></label>" +
        '<a class="tgo" href="./#' + t.sec + '" data-t="' + id + '">' +
        '<span class="tno" aria-hidden="true">' + scr(dv(i + 1)) + ".</span>" +
        '<span class="tt"><span class="t1" lang="' + (scrKey() || t.language) + '">' + esc(scr(t.title)) + '</span><span class="t2" lang="en">' + esc(t.titleEn) + "</span></span>" +
        '<span class="ttg">' + esc(langName(t.language, ui)) + "</span>" +
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
  // the Library line
  var lb = document.getElementById("tlib");
  if (lb) {
    lb.lang = ui;
    /** @type {HTMLElement} */ (document.getElementById("tlibw")).textContent = w.another;
    /** @type {HTMLElement} */ (document.getElementById("tlibbw")).textContent = w.library;
  }
  setView(pick.session ? { session: c.session, day: d.getDay() } : null);
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
    el = t && pieceEl(t.sec);
  if (!el) return;
  unfold(el);
  jumpTo(function () {
    /** @type {HTMLElement} */ (el).scrollIntoView();
  }, "#" + t.sec);
  document.dispatchEvent(new Event("nitya-session"));
}

/**
 * While a session is being read (started from a text of the list), the reading page shows only that session's texts
 * (data-run on <html>, .inrun on each of its pieces: css/10-today.css), not the whole Library; going to a text another
 * way (the Library, search, the side menu) leaves the session and shows every piece again.
 */
function runMark() {
  var r = document.documentElement;
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
  var id = bySec[x.id];
  x.classList.toggle("inrun", !!run && !!id && run.ids.indexOf(id) >= 0);
}

/** Read the session shown from this text on */
/** @param {string} id */
function startAt(id) {
  var c = current();
  run = { ids: idsFor(c.day, c.session), day: c.day, session: c.session };
  try {
    sessionStorage.setItem(RUN_KEY, JSON.stringify(run));
  } catch (e) {}
  runMark();
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
 * Where a piece sits in the session being read, for the card at the end of the text (js/features/end-card.js): its
 * place (from 0), the session's name in the menu language, and which of its texts are ticked today; null when the
 * piece is not in the session (or no session is read). secs: the session's pieces on the page, in order.
 * @param {string} sec  the piece's id on the page (a3)
 * @returns {{ i: number, n: number, name: string, secs: string[], done: boolean[] } | null}
 */
export function runAt(sec) {
  var id = bySec[sec],
    i = run && id ? run.ids.indexOf(id) : -1;
  if (!run || i < 0) return null;
  var d = ticks && run.day === dateKey(new Date()) ? ticks.done(run.day, run.session) : [];
  return {
    i: i,
    n: run.ids.length,
    name: (P.ui === "mr" ? MR_SESSION : EN_SESSION)[run.session],
    secs: run.ids.map(function (x) {
      return info[x] ? info[x].sec : "";
    }),
    done: run.ids.map(function (x) {
      return d.indexOf(x) >= 0;
    }),
  };
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

/** The session Home shows (the routine builder opens at it from Settings) @returns {Session} */
export function shownSession() {
  return current().session;
}

/**
 * Today's sessions and their texts (Library ids, in routine order), named in the menu language: Print's Today tab and
 * Home's Print this session (js/features/print.js)
 * @returns {{ session: Session, name: string, ids: string[] }[]}
 */
export function todaySessions() {
  var d = dateKey(new Date()),
    names = P.ui === "mr" ? MR_SESSION : EN_SESSION;
  return /** @type {Session[]} */ (["morning", "afternoon", "evening"]).map(function (s) {
    return { session: s, name: names[s], ids: idsFor(d, s) };
  });
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
  onPiece(runOne);
  try {
    var r = JSON.parse(sessionStorage.getItem(RUN_KEY) || "null");
    if (r && Array.isArray(r.ids)) run = r;
  } catch (e) {}
  runMark();
  ticks.prune(dateKey(new Date()));
  var tabs = /** @type {HTMLElement} */ (document.getElementById("tss")),
    list = /** @type {HTMLElement} */ (document.getElementById("tsl"));
  if (!tabs || !list) return;
  // Morning | Afternoon | Evening: a tap (or Enter / Space) shows that session's texts for today in place; it stays
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
  // Another text? Open the Library: as the top bar's book button
  var lbb = document.getElementById("tlibb");
  if (lbb)
    lbb.addEventListener("click", function () {
      var hm = document.getElementById("hm");
      if (hm) hm.click();
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
  // Edit (beside the heading) and Add texts (an empty session): the routine builder, at this session
  [document.getElementById("tsed"), document.getElementById("tsea")].forEach(function (b) {
    if (!b) return;
    b.addEventListener("click", function () {
      document.dispatchEvent(new CustomEvent("nitya-routine-edit", { detail: { session: current().session, add: b.id === "tsea", from: b } }));
    });
  });
  // the routine changed (the builder) or another person's was restored: draw the list again
  document.addEventListener("nitya-routine", function () {
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
      run = null;
      try {
        sessionStorage.removeItem(RUN_KEY);
      } catch (x) {}
      runMark();
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

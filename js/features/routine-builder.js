// @ts-check
// The routine builder (design A, "List per day", chosen by Satish 2026-10-19; mockups/builder-a.html on branch
// mockup-home-v2): the reading person's own texts for each session, in their order. A page like the Library and the
// Vedic calendar (#rtb: under the top bar, Back, the phone's Back, Escape), opened by Edit beside the session on Home,
// Add texts in an empty session (js/features/today-card.js, the event "nitya-routine-edit") and Settings → Routine.
//
// - Morning / Afternoon / Evening (a radio group), then "Same every day" or "Different by weekday"; with weekdays, a
//   row Monday … Sunday (this week's dates) picks the day being edited, and "Copy to other days…" gives its list to
//   the days chosen.
// - The list: ↑ and ↓ move a text (Alt+↑ / Alt+↓ on any of its buttons too), ✕ (or Delete) removes it, and a text can
//   be dragged by its grip (pointer events: touch, mouse and pen). Every change is said aloud ("घालीन लोटांगण moved
//   to 3 of 5") and focus stays with the text moved.
// - Add texts: the picker (js/features/text-picker.js), every text in the library with search and a checkbox each,
//   beside the list on wide screens, a sheet on phones.
// Every change is kept at once in the person's profile (setRoutine(), js/store/store.js; backed up with them) and Home
// is told ("nitya-routine"). Until the first change a person follows content/routines.json (Q5). The rules for the
// lists (pure, unit-tested): js/core/routine.js. Titles follow the reading languages (Settings → Reading → Languages), as the
// Vedic calendar's names do: the first language large, the second under it; the words around them follow the menus.

import { loaded } from "../text/load.js";
import { sessionAt } from "../core/time-of-day.js";
import { DAY_KEYS, WEEK_ORDER, addTexts, byWeekday, copyDays, editable, moveItem, removeText, setList, setMode, textsFor, weekOf } from "../core/routine.js";
import { active, getLibrary, onChange, routine, setRoutine } from "../store/store.js";
import { categoriesOf, categoryOf } from "../core/library.js";
import { setR } from "./overlays.js";
import { ovSub, ovSubDone } from "./history.js";
import { shownSession } from "./today-card.js";
import { createPicker } from "./text-picker.js";
import { dv, esc, lead, nameOf as menuName, num, scr, scrKey, second, ui } from "../core/words.js";
import { menuWords } from "../core/strings.js";

/**
 * @typedef {import("../core/time-of-day.js").Session} Session
 * @typedef {import("../core/routine.js").Routine} Routine
 * @typedef {import("../core/routine.js").SessionPlan} SessionPlan
 * @typedef {import("./text-picker.js").PickText} PickText
 */

const ICON = {
  morning:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 18h18"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M12 6v3M5.6 10.6l1.8 1.4M18.4 10.6 16.6 12"/></svg>',
  afternoon:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  evening:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1.6 2 2 3.6 0 5.5C10 6.6 10.4 5 12 3z"/><path d="M4 12h16c0 3.3-3.6 6-8 6s-8-2.7-8-6z"/><path d="M9 21h6"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  grip: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
};
/** @type {Session[]} */
const SESSIONS = ["morning", "afternoon", "evening"];

// What is being edited
var view = {
  /** @type {Session} */
  session: "morning",
  day: 0,
  /** @type {Routine} */
  r: {},
};
// "Different by weekday" switched to "Same every day" while the page is open: the weekday lists, so switching back
// brings them back (until the page closes)
/** @type {Partial<Record<Session, SessionPlan>>} */
var weekBefore = {};
/** @type {Record<string, PickText>} */
var info = {};
/** @type {PickText[]} */
var all = [];
/** @type {Record<string, string>} each text's category in content/library.json (before the family's moves) */
var baseCat = {};
/** @type {import("./text-picker.js").Picker} */
var picker;
/** @type {HTMLElement | null} */
var page = null;
/** @type {HTMLElement | null} */
var opener = null;

// ----- small helpers -----

/** @param {string} id */
function el(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}
function words() {
  return menuWords("routine");
}
/** A text's title in a reading language: as written (Kannada letters when chosen), or its English name */
/** @param {PickText} t @param {"mr" | "en"} l */
function titleIn(t, l) {
  return l === "mr" ? scr(t.title) : t.titleEn;
}
/** @param {PickText} t @param {"mr" | "en"} l */
function langIn(t, l) {
  return l === "mr" ? scrKey() || t.language : "en";
}
/** The title as the reader names it: in the first reading language @param {string} id */
function nameOf(id) {
  var t = info[id];
  return t ? titleIn(t, lead()) : id;
}
/**
 * A title in the first reading language, large, and in the second under it (as the Vedic calendar's names)
 * @param {PickText} t
 */
function nameHtml(t) {
  var l = lead(),
    s = second();
  return (
    '<span class="t1" lang="' +
    langIn(t, l) +
    '">' +
    esc(titleIn(t, l)) +
    "</span>" +
    (s ? '<span class="t2" lang="' + langIn(t, s) + '">' + esc(titleIn(t, s)) + "</span>" : "")
  );
}

/** The texts in the library, in its order */
function buildInfo() {
  info = {};
  all = [];
  var lib = loaded.library,
    /** @type {any} */ w = window;
  if (!lib || !w.CONTENT) return;
  /** @type {Record<string, any>} */
  var byId = {};
  lib.texts.forEach(function (x) {
    byId[x.id] = x;
  });
  // in reading order (js/text/content.js)
  w.CONTENT.categories.forEach(function (/** @type {import("../text/content.js").Content["categories"][0]} */ c) {
    c.pieces.forEach(function (p) {
      var id = p.text,
        x = byId[id];
      if (!x || info[id]) return;
      baseCat[id] = /** @type {any} */ (x).category || "";
      info[id] = { id: id, title: x.title, titleEn: x.titleEn, language: x.language, category: baseCat[id] };
      all.push(info[id]);
    });
  });
}

// The picker's category tags: each text's category on this phone (the family's moves and renames, js/core/library.js),
// named in the menu language
function catWords() {
  /** @type {Record<string, string>} */
  var o = {};
  if (!loaded.categories) return o;
  var local = getLibrary(),
    cats = categoriesOf(loaded.categories, local);
  all.forEach(function (t) {
    t.category = categoryOf({ id: t.id, category: baseCat[t.id] || "" }, cats, local);
  });
  cats.forEach(function (c) {
    o[c.id] = menuName(c.name) || c.name.en || scr(c.name.mr);
  });
  return o;
}

// ----- the routine being edited -----

/** The list shown: the session's, or the weekday's */
function list() {
  return textsFor(view.r, view.day, view.session).filter(function (id) {
    return !!info[id];
  });
}
function weekly() {
  return byWeekday(view.r, view.session);
}
/** "Monday morning" or "Morning, every day" */
function what() {
  var w = words();
  return w.what(w.sessions[view.session], weekly() ? view.day : null);
}

/** Keep a change: in the profile at once, and Home draws its list again @param {Routine} r */
function keep(r) {
  view.r = r;
  setRoutine(r);
  document.dispatchEvent(new Event("nitya-routine"));
}

/** Put a changed list in place (keeping texts not in the library, so nothing is lost) @param {string[]} ids */
function putList(ids) {
  var hidden = textsFor(view.r, view.day, view.session).filter(function (id) {
    return !info[id];
  });
  keep(setList(view.r, view.session, view.day, ids.concat(hidden)));
}

/** @param {string} s */
function say(s) {
  var live = document.getElementById("rtlive");
  if (!live) return;
  // the same words twice in a row are still read out
  live.textContent = live.textContent === s ? s + " " : s;
}

// ----- drawing -----

function render() {
  if (!page) return;
  fixPanel(false);
  var w = words(),
    p = active();
  page.lang = ui();
  // the person: badge and "Aai's routine"
  var badge = el("rtba");
  if (p) {
    badge.textContent = p.initials;
    badge.style.background = p.colour;
    badge.lang = /^[\s\x20-\x7eÀ-ɏ]*$/.test(p.initials) ? "en" : "mr";
    badge.classList.toggle("long", p.initials.length > 2);
    el("rtbn").textContent = w.title(p.name);
  }
  // Morning / Afternoon / Evening
  radios(
    el("rtss"),
    w.sessionG,
    SESSIONS.map(function (s) {
      return { v: s, html: ICON[s] + "<span>" + esc(w.sessions[s]) + "</span>", on: s === view.session };
    }),
  );
  // Same every day / Different by weekday
  radios(el("rtmd"), w.modeG, [
    { v: "fixed", html: "<span>" + esc(w.modes.fixed) + "</span>", on: !weekly() },
    { v: "weekday", html: "<span>" + esc(w.modes.weekday) + "</span>", on: weekly() },
  ]);
  // Monday … Sunday, with this week's dates
  var wk = el("rtwk"),
    week = weekOf(new Date()),
    today = new Date().getDay();
  wk.hidden = !weekly();
  radios(
    wk,
    w.dayG,
    WEEK_ORDER.map(function (d, i) {
      return {
        v: String(d),
        html: '<span class="rtwd">' + esc(w.short[d]) + "</span><b>" + num(week[i].getDate()) + "</b>",
        label: w.days[d] + " " + num(week[i].getDate()),
        on: d === view.day,
        cls: d === today ? "today" : "",
      };
    }),
  );
  drawList();
  // Copy to other days…
  var cb = el("rtcpb");
  cb.hidden = !weekly();
  cb.textContent = w.copy;
  if (!weekly()) copyPanel(false);
  el("rtaddw").textContent = w.add;
  el("rthk").textContent = w.hint;
  picker.render();
}

/**
 * A radio group of buttons: one Tab stop, arrows move and choose (as radio buttons do)
 * @param {HTMLElement} g
 * @param {string} label
 * @param {{ v: string, html: string, on: boolean, label?: string, cls?: string }[]} items
 */
function radios(g, label, items) {
  g.setAttribute("aria-label", label);
  g.innerHTML = items
    .map(function (x) {
      return (
        '<button type="button" role="radio" data-v="' +
        x.v +
        '" aria-checked="' +
        x.on +
        '" tabindex="' +
        (x.on ? 0 : -1) +
        '"' +
        (x.label ? ' aria-label="' + esc(x.label) + '"' : "") +
        (x.cls ? ' class="' + x.cls + '"' : "") +
        ">" +
        x.html +
        "</button>"
      );
    })
    .join("");
}

/** The list, the line above it and the empty note */
function drawList() {
  var w = words(),
    ids = list(),
    ol = el("rtl"),
    n = ids.length;
  el("rtsum").textContent = what() + " · " + w.texts(n);
  ol.innerHTML = ids
    .map(function (id, i) {
      var t = info[id],
        nm = esc(nameOf(id));
      return (
        '<li data-id="' +
        esc(id) +
        '">' +
        '<span class="rtg" aria-hidden="true">' +
        ICON.grip +
        "</span>" +
        '<span class="tno" aria-hidden="true">' +
        (lead() === "mr" ? scr(dv(i + 1)) : i + 1) +
        ".</span>" +
        '<span class="tt">' +
        nameHtml(t) +
        "</span>" +
        '<span class="rtbs">' +
        '<button type="button" class="mv" data-a="up" aria-label="' +
        w.up(nm) +
        '"' +
        (i === 0 ? ' aria-disabled="true"' : "") +
        ">" +
        ICON.up +
        "</button>" +
        '<button type="button" class="mv" data-a="down" aria-label="' +
        w.down(nm) +
        '"' +
        (i === n - 1 ? ' aria-disabled="true"' : "") +
        ">" +
        ICON.down +
        "</button>" +
        '<button type="button" class="mv rm" data-a="rm" aria-label="' +
        w.remove(nm) +
        '">' +
        ICON.x +
        "</button>" +
        "</span></li>"
      );
    })
    .join("");
  var e = el("rte");
  e.hidden = n > 0;
  e.textContent = w.empty(what());
  picker.sync();
}

// ----- Copy to other days… -----

/** @param {boolean} o */
function copyPanel(o) {
  var f = el("rtcpf"),
    b = el("rtcpb"),
    w = words();
  f.hidden = !o;
  b.setAttribute("aria-expanded", String(o));
  if (!o) return;
  fixPanel(false);
  el("rtcpl").textContent = w.copyTo(w.what(w.sessions[view.session], view.day));
  el("rtcpd").innerHTML = WEEK_ORDER.filter(function (d) {
    return d !== view.day;
  })
    .map(function (d) {
      return '<label class="rtck"><input type="checkbox" value="' + d + '"><span>' + esc(w.days[d]) + "</span></label>";
    })
    .join("");
  el("rtcpo").textContent = w.copyGo;
  el("rtcpx").textContent = w.cancel;
  var first = /** @type {HTMLElement | null} */ (el("rtcpd").querySelector("input"));
  if (first) first.focus();
}

function copyNow() {
  var w = words(),
    /** @type {number[]} */
    to = [];
  [].forEach.call(el("rtcpd").querySelectorAll("input:checked"), function (/** @type {HTMLInputElement} */ x) {
    to.push(+x.value);
  });
  if (to.length) keep(copyDays(view.r, view.session, view.day, to));
  copyPanel(false);
  el("rtcpb").focus();
  say(
    w.copied(
      to.map(function (d) {
        return w.days[d];
      }),
    ),
  );
}

// ----- changing the list -----

/**
 * Move a text, keep focus on the same button of its row (or the other arrow at an end), and say where it went
 * @param {string} id
 * @param {number} to  its new place, from 0
 * @param {string} [focusA]  which of its buttons gets focus
 */
function moveTo(id, to, focusA) {
  var ids = list(),
    from = ids.indexOf(id);
  if (from < 0) return;
  var next = moveItem(ids, from, to),
    at = next.indexOf(id);
  if (at === from) return;
  putList(next);
  drawList();
  if (focusA) {
    var a = focusA === "up" && at === 0 ? "down" : focusA === "down" && at === next.length - 1 ? "up" : focusA;
    focusRow(id, a);
  }
  say(words().moved(nameOf(id), at + 1, next.length));
}

/** @param {string} id @param {string} a */
function focusRow(id, a) {
  var b = /** @type {HTMLElement | null} */ (el("rtl").querySelector('li[data-id="' + id + '"] button[data-a="' + a + '"]'));
  if (b) b.focus();
}

/** Remove a text; focus goes to the next text's ✕ (or the one before, or Add texts) @param {string} id */
function removeId(id) {
  var ids = list(),
    i = ids.indexOf(id);
  if (i < 0) return;
  var next = removeText(ids, id);
  putList(next);
  drawList();
  var to = next[i] || next[i - 1];
  if (to) focusRow(to, "rm");
  else focusAdd();
  say(words().removed(nameOf(id)));
}

function focusAdd() {
  var b = el("rtadd");
  if (b.getClientRects().length) b.focus();
  else {
    var q = /** @type {HTMLElement | null} */ (document.querySelector("#tpk .tpkq"));
    if (q) q.focus();
  }
}

/** The picker ticked or unticked a text @param {string} id @param {boolean} on */
function toggle(id, on) {
  var ids = list();
  if (on) {
    var next = addTexts(ids, [id]);
    putList(next);
    drawList();
    say(words().added(nameOf(id), next.length));
  } else {
    putList(removeText(ids, id));
    drawList();
    say(words().removed(nameOf(id)));
  }
}

/** Whether every weekday has the same list in the session shown */
function daysAlike() {
  var a = JSON.stringify(textsFor(view.r, 0, view.session));
  return DAY_KEYS.every(function (_, d) {
    return JSON.stringify(textsFor(view.r, d, view.session)) === a;
  });
}
/** Same every day, asked first while the weekdays' lists differ (they would go) @param {boolean} o */
function fixPanel(o) {
  var w = words();
  el("rtfx").hidden = !o;
  if (!o) return;
  el("rtfxt").textContent = w.fixAsk(w.days[view.day]);
  el("rtfxo").textContent = w.fixGo;
  el("rtfxx").textContent = w.cancel;
  el("rtfxo").focus();
}

/** @param {"fixed" | "weekday"} m @param {boolean} [sure]  asked already (or nothing to lose) */
function setModeTo(m, sure) {
  if (m === (weekly() ? "weekday" : "fixed")) return;
  var w = words(),
    s = view.session;
  if (m === "fixed" && !sure && !daysAlike()) {
    copyPanel(false);
    fixPanel(true);
    return;
  }
  if (m === "fixed") {
    weekBefore[s] = /** @type {SessionPlan} */ (JSON.parse(JSON.stringify(view.r[s])));
    keep(setMode(view.r, s, "fixed", view.day));
    say(w.toFixed(w.days[view.day]));
  } else {
    var back = weekBefore[s],
      r = setMode(view.r, s, "weekday", view.day);
    // the lists from before, if this list was not changed meanwhile
    if (back && back.mode === "weekday" && JSON.stringify(textsFor(view.r, view.day, s)) === JSON.stringify(back.days[DAY_KEYS[view.day]] || [])) r[s] = back;
    delete weekBefore[s];
    keep(r);
    say(w.toWeek);
  }
  render();
  focusRadio("rtmd");
}

/** @param {string} g */
function focusRadio(g) {
  var b = /** @type {HTMLElement | null} */ (el(g).querySelector('[aria-checked="true"]'));
  if (b) b.focus();
}

// ----- dragging by the grip (pointer events: touch, mouse and pen; the buttons do the same without dragging) -----

function dragInit() {
  var ol = el("rtl"),
    /** @type {HTMLElement | null} */
    row = null,
    id = "",
    start = 0;
  ol.addEventListener("pointerdown", function (e) {
    var g = /** @type {HTMLElement} */ (e.target).closest(".rtg");
    if (!g || (e.pointerType === "mouse" && e.button !== 0)) return;
    row = /** @type {HTMLElement} */ (g.closest("li"));
    id = row.dataset.id || "";
    start = [].slice.call(ol.children).indexOf(/** @type {never} */ (row));
    row.classList.add("lift");
    try {
      g.setPointerCapture(e.pointerId);
    } catch (x) {}
    e.preventDefault();
  });
  ol.addEventListener("pointermove", function (e) {
    if (!row) return;
    var y = e.clientY,
      rows = /** @type {HTMLElement[]} */ ([].slice.call(ol.children)),
      i = rows.indexOf(row);
    // past the middle of the row above or below: swap places with it
    var prev = rows[i - 1],
      next = rows[i + 1];
    if (prev && y < prev.getBoundingClientRect().top + prev.offsetHeight / 2) ol.insertBefore(row, prev);
    else if (next && y > next.getBoundingClientRect().top + next.offsetHeight / 2) ol.insertBefore(next, row);
  });
  function end() {
    if (!row) return;
    var r = row,
      at = [].slice.call(ol.children).indexOf(/** @type {never} */ (r));
    r.classList.remove("lift");
    row = null;
    if (at !== start) moveTo(id, at);
  }
  ol.addEventListener("pointerup", end);
  ol.addEventListener("pointercancel", end);
}

// ----- opening and closing -----

/**
 * Open the builder for the person reading
 * @param {{ session?: Session, day?: number, from?: Element | null, add?: boolean }} [o]
 */
export function openBuilder(o) {
  if (!page) return;
  o = o || {};
  buildInfo();
  view.session = o.session || shownSession() || sessionAt(new Date());
  view.day = typeof o.day === "number" ? o.day : new Date().getDay();
  view.r = editable(routine(), loaded.routine);
  weekBefore = {};
  opener = /** @type {HTMLElement | null} */ (o.from || null);
  // focus is where it was opened from, so Back returns it there (js/features/overlays.js)
  if (opener && opener.isConnected && opener.getClientRects().length)
    try {
      opener.focus({ preventScroll: true });
    } catch (e) {}
  copyPanel(false);
  el("rtlive").textContent = "";
  render();
  setR(true);
  var h = el("rtbt");
  h.tabIndex = -1;
  try {
    h.focus({ preventScroll: true });
  } catch (e) {}
  if (o.add) picker.open(el("rtadd"));
}

/** @returns {boolean} */
function isOpen() {
  return !!page && !page.hidden;
}

export function init() {
  page = document.getElementById("rtb");
  if (!page) return;
  buildInfo();
  var pk = el("tpk");
  picker = createPicker(pk, {
    texts: function () {
      return all;
    },
    isOn: function (id) {
      return list().indexOf(id) >= 0;
    },
    toggle: toggle,
    name: nameHtml,
    lang: ui,
    back: { push: ovSub, done: ovSubDone },
    words: function () {
      var w = words();
      return { heading: w.addTo(what()), search: w.search, none: w.none, done: w.done, found: w.found, cats: catWords() };
    },
  });
  // Home: Edit and Add texts (js/features/today-card.js)
  document.addEventListener("nitya-routine-edit", function (e) {
    var d = /** @type {CustomEvent} */ (e).detail || {};
    openBuilder({ session: d.session, day: d.day, from: d.from, add: d.add });
  });
  // Settings → Routine: Settings closes, and Back returns to Home with focus on ⚙
  // (the builder opens first, then Settings closes: its Back step becomes the builder's, as the Vedic calendar does)
  el("sprt").addEventListener("click", function () {
    openBuilder({ from: document.getElementById("aa") });
  });
  el("rbk").addEventListener("click", function () {
    setR(false);
  });
  // closed (Back, the phone's Back, Escape, another page opened): the sheet goes too; focus to Home's heading if the
  // button it came from has gone (Add texts in a session that now has texts)
  page.addEventListener("rtb-closed", function () {
    if (picker.isOpen()) picker.close();
    copyPanel(false);
    var o = opener;
    opener = null;
    setTimeout(function () {
      var a = document.activeElement;
      var lost = !a || a === document.body || !a.getClientRects().length || (!!page && page.contains(a));
      if (lost && !(o && o.isConnected && o.getClientRects().length)) {
        var h = document.getElementById("tsh");
        if (h)
          try {
            h.focus({ preventScroll: true });
          } catch (x) {}
      }
    });
  });
  page.addEventListener("click", function (e) {
    var t = /** @type {HTMLElement} */ (e.target),
      b = /** @type {HTMLElement | null} */ (t.closest("button"));
    if (!b) return;
    var g = b.parentElement && b.parentElement.id;
    if (g === "rtss" && b.dataset.v) {
      view.session = /** @type {Session} */ (b.dataset.v);
      copyPanel(false);
      render();
      focusRadio("rtss");
      say(what() + " · " + words().texts(list().length));
    } else if (g === "rtmd" && b.dataset.v) setModeTo(/** @type {"fixed" | "weekday"} */ (b.dataset.v));
    else if (g === "rtwk" && b.dataset.v) {
      view.day = +b.dataset.v;
      copyPanel(false);
      render();
      focusRadio("rtwk");
      say(what() + " · " + words().texts(list().length));
    } else if (b.id === "rtcpb") copyPanel(el("rtcpf").hidden);
    else if (b.id === "rtcpo") copyNow();
    else if (b.id === "rtfxo") setModeTo("fixed", true);
    else if (b.id === "rtfxx") {
      fixPanel(false);
      focusRadio("rtmd");
    } else if (b.id === "rtcpx") {
      copyPanel(false);
      el("rtcpb").focus();
    } else if (b.id === "rtadd") picker.open(b);
    else if (b.dataset.a) {
      if (b.getAttribute("aria-disabled") === "true") return;
      var li = /** @type {HTMLElement} */ (b.closest("li")),
        id = li.dataset.id || "",
        i = list().indexOf(id);
      if (b.dataset.a === "rm") removeId(id);
      else moveTo(id, i + (b.dataset.a === "up" ? -1 : 1), b.dataset.a);
    }
  });
  page.addEventListener("keydown", function (e) {
    var t = /** @type {HTMLElement} */ (e.target);
    // the radio groups: arrows (and Home / End) move and choose
    var g = t.getAttribute("role") === "radio" ? /** @type {HTMLElement} */ (t.parentElement) : null;
    if (g) {
      var bs = /** @type {HTMLElement[]} */ ([].slice.call(g.querySelectorAll('[role="radio"]'))),
        i = bs.indexOf(t),
        j = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % bs.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + bs.length) % bs.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = bs.length - 1;
      if (j >= 0) {
        e.preventDefault();
        bs[j].click();
      }
      return;
    }
    // a text's buttons: Alt+↑ / Alt+↓ move it, Delete removes it
    var li = /** @type {HTMLElement | null} */ (t.closest("#rtl li"));
    if (!li) return;
    var id = li.dataset.id || "",
      k = list().indexOf(id);
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      moveTo(id, k + (e.key === "ArrowUp" ? -1 : 1), t.dataset.a || "up");
    } else if (e.key === "Delete") {
      e.preventDefault();
      removeId(id);
    }
  });
  // Escape: the open part first (the sheet handles its own), then the page. Not while a dialog is over it.
  document.addEventListener(
    "keydown",
    function (e) {
      if (e.key !== "Escape" || !isOpen() || picker.isOpen()) return;
      if (
        ["pfm", "bkm", "help"].some(function (i) {
          var d = document.getElementById(i);
          return d && !d.hidden;
        })
      )
        return;
      if (!el("rtcpf").hidden) {
        copyPanel(false);
        el("rtcpb").focus();
      } else setR(false);
    },
    true,
  );
  dragInit();
  // another person reading (or a restore): their routine
  onChange(function () {
    if (!isOpen()) return;
    view.r = editable(routine(), loaded.routine);
    weekBefore = {};
    render();
  });
}

// @ts-check
// The Today card's plan: which texts a session has on a given day, the week row, and walking through a session
// in order. Pure functions only (no page), so the unit tests (tests/unit/today.test.mjs) run them in Node;
// js/features/today-card.js puts the answer on the page.
//
// The routine comes from content/routines.json: for each session, either the same
// list every day ({ mode: "fixed", texts }) or one list per weekday ({ mode: "weekday", days: { mon: […], … } }).
// The default is content/routines.json, for a person who has not changed theirs: a starting routine (2026-10-23)
// that each person changes in the routine builder.
// Which session it is now: sessionAt() in js/core/time-of-day.js.

/**
 * @typedef {import("./time-of-day.js").Session} Session
 * @typedef {"sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"} DayKey
 * @typedef {{ mode: "fixed", texts: string[] } | { mode: "weekday", days: Partial<Record<DayKey, string[]>> }} SessionPlan
 * @typedef {Partial<Record<Session, SessionPlan>>} Routine
 * @typedef {{ to: string } | { end: true }} Step
 */

/** @type {Session[]} */
export const SESSIONS = ["morning", "afternoon", "evening"];
/** Date.getDay() order: 0 Sunday … 6 Saturday @type {DayKey[]} */
export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * The texts (ids from content/library.json) of one session on one weekday, each once, in order.
 * A missing or malformed plan is an empty session.
 * @param {Routine | null | undefined} routine
 * @param {number} day  0 Sunday … 6 Saturday
 * @param {Session} session
 * @returns {string[]}
 */
export function textsFor(routine, day, session) {
  var plan = routine && routine[session],
    list = /** @type {unknown} */ (null);
  if (plan && plan.mode === "fixed") list = plan.texts;
  else if (plan && plan.mode === "weekday" && plan.days) list = plan.days[DAY_KEYS[day]];
  if (!Array.isArray(list)) return [];
  /** @type {string[]} */
  var out = [];
  list.forEach(function (/** @type {unknown} */ id) {
    if (typeof id === "string" && out.indexOf(id) < 0) out.push(id);
  });
  return out;
}

/**
 * The seven days of the week that holds this date, Monday to Sunday (A4), each at local midnight.
 * @param {Date} date
 * @returns {Date[]}
 */
export function weekOf(date) {
  var back = (date.getDay() + 6) % 7, // days since Monday
    days = [];
  for (var i = 0; i < 7; i++) days.push(new Date(date.getFullYear(), date.getMonth(), date.getDate() - back + i));
  return days;
}

/**
 * The local date as "YYYY-MM-DD" (the key the ticks are kept under).
 * @param {Date} date
 * @returns {string}
 */
export function dateKey(date) {
  /** @param {number} n */
  function two(n) {
    return (n < 10 ? "0" : "") + n;
  }
  return date.getFullYear() + "-" + two(date.getMonth() + 1) + "-" + two(date.getDate());
}

/**
 * Where Start / Continue opens: the first text not yet ticked, or -1 when every one is.
 * @param {string[]} ids
 * @param {string[]} done
 * @returns {number}
 */
export function firstUndone(ids, done) {
  for (var i = 0; i < ids.length; i++) if (done.indexOf(ids[i]) < 0) return i;
  return -1;
}

/**
 * Prev (dir -1) or Next (dir 1) from a text while reading a session: the text to go to, { end: true } after
 * the last one (back to Today), or null when the text is not in the session or there is nothing before it
 * (then Prev and Next follow the library order, as they always did).
 * @param {string[]} ids
 * @param {string} id
 * @param {1 | -1} dir
 * @returns {Step | null}
 */
export function stepInSession(ids, id, dir) {
  var i = ids.indexOf(id);
  if (i < 0) return null;
  var j = i + dir;
  if (j >= ids.length) return { end: true };
  return j < 0 ? null : { to: ids[j] };
}

// ---- Each person's own routine (the routine builder, js/features/routine-builder.js) ----
// A person's routine is kept in their profile (Profile.routine, js/store/profiles.js), in the same shape as
// content/routines.json. null means "never changed": they follow content/routines.json (Q5), so a new person starts
// from it. The functions below never change what they are given: each returns a new routine or list.

/** The weekday row of the builder, Monday first (A4), as Date.getDay() numbers @type {number[]} */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
// at most this many texts in one list (the library has 11; room for family texts later)
export const MAX_TEXTS = 60;
var ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/**
 * A list of text ids read from storage or a file: strings that look like ids, each once, at most MAX_TEXTS
 * @param {unknown} list
 * @returns {string[]}
 */
export function cleanList(list) {
  /** @type {string[]} */
  var out = [];
  if (!Array.isArray(list)) return out;
  list.forEach(function (/** @type {unknown} */ id) {
    if (typeof id === "string" && ID.test(id) && out.indexOf(id) < 0 && out.length < MAX_TEXTS) out.push(id);
  });
  return out;
}

/**
 * One session's plan, cleaned: a weekday plan always has all seven days; anything unreadable is an empty fixed list
 * @param {any} p
 * @returns {SessionPlan}
 */
function cleanPlan(p) {
  if (p && typeof p === "object" && p.mode === "weekday" && p.days && typeof p.days === "object") {
    /** @type {Partial<Record<DayKey, string[]>>} */
    var days = {};
    DAY_KEYS.forEach(function (k) {
      days[k] = cleanList(p.days[k]);
    });
    return { mode: "weekday", days: days };
  }
  return { mode: "fixed", texts: cleanList(p && typeof p === "object" ? p.texts : null) };
}

/**
 * A routine read from IndexedDB or a backup file, cleaned (never trusted as it is): null when there is none (the
 * person follows content/routines.json), else every session with a well-formed plan.
 * @param {any} r
 * @returns {Routine | null}
 */
export function cleanRoutine(r) {
  if (!r || typeof r !== "object" || Array.isArray(r)) return null;
  /** @type {Routine} */
  var out = {};
  SESSIONS.forEach(function (s) {
    out[s] = cleanPlan(r[s]);
  });
  return out;
}

/**
 * A person's routine to edit: their own, or a copy of the default (content/routines.json) when they have none
 * @param {Routine | null | undefined} mine
 * @param {Routine | null | undefined} fallback
 * @returns {Routine}
 */
export function editable(mine, fallback) {
  return /** @type {Routine} */ (cleanRoutine(mine) || cleanRoutine(fallback) || cleanRoutine({}));
}

/**
 * Whether a session has a list per weekday
 * @param {Routine} routine
 * @param {Session} session
 */
export function byWeekday(routine, session) {
  var p = routine[session];
  return !!p && p.mode === "weekday";
}

/**
 * Put a list in place: the session's one list, or one weekday's when the session has a list per weekday
 * @param {Routine} routine
 * @param {Session} session
 * @param {number} day  0 Sunday … 6 Saturday
 * @param {string[]} ids
 * @returns {Routine}
 */
export function setList(routine, session, day, ids) {
  var r = editable(routine, null),
    p = /** @type {SessionPlan} */ (r[session]),
    list = cleanList(ids);
  if (p.mode === "weekday") p.days[DAY_KEYS[day]] = list;
  else r[session] = { mode: "fixed", texts: list };
  return r;
}

/**
 * "Same every day" (fixed) or "Different by weekday": to weekdays, every day starts with the one list; to the same
 * every day, the list of the day being shown becomes everyone's.
 * @param {Routine} routine
 * @param {Session} session
 * @param {"fixed" | "weekday"} mode
 * @param {number} day  the day shown (0 Sunday … 6 Saturday)
 * @returns {Routine}
 */
export function setMode(routine, session, mode, day) {
  var r = editable(routine, null),
    now = textsFor(r, day, session);
  if (mode === "weekday") {
    /** @type {Partial<Record<DayKey, string[]>>} */
    var days = {};
    DAY_KEYS.forEach(function (k) {
      days[k] = now.slice();
    });
    r[session] = { mode: "weekday", days: days };
  } else r[session] = { mode: "fixed", texts: now };
  return r;
}

/**
 * "Copy to other days…": the list of one weekday given to the days chosen (a session with one list is unchanged)
 * @param {Routine} routine
 * @param {Session} session
 * @param {number} from
 * @param {number[]} to
 * @returns {Routine}
 */
export function copyDays(routine, session, from, to) {
  var r = editable(routine, null),
    p = /** @type {SessionPlan} */ (r[session]);
  if (p.mode !== "weekday") return r;
  var list = textsFor(r, from, session),
    days = p.days;
  to.forEach(function (d) {
    if (d >= 0 && d <= 6 && d !== from) days[DAY_KEYS[d]] = list.slice();
  });
  return r;
}

/**
 * Whether every weekday of a session has the same list (then "Same every day" loses nothing)
 * @param {Routine} routine
 * @param {Session} session
 */
export function allDaysSame(routine, session) {
  var first = JSON.stringify(textsFor(routine, 0, session));
  for (var d = 1; d < 7; d++) if (JSON.stringify(textsFor(routine, d, session)) !== first) return false;
  return true;
}

/**
 * A list with one text moved from one place to another (places counted from 0, kept inside the list)
 * @param {string[]} list
 * @param {number} from
 * @param {number} to
 * @returns {string[]}
 */
export function moveItem(list, from, to) {
  var out = list.slice();
  if (from < 0 || from >= out.length) return out;
  var t = Math.max(0, Math.min(out.length - 1, to)),
    x = out.splice(from, 1)[0];
  out.splice(t, 0, x);
  return out;
}

/**
 * A list with texts added at the end (those already in it stay where they are)
 * @param {string[]} list
 * @param {string[]} ids
 * @returns {string[]}
 */
export function addTexts(list, ids) {
  return cleanList(list.concat(ids));
}

/**
 * A list without one text
 * @param {string[]} list
 * @param {string} id
 * @returns {string[]}
 */
export function removeText(list, id) {
  return list.filter(function (x) {
    return x !== id;
  });
}

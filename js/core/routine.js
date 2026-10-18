// @ts-check
// The Today card's plan: which texts a session has on a given day, the week row, and walking through a session
// in order. Pure functions only (no page), so the unit tests (tests/unit/today.test.mjs) run them in Node;
// js/features/today-card.js puts the answer on the page.
//
// The routine comes from content/routines.json (docs/architecture.md §3.5): for each session, either the same
// list every day ({ mode: "fixed", texts }) or one list per weekday ({ mode: "weekday", days: { mon: […], … } }).
// The default (docs/decisions.md): Morning = Ganapati Atharvashirsha, Evening = the ten aartis, Afternoon empty.
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

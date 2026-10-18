// @ts-check
// The Today card's ticks: which texts of each session were ticked today, kept on this device only.
// Pure (the storage is passed in), so the unit tests (tests/unit/today.test.mjs) run it in Node with a stand-in;
// js/features/today-card.js passes localStorage.
//
// Kept apart from the reader's settings (P, "aarti2-prefs"), under its own key, with one implicit "family"
// profile until profiles arrive (docs/architecture.md slice 2): then this small module is all that moves to
// IndexedDB (Profile.checklist, §3.4). Ticks are for one day: on a new day the card starts with none, and the
// first tick of the day drops the day before's.
//
// Stored: { "v": 1, "profiles": { "family": { "date": "2026-10-18", "done": { "evening": ["sukhkarta", …] } } } }

export const TICKS_KEY = "nitya-ticks";
export const PROFILE = "family";

/**
 * @typedef {{ getItem(key: string): string | null, setItem(key: string, value: string): void }} Store
 * @typedef {{ date: string, done: Record<string, string[]> }} Day
 * @typedef {{
 *   done(today: string, session: string): string[],
 *   set(today: string, session: string, id: string, on: boolean): void,
 *   prune(today: string): void
 * }} Ticks
 */

/**
 * @param {Store | null | undefined} store  localStorage, or a stand-in; null keeps ticks for this visit only
 * @param {string} [key]
 * @returns {Ticks}
 */
export function createTicks(store, key) {
  var K = key || TICKS_KEY;
  // the last state read or written: used when the storage can't be read (private mode, blocked site data)
  /** @type {any} */
  var mem = null;

  /** @returns {any} */
  function readAll() {
    try {
      if (store) {
        var s = store.getItem(K);
        if (s) {
          var o = JSON.parse(s);
          if (o && typeof o === "object" && o.profiles && typeof o.profiles === "object") return (mem = o);
        } else return (mem = { v: 1, profiles: {} });
      }
    } catch (e) {}
    return mem || (mem = { v: 1, profiles: {} });
  }

  /** @param {any} all */
  function writeAll(all) {
    mem = all;
    try {
      if (store) store.setItem(K, JSON.stringify(all));
    } catch (e) {}
  }

  /**
   * Today's record (a fresh one when the stored one is from another day)
   * @param {any} all
   * @param {string} today
   * @returns {Day}
   */
  function day(all, today) {
    var d = all.profiles[PROFILE];
    if (!d || d.date !== today || !d.done || typeof d.done !== "object") d = { date: today, done: {} };
    return d;
  }

  return {
    done: function (today, session) {
      var l = day(readAll(), today).done[session];
      return Array.isArray(l) ? l.filter(function (x) { return typeof x === "string"; }) : [];
    },
    set: function (today, session, id, on) {
      var all = readAll(),
        d = day(all, today),
        l = Array.isArray(d.done[session]) ? d.done[session].slice() : [],
        i = l.indexOf(id);
      if (on && i < 0) l.push(id);
      if (!on && i >= 0) l.splice(i, 1);
      if (l.length) d.done[session] = l;
      else delete d.done[session];
      all.profiles[PROFILE] = d;
      writeAll(all);
    },
    prune: function (today) {
      var all = readAll(),
        d = all.profiles[PROFILE];
      if (d && d.date === today) return;
      all.profiles[PROFILE] = { date: today, done: {} };
      writeAll(all);
    },
  };
}

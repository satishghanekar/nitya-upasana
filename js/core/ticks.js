// @ts-check
// The Today card's ticks: which texts of each session were ticked today, kept on this device only.
// Pure (the storage is passed in), so the unit tests (tests/unit/today.test.mjs) run it in Node with a stand-in.
// Each person keeps their own ticks: js/features/today-card.js passes the store's stand-in for localStorage
// (ticksStorage() in js/store/store.js), which keeps them in each profile in IndexedDB (Profile.checklist),
// and who() names the person reading. Ticks are for one day: on a new day the card starts
// with none, and the first tick of the day drops the day before's.
//
// The shape read and written: { "v": 1, "profiles": { "<profile id>": { "date": "2026-10-18", "done": { "evening":
// ["sukhkarta", …] } } } }. Before profiles (version 1.3) it was kept in localStorage["nitya-ticks"] under one
// "family" profile; the first visit after moves those ticks to the first profile (startPlan, js/store/profiles.js).

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
 * @param {() => string} [who]  the person reading (a profile id); "family" when not given
 * @returns {Ticks}
 */
export function createTicks(store, key, who) {
  var K = key || TICKS_KEY;
  function me() {
    return (who && who()) || PROFILE;
  }
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
    var d = all.profiles[me()];
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
      all.profiles[me()] = d;
      writeAll(all);
    },
    prune: function (today) {
      var all = readAll(),
        d = all.profiles[me()];
      if (d && d.date === today) return;
      all.profiles[me()] = { date: today, done: {} };
      writeAll(all);
    },
  };
}

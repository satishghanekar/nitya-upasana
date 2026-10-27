// @ts-check
// The app's store: every person (profile) on this phone and the device's settings, kept in IndexedDB
// (js/store/db.js), with today's working copy in memory so the page never waits for the database.
// - openStore() opens the database and reads it; js/main.js waits for it (with the texts) before the parts start.
// - start() is called by js/core/state.js: it decides who is reading and their settings (startPlan in
//   js/store/profiles.js), moving today's settings into the first profile on the first visit.
// - The active person's settings are also written at once to localStorage["aarti2-prefs"] by state.js (the boot copy,
//   read before the page script runs and by the previous version of the site); here they go to IndexedDB a moment
//   later, and at once when the page is hidden.
// Everything stays on this device. Nothing is sent anywhere.

import { openDB } from "./db.js";
import {
  canAdd,
  canDelete,
  cleanColour,
  cleanInitials,
  cleanName,
  cleanProfile,
  makeId,
  nameProblem,
  newProfile,
  nextColour,
  startPlan,
} from "./profiles.js";
import { defaults, devicePart, joinPrefs, profilePart } from "./migrate.js";
import { cleanRoutine } from "../core/routine.js";
import { cleanLocal, emptyLocal } from "../core/library.js";

/**
 * @typedef {import("./db.js").DB} DB
 * @typedef {import("./profiles.js").Profile} Profile
 * @typedef {import("./profiles.js").Meta} Meta
 * @typedef {import("./migrate.js").Env} Env
 * @typedef {import("./migrate.js").Prefs} Prefs
 */

/** @type {DB | null} */
var db = null;
/** @type {any[]} */
var rawProfiles = [];
/** @type {any} */
var rawMeta = null;
/** @type {Profile[]} */
var profiles = [];
/** @type {Meta} */
var meta = { activeProfile: "", device: {}, since: "", lastBackup: "", snooze: "", schema: 1 };
/** @type {Env} */
var env = { desk: false, fs: 24 };
/** @type {ReturnType<typeof setTimeout> | undefined} */
var timer;
var pending = false;
/** @type {Promise<any>} */
var writing = Promise.resolve();
/** @type {Array<() => void>} */
var listeners = [];
// writes that failed (IndexedDB full, cleared or aborted): how many so far, and whether the last one did, so the page
// can warn that what is shown is not kept on this device (js/features/backup.js)
var failures = 0,
  lastFailed = false;
/** @type {Array<() => void>} */
var problemListeners = [];
// The site open in two tabs (or windows) at once: each keeps its own copy in memory, so a tab tells the others when a
// write has landed and they read IndexedDB again, rather than writing their older copy over it later
/** @type {BroadcastChannel | null} */
var channel = null;
/** @type {ReturnType<typeof setTimeout> | undefined} */
var again;
/** @type {Array<() => void>} */
var rereadListeners = [];

/**
 * Open the database and read what it holds. Never rejects: if IndexedDB can't be used, the store works in memory
 * and kind() says so.
 * @param {{ idb?: IDBFactory | null, timeout?: number, tries?: number }} [o]
 * @returns {Promise<void>}
 */
export function openStore(o) {
  return openDB(o)
    .then(function (d) {
      db = d;
      return Promise.all([d.all("profiles"), d.get("meta", "meta")]);
    })
    .then(
      function (r) {
        rawProfiles = Array.isArray(r[0]) ? r[0] : [];
        rawMeta = r[1] && typeof r[1] === "object" ? r[1] : null;
        if (db && db.kind === "idb" && typeof BroadcastChannel === "function")
          try {
            channel = new BroadcastChannel("nitya-store");
            channel.onmessage = function () {
              clearTimeout(again);
              again = setTimeout(reread, 100);
            };
          } catch (e) {}
      },
      function () {
        rawProfiles = [];
        rawMeta = null;
      },
    );
}

/** "idb" (saved on this device), "memory" (this visit only: IndexedDB could not be opened) or "" before openStore */
export function kind() {
  return db ? db.kind : "";
}

/** Why IndexedDB could not be used ("timeout", "error: …"), for the warning's details */
export function reason() {
  return db ? db.reason : "";
}

/**
 * Who is reading, and their settings with the device's: called once at start-up by js/core/state.js
 * @param {any} saved  the parsed localStorage["aarti2-prefs"] (the boot copy), or null
 * @param {any} ticks  the parsed localStorage["nitya-ticks"] (the Today card's ticks before profiles), or null
 * @param {Env} e
 * @param {Date} [now]
 * @returns {{ prefs: Prefs, first: boolean, saveBoot: boolean }}
 */
export function start(saved, ticks, e, now) {
  env = e;
  var m = rawMeta ? cleanMeta(rawMeta) : null,
    order = (m && m.order) || [],
    list = peopleIn(rawProfiles, order),
    plan = startPlan({
      profiles: /** @type {Profile[]} */ (list),
      meta: m,
      saved: saved,
      ticks: ticks,
      env: env,
      now: (now || new Date()).toISOString(),
      id: function () {
        return makeId(/** @type {Profile[]} */ (list));
      },
    });
  profiles = plan.profiles;
  meta = plan.meta;
  plan.write.forEach(function (id) {
    putProfile(byId(id));
  });
  if (plan.writeMeta || JSON.stringify(order) !== JSON.stringify(ids())) putMeta();
  return { prefs: plan.prefs, first: plan.first, saveBoot: plan.saveBoot };
}

/**
 * The people as IndexedDB holds them, cleaned, in the order they were added (IndexedDB lists them by id)
 * @param {any[]} raw @param {string[]} order @returns {Profile[]}
 */
function peopleIn(raw, order) {
  return /** @type {Profile[]} */ (
    raw
      .map(function (p) {
        return cleanProfile(p, env);
      })
      .filter(function (/** @type {Profile | null} */ p) {
        return !!p;
      })
  ).sort(function (a, b) {
    var i = order.indexOf(a.id),
      j = order.indexOf(b.id);
    return (i < 0 ? 1e9 : i) - (j < 0 ? 1e9 : j) || (a.created < b.created ? -1 : a.created > b.created ? 1 : 0);
  });
}

/** @param {any} m @returns {Meta} */
function cleanMeta(m) {
  /** @param {any} v */
  var s = function (v) {
    return typeof v === "string" ? v : "";
  };
  /** @type {Meta} */
  var out = {
    activeProfile: s(m.activeProfile),
    device: m.device && typeof m.device === "object" ? devicePart(m.device) : {},
    since: s(m.since),
    lastBackup: s(m.lastBackup),
    snooze: s(m.snooze),
    schema: 1,
    order: Array.isArray(m.order)
      ? m.order.filter(function (/** @type {any} */ x) {
          return typeof x === "string";
        })
      : [],
  };
  if (m.library) out.library = cleanLocal(m.library);
  return out;
}

/** The people's ids, in order */
function ids() {
  return profiles.map(function (p) {
    return p.id;
  });
}

/** @param {string} id */
function byId(id) {
  return profiles.filter(function (p) {
    return p.id === id;
  })[0];
}

// ---- writing to IndexedDB, one write after another so they land in order ----
/** @param {() => Promise<any> | undefined} fn */
function queue(fn) {
  writing = writing.then(fn).then(
    function () {
      if (lastFailed) problem(false);
      if (channel)
        try {
          channel.postMessage("saved");
        } catch (e) {}
    },
    function (e) {
      console.error("Saving on this device failed", e);
      failures++;
      if (!lastFailed) problem(true);
    },
  );
  return writing;
}
/** @param {boolean} on */
function problem(on) {
  lastFailed = on;
  problemListeners.forEach(function (f) {
    try {
      f();
    } catch (e) {
      console.error(e);
    }
  });
}
/**
 * Another tab has written: read the people and the meta again. This tab keeps who is reading here, and the settings
 * it has not written yet (they follow); the parts are told as when the people change (onChange)
 */
function reread() {
  var d = db;
  if (!d || !profiles.length) return;
  Promise.all([d.all("profiles"), d.get("meta", "meta")]).then(
    function (r) {
      if (!Array.isArray(r[0]) || !r[1] || typeof r[1] !== "object") return;
      var m = cleanMeta(r[1]),
        list = peopleIn(r[0], m.order || []),
        me = active();
      if (!list.length) return;
      if (pending && me)
        list.forEach(function (p) {
          if (p.id === me.id) p.settings = me.settings;
        });
      m.activeProfile = meta.activeProfile;
      if (pending) m.device = meta.device;
      profiles = list;
      meta = m;
      changed();
      rereadListeners.forEach(function (f) {
        try {
          f();
        } catch (e) {
          console.error(e);
        }
      });
    },
    function () {},
  );
}

/** Tell me when another tab's changes have been read in (a routine, the Library's categories) @param {() => void} fn */
export function onReread(fn) {
  rereadListeners.push(fn);
}

/** Whether the last write to IndexedDB failed (a later one that lands clears it) */
export function saveFailed() {
  return lastFailed;
}
/** Tell me when saving starts or stops failing @param {() => void} fn */
export function onSaveProblem(fn) {
  problemListeners.push(fn);
}
/** @param {Profile | undefined} p */
function putProfile(p) {
  if (!p || !db) return writing;
  var d = db,
    copy = JSON.parse(JSON.stringify(p));
  return queue(function () {
    return d.put("profiles", copy);
  });
}
function putMeta() {
  meta.order = ids();
  if (!db) return writing;
  var d = db,
    copy = JSON.parse(JSON.stringify(meta));
  return queue(function () {
    return d.put("meta", copy, "meta");
  });
}

/** Write anything still waiting (the page is being hidden or closed: js/core/state.js) */
export function flush() {
  clearTimeout(timer);
  if (!pending) return writing;
  pending = false;
  putProfile(active());
  return putMeta();
}

/** Every write so far has landed (for tests and for a restore that reloads the page) */
export function settled() {
  return writing;
}

// ---- reading ----
/** @returns {Profile} */
export function active() {
  return byId(meta.activeProfile) || profiles[0];
}
/** @returns {Profile[]} */
export function list() {
  return profiles.slice();
}
/** @returns {Meta} */
export function getMeta() {
  return JSON.parse(JSON.stringify(meta));
}

/** Tell me when the people change (added, renamed, switched, removed, restored) */
/** @param {() => void} fn */
export function onChange(fn) {
  listeners.push(fn);
}
function changed() {
  listeners.forEach(function (f) {
    try {
      f();
    } catch (e) {
      console.error(e);
    }
  });
}

// ---- the active person's settings ----
/**
 * The settings changed (state.js save()): kept in memory now, written to IndexedDB a moment later
 * @param {Prefs} P
 */
export function saveSettings(P) {
  var p = active();
  if (!p) return;
  p.settings = profilePart(P);
  meta.device = devicePart(P);
  pending = true;
  clearTimeout(timer);
  timer = setTimeout(flush, 300);
}

/**
 * Switch to another person: the settings so far are kept with the one reading now, and the other's are returned
 * (with this device's) for js/features/profiles.js to put on the page
 * @param {string} id
 * @param {Prefs} P  the settings now
 * @returns {Prefs | null}  null when there is no such person, or they are already reading
 */
export function switchTo(id, P) {
  var to = byId(id),
    now = active();
  if (!to || !now || to.id === now.id) return null;
  now.settings = profilePart(P);
  meta.device = devicePart(P);
  meta.activeProfile = to.id;
  pending = false;
  clearTimeout(timer);
  putProfile(now);
  putMeta();
  changed();
  return joinPrefs(to.settings, meta.device, env);
}

/**
 * Add a person, with the settings a new reader starts with (the defaults: text size, Marathi with English…) and the
 * default routine (content/routines.json, Q5)
 * @param {{ name: string, initials?: string, colour?: string }} o
 * @returns {{ ok: true, profile: Profile } | { ok: false, problem: "empty" | "taken" | "full" }}
 */
export function add(o) {
  if (!canAdd(profiles)) return { ok: false, problem: "full" };
  var pr = nameProblem(o.name, profiles);
  if (pr) return { ok: false, problem: pr };
  var now = new Date().toISOString(),
    p = newProfile({
      id: makeId(profiles),
      name: o.name,
      initials: o.initials,
      colour: o.colour || nextColour(profiles),
      settings: profilePart(defaults(env)),
      checklist: null,
      routine: null,
      now: now,
    });
  profiles.push(p);
  putProfile(p);
  putMeta();
  changed();
  return { ok: true, profile: p };
}

/**
 * Rename a person, or change their badge letters or colour
 * @param {string} id
 * @param {{ name: string, initials?: string, colour?: string }} o
 * @returns {{ ok: true, profile: Profile } | { ok: false, problem: "empty" | "taken" | "missing" }}
 */
export function update(id, o) {
  var p = byId(id);
  if (!p) return { ok: false, problem: "missing" };
  var pr = nameProblem(o.name, profiles, id);
  if (pr) return { ok: false, problem: pr };
  p.name = cleanName(o.name);
  p.initials = cleanInitials(o.initials || "", p.name);
  p.colour = cleanColour(o.colour || p.colour);
  p.updated = new Date().toISOString();
  putProfile(p);
  changed();
  return { ok: true, profile: p };
}

/**
 * Remove a person (never the last one). If they were reading, the first other person takes over: their settings
 * are returned for the page.
 * @param {string} id
 * @returns {{ ok: boolean, switched: Prefs | null }}
 */
export function remove(id) {
  if (!canDelete(profiles, id)) return { ok: false, switched: null };
  flush();
  var was = meta.activeProfile === id;
  profiles = profiles.filter(function (p) {
    return p.id !== id;
  });
  var d = db;
  if (d) {
    var dd = d;
    queue(function () {
      return dd.del("profiles", id);
    });
  }
  /** @type {Prefs | null} */
  var sw = null;
  if (was) {
    meta.activeProfile = profiles[0].id;
    sw = joinPrefs(profiles[0].settings, meta.device, env);
  }
  putMeta();
  changed();
  return { ok: true, switched: sw };
}

// ---- the reading person's routine (the routine builder, js/features/routine-builder.js) ----
/**
 * Their own routine, or null when they follow content/routines.json
 * @returns {import("../core/routine.js").Routine | null}
 */
export function routine() {
  var p = active();
  return p && p.routine ? JSON.parse(JSON.stringify(p.routine)) : null;
}

/**
 * Keep a changed routine for the person reading, in their profile, written to IndexedDB at once
 * @param {import("../core/routine.js").Routine | null} r  null: back to content/routines.json
 */
export function setRoutine(r) {
  var p = active();
  if (!p) return writing;
  p.routine = cleanRoutine(r);
  p.updated = new Date().toISOString();
  return putProfile(p);
}

// ---- the library's categories (js/core/library.js), per phone, for everyone on it ----
/** The family's categories, renames and moves on this phone */
export function getLibrary() {
  return cleanLocal(meta.library || emptyLocal());
}

/**
 * Keep the family's categories, renames and moves (written to IndexedDB at once)
 * @param {import("../core/library.js").LibraryLocal} l
 */
export function setLibrary(l) {
  meta.library = cleanLocal(l);
  return putMeta();
}

// ---- backup ----
/** Everything a backup file holds */
export function exportData() {
  return { profiles: list(), activeProfile: active().id, device: meta.device, library: getLibrary() };
}

/**
 * A backup was saved (or shared) now
 * @param {Date} [now]
 */
export function markBackup(now) {
  meta.lastBackup = (now || new Date()).toISOString();
  meta.snooze = "";
  putMeta();
  changed();
}

/**
 * "Not now" on the reminder
 * @param {Date} [now]
 */
export function snooze(now) {
  meta.snooze = (now || new Date()).toISOString();
  putMeta();
  changed();
}

/**
 * Replace everything with a backup's contents (already read and checked by js/store/backup.js parseBackup): every
 * person in the file, and the device settings from it; whoever was active in the file reads next.
 * @param {import("./backup.js").Payload} data
 * @returns {Promise<Prefs>}  the settings to put on the page; the promise settles when IndexedDB has them, and fails
 *   (with them as its error's prefs) when a write did not land
 */
export function restore(data) {
  profiles = data.profiles.map(function (p) {
    return JSON.parse(JSON.stringify(p));
  });
  var keepWake = meta.device && meta.device.wake;
  meta.device = Object.assign({}, data.settings);
  // keeping the screen on depends on the device (a computer's backup restored on a phone), so it stays as it was here
  if (keepWake !== undefined) meta.device.wake = keepWake;
  meta.activeProfile = data.activeProfile;
  // the categories in the file (a file from version 1.7 or before has none: this phone's stay)
  if (data.library) meta.library = cleanLocal(data.library);
  meta.lastBackup = meta.lastBackup || new Date().toISOString();
  pending = false;
  clearTimeout(timer);
  var d = db,
    copy = JSON.parse(JSON.stringify(profiles));
  if (d) {
    var dd = d;
    queue(function () {
      return dd.replace("profiles", copy);
    });
  }
  var before = failures,
    w = putMeta();
  changed();
  var prefs = joinPrefs(active().settings, meta.device, env);
  // fails when a write of the restore did not land, so the page does not say it was restored (the error carries the
  // settings: the restore is in place for this visit)
  return w.then(function () {
    if (failures > before) throw Object.assign(new Error("The restore could not be saved on this device"), { prefs: prefs });
    return prefs;
  });
}

/** For the unit tests: forget everything (as a fresh page would) */
export function _reset() {
  db = null;
  rawProfiles = [];
  rawMeta = null;
  profiles = [];
  meta = { activeProfile: "", device: {}, since: "", lastBackup: "", snooze: "", schema: 1 };
  listeners = [];
  problemListeners = [];
  rereadListeners = [];
  if (channel) channel.close();
  channel = null;
  failures = 0;
  lastFailed = false;
  pending = false;
  clearTimeout(timer);
  writing = Promise.resolve();
}

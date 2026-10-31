// @ts-check
// People (profiles) on a shared phone: each keeps their own settings (text size, languages, theme…) and today's
// ticks. Profiles are a convenience, not security: no PINs, anyone holding the phone can switch.
// Pure: the unit tests (tests/unit/profiles.test.mjs) run it in Node; js/store/store.js keeps the profiles in
// IndexedDB and js/features/profiles.js shows them.
//
// The start-up rule (startPlan): the settings saved under localStorage["aarti2-prefs"] are the active person's
// "boot copy", written at once on every change (IndexedDB writes are asynchronous and can be cut short when a phone
// closes the page). So for the active person the boot copy wins, and on the first visit after this version it
// becomes the first person (SG, below), with today's ticks.

import { cleanPerson, defaults, devicePart, migratePrefs, profilePart } from "./migrate.js";
import { cleanRoutine, withoutVedic } from "../core/routine.js";

/**
 * @typedef {import("./migrate.js").Env} Env
 * @typedef {import("./migrate.js").Prefs} Prefs
 * @typedef {{ date: string, done: Record<string, string[]> }} Checklist
 * @typedef {import("../core/routine.js").Routine} Routine
 * @typedef {{ id: string, name: string, initials: string, colour: string, settings: Prefs,
 *   checklist: Checklist | null, routine: Routine | null, created: string, updated: string }} Profile
 *   routine: their own (the routine builder, version 1.9), or null to follow content/routines.json (Q5)
 * @typedef {{ activeProfile: string, device: Prefs, since: string, lastBackup: string, snooze: string,
 *   schema: number, order?: string[], library?: import("../core/library.js").LibraryLocal, builtIn?: number }} Meta
 *   order: the people's ids in the order they were added; library: the family's categories, renames and moves
 *   (js/core/library.js), for everyone on this phone; builtIn: 1 once the built-in people were added (BUILT_IN)
 */

// The badge colours offered (white letters on each meet WCAG AA, 4.5:1 or more)
export const COLOURS = [
  { v: "#7b1113", en: "Maroon", mr: "किरमिजी" },
  { v: "#2f5d8a", en: "Blue", mr: "निळा" },
  { v: "#6b4a8a", en: "Purple", mr: "जांभळा" },
  { v: "#2f6b3a", en: "Green", mr: "हिरवा" },
  { v: "#8a4b12", en: "Brown", mr: "तपकिरी" },
  { v: "#1f6363", en: "Teal", mr: "मोरपंखी" },
  { v: "#8a2f5d", en: "Rose", mr: "गुलाबी" },
  { v: "#4a4a4a", en: "Grey", mr: "राखाडी" },
];
// a shared phone usually has four or five people; room for a few more
export const MAX_PROFILES = 8;
export const NAME_MAX = 24;
export const INITIALS_MAX = 4;
export const FIRST_NAME = "Me";

// The people every phone starts with (this app only): SG follows the default routine (content/routines.json); RG's
// is the default without its Vedic chants, with the Lalita Sahasranama every morning, made once when RG is added
// (so later changes to the default do not reach it). Added once: a person deleted does not come back.
/** @type {{ name: string, colour: string, routine: (def: any) => Routine | null }[]} */
export const BUILT_IN = [
  {
    name: "SG",
    colour: COLOURS[0].v,
    routine: function () {
      return null;
    },
  },
  {
    name: "RG",
    colour: COLOURS[1].v,
    routine: function (def) {
      return withoutVedic(def, "vedic-chant-lalita-sahasranama");
    },
  },
];

/** @param {string} s */
export function cleanName(s) {
  return String(s || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
}

// One letter as a reader sees it: a base letter with its vowel signs, and a Devanagari (or Kannada) conjunct with
// its virama, so "क्षि" counts as one
var CLUSTER = /(?:[ऀ-෿](?:[ऀ-ःऺ-ौॎ-ॗॢॣಀ-ಃ಼ಾ-ೌೕೖೢೣ]|[्್][ऀ-෿])*[्್]?)|[\ud800-\udbff][\udc00-\udfff]|[\s\S]/g;

/** @param {string} s */
function clusters(s) {
  return s.match(CLUSTER) || [];
}

/**
 * The letters on a person's round badge, from their name: the first letters of the first two words in the Latin
 * alphabet ("Aaji Ghanekar" → "AG"), or the first two letters of an Indian-script name ("आई" → "आई", "आजोबा" → "आजो")
 * @param {string} name
 */
export function initialsOf(name) {
  var n = cleanName(name);
  if (!n) return "";
  var words = n.split(" ");
  if (/^[A-Za-zÀ-ɏ]/.test(words[0])) {
    return words
      .slice(0, 2)
      .map(function (w) {
        return clusters(w)[0] || "";
      })
      .join("")
      .toUpperCase();
  }
  return clusters(words[0]).slice(0, 2).join("");
}

/**
 * The badge letters as typed (at most four letters as a reader sees them), or from the name when left empty
 * @param {string} typed
 * @param {string} name
 */
export function cleanInitials(typed, name) {
  var t = String(typed || "")
    .replace(/\s+/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "");
  return t ? clusters(t).slice(0, INITIALS_MAX).join("") : initialsOf(name);
}

/** @param {string} c */
export function cleanColour(c) {
  return COLOURS.some(function (x) {
    return x.v === c;
  })
    ? c
    : COLOURS[0].v;
}

/**
 * The first colour no one has yet (or the first again when all are taken)
 * @param {Profile[]} list
 */
export function nextColour(list) {
  for (var i = 0; i < COLOURS.length; i++) {
    var v = COLOURS[i].v;
    if (
      !list.some(function (p) {
        return p.colour === v;
      })
    )
      return v;
  }
  return COLOURS[list.length % COLOURS.length].v;
}

/** A new id: short, random, not reused */
/** @param {Profile[]} list @param {() => number} [rand] */
export function makeId(list, rand) {
  var r = rand || Math.random,
    /** @type {string} */
    id;
  do {
    id =
      "p" +
      Math.floor(r() * 2176782336)
        .toString(36)
        .padStart(6, "0");
  } while (
    list.some(function (p) {
      return p.id === id;
    })
  );
  return id;
}

/**
 * Why a name can't be used, or "" when it can: it must not be empty, nor the same as another person's
 * @param {string} name
 * @param {Profile[]} list
 * @param {string} [self]  the id of the person being renamed
 * @returns {"" | "empty" | "taken"}
 */
export function nameProblem(name, list, self) {
  var n = cleanName(name).toLowerCase();
  if (!n) return "empty";
  if (
    list.some(function (p) {
      return p.id !== self && p.name.toLowerCase() === n;
    })
  )
    return "taken";
  return "";
}

/**
 * @param {{ id: string, name: string, initials?: string, colour?: string, settings: Prefs, checklist?: Checklist | null,
 *   routine?: Routine | null, now: string }} o
 * @returns {Profile}
 */
export function newProfile(o) {
  var name = cleanName(o.name) || FIRST_NAME;
  return {
    id: o.id,
    name: name,
    initials: cleanInitials(o.initials || "", name),
    colour: cleanColour(o.colour || ""),
    settings: o.settings,
    checklist: o.checklist || null,
    // a new person follows content/routines.json until they change their routine (Q5)
    routine: cleanRoutine(o.routine),
    created: o.now,
    updated: o.now,
  };
}

/** A person can be deleted while someone else remains */
/** @param {Profile[]} list @param {string} id */
export function canDelete(list, id) {
  return (
    list.length > 1 &&
    list.some(function (p) {
      return p.id === id;
    })
  );
}

/** @param {Profile[]} list */
export function canAdd(list) {
  return list.length < MAX_PROFILES;
}

/**
 * Today's ticks in a profile, if well formed
 * @param {any} c
 * @returns {Checklist | null}
 */
export function cleanChecklist(c) {
  if (!c || typeof c !== "object" || typeof c.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) return null;
  /** @type {Record<string, string[]>} */
  var done = {};
  if (c.done && typeof c.done === "object")
    Object.keys(c.done).forEach(function (s) {
      if (Array.isArray(c.done[s]))
        done[s] = c.done[s].filter(function (/** @type {any} */ x) {
          return typeof x === "string";
        });
    });
  return { date: c.date, done: done };
}

/**
 * A profile read from IndexedDB or a backup file, cleaned: null if it can't be used at all
 * @param {any} p
 * @param {Env} env
 * @returns {Profile | null}
 */
export function cleanProfile(p, env) {
  if (!p || typeof p !== "object" || typeof p.id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(p.id)) return null;
  var name = cleanName(p.name);
  if (!name) return null;
  return {
    id: p.id,
    name: name,
    initials: cleanInitials(typeof p.initials === "string" ? p.initials : "", name),
    colour: cleanColour(p.colour),
    settings: cleanPerson(p.settings, env),
    checklist: cleanChecklist(p.checklist),
    // a profile saved before version 1.9 (or a backup file from then) has none: the default routine
    routine: cleanRoutine(p.routine),
    created: typeof p.created === "string" ? p.created : "",
    updated: typeof p.updated === "string" ? p.updated : "",
  };
}

/**
 * How start-up goes, from what IndexedDB holds and the boot copy in localStorage (see the top of this file).
 * @param {{ profiles: Profile[], meta: Meta | null, saved: any, ticks: any, env: Env, now: string,
 *   id: (taken: Profile[]) => string, routine?: any }} o
 *   saved: the parsed localStorage["aarti2-prefs"] or null; ticks: the parsed localStorage["nitya-ticks"] or null;
 *   id: a new id, not one in taken; routine: the default (content/routines.json), for RG's
 * @returns {{ profiles: Profile[], meta: Meta, prefs: Prefs, write: string[], writeMeta: boolean, first: boolean,
 *   saveBoot: boolean }}
 *   write: ids of profiles to save to IndexedDB; first: this is the move of today's settings into the first profile;
 *   saveBoot: the boot copy should be written again
 */
export function startPlan(o) {
  var profiles = o.profiles.slice(),
    saved = o.saved && typeof o.saved === "object" ? o.saved : null,
    meta = o.meta;
  if (!profiles.length) {
    // The first visit since profiles arrived (or a new phone): today's settings, upgraded from whichever version
    // saved them, become the first person (SG), and the other built-in people start with the defaults; the device
    // settings go to meta. The old key is left as it is, so going back to the previous version still works.
    var m = migratePrefs(saved, o.env),
      fam = o.ticks && o.ticks.profiles && o.ticks.profiles.family,
      made = builtIns(o, [], m.prefs, cleanChecklist(fam));
    return {
      profiles: made,
      meta: {
        activeProfile: made[0].id,
        device: devicePart(m.prefs),
        since: o.now,
        lastBackup: (meta && meta.lastBackup) || "",
        snooze: "",
        schema: 1,
        builtIn: 1,
      },
      prefs: m.prefs,
      write: made.map(function (p) {
        return p.id;
      }),
      writeMeta: true,
      first: true,
      saveBoot: true,
    };
  }
  var m0 = meta || { activeProfile: "", device: {}, since: o.now, lastBackup: "", snooze: "", schema: 1 },
    // a phone that had people before the built-in ones arrived gets them too, once, after its own
    added = m0.builtIn ? [] : builtIns(o, profiles, null, null);
  profiles = profiles.concat(added);
  var ids = profiles.map(function (p) {
      return p.id;
    }),
    // the boot copy names its person (pid); if that person still exists, they are the one reading
    active = saved && ids.indexOf(saved.pid) >= 0 ? saved.pid : ids.indexOf(m0.activeProfile) >= 0 ? m0.activeProfile : ids[0],
    person = profiles[ids.indexOf(active)],
    // the boot copy is this person's (or from a version without profiles): it wins, being the newest
    mine = !!saved && (!saved.pid || saved.pid === active),
    prefs = mine
      ? migratePrefs(Object.assign({}, m0.device, saved), o.env).prefs
      : migratePrefs(Object.assign({}, saved ? pick(saved, m0.device) : m0.device, person.settings, { sv: 6 }), o.env).prefs,
    write = added.map(function (p) {
      return p.id;
    }),
    settings = profilePart(prefs),
    device = devicePart(prefs);
  if (JSON.stringify(settings) !== JSON.stringify(person.settings)) {
    person = Object.assign({}, person, { settings: settings });
    profiles[ids.indexOf(active)] = person;
    write.push(active);
  }
  var meta2 = Object.assign({}, m0, { activeProfile: active, device: device, builtIn: 1 });
  return {
    profiles: profiles,
    meta: meta2,
    prefs: prefs,
    write: write,
    writeMeta: !meta || JSON.stringify(meta2) !== JSON.stringify(meta),
    first: false,
    saveBoot: !mine,
  };
}

/**
 * The built-in people missing from a list (by name), as many as there is room for: the first takes the given settings
 * and ticks when there are any, the others the defaults.
 * @param {{ env: Env, now: string, id: (taken: Profile[]) => string, routine?: any }} o
 * @param {Profile[]} list
 * @param {Prefs | null} prefs
 * @param {Checklist | null} checklist
 * @returns {Profile[]}
 */
function builtIns(o, list, prefs, checklist) {
  /** @type {Profile[]} */
  var made = [];
  BUILT_IN.forEach(function (b) {
    var all = list.concat(made);
    if (nameProblem(b.name, all) || !canAdd(all)) return;
    var first = made.length ? null : prefs;
    made.push(
      newProfile({
        id: o.id(all),
        name: b.name,
        // both letters on the badge (from a one-word name it would be one)
        initials: b.name,
        colour: b.colour,
        settings: profilePart(first || defaults(o.env)),
        checklist: first ? checklist : null,
        routine: b.routine(o.routine),
        now: o.now,
      }),
    );
  });
  return made;
}

/**
 * The device settings: from the boot copy when there is one (it is written first), else as kept in meta
 * @param {any} saved
 * @param {Prefs} device
 */
function pick(saved, device) {
  /** @type {Prefs} */
  var o = Object.assign({}, device);
  Object.keys(devicePart(saved)).forEach(function (k) {
    o[k] = saved[k];
  });
  return o;
}

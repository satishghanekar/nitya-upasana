// @ts-check
// The reader's settings (P), as plain data: the defaults, the upgrade of settings saved by every older version of
// the site (settings versions 0 to 6), the tidy-up that keeps the language choices
// consistent, and which settings belong to a person (a profile) and which to the device.
// Pure: no page and no storage, so the unit tests (tests/unit/migrate.test.mjs) run it in Node. js/core/state.js
// uses it at start-up; js/store/store.js and js/store/backup.js use it to clean settings read from IndexedDB or a
// backup file.
//
// Per person: text size, languages, English style, font, dhrupad, theme, high contrast,
// autoscroll, folds, the highlighted line and the Library's Recent. Per device: keep the screen on, location, layout on wide screens, the
// Print pop-up's choices and the folded home card.

/**
 * @typedef {{ desk: boolean, fs: number }} Env  desk: a computer (no touch screen); fs: the default text size here
 * @typedef {Record<string, any>} Prefs
 */

// the settings version this code writes (P.sv)
export const SETTINGS_VERSION = 6;

// what each person keeps in their profile
export const PROFILE_KEYS = ["lang", "lead", "l2", "ui", "ind", "tr", "fs", "fsu", "fnt", "ref", "th", "hc", "as", "ason", "asp", "af", "tf", "hl", "rc"];
// what stays with the device, whoever is reading
export const DEVICE_KEYS = ["sv", "wake", "cols", "loc", "por", "pfn", "pref", "plang", "ppr", "fold"];

/**
 * Every setting with its default (the same list and meanings as js/core/state.js has always had)
 * @param {Env} env
 * @returns {Prefs}
 */
export function defaults(env) {
  return {
    sv: 0, // settings version (see migratePrefs)
    fs: env.fs, // text size in px
    fsu: 0, // 1 = the reader chose the size (A−/A+/pinch), so auto-fit leaves it alone
    th: "auto", // theme: auto | light | sepia | dark
    lang: "mr", // shown now (the अ/A button): the main language, the second, or both
    lead: "mr", // main language: mr | en
    l2: "en", // second language: en | mr, or "" for none
    ui: "en", // menus, home page and buttons: en | mr
    ind: "mr", // what the "mr" place shows: mr (as written) | kn (Kannada letters)
    ref: 1, // dhrupad: 1 = once at the top, 0 = after every stanza
    hc: 0, // high contrast
    wake: env.desk ? 0 : 1, // keep the screen on
    cols: 0, // wide screens: 0 automatic, 1 one column, 2 two columns
    loc: null, // { lat, lon } from "Use my location"
    hl: "", // data-l id of the highlighted line
    rc: [], // Recent in the Library, newest first: a text's id, or its id and a line's ("a3|s3l5"), at most 8
    por: "", // the page last chosen in the Print pop-up: "" | "up" | "land"
    fnt: "classic", // text font: std (Modern) | classic (Traditional) | bold (Bold)
    pref: "", // dhrupad in the printout: "" as on the page | 0 | 1
    pfn: "", // font of the printout: "" as the text font (fnt) | std | classic | bold
    plang: "", // language of the printout: "" as the page shows it | mr (the original) | en | both
    ppr: "", // paper of the printout: "" as the device's region suggests (Letter in the US and Canada) | letter | a4
    tr: "simple", // English style: simple | iast
    fold: 0, // home card folded
    tf: 0, // home contents list folded
    af: [], // ids of folded pieces
    as: 3, // autoscroll speed for a piece not yet adjusted, 1–10
    ason: 0, // autoscroll button shown
    asp: {}, // autoscroll speed per piece
  };
}

/**
 * A saved value is kept only when it has the same kind as the default (a number for a number, a list for a list…),
 * so a damaged or hand-edited file can't put, say, text where the text size belongs.
 * @param {string} k
 * @param {any} v
 * @param {any} d the default
 */
function fits(k, v, d) {
  if (v === undefined) return false;
  if (k === "loc") return v === null || (!!v && typeof v === "object" && typeof v.lat === "number" && typeof v.lon === "number");
  if (k === "pref") return v === "" || v === 0 || v === 1;
  if (Array.isArray(d))
    return (
      Array.isArray(v) &&
      v.every(function (x) {
        return typeof x === "string";
      })
    );
  if (d && typeof d === "object") return !!v && typeof v === "object" && !Array.isArray(v);
  if (typeof d === "number") return typeof v === "number" && isFinite(v);
  return typeof v === typeof d;
}

/**
 * Settings saved by any version of the site, brought up to today's version: the same steps js/core/state.js has
 * always run, in order, then the tidy-up of the language choices. Unknown keys are dropped.
 * @param {Prefs | null | undefined} saved  the parsed localStorage["aarti2-prefs"] (or a profile's settings)
 * @param {Env} env
 * @returns {{ prefs: Prefs, changed: boolean }}  changed: the upgrade changed something that should be saved
 */
export function migratePrefs(saved, env) {
  var P = defaults(env),
    s = saved && typeof saved === "object" ? saved : {},
    changed = false,
    k;
  for (k in P) {
    if (fits(k, s[k], P[k])) P[k] = s[k];
  }
  if (P.sv < 4) {
    if (P.sv < 3) P.ref = 1; // v3: dhrupad shown once by default
    P.wake = 1; // v4: keep screen on by default
    P.sv = 4;
    changed = true;
  }
  if (P.sv < 5) {
    if (env.desk) P.wake = 0; // v5: computers no longer keep the screen on by default
    P.sv = 5;
    changed = true;
  }
  if (P.sv < 6) {
    // v6: a main and a second language; "In Both, show first" became the main language
    P.l2 = P.lead === "en" ? "mr" : "en";
    P.sv = 6;
    changed = true;
  }
  tidy(P);
  return { prefs: P, changed: changed };
}

/**
 * Keep the language choices consistent: two different languages, English menus when English is the main one, and
 * only the chosen languages shown (as js/core/state.js has always done after loading)
 * @param {Prefs} P
 */
export function tidy(P) {
  if (P.lead !== "en") P.lead = "mr";
  if (P.l2 === P.lead || ["mr", "en", ""].indexOf(P.l2) < 0) P.l2 = P.lead === "en" ? "mr" : "en";
  if (["kn", "te", "gu"].indexOf(P.ind) < 0) P.ind = "mr";
  if (P.por !== "land" && P.por !== "up") P.por = "";
  if (["mr", "en", "both"].indexOf(P.plang) < 0) P.plang = "";
  if (["letter", "a4"].indexOf(P.ppr) < 0) P.ppr = "";
  // Menus in English, or in the language the texts are shown in (Marathi, or the letters picked: P.ind), never mixed
  // (Satish, 2026-10-30: no Marathi texts under Telugu menus); with English as the main language, English
  if (P.ui !== "en" && (P.lead === "en" || P.ui !== P.ind)) P.ui = "en";
  if (!P.l2 || [P.lead, P.l2, "both"].indexOf(P.lang) < 0) P.lang = P.lead;
  if (["auto", "light", "sepia", "dark"].indexOf(P.th) < 0) P.th = "auto";
  // three text fonts since v1.24: Handwritten and the printout's Best are gone (Traditional now does what Best did)
  if (["std", "classic", "bold"].indexOf(P.fnt) < 0) P.fnt = "classic";
  if (["std", "classic", "bold"].indexOf(P.pfn) < 0) P.pfn = "";
  if (P.tr !== "iast") P.tr = "simple";
  // a menu language's code (its file in js/strings/); one without words shows English (js/core/words.js ui())
  if (typeof P.ui !== "string" || !/^[a-z]{2,3}$/.test(P.ui)) P.ui = "en";
  return P;
}

/**
 * The settings of one person (a copy)
 * @param {Prefs} P
 * @returns {Prefs}
 */
export function profilePart(P) {
  /** @type {Prefs} */
  var o = {};
  PROFILE_KEYS.forEach(function (k) {
    if (P[k] !== undefined) o[k] = copy(P[k]);
  });
  return o;
}

/**
 * The settings of the device (a copy)
 * @param {Prefs} P
 * @returns {Prefs}
 */
export function devicePart(P) {
  /** @type {Prefs} */
  var o = {};
  DEVICE_KEYS.forEach(function (k) {
    if (P[k] !== undefined) o[k] = copy(P[k]);
  });
  return o;
}

/**
 * A person's settings with the device's, as one P, cleaned like any saved settings
 * @param {Prefs | null | undefined} person
 * @param {Prefs | null | undefined} device
 * @param {Env} env
 * @returns {Prefs}
 */
export function joinPrefs(person, device, env) {
  /** @type {Prefs} */
  var all = { sv: SETTINGS_VERSION };
  [device || {}, person || {}].forEach(function (part, i) {
    (i ? PROFILE_KEYS : DEVICE_KEYS).forEach(function (k) {
      if (part[k] !== undefined) all[k] = part[k];
    });
  });
  if (typeof all.sv !== "number") all.sv = SETTINGS_VERSION;
  return migratePrefs(all, env).prefs;
}

/**
 * A person's settings cleaned (from IndexedDB or a backup file): only known keys, each of the right kind
 * @param {any} person
 * @param {Env} env
 * @returns {Prefs}
 */
export function cleanPerson(person, env) {
  return profilePart(joinPrefs(person && typeof person === "object" ? person : {}, null, env));
}

/** @param {any} v */
function copy(v) {
  return v && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v;
}

// Settings (P), loaded from this device: the person reading's, with the device's
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { active, saveSettings, start } from "../store/store.js";
import { TICKS_KEY } from "./ticks.js";

// Values that more than one part changes (an imported variable can only be changed by its own module)
export const shared = {};

export var P;
var K, DESK;

// The settings: who is reading (js/store/store.js, which has opened IndexedDB before this runs) and their settings,
// upgraded from whichever version saved them (js/store/migrate.js keeps the steps and the defaults). Each person
// keeps their own text size, languages, English style, font, dhrupad, theme and high contrast; keep the screen on,
// location, layout and the Print pop-up's choices stay with the device.
export function init() {
  K = "aarti2-prefs";
  // A computer (no touch screen): the screen is kept on only if the reader turns it on
  DESK = !!(window.matchMedia && !matchMedia("(any-pointer:coarse)").matches);
  var saved = read(K),
    r = start(saved, read(TICKS_KEY), { desk: DESK, fs: dfs() });
  P = r.prefs;
  // written again: settings from an older version (now upgraded), the first visit with profiles, or a person whose
  // settings came from IndexedDB rather than from the boot copy
  if (r.first || r.saveBoot || JSON.stringify(boot()) !== JSON.stringify(saved)) save();
}

/** @param {string} k */
function read(k) {
  try {
    return JSON.parse(localStorage.getItem(k) || "null");
  } catch (e) {
    return null;
  }
}

// The boot copy: P with the id of the person reading (pid), so start-up knows whose settings these are. The previous
// version of the site reads the same key and ignores pid, so going back to it still works.
function boot() {
  var a = active();
  return Object.assign({}, P, a ? { pid: a.id } : {});
}

// Default text size: 28px on tablets, 24px on phones and computers (auto-fit may lower it).
export function dfs() {
  var s = Math.min(screen.width || innerWidth, screen.height || innerHeight),
    co = window.matchMedia && matchMedia("(pointer:coarse)").matches;
  return co && s >= 600 ? 28 : 24;
}

// Save the settings: at once to the boot copy in localStorage, and to the person's profile in IndexedDB a moment
// later (js/store/store.js)
export function save() {
  try {
    localStorage.setItem(K, JSON.stringify(boot()));
  } catch (e) {}
  saveSettings(P);
}

// Another person's settings (a switch, a delete or a restore; js/features/profiles.js): P is changed in place, so
// every part that holds it sees the new values
export function setAll(prefs) {
  for (var k in prefs) P[k] = prefs[k];
  save();
}

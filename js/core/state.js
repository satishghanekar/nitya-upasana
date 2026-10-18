// Settings (P), loaded from this device
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

// Values that more than one part changes (an imported variable can only be changed by its own module)
export const shared = {};

export var P;
var K, DESK, s, pk;

export function init() {
  K = "aarti2-prefs";
  // A computer (no touch screen): the screen is kept on only if the reader turns it on
  DESK = !!(window.matchMedia && !matchMedia("(any-pointer:coarse)").matches);
  P = {
    sv: 0, // settings version (see migrations below)
    fs: dfs(), // text size in px
    fsu: 0, // 1 = the reader chose the size (A−/A+/pinch), so auto-fit leaves it alone
    th: "auto", // theme: auto | light | sepia | dark
    lang: "mr", // shown now (the अ/A button): the main language, the second, or both
    lead: "mr", // main language (large text, first in Both): mr | en (Settings → Main language)
    l2: "en", // second language (smaller, under each line): en | mr, or "" for none (Settings → Second language)
    ui: "en", // menus, home page and buttons: en | mr (English, or the main language)
    ind: "mr", // which language the "mr" slot above shows: mr (Marathi, as written) | kn (the same words in Kannada
    // letters, made by SCR in js/render.js while the page loads). There are no Kannada menus yet, so menus stay English.
    ref: 1, // dhrupad: 1 = once at the top, 0 = repeated after every stanza
    hc: 0, // high contrast
    wake: DESK ? 0 : 1, // keep the screen on (phones and tablets; off by default on computers)
    cols: 0, // wide screens: 0 = automatic, 1 = one column, 2 = two columns
    loc: null, // { lat, lon } from "Use my location"
    hl: "", // data-l id of the highlighted (tapped) line
    por: "", // the page last chosen in the Print pop-up: "" not yet (CHOICE in js/print/profiles.js) | "up" Portrait | "land" Landscape
    fnt: "std", // text font: std | classic | bold | hand (Settings → Text font)
    pref: "", // dhrupad in the printout, picked in the Print pop-up: "" as on the page (ref) | 0 after every verse | 1 once
    pfn: "", // font of the printout, picked in the Print pop-up: "" the text font above | std | classic | bold | hand
    tr: "simple", // English text style: simple ("Sukhkarta") | iast ("sukhakartā", with Vedic accent marks)
    fold: 0, // home card folded to one slim line
    pf: 0, // Pooja section folded (for those who come only for the aartis)
    xf: 0, // Aarti section folded
    tf: 0, // home contents list folded
    af: [], // ids of folded pieces
    as: 3, // autoscroll speed for an aarti not yet adjusted, 1 (slow) to 10 (fast)
    ason: 0, // show the autoscroll button in the bottom bar (Settings switch)
    asp: {}, // autoscroll speed per piece (each has its own tempo): { a1: 3, p1: 4, … }
  };
  try {
    s = JSON.parse(localStorage.getItem(K) || "{}");
    for (pk in P) {
      if (s[pk] !== undefined) P[pk] = s[pk];
    }
  } catch (e) {}
  // Migrations for settings saved by older versions of the site
  if (P.sv < 4) {
    if (P.sv < 3) P.ref = 1; // v3: dhrupad shown once by default
    P.wake = 1; // v4: keep screen on by default
    P.sv = 4;
    save();
  }
  if (P.sv < 5) {
    if (DESK) P.wake = 0; // v5: computers no longer keep the screen on by default
    P.sv = 5;
    save();
  }
  if (P.sv < 6) {
    // v6: a main and a second language; "In Both, show first" became the main language
    P.l2 = P.lead === "en" ? "mr" : "en";
    P.sv = 6;
    save();
  }
  // Keep the language choices consistent: two different languages, English menus when English is the main one,
  // and only the chosen languages shown
  if (P.lead !== "en") P.lead = "mr";
  if (P.l2 === P.lead || ["mr", "en", ""].indexOf(P.l2) < 0) P.l2 = P.lead === "en" ? "mr" : "en";
  if (P.ind !== "kn") P.ind = "mr";
  if (P.por !== "land" && P.por !== "up") P.por = "";
  if (P.lead === "en" || P.ind !== "mr") P.ui = "en";
  if (!P.l2 || [P.lead, P.l2, "both"].indexOf(P.lang) < 0) P.lang = P.lead;
}

// Default text size: 28px on tablets, 24px on phones and computers (auto-fit may lower it).
export function dfs() {
  var s = Math.min(screen.width || innerWidth, screen.height || innerHeight),
    co = window.matchMedia && matchMedia("(pointer:coarse)").matches;
  return co && s >= 600 ? 28 : 24;
}

export function save() {
  try {
    localStorage.setItem(K, JSON.stringify(P));
  } catch (e) {}
}

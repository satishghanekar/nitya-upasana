// Moving today's settings (docs/architecture.md §3.8): settings saved by every older version of the site, in the
// shapes found in the git history of js/core/state.js (and, before the code was split into files, of the settings
// script in index.html), upgraded by js/store/migrate.js exactly as js/core/state.js always did, and split into the
// person's part and the device's part.
import { describe, expect, test } from "vitest";
import { cleanPerson, defaults, DEVICE_KEYS, devicePart, joinPrefs, migratePrefs, PROFILE_KEYS, profilePart, SETTINGS_VERSION } from "../../js/store/migrate.js";

const PHONE = { desk: false, fs: 24 };
const DESK = { desk: true, fs: 24 };
const TABLET = { desk: false, fs: 28 };

// What each version saved (JSON.stringify(P) of that version, with a reader's choices in it)
const SHAPES = {
  // before settings versions (sv missing): the very first site
  v0: { fs: 26, fsu: 1, th: "dark", lang: "both", ui: "mr", ref: 0, hc: 1, wake: 0, tr: "simple" },
  // sv 2: before "dhrupad once" became the default
  v2: { sv: 2, fs: 22, th: "sepia", lang: "en", ui: "en", ref: 0, hc: 0, wake: 0, cols: 2 },
  // 3b27c05 (2026-10-14, "Copy all files from sankashti-chaturthi"): sv 4
  v4: { sv: 4, fs: 30, fsu: 1, th: "light", lang: "mr", ui: "mr", ref: 1, hc: 0, wake: 1, cols: 0, loc: { lat: 40.1, lon: -83.1 }, hl: "s1l3", tr: "iast", fold: 1, pf: 1, xf: 0, tf: 1, af: ["a3"] },
  // b56f95d (2026-10-14): sv 5, autoscroll speeds added
  v5: { sv: 5, fs: 24, fsu: 0, th: "auto", lang: "both", ui: "en", ref: 0, hc: 0, wake: 0, cols: 1, loc: null, hl: "", tr: "simple", fold: 0, pf: 0, xf: 1, tf: 0, af: [], as: 5, ason: 1, asp: { a1: 4 } },
  // eec4308 (2026-10-15): text fonts
  v5font: { sv: 5, fs: 24, th: "dark", lang: "mr", ui: "mr", ref: 1, hc: 0, wake: 1, fnt: "hand", tr: "simple", af: [], as: 3, ason: 0, asp: {} },
  // ca0bf0c (2026-10-17): "In Both, show first" (lead), still sv 5
  v5lead: { sv: 5, fs: 24, th: "auto", lang: "both", lead: "en", ui: "mr", ref: 1, hc: 0, wake: 1, fnt: "classic", tr: "simple", af: [], as: 3, ason: 0, asp: {} },
  // ed0fa0a (2026-10-17): sv 6, a main and a second language, Kannada letters, the Print page
  v6: { sv: 6, fs: 26, fsu: 1, th: "sepia", lang: "en", lead: "mr", l2: "en", ui: "en", ind: "kn", ref: 1, hc: 1, wake: 0, cols: 0, loc: null, hl: "s2l1", por: "land", fnt: "bold", tr: "iast", fold: 0, pf: 0, xf: 0, tf: 0, af: ["a9"], as: 3, ason: 0, asp: {} },
  // e0dfa0a and after (2026-10-18, version 1.3): the Print pop-up's dhrupad and font
  v6print: { sv: 6, fs: 24, fsu: 0, th: "auto", lang: "mr", lead: "mr", l2: "", ui: "mr", ind: "mr", ref: 0, hc: 0, wake: 1, cols: 0, loc: null, hl: "", por: "up", fnt: "std", pref: 1, pfn: "classic", tr: "simple", fold: 1, pf: 0, xf: 0, tf: 0, af: [], as: 3, ason: 0, asp: {} },
};

describe("settings from every older version are upgraded as js/core/state.js always did", () => {
  test("no settings at all (a first visit): the defaults, at today's version", () => {
    const { prefs, changed } = migratePrefs(null, PHONE);
    expect(changed).toBe(true);
    expect(prefs).toEqual({ ...defaults(PHONE), sv: 6, wake: 1 });
    expect(migratePrefs(undefined, DESK).prefs.wake).toBe(0);
    expect(migratePrefs({}, TABLET).prefs.fs).toBe(28);
  });

  test("v0 (no version): dhrupad once again, screen kept on, English as the second language", () => {
    const { prefs, changed } = migratePrefs(SHAPES.v0, PHONE);
    expect(changed).toBe(true);
    expect(prefs.sv).toBe(SETTINGS_VERSION);
    expect(prefs.ref).toBe(1); // v3
    expect(prefs.wake).toBe(1); // v4
    expect([prefs.lead, prefs.l2, prefs.lang]).toEqual(["mr", "en", "both"]); // v6
    expect([prefs.fs, prefs.fsu, prefs.th, prefs.hc, prefs.ui]).toEqual([26, 1, "dark", 1, "mr"]);
  });

  test("v0 on a computer: the screen is not kept on (v5)", () => {
    expect(migratePrefs(SHAPES.v0, DESK).prefs.wake).toBe(0);
  });

  test("v2: dhrupad once by default (v3), English kept as shown", () => {
    const p = migratePrefs(SHAPES.v2, PHONE).prefs;
    expect([p.ref, p.wake, p.lang, p.lead, p.l2, p.cols, p.th]).toEqual([1, 1, "en", "mr", "en", 2, "sepia"]);
  });

  test("v4: the reader's dhrupad and screen choices stay; folds, location and the highlighted line carry over", () => {
    const p = migratePrefs(SHAPES.v4, PHONE).prefs;
    expect([p.ref, p.wake, p.tr, p.hl, p.fold, p.tf]).toEqual([1, 1, "iast", "s1l3", 1, 1]);
    // the Pooja / Aarti section folds were removed (v1.20.3): their saved values are dropped
    expect([p.pf, p.xf]).toEqual([undefined, undefined]);
    expect(p.loc).toEqual({ lat: 40.1, lon: -83.1 });
    expect(p.af).toEqual(["a3"]);
    expect(migratePrefs(SHAPES.v4, DESK).prefs.wake).toBe(0); // v5 on a computer
  });

  test("v5: autoscroll speeds kept, dhrupad after every verse kept", () => {
    const p = migratePrefs(SHAPES.v5, DESK).prefs;
    expect([p.ref, p.as, p.ason, p.wake, p.cols]).toEqual([0, 5, 1, 0, 1]);
    expect(p.asp).toEqual({ a1: 4 });
    expect([p.lead, p.l2, p.lang]).toEqual(["mr", "en", "both"]);
  });

  test("v5 with fonts: the font kept", () => {
    const p = migratePrefs(SHAPES.v5font, PHONE).prefs;
    expect([p.fnt, p.th, p.ui, p.lang]).toEqual(["hand", "dark", "mr", "mr"]);
  });

  test("v5 with English first in Both: English becomes the main language, Marathi the second, menus English", () => {
    const p = migratePrefs(SHAPES.v5lead, PHONE).prefs;
    expect([p.lead, p.l2, p.lang, p.ui, p.fnt]).toEqual(["en", "mr", "both", "en", "classic"]);
  });

  test("v6 (Kannada letters, IAST, Landscape printing): nothing to upgrade; Kannada keeps English menus", () => {
    const { prefs, changed } = migratePrefs(SHAPES.v6, PHONE);
    expect(changed).toBe(false);
    expect([prefs.ind, prefs.ui, prefs.tr, prefs.por, prefs.fnt, prefs.hc, prefs.fsu, prefs.fs]).toEqual(["kn", "en", "iast", "land", "bold", 1, 1, 26]);
    expect(prefs.af).toEqual(["a9"]);
  });

  test("v6 with the Print pop-up's choices (version 1.3): kept as they are", () => {
    const { prefs, changed } = migratePrefs(SHAPES.v6print, PHONE);
    expect(changed).toBe(false);
    // no second language: only the main language is shown
    expect([prefs.l2, prefs.lang, prefs.ref, prefs.pref, prefs.pfn, prefs.por, prefs.fold]).toEqual(["", "mr", 0, 1, "classic", "up", 1]);
  });

  test("every shape comes out with every setting, and nothing else", () => {
    for (const [name, s] of Object.entries(SHAPES)) {
      const p = migratePrefs({ ...s, junk: 1, pid: "p1" }, PHONE).prefs;
      expect(Object.keys(p).sort(), name).toEqual(Object.keys(defaults(PHONE)).sort());
    }
  });

  test("damaged values are replaced by defaults, never trusted", () => {
    const p = migratePrefs({ sv: 6, fs: "huge", th: "neon", fnt: 3, af: "a1", asp: [1], loc: { lat: "x" }, lang: "fr", l2: "de", pref: "1", tr: "other" }, PHONE).prefs;
    expect([p.fs, p.th, p.fnt, p.lang, p.l2, p.pref, p.tr]).toEqual([24, "auto", "std", "mr", "en", "", "simple"]);
    expect(p.af).toEqual([]);
    expect(p.asp).toEqual({});
    expect(p.loc).toBeNull();
  });

  test("the same settings migrated twice give the same result", () => {
    for (const s of Object.values(SHAPES)) {
      const once = migratePrefs(s, PHONE).prefs;
      expect(migratePrefs(once, PHONE)).toEqual({ prefs: once, changed: false });
    }
  });
});

describe("a person's settings and the device's", () => {
  test("every setting belongs to exactly one side (Q4: theme and high contrast are per person)", () => {
    const all = Object.keys(defaults(PHONE)).sort();
    expect([...PROFILE_KEYS, ...DEVICE_KEYS].sort()).toEqual(all);
    expect(PROFILE_KEYS.filter((k) => DEVICE_KEYS.includes(k))).toEqual([]);
    for (const k of ["fs", "lang", "lead", "l2", "ui", "ind", "tr", "th", "hc"]) expect(PROFILE_KEYS).toContain(k);
    for (const k of ["wake", "loc", "cols"]) expect(DEVICE_KEYS).toContain(k);
  });

  test("split and joined again, the settings are the same", () => {
    for (const s of Object.values(SHAPES)) {
      const p = migratePrefs(s, PHONE).prefs;
      expect(joinPrefs(profilePart(p), devicePart(p), PHONE)).toEqual(p);
    }
  });

  test("the parts are copies: changing one doesn't change the settings", () => {
    const p = migratePrefs(SHAPES.v6, PHONE).prefs,
      part = profilePart(p);
    part.af.push("a1");
    expect(p.af).toEqual(["a9"]);
  });

  test("a person's settings from a file are cleaned: only their keys, each of the right kind", () => {
    const c = cleanPerson({ fs: 30, th: "dark", wake: 0, evil: "<script>", af: [1, "a2"] }, PHONE);
    expect(Object.keys(c).sort()).toEqual([...PROFILE_KEYS].sort());
    expect([c.fs, c.th]).toEqual([30, "dark"]);
    expect(c.af).toEqual(defaults(PHONE).af); // a list with a number in it is not a list of piece ids
    expect(cleanPerson(null, PHONE).fs).toBe(24);
  });
});

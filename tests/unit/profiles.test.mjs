// People on a shared phone (js/store/profiles.js): names, badge letters, colours, who can be deleted, cleaning a
// profile read back, and the start-up plan (the first visit moves today's settings and ticks into the first person;
// later the boot copy in localStorage wins for the person reading).
import { describe, expect, test } from "vitest";
import {
  canAdd,
  canDelete,
  cleanChecklist,
  cleanInitials,
  cleanName,
  cleanProfile,
  COLOURS,
  FIRST_NAME,
  initialsOf,
  makeId,
  MAX_PROFILES,
  nameProblem,
  newProfile,
  nextColour,
  startPlan,
} from "../../js/store/profiles.js";
import { defaults, migratePrefs, profilePart } from "../../js/store/migrate.js";

const ENV = { desk: false, fs: 24 };
const NOW = "2026-10-18T19:00:00.000Z";
const person = (id, name, extra = {}) =>
  newProfile({ id, name, colour: COLOURS[0].v, settings: profilePart(defaults(ENV)), now: NOW, ...extra });
let n = 0;
const ids = () => "p" + ++n;

describe("names, badge letters and colours", () => {
  test("names are trimmed, spaces collapsed, kept to 24 letters", () => {
    expect(cleanName("  Aaji \n Ghanekar ")).toBe("Aaji Ghanekar");
    expect(cleanName("x".repeat(40))).toHaveLength(24);
    expect(cleanName("\u0000")).toBe("");
  });

  test("badge letters from a name: the first letters of two words, or the first two letters of an Indian-script name", () => {
    expect(initialsOf("Aai")).toBe("A");
    expect(initialsOf("aaji ghanekar")).toBe("AG");
    expect(initialsOf("आई")).toBe("आई");
    expect(initialsOf("बाबा")).toBe("बाबा");
    expect(initialsOf("आजोबा")).toBe("आजो");
    // a conjunct with its vowel sign counts as one letter
    expect(initialsOf("क्षितिज")).toBe("क्षिति");
    expect(initialsOf("")).toBe("");
  });

  test("typed badge letters are kept (at most four letters as a reader sees them); empty ones come from the name", () => {
    expect(cleanInitials("आई", "Aai")).toBe("आई");
    expect(cleanInitials("ABCDEFG", "x")).toBe("ABCD");
    expect(cleanInitials(" ", "Baba")).toBe("B");
  });

  test("a new person gets the first colour no one has; every colour is offered once", () => {
    expect(new Set(COLOURS.map((c) => c.v)).size).toBe(COLOURS.length);
    const list = [person("a", "A"), person("b", "B", { colour: COLOURS[1].v })];
    expect(nextColour(list)).toBe(COLOURS[2].v);
  });

  test("white letters on every badge colour meet WCAG AA (4.5:1)", () => {
    const lum = (hex) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    for (const c of COLOURS) expect((1.05 / (lum(c.v) + 0.05)), c.en).toBeGreaterThanOrEqual(4.5);
  });

  test("a name can't be empty or the same as another person's (case ignored); renaming to your own name is fine", () => {
    const list = [person("a", "Aai"), person("b", "Baba")];
    expect(nameProblem("  ", list)).toBe("empty");
    expect(nameProblem("aai", list)).toBe("taken");
    expect(nameProblem("Aai", list, "a")).toBe("");
    expect(nameProblem("Aaji", list)).toBe("");
  });

  test("ids are new each time", () => {
    const list = [person("p000001", "A")];
    let i = 0;
    const seq = [1 / 2176782336, 2 / 2176782336];
    expect(makeId(list, () => seq[i++])).toBe("p000002");
  });
});

describe("adding and deleting", () => {
  test("never the last person; room for eight", () => {
    const one = [person("a", "A")];
    expect(canDelete(one, "a")).toBe(false);
    expect(canDelete([...one, person("b", "B")], "a")).toBe(true);
    expect(canDelete(one, "zz")).toBe(false);
    expect(canAdd(Array.from({ length: MAX_PROFILES - 1 }, (_, i) => person("x" + i, "X" + i)))).toBe(true);
    expect(canAdd(Array.from({ length: MAX_PROFILES }, (_, i) => person("x" + i, "X" + i)))).toBe(false);
  });
});

describe("a profile read back (IndexedDB or a file) is cleaned", () => {
  test("a good one keeps its values", () => {
    const p = person("pabc", "आई", { initials: "आई", colour: COLOURS[3].v, checklist: { date: "2026-10-18", done: { evening: ["sukhkarta"] } } });
    expect(cleanProfile(JSON.parse(JSON.stringify(p)), ENV)).toEqual(p);
  });
  test("an unusable one is dropped; a damaged one is mended", () => {
    expect(cleanProfile(null, ENV)).toBeNull();
    expect(cleanProfile({ id: "a b<", name: "X" }, ENV)).toBeNull();
    expect(cleanProfile({ id: "ok", name: "   " }, ENV)).toBeNull();
    const p = cleanProfile({ id: "ok", name: "Baba", colour: "red", settings: { fs: "big" }, checklist: { date: "yesterday" } }, ENV);
    expect(p.colour).toBe(COLOURS[0].v);
    expect(p.initials).toBe("B");
    expect(p.settings.fs).toBe(24);
    expect(p.checklist).toBeNull();
  });
  test("ticks: only lists of text ids", () => {
    expect(cleanChecklist({ date: "2026-10-18", done: { evening: ["a", 3, null], x: "no" } })).toEqual({ date: "2026-10-18", done: { evening: ["a"] } });
  });
});

describe("start-up: who is reading and their settings", () => {
  const V13 = { sv: 6, fs: 30, fsu: 1, th: "dark", lang: "both", lead: "mr", l2: "en", ui: "mr", wake: 0, loc: { lat: 1, lon: 2 }, fnt: "classic" };
  const TICKS = { v: 1, profiles: { family: { date: "2026-10-18", done: { evening: ["sukhkarta", "durge-durghat-bhari"] } } } };

  test("first visit after version 1.3: today's settings and ticks become the first person, 'Me'", () => {
    const r = startPlan({ profiles: [], meta: null, saved: V13, ticks: TICKS, env: ENV, now: NOW, id: () => "pfirst" });
    expect(r.first).toBe(true);
    expect(r.profiles).toHaveLength(1);
    const p = r.profiles[0];
    expect([p.id, p.name, p.initials, p.colour]).toEqual(["pfirst", FIRST_NAME, "M", COLOURS[0].v]);
    expect([p.settings.fs, p.settings.th, p.settings.lang, p.settings.ui, p.settings.fnt]).toEqual([30, "dark", "both", "mr", "classic"]);
    expect(p.checklist).toEqual(TICKS.profiles.family);
    expect(r.meta.activeProfile).toBe("pfirst");
    expect(r.meta.device.loc).toEqual({ lat: 1, lon: 2 });
    expect(r.meta.device.wake).toBe(0);
    expect(r.meta.since).toBe(NOW);
    expect(r.prefs).toEqual(migratePrefs(V13, ENV).prefs);
    expect(r.write).toEqual(["pfirst"]);
    expect(r.writeMeta).toBe(true);
  });

  test("first visit from an old version (sv 4): the settings are upgraded on the way", () => {
    const r = startPlan({ profiles: [], meta: null, saved: { sv: 4, ref: 0, lang: "en" }, ticks: null, env: ENV, now: NOW, id: ids });
    expect([r.prefs.sv, r.prefs.l2, r.profiles[0].settings.ref]).toEqual([6, "en", 0]);
    expect(r.profiles[0].checklist).toBeNull();
  });

  test("a brand-new phone (nothing saved): one person with the defaults", () => {
    const r = startPlan({ profiles: [], meta: null, saved: null, ticks: null, env: ENV, now: NOW, id: ids });
    expect(r.profiles[0].settings).toEqual(profilePart(migratePrefs(null, ENV).prefs));
  });

  test("later visits: the boot copy names its person and wins for them (it is written first)", () => {
    const a = person("pa", "Aai"),
      b = person("pb", "Baba", { settings: { ...profilePart(defaults(ENV)), fs: 40 } });
    const meta = { activeProfile: "pa", device: { sv: 6, wake: 1, cols: 0, loc: null, por: "", pfn: "", pref: "", fold: 0 }, since: NOW, lastBackup: "", snooze: "", schema: 1 };
    // Baba was switched to, and the boot copy says so, but IndexedDB's meta didn't get there before the page closed
    const r = startPlan({ profiles: [a, b], meta, saved: { ...defaults(ENV), sv: 6, fs: 44, pid: "pb" }, ticks: null, env: ENV, now: NOW, id: ids });
    expect(r.meta.activeProfile).toBe("pb");
    expect(r.prefs.fs).toBe(44);
    expect(r.write).toEqual(["pb"]);
    expect(r.profiles[1].settings.fs).toBe(44);
    expect(r.saveBoot).toBe(false);
  });

  test("a boot copy with no person (written by version 1.3 again, after going back and forth) is the active person's", () => {
    const a = person("pa", "Aai");
    const meta = { activeProfile: "pa", device: {}, since: NOW, lastBackup: "", snooze: "", schema: 1 };
    const r = startPlan({ profiles: [a], meta, saved: { sv: 6, fs: 33, lang: "en" }, ticks: null, env: ENV, now: NOW, id: ids });
    expect([r.prefs.fs, r.prefs.lang, r.first]).toEqual([33, "en", false]);
    expect(r.profiles[0].settings.fs).toBe(33);
  });

  test("no boot copy (site data partly cleared): the active person's settings come from IndexedDB", () => {
    const a = person("pa", "Aai", { settings: { ...profilePart(defaults(ENV)), th: "sepia", fs: 36, fsu: 1 } });
    const meta = { activeProfile: "pa", device: { wake: 0 }, since: NOW, lastBackup: "", snooze: "", schema: 1 };
    const r = startPlan({ profiles: [a], meta, saved: null, ticks: null, env: ENV, now: NOW, id: ids });
    expect([r.prefs.th, r.prefs.fs, r.prefs.wake]).toEqual(["sepia", 36, 0]);
    expect(r.saveBoot).toBe(true);
    expect(r.write).toEqual([]);
  });

  test("a boot copy for a person who was deleted: the active person's own settings, the device's from the copy", () => {
    const a = person("pa", "Aai", { settings: { ...profilePart(defaults(ENV)), fs: 36, fsu: 1 } });
    const meta = { activeProfile: "pa", device: {}, since: NOW, lastBackup: "", snooze: "", schema: 1 };
    const r = startPlan({ profiles: [a], meta, saved: { sv: 6, fs: 20, pid: "gone", cols: 2 }, ticks: null, env: ENV, now: NOW, id: ids });
    expect([r.meta.activeProfile, r.prefs.fs, r.prefs.cols]).toEqual(["pa", 36, 2]);
  });
});

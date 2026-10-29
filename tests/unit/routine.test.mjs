// Each person's own routine (the routine builder, js/features/routine-builder.js): the
// rules for the lists (js/core/routine.js: the same every day or different by weekday, copying a day's list to other
// days, moving, adding and removing texts, cleaning what is read back), the routine kept in the profile
// (js/store/profiles.js, js/store/store.js on fake-indexeddb), and backups: a file with routines restores them, a file
// from before version 1.9 (no routine) leaves the default (content/routines.json, Q5).
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test } from "vitest";
import {
  addTexts,
  byWeekday,
  cleanList,
  cleanRoutine,
  copyDays,
  DAY_KEYS,
  editable,
  MAX_TEXTS,
  moveItem,
  removeText,
  routinePart,
  setList,
  setMode,
  textsFor,
  WEEK_ORDER,
} from "../../js/core/routine.js";
import { cleanProfile, COLOURS, newProfile } from "../../js/store/profiles.js";
import { makeBackup, parseBackup, serialise, sha256 } from "../../js/store/backup.js";
import { defaults, devicePart, migratePrefs, profilePart } from "../../js/store/migrate.js";
import * as store from "../../js/store/store.js";
import { matches, searchKey } from "../../js/features/text-picker.js";

const ROUTINE = JSON.parse(readFileSync(new URL("../../content/routines.json", import.meta.url), "utf8"));
const ENV = { desk: false, fs: 24 };
const NOW = "2026-10-19T19:00:00.000Z";
const MON = 1,
  TUE = 2,
  THU = 4,
  SUN = 0;
// The rules below are shown on a simple routine of the shape the builder starts from: one list each session, every day
// (the bundled default, content/routines.json, now differs by weekday; its own tests are in today.test.mjs)
const AARTIS = ["aarti-sukhkarta", "aarti-durge-durghat-bhari", "aarti-lavathavati-vikrala", "aarti-ghalin-lotangan"];
const SIMPLE = {
  morning: { mode: "fixed", texts: ["vedic-chant-atharvashirsha"] },
  afternoon: { mode: "fixed", texts: [] },
  evening: { mode: "fixed", texts: AARTIS },
};

describe("the rules for a person's lists", () => {
  test("a person with no routine of their own edits a copy of the default (content/routines.json), unchanged", () => {
    expect(editable(null, ROUTINE)).toEqual(ROUTINE);
    // the copy is the person's own: changing it leaves the default as it was
    const DEF = {
      morning: { mode: "weekday", days: { mon: ["aarti-sukhkarta"] } },
      afternoon: { mode: "fixed", texts: [] },
      evening: { mode: "fixed", texts: [] },
    };
    const r = editable(null, DEF);
    r.morning.days.mon.push("x");
    expect(DEF.morning.days.mon).not.toContain("x");
    r.evening.texts.push("x");
    expect(DEF.evening.texts).not.toContain("x");
    // their own wins when they have one; nothing at all gives three empty sessions
    expect(editable({ morning: { mode: "fixed", texts: ["aarti-sukhkarta"] } }, ROUTINE).morning.texts).toEqual(["aarti-sukhkarta"]);
    expect(editable(null, null)).toEqual({
      morning: { mode: "fixed", texts: [] },
      afternoon: { mode: "fixed", texts: [] },
      evening: { mode: "fixed", texts: [] },
    });
  });

  test("Same every day → Different by weekday: every day starts with the one list; back again takes the day shown", () => {
    let r = editable(null, SIMPLE);
    expect(byWeekday(r, "evening")).toBe(false);
    r = setMode(r, "evening", "weekday", MON);
    expect(byWeekday(r, "evening")).toBe(true);
    expect(Object.keys(r.evening.days)).toEqual(DAY_KEYS);
    for (let d = 0; d < 7; d++) expect(textsFor(r, d, "evening")).toEqual(AARTIS);
    r = setList(r, "evening", THU, ["aarti-ghalin-lotangan", "aarti-sukhkarta"]);
    expect(textsFor(r, THU, "evening")).toEqual(["aarti-ghalin-lotangan", "aarti-sukhkarta"]);
    expect(textsFor(r, MON, "evening")).toEqual(AARTIS);
    // the same every day, from Thursday: Thursday's list for every day
    const fixed = setMode(r, "evening", "fixed", THU);
    expect(fixed.evening).toEqual({ mode: "fixed", texts: ["aarti-ghalin-lotangan", "aarti-sukhkarta"] });
    // the shape stays what content/routines.json uses
    expect(fixed.morning).toEqual(SIMPLE.morning);
  });

  test("Copy to other days…: the day's list given to the days chosen, never to itself; a one-list session is unchanged", () => {
    let r = setMode(editable(null, SIMPLE), "morning", "weekday", MON);
    r = setList(r, "morning", MON, ["vedic-chant-atharvashirsha", "aarti-sukhkarta"]);
    const c = copyDays(r, "morning", MON, [TUE, THU, MON, 9, -1]);
    expect(textsFor(c, TUE, "morning")).toEqual(["vedic-chant-atharvashirsha", "aarti-sukhkarta"]);
    expect(textsFor(c, THU, "morning")).toEqual(["vedic-chant-atharvashirsha", "aarti-sukhkarta"]);
    expect(textsFor(c, SUN, "morning")).toEqual(["vedic-chant-atharvashirsha"]);
    // the lists are copies: changing Tuesday later leaves Monday alone
    const c2 = setList(c, "morning", TUE, []);
    expect(textsFor(c2, MON, "morning")).toEqual(["vedic-chant-atharvashirsha", "aarti-sukhkarta"]);
    // nothing changes in what was given
    expect(textsFor(r, TUE, "morning")).toEqual(["vedic-chant-atharvashirsha"]);
    const f = editable(null, SIMPLE);
    expect(copyDays(f, "evening", MON, [TUE])).toEqual(f);
  });

  test("a list in a session with one list is that list for every day", () => {
    const r = setList(editable(null, ROUTINE), "afternoon", THU, ["aarti-jai-jagdish-hare"]);
    expect(r.afternoon).toEqual({ mode: "fixed", texts: ["aarti-jai-jagdish-hare"] });
    for (let d = 0; d < 7; d++) expect(textsFor(r, d, "afternoon")).toEqual(["aarti-jai-jagdish-hare"]);
  });

  test("moving a text up and down (kept inside the list), as the ↑ ↓ buttons and Alt+↑/↓ do", () => {
    const l = ["a", "b", "c", "d", "e"];
    expect(moveItem(l, 4, 2)).toEqual(["a", "b", "e", "c", "d"]);
    expect(moveItem(l, 0, 1)).toEqual(["b", "a", "c", "d", "e"]);
    expect(moveItem(l, 1, 0)).toEqual(["b", "a", "c", "d", "e"]);
    expect(moveItem(l, 0, -1)).toEqual(l);
    expect(moveItem(l, 4, 5)).toEqual(l);
    expect(moveItem(l, 7, 0)).toEqual(l);
    expect(l).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("adding texts at the end (once each) and removing one", () => {
    expect(addTexts(["a", "b"], ["c", "a", "d"])).toEqual(["a", "b", "c", "d"]);
    expect(removeText(["a", "b", "c"], "b")).toEqual(["a", "c"]);
    expect(removeText(["a"], "x")).toEqual(["a"]);
  });

  test("a routine printout's link carries just the days and sessions printed", () => {
    let r = setMode(editable(null, SIMPLE), "evening", "weekday", MON);
    r = setList(r, "evening", THU, ["aarti-ghalin-lotangan"]);
    const part = routinePart(r, [MON, THU], ["evening"]);
    expect(Object.keys(part.evening.days).sort()).toEqual([DAY_KEYS[MON], DAY_KEYS[THU]].sort());
    expect(textsFor(part, MON, "evening")).toEqual(AARTIS);
    expect(textsFor(part, THU, "evening")).toEqual(["aarti-ghalin-lotangan"]);
    expect(textsFor(part, 0, "evening")).toEqual([]);
    // a session not printed: no texts
    expect(part.morning).toEqual({ mode: "fixed", texts: [] });
    // read back as Safari does, the same
    expect(textsFor(cleanRoutine(JSON.parse(JSON.stringify(part))), THU, "evening")).toEqual(["aarti-ghalin-lotangan"]);
  });

  test("the builder's week row starts on Monday", () => {
    expect(WEEK_ORDER.map((d) => DAY_KEYS[d])).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  });
});

describe("a routine read back (IndexedDB or a file) is cleaned, never trusted", () => {
  test("none, or not an object: null (the default routine)", () => {
    for (const x of [undefined, null, "x", 3, [], true]) expect(cleanRoutine(x)).toBeNull();
  });

  test("a good one keeps its values; the default file reads back the same", () => {
    expect(cleanRoutine(ROUTINE)).toEqual(ROUTINE);
    const w = setMode(editable(null, ROUTINE), "evening", "weekday", MON);
    expect(cleanRoutine(JSON.parse(JSON.stringify(w)))).toEqual(w);
  });

  test("damaged parts are mended: unknown modes, missing days, repeats, non-ids, too many", () => {
    const r = cleanRoutine({
      morning: { mode: "sometimes", texts: ["aarti-sukhkarta"] },
      afternoon: { mode: "weekday", days: { mon: ["aarti-sukhkarta", "aarti-sukhkarta", 7, "<b>", ""], tue: "aarti-sukhkarta" } },
      evening: { mode: "fixed", texts: Array.from({ length: 80 }, (_, i) => "t" + i) },
      extra: { mode: "fixed", texts: ["x"] },
    });
    expect(r.morning).toEqual({ mode: "fixed", texts: ["aarti-sukhkarta"] });
    expect(r.afternoon.mode).toBe("weekday");
    expect(Object.keys(r.afternoon.days)).toEqual(DAY_KEYS);
    expect(r.afternoon.days.mon).toEqual(["aarti-sukhkarta"]);
    expect(r.afternoon.days.tue).toEqual([]);
    expect(r.evening.texts).toHaveLength(MAX_TEXTS);
    expect(r).not.toHaveProperty("extra");
    expect(cleanList(["a", "a", "b c", "ok-1"])).toEqual(["a", "ok-1"]);
  });

  test("a text no longer in the library stays in the list (Home shows only those it has)", () => {
    const r = cleanRoutine({ evening: { mode: "fixed", texts: ["aarti-sukhkarta", "gone-text"] } });
    expect(textsFor(r, MON, "evening")).toEqual(["aarti-sukhkarta", "gone-text"]);
  });
});

describe("the routine in a profile and in a backup file", () => {
  const settings = profilePart(defaults(ENV));
  const MINE = setList(setMode(editable(null, ROUTINE), "evening", "weekday", MON), "evening", THU, ["aarti-ghalin-lotangan"]);

  test("a new person has none (they follow content/routines.json, Q5); a profile from before 1.9 reads as none", () => {
    expect(newProfile({ id: "p1", name: "Aai", settings, now: NOW }).routine).toBeNull();
    const old = { id: "p1", name: "Aai", initials: "A", colour: COLOURS[0].v, settings, checklist: null, created: NOW, updated: NOW };
    expect(cleanProfile(old, ENV).routine).toBeNull();
    expect(cleanProfile({ ...old, routine: MINE }, ENV).routine).toEqual(MINE);
    expect(cleanProfile({ ...old, routine: "everything" }, ENV).routine).toBeNull();
  });

  test("a backup keeps each person's routine, and reads back unchanged", () => {
    const aai = newProfile({ id: "paai", name: "Aai", settings, routine: MINE, now: NOW });
    const me = newProfile({ id: "pme", name: "Me", settings, now: NOW });
    const text = serialise(makeBackup({ profiles: [aai, me], activeProfile: "paai", device: devicePart(defaults(ENV)) }, { app: "aarti-v1.9", created: NOW }));
    expect(JSON.parse(text).payload.profiles[0].routine).toEqual(MINE);
    const r = parseBackup(text, ENV);
    expect(r.ok).toBe(true);
    expect(r.data.profiles.map((p) => p.routine)).toEqual([MINE, null]);
  });

  test("a backup from version 1.7 (no routine in it) restores everyone on the default routine", () => {
    const old = {
      profiles: [
        {
          id: "paai",
          name: "Aai",
          initials: "A",
          colour: COLOURS[0].v,
          settings,
          checklist: { date: "2026-10-18", done: { evening: ["aarti-sukhkarta"] } },
          created: NOW,
          updated: NOW,
        },
      ],
      activeProfile: "paai",
      settings: devicePart(defaults(ENV)),
    };
    const text = JSON.stringify({
      format: "nitya",
      schema: 1,
      kind: "backup",
      app: "aarti-v1.7",
      created: NOW,
      payload: old,
      sha256: sha256(JSON.stringify(old)),
    });
    const r = parseBackup(text, ENV);
    expect(r.ok).toBe(true);
    expect(r.data.profiles[0].routine).toBeNull();
    expect(r.data.profiles[0].checklist.done.evening).toEqual(["aarti-sukhkarta"]);
  });
});

describe("the store keeps the reading person's routine", () => {
  let idb;
  async function load(db) {
    store._reset();
    await store.openStore({ idb: db, timeout: 500 });
    return store.start(null, null, ENV, new Date(NOW));
  }
  beforeEach(() => {
    idb = new IDBFactory();
  });

  test("none at first; a change is kept in IndexedDB for that person only, and null goes back to the default", async () => {
    await load(idb);
    expect(store.routine()).toBeNull();
    const mine = setList(editable(null, ROUTINE), "afternoon", MON, ["aarti-jai-jagdish-hare"]);
    store.setRoutine(mine);
    expect(store.routine()).toEqual(mine);
    // a copy: changing what was returned changes nothing kept
    store.routine().afternoon.texts.push("x");
    expect(store.routine()).toEqual(mine);
    const baba = store.add({ name: "Baba" }).profile;
    expect(baba.routine).toBeNull();
    store.switchTo(baba.id, migratePrefs(null, ENV).prefs);
    expect(store.routine()).toBeNull();
    await store.settled();
    await load(idb);
    expect(store.list().map((p) => p.routine)).toEqual([mine, null]);
    store.switchTo(store.list()[0].id, migratePrefs(null, ENV).prefs);
    store.setRoutine(null);
    await store.settled();
    await load(idb);
    expect(store.list()[0].routine).toBeNull();
  });

  test("backup → restore on another phone brings the routine back", async () => {
    await load(idb);
    const mine = setMode(editable(null, ROUTINE), "evening", "weekday", THU);
    store.setRoutine(mine);
    const text = serialise(makeBackup(store.exportData(), { app: "aarti-v1.9", created: NOW }));
    const other = new IDBFactory();
    await load(other);
    expect(store.routine()).toBeNull();
    await store.restore(parseBackup(text, ENV).data);
    expect(store.routine()).toEqual(mine);
    await load(other);
    expect(store.routine()).toEqual(mine);
  });
});

describe("the Add texts picker's search", () => {
  const T = { id: "aarti-ghalin-lotangan", title: "घालीन लोटांगण", titleEn: "Ghalin Lotangan", language: "mr", category: "aarti" };
  test.each([["ghalin"], ["GHĀLIN"], ["lotan"], ["घालीन"], ["लोटांगण"], [""], ["ghalin lotangan"]])("“%s” finds घालीन लोटांगण", (q) => {
    expect(matches(T, searchKey(q))).toBe(true);
  });
  test("other words don't", () => {
    expect(matches(T, searchKey("devi"))).toBe(false);
    expect(matches(T, searchKey("देवी"))).toBe(false);
  });
});

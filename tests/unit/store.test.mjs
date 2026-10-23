// The store on IndexedDB (js/store/db.js, js/store/store.js), with fake-indexeddb standing in for the browser's:
// opening with a time limit and one retry, falling back to memory; the first visit moving today's settings and ticks
// into the first person; switching, adding, renaming and deleting people; ticks per person; and a backup written and
// restored into a fresh database with everything the same.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, test } from "vitest";
import { memoryDB, openDB } from "../../js/store/db.js";
import * as store from "../../js/store/store.js";
import { createTicks } from "../../js/core/ticks.js";
import { makeBackup, parseBackup, serialise } from "../../js/store/backup.js";
import { migratePrefs } from "../../js/store/migrate.js";

const ENV = { desk: false, fs: 24 };
const V13 = { sv: 6, fs: 30, fsu: 1, th: "dark", lang: "both", lead: "mr", l2: "en", ui: "mr", wake: 0, fnt: "classic" };
const TICKS = { v: 1, profiles: { family: { date: "2026-10-18", done: { evening: ["aarti-sukhkarta"] } } } };

// a page load: open the database, then start as js/core/state.js does
async function load(idb, saved = null, ticks = null) {
  store._reset();
  await store.openStore({ idb, timeout: 500 });
  return store.start(saved, ticks, ENV, new Date("2026-10-18T19:00:00Z"));
}

let idb;
beforeEach(() => {
  idb = new IDBFactory();
});

describe("opening IndexedDB", () => {
  test("opens, with the meta and profiles stores", async () => {
    const db = await openDB({ idb });
    expect(db.kind).toBe("idb");
    await db.put("meta", { a: 1 }, "x");
    await db.put("profiles", { id: "p1", name: "A" });
    expect(await db.get("meta", "x")).toEqual({ a: 1 });
    expect(await db.all("profiles")).toEqual([{ id: "p1", name: "A" }]);
    await db.del("profiles", "p1");
    expect(await db.all("profiles")).toEqual([]);
  });

  test("a first open that hangs (early iOS 15) is tried once more, then the data is kept in memory", async () => {
    let calls = 0;
    const hang = { open: () => (calls++, {}) }; // a request that never answers
    const t = Date.now();
    const db = await openDB({ idb: hang, timeout: 50 });
    expect(calls).toBe(2);
    expect(db.kind).toBe("memory");
    expect(db.reason).toBe("timeout");
    expect(Date.now() - t).toBeLessThan(1000);
  });

  test("a hang the first time and an answer the second time: IndexedDB is used", async () => {
    let calls = 0;
    const flaky = { open: (...a) => (calls++ === 0 ? {} : idb.open(...a)) };
    const db = await openDB({ idb: flaky, timeout: 50 });
    expect(db.kind).toBe("idb");
  });

  test("a browser that refuses IndexedDB (an old private window) or has none: memory", async () => {
    const refuse = {
      open() {
        throw Object.assign(new Error("no"), { name: "InvalidStateError" });
      },
    };
    expect((await openDB({ idb: refuse, timeout: 50 })).kind).toBe("memory");
    expect((await openDB({ idb: null })).kind).toBe("memory");
  });

  test("the memory stand-in keeps copies, like a database", async () => {
    const m = memoryDB("test");
    const p = { id: "p1", list: [1] };
    await m.put("profiles", p);
    p.list.push(2);
    expect(await m.get("profiles", "p1")).toEqual({ id: "p1", list: [1] });
    await m.replace("profiles", [{ id: "p2" }]);
    expect(await m.all("profiles")).toEqual([{ id: "p2" }]);
  });
});

describe("the store", () => {
  test("first visit: version 1.3's settings and ticks move into 'Me', and are in IndexedDB on the next load", async () => {
    const r = await load(idb, V13, TICKS);
    expect(r.first).toBe(true);
    expect(store.kind()).toBe("idb");
    expect(store.list().map((p) => p.name)).toEqual(["Me"]);
    await store.settled();
    // next load, with the boot copy gone: everything comes from IndexedDB
    const r2 = await load(idb, null, null);
    expect(r2.first).toBe(false);
    expect(r2.prefs).toEqual(migratePrefs(V13, ENV).prefs);
    expect(store.active().checklist).toEqual(TICKS.profiles.family);
  });

  test("switching person: each keeps their own settings; the device's stay", async () => {
    const r = await load(idb, V13, null);
    const P = { ...r.prefs };
    const b = store.add({ name: "Baba" });
    expect(b.ok).toBe(true);
    const next = store.switchTo(b.profile.id, P);
    expect(store.active().name).toBe("Baba");
    // Baba starts with the defaults; the device's screen setting is kept
    expect([next.fs, next.th, next.lang, next.wake]).toEqual([24, "auto", "mr", 0]);
    // Baba picks a large size; back to Me, whose settings are as they were
    const back = store.switchTo(store.list()[0].id, { ...next, fs: 40, fsu: 1 });
    expect([back.fs, back.th, back.lang]).toEqual([30, "dark", "both"]);
    expect(store.list()[1].settings.fs).toBe(40);
    await store.settled();
    // and so it is after a reload
    await load(idb, null, null);
    expect(store.active().name).toBe("Me");
    expect(store.list()[1].settings.fs).toBe(40);
  });

  test("settings saved while reading reach IndexedDB (a moment later, or at once with flush)", async () => {
    const r = await load(idb, V13, null);
    store.saveSettings({ ...r.prefs, fs: 35 });
    await store.flush();
    await load(idb, null, null);
    expect(store.active().settings.fs).toBe(35);
  });

  test("add, rename, recolour; names can't repeat or be empty", async () => {
    await load(idb, null, null);
    expect(store.add({ name: "" })).toEqual({ ok: false, problem: "empty" });
    expect(store.add({ name: "me" })).toEqual({ ok: false, problem: "taken" });
    const a = store.add({ name: "आई", initials: "आई" });
    expect(a.profile.initials).toBe("आई");
    const u = store.update(a.profile.id, { name: "Aai", initials: "", colour: "#2f6b3a" });
    expect([u.profile.name, u.profile.initials, u.profile.colour]).toEqual(["Aai", "A", "#2f6b3a"]);
    expect(store.update(a.profile.id, { name: "Me" })).toEqual({ ok: false, problem: "taken" });
    await store.settled();
    await load(idb, null, null);
    expect(store.list().map((p) => p.name)).toEqual(["Me", "Aai"]);
  });

  test("delete: never the last person; deleting the person reading switches to another", async () => {
    await load(idb, V13, null);
    const me = store.active().id;
    expect(store.remove(me).ok).toBe(false);
    const b = store.add({ name: "Baba" }).profile;
    store.switchTo(b.id, migratePrefs(V13, ENV).prefs);
    const r = store.remove(b.id);
    expect(r.ok).toBe(true);
    expect(store.active().id).toBe(me);
    expect(r.switched.fs).toBe(30);
    await store.settled();
    await load(idb, null, null);
    expect(store.list().map((p) => p.name)).toEqual(["Me"]);
  });

  test("ticks are per person, kept in their profile", async () => {
    await load(idb, null, null);
    const ticks = createTicks(store.ticksStorage(), undefined, () => store.active().id);
    ticks.set("2026-10-18", "evening", "aarti-sukhkarta", true);
    const b = store.add({ name: "Baba" }).profile;
    store.switchTo(b.id, migratePrefs(null, ENV).prefs);
    expect(ticks.done("2026-10-18", "evening")).toEqual([]);
    ticks.set("2026-10-18", "evening", "aarti-jai-ganesh-deva", true);
    store.switchTo(store.list()[0].id, migratePrefs(null, ENV).prefs);
    expect(ticks.done("2026-10-18", "evening")).toEqual(["aarti-sukhkarta"]);
    await store.settled();
    await load(idb, null, null);
    expect(store.list().map((p) => p.checklist.done.evening)).toEqual([["aarti-sukhkarta"], ["aarti-jai-ganesh-deva"]]);
  });

  test("backup → restore into a fresh database: every person, setting and tick the same", async () => {
    await load(idb, V13, TICKS);
    const aai = store.add({ name: "Aai", colour: "#6b4a8a" }).profile;
    store.switchTo(aai.id, migratePrefs(V13, ENV).prefs);
    store.saveSettings({ ...migratePrefs(null, ENV).prefs, fs: 38, fsu: 1, ind: "kn", ui: "en" });
    store.markBackup(new Date("2026-10-18T20:00:00Z"));
    const before = { profiles: store.list(), active: store.active().id };
    const text = serialise(makeBackup(store.exportData(), { app: "aarti-v1.4", created: "2026-10-18T20:00:00Z" }));

    // a new phone
    const other = new IDBFactory();
    await load(other, null, null);
    expect(store.list().map((p) => p.name)).toEqual(["Me"]);
    const r = parseBackup(text, ENV);
    expect(r.ok).toBe(true);
    const prefs = await store.restore(r.data);
    expect(store.list()).toEqual(before.profiles);
    expect(store.active().id).toBe(before.active);
    expect([prefs.fs, prefs.ind]).toEqual([38, "kn"]);
    // and after a reload there
    await load(other, null, null);
    expect(store.list()).toEqual(before.profiles);
    expect(store.active().id).toBe(before.active);
  });

  test("the library's categories are kept per phone (meta.library), for everyone, and travel in the backup", async () => {
    await load(idb, V13, null);
    expect(store.getLibrary()).toEqual({ added: [], renames: {}, moves: {} });
    const lib = {
      added: [{ id: "bhajan", name: { mr: "भजन", en: "Bhajan" }, order: 5 }],
      renames: { aarti: { mr: "आरत्या", en: "Aartis" } },
      moves: { "aarti-ghalin-lotangan": "bhajan" },
    };
    await store.setLibrary(lib);
    // another person reading sees the same library
    store.add({ name: "Baba" });
    store.switchTo(store.list()[1].id, migratePrefs(V13, ENV).prefs);
    expect(store.getLibrary()).toEqual(lib);
    await store.settled();
    await load(idb, null, null);
    expect(store.getLibrary()).toEqual(lib);
    // backup → restore on a new phone
    const text = serialise(makeBackup(store.exportData(), { app: "aarti-v1.8", created: "2026-10-18T20:00:00Z" }));
    expect(JSON.parse(text).payload.library).toEqual(lib);
    const other = new IDBFactory();
    await load(other, null, null);
    expect(store.getLibrary().added).toEqual([]);
    await store.restore(parseBackup(text, ENV).data);
    expect(store.getLibrary()).toEqual(lib);
    await load(other, null, null);
    expect(store.getLibrary()).toEqual(lib);
    // a file from version 1.7 (no library) leaves this phone's categories as they are
    const old = makeBackup({ profiles: store.list(), activeProfile: store.active().id, device: {} }, { app: "aarti-v1.7", created: "2026-10-18T20:00:00Z" });
    expect(old.payload.library).toBeUndefined();
    await store.restore(parseBackup(serialise(old), ENV).data);
    expect(store.getLibrary()).toEqual(lib);
  });

  test("in memory (IndexedDB failed): everything works for this visit", async () => {
    store._reset();
    await store.openStore({ idb: { open: () => ({}) }, timeout: 20 });
    expect(store.kind()).toBe("memory");
    const r = store.start(V13, null, ENV);
    expect(r.prefs.fs).toBe(30);
    expect(store.add({ name: "Baba" }).ok).toBe(true);
    expect(store.list()).toHaveLength(2);
  });
});

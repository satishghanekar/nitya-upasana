// The backup file (.nitya, docs/architecture.md §3.7, Q10: plain JSON with a checksum): SHA-256 against known
// answers and Node's own, a file written and read back unchanged, every way a file is refused (not JSON, not ours,
// newer, damaged), what a restore would change, the file's name, and when the reminder shows.
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import { describeRestore, EXT, fileName, FORMAT, makeBackup, needsReminder, parseBackup, SCHEMA, serialise, sha256 } from "../../js/store/backup.js";
import { COLOURS, newProfile } from "../../js/store/profiles.js";
import { defaults, devicePart, profilePart } from "../../js/store/migrate.js";

const ENV = { desk: false, fs: 24 };
const NOW = "2026-10-18T19:00:00.000Z";
const settings = (o = {}) => ({ ...profilePart(defaults(ENV)), ...o });
const AAI = newProfile({ id: "paai", name: "Aai", initials: "आई", colour: COLOURS[0].v, settings: settings({ fs: 32, fsu: 1, lang: "both", th: "dark" }), checklist: { date: "2026-10-18", done: { evening: ["sukhkarta"] } }, now: NOW });
const BABA = newProfile({ id: "pbaba", name: "बाबा", colour: COLOURS[1].v, settings: settings({ lead: "en", l2: "mr", lang: "en", ui: "en", hc: 1 }), now: NOW });
const DEVICE = { ...devicePart({ ...defaults(ENV), sv: 6 }), loc: { lat: 40, lon: -83 } };
const DATA = { profiles: [AAI, BABA], activeProfile: "pbaba", device: DEVICE };
const file = () => serialise(makeBackup(DATA, { app: "aarti-v1.4", created: NOW }));

describe("SHA-256", () => {
  test("known answers (FIPS 180-4 examples)", () => {
    expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  });
  test("the same as Node's for Devanagari, every padding length and a long text", () => {
    const texts = ["सुखकर्ता दुःखहर्ता ॐ ॥ १ ॥", "a".repeat(55), "a".repeat(56), "a".repeat(63), "a".repeat(64), "आ".repeat(1000), file()];
    for (const t of texts) expect(sha256(t)).toBe(createHash("sha256").update(t, "utf8").digest("hex"));
  });
});

describe("a backup file", () => {
  test("is plain JSON: format, schema, kind, app, created, payload and its checksum", () => {
    const b = JSON.parse(file());
    expect([b.format, b.schema, b.kind, b.app, b.created]).toEqual([FORMAT, SCHEMA, "backup", "aarti-v1.4", NOW]);
    expect(b.payload.profiles.map((p) => p.name)).toEqual(["Aai", "बाबा"]);
    expect(b.sha256).toBe(sha256(JSON.stringify(b.payload)));
  });

  test("read back, it gives every person, their settings and ticks, and the device's settings, unchanged", () => {
    const r = parseBackup(file(), ENV);
    expect(r.ok).toBe(true);
    expect(r.data.profiles).toEqual([AAI, BABA]);
    expect(r.data.activeProfile).toBe("pbaba");
    expect(r.data.settings).toEqual(DEVICE);
    // and written again from what was read, the file is the same
    expect(serialise(makeBackup({ profiles: r.data.profiles, activeProfile: r.data.activeProfile, device: r.data.settings }, { app: "aarti-v1.4", created: NOW }))).toBe(file());
  });

  test("from version 1.8 it carries the family's categories (checked when read); an older file has none", () => {
    const library = {
      added: [{ id: "bhajan", name: { mr: "भजन", en: "Bhajan" }, order: 5 }],
      renames: { aarti: { mr: "आरत्या", en: "Aartis" } },
      moves: { "ghalin-lotangan": "bhajan" },
    };
    const text = serialise(makeBackup({ ...DATA, library }, { app: "aarti-v1.8", created: NOW }));
    const r = parseBackup(text, ENV);
    expect(r.ok).toBe(true);
    expect(r.data.library).toEqual(library);
    // a damaged part is dropped, never trusted as it is (the checksum is made again, as an editor would)
    const b = JSON.parse(text);
    b.payload.library = { added: [{ id: "Bad Id!", name: { mr: "x", en: "x" } }, { id: "ok", name: {} }], renames: { aarti: 5 }, moves: { sukhkarta: "<b>" } };
    b.sha256 = sha256(JSON.stringify(b.payload));
    expect(parseBackup(JSON.stringify(b), ENV).data.library).toEqual({ added: [], renames: {}, moves: {} });
    // a file from 1.7 or before: no library, so a restore leaves this phone's categories alone
    expect(JSON.parse(file()).payload.library).toBeUndefined();
    expect(parseBackup(file(), ENV).data.library).toBeUndefined();
  });

  test("re-indented by an editor (or with a byte-order mark), it still reads", () => {
    const b = JSON.parse(file());
    expect(parseBackup(JSON.stringify(b), ENV).ok).toBe(true);
    expect(parseBackup("﻿" + JSON.stringify(b, null, 4), ENV).ok).toBe(true);
  });

  test("a changed value fails the checksum, and nothing is restored", () => {
    const b = JSON.parse(file());
    b.payload.profiles[0].settings.fs = 50;
    expect(parseBackup(JSON.stringify(b), ENV)).toEqual({ ok: false, problem: "checksum" });
    const c = JSON.parse(file());
    c.sha256 = "0".repeat(64);
    expect(parseBackup(JSON.stringify(c), ENV)).toEqual({ ok: false, problem: "checksum" });
    const d = JSON.parse(file());
    delete d.sha256;
    expect(parseBackup(JSON.stringify(d), ENV)).toEqual({ ok: false, problem: "checksum" });
  });

  test.each([
    ["not JSON", "hello", "not-json"],
    ["a cut-off file", file().slice(0, 200), "not-json"],
    ["JSON from somewhere else", '{"name":"x"}', "not-nitya"],
    ["a list", "[1,2]", "not-nitya"],
    ["from a newer version", JSON.stringify({ ...JSON.parse(file()), schema: 2 }), "newer"],
    ["a shared routine, not a backup", JSON.stringify({ ...JSON.parse(file()), kind: "routine" }), "kind"],
  ])("refused: %s", (_, text, problem) => {
    expect(parseBackup(text, ENV)).toEqual({ ok: false, problem });
  });

  test("a file with no usable person is refused", () => {
    const payload = { profiles: [{ id: "bad id!", name: "x" }], activeProfile: "", settings: {} };
    const b = { format: FORMAT, schema: 1, kind: "backup", app: "x", created: NOW, payload, sha256: sha256(JSON.stringify(payload)) };
    expect(parseBackup(JSON.stringify(b), ENV)).toEqual({ ok: false, problem: "empty" });
  });

  test("values in a file are cleaned, never trusted: unknown keys dropped, damaged ones replaced, repeats dropped", () => {
    const payload = {
      profiles: [
        { ...AAI, settings: { ...AAI.settings, fs: "<b>", extra: 1 }, colour: "javascript:" },
        { ...AAI, id: "pdup" }, // same name again
        { ...BABA, id: "paai" }, // same id again
      ],
      activeProfile: "nobody",
      settings: { wake: "yes", loc: { lat: 1, lon: 2 }, junk: true },
    };
    const b = { format: FORMAT, schema: 1, kind: "backup", app: "x", created: NOW, payload, sha256: sha256(JSON.stringify(payload)) };
    const r = parseBackup(JSON.stringify(b), ENV);
    expect(r.ok).toBe(true);
    expect(r.data.profiles).toHaveLength(1);
    expect(r.data.profiles[0].settings.fs).toBe(24);
    expect(r.data.profiles[0].settings.extra).toBeUndefined();
    expect(r.data.profiles[0].colour).toBe(COLOURS[0].v);
    expect(r.data.activeProfile).toBe("paai");
    expect(r.data.settings.wake).toBe(1);
    expect(r.data.settings.loc).toEqual({ lat: 1, lon: 2 });
    expect(r.data.settings.junk).toBeUndefined();
  });
});

describe("what a restore will change", () => {
  test("new people, people replaced by the file's copy, people removed, and who reads next", () => {
    const ME = newProfile({ id: "pme", name: "Me", settings: settings(), now: NOW });
    const r = parseBackup(file(), ENV);
    expect(describeRestore([ME, AAI], r.data)).toEqual({ added: ["बाबा"], replaced: ["Aai"], removed: ["Me"], active: "बाबा" });
    expect(describeRestore([AAI, BABA], r.data)).toEqual({ added: [], replaced: ["Aai", "बाबा"], removed: [], active: "बाबा" });
  });
  test("on another phone, someone with the same name (the first person, Me) is shown as replaced, not new and removed", () => {
    const FILE_ME = newProfile({ id: "pme1", name: "Me", settings: settings(), now: NOW });
    const PHONE_ME = newProfile({ id: "pme2", name: "me", settings: settings(), now: NOW });
    const OTHER = newProfile({ id: "pother", name: "Baba", settings: settings(), now: NOW });
    const data = { profiles: [FILE_ME, AAI], activeProfile: "paai", settings: DEVICE };
    expect(describeRestore([PHONE_ME, OTHER], data)).toEqual({ added: ["Aai"], replaced: ["Me"], removed: ["Baba"], active: "Aai" });
  });
});

describe("the file's name and the reminder", () => {
  test("named with the day it was saved, ending .nitya", () => {
    expect(fileName(new Date(2026, 0, 5))).toBe("nitya-upasana-2026-01-05" + EXT);
    expect(EXT).toBe(".nitya");
  });

  const day = (n) => new Date(Date.parse(NOW) + n * 86400000);
  test("never saved: a reminder 14 days after the first visit, not before", () => {
    expect(needsReminder({ since: NOW, lastBackup: "" }, day(13))).toBe(false);
    expect(needsReminder({ since: NOW, lastBackup: "" }, day(14))).toBe(true);
  });
  test("saved: a reminder 30 days later", () => {
    expect(needsReminder({ since: NOW, lastBackup: NOW }, day(29))).toBe(false);
    expect(needsReminder({ since: NOW, lastBackup: NOW }, day(30))).toBe(true);
  });
  test("Not now puts it off for 14 days", () => {
    expect(needsReminder({ since: NOW, lastBackup: "", snooze: day(20).toISOString() }, day(33))).toBe(false);
    expect(needsReminder({ since: NOW, lastBackup: "", snooze: day(20).toISOString() }, day(34))).toBe(true);
  });
  test("nothing known: no reminder", () => {
    expect(needsReminder({}, day(100))).toBe(false);
  });
});

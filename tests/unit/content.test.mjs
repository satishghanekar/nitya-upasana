// The texts became files (slice 1). The proof that not a character changed: the site's own code
// (js/text/content.js) rebuilds, from content/library.json and content/texts/*.txt, an object identical to the
// old window.CONTENT, frozen as it was in tests/unit/fixtures/pieces.js (the old content/pieces.js, unchanged).
// Then the checks every text file must pass (the same list, ids, categories, no Unicode normalisation).
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";
import { parseText } from "../../js/text/format.js";
import { buildContent, toPiece } from "../../js/text/content.js";

const read = (p) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const lib = JSON.parse(read("content/library.json"));
const categories = JSON.parse(read("content/categories.json"));
const files = Object.fromEntries(lib.texts.map((t) => [t.id, read("content/" + t.file)]));

// The old CONTENT, copied out of the vm context so it compares as plain objects
const win = {};
vm.runInNewContext(readFileSync(new URL("fixtures/pieces.js", import.meta.url), "utf8"), { window: win });
const OLD = JSON.parse(JSON.stringify(win.CONTENT));

const count = (s, re) => (s.match(re) || []).length;
// the old file had the reading page's groups (पूजा, आरती); CONTENT now has the Library's categories (2026-10-21)
const pieces = (C) => (C.categories || C.groups).flatMap((g) => g.pieces);
const allLines = (C) => pieces(C).flatMap((p) => [...(p.refrain ? p.refrain.lines : []), ...p.items.flatMap((i) => i.lines || [])]);

describe("CONTENT from the text files", () => {
  const C = buildContent(lib, files, categories);
  // The texts added since (Shree Rudra, Shri Sukta, the Gondavalekar Maharaj aartis and ashtaks, …) are left out of the
  // comparison: every text the old file had must come out of the text files exactly as it was, in the same order.
  // Each piece now also names its text (text: its id in library.json), which the old file did not have.
  const OLD_IDS = new Set(pieces(OLD).map((p) => p.id));
  const same = pieces(C)
    .filter((p) => OLD_IDS.has(p.id))
    // (and each [note] is now marked as one, nt, which the old file did not have either: Ghalin Lotangan's ↻ ३ वेळा)
    .map(({ text, ...p }) => ({ ...p, items: p.items.map(({ nt, ...i }) => i) })); // eslint-disable-line no-unused-vars
  const OLD_C = { categories: [{ pieces: same }] };
  const byId = (Cx, id) => pieces(Cx).find((p) => p.id === id);
  test("is identical to the old content/pieces.js", () => {
    expect(same).toStrictEqual(pieces(OLD));
    // and in the same key order, so even the order the page meets things in is unchanged
    expect(JSON.stringify(same)).toBe(JSON.stringify(pieces(OLD)));
    expect([C.ui, C.wiki]).toStrictEqual([OLD.ui, OLD.wiki]);
  });
  // (60 <br>: the Vitthal Aarti's dhrupad breaks after its first half in English and at the top too, Satish 2026-10-23)
  test("the marks that matter are all there: 60 <br>, 42 zero-width spaces, svara marks", () => {
    const s = JSON.stringify(allLines(OLD_C));
    expect(count(s, /<br>/g)).toBe(60);
    expect(count(s, /​/g)).toBe(42);
    for (const m of [/॑/g, /॒/g, /᳚/g]) expect(count(s, m)).toBe(count(JSON.stringify(allLines(OLD)), m));
    expect(count(s, /॑/g)).toBeGreaterThan(0);
  });
  test.each(pieces(OLD).map((p) => [p.id]))("%s: every line identical", (id) => {
    const a = allLines({ categories: [{ pieces: [byId(C, id)] }] });
    const b = allLines({ categories: [{ pieces: [byId(OLD, id)] }] });
    expect(a.length).toBe(b.length);
    a.forEach((l, k) => expect(l).toStrictEqual(b[k]));
  });
  // [once] lines and [note]s before the dhrupad go above it (lead); [once] lines later stay where they are, with no
  // dhrupad after them; line ids follow the order shown
  test("every-verse: [once] lines before the dhrupad lead, later ones stand where they are", () => {
    const head = "id: x\ntitle: क\ntitle-en: K\ncategory: aarti\nlanguage: mr\nrefrain: every-verse\n---\n";
    const t = parseText(head + "[once]\nक\nK\n\n[note: अ | a]\n\n[dhrupad]\nख\nKh\n\n[1]\nग\nG\n\n[once]\nघ\nGh\n");
    const p = toPiece(t, 1, lib);
    expect(p.lead).toEqual([{ kind: "dh", lines: [{ l: "x.1", mr: "क", en: "K" }] }, { rmk: { mr: "अ", en: "a" }, nt: true }]);
    expect(p.refrain.lines).toEqual([{ mr: "ख", en: "Kh" }]);
    expect(p.items.map((i) => i.kind || (i.rmk ? "rmk" : "stanza"))).toEqual(["stanza", "rmk", "rf", "dh"]);
    expect(p.items.flatMap((i) => (i.lines || []).map((l) => l.l))).toEqual(["x.2", "x.3", "x.4"]);
  });
  // with no dhrupad: [once] lines at the top go above the text (lead), later ones stand where they are
  test("no dhrupad: [once] lines at the top lead, later ones stand where they are", () => {
    const head = "id: x\ntitle: क\ntitle-en: K\ncategory: ashtak\nlanguage: sa\n---\n";
    const t = parseText(head + "[once]\nक\nK\n\n[1]\nग\nG\n\n[once]\nघ\nGh\n");
    const p = toPiece(t, 1, lib);
    expect(p.lead).toEqual([{ kind: "dh", lines: [{ l: "x.1", mr: "क", en: "K" }] }]);
    expect(p.items.map((i) => i.kind || "stanza")).toEqual(["stanza", "dh"]);
    expect(p.items.flatMap((i) => i.lines.map((l) => l.l))).toEqual(["x.2", "x.3"]);
  });
  test("a text missing from the files stops the build", () => {
    expect(() => buildContent(lib, { ...files, "aarti-sukhkarta": undefined })).toThrow("texts/aarti-sukhkarta.txt: not loaded");
  });
});

describe("content checks", () => {
  const names = readdirSync(new URL("../../content/texts/", import.meta.url)).filter((f) => !f.startsWith("."));
  test("every text's id, and so its file name, starts with its category", () => {
    for (const t of lib.texts) expect(t.id.startsWith(t.category + "-"), t.id).toBe(true);
  });
  test("library.json lists every file in content/texts/, once", () => {
    expect(lib.texts.map((t) => t.file).sort()).toEqual(names.map((f) => "texts/" + f).sort());
    expect(new Set(lib.texts.map((t) => t.id)).size).toBe(lib.texts.length);
  });
  test("the reading order is the Library's: by category, each numbered from 1, every text once", () => {
    const C = buildContent(lib, files, categories);
    expect(C.categories.map((c) => c.id)).toEqual([...categories].sort((a, b) => a.order - b.order).map((c) => c.id));
    expect(pieces(C).map((p) => p.text).sort()).toEqual(lib.texts.map((t) => t.id).sort());
    for (const c of C.categories) {
      expect(c.pieces.map((p) => p.no.en)).toEqual(c.pieces.map((_, i) => i + 1 + "."));
      for (const p of c.pieces) expect(lib.texts.find((t) => t.id === p.text).category).toBe(c.id);
    }
    // without categories.json: the categories in the order the texts name them, called by their ids
    const bare = buildContent(lib, files, null);
    expect(bare.categories.map((c) => c.name)).toEqual(bare.categories.map((c) => ({ mr: c.id, en: c.id })));
    expect(pieces(bare).length).toBe(lib.texts.length);
  });
  test.each(lib.texts.map((t) => [t.id, t]))("%s: library.json agrees with the file", (id, entry) => {
    const t = parseText(files[id], entry.file);
    expect(entry).toEqual({
      id: t.id,
      file: "texts/" + t.id + ".txt",
      title: t.title,
      titleEn: t.titleEn,
      category: t.category,
      language: t.language,
      lines: t.blocks.reduce((a, b) => a + b.lines.length, 0),
    });
    expect(categories.map((c) => c.id)).toContain(t.category);
    expect(lib.languages[t.language]).toBeTruthy();
  });
  test.each(lib.texts.map((t) => [t.file]))("%s is not changed by Unicode normalisation", (f) => {
    const raw = files[f.slice(6, -4)];
    expect(raw === raw.normalize("NFC")).toBe(true);
  });
  // A verse number typed in a line (॥ १० ॥, || 10 ||) is the same in both languages and a whole number: a slip such as
  // "|| 1. ||" for ॥ १० ॥ printed wrong in English and IAST (Satish's PDFs, 2026-10-22)
  test.each(lib.texts.map((t) => [t.id]))("%s: verse numbers agree in both languages", (id) => {
    const DV = "०१२३४५६७८९";
    const nums = (s, re) => [...s.matchAll(re)].map((m) => m[1]);
    const t = parseText(files[id], id);
    t.blocks.forEach((b) =>
      b.lines.forEach((l) => {
        const mr = nums(l.orig, /॥\s*([०-९]+)\s*॥/g).map((d) => d.replace(/./g, (c) => DV.indexOf(c)));
        const en = nums(l.en, /\|\|\s*([0-9.]+)\s*\|\|/g);
        en.forEach((n) => expect(n, `${id}: "${l.en}"`).toMatch(/^[0-9]+$/));
        if (mr.length && en.length) expect(en, `${id}: "${l.orig}" / "${l.en}"`).toEqual(mr);
      }),
    );
  });
  test("categories: Vedic Chant, Aarti, Stotra, Ashtak", () => {
    expect(categories.map((c) => c.id)).toEqual(["vedic-chant", "aarti", "stotra", "ashtak"]);
  });
});

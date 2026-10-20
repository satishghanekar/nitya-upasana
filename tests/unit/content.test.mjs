// The texts became files (slice 1). The proof that not a character changed: the site's own code
// (js/text/content.js) rebuilds, from content/library.json and content/texts/*.txt, an object identical to the
// old window.CONTENT, frozen as it was in tests/unit/fixtures/pieces.js (the old content/pieces.js, unchanged).
// Then the checks every text file must pass (the same list, ids, categories, no Unicode normalisation).
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";
import { parseText } from "../../js/text/format.js";
import { buildContent } from "../../js/text/content.js";

const read = (p) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const lib = JSON.parse(read("content/library.json"));
const categories = JSON.parse(read("content/categories.json"));
const files = Object.fromEntries(lib.texts.map((t) => [t.id, read("content/" + t.file)]));

// The old CONTENT, copied out of the vm context so it compares as plain objects
const win = {};
vm.runInNewContext(readFileSync(new URL("fixtures/pieces.js", import.meta.url), "utf8"), { window: win });
const OLD = JSON.parse(JSON.stringify(win.CONTENT));

const count = (s, re) => (s.match(re) || []).length;
const pieces = (C) => C.groups.flatMap((g) => g.pieces);
const allLines = (C) => pieces(C).flatMap((p) => [...(p.refrain ? p.refrain.lines : []), ...p.items.flatMap((i) => i.lines || [])]);

describe("CONTENT from the text files", () => {
  const C = buildContent(lib, files);
  // The texts added since (the Gondavalekar Maharaj aartis) come after the old ones in their group
  const ADDED = ["jaydeva-jaydeva-samartha", "jay-jay-aarti-shrigururaya", "ovaloon-aarti-chaitanyabrahma", "aarti-kariton-guruvar",
    "dhanya-jagin-guruvarya", "aarti-belaguve", "svastha-karin-shayan", "ovaloo-sapreme-aarti"];
  const OLD_C = { ...C, groups: C.groups.map((g) => ({ ...g, pieces: g.pieces.filter((p) => !ADDED.includes(p.id)) })) };
  test("is identical to the old content/pieces.js", () => {
    expect(OLD_C).toStrictEqual(OLD);
    // and in the same key order, so even the order the page meets things in is unchanged
    expect(JSON.stringify(OLD_C)).toBe(JSON.stringify(OLD));
    expect(pieces(C).map((p) => p.id).slice(-ADDED.length)).toEqual(ADDED);
  });
  test("the marks that matter are all there: 53 <br>, 42 zero-width spaces, svara marks", () => {
    const s = JSON.stringify(allLines(C));
    expect(count(s, /<br>/g)).toBe(53);
    expect(count(s, /​/g)).toBe(42);
    for (const m of [/॑/g, /॒/g, /᳚/g]) expect(count(s, m)).toBe(count(JSON.stringify(allLines(OLD)), m));
    expect(count(s, /॑/g)).toBeGreaterThan(0);
  });
  test.each(pieces(OLD).map((p, i) => [p.id, i]))("%s: every line identical", (id, i) => {
    const a = allLines({ groups: [{ pieces: [pieces(C)[i]] }] });
    const b = allLines({ groups: [{ pieces: [pieces(OLD)[i]] }] });
    expect(a.length).toBe(b.length);
    a.forEach((l, k) => expect(l).toStrictEqual(b[k]));
  });
  test("a text missing from the files stops the build", () => {
    expect(() => buildContent(lib, { ...files, sukhkarta: undefined })).toThrow("texts/sukhkarta.txt: not loaded");
  });
});

describe("content checks", () => {
  const names = readdirSync(new URL("../../content/texts/", import.meta.url)).filter((f) => !f.startsWith("."));
  test("library.json lists every file in content/texts/, once", () => {
    expect(lib.texts.map((t) => t.file).sort()).toEqual(names.map((f) => "texts/" + f).sort());
    expect(new Set(lib.texts.map((t) => t.id)).size).toBe(lib.texts.length);
  });
  test("every text is in exactly one group", () => {
    expect(lib.groups.flatMap((g) => g.texts).sort()).toEqual(lib.texts.map((t) => t.id).sort());
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
  test("categories: Vedic Chant, Aarti, Stotra, Ashtak", () => {
    expect(categories.map((c) => c.id)).toEqual(["vedic-chant", "aarti", "stotra", "ashtak"]);
  });
});

// Search across the library (slice 3, js/text/search-core.js): how the query and the texts are compared (folding,
// loose English spellings, typos) and how results rank: texts by title, id, first line and category first, then
// lines. Built here from the text files themselves, as the page builds it from the lines it shows.
import { beforeAll, describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { parseText } from "../../js/text/format.js";
import { buildIndex, distance, fold, loose, marks, near, search, SCORE, typos } from "../../js/text/search-core.js";

const read = (p) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const lib = JSON.parse(read("content/library.json"));
const CATS = JSON.parse(read("content/categories.json"));
const plain = (s) => s.replace(/¦/g, "").replace(/ \/\/ /g, " ");

let IA, ix;
beforeAll(async () => {
  globalThis.SCR = { from: (t) => t };
  ({ IA } = await import("../../js/text/iast.js"));
  const texts = [],
    lines = [];
  for (const id of lib.texts.map((t) => t.id)) {
    const t = parseText(read("content/texts/" + id + ".txt"), id);
    const cat = CATS.find((c) => c.id === t.category);
    const all = t.blocks.flatMap((b) => b.lines);
    const name = id.startsWith(t.category + "-") ? id.slice(t.category.length + 1) : "";
    texts.push({ id, name, sec: t.legacyId, title: t.title, titleEn: t.titleEn, categories: [cat.name.mr, cat.name.en], first: [plain(all[0].orig), plain(all[0].en)] });
    all.forEach((l, i) => lines.push({ id: id + "." + (i + 1), sec: t.legacyId, text: id, m: plain(l.orig), e: plain(l.en) }));
  }
  ix = buildIndex({ texts, lines, roman: IA });
});

const textIds = (q) => search(ix, q).texts.map((h) => h.id);
const top = (q) => search(ix, q).texts[0];

describe("folding and loose spelling", () => {
  test("IAST letters, svara marks, punctuation and break marks fold away", () => {
    expect(fold("Sukhakartā Duḥkhahartā")).toBe("sukhakarta duhkhaharta");
    expect(fold("ॐ भ॒द्रं कर्णे॑भिः ।")).toBe("ॐ भद्रं कर्णेभिः");
    expect(fold("jai-ganesh-deva")).toBe("jai ganesh deva");
    expect(fold("दुर्गे¦ दुर्घट")).toBe("दुर्गे दुर्घट");
  });
  test("the spellings people type meet the written ones", () => {
    const same = (a, b) => expect(loose(fold(a))).toBe(loose(fold(b)));
    same("sukhkarta", "Sukhakartā");
    same("vithal", "Vitthal");
    same("ganpati", "Ganapati");
    same("jagdish", "Jagadish");
    same("ganapatichi", "gaṇapatīcī");
    same("Dnyaneshwar", "jñāneśvar");
    same("shankar", "śaṅkar");
  });
  test("typos: one per four letters", () => {
    expect(typos("dev")).toBe(0);
    expect(typos("vitthal")).toBe(1);
    expect(typos("lotanganam")).toBe(2);
    expect(distance("vithtal", "vitthal", 2)).toBe(2);
    expect(near("vitthl", "vitthalachi")).toBe(true);
    expect(near("dev", "deo")).toBe(false);
    expect(near("ghalim", "ghalin")).toBe(true);
  });
});

describe("ranking", () => {
  test('"sukhkarta" finds Ganapati Aarti first, by its id', () => {
    expect(top("sukhkarta")).toMatchObject({ id: "aarti-sukhkarta", sec: "a1" });
    expect(top("sukhkarta").score).toBeGreaterThanOrEqual(SCORE.title);
    // and its lines
    const l = search(ix, "sukhkarta").lines;
    expect(l.length).toBeGreaterThan(0);
    expect(l[0].text).toBe("aarti-sukhkarta");
  });
  test('"सुखकर्ता" in Marathi letters finds the same text first, and its line', () => {
    expect(top("सुखकर्ता")).toMatchObject({ id: "aarti-sukhkarta" });
    const l = search(ix, "सुखकर्ता").lines;
    expect(l[0]).toMatchObject({ text: "aarti-sukhkarta", score: SCORE.phrase });
    expect(l[0].m).toContain("सुखकर्ता");
  });
  test("the everyday spelling and a sloppy one both find it", () => {
    expect(top("sukhakarta").id).toBe("aarti-sukhkarta");
    expect(top("Sukhkarta Dukhharta").id).toBe("aarti-sukhkarta");
  });
  test('"jai dev": Jai Ganesh Deva by its id first, then the aartis that begin "Jai Dev Jai Dev", then the lines', () => {
    const r = search(ix, "jai dev");
    expect(r.texts[0].id).toBe("aarti-jai-ganesh-deva");
    expect(r.texts.map((t) => t.id)).toEqual(expect.arrayContaining(["aarti-sukhkarta", "aarti-lavathavati-vikrala", "aarti-trigunatmak-traimurti"]));
    expect(r.texts.slice(1).every((t) => t.score <= SCORE.first)).toBe(true);
    expect(r.lines[0].score).toBe(SCORE.phrase);
    expect(r.lines.every((l, i) => i === 0 || r.lines[i - 1].score >= l.score)).toBe(true);
  });
  test("titles in either language, with the Marathi title matched in English letters too", () => {
    expect(top("Devi Aarti").id).toBe("aarti-durge-durghat-bhari");
    expect(top("देवीची आरती").id).toBe("aarti-durge-durghat-bhari");
    expect(top("devichi").id).toBe("aarti-durge-durghat-bhari");
    expect(top("ghalin lotangan").score).toBe(SCORE.title);
    expect(top("atharva").id).toBe("vedic-chant-atharvashirsha");
    expect(top("dnyaneshwar").id).toBe("aarti-dnyanaraja");
    expect(top("vithal").id).toBe("aarti-yei-o-vitthale");
  });
  test("a category name finds its texts", () => {
    const vedic = lib.texts.filter((t) => t.category === "vedic-chant").map((t) => t.id);
    expect(textIds("vedic chant")).toEqual(vedic);
    expect(textIds("वैदिक")).toEqual(vedic);
    // every Aarti, and a text with aarti in its title too
    expect(textIds("aarti")).toEqual(expect.arrayContaining(lib.texts.filter((t) => t.category === "aarti").map((t) => t.id)));
  });
  test("an exact title outranks one it merely starts", () => {
    const r = search(ix, "ganapati aarti").texts;
    expect(r[0].id).toBe("aarti-sukhkarta");
    expect(r[0].score).toBe(SCORE.title);
    expect(r.find((t) => t.id === "aarti-shendur-lal-chadhayo").score).toBeLessThan(SCORE.title);
  });
  test("a typo is forgiven, but not in short words", () => {
    expect(top("lotangn").id).toBe("aarti-ghalin-lotangan");
    expect(top("vitthla").id).toBe("aarti-yei-o-vitthale");
    expect(search(ix, "zzzzqqq")).toEqual({ texts: [], lines: [], more: false });
    expect(search(ix, "zzqxw").texts).toEqual([]);
  });
  test("one letter is not a search; lines are capped and say there are more", () => {
    expect(search(ix, "a")).toEqual({ texts: [], lines: [], more: false });
    const r = search(ix, "har");
    expect(r.lines.length).toBe(40);
    expect(r.more).toBe(true);
  });
});

describe("marking the words that matched", () => {
  test("as typed, loosely, through English letters and with a typo", () => {
    expect(marks(ix, "Sukhakartā", "sukhkarta")).toBe(true);
    expect(marks(ix, "सुखकर्ता", "सुखकर्ता")).toBe(true);
    expect(marks(ix, "Vitthal", "vithal")).toBe(true);
    expect(marks(ix, "दुःखहर्ता", "sukhkarta")).toBe(false);
    expect(marks(ix, "|", "sukhkarta")).toBe(false);
  });
});

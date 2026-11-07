// Following the chanting (js/core/follow.js): what the model heard found in the texts, on the site's own texts, with
// the kinds of mistakes the model makes (letters dropped or changed) and the dhrupad said again and again.
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { buildContent } from "../../js/text/content.js";
import { letters, lineAt, locate, makeDoc, match, pieceLines } from "../../js/core/follow.js";

const read = (p) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const lib = JSON.parse(read("content/library.json"));
const categories = JSON.parse(read("content/categories.json"));
const files = Object.fromEntries(lib.texts.map((t) => [t.id, read("content/" + t.file)]));
const C = buildContent(lib, files, categories);
const pieces = C.categories.flatMap((c) => c.pieces);
const docs = pieces.map((p) => makeDoc(pieceLines(p)));
const at = (text) => pieces.findIndex((p) => p.text === text);

// the letters of lines i … j of a piece, with every nth letter dropped and every mth changed, as the model mishears
function heard(k, i, j, drop = 9, swap = 13) {
  const lines = pieceLines(pieces[k]).slice(i, j + 1);
  return [...letters(lines.map((l) => l.text).join(" "))]
    .filter((_, n) => (n + 1) % drop)
    .map((c, n) => ((n + 1) % swap ? c : "क"))
    .join("");
}
// the index of the line holding a verse's reference (Pavamana Suktam: ॥ ९.००१.०२ ॥)
const lineWith = (k, s) => pieceLines(pieces[k]).findIndex((l) => l.text.includes(s));

describe("letters", () => {
  test("only the letters said: svara marks, verse numbers, dandas and spaces go", () => {
    expect(letters("इन्द्रा᳚य॒ पात॑वे सु॒तः ॥ ९.००१.०१ ॥")).toBe("इन्द्रायपातवेसुतः");
    expect(letters("जय देव जय देव ॥ धृ. ॥")).toBe("जयदेवजयदेवधृ");
    expect(letters("<b>शिव-शक्त्यैक्य-रूपिणी</b> &nbsp;।")).toBe("शिवशक्त्यैक्यरूपिणी");
    expect(letters("Indraya, Patave.")).toBe("");
  });
});

describe("match", () => {
  test("an exact stretch ends just after its last letter, at no cost", () => {
    expect(match("गणेश", "जयगणेशदेव")).toEqual({ end: 6, cost: 0 });
  });
  test("a letter changed, dropped or added costs one", () => {
    expect(match("गनेश", "जयगणेशदेव").cost).toBe(1);
    expect(match("गेश", "जयगणेशदेव").end).toBe(6);
    expect(match("गणेशश", "जयगणेशदेव").cost).toBe(1);
  });
  test("only within from … to", () => {
    expect(match("जय", "जयदेवजय", 2)).toEqual({ end: 7, cost: 0 });
  });
  test("lineAt finds the line a letter is in", () => {
    const d = makeDoc([{ text: "जय देव" }, { text: "" }, { text: "मंगल" }]);
    expect([lineAt(d, 0), lineAt(d, 4), lineAt(d, 5), lineAt(d, 8)]).toEqual([0, 0, 2, 2]);
  });
});

describe("locate, on the site's texts", () => {
  const pv = at("vedic-chant-pavamana-suktam");
  const sk = at("aarti-sukhkarta");
  test("lost: a Pavamana verse, misheard, is found in the whole Library, at its last line", () => {
    const i = lineWith(pv, "९.००१.०२");
    const r = locate(heard(pv, i - 1, i), docs, null);
    expect(r).toMatchObject({ doc: pv, line: i, scope: "any", held: false });
  });
  test("following: the next verse is found near the last place", () => {
    const i = lineWith(pv, "९.००१.०१");
    const r = locate(heard(pv, i + 1, i + 2), docs, { doc: pv, line: i });
    expect(r).toMatchObject({ doc: pv, line: i + 2, scope: "near" });
  });
  test("following: a jump far back in the same text is found in the whole text", () => {
    const i = lineWith(pv, "९.००१.०२");
    const r = locate(heard(pv, i - 1, i), docs, { doc: pv, line: lineWith(pv, "९.०६६.०४") });
    expect(r).toMatchObject({ doc: pv, line: i, scope: "text" });
  });
  test("following an aarti: its dhrupad, sung after a stanza, keeps the place", () => {
    const lines = pieceLines(pieces[sk]);
    const stanza = lines.findIndex((l) => l.text.includes("मुक्ताफळांची"));
    const r = locate(heard(sk, 0, 2), docs, { doc: sk, line: stanza });
    expect(r).toMatchObject({ doc: sk, line: stanza, held: true });
  });
  test("the next stanza of an aarti is found", () => {
    const lines = pieceLines(pieces[sk]);
    const stanza = lines.findIndex((l) => l.text.includes("मुक्ताफळांची"));
    const next = lines.findIndex((l, n) => n > stanza && !l.refrain);
    const r = locate(heard(sk, next, next + 1), docs, { doc: sk, line: stanza });
    expect(r).toMatchObject({ doc: sk, line: next + 1, held: false });
  });
  test("too little heard, or nothing like any text: no place", () => {
    expect(locate("जय देव", docs, null)).toBeNull();
    expect(locate("", docs, null)).toBeNull();
    expect(locate("क्ष्क्ष्क्ष्क्ष्क्ष्क्ष्क्ष्क्ष्क्ष्क्ष्क्ष्क्ष्", docs, null)).toBeNull();
  });
  test("every text searched quickly enough to follow along (well under a second)", () => {
    const i = lineWith(pv, "९.०६६.०४");
    const t0 = performance.now();
    locate(heard(pv, i - 1, i), docs, null);
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});

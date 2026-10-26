// The text file format (js/text/format.js): what a file means, and the mistakes it refuses.
// Every bundled text must also read back and write out byte for byte the same.
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { formatText, parseText, toHtml, toMarks } from "../../js/text/format.js";

const HEAD = "id: x\ntitle: क\ntitle-en: K\ncategory: aarti\nlanguage: mr\n";
const parse = (body, head = "") => parseText(HEAD + head + "---\n" + body);

describe("header", () => {
  test("required and optional fields", () => {
    const t = parse("[1]\nक\nK\n", "legacy-id: a1\nline-ids: s1l\nline-id-exceptions: s1l4=s1l4r, s1l5=s1l5b\nlayout: prose\ncredit: रचना : [नाव](https://mr.wikipedia.org/wiki/नाव)\n");
    expect(t).toMatchObject({
      id: "x",
      title: "क",
      titleEn: "K",
      category: "aarti",
      language: "mr",
      legacyId: "a1",
      lineIds: "s1l",
      lineIdExceptions: { s1l4: "s1l4r", s1l5: "s1l5b" },
      refrain: "none",
      layout: "prose",
      credit: "रचना : [नाव](https://mr.wikipedia.org/wiki/नाव)",
    });
  });
  test.each([
    ["a missing field", "id: x\ntitle: क\ncategory: aarti\nlanguage: mr\n---\n", /"title-en" is missing/],
    ["an unknown field", HEAD + "colour: red\n---\n", /unknown header field "colour"/],
    ["a field twice", HEAD + "title: ख\n---\n", /"title" given twice/],
    ["an unknown language", HEAD.replace("language: mr", "language: en") + "---\n", /language must be one of/],
    ["an unknown refrain", HEAD + "refrain: sometimes\n---\n", /refrain must be one of/],
    ["no end of header", HEAD, /no "---" line/],
    ["a line that is not a field", HEAD + "just words\n---\n", /expected "name: value"/],
  ])("refuses %s", (_, raw, err) => {
    expect(() => parseText(raw, "x.txt")).toThrow(err);
  });
});

describe("blocks", () => {
  test("stanzas, dhrupad, para, bold, notes and refrain lines", () => {
    const t = parse("[dhrupad bold]\nक\nK\n[refrain]\nख\nKh\n\n[1]\nग\nG\n\n[para 2]\nघ\nGh\n\n[note: ↻ ३ वेळा | 3 times]\n");
    expect(t.blocks).toEqual([
      { kind: "dhrupad", bold: true, lines: [{ orig: "क", en: "K", rf: false }, { orig: "ख", en: "Kh", rf: true }] },
      { kind: "stanza", n: 1, lines: [{ orig: "ग", en: "G", rf: false }] },
      { kind: "stanza", n: 2, para: true, lines: [{ orig: "घ", en: "Gh", rf: false }] },
      { kind: "note", note: { mr: "↻ ३ वेळा", en: "3 times" }, lines: [] },
    ]);
  });
  test("every-verse: dhrupad first, optionally as repeated, and before the first verse", () => {
    const t = parse("[dhrupad]\nक\nK\n\n[dhrupad repeated]\nक // ख\nK\n\n[1]\nग\nG\n", "refrain: every-verse\nrefrain-before-first: yes\n");
    expect(t.refrain).toBe("every-verse");
    expect(t.refrainFirst).toBe(true);
    expect(t.blocks.map((b) => b.kind)).toEqual(["dhrupad", "dhrupad-repeated", "stanza"]);
  });
  test("every-verse: [once] lines and [note]s may come before the dhrupad, and [once] lines anywhere", () => {
    const body = "[once]\nक\nK\n\n[note: अ | a]\n\n[dhrupad]\nख\nKh\n\n[dhrupad repeated]\nख // ख\nKh\n\n[1]\nग\nG\n\n[once]\nघ\nGh\n";
    const t = parse(body, "refrain: every-verse\n");
    expect(t.blocks.map((b) => b.kind)).toEqual(["once", "note", "dhrupad", "dhrupad-repeated", "stanza", "once"]);
    expect(t.blocks[0].lines).toEqual([{ orig: "क", en: "K", rf: false }]);
    expect(formatText(t)).toBe(HEAD + "refrain: every-verse\n---\n" + body);
  });
  test.each([
    ["an English line missing", "[1]\nक\n\n", /an original line with no English line/],
    ["two original lines in a row", "[1]\nक\nख\n", /expected the everyday English line/],
    ["English where the original goes", "[1]\nK\nक\n", /expected an original line/],
    ["a line outside a block", "क\nK\n", /a line outside a block/],
    ["a stanza out of order", "[1]\nक\nK\n\n[3]\nख\nKh\n", /stanza \[3\] should be \[2\]/],
    ["an unknown block", "[chorus]\nक\nK\n", /unknown block "\[chorus\]"/],
    ["an empty block", "[1]\n\n", /a block with no lines/],
    ["lines in a note", "[note: अ | a]\nक\nK\n", /a \[note\] block has no lines/],
    ["[refrain] outside a block", "[refrain]\nक\nK\n", /\[refrain\] goes inside a block/],
  ])("refuses %s", (_, body, err) => {
    expect(() => parse(body)).toThrow(err);
  });
  test.each([
    ["no dhrupad first", "[1]\nक\nK\n", "refrain: every-verse\n", /needs a \[dhrupad\] block first/],
    ["two dhrupads", "[dhrupad]\nक\nK\n\n[1]\nख\nKh\n\n[dhrupad]\nग\nG\n", "refrain: every-verse\n", /one \[dhrupad\] block/],
    ["a repeat of another length", "[dhrupad]\nक\nK\n\n[dhrupad repeated]\nक\nK\nख\nKh\n", "refrain: every-verse\n", /as many lines/],
    ["a repeat without every-verse", "[dhrupad]\nक\nK\n\n[dhrupad repeated]\nक\nK\n", "", /\[dhrupad repeated\] comes right after/],
    ["before-first without every-verse", "[1]\nक\nK\n", "refrain-before-first: yes\n", /needs refrain: every-verse/],
    ["a stanza before the dhrupad", "[once]\nक\nK\n\n[1]\nख\nKh\n\n[dhrupad]\nग\nG\n", "refrain: every-verse\n", /needs a \[dhrupad\] block first/],
    ["[once] lines and no dhrupad", "[once]\nक\nK\n", "refrain: every-verse\n", /needs a \[dhrupad\] block first/],
    ["a repeat not right after the dhrupad", "[once]\nक\nK\n\n[dhrupad]\nख\nKh\n\n[1]\nग\nG\n\n[dhrupad repeated]\nख\nKh\n", "refrain: every-verse\n", /\[dhrupad repeated\] comes right after/],
  ])("every-verse rules: refuses %s", (_, body, head, err) => {
    expect(() => parse(body, head)).toThrow(err);
  });
  test("an error names the file and line", () => {
    expect(() => parseText(HEAD + "---\n[1]\nक\nख\n", "x.txt")).toThrow("x.txt line 9: expected the everyday English line here");
  });
});

describe("the words are kept exactly", () => {
  test("svara marks, nukta and spacing are not changed or normalised", () => {
    // ॑ ॒ ᳚ and an NFD-decomposed क़ (क + ़), which Unicode normalisation would change
    const line = "स्थि॒रैरङ्गै᳚स्तुष्टु॒वाग्ंस॑स्त॒नूभिः॑  क़ ।";
    const t = parse("[1]\n" + line + "\nSthira |\n");
    expect(t.blocks[0].lines[0].orig).toBe(line);
  });
  test("Windows line ends and a byte order mark are accepted", () => {
    const t = parseText("﻿" + (HEAD + "---\n[1]\nक\nK\n").replace(/\n/g, "\r\n"));
    expect(t.blocks[0].lines[0]).toEqual({ orig: "क", en: "K", rf: false });
  });
  test("¦ and // become a zero-width space and a line break, and back", () => {
    expect(toHtml("कर, ¦निढळावरी")).toBe("कर, ​निढळावरी");
    expect(toHtml("ये ।¦ // येई")).toBe("ये ।​<br>येई");
    expect(toHtml("Parasmai |  // Narayana")).toBe("Parasmai | <br>Narayana");
    expect(toHtml("a < b & c")).toBe("a &lt; b &amp; c");
    for (const s of ["ये ।​<br>येई", "Parasmai | <br>Narayana", "कर, ​निढळावरी", "a &lt; b &amp; c"]) expect(toHtml(toMarks(s))).toBe(s);
  });
});

describe("every text in content/texts/", () => {
  const dir = new URL("../../content/texts/", import.meta.url);
  const names = readdirSync(dir).filter((f) => f.endsWith(".txt"));
  test("there are texts", () => expect(names.length).toBeGreaterThanOrEqual(11));
  test.each(names)("%s reads and writes back byte for byte", (f) => {
    const raw = readFileSync(new URL(f, dir), "utf8");
    const t = parseText(raw, f);
    expect(t.id + ".txt").toBe(f);
    expect(formatText(t)).toBe(raw);
  });
});

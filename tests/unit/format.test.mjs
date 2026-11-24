// The text file format (js/text/format.js): what a file means, and the mistakes it refuses.
// Every bundled text must also read back and write out byte for byte the same.
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { formatText, parseText, toHtml, toMarks } from "../../js/text/format.js";

const HEAD = "id: x\ntitle: क\ntitle-en: K\nlanguage: mr\n";
const parse = (body, head = "") => parseText(HEAD + head + "---\n" + body);

describe("header", () => {
  test("required and optional fields", () => {
    const t = parse(
      "[1]\nक\nK\n",
      "legacy-id: a1\nline-ids: s1l\nline-id-exceptions: s1l4=s1l4r, s1l5=s1l5b\nlayout: prose\ncredit: source rigveda | मण्डल ९ | Mandala 9\n",
    );
    expect(t).toMatchObject({
      id: "x",
      title: "क",
      titleEn: "K",
      language: "mr",
      legacyId: "a1",
      lineIds: "s1l",
      lineIdExceptions: { s1l4: "s1l4r", s1l5: "s1l5b" },
      refrain: "none",
      layout: "prose",
      credit: { role: "source", who: "rigveda", detail: { mr: "मण्डल ९", en: "Mandala 9" } },
    });
  });
  // a text's credit in one line (Satish, 2026-11-15): its role, the key of a person or a source in content/credits.json,
  // another it is also credited to, and what only the text says; written back as it was
  test.each([
    ["author samarth-ramdas", { role: "author", who: "samarth-ramdas" }],
    ["author vishnudas-nama, also namdev", { role: "author", who: "vishnudas-nama", also: "namdev" }],
    ["attributed adi-shankara", { role: "attributed", who: "adi-shankara" }],
    [
      "compiled namdev | व संस्कृत स्तोत्रे | and Sanskrit verses",
      { role: "compiled", who: "namdev", detail: { mr: "व संस्कृत स्तोत्रे", en: "and Sanskrit verses" } },
    ],
    ["traditional", { role: "traditional" }],
  ])("a credit: %s", (line, want) => {
    const t = parse("[1]\nक\nK\n", "credit: " + line + "\n");
    expect(t.credit).toEqual(want);
    expect(formatText(t)).toContain("\ncredit: " + line + "\n");
  });
  test.each([
    ["a missing field", "id: x\ntitle: क\nlanguage: mr\n---\n", /"title-en" is missing/],
    ["an unknown field", HEAD + "colour: red\n---\n", /unknown header field "colour"/],
    ["a field twice", HEAD + "title: ख\n---\n", /"title" given twice/],
    ["an unknown language", HEAD.replace("language: mr", "language: en") + "---\n", /language must be one of/],
    ["an unknown refrain", HEAD + "refrain: sometimes\n---\n", /refrain must be one of/],
    ["no end of header", HEAD, /no "---" line/],
    ["a line that is not a field", HEAD + "just words\n---\n", /expected "name: value"/],
    ["an unknown layout", HEAD + "layout: poem\n---\n", /layout can only be "prose" or "lines"/],
    // where a text stands is the library's (content/library.json), not the file's
    ["a category", HEAD + "category: aarti\n---\n", /unknown header field "category"/],
    // a credit names its person or source by their key in content/credits.json; the credit lines themselves are the site's
    ["a credit written out", HEAD + "credit: रचना : X\n---\n", /credit is "author samarth-ramdas"/],
    ["an unknown role", HEAD + "credit: composer eknath\n---\n", /credit is "author/],
    ["a key not in lower case and hyphens", HEAD + "credit: author Samarth_Ramdas\n---\n", /credit is "author/],
    ["a detail in one language", HEAD + "credit: source rigveda | मण्डल ९\n---\n", /credit is "author/],
    ["traditional with a name", HEAD + "credit: traditional eknath\n---\n", /credit is "author/],
    ["also with no author", HEAD + "credit: attributed adi-shankara, also namdev\n---\n", /", also" another person goes with author/],
    // (the fields a credit was written in before 2026-11-15)
    ["the old fields", HEAD + "author: eknath\n---\n", /unknown header field "author"/],
    // lines and letters are written by npm run texts: whole numbers
    ["lines that are not a number", HEAD + "lines: twelve\n---\n", /lines is a whole number/],
    ["letters of 0", HEAD + "letters: 0\n---\n", /letters is a whole number/],
    // a recording: YouTube only, a watch link, its start a whole second
    ["a recording that is not YouTube", HEAD + "recording: [X](https://music.apple.com/album/1)\n---\n", /recording is/],
    ["a short youtu.be link", HEAD + "recording: [X](https://youtu.be/OQhyYdoKW1k)\n---\n", /recording is/],
    ["a recording link with tracking", HEAD + "recording: [X](https://www.youtube.com/watch?v=OQhyYdoKW1k&si=abc)\n---\n", /recording is/],
    ["a recording with no name", HEAD + "recording: https://www.youtube.com/watch?v=OQhyYdoKW1k\n---\n", /recording is/],
  ])("refuses %s", (_, raw, err) => {
    expect(() => parseText(raw, "x.txt")).toThrow(err);
  });
});

test("a recording line: one or more YouTube links, each with the second its text starts at if not at once", () => {
  const two = "[A B](https://www.youtube.com/watch?v=OQhyYdoKW1k&t=90), [C](https://www.youtube.com/watch?v=mozgkHM8h2U)";
  const t = parse("[1]\nक\nK\n", "recording: " + two + "\n");
  expect(t.recording).toBe(two);
  expect(parseText(formatText(t))).toEqual(t);
});

describe("blocks", () => {
  test("stanzas, dhrupad, para, bold, notes and refrain lines", () => {
    const t = parse("[dhrupad bold]\nक\nK\n[refrain]\nख\nKh\n\n[1]\nग\nG\n\n[para 2]\nघ\nGh\n\n[note: ↻ ३ वेळा | 3 times]\n");
    expect(t.blocks).toEqual([
      {
        kind: "dhrupad",
        bold: true,
        lines: [
          { orig: "क", en: "K", rf: false },
          { orig: "ख", en: "Kh", rf: true },
        ],
      },
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
  test("every-verse: a [dhrupad bold] after the verses is a closing line, said once", () => {
    const body = "[dhrupad]\nक\nK\n\n[1]\nग\nG\n\n[dhrupad bold]\nघ\nGh\n";
    const t = parse(body, "refrain: every-verse\n");
    expect(t.blocks.map((b) => b.kind + (b.bold ? " bold" : ""))).toEqual(["dhrupad", "stanza", "dhrupad bold"]);
    expect(formatText(t)).toBe(HEAD + "refrain: every-verse\n---\n" + body);
  });
  test.each([
    ["an English line missing", "[1]\nक\n\n", /an original line with no English line/],
    ["two original lines in a row", "[1]\nक\nख\n", /expected the everyday English line/],
    ["English where the original goes", "[1]\nK\nक\n", /expected an original line/],
    ["a line outside a block", "क\nK\n", /a line outside a block/],
    ["a stanza out of order", "[1]\nक\nK\n\n[3]\nख\nKh\n", /stanza \[3\] should be \[2\]/],
    ["an unknown block", "[verse]\nक\nK\n", /unknown block "\[verse\]"/],
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
    [
      "a repeat not right after the dhrupad",
      "[once]\nक\nK\n\n[dhrupad]\nख\nKh\n\n[1]\nग\nG\n\n[dhrupad repeated]\nख\nKh\n",
      "refrain: every-verse\n",
      /\[dhrupad repeated\] comes right after/,
    ],
  ])("every-verse rules: refuses %s", (_, body, head, err) => {
    expect(() => parse(body, head)).toThrow(err);
  });
  test("who sings: [lead], [chorus] and [together] mark the pairs after them, up to the next, and are written back where they change", () => {
    const body = "[1]\n[lead]\nक\nK\n[chorus]\nक\nK\nख\nKh\n\n[2]\n[chorus]\nग\nG\n[together]\nघ\nGh\n";
    const t = parse(body);
    expect(t.blocks.map((b) => b.lines.map((l) => l.who))).toEqual([
      ["lead", "chorus", "chorus"],
      ["chorus", "together"],
    ]);
    expect(formatText(t)).toBe(HEAD + "---\n" + body);
    expect(parseText(formatText(t))).toEqual(t);
  });
  test("who sings goes with refrain lines and every-verse, and a text without it has no who at all", () => {
    const body = "[1]\n[lead]\nग\nG\n[refrain]\n[together]\nक\nK\n";
    const t = parse(body);
    expect(t.blocks[0].lines).toEqual([
      { orig: "ग", en: "G", rf: false, who: "lead" },
      { orig: "क", en: "K", rf: true, who: "together" },
    ]);
    expect(formatText(t)).toBe(HEAD + "---\n" + body);
    const ev = "[dhrupad]\n[lead]\nक\nK\n[chorus]\nक\nK\n\n[1]\n[lead]\nग\nG\n";
    expect(formatText(parse(ev, "refrain: every-verse\n"))).toBe(HEAD + "refrain: every-verse\n---\n" + ev);
    expect(parse("[1]\nक\nK\n").blocks[0].lines[0]).not.toHaveProperty("who");
  });
  test.each([
    ["a mark outside a block", "[lead]\n[1]\nक\nK\n", /\[lead\] goes inside a block/],
    ["a mark between an original and its English", "[1]\n[lead]\nक\n[chorus]\nK\n", /\[chorus\] goes inside a block/],
    ["a mark in a note", "[note: अ | a]\n[lead]\n", /\[lead\] goes inside a block/],
    ["a block without one, in a marked text", "[1]\n[lead]\nक\nK\n\n[2]\nख\nKh\n", /every block/],
    ["lines before the first mark of a block", "[1]\nक\nK\n[lead]\nख\nKh\n", /every block/],
  ])("who sings: refuses %s", (_, body, err) => {
    expect(() => parse(body)).toThrow(err);
  });
  test("an error names the file and line", () => {
    expect(() => parseText(HEAD + "---\n[1]\nक\nख\n", "x.txt")).toThrow("x.txt line 8: expected the everyday English line here");
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

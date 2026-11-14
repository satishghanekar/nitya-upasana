// Go to's outline (js/text/outline.js): every text's places, kept as a snapshot so a change in a text's structure shows
// in review; and where a position is, the verse a reader types, a session's places.
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { buildContent } from "../../js/text/content.js";
import { parseText } from "../../js/text/format.js";
import { arabic, outline, placeAt, sessionOutline, verseAt, verseByNumber } from "../../js/text/outline.js";

const read = (p) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const lib = JSON.parse(read("content/library.json"));
const C = buildContent(lib, Object.fromEntries(lib.texts.map((t) => [t.id, read("content/" + t.file)])), JSON.parse(read("content/categories.json")));
const pieces = C.categories.flatMap((c) => c.pieces);
const piece = (id) => pieces.find((p) => p.text === id);
const of = (id) => outline(piece(id), C.outline);

/** An outline as lines of text: each place, indented under the one it is in, and the text's verses in short */
function written(o) {
  const out = [];
  const walk = (ps, d) =>
    ps.forEach((p) => {
      out.push("  ".repeat(d) + `${p.kind} ${p.key}: ${p.label.mr} / ${p.label.en} @ ${p.line}`);
      if (p.kids) walk(p.kids, d + 1);
    });
  walk(o.places, 1);
  const v = o.verses;
  out.push(`  ${v.length} verses: ${v[0].n.en} … ${v.at(-1).n.en}`);
  return out.join("\n");
}

test("every text's outline, or none for a short text", async () => {
  const all = pieces
    .map((p) => {
      const o = outline(p, C.outline);
      return o ? `${p.text}\n${written(o)}` : `${p.text}: none`;
    })
    .join("\n");
  await expect(all + "\n").toMatchFileSnapshot("__snapshots__/outlines.txt");
});

test("the thresholds come from content/library.json", () => {
  expect(C.outline).toEqual({ minLines: 60, group: 25 });
  // a short aarti has none; with a lower threshold it would
  expect(outline(piece("aarti-sukhkarta"), C.outline)).toBeNull();
});

describe("what each kind of long text gets", () => {
  test("headings, with parts named by the reference they start with: Pavamana's adhyayas and suktas", () => {
    const o = of("vedic-chant-pavamana-suktam");
    expect(o.places.map((p) => p.label.en)).toEqual(["Prathama Adhyaya", "Dvitiya Adhyaya", "Tritiya Adhyaya", "Chaturtha Adhyaya"]);
    const third = o.places[2].kids;
    expect(third[0].label).toEqual({ mr: "९.४४", en: "9.44" });
    expect(third.at(-1).label.en).toBe("9.64");
    expect(o.places.flatMap((p) => p.kids).length).toBe(67);
  });
  test("parts named by part-name and counted in each heading: Shree Rudra's anuvakas", () => {
    const o = of("vedic-chant-shree-rudra");
    expect(o.places.map((p) => p.label.en)).toEqual(["Namakam", "Chamakam"]);
    for (const s of o.places) {
      expect(s.kids.length).toBe(11);
      expect(s.kids[4].label).toEqual({ mr: "अनुवाकः ५", en: "Anuvaka 5" });
    }
  });
  test("a long run of verses in groups, by the numbers written: Lalita, and Vishnu's restart in each heading", () => {
    const l = of("vedic-chant-lalita-sahasranama");
    expect(l.places.at(-1).kids.map((k) => k.label.en)).toEqual(["1–25", "26–50", "51–75", "76–100", "101–125", "126–150", "151–175", "176–183"]);
    const v = of("vedic-chant-vishnu-sahasranama");
    expect(v.places.map((p) => p.label.en)).toEqual(["Purva Bhaga", "Purva Nyasa", "Dhyanam", "Stotram", "Uttara Bhaga"]);
    expect(v.places[3].kids.at(-1).label.en).toBe("101–108");
    // the 108 of the stotram and the 33 of the closing verses each count from 1
    const sec = v.places[3].key;
    expect(v.verses.filter((x) => x.sec === sec).map((x) => x.n.en)).toEqual(Array.from({ length: 108 }, (_, i) => String(i + 1)));
  });
});

describe("where a position is", () => {
  const o = of("vedic-chant-pavamana-suktam");
  // a page where line n is n px down
  const top = (l) => +l.split(".").pop();
  test("the path of places at or above the reading line", () => {
    const at = (y) => placeAt(o.places, top, y).map((p) => p.label.en);
    const third = o.places[2],
      p47 = third.kids[3];
    expect(at(top(p47.line))).toEqual(["Tritiya Adhyaya", "9.47"]);
    expect(at(top(p47.line) + 5)).toEqual(["Tritiya Adhyaya", "9.47"]);
    expect(at(top(third.line))).toEqual(["Tritiya Adhyaya", "9.44"]);
    expect(at(0)).toEqual([]);
  });
  test("a place not on the page (folded away) is passed over", () => {
    const off = o.places[1].line;
    const at = placeAt(o.places, (l) => (l === off ? null : top(l)), top(o.places[2].line) - 1);
    expect(at[0].label.en).toBe("Prathama Adhyaya");
  });
  test("the verse, within its heading", () => {
    const l = of("vedic-chant-lalita-sahasranama");
    const v108 = l.verses[107];
    expect(verseAt(l.verses, top, top(v108.line) + 1).n).toEqual({ mr: "१०८", en: "108" });
  });
});

describe("the verse a reader types", () => {
  test("in either digits, under the heading they are in first", () => {
    const v = of("vedic-chant-vishnu-sahasranama");
    const stotram = v.places[3].key,
      closing = v.places[4].key;
    expect(verseByNumber(v.verses, "२२", stotram).sec).toBe(stotram);
    expect(verseByNumber(v.verses, "22", closing).sec).toBe(closing);
    expect(verseByNumber(v.verses, "108", closing).sec).toBe(stotram);
    expect(verseByNumber(v.verses, "999", stotram)).toBeNull();
    expect(verseByNumber(v.verses, " ", stotram)).toBeNull();
  });
  test("a sukta by its reference: 9.47 is its first verse", () => {
    const o = of("vedic-chant-pavamana-suktam");
    expect(verseByNumber(o.verses, "९.४७").n.en).toBe("9.047.01");
  });
  test("arabic() reads Devanagari digits", () => {
    expect(arabic("१०८ ९.०४७")).toBe("108 9.047");
  });
});

test("a session's places: its texts, each with its own places under it", () => {
  const ids = ["aarti-sukhkarta", "vedic-chant-pavamana-suktam"];
  const texts = ids.map((id) => {
    const p = piece(id);
    return { id: p.id, title: p.title, line: p.items.find((i) => i.lines).lines[0].l };
  });
  const s = sessionOutline(texts, Object.fromEntries(ids.map((id) => [piece(id).id, outline(piece(id), C.outline)])));
  expect(s.map((x) => [x.kind, x.label.en, (x.kids || []).length])).toEqual([
    ["text", "Sukhkarta Dukhharta", 0],
    ["text", "Pavamana Suktam", 4],
  ]);
});

test("part-name is checked like every header field", () => {
  const head = "id: x\ntitle: क\ntitle-en: K\ncategory: aarti\nlanguage: mr\n";
  expect(parseText(head + "part-name: अनुवाकः | Anuvaka\n---\n[1]\nक\nK\n").partName).toBe("अनुवाकः | Anuvaka");
  expect(() => parseText(head + "part-name: अनुवाकः\n---\n[1]\nक\nK\n")).toThrow(/part-name/);
  expect(piece("vedic-chant-shree-rudra").partName).toEqual({ mr: "अनुवाकः", en: "Anuvaka" });
});

// The texts became files (slice 1). The proof that not a character changed: the site's own code
// (js/text/content.js) rebuilds, from content/library.json and content/texts/*.txt, an object
// identical to the old window.CONTENT, frozen as it was in tests/unit/fixtures/pieces.js (the old content/pieces.js,
// unchanged). Then the checks every text file must pass (listed once, its header's facts up to date, no Unicode
// normalisation).
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";
import { parseText } from "../../js/text/format.js";
import { buildContent, PAGE_LANGUAGE, toPiece } from "../../js/text/content.js";
import { factsOf } from "../tools/texts.mjs";
import { menuWords } from "../../js/core/strings.js";
import { CONTENT, FILES as files, IDS, LIBRARY, TEXTS, VERSION_IDS } from "../content-files.mjs";

// The old CONTENT, copied out of the vm context so it compares as plain objects
const win = {};
vm.runInNewContext(readFileSync(new URL("fixtures/pieces.js", import.meta.url), "utf8"), { window: win });
const OLD = JSON.parse(JSON.stringify(win.CONTENT));

const count = (s, re) => (s.match(re) || []).length;
// the old file had the reading page's groups (पूजा, आरती); CONTENT now has the Library's categories (2026-10-21)
const pieces = (C) => (C.categories || C.groups).flatMap((g) => g.pieces);
const allLines = (C) => pieces(C).flatMap((p) => [...(p.refrain ? p.refrain.lines : []), ...p.items.flatMap((i) => i.lines || [])]);

describe("CONTENT from the text files", () => {
  const C = CONTENT;
  // The texts added since (Shri Rudra, Shri Sukta, the Gondavalekar Maharaj aartis and ashtaks, …) are left out of the
  // comparison: every text the old file had must come out of the text files exactly as it was, in the same order.
  // Each piece now also names its text (text: its id in library.json), which the old file did not have.
  const OLD_IDS = new Set(pieces(OLD).map((p) => p.id));
  const same = pieces(C)
    .filter((p) => OLD_IDS.has(p.id))
    // (and each [note] is now marked as one, nt, which the old file did not have either: Ghalin Lotangan's ↻ ३ वेळा;
    // nor a recording to hear under the credit, since 2026-11-11: the Atharvashirsha's; and since 2026-11-15 a credit is
    // written by the site from content/credits.json, each person and source once: tests/unit/credits.test.mjs checks
    // the credits; nor, since 2026-11-26, the Listen card at the top of a text with a recording)
    .map(({ text, credit, listen, ...p }) => ({ ...p, items: p.items.map(({ nt, ...i }) => i) })); // eslint-disable-line no-unused-vars
  const OLD_PIECES = pieces(OLD).map(({ credit, ...p }) => p); // eslint-disable-line no-unused-vars
  const OLD_C = { categories: [{ pieces: same }] };
  const byId = (Cx, id) => pieces(Cx).find((p) => p.id === id);
  test("is identical to the old content/pieces.js", () => {
    expect(same).toStrictEqual(OLD_PIECES);
    // and in the same key order, so even the order the page meets things in is unchanged
    expect(JSON.stringify(same)).toBe(JSON.stringify(OLD_PIECES));
    // (with the version switch's label since 2026-11-15)
    // (and the who-sings words since 2026-11-24)
    const { version, who, ...ui } = C.ui; // eslint-disable-line no-unused-vars
    expect(ui).toStrictEqual(OLD.ui);
  });
  // (60 <br>: the Vitthal Aarti's dhrupad breaks after its first half in English and at the top too, Satish 2026-10-23)
  test("the marks that matter are all there: 60 <br>, 156 zero-width spaces, svara marks", () => {
    const s = JSON.stringify(allLines(OLD_C));
    expect(count(s, /<br>/g)).toBe(60);
    expect(count(s, /​/g)).toBe(156);
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
    const head = "id: x\ntitle: क\ntitle-en: K\nlanguage: mr\nrefrain: every-verse\n---\n";
    const t = parseText(head + "[once]\nक\nK\n\n[note: अ | a]\n\n[dhrupad]\nख\nKh\n\n[1]\nग\nG\n\n[once]\nघ\nGh\n");
    const p = toPiece(t, 1);
    expect(p.lead).toEqual([
      { kind: "dh", lines: [{ l: "x.1", mr: "क", en: "K" }] },
      { rmk: { mr: "अ", en: "a" }, nt: true },
    ]);
    expect(p.refrain.lines).toEqual([{ mr: "ख", en: "Kh" }]);
    expect(p.items.map((i) => i.kind || (i.rmk ? "rmk" : "stanza"))).toEqual(["stanza", "rmk", "rf", "dh"]);
    expect(p.items.flatMap((i) => (i.lines || []).map((l) => l.l))).toEqual(["x.2", "x.3", "x.4"]);
  });
  // a closing [dhrupad bold] in a text with a dhrupad: said once, bold, with no dhrupad after it
  test("every-verse: a closing [dhrupad bold] is said once, in bold", () => {
    const head = "id: x\ntitle: क\ntitle-en: K\nlanguage: mr\nrefrain: every-verse\n---\n";
    const p = toPiece(parseText(head + "[dhrupad]\nख\nKh\n\n[1]\nग\nG\n\n[dhrupad bold]\nघ\nGh\n"), 1);
    expect(p.items.map((i) => i.kind || (i.rmk ? "rmk" : "stanza"))).toEqual(["stanza", "rmk", "rf", "dh"]);
    expect(p.items[3]).toEqual({ kind: "dh", bold: true, lines: [{ l: "x.3", mr: "घ", en: "Gh" }] });
  });
  // who sings (2026-11-24): each line carries its singer, after rf, also in the dhrupad sung again after a stanza
  test("who sings: each line carries who sings it, the dhrupad sung again too", () => {
    const head = "id: x\ntitle: क\ntitle-en: K\nlanguage: mr\nrefrain: every-verse\n---\n";
    const p = toPiece(parseText(head + "[dhrupad]\n[lead]\nख\nKh\n[chorus]\nख\nKh\n\n[1]\n[lead]\nग\nG\n[together]\nघ\nGh\n"), 1);
    expect(p.items[0].lines).toEqual([
      { l: "x.1", who: "lead", mr: "ग", en: "G" },
      { l: "x.2", who: "together", mr: "घ", en: "Gh" },
    ]);
    expect(p.items[2].lines.map((l) => l.who)).toEqual(["lead", "chorus"]);
    expect(JSON.stringify(p.items[2].lines[0])).toBe('{"l":"x.3","rf":true,"who":"lead","mr":"ख","en":"Kh"}');
  });
  // with no dhrupad: [once] lines at the top go above the text (lead), later ones stand where they are
  test("no dhrupad: [once] lines at the top lead, later ones stand where they are", () => {
    const head = "id: x\ntitle: क\ntitle-en: K\nlanguage: sa\n---\n";
    const t = parseText(head + "[once]\nक\nK\n\n[1]\nग\nG\n\n[once]\nघ\nGh\n");
    const p = toPiece(t, 1);
    expect(p.lead).toEqual([{ kind: "dh", lines: [{ l: "x.1", mr: "क", en: "K" }] }]);
    expect(p.items.map((i) => i.kind || "stanza")).toEqual(["stanza", "dh"]);
    expect(p.items.flatMap((i) => i.lines.map((l) => l.l))).toEqual(["x.2", "x.3"]);
  });
  // layout: lines is a Vedic chant (prose: its font, its glued references, its printout) set line by line (lines)
  test("layout: lines is a Vedic chant set line by line", () => {
    const head = "id: x\ntitle: क\ntitle-en: K\nlanguage: sa\nlayout: lines\n---\n";
    const p = toPiece(parseText(head + "[1]\nक\nK\n"), 1);
    expect(p.prose).toBe(true);
    expect(p.cls).toBe("lines");
    expect(toPiece(parseText(head.replace("lines", "prose") + "[1]\nक\nK\n"), 1).cls).toBeUndefined();
  });
  test("a text missing from the files, or listed twice, stops the build", () => {
    expect(() => buildContent(LIBRARY, { ...files, "aarti-sukhkarta": undefined })).toThrow("texts/aarti-sukhkarta.txt: not loaded");
    const twice = { categories: [...LIBRARY.categories, { id: "more", name: { mr: "अ", en: "A" }, texts: ["aarti-sukhkarta"] }] };
    expect(() => buildContent(twice, files)).toThrow("library.json: aarti-sukhkarta is listed twice");
  });
  // the page's language is written once in the code and once in index.html (<html lang>), and they agree: a text in it
  // carries no lang of its own, one in another language does (for screen readers and the fonts)
  test("the page's language is index.html's, and only a text in another language says its own", () => {
    const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    expect(/<html lang="([^"]+)"/.exec(html)[1]).toBe(PAGE_LANGUAGE);
    expect(CONTENT.pageLanguage).toBe(PAGE_LANGUAGE);
    const head = (l) => "id: x\ntitle: क\ntitle-en: K\nlanguage: " + l + "\n---\n[1]\nक\nK\n";
    expect(toPiece(parseText(head(PAGE_LANGUAGE)), 1).lang).toBeUndefined();
    expect(toPiece(parseText(head("sa")), 1).lang).toBe("sa");
  });
});

// A text sung in more than one way (Satish, 2026-11-15: the Hanuman Chalisa as Tulsidas wrote it and as it is
// commonly sung): each version a file of its own, built into a piece that stands in the text's place
describe("a text's versions", () => {
  const vs = CONTENT.versions["stotra-hanuman-chalisa"];
  test("the Hanuman Chalisa: Tulsidas's own first, then the popular one, each named for the switch", () => {
    expect(vs.map((v) => [v.ver, v.name.mr, v.name.en])).toEqual([
      ["stotra-hanuman-chalisa", "तुलसीदास", "Tulsidas"],
      ["stotra-hanuman-chalisa-popular", "प्रचलित", "Popular"],
    ]);
    expect(Object.keys(CONTENT.versions)).toEqual(["stotra-hanuman-chalisa"]);
  });
  test("the Ganesha Pancharatnam, sung as a bhajan: जय गणेश before the first stanza and after every one", () => {
    const t = parseText(files["stotra-ganesha-pancharatnam"], "x");
    expect([t.refrain, t.versionName]).toEqual(["every-verse", undefined]);
    const lines = t.blocks.flatMap((b) => b.lines.map((l) => l.orig));
    expect(lines[0]).toBe("जय गणेश जय गणेश, ¦जय गणेश पाहि माम् ।");
    expect(lines[1]).toBe("मुदाकरात्त मोदकं सदा विमुक्ति साधकम् ।");
  });
  test("the text's own is the piece in the Library; the other has its id, number and text id, and its own lines", () => {
    const [own, popular] = vs.map((v) => v.piece);
    expect(CONTENT.categories.flatMap((c) => c.pieces)).toContain(own);
    expect([popular.id, popular.text, popular.no]).toEqual([own.id, own.text, own.no]);
    expect([own.ver, popular.ver]).toEqual(["stotra-hanuman-chalisa", "stotra-hanuman-chalisa-popular"]);
    const line = (p, n) => p.items.filter((i) => i.lines)[n].lines[0];
    expect(line(own, 2).mr).toBe("महाबीर बिक्रम बजरंगी ।");
    expect(line(popular, 2).mr).toBe("महावीर विक्रम बजरंगी ।");
    // a version is never listed as a text of its own
    expect(CONTENT.texts["stotra-hanuman-chalisa-popular"]).toBeUndefined();
  });
  test("a version needs a name, and versions of a text no category lists stop the build", () => {
    const lib = { categories: [{ id: "stotra", name: { mr: "स्तोत्र", en: "Stotra" }, texts: ["stotra-a"] }], versions: { "stotra-a": ["stotra-b"] } };
    const file = (id, name) => `id: ${id}\ntitle: क\ntitle-en: K\nlanguage: hi\n${name ? "version-name: " + name + "\n" : ""}---\n[1]\nक\nK\n`;
    const ok = buildContent(lib, { "stotra-a": file("stotra-a", "क | A"), "stotra-b": file("stotra-b", "ख | B") });
    expect(ok.versions["stotra-a"].map((v) => v.name.en)).toEqual(["A", "B"]);
    expect(() => buildContent(lib, { "stotra-a": file("stotra-a", "क | A"), "stotra-b": file("stotra-b") })).toThrow(
      /stotra-b.txt: a text with versions needs a version-name/,
    );
    expect(() => buildContent({ ...lib, versions: { "stotra-z": ["stotra-b"] } }, { "stotra-a": file("stotra-a") })).toThrow(
      /versions of stotra-z, which no category lists/,
    );
    expect(() => parseText(file("stotra-a", "क"))).toThrow(/version-name/);
  });
});

describe("content checks", () => {
  const names = readdirSync(new URL("../../content/texts/", import.meta.url)).filter((f) => !f.startsWith("."));
  test("every text's id, and so its file name, starts with the category the library lists it in", () => {
    for (const t of TEXTS) expect(t.id.startsWith(t.category + "-"), t.id).toBe(true);
  });
  test("library.json lists every file in content/texts/, once: in a category, or as another version of a text", () => {
    const all = IDS.concat(VERSION_IDS);
    expect([...all].sort()).toEqual(names.map((f) => f.replace(/\.txt$/, "")).sort());
    expect(new Set(all).size).toBe(all.length);
  });
  test("the reading order is the Library's: its categories in order, each numbered from 1, every text once", () => {
    const C = CONTENT;
    expect(C.categories.map((c) => c.id)).toEqual(LIBRARY.categories.map((c) => c.id));
    expect(C.categories.map((c) => c.name)).toEqual(LIBRARY.categories.map((c) => c.name));
    expect(pieces(C).map((p) => p.text)).toEqual(IDS);
    for (const c of C.categories) {
      expect(c.pieces.map((p) => p.no.en)).toEqual(c.pieces.map((_, i) => i + 1 + "."));
      for (const p of c.pieces) expect(C.texts[p.text].category).toBe(c.id);
    }
  });
  // Everything about a text is in its own file (Satish, 2026-11-15): its header's lines and letters (as chanted) are
  // written by npm run texts from the text itself; edit a text and forget it, and this names the file
  test.each(IDS.concat(VERSION_IDS).map((id) => [id]))("%s: its header's lines and letters are up to date (npm run texts)", (id) => {
    const t = parseText(files[id], id + ".txt");
    const f = factsOf(files[id], id + ".txt");
    expect(t.lines).toBe(f.lines);
    // (an app without times, Sankathara Chaturthi, does not count letters)
    if (f.letters !== undefined) expect(t.letters).toBe(f.letters);
    // its language named in the site's words, in every menu language (js/strings/, "text")
    for (const l of ["mr", "en", "kn", "te", "gu"]) expect(menuWords("text", l).lang[t.language], l).toBeTruthy();
  });
  test.each(IDS.concat(VERSION_IDS).map((id) => [id]))("%s is not changed by Unicode normalisation", (id) => {
    const raw = files[id];
    expect(raw === raw.normalize("NFC")).toBe(true);
  });
  test.each(IDS.map((id) => [id]))("%s: verse numbers agree in both languages", (id) => {
    const DV = "०१२३४५६७८९";
    const nums = (s, re) => [...s.matchAll(re)].map((m) => m[1]);
    const t = parseText(files[id], id);
    t.blocks.forEach((b) =>
      b.lines.forEach((l) => {
        const mr = nums(l.orig, /॥\s*([०-९]+(?:\.[०-९]+)*)\s*॥/g).map((d) => d.replace(/[०-९]/g, (c) => DV.indexOf(c)));
        const en = nums(l.en, /\|\|\s*([0-9.]+)\s*\|\|/g);
        en.forEach((n) => expect(n, `${id}: "${l.en}"`).toMatch(/^[0-9]+(\.[0-9]+)*$/));
        if (mr.length && en.length) expect(en, `${id}: "${l.orig}" / "${l.en}"`).toEqual(mr);
      }),
    );
  });
  // Pavamana Suktam, from the 107-page booklet (content/pdfs/pavamana-suktam.pdf, "Collection by M. Pramod"): every
  // verse of Rigveda 9.1–9.67 once, in order, each hymn starting a paragraph
  test("Pavamana Suktam: Rigveda 9.1.1 to 9.67.32, every verse once and in order", () => {
    const t = parseText(files["vedic-chant-pavamana-suktam"], "vedic-chant-pavamana-suktam");
    const refs = [];
    const paras = [];
    t.blocks.forEach((b) => {
      const all = b.lines.map((l) => l.en).join(" ");
      const m = /\|\| 9\.(\d{3})\.(\d{2})/.exec(all);
      if (b.kind === "stanza") {
        expect(m, `block ${b.n} has its reference`).toBeTruthy();
        refs.push([+m[1], +m[2]]);
        if (b.para) paras.push(+m[1]);
      }
    });
    expect(refs.length).toBe(610);
    expect(refs[0]).toEqual([1, 1]);
    expect(refs[refs.length - 1]).toEqual([67, 32]);
    refs.slice(1).forEach(([h, v], i) => {
      const [ph, pv] = refs[i];
      expect(h === ph ? v === pv + 1 : h === ph + 1 && v === 1, `9.${h}.${v} after 9.${ph}.${pv}`).toBe(true);
    });
    expect(paras).toEqual(Array.from({ length: 67 }, (_, i) => i + 1));
  });
  // Its four adhyayas, as both published recordings divide it (the Challakere Brothers' and the Bhats'): a heading
  // before each one's first verse, 9.1.1, 9.13.1, 9.44.1 and 9.65.1 (Satish, 2026-11-11); then the khila mantras, a
  // heading of their own after the last verse, 9.67.32, so Go to reaches them (Satish, 2026-11-17)
  test("Pavamana Suktam: a heading before the first verse of each of its four adhyayas, and before the khila mantras", () => {
    const t = parseText(files["vedic-chant-pavamana-suktam"], "vedic-chant-pavamana-suktam");
    const heads = [];
    t.blocks.forEach((b, i) => {
      if (b.kind !== "note") return;
      const next = t.blocks[i + 1].lines.map((l) => l.en).join(" "),
        ref = /\|\| (9\.\d{3}\.\d{2})/.exec(next);
      heads.push([b.note.en, ref ? ref[1] : next.split(" |")[0]]);
    });
    expect(heads).toEqual([
      ["Prathama Adhyaya", "9.001.01"],
      ["Dvitiya Adhyaya", "9.013.01"],
      ["Tritiya Adhyaya", "9.044.01"],
      ["Chaturtha Adhyaya", "9.065.01"],
      ["Khilamantrah", "Pavamanih Svastyayanih Sudugha Hi Ghrutashchutah"],
    ]);
  });
  // Pavamana Suktam opens with the prayer to Ganapati, Sarasvati and the Veda as the Bhats chant it: Shri Gurubhyo
  // Namah, Harih Om, then each mantra with its namah line. It was a text of its own in 1.52.0; it belongs here, in
  // Pavamana Suktam, once (Satish, 2026-11-11)
  test("Pavamana Suktam opens with the Ganapati and Sarasvati prayer, each mantra with its namah line", () => {
    expect(IDS).not.toContain("vedic-chant-ganapati-sarasvati-prarthana");
    const t = parseText(files["vedic-chant-pavamana-suktam"], "vedic-chant-pavamana-suktam");
    const opening = t.blocks.slice(0, 5).map((b) => b.lines.map((l) => l.en));
    expect(opening[0]).toEqual(["|| Pavamanasuktam ||"]);
    expect(opening[1]).toEqual(["Shri Gurubhyo Namah | Harih Om ||"]);
    expect(opening.slice(2).map((b) => b[b.length - 1])).toEqual([
      "Shri Mahaganapataye Namah ||",
      "Shri Mahasarasvatyai Namah ||",
      "Shri Vedapurushaya Namah ||",
    ]);
    ["गणानां᳚ त्वा", "प्र णो᳚ दे॒वी", "वेद॒ वात॑स्य"].forEach((m) => expect(files["vedic-chant-pavamana-suktam"].split(m).length).toBe(2));
  });
  // Purusha Suktam: each verse a paragraph of its own, a space after every ॥ १ ॥ as Shri Rudra has after each
  // anuvaka; Shri Sukta line by line, as Lalita and Pavamana (Satish, 2026-11-10)
  test("Purusha Suktam's every verse starts a paragraph; Shri Sukta is set line by line", () => {
    const pu = parseText(files["vedic-chant-purusha-suktam"], "vedic-chant-purusha-suktam");
    const verses = pu.blocks.filter((b) => b.kind !== "dhrupad");
    expect(verses).toHaveLength(10);
    expect(verses.every((b) => b.para)).toBe(true);
    expect(parseText(files["vedic-chant-shri-sukta"], "vedic-chant-shri-sukta").layout).toBe("lines");
  });
  // The Shivanjali book (Bharatiya Hindu Temple, Columbus): its pieces the site did not have yet, made from the book's
  // English edition and checked against its Sanskrit one (Satish, 2026-11-11). Ganapati Atharvashirsha, Laghunyasa,
  // Shri Rudra (with Chamakam), Purusha Suktam and Durga Suktam were here already.
  const SHIVANJALI = {
    "vedic-chant-shivopasana-mantra": 36,
    "vedic-chant-mantrapushpam": 88,
    "aarti-jai-shiv-omkara": 16,
    "stotra-shiva-panchakshara": 12,
    "stotra-shiva-ashtottara-shatanamavali": 108,
    "stotra-prarthana-shlokas": 16,
    "ashtak-lingashtakam": 18,
    "ashtak-nandikeshvara-ashtakam": 16,
    "ashtak-rudrashtakam": 16,
    // not in the book, two more Shiva and Surya pieces Satish sent: Kalabhairava Ashtakam (sanskritdocuments.org, checked
    // line by line against the Chamara metre) and the Chakshushopanishad (its copy's typing slips corrected)
    "ashtak-kalabhairava-ashtakam": 18,
    "vedic-chant-chakshushopanishad": 21,
  };
  test("the Shivanjali pieces are texts, each once, with all their lines", () => {
    for (const [id, n] of Object.entries(SHIVANJALI)) {
      expect(
        IDS.filter((x) => x === id),
        id,
      ).toHaveLength(1);
      const t = parseText(files[id], id);
      expect(
        t.blocks.reduce((a, b) => a + b.lines.length, 0),
        id,
      ).toBe(n);
    }
    // the 108 names, each once, numbered every ten as the book does, the last ॥ १०८ ॥
    const names = parseText(files["stotra-shiva-ashtottara-shatanamavali"], "x").blocks.flatMap((b) => b.lines.map((l) => l.orig));
    expect(new Set(names.map((l) => l.replace(/[।॥०-९ ]/g, ""))).size).toBe(108);
    expect(names.every((l) => l.startsWith("ॐ ") && /नमः/.test(l))).toBe(true);
    expect(names[107]).toBe("ॐ परमेश्वराय नमः ॥ १०८ ॥");
    // the arati sung with its refrain after every verse, as the other aartis
    expect(parseText(files["aarti-jai-shiv-omkara"], "x").refrain).toBe("every-verse");
  });
  test("categories: Vedic Chant, Aarti, Stotra, Ashtak, Bhajan", () => {
    expect(LIBRARY.categories.map((c) => c.id)).toEqual(["vedic-chant", "aarti", "stotra", "ashtak", "bhajan"]);
  });
});

// Recordings to hear (Satish, 2026-11-11), each checked against the text: the Challakere Brothers' Rudradhyaya video
// (its chapters: Atharvashirsha after the album's 90-second invocation, Namakam 11:25, Shivopasana 42:14, Durga Suktam
// 46:18) and two Pavamana videos from the start. Laghunyasa is left out: their Nyasam starts at its fifth part.
test("the texts with a recording link to it, at the second each starts", () => {
  const at = (id) => parseText(files[id], id).recording;
  expect(at("vedic-chant-atharvashirsha")).toBe("[Challakere Brothers](https://www.youtube.com/watch?v=OQhyYdoKW1k&t=90)");
  expect(at("vedic-chant-shri-rudra")).toMatch(/OQhyYdoKW1k&t=685\)$/);
  expect(at("vedic-chant-shivopasana-mantra")).toMatch(/OQhyYdoKW1k&t=2534\)$/);
  expect(at("vedic-chant-durga-suktam")).toMatch(/OQhyYdoKW1k&t=2778\)$/);
  expect(at("vedic-chant-pavamana-suktam").split(", ")).toHaveLength(2);
  expect(at("vedic-chant-laghunyasa")).toBeUndefined();
  // Rajshri Soul's Lalita from 1:27, after its music, at the names (it chants no Nyasa or Dhyanam); Kalabhairava, a
  // voice-only recording Satish chose (not the one aligned: it is shorter)
  expect(at("vedic-chant-lalita-sahasranama")).toBe("[Rajshri Soul](https://www.youtube.com/watch?v=DtSBLpQStT4&t=87)");
  expect(at("ashtak-kalabhairava-ashtakam")).toMatch(/RQ85ltEoPAE\)$/);
  // Jagjit Singh's Gaiye Ganapati from 0:15, where the singing starts (Viveka heard it there; Satish confirmed, 2026-11-23)
  expect(at("bhajan-gaiye-ganapati-jagvandan")).toMatch(/aASYnk-eaXI&t=15\)$/);
});

// Shri Sukta as the family chants it (Satish's sheet, 2026-11-11): the fifteen verses of the hymn, then
// सर्वमङ्गलमाङ्गल्ये with गौरि and नारायणि नमोऽस्तु ते three times, the Lakshmi and Bhudevi Gayatris and the shanti;
// verse 16 (यः शुचिः, which names the hymn "the fifteen verses") and the later verses are the Shri Sukta Phalashruti
test("Shri Sukta is the hymn as chanted at home; its phalashruti and later verses are a text of their own", () => {
  const ss = parseText(files["vedic-chant-shri-sukta"], "ss");
  expect(ss.blocks.filter((b) => b.kind === "stanza").map((b) => b.n)).toEqual([...Array(15)].map((_, i) => i + 1));
  const tail = ss.blocks.filter((b) => b.kind === "once").map((b) => b.lines.map((l) => l.orig).join(" "));
  expect(tail).toHaveLength(4);
  expect(tail[0]).toMatch(/त्र्यम्बके गौरि नारायणि नमोऽस्तु ते ॥ नारायणि नमोऽस्तु ते ॥ नारायणि नमोऽस्तु ते ॥$/);
  expect(tail[1]).toMatch(/^ॐ महादेव्यै च विद्महे/);
  expect(tail[2]).toBe("ॐ धनुर्धरायै विद्महे सर्वसिद्ध्यै च धीमहि । तन्नो धरा प्रचोदयात् ॥");
  expect(tail[3]).toMatch(/शान्तिः/);
  const ph = parseText(files["vedic-chant-shri-sukta-phalashruti"], "ph");
  expect(ph.blocks.find((b) => b.kind === "stanza").lines[0].orig).toMatch(/^यः शुचिः प्रयतो भूत्वा/);
  // nothing lost: every line of the old text is in one of the two, but सर्वमङ्गल now as chanted
  expect(ss.blocks.concat(ph.blocks).reduce((n, b) => n + b.lines.length, 0)).toBe(84 - 5 + 8);
});

// Every line displays in every script without a dotted circle (◌), checked with HarfBuzz and the site's own fonts
// (2026-11-11): accent marks on a Rigveda kampa numeral (दू॒त्यं१॒॑) cannot carry an anusvara or visarga after them, so
// these come before the numeral; and no sign the Kannada, Telugu and Gujarati fonts lack (the Vedic ꣳ)
test("no line has a sign that breaks its display: ं or ः after a kampa numeral's accents, or ꣳ", () => {
  for (const [id, raw] of Object.entries(files)) {
    const t = parseText(raw, id);
    for (const b of t.blocks)
      for (const l of b.lines) {
        expect(l.orig, id).not.toMatch(/[०-९][॒॑᳚]+[ंः]/);
        expect(l.orig, id).not.toMatch(/ꣳ/);
      }
  }
});

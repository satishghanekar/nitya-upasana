// One-off migration (slice 1, Oct 2026): turns the old content/pieces.js (kept, unchanged, as the test fixture
// tests/unit/fixtures/pieces.js) into one plain-text file per text in content/texts/, plus content/library.json
// and content/categories.json. Before writing anything it rebuilds CONTENT from what it is about to write
// (js/text/content.js, as the site does) and stops unless the result is identical to the old CONTENT.
//
//   cd tests && node tools/migrate.mjs [path/to/pieces.js]
//
// Kept for the record. The text files are now the source: edit them, not pieces.js, and don't run this again
// (it would overwrite the files with the old texts).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import vm from "node:vm";
import { formatText, parseText, toMarks } from "../../js/text/format.js";
import { buildContent } from "../../js/text/content.js";

const root = new URL("../../", import.meta.url);
const src = process.argv[2] || new URL("unit/fixtures/pieces.js", new URL("../", import.meta.url)).pathname;
const win = {};
vm.runInNewContext(readFileSync(src, "utf8"), { window: win });
// (copied out of the vm context, so its objects compare as plain objects of this one)
const C = JSON.parse(JSON.stringify(win.CONTENT));

// Readable ids (decision Q1) and categories (Q2), by today's piece id
const IDS = {
  p1: ["atharvashirsha", "vedic-chant"],
  a1: ["sukhkarta", "aarti"],
  a2: ["shendur-lal-chadhayo", "aarti"],
  a3: ["durge-durghat-bhari", "aarti"],
  a4: ["lavathavati-vikrala", "aarti"],
  a5: ["trigunatmak-traimurti", "aarti"],
  a6: ["aarti-dnyanaraja", "aarti"],
  a7: ["yei-o-vitthale", "aarti"],
  a8: ["ghalin-lotangan", "aarti"],
  a9: ["jai-ganesh-deva", "aarti"],
  a10: ["jai-jagdish-hare", "aarti"],
};
const CATEGORIES = [
  { id: "vedic-chant", name: { mr: "वैदिक मंत्र", en: "Vedic Chant" }, order: 1 },
  { id: "aarti", name: { mr: "आरती", en: "Aarti" }, order: 2 },
  { id: "stotra", name: { mr: "स्तोत्र", en: "Stotra" }, order: 3 },
  { id: "ashtak", name: { mr: "अष्टक", en: "Ashtak" }, order: 4 },
];

const PAGE_LANG = "mr";
function must(ok, msg) {
  if (!ok) throw new Error(msg);
}
const same = (a, b) => isDeepStrictEqual(a, b);
const marks = (s) => {
  const t = toMarks(s);
  must(!/[<&]/.test(t), "markup other than <br> in a line: " + s);
  return t;
};
const pairLine = (x, rf) => ({ orig: marks(x.mr), en: marks(x.en), rf: !!rf });

// Credit HTML → "[name](address)" text, one string per language
function creditText(html) {
  const plain = html.replace(
    /<a href="([^"]*)" target="_blank" rel="noopener" aria-label="[^"]*">([^<]*)<span class="crx" aria-hidden="true"> ↗<\/span><\/a>/g,
    "[$2]($1)",
  );
  const m = /^<span class="mr">([^<]*)<\/span><span class="en" lang="en">([^<]*)<\/span>(?:<small><span class="mr">([^<]*)<\/span><span class="en" lang="en">([^<]*)<\/span><\/small>)?$/.exec(plain);
  must(m, "credit not understood: " + html);
  return { credit: m[1], creditEn: m[2], creditNote: m[3], creditNoteEn: m[4] };
}

const lib = { texts: [], groups: [], pageLanguage: PAGE_LANG, languages: {}, refrain: null, ui: C.ui, wiki: C.wiki };
const files = {};

for (const g of C.groups) {
  lib.groups.push({ id: g.id, btn: g.btn, name: g.name, texts: g.pieces.map((p) => IDS[p.id][0]) });
  for (const p of g.pieces) {
    const [id, category] = IDS[p.id];
    const language = p.lang || PAGE_LANG;
    must(!lib.languages[language] || same(lib.languages[language], p.tag), p.id + ": a different tag for " + language);
    lib.languages[language] = p.tag;
    must(!p.cls || p.cls === "norf", p.id + ": unknown cls");
    const t = { id, title: p.title.mr, titleEn: p.title.en, category, language, legacyId: p.id };
    // line ids: a prefix and a count; anything else is an exception
    const ids = p.items.flatMap((it) => (it.lines || []).map((l) => l.l));
    t.lineIds = /^(.*?)\d+$/.exec(ids[0])[1];
    const ex = {};
    ids.forEach((l, k) => {
      if (l !== t.lineIds + (k + 1)) ex[t.lineIds + (k + 1)] = l;
    });
    if (Object.keys(ex).length) t.lineIdExceptions = ex;
    const blocks = [];
    let n = 0;
    if (p.refrain) {
      t.refrain = "every-verse";
      lib.refrain = lib.refrain || { label: p.refrain.label, note: null };
      must(same(lib.refrain.label, p.refrain.label), p.id + ": a different refrain label");
      blocks.push({ kind: "dhrupad", lines: p.refrain.lines.map((x) => pairLine(x)) });
      const rfs = p.items.filter((it) => it.kind === "rf");
      const rep = rfs[0].lines.map((x) => pairLine(x));
      must(rfs.every((it) => same(it.lines.map((x) => pairLine(x)), rep)), p.id + ": the repeated dhrupads differ");
      if (!same(rep, blocks[0].lines)) blocks.push({ kind: "dhrupad-repeated", lines: rep });
      if (p.items[0].rmk) t.refrainFirst = true;
      for (const it of p.items) {
        if (it.rmk) {
          lib.refrain.note = lib.refrain.note || it.rmk;
          must(same(lib.refrain.note, it.rmk), p.id + ": a different refrain note");
        } else if (it.kind !== "rf") {
          must(!it.kind && !it.bold, p.id + ": unexpected item");
          const b = { kind: "stanza", n: ++n, lines: it.lines.map((x) => pairLine(x, x.rf)) };
          if (it.para) b.para = true;
          blocks.push(b);
        }
      }
    } else {
      t.refrain = p.cls === "norf" ? "always" : "none";
      for (const it of p.items) {
        if (it.rmk) blocks.push({ kind: "note", note: it.rmk, lines: [] });
        else if (it.kind === "dh") blocks.push({ kind: "dhrupad", ...(it.bold ? { bold: true } : {}), lines: it.lines.map((x) => pairLine(x, x.rf)) });
        else {
          must(!it.kind && !it.bold, p.id + ": unexpected item");
          const b = { kind: "stanza", n: ++n, lines: it.lines.map((x) => pairLine(x, x.rf)) };
          if (it.para) b.para = true;
          blocks.push(b);
        }
      }
    }
    if (p.prose) t.layout = "prose";
    Object.assign(t, creditText(p.credit));
    for (const k of Object.keys(t)) if (t[k] === undefined) delete t[k];
    t.blocks = blocks;
    const raw = formatText(t);
    must(same(parseText(raw, id), t), p.id + ": the file does not read back as written");
    files[id] = raw;
    const lines = blocks.reduce((a, b) => a + b.lines.length, 0);
    lib.texts.push({ id, file: "texts/" + id + ".txt", title: t.title, titleEn: t.titleEn, category, language, lines });
  }
}

// The proof: the site's own code rebuilds exactly the old CONTENT from the new files
const built = buildContent(lib, files);
must(same(built, C), "the rebuilt CONTENT differs from the old one");
must(JSON.stringify(built) === JSON.stringify(C), "the rebuilt CONTENT has its keys in a different order");

mkdirSync(new URL("content/texts/", root), { recursive: true });
for (const [id, raw] of Object.entries(files)) writeFileSync(new URL("content/texts/" + id + ".txt", root), raw);
writeFileSync(new URL("content/library.json", root), JSON.stringify(lib, null, 1) + "\n");
writeFileSync(new URL("content/categories.json", root), JSON.stringify(CATEGORIES, null, 1) + "\n");
console.log("Wrote " + Object.keys(files).length + " texts, " + lib.texts.reduce((a, t) => a + t.lines, 0) + " line pairs; CONTENT identical.");

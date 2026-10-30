// The menu words (js/core/strings.js, js/strings/*.js): every language has every word English has, a sentence with
// values in it takes the same values in every language, and a part moved to the catalog keeps no Marathi of its own.
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { LANGS, menuWords } from "../../js/core/strings.js";
import en from "../../js/strings/en.js";

// The sentences that take a list of names, not one value
const LISTS = ["routine.copied"];

// The parts whose words are in the catalog; each one moved adds its file here
const MOVED = [
  "js/features/backup.js",
  "js/features/profiles.js",
  "js/features/library.js",
  "js/features/today-card.js",
  "js/features/routine-builder.js",
  "js/print/what.js",
  "js/features/offline.js",
  "js/text/search.js",
  "js/features/share.js",
  "js/features/reading-sheet.js",
  "js/features/languages.js",
  "js/features/dhrupad-button.js",
  "js/features/bottom-bar.js",
  "js/features/settings-panel.js",
  "js/features/pinch.js",
  "js/features/pdfs.js",
];

/** Every word's path in a set of words, with what kind it is: "string", "function/2" (two values), "list/12" */
function shape(o, at = "") {
  return Object.entries(o).flatMap(([k, v]) => {
    const p = at ? at + "." + k : k;
    if (typeof v === "function") return [[p, "function/" + v.length]];
    if (Array.isArray(v)) return [[p, "list/" + v.length]];
    if (v && typeof v === "object") return shape(v, p);
    return [[p, typeof v]];
  });
}

describe("the menu words", () => {
  for (const [code, words] of Object.entries(LANGS)) {
    test(`${code}: the same words as English, each the same kind`, () => {
      expect(shape(words)).toEqual(shape(en));
    });
    test(`${code}: no word is empty, and each sentence gives a sentence`, () => {
      for (const [path, kind] of shape(words)) {
        const keys = path.split("."),
          on = keys.slice(0, -1).reduce((o, k) => o[k], words),
          v = on[keys[keys.length - 1]];
        if (kind === "string") expect(v.trim(), path).not.toBe("");
        if (kind.startsWith("function/")) {
          // (values as digits: a sentence may write them in Devanagari, or lowercase a name)
          // (a sentence that takes a list: LISTS)
          const list = LISTS.includes(path),
            args = (i, x) => Array.from({ length: v.length }, (_, j) => (list ? [j === i ? x : "2"] : j === i ? x : "2"));
          // (called as the parts call it: a sentence may use its part's other words, this.days)
          const say = (a) => v.apply(on, a);
          expect(typeof say(args(-1)), path).toBe("string");
          // every value given changes the sentence
          for (let i = 0; i < v.length; i++) expect(say(args(i, "3")), path + " value " + i).not.toBe(say(args(i, "5")));
        }
      }
    });
  }

  test("a word a language lacks comes from English", () => {
    // (the first part's first two words, and a level of words such as backup.problems when a part has one)
    const part = Object.keys(en)[0],
      [have, lack] = Object.keys(en[part]).filter((k) => typeof en[part][k] === "string"),
      deep = Object.entries(en).flatMap(([p, w]) =>
        Object.keys(w)
          .filter((k) => w[k] && typeof w[k] === "object" && !Array.isArray(w[k]))
          .map((k) => [p, k]),
      )[0];
    LANGS.zz = { [part]: { [have]: "zz" } };
    if (deep) LANGS.zz[deep[0]] = { ...LANGS.zz[deep[0]], [deep[1]]: {} };
    try {
      const w = menuWords(part, "zz");
      expect(w[have]).toBe("zz");
      expect(w[lack]).toBe(en[part][lack]);
      if (deep) expect(menuWords(deep[0], "zz")[deep[1]]).toEqual(en[deep[0]][deep[1]]);
    } finally {
      delete LANGS.zz;
    }
  });

  test("index.html: every word the page names (data-w) is in the catalog, and no Marathi / English span pairs are left", () => {
    const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    const named = [...html.matchAll(/data-w="([^"]+)"/g)].map((m) => m[1]);
    expect(named.length).toBeGreaterThan(10);
    for (const path of named) {
      const v = path.split(".").reduce((o, k) => (o == null ? o : o[k]), en);
      expect(typeof v, path).toBe("string");
    }
    expect(html.match(/<span class="mr">/g) || []).toEqual([]);
  });

  test("the parts moved to the catalog keep no Marathi words of their own", () => {
    for (const f of MOVED) {
      // (comments may show an example)
      const src = readFileSync(new URL("../../" + f, import.meta.url), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      // (letters only: a danda or a Devanagari digit in a pattern is not a word)
      expect(src.match(/[\u0900-\u0963\u0970-\u097F][^"'\n]*/g) || [], f).toEqual([]);
    }
  });
});

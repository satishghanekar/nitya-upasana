// The credits (js/text/content.js creditOf; Satish, 2026-11-15): each person and source written once, in
// content/credits.json; a text's header names one in its credit line ("credit: author samarth-ramdas", "credit:
// source rigveda | मण्डल ९ | Mandala 9") and the site writes its credit lines in both languages, with its own words
// around the names (js/strings/, "text"), each marked (data-tw) for the scripts' own words.
import { describe, expect, test } from "vitest";
import { buildContent } from "../../js/text/content.js";
import { menuWords } from "../../js/core/strings.js";
import { CREDITS, FILES, IDS, LIBRARY, PIECES, SITE, WIKI } from "../content-files.mjs";

const plain = (html) => html.replace(/<[^>]+>/g, "").replace(/ ↗/g, "");
const side = (id, s) => {
  const c = PIECES[id].credit.replace(/<span class="rec".*$/, "");
  const at = c.indexOf('<span class="en"');
  return s === "mr" ? c.slice(0, at) : c.slice(at);
};
const has = (...ids) => ids.every((id) => IDS.includes(id));

describe("the credit lines, from content/credits.json", () => {
  test.skipIf(!has("aarti-sukhkarta"))("a person: रचना : name (time) / By name (time), the name linked", () => {
    expect(plain(side("aarti-sukhkarta", "mr"))).toBe("रचना : समर्थ रामदास (१६०८–१६८२)");
    expect(plain(side("aarti-sukhkarta", "en"))).toBe("By Samarth Ramdas (1608–1682)");
    expect(side("aarti-sukhkarta", "mr")).toContain('data-wiki="Samarth_Ramdas"');
  });
  test.skipIf(!has("aarti-shendur-lal-chadhayo"))("one with no Wikipedia page: the name, no link", () => {
    expect(plain(side("aarti-shendur-lal-chadhayo", "mr"))).toBe("रचना : गोसावीनंदन");
    expect(side("aarti-shendur-lal-chadhayo", "mr")).not.toContain("<a ");
  });
  test.skipIf(!has("aarti-yei-o-vitthale"))("a person also credited: the second line, smaller", () => {
    const c = PIECES["aarti-yei-o-vitthale"].credit;
    expect(c).toMatch(/<small>.*<\/small>/);
    expect(plain(c.match(/<small>(.*)<\/small>/)[1])).toBe("(अशीही मान्यता : संत नामदेव)(also credited to Sant Namdev)");
  });
  test.skipIf(!has("ashtak-kalabhairava-ashtakam"))("attributed: the name where each language puts it", () => {
    expect(plain(side("ashtak-kalabhairava-ashtakam", "mr"))).toBe("आदि शंकराचार्य यांचे मानले जाते");
    expect(plain(side("ashtak-kalabhairava-ashtakam", "en"))).toBe("Attributed to Adi Shankaracharya");
  });
  test.skipIf(!has("vedic-chant-pavamana-suktam", "ashtak-rudrashtakam"))(
    "a source, and what only the text says in brackets (in place of a person's time)",
    () => {
      expect(plain(side("vedic-chant-pavamana-suktam", "mr"))).toBe("ऋग्वेद (मण्डल ९)");
      expect(plain(side("vedic-chant-pavamana-suktam", "en"))).toBe("Rigveda (Mandala 9)");
      expect(plain(side("ashtak-rudrashtakam", "en"))).toBe("By Goswami Tulsidas (Ramcharitmanas, Uttarakanda)");
    },
  );
  test.skipIf(!has("aarti-jai-ganesh-deva", "aarti-ghalin-lotangan"))("traditional, and a compilation", () => {
    expect(plain(side("aarti-jai-ganesh-deva", "mr"))).toBe("पारंपरिक");
    // (what else it gathers goes on from the name, as the book writes it)
    expect(plain(side("aarti-ghalin-lotangan", "mr"))).toBe("संकलन : संत नामदेव व संस्कृत स्तोत्रे");
    expect(plain(side("aarti-ghalin-lotangan", "en"))).toBe("A compilation: Sant Namdev and Sanskrit verses");
  });
  test.skipIf(!has("aarti-sukhkarta"))("the site's words are marked on the original's side (for the scripts' own words), not on the English one", () => {
    expect(side("aarti-sukhkarta", "mr")).toContain('<span data-tw="by">रचना :</span>');
    expect(side("aarti-sukhkarta", "en")).not.toContain("data-tw");
  });
  test.skipIf(!has("aarti-belaguve"))("a text without a credit has an empty one", () => {
    expect(plain(PIECES["aarti-belaguve"].credit)).toBe("");
  });
});

describe("content/credits.json", () => {
  const all = { ...CREDITS.people, ...CREDITS.sources };
  test.skipIf(!has("aarti-sukhkarta"))("every key a text names is in it; a key that is not stops the build, naming the text", () => {
    const bad = { ...FILES, "aarti-sukhkarta": FILES["aarti-sukhkarta"].replace("credit: author samarth-ramdas", "credit: author nobody") };
    expect(() => buildContent(LIBRARY, SITE, bad, { wiki: WIKI, credits: CREDITS, words: menuWords })).toThrow(
      "texts/aarti-sukhkarta.txt: nobody is not one of content/credits.json's people",
    );
  });
  test.skipIf(!has("vedic-chant-pavamana-suktam"))("a source is one of its sources, a person one of its people", () => {
    const bad = { ...FILES, "vedic-chant-pavamana-suktam": FILES["vedic-chant-pavamana-suktam"].replace("credit: source rigveda", "credit: author rigveda") };
    expect(() => buildContent(LIBRARY, SITE, bad, { wiki: WIKI, credits: CREDITS, words: menuWords })).toThrow(
      "texts/vedic-chant-pavamana-suktam.txt: rigveda is not one of content/credits.json's people",
    );
  });
  test("every key in lower case and hyphens, as a text's credit line writes it (its Wikipedia page is its wiki)", () => {
    for (const k of Object.keys(all)) expect(k).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  test("each has its name in both languages, and a person's time in both or neither", () => {
    for (const [k, e] of Object.entries(all)) {
      expect(e.name.mr && e.name.en, k).toBeTruthy();
      if (e.time) expect(e.time.mr && e.time.en, k).toBeTruthy();
    }
  });
  test("its people and sources apart: no key in both", () => {
    for (const k of Object.keys(CREDITS.people)) expect(CREDITS.sources[k], k).toBeUndefined();
  });
  test("each Wikipedia page it names is in content/wiki.json (else: npm run wiki)", () => {
    for (const [k, e] of Object.entries(all)) if (e.wiki) expect(WIKI.pages[e.wiki], k).toBeTruthy();
  });
});

describe("the site's words around a text, in every menu language", () => {
  test("each has them all, and the sentences with a name have one place for it", () => {
    for (const l of ["en", "mr", "kn", "te", "gu"]) {
      const w = menuWords("text", l);
      for (const k of ["refrainLabel", "refrainNote", "prev", "next", "by", "compiledBy", "traditional"]) expect(w[k], l + " " + k).toBeTruthy();
      for (const k of ["attributed", "also"]) expect(w[k].split("{name}"), l + " " + k).toHaveLength(2);
      for (const c of ["sa", "mr", "hi"]) expect(w.lang[c], l + " " + c).toBeTruthy();
    }
  });
  test("Marathi's and English's are what the texts showed before (the dhrupad's label and marker, Previous / Next)", () => {
    expect([menuWords("text", "mr").refrainLabel, menuWords("text", "mr").refrainNote]).toEqual(["ध्रुपद (प्रत्येक कडव्यानंतर म्हणावे)", "↻ ध्रुपद"]);
    expect([menuWords("text", "en").prev, menuWords("text", "en").next]).toEqual(["Previous", "Next"]);
  });
});

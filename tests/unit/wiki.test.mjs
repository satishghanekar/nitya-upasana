// Wikipedia links in every language (js/core/wiki.js; Satish, 2026-11-15): a link names a page by its English Wikipedia
// title (wiki:Samarth_Ramdas), content/wiki.json (npm run wiki) has its page on each
// Wikipedia, js/core/wiki.js ORDER the order each language tries them in.
// A credit names the person it credits (or the source): content/credits.json "wiki".
import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { LANGUAGES, ORDER, pageFor, wikiLabel } from "../../js/core/wiki.js";
import { menuWords } from "../../js/core/strings.js";
import { IDS, PIECES, WIKI } from "../content-files.mjs";
import { NAME, itemsUsed } from "../tools/wiki.mjs";

const P = WIKI.pages;
// (a file an app may not have, Sankathara Chaturthi's festivals and holidays: none)
const read = (p, key) => {
  const u = new URL("../../content/" + p, import.meta.url);
  return existsSync(u) ? JSON.parse(readFileSync(u, "utf8"))[key] : [];
};
const links = (html) => [...html.matchAll(/<a [^>]*>/g)].map((m) => Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]])));
const credit = (id) => {
  const div = PIECES[id].credit;
  return { mr: links(div.split('<span class="en"')[0]), en: links(div.split('<span class="en"')[1] || "") };
};

describe("which page a link opens", () => {
  const pages = { One: { en: "One", mr: "एक", hi: "एक_हि" }, Two: { en: "Two" }, Q3: { gu: "ત્રણ" } };
  test("the first Wikipedia in the language's order that has the page", () => {
    expect(pageFor("One", "mr", pages)).toEqual({ lang: "mr", url: "https://mr.wikipedia.org/wiki/" + encodeURIComponent("एक") });
    expect(pageFor("One", "hi", pages).lang).toBe("hi");
    expect(pageFor("One", "kn", pages).lang).toBe("en");
    expect(pageFor("Two", "mr", pages)).toEqual({ lang: "en", url: "https://en.wikipedia.org/wiki/Two" });
  });
  test("else any page it has (never its Wikidata item), so a link never goes nowhere; a page not in the file, no link", () => {
    expect(pageFor("Q3", "en", pages).lang).toBe("gu");
    expect(pageFor("Nine", "en", pages)).toBeNull();
  });
  test("spaces as underscores, the rest encoded", () => {
    expect(pageFor("Samarth_Ramdas", "mr", P).url).toBe("https://mr.wikipedia.org/wiki/" + encodeURIComponent("समर्थ_रामदास_स्वामी"));
  });
  test("what is heard names the Wikipedia it opens, in the reader's language", () => {
    expect(wikiLabel("समर्थ रामदास", { lang: "mr", url: "" }, "mr", menuWords("wiki", "mr"))).toBe("समर्थ रामदास — विकिपीडिया (नवीन टॅबमध्ये उघडेल)");
    expect(wikiLabel("नरहरी सोनार", { lang: "en", url: "" }, "mr", menuWords("wiki", "mr"))).toBe("नरहरी सोनार — इंग्रजी विकिपीडिया (नवीन टॅबमध्ये उघडेल)");
    expect(wikiLabel("Samarth Ramdas", { lang: "en", url: "" }, "en", menuWords("wiki", "en"))).toBe("Samarth Ramdas: Wikipedia (opens in a new tab)");
    expect(wikiLabel("", { lang: "kn", url: "" }, "kn", menuWords("wiki", "kn"))).toBe(" — ವಿಕಿಪೀಡಿಯ (ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆಯುತ್ತದೆ)");
    expect(wikiLabel("", { lang: "en", url: "" }, "kn", menuWords("wiki", "kn"))).toBe(" — ಇಂಗ್ಲಿಷ್ ವಿಕಿಪೀಡಿಯ (ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆಯುತ್ತದೆ)");
  });
  test("every language a reader reads or has menus in has an order; every menu language names every Wikipedia", () => {
    for (const l of ["mr", "hi", "en", "kn", "te", "gu"]) expect(ORDER[l], l).toBeTruthy();
    for (const l of ["mr", "en", "kn", "te", "gu"]) {
      const w = menuWords("wiki", l);
      for (const x of LANGUAGES) expect(w[x], l + " " + x).toBeTruthy();
      expect(w.tab, l).toBeTruthy();
    }
  });
});

describe("the items the site links to", () => {
  const used = itemsUsed();
  test("every page content/credits.json, a festival or a holiday names is in content/wiki.json (else: npm run wiki)", () => {
    for (const [q, where] of used) expect(P[q], q + " in " + where.join(", ")).toBeTruthy();
  });
  test("content/wiki.json has nothing nothing names, and only page titles, each on a Wikipedia the site opens", () => {
    expect(Object.keys(P).sort()).toEqual([...used.keys()].sort());
    for (const n of Object.keys(P)) {
      expect(Object.keys(P[n]).length, n).toBeGreaterThan(0);
      for (const l of Object.keys(P[n])) expect(LANGUAGES, n + " " + l).toContain(l);
    }
  });
  test("festivals and holidays name their English page as in its address, never a whole address", () => {
    for (const f of read("festivals.json", "festivals")) if (f.wiki) expect(f.wiki, f.id).toMatch(NAME);
    for (const h of read("holidays.json", "holidays")) if (h.wiki) expect(h.wiki, h.id).toMatch(NAME);
  });
});

// (the texts Sankathara Chaturthi has too: the others' tests are skipped there)
const has = (...ids) => ids.every((id) => IDS.includes(id));
describe("the credits' links", () => {
  test("a name links to the person: Sukhkarta's to Samarth Ramdas, in Marathi; in Kannada and Telugu letters theirs", () => {
    const c = credit("aarti-sukhkarta");
    expect(c.mr[0]).toMatchObject({ "data-wiki": "Samarth_Ramdas", hreflang: "mr" });
    expect(decodeURIComponent(c.mr[0].href)).toBe("https://mr.wikipedia.org/wiki/समर्थ_रामदास_स्वामी");
    expect(c.mr[0]["aria-label"]).toBe("समर्थ रामदास — विकिपीडिया (नवीन टॅबमध्ये उघडेल)");
    expect(c.mr[0]["data-kn"]).toMatch(/^kn https:\/\/kn\.wikipedia\.org\//);
    expect(c.mr[0]["data-te"]).toMatch(/^te https:\/\/te\.wikipedia\.org\//);
    // no Gujarati page for him: English, said so
    expect(c.mr[0]["data-gu"]).toMatch(/^en https:\/\/en\.wikipedia\.org\//);
    expect(c.mr[0]["data-gu-label"]).toBe(" — અંગ્રેજી વિકિપીડિયા (નવા ટૅબમાં ખૂલશે)");
    expect(c.en[0]).toMatchObject({ "data-wiki": "Samarth_Ramdas", hreflang: "en", href: "https://en.wikipedia.org/wiki/Samarth_Ramdas" });
  });
  test.skipIf(!IDS.includes("stotra-hanuman-chalisa"))("a Hindi text's credit tries Hindi Wikipedia first: the Hanuman Chalisa's Tulsidas", () => {
    const c = credit("stotra-hanuman-chalisa");
    expect(c.mr[0]).toMatchObject({ "data-wiki": "Tulsidas", hreflang: "hi" });
    expect(c.mr[0]["aria-label"]).toBe("गोस्वामी तुलसीदास — हिंदी विकिपीडिया (नवीन टॅबमध्ये उघडेल)");
  });
  test("with no page in the side's own language, the nearest, and what is heard says which", () => {
    // Narahari Sonar: Marathi and English pages only, so Kannada letters open the English one
    const c = credit("aarti-durge-durghat-bhari").mr[0];
    expect(c["data-kn"]).toMatch(/^en /);
    expect(c["data-kn-label"]).toBe(" — ಇಂಗ್ಲಿಷ್ ವಿಕಿಪೀಡಿಯ (ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆಯುತ್ತದೆ)");
  });
  test("every link of every credit opens a page on one of the site's Wikipedias", () => {
    for (const id of IDS)
      for (const side of ["mr", "en"])
        for (const a of credit(id)[side].filter((x) => x["data-wiki"])) {
          expect(a.href, id).toMatch(/^https:\/\/(mr|hi|en|kn|te|gu)\.wikipedia\.org\/wiki\/./);
          expect(a.href.slice(8, 10), id).toBe(a.hreflang);
        }
  });
});

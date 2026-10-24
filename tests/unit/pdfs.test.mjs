// The Library's PDFs (js/core/pdfs.js): content/pdfs.json as the PDFs tab lists it, with mistakes left out.
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { cleanPdfs, fileOk, pdfHref, pdfShelves } from "../../js/core/pdfs.js";


const RAW = { id: "stotra-dasbodh", file: "pdfs/dasbodh.pdf", title: "दासबोध", titleEn: "Dasbodh", category: "stotra", language: "mr" };
const ONE = { id: "stotra-dasbodh", file: "pdfs/dasbodh.pdf", title: { mr: "दासबोध", en: "Dasbodh" }, category: "stotra", language: "mr" };
const cat = (id, mr, en, order) => ({ id, name: { mr, en }, order, origin: "bundled", original: null });
const CATS = [cat("vedic-chant", "वैदिक मंत्र", "Vedic Chant", 1), cat("aarti", "आरती", "Aarti", 2), cat("stotra", "स्तोत्र", "Stotra", 3)];

describe("cleanPdfs", () => {
  test("reads library.json's fields, in the file's order", () => {
    const two = { id: "vedic-chant-gita", file: "pdfs/gita.pdf", title: "गीता", titleEn: "Gita", category: "vedic-chant", language: "sa" };
    const { titleEn, ...rest } = two;
    expect(cleanPdfs({ pdfs: [RAW, two] })).toEqual([ONE, { ...rest, title: { mr: "गीता", en: titleEn } }]);
  });
  test("a title in one language is used for both; no id: the file's name", () => {
    const p = cleanPdfs({ pdfs: [{ file: "pdfs/a.pdf", titleEn: "Books" }] })[0];
    expect(p.title).toEqual({ mr: "Books", en: "Books" });
    expect(p.id).toBe("a");
    expect(p.category).toBe("");
  });
  test("leaves out a PDF with no title or a bad file", () => {
    const o = { pdfs: [RAW, { file: "pdfs/x.pdf" }, { file: "x.txt", title: "X" }, { file: "../x.pdf", title: "X" }, null, "nonsense"] };
    expect(cleanPdfs(o)).toEqual([ONE]);
  });
  test("nothing for a missing or broken file", () => {
    expect(cleanPdfs(null)).toEqual([]);
    expect(cleanPdfs({})).toEqual([]);
    expect(cleanPdfs({ pdfs: "x" })).toEqual([]);
  });
  test("content/pdfs.json is read without losing a PDF, each in a known category", () => {
    const o = JSON.parse(readFileSync(new URL("../../content/pdfs.json", import.meta.url), "utf8"));
    const ids = JSON.parse(readFileSync(new URL("../../content/categories.json", import.meta.url), "utf8")).map((c) => c.id);
    const got = cleanPdfs(o);
    expect(got.length).toBe(o.pdfs.length);
    for (const p of got) expect(ids).toContain(p.category);
  });
});

describe("pdfShelves", () => {
  test("the texts' categories in their order, empty ones left out", () => {
    const g = { ...ONE, id: "vedic-chant-gita", category: "vedic-chant" };
    const s = pdfShelves([ONE, g], CATS);
    expect(s.map((x) => x.category.id)).toEqual(["vedic-chant", "stotra"]);
    expect(s[1].pdfs).toEqual([ONE]);
  });
  test("an unknown category: the first one, as for a text", () => {
    expect(pdfShelves([{ ...ONE, category: "nope" }], CATS)[0].category.id).toBe("vedic-chant");
  });
  test("the names this phone uses for a category", () => {
    const renamed = [{ ...CATS[2], name: { mr: "स्तोत्रे", en: "Stotras" } }];
    expect(pdfShelves([ONE], renamed)[0].category.name.en).toBe("Stotras");
  });
  test("no categories: nothing", () => {
    expect(pdfShelves([ONE], [])).toEqual([]);
  });
});

describe("files", () => {
  test("only a .pdf in content/pdfs/", () => {
    expect(fileOk("pdfs/dasbodh.pdf")).toBe(true);
    expect(fileOk("pdfs/Shri Guru Charitra.PDF")).toBe(true);
    expect(fileOk("pdfs/sub/a.pdf")).toBe(true);
    for (const f of ["dasbodh.pdf", "/pdfs/a.pdf", "pdfs/../index.html", "pdfs/../a.pdf", "pdfs/a.pdf?x=1", "https://x.org/pdfs/a.pdf", "pdfs/a.txt", 3])
      expect(fileOk(f)).toBe(false);
  });
  test("the address escapes spaces and the like, not the folders", () => {
    expect(pdfHref({ ...ONE, file: "pdfs/Shri Guru Charitra.pdf" })).toBe("content/pdfs/Shri%20Guru%20Charitra.pdf");
    expect(pdfHref(ONE)).toBe("content/pdfs/dasbodh.pdf");
  });
});

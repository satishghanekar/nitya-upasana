// The Library's PDFs (js/core/pdfs.js): content/pdfs.json as the PDFs tab lists it, with mistakes left out.
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { cleanPdfs, fileOk, pdfHref } from "../../js/core/pdfs.js";

const ONE = { file: "pdfs/dasbodh.pdf", title: { mr: "दासबोध", en: "Dasbodh" } };

describe("cleanPdfs", () => {
  test("keeps the groups and their PDFs in the file's order", () => {
    const two = { file: "pdfs/gita.pdf", title: { mr: "गीता", en: "Gita" } };
    const o = { groups: [{ name: { mr: "ग्रंथ", en: "Books" }, pdfs: [ONE, two] }, { name: { mr: "पोथी", en: "Pothi" }, pdfs: [two] }] };
    expect(cleanPdfs(o)).toEqual(o.groups);
  });
  test("a name in one language is used for both", () => {
    const g = cleanPdfs({ groups: [{ name: { en: "Books" }, pdfs: [{ file: "pdfs/a.pdf", title: "दासबोध" }] }] });
    expect(g[0].name).toEqual({ mr: "Books", en: "Books" });
    expect(g[0].pdfs[0].title).toEqual({ mr: "दासबोध", en: "दासबोध" });
  });
  test("leaves out a PDF with no title or a bad file, and a group left empty or unnamed", () => {
    const o = {
      groups: [
        { name: { mr: "ग्रंथ" }, pdfs: [ONE, { file: "pdfs/x.pdf" }, { file: "x.txt", title: "X" }, null] },
        { name: { mr: "रिकामा" }, pdfs: [{ file: "../x.pdf", title: "X" }] },
        { pdfs: [ONE] },
        "nonsense",
      ],
    };
    expect(cleanPdfs(o)).toEqual([{ name: { mr: "ग्रंथ", en: "ग्रंथ" }, pdfs: [ONE] }]);
  });
  test("nothing for a missing or broken file", () => {
    expect(cleanPdfs(null)).toEqual([]);
    expect(cleanPdfs({})).toEqual([]);
    expect(cleanPdfs({ groups: "x" })).toEqual([]);
  });
  test("content/pdfs.json is read without losing a PDF", () => {
    const o = JSON.parse(readFileSync(new URL("../../content/pdfs.json", import.meta.url), "utf8"));
    const listed = o.groups.reduce((n, g) => n + g.pdfs.length, 0);
    expect(cleanPdfs(o).reduce((n, g) => n + g.pdfs.length, 0)).toBe(listed);
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
    expect(pdfHref({ file: "pdfs/Shri Guru Charitra.pdf", title: { mr: "", en: "" } })).toBe("content/pdfs/Shri%20Guru%20Charitra.pdf");
    expect(pdfHref(ONE)).toBe("content/pdfs/dasbodh.pdf");
  });
});

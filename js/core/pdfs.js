// @ts-check
// The Library's PDFs (content/pdfs.json, written like content/library.json: id, file, title, titleEn, category,
// language, and its pages and size in bytes, filled in by tests/tools/pdf-info.mjs): each PDF with its titles and its category, one of the texts' categories (content/categories.json), with
// whatever is missing or mistyped in the file left out, so one bad entry never hides the rest. A title given in one
// language only is used for both. Pure, unit-tested in tests/unit/pdfs.test.mjs; no
// init() (used by js/features/pdfs.js).

import { dv } from "./words.js";

/**
 * @typedef {import("./library.js").Name} Name
 * @typedef {import("./library.js").Category} Category
 * @typedef {{ id: string, file: string, title: Name, category: string, language: string, pages: number, size: number }} Pdf
 *   file: its path under content/ ("pdfs/dasbodh.pdf"); title: { mr: title, en: titleEn }; pages, size (bytes): 0
 *   when not known
 * @typedef {{ category: Category, pdfs: Pdf[] }} PdfShelf
 */

/** @param {unknown} s */
function str(s) {
  return typeof s === "string" ? s.trim() : "";
}

/** A count: a whole number above 0, else 0 @param {unknown} n */
function count(n) {
  return typeof n === "number" && n > 0 && Math.floor(n) === n ? n : 0;
}

/** @param {unknown} n @returns {Name | null} */
function nameOf(n) {
  if (!n || typeof n !== "object") return null;
  var o = /** @type {Record<string, unknown>} */ (n),
    mr = typeof o.mr === "string" ? o.mr.trim() : "",
    en = typeof o.en === "string" ? o.en.trim() : "";
  if (!mr && !en) return null;
  return { mr: mr || en, en: en || mr };
}

/**
 * A PDF's file: a .pdf in content/pdfs/, named by a relative path that can't leave that folder
 * @param {unknown} f
 */
export function fileOk(f) {
  return typeof f === "string" && /^pdfs\/[^?#\\]+\.pdf$/i.test(f) && f.split("/").indexOf("..") < 0;
}

/**
 * The PDFs, in the file's order
 * @param {unknown} o content/pdfs.json as read
 * @returns {Pdf[]}
 */
export function cleanPdfs(o) {
  var list = o && typeof o === "object" ? /** @type {Record<string, unknown>} */ (o).pdfs : null;
  if (!Array.isArray(list)) return [];
  /** @type {Pdf[]} */
  var out = [];
  list.forEach(function (/** @type {any} */ p) {
    var t = p && nameOf({ mr: p.title, en: p.titleEn });
    if (t && fileOk(p.file))
      out.push({ id: str(p.id) || p.file.replace(/^pdfs\//, "").replace(/\.pdf$/i, ""), file: p.file, title: t, category: str(p.category), language: str(p.language), pages: count(p.pages), size: count(p.size) });
  });
  return out;
}

/**
 * The PDFs by category, as the Texts tab lists the texts: the categories in their order, each with its PDFs in the
 * file's order, empty ones left out. A PDF whose category is unknown goes in the first category, as a text would.
 * @param {Pdf[]} pdfs
 * @param {Category[]} cats  the categories as shown now (js/features/library.js)
 * @returns {PdfShelf[]}
 */
export function pdfShelves(pdfs, cats) {
  /** @type {PdfShelf[]} */
  var out = cats.map(function (c) {
    return { category: c, pdfs: [] };
  });
  pdfs.forEach(function (p) {
    var s = out.filter(function (x) {
      return x.category.id === p.category;
    })[0] || out[0];
    if (s) s.pdfs.push(p);
  });
  return out.filter(function (s) {
    return s.pdfs.length;
  });
}

/**
 * A PDF's pages and size as its row shows them, in Marathi and English: "१२० पाने · ४.१ MB", "120 pp · 4.1 MB"
 * (sizes as phones give them, 1 MB = 1,000,000 bytes: KB below 1 MB, MB with one decimal below 10 MB). Either
 * part is left out when not known; "" for both when neither is.
 * @param {Pdf} p
 * @returns {Name}
 */
export function pdfFacts(p) {
  var mb = p.size / 1e6,
    size = !p.size ? "" : mb < 1 ? Math.max(1, Math.round(p.size / 1e3)) + " KB" : (mb < 10 ? (Math.round(mb * 10) / 10).toFixed(1) : String(Math.round(mb))).replace(/\.0$/, "") + " MB";
  return {
    mr: [p.pages ? dv(p.pages) + (p.pages === 1 ? " पान" : " पाने") : "", dv(size)].filter(Boolean).join(" · "),
    en: [p.pages ? p.pages + (p.pages === 1 ? " page" : " pp") : "", size].filter(Boolean).join(" · "),
  };
}

/** The address a PDF opens at, from the page: content/pdfs/… with spaces and the like escaped @param {Pdf} p */
export function pdfHref(p) {
  return "content/" + p.file.split("/").map(encodeURIComponent).join("/");
}

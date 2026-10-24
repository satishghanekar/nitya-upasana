// @ts-check
// The Library's PDFs (content/pdfs.json): the groups and their PDFs as the PDFs tab lists them, with whatever is
// missing or mistyped in the file left out, so one bad entry never hides the rest. A name given in one language only
// is used for both. Pure, unit-tested in tests/unit/pdfs.test.mjs; no init() (used by js/features/pdfs.js).

/**
 * @typedef {import("./library.js").Name} Name
 * @typedef {{ file: string, title: Name }} Pdf   file: its path under content/ ("pdfs/dasbodh.pdf")
 * @typedef {{ name: Name, pdfs: Pdf[] }} PdfGroup
 */

/** @param {unknown} n @returns {Name | null} */
function nameOf(n) {
  if (typeof n === "string") n = { mr: n, en: n };
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
 * The groups with at least one PDF, in the file's order
 * @param {unknown} o content/pdfs.json as read
 * @returns {PdfGroup[]}
 */
export function cleanPdfs(o) {
  var groups = o && typeof o === "object" ? /** @type {Record<string, unknown>} */ (o).groups : null;
  if (!Array.isArray(groups)) return [];
  /** @type {PdfGroup[]} */
  var out = [];
  groups.forEach(function (g) {
    if (!g || typeof g !== "object") return;
    var name = nameOf(g.name),
      list = Array.isArray(g.pdfs) ? g.pdfs : [];
    /** @type {Pdf[]} */
    var pdfs = [];
    list.forEach(function (/** @type {any} */ p) {
      var t = p && nameOf(p.title);
      if (t && fileOk(p.file)) pdfs.push({ file: p.file, title: t });
    });
    if (name && pdfs.length) out.push({ name: name, pdfs: pdfs });
  });
  return out;
}

/** The address a PDF opens at, from the page: content/pdfs/… with spaces and the like escaped @param {Pdf} p */
export function pdfHref(p) {
  return "content/" + p.file.split("/").map(encodeURIComponent).join("/");
}

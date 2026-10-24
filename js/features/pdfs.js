// @ts-check
// The Library's PDFs: the PDFs tab's list, from content/pdfs.json (cleaned by js/core/pdfs.js), one .tocg.pdfg per
// category, the texts' categories with the names this phone uses (js/features/library.js; listed again when they
// change, "nitya-library"), at the end of the Library's list (#jl), so it looks like the texts' list, follows the text size and the
// reading languages, and is put in Kannada letters with it (LATER in js/render.js). The tabs themselves, Texts |
// PDFs, are js/features/contents-list.js's. A PDF opens in a new tab, in the phone's or computer's own PDF viewer
// (Satish, 2026-10-24); on the iPhone's Home Screen app that is a view over the app with Done, so the app stays
// where it was. sw.js keeps each PDF for offline use once it has been opened.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { loaded } from "../text/load.js";
import { cleanPdfs, pdfFacts, pdfHref, pdfShelves } from "../core/pdfs.js";
import { categories } from "./library.js";
import { esc, scr as to } from "../core/words.js";

/** @type {import("../core/pdfs.js").Pdf[]} */
var pdfs = [];

/** Whether the Library has any PDFs (the tabs are shown only then) */
export function hasPdfs() {
  return pdfs.length > 0;
}

function listHtml() {
  return pdfShelves(pdfs, categories())
    .map(function (s) {
      var items = s.pdfs
        .map(function (p) {
          var f = pdfFacts(p);
          return (
            '<li><a href="' + esc(pdfHref(p)) + '" target="_blank" rel="noopener" class="pdf"><span class="m">' +
            '<span class="mr">' + esc(to(p.title.mr)) + '</span><span class="en" lang="en">' + esc(p.title.en) + "</span></span>" +
            // its pages and size, when known (no "PDF": the Books tab has nothing else)
            (f.en ? '<span class="lt"><span class="mr">' + esc(f.mr) + '</span><span class="en" lang="en">' + esc(f.en) + "</span></span>" : "") +
            "</a></li>"
          );
        })
        .join("");
      var n = s.category.name;
      return (
        '<div class="tocg pdfg" data-cat="' + esc(s.category.id) + '"><h2 class="gh"><span class="mr">' + esc(to(n.mr)) + '</span><span class="en" lang="en">' + esc(n.en) + "</span></h2>" +
        '<ol class="toc">' + items + "</ol></div>"
      );
    })
    .join("");
}

function render() {
  var jl = document.getElementById("jl");
  if (!jl) return;
  [].forEach.call(jl.querySelectorAll(".pdfg"), function (/** @type {Element} */ g) {
    g.remove();
  });
  if (pdfs.length) jl.insertAdjacentHTML("beforeend", listHtml());
}

export function init() {
  pdfs = cleanPdfs(loaded.pdfs);
  render();
  // a category renamed, or a backup restored
  document.addEventListener("nitya-library", render);
}

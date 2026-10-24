// @ts-check
// The Library's PDFs: the PDFs tab's list, from content/pdfs.json (cleaned by js/core/pdfs.js), one .tocg.pdfg per
// group at the end of the Library's list (#jl), so it looks like the texts' list, follows the text size and the
// reading languages, and is put in Kannada letters with it (LATER in js/render.js). The tabs themselves, Texts |
// PDFs, are js/features/contents-list.js's. A PDF opens in a new tab, in the phone's or computer's own PDF viewer
// (Satish, 2026-10-24); on the iPhone's Home Screen app that is a view over the app with Done, so the app stays
// where it was. sw.js keeps each PDF for offline use once it has been opened.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { loaded } from "../text/load.js";
import { cleanPdfs, pdfHref } from "../core/pdfs.js";
import { esc, scr as to } from "../core/words.js";

/** @type {import("../core/pdfs.js").PdfGroup[]} */
var groups = [];

/** Whether the Library has any PDFs (the tabs are shown only then) */
export function hasPdfs() {
  return groups.length > 0;
}

function listHtml() {
  return groups
    .map(function (g) {
      var items = g.pdfs
        .map(function (p) {
          return (
            '<li><a href="' + esc(pdfHref(p)) + '" target="_blank" rel="noopener" class="pdf"><span class="m">' +
            '<span class="mr">' + esc(to(p.title.mr)) + '</span><span class="en" lang="en">' + esc(p.title.en) + "</span></span>" +
            '<span class="lt"><span class="mr">PDF</span><span class="en" lang="en">PDF</span></span></a></li>'
          );
        })
        .join("");
      return (
        '<div class="tocg pdfg"><h2 class="gh"><span class="mr">' + esc(to(g.name.mr)) + '</span><span class="en" lang="en">' + esc(g.name.en) + "</span></h2>" +
        '<ol class="toc">' + items + "</ol></div>"
      );
    })
    .join("");
}

export function init() {
  groups = cleanPdfs(loaded.pdfs);
  var jl = document.getElementById("jl");
  if (jl && groups.length) jl.insertAdjacentHTML("beforeend", listHtml());
}

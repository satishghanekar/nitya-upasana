// @ts-check
// The Library's books (PDFs): the Books tab's list, from content/pdfs.json (cleaned by js/core/pdfs.js), one
// .tocg.pdfg per category, the texts' categories with the names this phone uses (js/features/library.js; listed
// again when they change, "nitya-library"), at the end of the Library's list (#jl), so it looks like the texts'
// list, follows the text size and the reading languages, and is put in Kannada letters with it (LATER in
// js/render.js). The tabs themselves, Chants | Books, are js/features/contents-list.js's. A PDF opens in a new tab,
// in the phone's or computer's own PDF viewer (Satish, 2026-10-24); on the iPhone's Home Screen app that is a view
// over the app with Done, so the app stays where it was. sw.js keeps each PDF once it has been opened, and opens it
// from the phone after that. A cloud before each title, as the iPhone's Files app shows one (Satish, 2026-10-24),
// says which: an arrow down while it is online only, a ✓ once this phone has it (.pst, data-saved), checked when
// the list is shown and again when the reader comes back from a PDF (marks()).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { loaded } from "../text/load.js";
import { cleanPdfs, pdfFacts, pdfHref, pdfShelves } from "../core/pdfs.js";
import { categories } from "./library.js";
import { esc, scr as to, ui } from "../core/words.js";

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
            '<li><a href="' +
            esc(pdfHref(p)) +
            '" target="_blank" rel="noopener" class="pdf"><span class="m">' +
            mark(false) +
            '<span class="mr">' +
            esc(to(p.title.mr)) +
            '</span><span class="en" lang="en">' +
            esc(p.title.en) +
            "</span></span>" +
            // its pages and size, when known (no "PDF": the Books tab has nothing else)
            '<span class="lt"><span class="mr">' +
            esc(to(f.mr)) +
            '</span><span class="en" lang="en">' +
            esc(f.en) +
            "</span></span>" +
            '<span class="sr pss"></span></a></li>'
          );
        })
        .join("");
      var n = s.category.name;
      return (
        '<div class="tocg pdfg" data-cat="' +
        esc(s.category.id) +
        '"><h2 class="gh"><span class="mr">' +
        esc(to(n.mr)) +
        '</span><span class="en" lang="en">' +
        esc(n.en) +
        "</span></h2>" +
        '<ol class="toc">' +
        items +
        "</ol></div>"
      );
    })
    .join("");
}

// The clouds, drawn after the iPhone's: online only (an arrow down) and saved on this phone (a ✓)
var CLOUD = '<path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.6 4.5 4.5 0 0 0 7 18.5z"/>',
  ICON = {
    off:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      CLOUD +
      '<path d="M12 10.5v5.5M9.6 13.8L12 16.2l2.4-2.4"/></svg>',
    on:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      CLOUD +
      '<path d="M9.3 13.6l2 2 3.6-4"/></svg>',
  };

/** The cloud before a title @param {boolean} saved */
function mark(saved) {
  return '<span class="no pst" data-saved="' + saved + '">' + ICON[saved ? "on" : "off"] + "</span>";
}

/** What the cloud says, for screen readers, at the end of the row: in the menu language @param {boolean} saved */
function said(saved) {
  var mr = ui() === "mr";
  return saved ? (mr ? "या फोनवर जतन" : "saved on this phone") : mr ? "फक्त ऑनलाइन" : "online only";
}

/**
 * Each PDF's cloud: saved on this phone (sw.js's saved copies, which the page can read too) or online only; left as
 * online only where the browser keeps no copies
 */
export function marks() {
  var w = /** @type {any} */ (window);
  saidIn = ui();
  [].forEach.call(document.querySelectorAll("#jl a.pdf"), function (/** @type {HTMLAnchorElement} */ a) {
    /** @param {boolean} saved */
    function set(saved) {
      var st = a.querySelector(".pst"),
        sr = a.querySelector(".pss");
      if (st && st.getAttribute("data-saved") !== String(saved)) st.outerHTML = mark(saved);
      if (sr && sr.textContent !== ", " + said(saved)) sr.textContent = ", " + said(saved);
    }
    if (!w.caches) return set(false);
    w.caches
      .match(a.href, { ignoreSearch: true })
      .then(function (/** @type {Response | undefined} */ r) {
        set(!!r);
      })
      .catch(function () {
        set(false);
      });
  });
}

/** @type {string} the menu language the clouds' words were last written in */
var saidIn = "";

/** The menu language changed (apply(), js/features/bars.js): the clouds' words for screen readers in the new one */
export function pdfLang() {
  if (saidIn === ui()) return;
  saidIn = ui();
  marks();
}

/** After a PDF is opened: checked again every few seconds for a minute, as it may take that long to come in */
function watch() {
  var n = 0,
    t = setInterval(function () {
      marks();
      if (++n >= 20) clearInterval(t);
    }, 3000);
}

function render() {
  var jl = document.getElementById("jl");
  if (!jl) return;
  [].forEach.call(jl.querySelectorAll(".pdfg"), function (/** @type {Element} */ g) {
    g.remove();
  });
  if (pdfs.length) jl.insertAdjacentHTML("beforeend", listHtml());
  marks();
}

export function init() {
  pdfs = cleanPdfs(loaded.pdfs);
  render();
  // a category renamed, or a backup restored
  document.addEventListener("nitya-library", render);
  if (!pdfs.length) return;
  // back from a PDF: in another tab, or the iPhone's view over the app
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) marks();
  });
  window.addEventListener("focus", marks);
  var jl = document.getElementById("jl");
  if (jl)
    jl.addEventListener("click", function (e) {
      if (/** @type {HTMLElement} */ (e.target).closest("a.pdf")) watch();
    });
}

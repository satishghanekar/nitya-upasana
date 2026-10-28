// Library (#jump): every text by category (js/features/library.js builds the list), with search
// (js/text/search.js: the box at the foot of the page on phones, and Recent). Opened by the book button in the bottom
// bar (#hm) and at the end of each piece; a title opens its
// text (js/features/clicks.js), and Back (the button here, the phone's Back, or Escape) returns. Home v2 moved the
// list here from the home page.
// The tabs, Chants | Books (पाठ | पोथी; #jtb, Satish, 2026-10-24), are shown only when content/pdfs.json lists a PDF, beside Back
// in place of the title, as on the calendar page
// (js/features/pdfs.js): the Books tab sets data-tab="pdf" on #jump, and the styles (css/13-library.css) show the
// PDFs' groups in #jl in place of the search box, the texts and Edit categories. The Library opens on Texts each time.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { setJ } from "./overlays.js";
import { hasPdfs, marks } from "./pdfs.js";

/** The list of texts; search hides it while results are shown */
export var ul;

/** The search starts empty again, with the whole list */
export function clearSearch() {
  var qq = /** @type {HTMLInputElement | null} */ (document.getElementById("q"));
  if (qq && qq.value) {
    qq.value = "";
    /** @type {HTMLElement} */ (document.getElementById("res")).innerHTML = "";
    /** @type {HTMLElement} */ (document.getElementById("none")).hidden = true;
    /** @type {HTMLElement} */ (document.getElementById("jl")).hidden = false;
  }
  if (qq) qq.blur();
}

/** Texts or PDFs @param {"texts" | "pdf"} v */
export function libTab(v) {
  var jp = document.getElementById("jump"),
    tb = document.getElementById("jtb");
  if (!jp || !tb) return;
  if (v === "pdf") {
    clearSearch();
    jp.setAttribute("data-tab", "pdf");
    marks();
  } else jp.removeAttribute("data-tab");
  [].forEach.call(tb.querySelectorAll("button"), function (/** @type {HTMLElement} */ b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === v));
  });
  jp.scrollTop = 0;
  /** @type {HTMLElement} */ (jp.querySelector(".libsc")).scrollTop = 0;
}

export function init() {
  ul = document.getElementById("jl");
  var bk = document.getElementById("jbk");
  if (bk)
    bk.onclick = function () {
      setJ(false);
    };
  var tb = document.getElementById("jtb");
  if (tb && hasPdfs()) {
    tb.hidden = false;
    // the tabs take the title's place beside Back; screen readers still hear it
    var t = document.getElementById("jlt");
    if (t) t.classList.add("sr");
    tb.addEventListener("click", function (e) {
      var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest("button[data-v]"));
      if (b) libTab(b.dataset.v === "pdf" ? "pdf" : "texts");
    });
  }
}

// @ts-check
// The print builder, step 1, What (print redesign P4, PLAN §3.1, mockup 1): the Library's categories as the Library
// lists them (the family's own categories too), a checkbox for each text, search, Select all or Clear for each
// category and for everything, and next to each text the pages it takes on paper as the How step has it now. Every
// text starts on a new page, so a text's pages are read off the plan of the whole Library (js/features/print.js lays
// it out ahead, as for the browser's own Print menu) and the total is the contents page plus the texts chosen.
// Ticking changes nothing on the reading page; js/features/print.js reads pick() when Print is tapped.
// The words follow the menu language (P.ui); the titles follow the reading languages, as in the routine builder: the
// first language large, the second under it.
// No init(): js/features/print.js creates it (createWhat) when it starts.

import { esc, lead, num, scr, scrKey, second, ui } from "../core/words.js";
import { searchKey } from "../features/text-picker.js";

/**
 * @typedef {{ id: string, sec: string, title: string, titleEn: string, language: string }} WhatText
 * @typedef {{ category: { id: string, name: { mr: string, en: string } }, texts: WhatText[] }} WhatShelf
 * @typedef {{ shelves: () => WhatShelf[], onChange: () => void }} WhatOptions
 */

const W = {
  en: {
    what: "What to print",
    search: "Search the Library",
    all: "All texts",
    selectAll: "Select all",
    clear: "Clear",
    none: "No text matches",
    /** @param {number} n */
    pages: function (n) {
      return "~" + n + (n === 1 ? " page" : " pages");
    },
    /** @param {number} n */
    texts: function (n) {
      return n + (n === 1 ? " text" : " texts");
    },
    pick: "Pick at least one text",
  },
  mr: {
    what: "काय प्रिंट करायचे",
    search: "संग्रहात शोधा",
    all: "सर्व रचना",
    selectAll: "सर्व निवडा",
    clear: "सर्व काढा",
    none: "अशी रचना नाही",
    /** @param {number} n */
    pages: function (n) {
      return "~" + num(n) + (n === 1 ? " पान" : " पाने");
    },
    /** @param {number} n */
    texts: function (n) {
      return num(n) + " रचना";
    },
    pick: "किमान एक रचना निवडा",
  },
};

/** The words in the menu language */
export function whatWords() {
  return W[ui()];
}

/**
 * The pages a printout takes: each text's pages, and the contents page when more than one text is printed
 * (js/features/print.js: build2 prints a text on its own without one)
 * @param {string[]} secs  the chosen texts' sections (a1)
 * @param {Record<string, number> | null} counts  pages for each section, from the plan of the whole Library
 * @param {number} toc  the pages the contents take
 * @returns {number | null}  null while the plan is not ready
 */
export function pagesFor(secs, counts, toc) {
  if (!counts || !secs.length) return null;
  var n = secs.length > 1 ? toc : 0;
  for (var i = 0; i < secs.length; i++) {
    if (!counts[secs[i]]) return null;
    n += counts[secs[i]];
  }
  return n;
}

/** A title in a reading language: as written (Kannada letters when chosen), or its English name */
/** @param {WhatText} t @param {"mr" | "en"} l */
function titleIn(t, l) {
  return l === "mr" ? scr(t.title) : t.titleEn;
}
/** @param {WhatText} t @param {"mr" | "en"} l */
function langIn(t, l) {
  return l === "mr" ? scrKey() || t.language : "en";
}

/**
 * @param {HTMLElement} el  the empty container (#prwl)
 * @param {WhatOptions} o
 */
export function createWhat(el, o) {
  /** @type {Record<string, boolean>} the texts taken off (everything is chosen at first, and a text added later too) */
  var off = {},
    q = "",
    /** @type {Record<string, number> | null} */
    counts = null,
    toc = 1,
    /** @type {string[] | null | undefined} ticks given before the Library was read (a print link), put in place once it is */
    pending;

  function all() {
    /** @type {WhatText[]} */
    var out = [];
    o.shelves().forEach(function (s) {
      out = out.concat(s.texts);
    });
    if (pending !== undefined && out.length) {
      var ids = pending;
      pending = undefined;
      off = {};
      if (ids)
        out.forEach(function (t) {
          if (/** @type {string[]} */ (ids).indexOf(t.id) < 0) off[t.id] = true;
        });
    }
    return out;
  }
  /** The chosen texts' Library ids, or null for every text */
  function pick() {
    var a = all(),
      on = a.filter(function (t) {
        return !off[t.id];
      });
    return on.length === a.length ? null : on.map(function (t) {
      return t.id;
    });
  }
  /** The chosen texts */
  function chosen() {
    return all().filter(function (t) {
      return !off[t.id];
    });
  }
  /** The ticks as given (a print link carries them): null for every text @param {string[] | null} ids */
  function set(ids) {
    pending = ids;
    all();
    if (el.firstChild) sync();
  }

  function render() {
    var w = whatWords(),
      l = lead(),
      s2 = second();
    el.lang = ui();
    el.innerHTML =
      '<input type="search" class="tpkq prwq" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(w.search) + '" aria-label="' + esc(w.search) + '">' +
      '<div class="prcg prcga"><span>' + esc(w.all) + '</span><button type="button" class="prcb" data-cat=""></button></div>' +
      o
        .shelves()
        .map(function (s) {
          var c = s.category;
          return (
            '<div class="prgr" data-cat="' + esc(c.id) + '"><div class="prcg"><span lang="' + (l === "mr" ? scrKey() || "mr" : "en") + '">' + esc(l === "mr" ? scr(c.name.mr) : c.name.en) + " · " + num(s.texts.length) + "</span>" +
            '<button type="button" class="prcb" data-cat="' + esc(c.id) + '"></button></div>' +
            '<ul class="tpkl">' +
            s.texts
              .map(function (t) {
                return (
                  '<li data-id="' + esc(t.id) + '" data-sec="' + esc(t.sec) + '"><label class="tpkr"><input type="checkbox" value="' + esc(t.id) + '">' +
                  '<span class="tpkc" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>' +
                  '<span class="tt"><span class="t1" lang="' + langIn(t, l) + '">' + esc(titleIn(t, l)) + "</span>" +
                  (s2 ? '<span class="t2" lang="' + langIn(t, s2) + '">' + esc(titleIn(t, s2)) + "</span>" : "") +
                  '</span><span class="prpc"></span></label></li>'
                );
              })
              .join("") +
            "</ul></div>"
          );
        })
        .join("") +
      '<p class="tpkn" hidden>' + esc(w.none) + "</p>";
    /** @type {HTMLInputElement} */ (el.querySelector(".prwq")).value = q;
    filter();
    sync();
  }

  /** The ticks, the Select all / Clear buttons and the page counts follow the choice */
  function sync() {
    var w = whatWords();
    [].forEach.call(el.querySelectorAll(".tpkl input"), function (/** @type {HTMLInputElement} */ x) {
      x.checked = !off[x.value];
    });
    [].forEach.call(el.querySelectorAll(".prcb"), function (/** @type {HTMLElement} */ b) {
      var ins = b.dataset.cat ? el.querySelectorAll('.prgr[data-cat="' + b.dataset.cat + '"] input') : el.querySelectorAll(".tpkl input"),
        full = [].every.call(ins, function (/** @type {HTMLInputElement} */ x) {
          return x.checked;
        });
      b.textContent = full ? w.clear : w.selectAll;
      b.setAttribute("data-on", full ? "1" : "0");
    });
    [].forEach.call(el.querySelectorAll(".tpkl li"), function (/** @type {HTMLElement} */ li) {
      var n = counts && counts[li.dataset.sec || ""];
      /** @type {HTMLElement} */ (li.querySelector(".prpc")).textContent = n ? w.pages(n) : "";
    });
  }

  /** Show only the texts that match the search, and the categories that have one */
  function filter() {
    var key = searchKey(q),
      n = 0;
    [].forEach.call(el.querySelectorAll(".prgr"), function (/** @type {HTMLElement} */ g) {
      var m = 0;
      [].forEach.call(g.querySelectorAll("li"), function (/** @type {HTMLElement} */ li) {
        var t = all().filter(function (x) {
            return x.id === li.dataset.id;
          })[0],
          ok = !key || (!!t && (searchKey(t.title).indexOf(key) >= 0 || searchKey(scr(t.title)).indexOf(key) >= 0 || searchKey(t.titleEn).indexOf(key) >= 0));
        li.hidden = !ok;
        if (ok) m++;
      });
      g.hidden = !m;
      n += m;
    });
    /** @type {HTMLElement} */ (el.querySelector(".tpkn")).hidden = n > 0;
  }

  el.addEventListener("change", function (e) {
    var x = /** @type {HTMLInputElement} */ (e.target);
    if (x.type !== "checkbox") return;
    if (x.checked) delete off[x.value];
    else off[x.value] = true;
    sync();
    o.onChange();
  });
  el.addEventListener("input", function (e) {
    var x = /** @type {HTMLInputElement} */ (e.target);
    if (!x.classList.contains("prwq")) return;
    q = x.value;
    filter();
  });
  el.addEventListener("click", function (e) {
    var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest(".prcb"));
    if (!b) return;
    var clear = b.getAttribute("data-on") === "1",
      cat = b.dataset.cat;
    o.shelves().forEach(function (s) {
      if (cat && s.category.id !== cat) return;
      s.texts.forEach(function (t) {
        if (clear) off[t.id] = true;
        else delete off[t.id];
      });
    });
    sync();
    o.onChange();
  });

  return {
    render: render,
    pick: pick,
    set: set,
    /** The chosen texts' sections, in the Library's order */
    secs: function () {
      return chosen().map(function (t) {
        return t.sec;
      });
    },
    /** Each text's pages and the contents' pages, from the plan of the whole Library (null: not ready) */
    /** @param {Record<string, number> | null} c @param {number} [t] */
    counts: function (c, t) {
      counts = c;
      toc = t || 1;
      if (el.firstChild) sync();
    },
    /** The texts chosen and the pages they take (null while the plan is not ready) */
    total: function () {
      var s = chosen().map(function (t) {
        return t.sec;
      });
      return { texts: s.length, pages: pagesFor(s, counts, toc) };
    },
  };
}

// @ts-check
// The Library by category: the Library page's list of texts (#jl, opened by
// the book button in the top bar) grouped by category: Vedic Chant, Aarti and any the family added, in the order of
// content/categories.json; a category with no texts is left out of the list. Each category is numbered from 1
// (2026-10-21). "Edit categories" ("विभाग बदला") at
// the end of the list opens the categories sheet (#lbm) over the Library: add a category, rename one (a built-in one
// only on this phone; it can't be deleted), delete one the family added, and move a text to another category. What
// the family changes is kept on this phone for everyone on it (js/store/store.js, meta.library) and in backup files;
// the rules are in js/core/library.js. Search (js/text/search.js) finds texts by their category's name too.
// Words: the sheet's words follow the menu language (P.ui); the names of categories and texts follow the reading
// languages, as the Vedic calendar's do: the first language (P.lead), with the second (P.l2) as a small line under a
// category's name; Marathi in Kannada letters when that is the script, a title in English plain or scholarly (P.tr).
// The list itself follows the language shown on the reading page (data-lang on #jl), like every title there.
// The titles come from content/library.json, never typed here; the texts themselves are never touched.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "../core/state.js";
import { loaded } from "../text/load.js";
import { getLibrary, setLibrary } from "../store/store.js";
import {
  addCategory,
  categoriesOf,
  categoryOf,
  counts,
  emptyLocal,
  MAX_ADDED,
  moveText,
  removeCategory,
  renameCategory,
  resetName,
  shelves,
} from "../core/library.js";
import { apply } from "./bars.js";
import { IA, titlesSet } from "../text/iast.js";
import { buildIX } from "../text/search.js";
import { ovSub, ovSubDone } from "./history.js";
import { dv, esc, lead, mrLang, scr as to, second, ui } from "../core/words.js";

/**
 * @typedef {import("../core/library.js").Category} Category
 * @typedef {import("../core/library.js").BundledCategory} BundledCategory
 * @typedef {import("../core/library.js").LibraryLocal} LibraryLocal
 * @typedef {import("../core/library.js").Name} Name
 * @typedef {{ id: string, sec: string, category: string, title: string, titleEn: string, language: string,
 *   no: { mr: string, en: string } }} Entry   a text as listed: its section on the reading page (a1) and number there
 * @typedef {"list" | "edit" | "delete"} View
 */

// The sheet's words, in the menu language (P.ui). Marathi: रचना for a text, विभाग for a category.
const W = {
  en: {
    open: "Edit categories",
    title: "Categories",
    texts: "Texts",
    textsInfo: "Choose the category each text is listed under.",
    info: "Kept on this phone for everyone who reads here, and saved in backup files. The words of the texts never change.",
    add: "Add a category",
    rename: "Rename",
    addTitle: "Add a category",
    renameTitle: "Rename: ",
    mrName: "Name in Marathi",
    enName: "Name in English",
    hint: "One is enough: it is used for both.",
    save: "Save",
    cancel: "Cancel",
    /** @param {string} n */
    reset: function (n) {
      return "Use the original name: " + n;
    },
    del: "Delete this category",
    builtIn: "Built in: it can be renamed on this phone, not deleted.",
    /** @param {string} n */
    ask: function (n) {
      return "Delete " + n + "? Its texts go back to the categories they came with.";
    },
    yes: "Delete",
    close: "Close",
    empty: "Please type a name.",
    taken: "Another category already has this name.",
    full: "There is room for " + MAX_ADDED + " categories of your own.",
    /** @param {number} n */
    count: function (n) {
      return n === 0 ? "No texts yet (not shown in the Library)" : n === 1 ? "1 text" : n + " texts";
    },
    /** @param {string} t @param {string} c */
    moved: function (t, c) {
      return t + ": now in " + c;
    },
    /** @param {string} t */
    catFor: function (t) {
      return "Category for " + t;
    },
    /** @param {string} n */
    added: function (n) {
      return n + " added";
    },
    /** @param {string} n */
    renamed: function (n) {
      return "Renamed: " + n;
    },
    /** @param {string} n */
    deleted: function (n) {
      return n + " deleted";
    },
  },
  mr: {
    open: "विभाग बदला",
    title: "विभाग",
    texts: "रचना",
    textsInfo: "प्रत्येक रचना कोणत्या विभागात दिसावी ते निवडा.",
    info: "हे या फोनवर इथे वाचणाऱ्या सर्वांसाठी राहते आणि बॅकअप फाइलमध्ये जतन होते. रचनांचे शब्द कधीही बदलत नाहीत.",
    add: "विभाग जोडा",
    rename: "नाव बदला",
    addTitle: "विभाग जोडा",
    renameTitle: "नाव बदला: ",
    mrName: "मराठी नाव",
    enName: "इंग्रजी नाव",
    hint: "एक पुरे: तेच दोन्हीसाठी वापरले जाईल.",
    save: "जतन करा",
    cancel: "रद्द करा",
    /** @param {string} n */
    reset: function (n) {
      return "मूळ नाव वापरा: " + n;
    },
    del: "हा विभाग काढून टाका",
    builtIn: "मूळचा विभाग: या फोनवर नाव बदलता येते, काढता येत नाही.",
    /** @param {string} n */
    ask: function (n) {
      return n + " काढून टाकायचा? त्यातील रचना आपापल्या मूळ विभागात परत जातील.";
    },
    yes: "काढून टाका",
    close: "बंद करा",
    empty: "कृपया नाव लिहा.",
    taken: "हे नाव दुसऱ्या विभागाला आधीच आहे.",
    full: "स्वतःचे जास्तीत जास्त " + dv(MAX_ADDED) + " विभाग ठेवता येतात.",
    /** @param {number} n */
    count: function (n) {
      return n === 0 ? "अजून एकही रचना नाही (संग्रहात दिसत नाही)" : dv(n) + " रचना";
    },
    /** @param {string} t @param {string} c */
    moved: function (t, c) {
      return t + ": आता " + c + " विभागात";
    },
    /** @param {string} t */
    catFor: function (t) {
      return t + " हिचा विभाग";
    },
    /** @param {string} n */
    added: function (n) {
      return n + " जोडला";
    },
    /** @param {string} n */
    renamed: function (n) {
      return "नवे नाव: " + n;
    },
    /** @param {string} n */
    deleted: function (n) {
      return n + " काढला";
    },
  },
};
const PENCIL =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';

/** @type {BundledCategory[]} */
var bundled = [];
/** @type {Entry[]} */
var entries = [];
/** @type {LibraryLocal} */
var local = emptyLocal();
/** @type {Category[]} */
var cats = [];
var ready = false;

/** @type {HTMLElement | null} */
var sheet = null;
/** @type {Element | null} */
var ret = null;
/** @type {View} */
var view = "list";
var editing = "";

// ---- small helpers ----

function words() {
  return W[ui()];
}
/** @param {string} id */
function el(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}
/** @param {HTMLElement | null} x */
function focus(x) {
  if (x)
    try {
      x.focus({ preventScroll: true });
    } catch (e) {}
}
/** @param {"mr" | "en"} l */
function langOf(l) {
  return l === "en" ? "en" : mrLang();
}
/** A category's name in a reading language @param {Name} n @param {"mr" | "en"} l */
function catTxt(n, l) {
  return l === "mr" ? to(n.mr) : n.en;
}
/** A category's name in the first reading language */
/** @param {Category} c */
function nm(c) {
  return catTxt(c.name, lead());
}
/** A text's title in the first reading language: Marathi in the script, English plain or scholarly */
/** @param {Entry} e */
function tt(e) {
  if (lead() === "mr") return to(e.title);
  if (P && P.tr === "iast")
    return IA(e.title).replace(/(^|[\s(])([^\s(])/g, function (_, a, c) {
      return a + c.toUpperCase();
    });
  return e.titleEn;
}
/** @param {string} id */
function catById(id) {
  return (
    cats.filter(function (c) {
      return c.id === id;
    })[0] || null
  );
}

// ---- the data: the texts in reading order with their sections, the categories, the family's changes ----
function readData() {
  var lib = loaded.library;
  /** @type {any} */
  var w = window;
  var C = w.CONTENT;
  entries = [];
  if (!lib || !C) return;
  /** @type {Record<string, any>} */
  var byId = {};
  lib.texts.forEach(function (/** @type {any} */ t) {
    byId[t.id] = t;
  });
  // The bundled categories as CONTENT has them (content/categories.json, or each named by its id without it), and
  // the texts in reading order
  bundled = C.categories.map(function (/** @type {any} */ c, /** @type {number} */ i) {
    return { id: c.id, name: { mr: c.name.mr, en: c.name.en }, order: i + 1 };
  });
  C.categories.forEach(function (/** @type {any} */ c) {
    c.pieces.forEach(function (/** @type {any} */ p) {
      var t = byId[p.text];
      if (t) entries.push({ id: t.id, sec: p.id, category: t.category, title: t.title, titleEn: t.titleEn, language: t.language, no: p.no });
    });
  });
  local = getLibrary();
  cats = categoriesOf(bundled, local);
}

/** The categories, as shown now */
export function categories() {
  return cats.slice();
}

/**
 * The Library as listed, for the print builder's What step (js/print/what.js): each category that has texts, with
 * its texts in the order the Library lists them
 * @returns {{ category: Category, texts: Entry[] }[]}
 */
export function shelvesNow() {
  return shelves(entries, cats, local)
    .filter(function (s) {
      return s.texts.length;
    })
    .map(function (s) {
      return {
        category: s.category,
        texts: s.texts.map(function (id) {
          return /** @type {Entry} */ (
            entries.filter(function (x) {
              return x.id === id;
            })[0]
          );
        }),
      };
    });
}

/**
 * Every text for search (js/text/search.js): id, its id without its category (sukhkarta, of aarti-sukhkarta),
 * section, titles and its category's names
 * @returns {{ id: string, name: string, sec: string, title: string, titleEn: string, categories: string[] }[]}
 */
export function textsForSearch() {
  return entries.map(function (e) {
    var c = catById(categoryOf(e, cats, local)),
      name = e.id.indexOf(e.category + "-") === 0 ? e.id.slice(e.category.length + 1) : "";
    return { id: e.id, name: name, sec: e.sec, title: e.title, titleEn: e.titleEn, categories: c ? [c.name.mr, c.name.en] : [] };
  });
}

/**
 * The category a section's text is in (for search results)
 * @param {string} sec
 * @returns {Category | null}
 */
export function categoryOfSection(sec) {
  var e = entries.filter(function (x) {
    return x.sec === sec;
  })[0];
  return e ? catById(categoryOf(e, cats, local)) : null;
}

// ---- the Library's list (#jl): one .tocg per category with texts; the markup the styles read ----
function listHtml() {
  var lib = loaded.library,
    langs = (lib && lib.languages) || {};
  return shelves(entries, cats, local)
    .filter(function (s) {
      return s.texts.length;
    })
    .map(function (s) {
      // numbered from 1 in each category (Satish, 2026-10-21), not by the text's place on the reading page
      var items = s.texts
        .map(function (id, i) {
          var e = /** @type {Entry} */ (
              entries.filter(function (x) {
                return x.id === id;
              })[0]
            ),
            lt = langs[e.language];
          return (
            // ("./#a3": the piece is built when opened, js/core/page.js, so a bare "#a3" may point at nothing yet)
            '<li><a href="./#' + e.sec + '" data-go="' + e.sec + '"><span class="m"><span class="no"><span class="nm">' + dv(i + 1) + '.</span><span class="ne">' + (i + 1) + ".</span></span> " +
            '<span class="mr">' + esc(to(e.title)) + '</span><span class="en" lang="en">' + esc(e.titleEn) + "</span></span>" +
            (lt ? '<span class="lt"><span class="mr">' + esc(to(lt.mr)) + '</span><span class="en" lang="en">' + esc(lt.en) + "</span></span>" : "") +
            "</a></li>"
          );
        })
        .join("");
      var n = s.category.name;
      return (
        '<div class="tocg" data-cat="' + esc(s.category.id) + '"><h2 class="gh"><span class="mr">' + esc(to(n.mr)) + '</span><span class="en" lang="en">' + esc(n.en) + "</span></h2>" +
        '<ol class="toc">' + items + "</ol></div>"
      );
    })
    .join("");
}

/** Put the list in the Library, before the Edit categories button (the PDFs, js/features/pdfs.js, come after it) */
function renderList() {
  var jl = document.getElementById("jl"),
    at = document.getElementById("lbr");
  if (!jl || !at) return;
  [].forEach.call(jl.querySelectorAll(".tocg:not(.pdfg)"), function (/** @type {Element} */ g) {
    g.remove();
  });
  at.insertAdjacentHTML("beforebegin", listHtml());
}

/** After a change: the list, the English style of the titles, the switches and search */
function refreshPage() {
  renderList();
  titlesSet();
  apply();
  buildIX();
}

/** A backup was restored: its categories are this phone's now */
export function refresh() {
  if (!ready) return;
  local = getLibrary();
  cats = categoriesOf(bundled, local);
  refreshPage();
  if (sheet && !sheet.hidden) show("list");
}

/** @param {LibraryLocal} l */
function keep(l) {
  local = l;
  cats = categoriesOf(bundled, local);
  setLibrary(local);
  refreshPage();
}

/** The menu language changed (apply(), js/features/bars.js): the button's words, and the sheet when open */
export function libLang() {
  var w = words(),
    b = document.getElementById("lbbw");
  if (b && b.textContent !== w.open) {
    b.textContent = w.open;
    b.lang = ui() === "mr" ? mrLang() : "en";
  }
  if (sheet && !sheet.hidden && view === "list") {
    var box = /** @type {HTMLElement} */ (sheet.querySelector(".pfc"));
    if (box.lang !== ui()) show("list");
  }
}

// ---- the categories sheet ----
/** @param {Element | null} [from] */
export function openSheet(from) {
  if (!sheet || !sheet.hidden) return;
  ret = from || document.activeElement;
  // its own Back step, over the Library's: the phone's Back closes the sheet and leaves the Library open
  ovSub(function () {
    closeSheet(true);
  });
  sheet.hidden = false;
  el("lbb").setAttribute("aria-expanded", "true");
  show("list");
}

/** @param {boolean} [fromPop] closed by the phone's Back (the Back step is already gone) */
export function closeSheet(fromPop) {
  if (!sheet || sheet.hidden) return;
  sheet.hidden = true;
  el("lbb").setAttribute("aria-expanded", "false");
  if (!fromPop) ovSubDone();
  var r = /** @type {HTMLElement | null} */ (ret);
  ret = null;
  if (r && r.isConnected && r.getClientRects().length) focus(r);
}

/**
 * Show one of the sheet's views and move focus into it
 * @param {View} v
 * @param {string} [id]  the category to rename or delete ("" or none: add one)
 */
function show(v, id) {
  if (!sheet) return;
  var w = words(),
    box = /** @type {HTMLElement} */ (sheet.querySelector(".pfc")),
    u = ui();
  view = v;
  box.setAttribute("data-lang", u);
  box.lang = u;
  el("lbv1").hidden = v !== "list";
  el("lbv2").hidden = v !== "edit";
  el("lbv3").hidden = v !== "delete";
  el("lbx").setAttribute("aria-label", w.close);
  var t = el("lbmt");
  if (v === "list") {
    t.textContent = w.title;
    renderCats();
    renderTexts();
    el("lbaddw").textContent = w.add;
    el("lbadd").hidden = local.added.length >= MAX_ADDED;
    el("lbth").textContent = w.texts;
    el("lbti").textContent = w.textsInfo;
    el("lbi").textContent = local.added.length >= MAX_ADDED ? w.full : w.info;
    var b = /** @type {HTMLElement | null} */ (id ? sheet.querySelector('.lbe[data-id="' + id + '"]') : null);
    focus(b || t);
  } else if (v === "edit") {
    var c = id ? catById(id) : null;
    editing = c ? c.id : "";
    t.textContent = c ? w.renameTitle + nm(c) : w.addTitle;
    el("lbmrl").textContent = w.mrName;
    el("lbenl").textContent = w.enName;
    el("lbh").textContent = w.hint;
    el("lbsave").textContent = w.save;
    el("lbcan").textContent = w.cancel;
    el("lberr").textContent = "";
    var mr = /** @type {HTMLInputElement} */ (el("lbmr")),
      en = /** @type {HTMLInputElement} */ (el("lben"));
    mr.value = c ? c.name.mr : "";
    en.value = c ? c.name.en : "";
    mr.removeAttribute("aria-invalid");
    en.removeAttribute("aria-invalid");
    var rs = el("lbreset");
    rs.hidden = !(c && c.original);
    if (c && c.original) rs.textContent = w.reset(catTxt(c.original, lead()));
    el("lbdel").hidden = !c || c.origin !== "family";
    el("lbdel").textContent = w.del;
    el("lbbi").hidden = !c || c.origin !== "bundled";
    el("lbbi").textContent = w.builtIn;
    // the field of the first reading language first
    focus(lead() === "en" ? en : mr);
  } else {
    var d = catById(id || "");
    if (!d) return show("list");
    editing = d.id;
    t.textContent = w.del;
    el("lbdq").textContent = w.ask(nm(d));
    el("lbdy").textContent = w.yes;
    el("lbdn").textContent = w.cancel;
    focus(el("lbdn"));
  }
}

function renderCats() {
  var w = words(),
    n = counts(shelves(entries, cats, local)),
    l1 = lead(),
    l2 = second();
  el("lbcl").innerHTML = cats
    .map(function (c) {
      var name = catTxt(c.name, l1),
        other = l2 ? catTxt(c.name, l2) : "";
      return (
        "<li>" +
        '<div class="lbcn"><span class="lbn" lang="' + langOf(l1) + '">' + esc(name) + "</span>" +
        (other && other !== name ? '<span class="lbo" lang="' + langOf(/** @type {"mr" | "en"} */ (l2)) + '">' + esc(other) + "</span>" : "") +
        '<small class="lbk" lang="' + (ui() === "mr" ? mrLang() : "en") + '">' + esc(w.count(n[c.id] || 0)) + "</small></div>" +
        '<button type="button" class="lbe" data-id="' + esc(c.id) + '" aria-label="' + esc(w.rename + ": " + name) + '">' + PENCIL + "</button>" +
        "</li>"
      );
    })
    .join("");
}

function renderTexts() {
  var w = words(),
    l1 = lead();
  el("lbtl").innerHTML = entries
    .map(function (e) {
      var cur = categoryOf(e, cats, local),
        title = tt(e),
        sid = "lbs-" + e.id;
      return (
        "<li>" +
        '<label for="' + sid + '"><span class="lbtn" lang="' + langOf(l1) + '">' + esc(title) + "</span></label>" +
        '<select id="' + sid + '" data-t="' + esc(e.id) + '" lang="' + langOf(l1) + '" aria-label="' + esc(w.catFor(title)) + '">' +
        cats
          .map(function (c) {
            return '<option value="' + esc(c.id) + '"' + (c.id === cur ? " selected" : "") + ">" + esc(nm(c)) + "</option>";
          })
          .join("") +
        "</select></li>"
      );
    })
    .join("");
}

/** Read out to screen readers (the sheet's live region) @param {string} msg */
function say(msg) {
  var l = el("lblive");
  l.textContent = "";
  setTimeout(function () {
    l.textContent = msg;
  }, 60);
}

/** @param {string} problem */
function problem(problem) {
  var w = words(),
    msg = problem === "taken" ? w.taken : problem === "full" ? w.full : w.empty;
  el("lberr").textContent = msg;
  el("lbmr").setAttribute("aria-invalid", "true");
  el("lben").setAttribute("aria-invalid", "true");
  focus(el(lead() === "en" ? "lben" : "lbmr"));
}

function saveEdit() {
  var name = { mr: /** @type {HTMLInputElement} */ (el("lbmr")).value, en: /** @type {HTMLInputElement} */ (el("lben")).value },
    r = editing ? renameCategory(local, bundled, editing, name) : addCategory(local, bundled, name);
  if (!r.ok) return problem(r.problem);
  var id = editing || /** @type {any} */ (r).id,
    was = editing;
  keep(r.local);
  var c = /** @type {Category} */ (catById(id));
  say(was ? words().renamed(nm(c)) : words().added(nm(c)));
  show("list", id);
}

function confirmDelete() {
  var c = catById(editing),
    r = c ? removeCategory(local, bundled, c.id) : null;
  if (!c || !r || !r.ok) return show("list");
  keep(r.local);
  show("list");
  say(words().deleted(nm(c)));
}

/** @param {HTMLSelectElement} s */
function moved(s) {
  var e = entries.filter(function (x) {
      return x.id === s.getAttribute("data-t");
    })[0],
    r = e ? moveText(local, cats, e, s.value) : null;
  if (!e || !r || !r.ok) return;
  keep(r.local);
  renderCats();
  var c = catById(s.value);
  if (c) say(words().moved(tt(e), nm(c)));
}

export function init() {
  readData();
  sheet = document.getElementById("lbm");
  if (!entries.length) return;
  ready = true;
  renderList();
  libLang();
  var btn = document.getElementById("lbb");
  if (!sheet || !btn) return;
  var sh = /** @type {HTMLElement} */ (sheet);
  btn.addEventListener("click", function () {
    openSheet(btn);
  });
  el("lbx").addEventListener("click", function () {
    closeSheet();
  });
  // a tap on the dimmed page around the sheet closes it
  sh.addEventListener("click", function (e) {
    if (e.target === sh) closeSheet();
  });
  // Escape: from editing or deleting, back to the list; from the list, the sheet closes and the Library stays.
  // (This part starts before the others, so its listeners run first and the Library does not close with it.)
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || sh.hidden) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (view === "list") closeSheet();
    else show(view === "delete" ? "edit" : "list", editing);
  });
  el("lbcl").addEventListener("click", function (e) {
    var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest(".lbe"));
    if (b && b.dataset.id) show("edit", b.dataset.id);
  });
  el("lbtl").addEventListener("change", function (e) {
    var s = /** @type {HTMLElement} */ (e.target);
    if (s.tagName === "SELECT") moved(/** @type {HTMLSelectElement} */ (s));
  });
  el("lbadd").addEventListener("click", function () {
    show("edit");
  });
  el("lbv2").addEventListener("submit", function (e) {
    e.preventDefault();
    saveEdit();
  });
  el("lbcan").addEventListener("click", function () {
    show("list", editing);
  });
  el("lbreset").addEventListener("click", function () {
    var id = editing;
    keep(resetName(local, id));
    var c = catById(id);
    if (c) say(words().renamed(nm(c)));
    show("list", id);
  });
  el("lbdel").addEventListener("click", function () {
    show("delete", editing);
  });
  el("lbdy").addEventListener("click", confirmDelete);
  el("lbdn").addEventListener("click", function () {
    show("edit", editing);
  });
}

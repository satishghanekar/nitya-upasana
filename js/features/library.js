// @ts-check
// The library by category (docs/architecture.md slice 3): the home page's list of texts (अनुक्रमणिका), and with it
// the Contents list and the left menu on wide screens (both built from it), grouped by category: Vedic Chant, Aarti
// and any the family added, in the order of content/categories.json. The categories sheet (#lbm, "Edit categories"
// under the list and in the left menu) adds a category, renames one (a built-in one only on this phone; it can't be
// deleted) and moves a text to another category. What the family changes is kept on this phone for everyone on it
// (js/store/store.js, meta.library) and in backup files; the rules are in js/core/library.js.
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
import { buildList } from "./contents-list.js";
import { buildRail } from "../text/layout.js";
import { apply, mark } from "./bars.js";
import { titlesSet } from "../text/iast.js";
import { buildIX } from "../text/search.js";
import { ovDone, ovPush } from "./history.js";
import { setJ, setP } from "./overlays.js";

/**
 * @typedef {import("../core/library.js").Category} Category
 * @typedef {import("../core/library.js").BundledCategory} BundledCategory
 * @typedef {import("../core/library.js").LibraryLocal} LibraryLocal
 * @typedef {import("../core/library.js").Name} Name
 * @typedef {{ id: string, sec: string, category: string, title: string, titleEn: string, language: string,
 *   no: { mr: string, en: string } }} Entry   a text as listed: its section on the reading page (a1) and number there
 * @typedef {"list" | "edit" | "delete"} View
 */

const DV = "०१२३४५६७८९";
/** @param {number} n */
function dv(n) {
  return String(n).replace(/[0-9]/g, function (d) {
    return DV[+d];
  });
}

// The sheet's words, in the menu language (P.ui)
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
      return n === 0 ? "No texts yet" : n === 1 ? "1 text" : n + " texts";
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
      return n === 0 ? "अजून एकही रचना नाही" : dv(n) + " रचना";
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
    deleted: function (n) {
      return n + " काढला";
    },
  },
};
const PENCIL =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';
const SHELF =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="M15 5.2l3.9-1 3.6 14.6-3.9 1z"/></svg>';

/** @type {BundledCategory[]} */
var bundled = [];
/** @type {Entry[]} */
var entries = [];
/** @type {LibraryLocal} */
var local = emptyLocal();
/** @type {Category[]} */
var cats = [];
var ready = false;

/** @type {HTMLElement} */
var sheet;
/** @type {Element | null} */
var ret = null;
/** @type {View} */
var view = "list";
var editing = "";

function words() {
  return P && P.ui === "mr" ? W.mr : W.en;
}
/** @param {string} s */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
/** @param {string} s */
function to(s) {
  /** @type {any} */
  var w = window;
  return w.SCR ? w.SCR.to(s) : s;
}
/** The language a name is written in, for screen readers: English for Latin letters, else Marathi */
/** @param {string} s */
function langOf(s) {
  return /^[\s\x20-\x7eÀ-ɏ]*$/.test(s) ? "en" : "mr";
}
/** @param {string} id */
function el(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

// ---- the data: the texts in reading order with their sections, the categories, the family's changes ----
function readData() {
  var lib = loaded.library;
  /** @type {any} */
  var w = window;
  var C = w.CONTENT;
  entries = [];
  if (!lib || !C) return;
  var byId = /** @type {Record<string, any>} */ ({});
  lib.texts.forEach(function (t) {
    byId[t.id] = t;
  });
  // If content/categories.json could not be loaded, the reading page's groups (Pooja, Aarti) stand in
  var cj = loaded.categories || [],
    fallback = !cj.length;
  bundled = fallback
    ? lib.groups.map(function (g, i) {
        return { id: g.id, name: { mr: g.name.mr, en: g.name.en }, order: i + 1 };
      })
    : cj;
  lib.groups.forEach(function (g, gi) {
    g.texts.forEach(function (id, i) {
      var t = byId[id],
        p = C.groups[gi] && C.groups[gi].pieces[i];
      if (!t || !p) return;
      entries.push({ id: id, sec: p.id, category: fallback ? g.id : t.category, title: t.title, titleEn: t.titleEn, language: t.language, no: p.no });
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
 * Every text for search (js/text/search.js): id, section, titles and its category's names
 * @returns {{ id: string, sec: string, title: string, titleEn: string, categories: string[] }[]}
 */
export function textsForSearch() {
  return entries.map(function (e) {
    var c = catById(categoryOf(e, cats, local));
    return { id: e.id, sec: e.sec, title: e.title, titleEn: e.titleEn, categories: c ? [c.name.mr, c.name.en] : [] };
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

/** @param {string} id */
function catById(id) {
  return (
    cats.filter(function (c) {
      return c.id === id;
    })[0] || null
  );
}

/** A name in both languages, shown by the page's data-lang like every other pair */
/** @param {Name} n */
function two(n) {
  return '<span class="mr">' + esc(n.mr) + '</span><span class="en" lang="en">' + esc(n.en) + "</span>";
}

// ---- the home list (#home .tocg, one per category with texts), the markup the Contents list, the left menu and
// the styles read ----
function listHtml() {
  var lib = loaded.library,
    langs = (lib && lib.languages) || {};
  return shelves(entries, cats, local)
    .filter(function (s) {
      return s.texts.length;
    })
    .map(function (s) {
      var items = s.texts
        .map(function (id) {
          var e = /** @type {Entry} */ (
              entries.filter(function (x) {
                return x.id === id;
              })[0]
            ),
            lt = langs[e.language];
          return (
            '<li><a href="#' + e.sec + '" data-go="' + e.sec + '"><span class="m"><span class="no"><span class="nm">' + e.no.mr + '</span><span class="ne">' + e.no.en + "</span></span> " +
            '<span class="mr">' + esc(e.title) + '</span><span class="en" lang="en">' + esc(e.titleEn) + "</span></span>" +
            (lt ? '<span class="lt"><span class="mr">' + esc(lt.mr) + '</span><span class="en" lang="en">' + esc(lt.en) + "</span></span>" : "") +
            "</a></li>"
          );
        })
        .join("");
      return '<div class="tocg" data-cat="' + s.category.id + '"><h2 class="gh">' + two(s.category.name) + '</h2><ol class="toc">' + items + "</ol></div>";
    })
    .join("");
}

/** Put the list in the page (in the chosen script: the page is already converted when this runs) */
function renderList() {
  var home = document.getElementById("home"),
    at = document.getElementById("lbr");
  if (!home || !at) return;
  [].forEach.call(home.querySelectorAll(".tocg"), function (/** @type {Element} */ g) {
    g.remove();
  });
  at.insertAdjacentHTML("beforebegin", to(listHtml()));
  var gs = home.querySelectorAll(".tocg");
  if (gs.length) gs[gs.length - 1].classList.add("tocl");
}

/** After a change: the list, the Contents list and left menu built from it, the switches and search */
function refreshPage() {
  renderList();
  buildList();
  buildRail();
  titlesSet();
  apply();
  mark();
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

// ---- the categories sheet ----
/** @param {Element | null} [from] */
export function openSheet(from) {
  if (!sheet || !sheet.hidden) return;
  ovPush();
  ret = from || document.activeElement;
  var pn = document.getElementById("panel"),
    jp = document.getElementById("jump");
  if (pn && !pn.hidden) setP(false);
  if (jp && !jp.hidden) setJ(false);
  sheet.hidden = false;
  document.documentElement.style.overflow = "hidden";
  [].forEach.call(document.querySelectorAll("#lbb, #rlb"), function (/** @type {Element} */ b) {
    b.setAttribute("aria-expanded", "true");
  });
  show("list");
}

/** @param {boolean} [fromPop] closed by the phone's Back (the Back step is already gone) */
export function closeSheet(fromPop) {
  if (!sheet || sheet.hidden) return;
  sheet.hidden = true;
  document.documentElement.style.overflow = "";
  [].forEach.call(document.querySelectorAll("#lbb, #rlb"), function (/** @type {Element} */ b) {
    b.setAttribute("aria-expanded", "false");
  });
  if (!fromPop) ovDone();
  var r = /** @type {HTMLElement | null} */ (ret);
  ret = null;
  if (r && r.isConnected && r.getClientRects().length)
    try {
      r.focus({ preventScroll: true });
    } catch (e) {}
}

/** @param {HTMLElement | null} x */
function focus(x) {
  if (x)
    try {
      x.focus({ preventScroll: true });
    } catch (e) {}
}

/** A category's name in the menu language */
/** @param {Category | Name} c */
function nm(c) {
  var n = "name" in c ? c.name : c;
  return to(P.ui === "mr" ? n.mr : n.en);
}
/** A text's title in the menu language */
/** @param {Entry} e */
function tt(e) {
  return P.ui === "mr" ? to(e.title) : e.titleEn;
}

/**
 * Show one of the sheet's views and move focus into it
 * @param {View} v
 * @param {string} [id]  the category to rename or delete ("" or none: add one)
 */
function show(v, id) {
  var w = words(),
    box = /** @type {HTMLElement} */ (sheet.querySelector(".pfc")),
    ui = P.ui === "mr" ? "mr" : "en";
  view = v;
  box.setAttribute("data-lang", ui);
  box.lang = ui;
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
    if (c && c.original) rs.textContent = w.reset(P.ui === "mr" ? c.original.mr : c.original.en);
    el("lbdel").hidden = !c || c.origin !== "family";
    el("lbdel").textContent = w.del;
    el("lbbi").hidden = !c || c.origin !== "bundled";
    el("lbbi").textContent = w.builtIn;
    focus(ui === "mr" ? mr : en);
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
    n = counts(shelves(entries, cats, local));
  el("lbcl").innerHTML = cats
    .map(function (c) {
      var name = nm(c),
        other = to(P.ui === "mr" ? c.name.en : c.name.mr);
      return (
        "<li>" +
        '<div class="lbcn"><span class="lbn" lang="' + langOf(name) + '">' + esc(name) + "</span>" +
        (other !== name ? '<span class="lbo" lang="' + langOf(other) + '">' + esc(other) + "</span>" : "") +
        '<small class="lbk">' + esc(w.count(n[c.id] || 0)) + "</small></div>" +
        '<button type="button" class="lbe" data-id="' + c.id + '" aria-label="' + esc(w.rename + ": " + name) + '">' + PENCIL + "</button>" +
        "</li>"
      );
    })
    .join("");
}

function renderTexts() {
  var w = words();
  el("lbtl").innerHTML = entries
    .map(function (e) {
      var cur = categoryOf(e, cats, local),
        title = tt(e),
        sid = "lbs-" + e.id;
      return (
        "<li>" +
        '<label for="' + sid + '"><span class="lbtn" lang="' + (P.ui === "mr" ? "mr" : "en") + '">' + esc(title) + "</span></label>" +
        '<select id="' + sid + '" data-t="' + e.id + '" aria-label="' + esc(w.catFor(title)) + '">' +
        cats
          .map(function (c) {
            return '<option value="' + c.id + '"' + (c.id === cur ? " selected" : "") + ">" + esc(nm(c)) + "</option>";
          })
          .join("") +
        "</select></li>"
      );
    })
    .join("");
}

/** @param {string} msg */
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
  var f = /** @type {HTMLInputElement} */ (el(P.ui === "mr" ? "lbmr" : "lben"));
  el("lbmr").setAttribute("aria-invalid", "true");
  el("lben").setAttribute("aria-invalid", "true");
  focus(f);
}

function saveEdit() {
  var name = { mr: /** @type {HTMLInputElement} */ (el("lbmr")).value, en: /** @type {HTMLInputElement} */ (el("lben")).value },
    r = editing ? renameCategory(local, bundled, editing, name) : addCategory(local, bundled, name);
  if (!r.ok) return problem(r.problem);
  var id = editing || /** @type {any} */ (r).id;
  keep(r.local);
  if (!editing) say(words().added(nm(/** @type {Category} */ (catById(id)))));
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

/** The buttons that open the sheet: under the home list, and at the foot of the left menu */
export function buttons() {
  var w = W,
    b = '<span class="mr">' + to(w.mr.open) + '</span><span class="en" lang="en">' + w.en.open + "</span>";
  var lbr = document.getElementById("lbr");
  if (lbr && !lbr.firstChild) lbr.innerHTML = '<button type="button" id="lbb" aria-haspopup="dialog" aria-expanded="false" aria-controls="lbm">' + SHELF + b + "</button>";
  var rail = document.getElementById("rail");
  if (rail && !document.getElementById("rlb"))
    rail.insertAdjacentHTML("beforeend", '<button type="button" id="rlb" class="rlb" aria-haspopup="dialog" aria-expanded="false" aria-controls="lbm">' + SHELF + b + "</button>");
}

export function init() {
  readData();
  sheet = el("lbm");
  if (!entries.length) return;
  ready = true;
  renderList();
  buttons();
  if (!sheet) return;
  document.addEventListener("click", function (e) {
    var t = /** @type {HTMLElement} */ (e.target),
      b = t.closest && t.closest("#lbb, #rlb");
    if (b) openSheet(b);
  });
  el("lbx").addEventListener("click", function () {
    closeSheet();
  });
  sheet.addEventListener("click", function (e) {
    if (e.target === sheet) closeSheet();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !sheet.hidden) {
      e.preventDefault();
      if (view === "list") closeSheet();
      else show("list", editing);
    }
  });
  addEventListener("popstate", function () {
    if (!sheet.hidden) closeSheet(true);
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

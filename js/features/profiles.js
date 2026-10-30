// @ts-check
// People on this phone: the profile chip in the top bar (#who: round badge
// and name) opens the profile sheet (#pfm), where a tap on a person switches to them, and Add a person / Edit (name,
// badge letters, colour, Delete with a confirmation, never the last person) keep the list. Settings → Who is reading
// opens the same sheet. Each person keeps their own text size, languages, English style, font, dhrupad, theme and
// high contrast and their routine; switching puts theirs on the page at once, without a reload (applyPrefs()).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// The people are kept by js/store/store.js (IndexedDB); the rules (names, badge letters, colours) are in
// js/store/profiles.js.

import { P, setAll } from "../core/state.js";
import { note } from "../core/page.js";
import { cur } from "../core/apply.js";
import { hlMark } from "../core/startup.js";
import { apply } from "./bars.js";
import { setP } from "./overlays.js";
import { ovDone, ovPush } from "./history.js";
import { profileChanged } from "./today-card.js";
import { trSet } from "../text/iast.js";
import { refit } from "../text/autofit.js";
import { buildIX } from "../text/search.js";
import { active, add, list, onChange, remove, switchTo, update } from "../store/store.js";
import { canAdd, canDelete, COLOURS, initialsOf } from "../store/profiles.js";
import { esc } from "../core/words.js";
import { menuWords } from "../core/strings.js";

/**
 * @typedef {import("../store/profiles.js").Profile} Profile
 * @typedef {"list" | "edit" | "delete"} View
 */

// The sheet's words, in the menu language (P.ui)
const PENCIL =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';
const CHECK =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

/** @type {HTMLElement} */
var sheet;
/** @type {HTMLElement} */
var chip;
/** @type {Element | null} */
var ret = null;
/** @type {View} */
var view = "list";
// the person being edited ("" while adding) and the colour picked
var editing = "",
  colour = "";

function words() {
  return menuWords("profiles");
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

/** The round badge: letters on the person's colour */
/** @param {Profile} p */
function badge(p) {
  return '<span class="pfa" aria-hidden="true" style="background:' + p.colour + '" lang="' + langOf(p.initials) + '">' + esc(p.initials) + "</span>";
}

// ---- the chip in the top bar ----
export function renderChip() {
  var p = active();
  if (!p || !chip) return;
  var a = /** @type {HTMLElement} */ (chip.querySelector(".pfa")),
    n = /** @type {HTMLElement} */ (chip.querySelector(".pfn"));
  a.textContent = p.initials;
  a.style.background = p.colour;
  a.lang = langOf(p.initials);
  a.classList.toggle("long", p.initials.length > 2);
  n.textContent = p.name;
  n.lang = langOf(p.name);
  el("whol").textContent = words().chip;
  var v = document.getElementById("spfv");
  if (v) {
    v.textContent = p.name;
    v.lang = langOf(p.name);
  }
}

// ---- the sheet ----
/** @param {Element | null} [from] where focus goes back to when the sheet closes */
export function openSheet(from) {
  if (!sheet.hidden) return;
  ovPush();
  ret = from || document.activeElement;
  sheet.hidden = false;
  // from Settings: Settings closes (its Back step now belongs to the sheet), and focus returns to the ⚙ button
  var pn = document.getElementById("panel");
  if (pn && !pn.hidden) {
    setP(false);
    ret = document.getElementById("aa");
  }
  chip.setAttribute("aria-expanded", "true");
  document.documentElement.style.overflow = "hidden";
  show("list");
}

/** @param {boolean} [fromPop] closed by the phone's Back (the Back step is already gone) */
export function closeSheet(fromPop) {
  if (sheet.hidden) return;
  sheet.hidden = true;
  chip.setAttribute("aria-expanded", "false");
  document.documentElement.style.overflow = "";
  if (!fromPop) ovDone();
  var r = /** @type {HTMLElement | null} */ (ret);
  ret = null;
  if (r && r.isConnected && r.getClientRects().length)
    try {
      r.focus({ preventScroll: true });
    } catch (e) {}
}

/**
 * Show one of the sheet's three views and move focus into it
 * @param {View} v
 * @param {string} [id]  the person to edit or delete
 */
function show(v, id) {
  var w = words(),
    pfc = /** @type {HTMLElement} */ (sheet.querySelector(".pfc"));
  view = v;
  pfc.setAttribute("data-lang", P.ui === "mr" ? "mr" : "en");
  pfc.lang = P.ui === "mr" ? "mr" : "en";
  el("pfv1").hidden = v !== "list";
  el("pfv2").hidden = v !== "edit";
  el("pfv3").hidden = v !== "delete";
  el("pfx").setAttribute("aria-label", w.close);
  var t = el("pfmt");
  if (v === "list") {
    t.textContent = w.title;
    renderList();
    var on = /** @type {HTMLElement | null} */ (sheet.querySelector('.pfp[aria-current="true"]'));
    focus(on || t);
  } else if (v === "edit") {
    var p = id ? byId(id) : null;
    editing = p ? p.id : "";
    t.textContent = p ? w.editTitle + p.name : w.addTitle;
    el("pfnamel").textContent = w.name;
    el("pfinil").textContent = w.initials;
    el("pfinih").textContent = w.initialsHint;
    el("pfcl").textContent = w.colour;
    el("pfsave").textContent = w.save;
    el("pfcan").textContent = w.cancel;
    el("pfdel").textContent = w.del;
    el("pferr").textContent = "";
    var name = /** @type {HTMLInputElement} */ (el("pfname")),
      ini = /** @type {HTMLInputElement} */ (el("pfini"));
    name.value = p ? p.name : "";
    name.removeAttribute("aria-invalid");
    ini.value = p ? p.initials : "";
    ini.placeholder = p ? initialsOf(p.name) : "";
    colour = p ? p.colour : nextFree();
    renderColours();
    el("pfdel").hidden = !p || !canDelete(list(), p.id);
    focus(name);
  } else {
    var d = byId(id || "");
    if (!d) return show("list");
    editing = d.id;
    t.textContent = w.del;
    el("pfdq").textContent = w.ask(d.name);
    el("pfdy").textContent = w.yes;
    el("pfdn").textContent = w.cancel;
    focus(el("pfdn"));
  }
}

/** @param {HTMLElement} x */
function focus(x) {
  try {
    x.focus({ preventScroll: true });
  } catch (e) {}
}

/** @param {string} id */
function byId(id) {
  return list().filter(function (p) {
    return p.id === id;
  })[0];
}

function nextFree() {
  var used = list().map(function (p) {
    return p.colour;
  });
  var c = COLOURS.filter(function (x) {
    return used.indexOf(x.v) < 0;
  })[0];
  return (c || COLOURS[0]).v;
}

function renderList() {
  var w = words(),
    a = active(),
    all = list();
  el("pfl").innerHTML = all
    .map(function (p) {
      var on = p.id === a.id;
      return (
        "<li>" +
        '<button type="button" class="pfp" data-id="' +
        p.id +
        '"' +
        (on ? ' aria-current="true"' : "") +
        ">" +
        badge(p) +
        '<span class="pfnm" lang="' +
        langOf(p.name) +
        '">' +
        esc(p.name) +
        "</span>" +
        (on ? '<span class="pfnow">' + CHECK + "<span>" + w.now + "</span></span>" : "") +
        "</button>" +
        '<button type="button" class="pfe" data-id="' +
        p.id +
        '" aria-label="' +
        esc(w.edit + ": " + p.name) +
        '">' +
        PENCIL +
        "</button>" +
        "</li>"
      );
    })
    .join("");
  el("pfaddw").textContent = w.add;
  el("pfadd").hidden = !canAdd(all);
  el("pfi").textContent = canAdd(all) ? w.info : w.full;
}

function renderColours() {
  var ui = /** @type {"mr" | "en"} */ (P.ui === "mr" ? "mr" : "en");
  el("pfcol").innerHTML = COLOURS.map(function (c) {
    return (
      '<label class="pfsw" style="--c:' +
      c.v +
      '"><input type="radio" name="pfcolour" value="' +
      c.v +
      '"' +
      (c.v === colour ? " checked" : "") +
      ' aria-label="' +
      c[ui] +
      '"><span aria-hidden="true">' +
      CHECK +
      "</span></label>"
    );
  }).join("");
}

/** @param {"empty" | "taken" | "full" | "missing"} problem */
function problem(problem) {
  var w = words(),
    msg = problem === "taken" ? w.taken : problem === "full" ? w.full : w.empty;
  el("pferr").textContent = msg;
  var name = el("pfname");
  name.setAttribute("aria-invalid", "true");
  focus(name);
}

function saveEdit() {
  var name = /** @type {HTMLInputElement} */ (el("pfname")).value,
    ini = /** @type {HTMLInputElement} */ (el("pfini")).value,
    r = editing ? update(editing, { name: name, initials: ini, colour: colour }) : add({ name: name, initials: ini, colour: colour });
  if (!r.ok) return problem(r.problem);
  // keep this person's data: asking the browser not to clear it on its own (js/features/backup.js listens)
  if (!editing) document.dispatchEvent(new Event("nitya-people"));
  show("list");
  var b = /** @type {HTMLElement | null} */ (sheet.querySelector('.pfp[data-id="' + r.profile.id + '"]'));
  if (b) focus(b);
}

/**
 * Put another person's settings on the page, in place: languages and script, English style, highlighted line,
 * text size, theme and the rest, then the Today card with their routine. Used for a switch, a delete and a restore.
 * @param {Record<string, any>} next
 */
export function applyPrefs(next) {
  var old = { ind: P.ind, tr: P.tr, hl: P.hl, fnt: P.fnt },
    /** @type {any} */
    c = cur();
  /** @type {any} */
  var w = window;
  setAll(next);
  if (P.tr !== old.tr) trSet(P.tr, true);
  if (P.ind !== old.ind) {
    w.SCR.set(P.ind);
  }
  if (P.tr !== old.tr || P.ind !== old.ind) buildIX();
  if (P.hl !== old.hl) {
    [].forEach.call(document.querySelectorAll(".hl, .hli"), function (/** @type {HTMLElement} */ x) {
      x.classList.remove("hl", "hli");
    });
    if (P.hl) hlMark(P.hl);
  }
  apply();
  if (P.ind !== old.ind || P.fnt !== old.fnt) refit();
  profileChanged();
  renderChip();
  if (c) c.scrollIntoView();
}

/** @param {string} id */
function switchPerson(id) {
  var next = switchTo(id, P);
  closeSheet();
  if (!next) return;
  applyPrefs(next);
  var n = active().name;
  note(menuWords("profiles").switched(n), 2200);
}

function confirmDelete() {
  var p = byId(editing),
    r = p ? remove(p.id) : { ok: false, switched: null };
  if (!p || !r.ok) return show("list");
  if (r.switched) applyPrefs(r.switched);
  note(menuWords("profiles").deleted(p.name));
  show("list");
}

export function init() {
  sheet = el("pfm");
  chip = el("who");
  if (!sheet || !chip) return;
  renderChip();
  onChange(renderChip);
  chip.addEventListener("click", function () {
    if (sheet.hidden) openSheet(chip);
    else closeSheet();
  });
  var sp = document.getElementById("spf");
  if (sp)
    sp.addEventListener("click", function () {
      openSheet(sp);
    });
  el("pfx").addEventListener("click", function () {
    closeSheet();
  });
  // a tap on the dimmed page around the sheet closes it
  sheet.addEventListener("click", function (e) {
    if (e.target === sheet) closeSheet();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !sheet.hidden) {
      e.preventDefault();
      // from editing or deleting, Escape steps back to the list; from the list it closes the sheet
      if (view === "list") closeSheet();
      else show("list");
    }
  });
  addEventListener("popstate", function () {
    if (!sheet.hidden) closeSheet(true);
  });
  el("pfl").addEventListener("click", function (e) {
    var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest("button"));
    if (!b || !b.dataset.id) return;
    if (b.classList.contains("pfe")) show("edit", b.dataset.id);
    else if (b.dataset.id === active().id) closeSheet();
    else switchPerson(b.dataset.id);
  });
  el("pfadd").addEventListener("click", function () {
    show("edit");
  });
  el("pfv2").addEventListener("submit", function (e) {
    e.preventDefault();
    saveEdit();
  });
  el("pfcol").addEventListener("change", function (e) {
    colour = /** @type {HTMLInputElement} */ (e.target).value;
  });
  el("pfname").addEventListener("input", function () {
    var ini = /** @type {HTMLInputElement} */ (el("pfini"));
    ini.placeholder = initialsOf(/** @type {HTMLInputElement} */ (el("pfname")).value);
  });
  el("pfcan").addEventListener("click", function () {
    show("list");
  });
  el("pfdel").addEventListener("click", function () {
    show("delete", editing);
  });
  el("pfdy").addEventListener("click", confirmDelete);
  el("pfdn").addEventListener("click", function () {
    show("edit", editing);
  });
}

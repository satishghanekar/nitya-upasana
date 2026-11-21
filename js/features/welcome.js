// @ts-check
// Welcome (Satish, 2026-11-21; a card on Home since 2026-11-02): once, on a new phone, two full-screen steps over Home,
// so a first opening is not every part of Home at once. First what the app is, the menu language and the first person's
// name, or Guest, which keeps the name as it is; then which ready-made routine they follow (Short, Daily, Full,
// Extended, as at the top of the routine builder, each with what it holds and its time a day), and where to change
// both later. Start keeps them and shows Home. Back, on the first step, closes it as Guest with the routine as it is,
// so no one is held here. Not when the site opens at a text (a shared link) or to print: the next visit that opens on
// Home shows it.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// Whether it was seen is kept on this phone only (localStorage "nitya-welcome", 2 when done: the number once counted
// how often the card was put off), not with the people or in backups: a person restored on another phone needs no
// welcome, and a cleared phone is a new one.

import { BASES, baseRoutine, perDay } from "../core/routine.js";
import { short, weekTime } from "./routine-time.js";
import { note } from "../core/page.js";
import { P } from "../core/state.js";
import { active, base, onChange, routine, setBase, update } from "../store/store.js";
import { loaded } from "../text/load.js";
import { esc, ui } from "../core/words.js";
import { menuWords } from "../core/strings.js";
import { fromLink } from "./install-page.js";
import { pickFirst, readingName } from "./languages.js";

var KEY = "nitya-welcome",
  DONE = 2,
  // the first reading languages offered: Marathi as written, or in Kannada, Telugu or Gujarati letters
  FIRST = ["mr", "kn", "te", "gu"];

/** @type {HTMLFormElement | null} */
var card = null;

/** @param {string} id */
function el(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/** Seen already (or this phone keeps nothing, so it would come back at every opening) */
function seen() {
  try {
    return Number(localStorage.getItem(KEY) || 0) >= DONE;
  } catch (e) {
    return true;
  }
}

/** The step shown: 1, what the app is and the name; 2, the routine */
function step() {
  return el("welcome-routine").hidden ? 1 : 2;
}

/** Both steps' words, the routines and what each holds, in the menu language */
function draw() {
  if (!card || card.hidden) return;
  var w = menuWords("welcome"),
    rw = menuWords("routine"),
    bw = /** @type {Record<string, string>} */ (rw.bases),
    info = /** @type {Record<string, string>} */ (rw.baseInfo),
    b = base();
  card.lang = ui();
  card.setAttribute("aria-label", w.title);
  // (with Marathi menus the title above already says it)
  el("welcome-sub").textContent = ui() === "mr" ? "" : w.app;
  el("welcome-what").textContent = w.what;
  el("welcome-facts").innerHTML = /** @type {string[]} */ (w.facts)
    .map(function (f) {
      return "<li>" + esc(f) + "</li>";
    })
    .join("");
  el("welcome-lang-label").textContent = w.first;
  el("welcome-second").textContent = w.second;
  // the reading languages' names, as Settings lists them
  /** @type {HTMLSelectElement} */ (el("welcome-lang")).innerHTML = FIRST.map(function (k) {
    return '<option value="' + k + '">' + esc(readingName(k)) + "</option>";
  }).join("");
  /** @type {HTMLSelectElement} */ (el("welcome-lang")).value = P.lead === "en" ? "mr" : P.ind;
  el("wlcnl").textContent = w.name;
  el("welcome-name-note").textContent = w.nameNote;
  el("welcome-next").textContent = w.next;
  el("welcome-guest").textContent = w.guest;
  el("welcome-back").setAttribute("aria-label", w.back);
  el("welcome-routine-title").textContent = w.routine;
  var own = !!routine();
  // a person who already made their routine their own keeps it: nothing to pick here
  el("welcome-routine-note").textContent = own ? w.own : w.routineNote;
  el("wlcb").hidden = own;
  el("wlcb").innerHTML = BASES.map(function (id) {
    var on = id === b,
      r = baseRoutine(loaded.routines, id),
      n = perDay(r);
    return (
      '<button type="button" role="radio" data-v="' +
      id +
      '" aria-checked="' +
      on +
      '" tabindex="' +
      (on ? 0 : -1) +
      '"><span class="welcome-r-name">' +
      esc(bw[id]) +
      '</span><span class="welcome-r-time">' +
      esc(short(weekTime(r))) +
      '</span><span class="welcome-r-info">' +
      esc(info[id]) +
      " · " +
      esc(rw.perDay(n[0], n[1])) +
      "</span></button>"
    );
  }).join("");
  el("welcome-change-title").textContent = w.change;
  el("welcome-edit").textContent = menuWords("today").edit;
  el("welcome-edit-tip").textContent = w.editTip;
  el("welcome-badge-tip").textContent = w.badgeTip;
  // the badge as the top bar shows it (js/features/profiles.js)
  var a = document.querySelector("#who .pfa");
  el("welcome-badge").innerHTML = a ? a.outerHTML : "";
  el("wlcs").textContent = w.start;
  // the picture of this time of day, as on Home (js/features/day-picture.js)
  var pic = /** @type {HTMLImageElement | null} */ (document.querySelector("#iconb img"));
  if (pic) /** @type {HTMLImageElement} */ (el("welcome-picture")).src = pic.currentSrc || pic.src;
  /** @type {HTMLInputElement} */ (el("wlcn")).placeholder = w.namePh;
}

/** The menu language changed (apply(), js/features/bars.js): the words follow it */
export function welcomeLang() {
  draw();
}

/** Show a step, its heading or first field focused @param {number} n */
function show(n) {
  el("welcome-about").hidden = n !== 1;
  el("welcome-routine").hidden = n !== 2;
  if (card) card.scrollTop = 0;
  // (the heading, not the name: on a phone a field focused brings the keyboard up over the step)
  var f = n === 1 ? el("welcome-title") : el("welcome-routine-title");
  try {
    f.focus({ preventScroll: true });
  } catch (e) {}
}

/** The name typed is kept (left empty, or Guest, the name stays as it was) @param {boolean} guest */
function keepName(guest) {
  var p = active(),
    input = /** @type {HTMLInputElement} */ (el("wlcn")),
    typed = guest ? "" : input.value.trim();
  if (guest) input.value = "";
  if (p && typed && typed !== p.name) update(p.id, { name: typed, initials: "", colour: p.colour });
}

/** Done: kept as seen, Home shown, focus on Home's session heading so nothing is lost */
function close() {
  try {
    localStorage.setItem(KEY, String(DONE));
  } catch (e) {}
  if (!card) return;
  card.hidden = true;
  document.documentElement.removeAttribute("data-welcome");
  var h = document.getElementById("tsh");
  if (h)
    try {
      h.focus({ preventScroll: true });
    } catch (e) {}
}

/** Pick a ready-made routine: Home's lists follow it at once @param {string} id */
function pick(id) {
  if (routine() || id === base()) return;
  setBase(id);
  document.dispatchEvent(new Event("nitya-routine"));
  draw();
  var b = /** @type {HTMLElement | null} */ (el("wlcb").querySelector('[aria-checked="true"]'));
  if (b) b.focus();
}

/** Escape: from the routine back to the first step; from the first step, closed as Guest with the routine as it is.
 * (The phone's Back has no step of the app's to go back to on a first opening: it leaves the app, and the welcome is
 * there at the next opening.) */
function back() {
  if (step() === 2) show(1);
  else {
    keepName(true);
    close();
  }
}

export function init() {
  card = /** @type {HTMLFormElement | null} */ (document.getElementById("wlc"));
  if (!card || seen()) return;
  // opened at a text (a shared link) or to print: not now; nor under the install page opened by the shared link: in
  // Safari it would be asked again in the home screen app, which keeps its data apart (js/features/install-page.js)
  if (location.hash.length > 1 || /[?&]print=/.test(location.search) || fromLink) return;
  el("welcome-lang").addEventListener("change", function () {
    var v = /** @type {HTMLSelectElement} */ (el("welcome-lang")).value;
    if (v && (v !== P.ind || P.lead === "en")) pickFirst(v);
  });
  card.hidden = false;
  // Home under it stays still and out of reach (css/11-profiles.css)
  document.documentElement.setAttribute("data-welcome", "1");
  draw();
  onChange(draw);
  // (Next, or Enter in the name)
  el("welcome-next").addEventListener("click", function () {
    keepName(false);
    show(2);
  });
  el("welcome-guest").addEventListener("click", function () {
    keepName(true);
    show(2);
  });
  el("welcome-back").addEventListener("click", function () {
    show(1);
  });
  el("wlcb").addEventListener("click", function (e) {
    var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest("button"));
    if (b && b.dataset.v) pick(b.dataset.v);
  });
  // a radio group: arrows (and Home / End) move and choose
  el("wlcb").addEventListener("keydown", function (e) {
    var bs = /** @type {HTMLElement[]} */ ([].slice.call(el("wlcb").querySelectorAll("button"))),
      i = bs.indexOf(/** @type {HTMLElement} */ (e.target)),
      j = -1;
    if (i < 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % bs.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + bs.length) % bs.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = bs.length - 1;
    if (j < 0) return;
    e.preventDefault();
    pick(bs[j].dataset.v || "");
  });
  card.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      e.preventDefault();
      back();
    }
  });
  // Enter in the name goes on, as Next; Start, on the second step, closes it and greets by the name typed
  card.addEventListener("submit", function (e) {
    e.preventDefault();
    if (step() === 1) {
      keepName(false);
      show(2);
      return;
    }
    var p = active(),
      typed = /** @type {HTMLInputElement} */ (el("wlcn")).value.trim();
    close();
    // ("Welcome, Me" would read oddly, so only a name typed)
    if (p && typed) note(menuWords("welcome").done(p.name), 2500);
  });
  show(1);
}

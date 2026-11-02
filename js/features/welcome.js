// @ts-check
// Welcome (Satish, 2026-11-02): once, on a new phone's Home, a card (#wlc) that asks the first person's name and
// which ready-made routine they follow (Short, Daily, Full, Extended, as at the top of the routine builder). It is
// never in the way: Home shows under it, a title can be tapped and read, and the lists follow the routine picked.
// Start keeps both; Later puts it off until the next visit, twice at most. Not when the site opens at a text (a shared
// link): the next visit that opens on Home shows it.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// Whether it was seen is kept on this phone only (localStorage "nitya-welcome": how many times it was put off, 2 when
// done), not with the people or in backups: a person restored on another phone needs no welcome, and a cleared phone
// is a new one.

import { BASES, baseRoutine, perDay } from "../core/routine.js";
import { note } from "../core/page.js";
import { active, base, onChange, routine, setBase, update } from "../store/store.js";
import { loaded } from "../text/load.js";
import { esc, ui } from "../core/words.js";
import { menuWords } from "../core/strings.js";

var KEY = "nitya-welcome",
  // put off this often, the card is not shown again
  ENOUGH = 2;

/** @type {HTMLFormElement | null} */
var card = null;

/** @param {string} id */
function el(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/** How many times the card was put off (2: done, or put off enough) */
function seen() {
  try {
    var n = Number(localStorage.getItem(KEY) || 0);
    return isFinite(n) ? n : 0;
  } catch (e) {
    return ENOUGH;
  }
}
/** @param {number} n */
function keep(n) {
  try {
    localStorage.setItem(KEY, String(n));
  } catch (e) {}
}

/** The card's words, the routines' choices and what the one checked holds, in the menu language */
function draw() {
  if (!card || card.hidden) return;
  var w = menuWords("welcome"),
    rw = menuWords("routine"),
    bw = /** @type {Record<string, string>} */ (rw.bases),
    b = base(),
    p = active();
  card.lang = ui();
  el("wlct").textContent = w.title;
  el("wlcnl").textContent = w.name;
  el("wlcrl").textContent = w.routine;
  el("wlcs").textContent = w.start;
  el("wlcx").textContent = w.later;
  el("wlch").textContent = w.hint;
  var name = /** @type {HTMLInputElement} */ (el("wlcn"));
  // the name as it is now, as a hint: nothing to clear before typing, and left empty it stays
  if (p) name.placeholder = p.name;
  // a person who already made their routine their own keeps it: nothing to pick here
  el("wlcr").hidden = !!routine();
  el("wlcb").innerHTML = BASES.map(function (id) {
    var on = id === b;
    return (
      '<button type="button" role="radio" data-v="' +
      id +
      '" aria-checked="' +
      on +
      '" tabindex="' +
      (on ? 0 : -1) +
      '"><span>' +
      esc(bw[id]) +
      "</span></button>"
    );
  }).join("");
  var n = perDay(baseRoutine(loaded.routines, b));
  el("wlci").textContent = /** @type {Record<string, string>} */ (rw.baseInfo)[b] + " · " + rw.perDay(n[0], n[1]);
}

/** The menu language changed (apply(), js/features/bars.js): the card's words follow it */
export function welcomeLang() {
  draw();
}

/** Close the card: focus to Home's session heading, so nothing is lost @param {number} n  how many times put off */
function close(n) {
  keep(n);
  if (!card) return;
  card.hidden = true;
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

export function init() {
  card = /** @type {HTMLFormElement | null} */ (document.getElementById("wlc"));
  if (!card || seen() >= ENOUGH) return;
  // opened at a text (a shared link) or to print: not now
  if (location.hash.length > 1 || /[?&]print=/.test(location.search)) return;
  card.hidden = false;
  draw();
  onChange(draw);
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
  // Start (or Enter in the name): the name kept (left empty, it stays as it was), and the card goes for good
  card.addEventListener("submit", function (e) {
    e.preventDefault();
    var p = active(),
      typed = /** @type {HTMLInputElement} */ (el("wlcn")).value.trim();
    if (p && typed && typed !== p.name) update(p.id, { name: typed, initials: "", colour: p.colour });
    var now = active();
    close(ENOUGH);
    // greeted by the name typed ("Welcome, Me" would read oddly)
    if (now && typed) note(menuWords("welcome").done(now.name), 2500);
  });
  el("wlcx").addEventListener("click", function () {
    close(seen() + 1);
  });
}

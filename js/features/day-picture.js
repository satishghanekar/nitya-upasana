// @ts-check
// The app's picture follows the time of day: sunrise in the morning, midday in the afternoon, sunset in the
// evening, with today's weekday star ringed (which picture and which star: js/core/time-of-day.js).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// It sets the home page picture (#iconb), the full-screen picture (#pzi,
// fetched on its first open by features/picture-viewer.js) and the browser tab icon. The installed app icon
// stays the sunrise picture (phones copy it when the app is added to the Home Screen).
// The page can stay open for hours, so it checks again at the next change (12:00, 17:00, midnight) and whenever
// the page comes back into view (a phone's timers sleep while its screen is off).
// The Today card (js/features/today-card.js) can show another day or session: setView() then puts that day's star
// and that session's picture on the card, while the browser tab icon keeps following the clock.

import { nextChange, pictureAt, pictureFor } from "../core/time-of-day.js";

/** @type {ReturnType<typeof setTimeout> | undefined} */
let timer;
/** @type {{ session: import("../core/time-of-day.js").Session, day: number } | null} */
let view = null;

/**
 * Show the picture for a day and session picked on the Today card, or (null) for the time now.
 * @param {{ session: import("../core/time-of-day.js").Session, day: number } | null} v
 */
export function setView(v) {
  view = v;
  update();
}

/**
 * Set an attribute only when it changes, so the same picture is never asked for again.
 * @param {Element | null} el
 * @param {string} name
 * @param {string} value
 */
function set(el, name, value) {
  if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
}

/** Show the picture for this moment, then wait for the next change. */
export function update() {
  const now = new Date(),
    clock = pictureAt(now),
    p = view ? pictureFor(view.session, view.day) : clock,
    btn = document.getElementById("iconb"),
    ring = document.getElementById("iconr"),
    big = document.getElementById("pzi");
  if (btn) {
    set(btn.querySelector("img"), "src", p.small);
    // Desktop A shows it large on Home (css/10-today.css): the browser picks the full-size picture there
    set(btn.querySelector("img"), "srcset", p.small + " 360w, " + p.large + " 940w");
    set(btn, "aria-label", "Show the picture full screen: " + p.label);
    set(document.getElementById("bti"), "aria-label", "Show the picture full screen: " + p.label);
    btn.setAttribute("data-picture", p.picture);
    btn.setAttribute("data-day", String(p.day));
  }
  if (ring) {
    ring.style.left = p.star[0] + "%";
    ring.style.top = p.star[1] + "%";
    ring.hidden = false;
  }
  if (big) {
    set(big, "data-src", p.large);
    // already opened once: swap the full-size picture too
    if (big.getAttribute("src")) set(big, "src", p.large);
    set(big, "alt", p.label.replace(/,.*/, "") + ": ॐ, a palm-leaf book and a rosary under seven stars for the days of the week");
  }
  set(document.getElementById("pzv"), "aria-label", p.label.replace(/,.*/, ""));
  set(document.querySelector('link[rel="icon"][sizes="32x32"]'), "href", clock.favicon);
  clearTimeout(timer);
  // a second after the change, so the clock is surely past it
  timer = setTimeout(update, nextChange(now).getTime() - now.getTime() + 1000);
}

export function init() {
  update();
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) update();
  });
  // a page brought back from the browser's back-forward cache
  addEventListener("pageshow", function (e) {
    if (e.persisted) update();
  });
}

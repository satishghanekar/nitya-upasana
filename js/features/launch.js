// @ts-check
// The launch animation: the first opening of the day (Satish chose B of the mockups, 2026-11-19). js/splash.js starts
// it as the page is read (night, the seven stars coming out, today's growing, the day opening out of it: css/02-core.css,
// "The launch animation"); this part, once the page is set up, adds the day's lines under the picture, in the reading
// languages, at the reader's place (the one they gave, or their time zone's): the weekday and the date, the tithi, the
// place with the sunrise, today's festival, Pradosh, Sankashti or holiday (else tomorrow's) with its drawing, and the
// session now. Then the picture flies into the top bar's icon and Home shows. A tap or a key ends it at once.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { esc, lead, mrLang, second, ui } from "../core/words.js";
import { menuWords } from "../core/strings.js";
import { STARS, pictureAt } from "../core/time-of-day.js";
import { ovDone, ovPush } from "./history.js";
// (as a whole, not by name: an iPhone keeps the scripts it has in memory until the app is closed, so after an update
// this new part can meet the last version's calendar and Home card, which have no launchDay or launchSession yet; a
// name that is missing breaks every script on the page, and the app stayed on its splash, 2026-11-19. A missing
// property only leaves those lines out.)
import * as calendar from "./vedic-calendar.js";
import * as todayCard from "./today-card.js";
import * as pictureViewer from "./picture-viewer.js";

/** Today's lines from the calendar, or null (also when the calendar in memory is older than this part) */
function launchDay() {
  return typeof calendar.launchDay === "function" ? calendar.launchDay() : null;
}

/** The session now from Home's card, or null (as above) */
function launchSession() {
  return typeof todayCard.launchSession === "function" ? todayCard.launchSession() : null;
}

// When the lines come (ms from the splash's start): once the picture has opened out of today's star; and when the
// picture flies into the top bar. A page that is ready later shows them at once, and keeps them as long.
const LINES_AT = 2350;
const LINE_STEP = 190;
const FLY_AT = 4300;
const SHOWN_FOR = 1400;
// on a Sankashti, when the moon rises beside the picture
const MOON_AT = 2600;

/** The lang of a reading language as shown @param {"mr" | "en"} l */
function code(l) {
  return l === "en" ? "en" : mrLang();
}

/** The day's lines, as markup (every value escaped or built by the parts that own it) */
function linesHtml() {
  var now = new Date(),
    l1 = /** @type {"mr" | "en"} */ (lead()),
    l2 = /** @type {"mr" | "en" | ""} */ (second()),
    // the date in each language's own words (Kannada letters bring Kannada's days and months)
    d1 = menuWords("dates", code(l1)),
    dl = l2 || l1,
    d2 = menuWords("dates", code(dl)),
    day = launchDay(),
    ses = launchSession(),
    out = [
      '<div class="splwd" lang="' + code(l1) + '">' + esc(d1.days[now.getDay()]) + "</div>",
      '<div class="splsm" lang="' + code(dl) + '">' + esc(d2.day(now.getDay(), now.getDate(), now.getMonth())) + "</div>",
    ];
  if (day) {
    out.push('<div class="splti">' + day.tithi + "</div>");
    out.push('<div class="splsm">' + day.place + "</div>");
    if (day.day) out.push('<div class="splhl">' + day.day.icon + "<span><b>" + day.day.name + "</b><small>" + day.day.small + "</small></span></div>");
  }
  if (ses) out.push('<div class="splss" lang="' + ui() + '"><b>' + ses.name + "</b> · " + ses.texts + " · " + ses.time + "</div>");
  return out.join("");
}

/** The words of this part, or none when the words in memory are the last version's (as above) */
function launchWords() {
  return menuWords("launch") || { skip: "", again: "", close: "", picture: "" };
}

/** @type {number} which playing is the latest: a timer of one before it does nothing */
var playing = 0;

/**
 * Play the day's lines over the splash, whose stars js/splash.js (at launch) or replay() has set going: the lines come,
 * then at launch the picture flies into the top bar and Home shows; replayed, it stays until closed.
 * @param {HTMLElement} sp #spl
 * @param {HTMLElement} box its picture (.splm)
 * @param {boolean} stay replayed from the top bar: it stays
 * @param {() => void} end how it ends
 */
function play(sp, box, stay, end) {
  var me = ++playing;
  var lines = document.createElement("div");
  lines.className = "splh";
  try {
    lines.innerHTML = linesHtml();
  } catch (e) {
    // without its lines it still ends as it should
    console.warn(e);
  }
  sp.appendChild(lines);
  var skip = document.createElement("div");
  skip.className = "splskip";
  skip.lang = ui();
  skip.textContent = stay ? launchWords().again : launchWords().skip;
  sp.appendChild(skip);
  var gone = Math.max(0, performance.now() - Number(sp.getAttribute("data-t0") || 0)),
    at = Math.max(0, LINES_AT - gone),
    kids = /** @type {HTMLElement[]} */ ([].slice.call(lines.children));
  // on a Sankashti the moon rises beside the picture, as the day opens
  try {
    var d = launchDay();
    if (d && d.moon) {
      var moon = document.createElement("i");
      moon.className = "splmn";
      moon.style.animationDelay = Math.max(0, MOON_AT - gone) + "ms";
      box.appendChild(moon);
    }
  } catch (e) {
    console.warn(e);
  }
  kids.forEach(function (/** @type {HTMLElement} */ k, i) {
    setTimeout(
      function () {
        if (me === playing) k.classList.add("on");
      },
      at + i * LINE_STEP,
    );
  });
  if (stay) return;
  var fly = Math.max(FLY_AT - gone, at + kids.length * LINE_STEP + SHOWN_FOR);
  setTimeout(function () {
    if (me !== playing || sp.classList.contains("done") || sp.classList.contains("skip")) return;
    lines.classList.add("out");
    // the picture flies into the top bar's icon (when it is there to fly to), and Home shows under it
    var to = document.querySelector("#bti img"),
      a = box.getBoundingClientRect(),
      b = to ? to.getBoundingClientRect() : null;
    // (an animation, not a changed style: browsers count a moved box as a layout shift, never an animated transform)
    if (b && b.width && a.width)
      box.animate(
        [
          { transform: "none" },
          {
            transform: "translate(" + (b.left - a.left) + "px," + (b.top - a.top) + "px) scale(" + b.width / a.width + ")",
          },
        ],
        {
          duration: 550,
          easing: "cubic-bezier(0.5, 0, 0.2, 1)",
          fill: "forwards",
        },
      );
    setTimeout(end, 380);
  }, fly);
}

/**
 * The top bar's picture plays it again (Satish, 2026-11-19), as at launch but without flying away: the night, the stars,
 * today's growing, the day's lines, and it stays, a dialog over the page, until a tap, ✕, Escape or the phone's Back
 * closes it. Its picture opens the picture full screen (which the top bar's picture opened before).
 * @param {HTMLElement} sp #spl
 * @param {HTMLElement} from the button that opened it, where focus returns
 */
function replay(sp, from) {
  var boxEl = /** @type {HTMLElement | null} */ (sp.querySelector(".splm")),
    imgEl = /** @type {HTMLImageElement | null} */ (sp.querySelector(".splm img"));
  if (!boxEl || !imgEl) return;
  var box = /** @type {HTMLElement} */ (boxEl),
    img = /** @type {HTMLImageElement} */ (imgEl);
  // the picture and the day Home shows (the session picked there may have its own picture)
  var now = new Date(),
    ib = document.getElementById("iconb"),
    pic = /** @type {"sunrise" | "midday" | "sunset"} */ ((ib && ib.getAttribute("data-picture")) || pictureAt(now).picture),
    stars = STARS[pic] || STARS.sunrise,
    day = now.getDay(),
    today = stars[day];
  // what the last playing left: its stars, lines, moon and flight
  [].slice.call(sp.querySelectorAll(".splh, .splskip, .splm > i, #launch-close")).forEach(function (/** @type {Element} */ e) {
    e.remove();
  });
  if (box.getAnimations)
    box.getAnimations().forEach(function (a) {
      a.cancel();
    });
  img.src = "picture-" + pic + "-360.webp";
  sp.style.setProperty("--sx", today[0] + "%");
  sp.style.setProperty("--sy", today[1] + "%");
  // as js/splash.js does at launch: each star a small window onto the picture, the rest dark; rays, the Om, the ring
  stars.forEach(function (s, i) {
    var w = document.createElement("i");
    w.className = "splw" + (i === day ? " splt" : "");
    w.style.left = s[0] + "%";
    w.style.top = s[1] + "%";
    w.style.backgroundImage = "url(picture-" + pic + "-360.webp)";
    w.style.backgroundPosition = ((s[0] - 8.5) / 0.83).toFixed(2) + "% " + ((s[1] - 8.5) / 0.83).toFixed(2) + "%";
    w.style.animationDelay = (0.15 + i * 0.13).toFixed(2) + "s, 1.25s, 2.35s";
    box.appendChild(w);
  });
  [
    ["splx", today],
    ["splo", null],
    ["splr", today],
  ].forEach(function (k) {
    var e = document.createElement("i"),
      at = /** @type {number[] | null} */ (k[1]);
    e.className = /** @type {string} */ (k[0]);
    if (at) {
      e.style.left = at[0] + "%";
      e.style.top = at[1] + "%";
    }
    box.appendChild(e);
  });
  // a Back step of its own, taken before it shows (history.js takes none while something is open)
  ovPush();
  // it starts again from the night (the animations restart only once the class has been off for a frame)
  sp.className = "";
  sp.hidden = false;
  void sp.offsetWidth;
  sp.className = "launch stay";
  sp.setAttribute("data-t0", String(Math.round(performance.now())));
  // now a dialog people can reach (at launch it is hidden from screen readers, the page under it not ready)
  sp.removeAttribute("aria-hidden");
  sp.setAttribute("role", "dialog");
  sp.setAttribute("aria-modal", "true");
  var name = sp.querySelector(".spln");
  sp.setAttribute("aria-label", name ? name.textContent || "" : "");
  var w = launchWords(),
    x = document.createElement("button");
  x.type = "button";
  x.id = "launch-close";
  x.lang = ui();
  x.setAttribute("aria-label", w.close);
  x.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  sp.appendChild(x);
  // its picture, a button: the picture full screen
  box.setAttribute("role", "button");
  box.setAttribute("tabindex", "0");
  box.setAttribute("aria-label", w.picture);
  document.documentElement.style.overflow = "hidden";
  x.focus({ preventScroll: true });
  var shut = false;
  /** @param {boolean} [toPicture] */
  function close(toPicture) {
    if (shut) return;
    shut = true;
    playing++;
    sp.removeEventListener("click", tap);
    document.removeEventListener("keydown", key);
    sp.classList.add("done");
    box.removeAttribute("role");
    box.removeAttribute("tabindex");
    box.removeAttribute("aria-label");
    document.documentElement.style.overflow = "";
    // (hidden first: history.js steps back only once nothing is open)
    sp.hidden = true;
    // the picture full screen takes over its Back step (stepping back now would close the picture as it opens)
    if (toPicture && typeof pictureViewer.openDayPicture === "function") pictureViewer.openDayPicture(from);
    else {
      ovDone();
      try {
        from.focus({ preventScroll: true });
      } catch (e) {}
    }
  }
  /** @param {Event} e */
  function tap(e) {
    var t = /** @type {Element} */ (e.target);
    close(!!(t && t.closest && t.closest(".splm")));
  }
  /** @param {KeyboardEvent} e */
  function key(e) {
    if (e.key === "Escape") close(false);
    else if ((e.key === "Enter" || e.key === " ") && document.activeElement === box) {
      e.preventDefault();
      close(true);
    }
  }
  // the phone's Back hides it (js/features/overlays.js, LAYERS): then it is closed
  var watch = new MutationObserver(function () {
    if (sp.hidden && !shut) {
      shut = true;
      playing++;
      watch.disconnect();
      sp.removeEventListener("click", tap);
      document.removeEventListener("keydown", key);
      sp.classList.add("done");
      document.documentElement.style.overflow = "";
    } else if (shut) watch.disconnect();
  });
  watch.observe(sp, { attributes: true, attributeFilter: ["hidden"] });
  sp.addEventListener("click", tap);
  document.addEventListener("keydown", key);
  play(sp, box, true, close);
}

/** How long the splash stays on any other opening, from its start (js/splash.js, #spl.brief; Satish, 2026-11-21) */
var BRIEF = 1500;

/**
 * Any opening but the first of the day: the plain splash stays until BRIEF from its start, then fades (#spl.done). It
 * waits for the page too (data-ready), so it never leaves the screen blank; a replay meanwhile (the top bar's picture)
 * takes it over.
 * @param {HTMLElement} sp #spl
 */
function brief(sp) {
  var t0 = Number(sp.getAttribute("data-t0")) || 0;
  var end = function () {
    if (!sp.classList.contains("brief")) return;
    if (!document.documentElement.hasAttribute("data-ready")) return setTimeout(end, 50);
    sp.classList.add("done");
  };
  setTimeout(end, Math.max(0, BRIEF - (performance.now() - t0)));
}

export function init() {
  var found = document.getElementById("spl");
  if (!found) return;
  var sp = /** @type {HTMLElement} */ (found);
  // the top bar's picture plays it again (before: the picture full screen, now on the replay's own picture)
  var bti = document.getElementById("bti");
  if (bti) {
    var b = /** @type {HTMLElement} */ (bti);
    b.setAttribute("aria-haspopup", "dialog");
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      replay(sp, b);
    });
  }
  if (sp.classList.contains("brief")) return brief(sp);
  if (!sp.classList.contains("launch") || sp.classList.contains("skip")) return;
  var boxEl = /** @type {HTMLElement | null} */ (sp.querySelector(".splm"));
  /** It ends: the splash fades (css/02-core.css #spl.done) */
  var end = function () {
    if (sp.classList.contains("stay")) return;
    sp.classList.add("done");
    sp.removeEventListener("click", end);
    document.removeEventListener("keydown", end);
  };
  if (!boxEl) return end();
  // from now on a tap or a key ends it at once (js/splash.js marks one made before the page was ready: .skip)
  sp.addEventListener("click", end);
  document.addEventListener("keydown", end);
  play(sp, /** @type {HTMLElement} */ (boxEl), false, end);
}

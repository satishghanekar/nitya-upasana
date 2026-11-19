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
import { launchDay } from "./vedic-calendar.js";
import { launchSession } from "./today-card.js";

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

export function init() {
  var found = document.getElementById("spl");
  if (!found || !found.classList.contains("launch")) return;
  var sp = /** @type {HTMLElement} */ (found),
    boxEl = /** @type {HTMLElement | null} */ (sp.querySelector(".splm"));
  /** It ends: the splash fades (css/02-core.css #spl.done) */
  var end = function () {
    sp.classList.add("done");
  };
  if (!boxEl) return end();
  var box = /** @type {HTMLElement} */ (boxEl);
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
  skip.textContent = menuWords("launch").skip;
  sp.appendChild(skip);
  // from now on a tap or a key ends it at once (js/splash.js marks one made before the page was ready: .skip)
  sp.addEventListener("click", end);
  document.addEventListener("keydown", end, { once: true });
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
        k.classList.add("on");
      },
      at + i * LINE_STEP,
    );
  });
  var fly = Math.max(FLY_AT - gone, at + kids.length * LINE_STEP + SHOWN_FOR);
  setTimeout(function () {
    if (sp.classList.contains("done") || sp.classList.contains("skip")) return;
    lines.classList.add("out");
    // the picture flies into the top bar's icon (when it is there to fly to), and Home shows under it
    var to = document.querySelector("#bti img"),
      a = box.getBoundingClientRect(),
      b = to ? to.getBoundingClientRect() : null;
    // (an animation, not a changed style: browsers count a moved box as a layout shift, never an animated transform)
    if (b && b.width && a.width)
      box.animate([{ transform: "none" }, { transform: "translate(" + (b.left - a.left) + "px," + (b.top - a.top) + "px) scale(" + b.width / a.width + ")" }], {
        duration: 550,
        easing: "cubic-bezier(0.5, 0, 0.2, 1)",
        fill: "forwards",
      });
    setTimeout(end, 380);
  }, fly);
}

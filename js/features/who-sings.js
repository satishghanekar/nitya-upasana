// @ts-check
// Who sings, in a text marked with it (Satish, 2026-11-24: the bhajans as Jagjit Singh recorded them, the lead and the
// chorus taking turns): each line says whether the lead, the chorus or all together sing it ([lead], [chorus],
// [together] in its file, js/text/format.js; data-who on the line, js/render.js). Under the heading, a switch: Solo (the
// text as one person sings it) or Group (the turns shown, css/04-columns-rail.css), and in the group view the part this
// person sings (their lines in full with a dot, the other part's muted). Both are the person's settings (P.sing,
// P.part), the same for every marked text.
// This part puts them on the page (data-sing, data-part), keeps the buttons pressed as they are (under a text's heading,
// in the pill shown while the page scrolls, #tks, and in the Reading sheet), and gives the CSS the words a screen reader
// hears where each turn starts, in the language and letters the lines are read in (--who-…). Which text is marked is
// js/features/where.js's (data-who-here, as it keeps the pill).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P, change } from "../core/state.js";
import { onPiece, root } from "../core/page.js";
import { menuWords } from "../core/strings.js";
import { ui } from "../core/words.js";

export function init() {
  whoMark();
  onPiece(function (sec) {
    menuWordsIn(sec);
    pressed(sec);
  });
  document.addEventListener("click", function (e) {
    var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest(".sing button[data-sing], .sing button[data-part]"));
    if (!b) return;
    if (b.dataset.sing) {
      if (P.sing !== b.dataset.sing) change({ sing: b.dataset.sing }, whoMark);
    }
    // a part tapped again lets it go: no part, every line in full
    else change({ part: P.part === b.dataset.part ? "" : b.dataset.part }, whoMark);
  });
}

/**
 * The settings on the page and the turns' words for the CSS. Run at start-up, on a tap, and whenever the settings
 * are applied again (js/features/bars.js apply(): another language or script, another person on this phone).
 */
export function whoMark() {
  root.setAttribute("data-sing", P.sing);
  if (P.part) root.setAttribute("data-part", P.part);
  else root.removeAttribute("data-part");
  /** @type {any} */
  var C = /** @type {any} */ (window).CONTENT;
  if (C && C.ui && C.ui.who) {
    // the words of the lines read first (the CSS puts the labels there): the English where it alone shows or leads,
    // else the original's, in its letters' own language (Kannada, Telugu, Gujarati: js/strings/, "text")
    var en = P.lang === "en" || (P.lang === "both" && P.lead === "en");
    root.setAttribute("data-who-first", en ? "en" : "mr");
    var w = en ? C.ui.who.en : (C.text && C.text[P.ind] && C.text[P.ind].who) || C.ui.who.mr;
    /** @param {string} name @param {string} words */
    var put = function (name, words) {
      root.style.setProperty(name, JSON.stringify(words));
    };
    // (the part this person sings is named so: "गायक, माझा भाग: ")
    put("--who-lead", w.lead + (P.part === "lead" ? ", " + w.part : "") + ": ");
    put("--who-chorus", w.chorus + (P.part === "chorus" ? ", " + w.part : "") + ": ");
    put("--who-together", w.together);
  }
  // (the texts', the pill shown while the page scrolls, #tks, and the Reading sheet's, #rsh)
  menuWordsIn(document.body);
  pressed(document.body);
}

/**
 * The switch's words under a text's heading in the menu language, as the pill's (Satish, 2026-11-26): js/render.js
 * writes them in English. Not as the page's own words (fillWords(): a class of the language's code), since a text's
 * .mr / .en rules would hide them inside it (css/02-core.css).
 * @param {HTMLElement} sec
 */
function menuWordsIn(sec) {
  var w = /** @type {Record<string, string>} */ (menuWords("text").who),
    l = ui();
  sec.querySelectorAll(".sing [data-who-word]").forEach(function (e) {
    var k = /** @type {HTMLElement} */ (e).dataset.whoWord || "";
    if (e.textContent !== w[k]) e.textContent = w[k];
    /** @type {HTMLElement} */ (e).lang = l;
  });
}

/** The singing buttons in a part of the page pressed as the settings are @param {HTMLElement} sec */
function pressed(sec) {
  sec.querySelectorAll(".sing button").forEach(function (b) {
    var d = /** @type {HTMLElement} */ (b).dataset;
    b.setAttribute("aria-pressed", String(d.sing ? d.sing === P.sing : d.part === P.part));
  });
}

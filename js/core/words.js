// @ts-check
// Small helpers for writing words on the page, shared by the parts that build their own HTML (the Today card, the
// Vedic calendar, the Library, the routine builder, Add texts, backups, Sankashti). They used to be copied into each
// of those files. No init(): nothing here touches the page, so the unit tests (tests/unit/words.test.mjs) run it in Node.
//
// Two kinds of language are read here, both from the reader's settings (P, js/core/state.js):
// - the menu language (P.ui): what the buttons and messages are written in;
// - the reading languages (P.lead, the first, and P.l2, the second): what the texts and their titles are shown in.
// Marathi can be shown in Kannada letters (Settings → Script); SCR (js/render.js) does that.

import { P } from "./state.js";

/** The months, January first, as the menus write them */
export const MONTHS = {
  mr: ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
/** The weekdays, Sunday first (as Date.getDay() counts them) */
export const DAYS = {
  mr: ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

/** Text made safe to put into HTML, in an element or an attribute @param {string} s */
export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Devanagari digits: 2026 → २०२६ @param {number | string} n */
export function dv(n) {
  return String(n).replace(/[0-9]/g, function (d) {
    return "०१२३४५६७८९"[+d];
  });
}

/** The menu languages there are words for (their codes): js/core/strings.js tells, from js/strings/ */
var MENU = ["en", "mr"];
/** @param {string[]} codes */
export function menuLangs(codes) {
  MENU = codes;
}

/** The menu language: its code, as its file in js/strings/ is named; English when there are no words for it */
export function ui() {
  return P && MENU.indexOf(P.ui) >= 0 ? P.ui : "en";
}

/** Which of a name's two languages (Marathi, English: places, panchang names, titles) the menus show it in: Marathi
 * in Marathi menus, else English @returns {"mr" | "en"} */
export function nameLang() {
  return ui() === "mr" ? "mr" : "en";
}

/** Digits as the menu language writes them @param {number | string} n */
export function num(n) {
  return ui() === "mr" ? dv(n) : String(n);
}

/** The first reading language @returns {"mr" | "en"} */
export function lead() {
  return P && P.lead === "en" ? "en" : "mr";
}

/** The second reading language, or "" when there is none @returns {"mr" | "en" | ""} */
export function second() {
  var s = P && P.l2;
  return (s === "mr" || s === "en") && s !== lead() ? s : "";
}

/** Marathi in the chosen script: as written, or in Kannada letters @param {string} s */
export function scr(s) {
  /** @type {any} */
  var w = typeof window === "undefined" ? {} : window;
  return w.SCR && w.SCR.k ? w.SCR.to(s) : s;
}

/** The script the texts are shown in: "" as written, or "kn" (Kannada letters) */
export function scrKey() {
  /** @type {any} */
  var w = typeof window === "undefined" ? {} : window;
  return (w.SCR && w.SCR.k) || "";
}

/** The lang attribute for Marathi as shown: "mr", or "kn" in Kannada letters */
export function mrLang() {
  return scrKey() || "mr";
}

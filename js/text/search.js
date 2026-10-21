// @ts-check
// Search across the library, in the Library page (#jump): texts by title (Marathi, English, scholarly spelling), id,
// first line and category first, under "Texts" ("रचना"), then every line, original and English, under "Lines"
// ("ओळी"); matches ignore svara marks and punctuation, forgive the spellings people type and a typo, and Devanagari
// typed also finds what is written in English letters. The rules and the ranking are in ./search-core.js
// (unit-tested); this part builds the index from the page and shows the results.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "../core/state.js";
import { ENS, IA } from "./iast.js";
import { jp, unfold } from "../core/apply.js";
import { buildIndex, fold, marks, search } from "./search-core.js";
import { categoryOfSection, textsForSearch } from "../features/library.js";
import { goLine } from "../features/bars.js";
import { jumpTo } from "../features/history.js";
import { ul } from "../features/contents-list.js";

/** @typedef {import("./search-core.js").Index} Index */

/** @type {Index} */
var IX;
/** @type {HTMLInputElement} */
var q;
/** @type {HTMLElement} */
var res;
/** @type {HTMLElement} */
var none;
/** @type {HTMLElement} */
var srs;
/** @type {ReturnType<typeof setTimeout> | 0} */
var qT = 0,
  srsT = 0;

/** @returns {any} SCR (js/render.js): the chosen script */
function scr() {
  return /** @type {any} */ (window).SCR;
}

export function init() {
  buildIX();
  q = /** @type {HTMLInputElement} */ (document.getElementById("q"));
  res = /** @type {HTMLElement} */ (document.getElementById("res"));
  none = /** @type {HTMLElement} */ (document.getElementById("none"));
  srs = /** @type {HTMLElement} */ (document.getElementById("srs"));
  // Keyboard: ↓ / ↑ move through the results, Enter in the box opens the first one
  jp.addEventListener("keydown", function (/** @type {KeyboardEvent} */ e) {
    // results still waiting for the pause in typing are built now, so the key acts on them
    if (qT && (e.key === "ArrowDown" || e.key === "Enter")) {
      clearTimeout(qT);
      find();
    }
    /** @type {HTMLElement[]} */
    var bs = [].slice.call(res.querySelectorAll("button")),
      i = bs.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    if (e.key === "ArrowDown" && bs.length) {
      e.preventDefault();
      bs[Math.min(bs.length - 1, i + 1)].focus();
    } else if (e.key === "ArrowUp" && i >= 0) {
      e.preventDefault();
      (i === 0 ? q : bs[i - 1]).focus();
    } else if (e.key === "Enter" && document.activeElement === q && bs.length) {
      e.preventDefault();
      bs[0].click();
    }
  });
  // The results are built once typing pauses (not on every key), and their number is announced to
  // screen readers a moment later
  q.addEventListener("input", function () {
    clearTimeout(qT);
    qT = setTimeout(find, 120);
  });
}

/**
 * The number found, read out to screen readers: lines (n), and texts (t) when any were found
 * @param {number} n  -1: nothing searched
 * @param {number} t
 * @param {boolean} more
 */
function say(n, t, more) {
  var m = "",
    en = P.ui !== "mr";
  /** @param {number} x */
  var num = function (x) {
    return en ? String(x) : x.toLocaleString("mr-IN");
  };
  if (n === 0 && !t) m = en ? "Nothing found" : "काही सापडले नाही";
  else if (n >= 0) {
    var ln = more || n >= 40 ? (en ? "40 or more" : "४० किंवा अधिक") : num(n);
    m = ln + (en ? (n === 1 ? " result" : " results") : " ओळी सापडल्या");
    if (t)
      m = en
        ? t + (t === 1 ? " text" : " texts") + " and " + ln + (n === 1 ? " line" : " lines")
        : num(t) + " रचना आणि " + ln + " ओळी सापडल्या";
  }
  clearTimeout(srsT);
  srsT = setTimeout(function () {
    srs.textContent = m;
  }, 400);
}

function find() {
  qT = 0;
  var v = q.value;
  res.innerHTML = "";
  none.hidden = true;
  var found = search(IX, v);
  ul.hidden = Array.from(fold(v, scr().from).replace(/ /g, "")).length >= 2;
  if (!ul.hidden) return say(-1, 0, false);
  var n = found.texts.length + found.lines.length;
  say(found.lines.length, found.texts.length, found.more);
  if (!n) {
    none.hidden = false;
    return;
  }
  /**
   * The words that match the search, in bold
   * @param {HTMLElement} el
   * @param {string} txt
   */
  function mk(el, txt) {
    txt.split(/(\s+)/).forEach(function (w) {
      if (w && marks(IX, w, v)) {
        var bb = document.createElement("mark");
        bb.textContent = w;
        el.appendChild(bb);
      } else el.appendChild(document.createTextNode(w));
    });
  }
  /** @param {string} cls @param {string} lang @param {string} txt @param {boolean} marked */
  function span(cls, lang, txt, marked) {
    var s = document.createElement("span");
    s.className = cls;
    s.lang = lang;
    if (marked) mk(s, txt);
    else s.textContent = txt;
    return s;
  }
  // The results follow the language shown on the reading page (P.lang), as the list does; the group names the menus
  var frag = document.createDocumentFragment(),
    L = P.lang === "en" ? "en" : "mr",
    LL = L === "en" ? "en" : scr().k || "mr",
    mrUi = P.ui === "mr";
  /** @param {string} mr @param {string} en */
  function head(mr, en) {
    var li = document.createElement("li"),
      h = document.createElement("h3");
    li.className = "rh";
    h.lang = mrUi ? "mr" : "en";
    h.textContent = mrUi ? mr : en;
    li.appendChild(h);
    frag.appendChild(li);
  }
  // Texts first (by title, id, first line or category), with their category: a tap opens the text
  if (found.texts.length) head("रचना", "Texts");
  found.texts.forEach(function (r) {
    var li = document.createElement("li"),
      b = document.createElement("button"),
      c = categoryOfSection(r.sec);
    li.className = "rt";
    b.type = "button";
    if (c) b.appendChild(span("rs", LL, L === "en" ? c.name.en : scr().to(c.name.mr), false));
    b.appendChild(span("rl", LL, sectionTitle(r.sec, L), true));
    if (P.lang === "both") b.appendChild(span("rl2", "en", sectionTitle(r.sec, "en"), true));
    b.onclick = function () {
      var el = document.getElementById(r.sec);
      unfold(el);
      jumpTo(function () {
        if (el) el.scrollIntoView();
      }, "#" + r.sec);
    };
    li.appendChild(b);
    frag.appendChild(li);
  });
  // Then the lines: a tap opens the text at that line
  if (found.lines.length) head("ओळी", "Lines");
  found.lines.forEach(function (r) {
    var li = document.createElement("li"),
      b = document.createElement("button");
    b.type = "button";
    b.appendChild(span("rs", LL, sectionTitle(r.sec, L), false));
    b.appendChild(span("rl", LL, P.lang === "en" ? r.e : r.m, true));
    if (P.lang === "both") b.appendChild(span("rl2", "en", r.e, true));
    b.onclick = function () {
      jumpTo(function () {
        goLine(r.id, true);
      }, "#" + r.sec);
    };
    li.appendChild(b);
    frag.appendChild(li);
  });
  res.appendChild(frag);
}

/** The index, built again when the script, the English spelling or the categories change */
export function buildIX() {
  /** @type {Record<string, number>} */
  var seen = {};
  /** @type {import("./search-core.js").LineIn[]} */
  var lines = [];
  /** @type {Record<string, string[]>} */
  var first = {};
  var from = scr().from;
  // only the lines in the pieces themselves: not the copies in the print view or the dhrupad bubble
  [].forEach.call(document.querySelectorAll(".ash .mr p[data-l]"), function (/** @type {HTMLElement} */ p) {
    if (p.closest("#pv, .rmkpop")) return;
    var id = p.getAttribute("data-l") || "",
      sec = /** @type {HTMLElement} */ (p.closest(".ash")),
      en = sec.querySelector('.en p[data-l="' + id + '"]'),
      m = txt(p),
      e = en ? txt(en) : "",
      k = sec.id + "|" + fold(m, from);
    if (seen[k]) return;
    seen[k] = 1;
    // the everyday English is searched too while the scholarly one is shown, so "sukhakarta" still finds it
    lines.push({ id: id, sec: sec.id, text: sec.id, m: m, e: e, extra: ENS && ENS[id] && ENS[id] !== e ? ENS[id] : "" });
  });
  // each text's first line: the first line on its page (its dhrupad, when said first)
  [].forEach.call(document.querySelectorAll(".wrap > .ash"), function (/** @type {HTMLElement} */ sec) {
    var m = sec.querySelector(".verse > .mr > p"),
      e = sec.querySelector(".verse > .en > p");
    if (m) first[sec.id] = [txt(m), e ? txt(e) : ""];
  });
  IX = buildIndex({
    texts: textsForSearch().map(function (t) {
      return Object.assign({ first: first[t.sec] || [] }, t);
    }),
    lines: lines,
    roman: IA,
    from: from,
  });
}

/** A line's text as shown, with its line breaks as spaces @param {Element} p */
function txt(p) {
  return p.innerHTML
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/​/g, "");
}

/** A text's title as its heading shows it (script, English style) @param {string} id @param {string} L */
function sectionTitle(id, L) {
  var sec = document.getElementById(id),
    h = sec && sec.querySelector("h2");
  if (!h) return "";
  var s = h.querySelector(L === "en" ? ".en" : ".mr");
  return (s || h).textContent || "";
}

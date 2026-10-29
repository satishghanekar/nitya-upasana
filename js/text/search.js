// @ts-check
// Search across the library, in the Library page (#jump): texts by title (Marathi, English, scholarly spelling), id and
// category first, under "Texts" ("रचना"), then every line, original and English, under "Lines"
// ("ओळी"); matches ignore svara marks and punctuation, forgive the spellings people type and a typo, and Devanagari
// typed also finds what is written in English letters. The rules and the ranking are in ./search-core.js
// (unit-tested); this part builds the index from the texts, as the pieces show them, and shows the results.
// Recent (#rcn) lists the last places the person went to from here (a text, or a line in it; P.rc, per person) while
// the box is empty. The box is at the foot of the page on phones, kept above the keyboard (--kb on #jump).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P, change } from "../core/state.js";
import { IA, englishStyle, titleText } from "./iast.js";
import { numberStanzas } from "./stanza-numbers.js";
import { breakLines } from "./line-breaks.js";
import { pieceEl } from "../core/page.js";
import { jp, unfold } from "../core/apply.js";
import { buildIndex, fold, marks, search } from "./search-core.js";
import { categoryOfSection, textsForSearch } from "../features/library.js";
import { goLine } from "../features/bars.js";
import { jumpTo } from "../features/history.js";
import { ul } from "../features/contents-list.js";

/** @typedef {import("./search-core.js").Index} Index */

/** @type {Index | null} */
var IX = null;
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
  // Recent: drawn each time the Library opens; Clear empties it
  new MutationObserver(function () {
    if (!jp.hidden) rcShow();
  }).observe(jp, { attributes: true, attributeFilter: ["hidden"] });
  /** @type {HTMLElement} */ (document.getElementById("rcc")).onclick = function () {
    change({ rc: [] });
    rcShow();
    q.focus();
  };
  // The phone's keyboard covers the foot of the page, where the box is: the Library is lifted by its height
  var vv = window.visualViewport;
  if (vv) {
    var v = vv,
      kb = function () {
        // On an iPhone the keyboard also slides what is on screen up (offsetTop), so the box above it stays in view:
        // the Library goes down by as much (--vvt) and keeps room for the whole keyboard, so its top, with the best
        // results, is still under the top bar, not slid out of view above the screen (Satish, 2026-10-29)
        var o = Math.max(0, Math.round(v.offsetTop));
        jp.style.setProperty("--kb", Math.max(0, Math.round(innerHeight - v.height - v.offsetTop) + o) + "px");
        jp.style.setProperty("--vvt", o + "px");
      };
    v.addEventListener("resize", kb);
    v.addEventListener("scroll", kb);
  }
}

/** Open a text at its top @param {string} sec */
function openText(sec) {
  var el = pieceEl(sec);
  unfold(el);
  jumpTo(function () {
    if (el) el.scrollIntoView();
  }, "#" + sec);
}

/** Open a text at one of its lines @param {string} sec @param {string} id */
function openLine(sec, id) {
  jumpTo(function () {
    goLine(id, true);
  }, "#" + sec);
}

// ---- Recent ----
var RC_MAX = 8;

/** Remember a place, first in Recent: a text, or a line in it @param {string} sec @param {string} id */
function remember(sec, id) {
  var k = id ? sec + "|" + id : sec;
  change({
    rc: [k].concat((P.rc || []).filter(function (/** @type {string} */ x) { return x !== k; })).slice(0, RC_MAX),
  });
}

/** Recent, while nothing is searched: each place as a search result shows it, with × to take it away */
export function rcShow() {
  var box = /** @type {HTMLElement} */ (document.getElementById("rcn")),
    list = /** @type {HTMLElement} */ (document.getElementById("rcl"));
  if (!box || !list) return;
  list.innerHTML = "";
  var L = P.lang === "en" ? "en" : "mr",
    LL = L === "en" ? "en" : scr().k || "mr",
    mrUi = P.ui === "mr",
    n = 0;
  (P.rc || []).forEach(function (/** @type {string} */ k) {
    var p = k.split("|"),
      sec = p[0],
      id = p[1] || "",
      el = pieceEl(sec);
    if (!el) return; // a text no longer in the Library
    /** @param {string} l */
    var line = function (l) {
      var x = el && el.querySelector('.verse > .' + l + ' > p[data-l="' + id + '"]');
      return x ? txt(x) : "";
    };
    if (id && !line("mr")) return; // a line no longer in the text
    var li = document.createElement("li"),
      b = document.createElement("button"),
      x = document.createElement("button"),
      c = categoryOfSection(sec);
    b.type = x.type = "button";
    b.className = "rcg";
    if (id) {
      li.className = "rln";
      b.appendChild(span("rs", LL, sectionTitle(sec, L)));
      b.appendChild(span("rl", LL, line(L)));
      if (P.lang === "both") b.appendChild(span("rl2", "en", line("en")));
    } else {
      li.className = "rt";
      if (c) b.appendChild(span("rs", LL, L === "en" ? c.name.en : scr().to(c.name.mr)));
      b.appendChild(span("rl", LL, sectionTitle(sec, L)));
      if (P.lang === "both") b.appendChild(span("rl2", "en", sectionTitle(sec, "en")));
    }
    b.onclick = function () {
      remember(sec, id);
      if (id) openLine(sec, id);
      else openText(sec);
    };
    x.className = "rcx";
    x.textContent = "×";
    x.setAttribute("aria-label", (mrUi ? "काढा: " : "Remove: ") + (b.textContent || ""));
    x.onclick = function () {
      change({ rc: (P.rc || []).filter(function (/** @type {string} */ y) { return y !== k; }) });
      rcShow();
    };
    li.appendChild(b);
    li.appendChild(x);
    list.appendChild(li);
    n++;
  });
  // only while the whole list shows (nothing searched)
  box.hidden = !n || ul.hidden;

  /** @param {string} cls @param {string} lang @param {string} t */
  function span(cls, lang, t) {
    var s = document.createElement("span");
    s.className = cls;
    s.lang = lang;
    s.textContent = t;
    return s;
  }
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
  var found = search(ix(), v);
  ul.hidden = Array.from(fold(v, scr().from).replace(/ /g, "")).length >= 2;
  rcShow();
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
      if (w && marks(ix(), w, v)) {
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
  // Texts first (by title, id or category), with their category: a tap opens the text
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
      remember(r.sec, "");
      openText(r.sec);
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
      remember(r.sec, r.id);
      openLine(r.sec, r.id);
    };
    li.appendChild(b);
    frag.appendChild(li);
  });
  res.appendChild(frag);
  // each new search shows its best results first: the list from its top (on phones it scrolls in .libsc)
  jp.scrollTop = 0;
  /** @type {HTMLElement} */ (jp.querySelector(".libsc")).scrollTop = 0;
}

/** The index, built again when the script, the English spelling or the categories change: on the next search */
export function buildIX() {
  IX = null;
}

/**
 * The index, built the first time it is needed, from every piece as the reading page shows it (only the pieces opened
 * so far are on the page, js/core/page.js): a copy of them, out of the page, in the chosen script and English
 * style, with their stanza numbers and line breaks
 * @returns {Index}
 */
function ix() {
  if (IX) return IX;
  /** @type {any} */
  var w = window,
    C = w.CONTENT,
    all = document.createElement("div");
  all.innerHTML = C
    ? C.categories
        .map(function (/** @type {any} */ g) {
          return g.pieces
            .map(function (/** @type {any} */ p) {
              return w.renderPiece(p, C);
            })
            .join("");
        })
        .join("")
    : "";
  /** @type {HTMLElement[]} */
  var secs = [].slice.call(all.children);
  secs.forEach(function (s) {
    w.SCR.el(s);
  });
  // the everyday English is searched too while the scholarly one is shown, so "sukhakarta" still finds it
  /** @type {Record<string, string>} */
  var ens = {};
  [].forEach.call(all.querySelectorAll(".verse > .en > p[data-l]"), function (/** @type {HTMLElement} */ p) {
    ens[p.getAttribute("data-l") || ""] = p.textContent || "";
  });
  englishStyle(all);
  numberStanzas(all);
  breakLines(all);
  /** @type {Record<string, number>} */
  var seen = {};
  /** @type {import("./search-core.js").LineIn[]} */
  var lines = [];
  var from = scr().from;
  [].forEach.call(all.querySelectorAll(".ash .mr p[data-l]"), function (/** @type {HTMLElement} */ p) {
    var id = p.getAttribute("data-l") || "",
      sec = /** @type {HTMLElement} */ (p.closest(".ash")),
      en = sec.querySelector('.en p[data-l="' + id + '"]'),
      m = txt(p),
      e = en ? txt(en) : "",
      k = sec.id + "|" + fold(m, from);
    if (seen[k]) return;
    seen[k] = 1;
    lines.push({ id: id, sec: sec.id, text: sec.id, m: m, e: e, extra: ens[id] && ens[id] !== e ? ens[id] : "" });
  });
  IX = buildIndex({
    texts: textsForSearch(),
    lines: lines,
    roman: IA,
    from: from,
  });
  return IX;
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
  return titleText(id, L === "en");
}

// Search across the library: texts by title (Marathi, English, scholarly spelling), id, first line and category
// first, then every line, original and English; matches ignore svara marks and punctuation, forgive the spellings
// people type and a typo. The rules and the ranking are in ./search-core.js (unit-tested); this part builds the index
// from the page and shows the results.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "../core/state.js";
import { ENS, IA } from "./iast.js";
import { jp, pjOpen } from "../core/apply.js";
import { buildIndex, fold, marks, search } from "./search-core.js";
import { categoryOfSection, textsForSearch } from "../features/library.js";
import { goLine } from "../features/bars.js";
import { jumpTo } from "../features/history.js";
import { ul } from "../features/contents-list.js";

var IX, q, res, none, srs, qT, srsT;

export function init() {
  IX = [];
  buildIX();
  q = document.getElementById("q");
  res = document.getElementById("res");
  none = document.getElementById("none");
  srs = document.getElementById("srs");
  qT = srsT = 0;
  // Keyboard: ↓ / ↑ move through the results, Enter in the box opens the first one
  jp.addEventListener("keydown", function (e) {
    // results still waiting for the pause in typing are built now, so the key acts on them
    if (qT && (e.key === "ArrowDown" || e.key === "Enter")) {
      clearTimeout(qT);
      find();
    }
    var bs = [].slice.call(res.querySelectorAll("button")),
      i = bs.indexOf(document.activeElement);
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

// The number found, read out to screen readers: lines (n), and texts (t) when any were found
function say(n, t, more) {
  var m = "",
    en = P.ui === "en";
  if (n === 0 && !t) m = en ? "Nothing found" : "काही सापडले नाही";
  else if (n >= 0) {
    var ln = more || n >= 40 ? (en ? "40 or more" : "४० किंवा अधिक") : en ? String(n) : n.toLocaleString("mr-IN");
    m = ln + (en ? (n === 1 ? " result" : " results") : " ओळी सापडल्या");
    if (t)
      m = en
        ? t + (t === 1 ? " text" : " texts") + " and " + ln + (n === 1 ? " line" : " lines")
        : t.toLocaleString("mr-IN") + " रचना आणि " + ln + " ओळी सापडल्या";
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
  ul.hidden = Array.from(fold(v, SCR.from).replace(/ /g, "")).length >= 2;
  if (!ul.hidden) return say(-1, 0, false);
  var n = found.texts.length + found.lines.length;
  say(found.lines.length, found.texts.length, found.more);
  if (!n) {
    none.hidden = false;
    return;
  }
  // Show the words that match the search in bold
  function mk(el, txt) {
    txt.split(/(\s+)/).forEach(function (w) {
      if (w && marks(IX, w, v)) {
        var bb = document.createElement("mark");
        bb.textContent = w;
        el.appendChild(bb);
      } else el.appendChild(document.createTextNode(w));
    });
  }
  function span(cls, lang, txt, marked) {
    var s = document.createElement("span");
    s.className = cls;
    s.lang = lang;
    if (marked) mk(s, txt);
    else s.textContent = txt;
    return s;
  }
  var frag = document.createDocumentFragment(),
    L = P.lang === "en" ? "en" : "mr",
    ui = P.ui === "mr";
  function head(mr, en) {
    var li = document.createElement("li");
    li.className = "rh";
    li.lang = ui ? "mr" : "en";
    li.textContent = ui ? mr : en;
    frag.appendChild(li);
  }
  // Texts first (by title, id, first line or category): a tap opens the text
  if (found.texts.length && found.lines.length) head("रचना", "Texts");
  found.texts.forEach(function (r) {
    var li = document.createElement("li"),
      b = document.createElement("button"),
      c = categoryOfSection(r.sec);
    li.className = "rt";
    b.type = "button";
    b.appendChild(span("rs", L, c ? (L === "en" ? c.name.en : SCR.to(c.name.mr)) : "", false));
    b.appendChild(span("rl", L, sectionTitle(r.sec, L), true));
    if (P.lang === "both") b.appendChild(span("rl2", "en", sectionTitle(r.sec, "en"), true));
    b.onclick = function () {
      var el = document.getElementById(r.sec);
      pjOpen(el);
      jumpTo(function () {
        if (el) el.scrollIntoView();
      }, "#" + r.sec);
    };
    li.appendChild(b);
    frag.appendChild(li);
  });
  // Then the lines: a tap opens the text at that line
  if (found.texts.length && found.lines.length) head("ओळी", "Lines");
  found.lines.forEach(function (r) {
    var li = document.createElement("li"),
      b = document.createElement("button");
    b.type = "button";
    b.appendChild(span("rs", L, sectionTitle(r.sec, L), false));
    b.appendChild(span("rl", L, P.lang === "en" ? r.e : r.m, true));
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

export function buildIX() {
  var seen = {},
    lines = [],
    first = {};
  // only the lines in the pieces themselves: not the copies in the print view or the dhrupad bubble
  [].forEach.call(document.querySelectorAll(".ash .mr p[data-l]"), function (p) {
    if (p.closest("#pv, .rmkpop")) return;
    var id = p.getAttribute("data-l"),
      sec = p.closest(".ash"),
      en = sec.querySelector('.en p[data-l="' + id + '"]'),
      m = txt(p),
      e = en ? txt(en) : "",
      k = sec.id + "|" + fold(m, SCR.from);
    if (seen[k]) return;
    seen[k] = 1;
    // the everyday English is searched too while the scholarly one is shown, so "sukhakarta" still finds it
    lines.push({ id: id, sec: sec.id, text: sec.id, m: m, e: e, extra: ENS && ENS[id] && ENS[id] !== e ? ENS[id] : "" });
  });
  // each text's first line: the first line on its page (its dhrupad, when said first)
  [].forEach.call(document.querySelectorAll(".wrap > .ash"), function (sec) {
    var m = sec.querySelector(".verse > .mr > p"),
      e = sec.querySelector(".verse > .en > p");
    if (m) first[sec.id] = [txt(m), e ? txt(e) : ""];
  });
  IX = buildIndex({
    texts: textsForSearch().map(function (t) {
      t.first = first[t.sec] || [];
      return t;
    }),
    lines: lines,
    roman: IA,
    from: SCR.from,
  });
}

// A line's text as shown, with its line breaks as spaces
function txt(p) {
  return p.innerHTML
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\u200b/g, "");
}

function sectionTitle(id, L) {
  var h = document.getElementById(id).querySelector("h2"),
    s = h.querySelector(L === "en" ? ".en" : ".mr");
  return (s || h).textContent;
}

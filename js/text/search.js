// Search: every Marathi line with its English line; matches ignore svara marks and punctuation
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "../core/state.js";
import { ENS } from "./iast.js";
import { jp } from "../core/apply.js";
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

function say(n) {
  var m = "",
    en = P.ui === "en";
  if (n === 0) m = en ? "Nothing found" : "काही सापडले नाही";
  else if (n > 0) {
    m = n >= 40 ? (en ? "40 or more" : "४० किंवा अधिक") : en ? String(n) : n.toLocaleString("mr-IN");
    m += en ? (n === 1 ? " result" : " results") : " ओळी सापडल्या";
  }
  clearTimeout(srsT);
  srsT = setTimeout(function () {
    srs.textContent = m;
  }, 400);
}

function find() {
  qT = 0;
  var v = nz(q.value);
  res.innerHTML = "";
  none.hidden = true;
  ul.hidden = v.length >= 2;
  if (v.length < 2) return say(-1);
  var tk = v.split(" "),
    lk = tk.map(lz),
    out = [];
  function has(t, ks) {
    for (var j = 0; j < ks.length; j++) if (t.indexOf(ks[j]) < 0) return false;
    return true;
  }
  // Exact matches first, then the forgiving ones
  for (var i = 0; i < IX.length && out.length < 40; i++) if (has(IX[i].t, tk)) out.push(IX[i]);
  for (i = 0; i < IX.length && out.length < 40; i++) if (out.indexOf(IX[i]) < 0 && has(IX[i].l, lk)) out.push(IX[i]);
  say(out.length);
  if (!out.length) {
    none.hidden = false;
    return;
  }
  // Show the line with the words that match the search in bold
  function mk(el, txt) {
    txt.split(/(\s+)/).forEach(function (w) {
      var n = nz(w),
        hit =
          n &&
          tk.some(function (k, j) {
            return k.length > 1 && (n.indexOf(k) >= 0 || lz(n).indexOf(lk[j]) >= 0);
          });
      if (hit) {
        var bb = document.createElement("mark");
        bb.textContent = w;
        el.appendChild(bb);
      } else el.appendChild(document.createTextNode(w));
    });
  }
  var frag = document.createDocumentFragment();
  out.forEach(function (r) {
    var li = document.createElement("li"),
      b = document.createElement("button");
    b.type = "button";
    var s1 = document.createElement("span");
    s1.className = "rs";
    s1.lang = P.lang === "en" ? "en" : "mr";
    s1.textContent = sectionTitle(r.sec);
    var s2 = document.createElement("span");
    s2.className = "rl";
    s2.lang = P.lang === "en" ? "en" : "mr";
    mk(s2, P.lang === "en" ? r.e : r.m);
    b.appendChild(s1);
    b.appendChild(s2);
    if (P.lang === "both") {
      var s3 = document.createElement("span");
      s3.className = "rl2";
      s3.lang = "en";
      mk(s3, r.e);
      b.appendChild(s3);
    }
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

function nz(s) {
  return SCR.from(s) // Kannada letters, in the text or typed, match as the Devanagari they come from
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // IAST letters match plain ones: ā → a, ṣ → s
    .replace(/[\u200b\u200c\u200d\u0951\u0952\u1CDA]/g, "")
    .replace(/[।॥|,.\-]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Forgiving form of English letters, so spellings people type still match: double letters count once
// (vitthal = vithal), ee = i, oo = u, and the short "a" between consonants or at a word's end is ignored
// (ganapati = ganpati, sukhakarta = sukhkarta, jagadish = jagdish). Marathi letters are left alone.
function lz(s) {
  return s
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/([bcdfghjklmnpqrstvwxyz])a(?=[bcdfghjklmnpqrstvwxyz])/g, "$1")
    .replace(/([bcdfghjklmnpqrstvwxyz])a\b/g, "$1");
}

export function buildIX() {
  var seen = {};
  IX = [];
  // only the lines in the pieces themselves: not the copies in the print view or the dhrupad bubble
  [].forEach.call(document.querySelectorAll(".ash .mr p[data-l]"), function (p) {
    if (p.closest("#pv, .rmkpop")) return;
    var id = p.getAttribute("data-l"),
      sec = p.closest(".ash"),
      en = sec.querySelector('.en p[data-l="' + id + '"]'),
      m = p.innerHTML
        .replace(/<br\s*\/?>/g, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&"),
      e = en
        ? en.innerHTML
            .replace(/<br\s*\/?>/g, " ")
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
        : "",
      k = sec.id + "|" + nz(m);
    if (ENS[id]) e += " \u0000" + ENS[id];
    if (seen[k]) return;
    seen[k] = 1;
    IX.push({ id: id, sec: sec.id, m: m, e: e.split(" \u0000")[0], t: nz(m) + " " + nz(e), l: lz(nz(e)) });
  });
}

function sectionTitle(id) {
  var h = document.getElementById(id).querySelector("h2"),
    s = h.querySelector(P.lang === "en" ? ".en" : ".mr");
  return (s || h).textContent;
}

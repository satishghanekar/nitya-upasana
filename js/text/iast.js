// IAST transliteration (Devanagari → Latin with diacritics, Vedic accents as marks)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "../core/state.js";
import { enCut, glue, zsplit } from "./line-breaks.js";
import { onPiece } from "../core/page.js";

var TRL, TRT;

// Devanagari (or Kannada letters, through SCR) → IAST. Pure: reads only its argument, so tests/unit can check it.
export var IA = (function () {
  var C = {
    क: "k",
    ख: "kh",
    ग: "g",
    घ: "gh",
    ङ: "ṅ",
    च: "c",
    छ: "ch",
    ज: "j",
    झ: "jh",
    ञ: "ñ",
    ट: "ṭ",
    ठ: "ṭh",
    ड: "ḍ",
    ढ: "ḍh",
    ण: "ṇ",
    त: "t",
    थ: "th",
    द: "d",
    ध: "dh",
    न: "n",
    प: "p",
    फ: "ph",
    ब: "b",
    भ: "bh",
    म: "m",
    य: "y",
    र: "r",
    ल: "l",
    ळ: "ḷ",
    व: "v",
    श: "ś",
    ष: "ṣ",
    स: "s",
    ह: "h",
  };
  var NK = { ड: "ṛ", ढ: "ṛh", क: "q", ख: "x", ग: "ġ", ज: "z", फ: "f" }; // with nukta (Hindi)
  var V = { अ: "a", आ: "ā", इ: "i", ई: "ī", उ: "u", ऊ: "ū", ऋ: "ṛ", ॠ: "ṝ", ऌ: "ḷ", ए: "e", ऐ: "ai", ओ: "o", औ: "au" };
  var M = { "ा": "ā", "ि": "i", "ी": "ī", "ु": "u", "ू": "ū", "ृ": "ṛ", "ॄ": "ṝ", "ॢ": "ḷ", "ॣ": "ḹ", "े": "e", "ै": "ai", "ो": "o", "ौ": "au" };
  var S = { "॑": "̍", "॒": "̱", "᳚": "̎" }; // svarita, anudatta, dirgha svarita
  var O = { ॐ: "om̐", ऽ: "'", "।": "|", "॥": "||" };
  return function (t) {
    t = SCR.from(t); // from Kannada letters back to the Devanagari the rules below read
    var o = "",
      i = 0,
      n = t.length,
      c,
      v;
    while (i < n) {
      c = t[i];
      v = null;
      if (C[c]) {
        var k = C[c];
        i++;
        if (t[i] === "़") {
          k = NK[c] || k;
          i++;
        }
        // a zero-width joiner or non-joiner before a vowel sign or virama (श‍ृ, a font hint) changes nothing
        if ((t[i] === "\u200d" || t[i] === "\u200c") && (M[t[i + 1]] || t[i + 1] === "्")) i++;
        if (t[i] === "्") {
          o += k;
          i++;
          continue;
        }
        if (M[t[i]]) v = M[t[i++]];
        else v = "a";
        o += k;
      } else if (V[c]) {
        v = V[c];
        i++;
      } else if (O[c]) {
        o += O[c];
        i++;
        continue;
      } else if (c >= "०" && c <= "९") {
        o += c.charCodeAt(0) - 0x966;
        i++;
        continue;
      } else {
        // a stray mark attaches to what came before; anything else passes through
        o += S[c] || (c === "ं" ? "ṃ" : c === "ः" ? "ḥ" : c === "ँ" ? "m̐" : c);
        i++;
        continue;
      }
      // the syllable's accent marks go on its vowel, then any anusvara / visarga / chandrabindu
      var acc = "",
        tail = "";
      while (i < n && (S[t[i]] || t[i] === "ं" || t[i] === "ः" || t[i] === "ँ")) {
        c = t[i++];
        if (S[c]) acc += S[c];
        else tail += c === "ं" ? "ṃ" : c === "ः" ? "ḥ" : "m̐";
      }
      o += v + acc + tail;
    }
    // An anusvara inside a word before a stop takes that stop's nasal: sarvāṅgī, sundara, vakratuṇḍa, lambodara.
    // Marathi plural endings keep ṃ: sumanāṃcyā, ḍoḷyāṃnī, kleśāṃpāsuni; so do nasal vowels: kaiṃcā, bāṃjhana.
    return o.replace(/(ā?)ṃ(?=(k|g)|(c|j)|(ṭ|ḍ)|(t|d|n)|(p|b|m))/g, function (x, l, a, b, c, d, e, i) {
      var r = o.slice(i + x.length);
      if (l && /^(c(?!h)|n|pās|jh)/.test(r)) return x;
      if (o.slice(i - 2, i) === "ai" && /^c/.test(r)) return x;
      return l + (a ? "ṅ" : b ? "ñ" : c ? "ṇ" : d ? "n" : "m");
    });
  };
})();

export function init() {
  // English style. Each English line keeps its everyday text and its Marathi/Sanskrit source (taken when its piece is
  // built, before anything else touches the lines), so the style switches in place without reloading (trSet). The
  // scholarly (IAST) text is made the first time it is needed.
  TRL = [];
  // Piece titles, from the texts: headings, Previous/Next, the Library's list and the side menu
  TRT = {};
  /** @type {any} */
  var C = /** @type {any} */ (window).CONTENT;
  if (C)
    C.categories.forEach(function (c) {
      c.pieces.forEach(function (p) {
        TRT[p.id] = { id: p.id, s: plain(p.title.en), m: plain(p.title.mr), i: null };
      });
    });
  onPiece(function (sec) {
    var ia = P.tr === "iast";
    [].forEach.call(sec.querySelectorAll(".verse"), function (v) {
      // Marathi and English lines pair up by position (refrain boxes have no data-l)
      var ms = v.querySelectorAll(":scope>.mr>p");
      [].forEach.call(v.querySelectorAll(":scope>.en>p"), function (p, i) {
        var m = ms[i];
        if (!m) return;
        var x = { p: p, s: p.innerHTML, m: m.innerHTML, i: null };
        TRL.push(x);
        if (ia) line(x, true);
      });
    });
    titlesIn(sec, ia);
  });
  // the titles already on the page (the Library's list, built before this) in the chosen style
  titlesSet();
}

// A title's text (the texts write them as HTML)
function plain(h) {
  var d = document.createElement("div");
  d.innerHTML = h;
  return d.textContent;
}

// One English line in the chosen style
function line(x, ia) {
  if (ia && x.i === null)
    x.i = x.m
      .split(/<br\s*\/?>/)
      .map(IA)
      .join("<br>");
  x.p.innerHTML = ia ? x.i : x.s;
  x.p.classList.toggle("ia", ia);
}

// fin: the stanza numbers and line-break parts are already in place, so carry them over
export function trSet(st, fin) {
  var ia = st === "iast";
  TRL.forEach(function (x) {
    var p = x.p,
      sn = fin && p.querySelector(".sn");
    line(x, ia);
    if (sn) p.appendChild(sn);
    if (fin) zsplit(p, enCut, "");
    if (fin && p.closest(".ash.prose")) glue(p);
  });
  titlesSet(ia);
}

// A printout's copy of the pieces (js/print/compose.js), built after the page, in the English style chosen: the
// same as init() and trSet() do to the page's own lines and headings (before stanza numbers and line breaks)
export function englishStyle(/** @type {ParentNode} */ r) {
  if (P.tr !== "iast") return;
  [].forEach.call(r.querySelectorAll(".verse"), function (v) {
    var ms = v.querySelectorAll(":scope>.mr>p");
    [].forEach.call(v.querySelectorAll(":scope>.en>p"), function (p, i) {
      var m = ms[i];
      if (!m) return;
      p.innerHTML = m.innerHTML
        .split(/<br\s*\/?>/)
        .map(IA)
        .join("<br>");
      p.classList.add("ia");
    });
  });
  [].forEach.call(r.querySelectorAll(".ash"), function (sec) {
    var h = sec.querySelector("header h2"),
      m = h && h.querySelector(":scope > .mr"),
      e = h && h.querySelector(":scope > .en");
    if (m && e)
      e.textContent = IA(m.textContent).replace(/(^|[\s(])([^\s(])/g, function (x, a, c) {
        return a + c.toUpperCase();
      });
  });
}

// Piece titles in the chosen English style: headings, contents, Previous/Next, and the left menu and search list
// (copies of the contents). Called again when the contents lists are built anew (js/features/library.js).
export function titlesSet(ia) {
  if (!TRT) return;
  if (ia === undefined) ia = P.tr === "iast";
  titlesIn(document, ia);
}

// The titles inside r (the page, or a piece just built): its heading and its links to other pieces
function titlesIn(r, ia) {
  [].forEach.call(r.querySelectorAll(".ash header h2 > .en, a[data-go] .en"), function (e) {
    var a = e.closest("a[data-go], .ash"),
      t = a && TRT[a.getAttribute("data-go") || a.id];
    // not the language tag in the home list
    if (t && !e.closest("small, .lt")) e.textContent = enTitle(t, ia);
  });
}

function enTitle(t, ia) {
  if (ia && t.i === null)
    t.i = IA(t.m).replace(/(^|[\s(])([^\s(])/g, function (x, a, c) {
      return a + c.toUpperCase();
    });
  return ia ? t.i : t.s;
}

// A piece's title as its heading shows it, built or not: in English (en) in the chosen style, else in the chosen
// script (js/text/search.js)
export function titleText(id, en) {
  var t = TRT && TRT[id];
  return !t ? "" : en ? enTitle(t, P.tr === "iast") : SCR.to(t.m);
}

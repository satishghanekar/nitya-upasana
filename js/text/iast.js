// @ts-check
// IAST transliteration (Devanagari → Latin with diacritics, Vedic accents as marks)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "../core/state.js";
import { enCut, glue, shortRef, zsplit } from "./line-breaks.js";
import { onPiece } from "../core/page.js";

/** @typedef {{ p: HTMLElement, s: string, m: string, i: string | null }} Line  an English line: everyday, source, IAST */
/** @typedef {{ id: string, s: string, m: string, i: string | null }} Title  a piece's title: everyday, Marathi, IAST */
/** @type {Line[]} */
var TRL;
/** @type {Record<string, Title>} */
var TRT;

// Devanagari (or Kannada letters, through SCR) → IAST. Pure: reads only its argument, so tests/unit can check it.
export var IA = (function () {
  /** @type {Record<string, string>} */
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
  /** @type {Record<string, string>} */
  var NK = { ड: "ṛ", ढ: "ṛh", क: "q", ख: "x", ग: "ġ", ज: "z", फ: "f" }; // with nukta (Hindi)
  /** @type {Record<string, string>} */
  var V = { अ: "a", आ: "ā", इ: "i", ई: "ī", उ: "u", ऊ: "ū", ऋ: "ṛ", ॠ: "ṝ", ऌ: "ḷ", ए: "e", ऐ: "ai", ओ: "o", औ: "au" };
  /** @type {Record<string, string>} */
  var M = { "ा": "ā", "ि": "i", "ी": "ī", "ु": "u", "ू": "ū", "ृ": "ṛ", "ॄ": "ṝ", "ॢ": "ḷ", "ॣ": "ḹ", "े": "e", "ै": "ai", "ो": "o", "ौ": "au" };
  /** @type {Record<string, string>} */
  var S = { "॑": "̍", "॒": "̱", "᳚": "̎" }; // svarita, anudatta, dirgha svarita
  /** @type {Record<string, string>} */
  var O = { ॐ: "om̐", ऽ: "'", "।": "|", "॥": "||" };
  return function (/** @type {string} */ t) {
    t = /** @type {any} */ (globalThis).SCR.from(t); // from Kannada letters back to the Devanagari the rules below read
    // the Vedic anusvara written as one sign (ꣳ, as in the Shri Sukta's ईश्वरीꣳ) is the ग्ं written elsewhere: gṃ
    t = t.replace(/\uA8F3/g, "ग्ं");
    var o = "",
      i = 0,
      n = t.length,
      /** @type {string} */
      c,
      /** @type {string | null} */
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
        o += String(c.charCodeAt(0) - 0x966);
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
    return o.replace(
      /(ā?)ṃ(?=(k|g)|(c|j)|(ṭ|ḍ)|(t|d|n)|(p|b|m))/g,
      /** @param {string} x @param {string} l @param {string} a @param {string} b @param {string} c @param {string} d
       * @param {string} e @param {number} i */
      function (x, l, a, b, c, d, e, i) {
        var r = o.slice(i + x.length);
        if (l && /^(c(?!h)|n|pās|jh)/.test(r)) return x;
        if (o.slice(i - 2, i) === "ai" && /^c/.test(r)) return x;
        return l + (a ? "ṅ" : b ? "ñ" : c ? "ṇ" : d ? "n" : "m");
      },
    );
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
    C.categories.forEach(function (/** @type {any} */ c) {
      c.pieces.forEach(function (/** @type {any} */ p) {
        TRT[p.id] = { id: p.id, s: plain(p.title.en), m: plain(p.title.mr), i: null };
      });
    });
  onPiece(function (sec) {
    var ia = P.tr === "iast";
    sec.querySelectorAll(".verse").forEach(function (v) {
      // Marathi and English lines pair up by position (refrain boxes have no data-l)
      var ms = v.querySelectorAll(":scope>.mr>p");
      /** @type {NodeListOf<HTMLElement>} */ (v.querySelectorAll(":scope>.en>p")).forEach(function (p, i) {
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
/** @param {string} h */
function plain(h) {
  var d = document.createElement("div");
  d.innerHTML = h;
  return d.textContent || "";
}

// One English line in the chosen style
/** @param {Line} x @param {boolean} ia */
function line(x, ia) {
  if (ia && x.i === null)
    x.i = x.m
      .split(/<br\s*\/?>/)
      .map(IA)
      .join("<br>");
  x.p.innerHTML = ia ? x.i || "" : x.s;
  x.p.classList.toggle("ia", ia);
}

// fin: the stanza numbers and line-break parts are already in place, so carry them over
/** @param {string} st @param {boolean} [fin] */
export function trSet(st, fin) {
  var ia = st === "iast";
  TRL.forEach(function (x) {
    var p = x.p,
      sn = fin && p.querySelector(".sn");
    line(x, ia);
    if (sn) p.appendChild(sn);
    if (fin) zsplit(p, enCut, "");
    if (fin && p.closest(".ash.prose")) glue(p);
    if (fin && p.closest(".ash.lines")) shortRef(p);
  });
  titlesSet(ia);
}

// A printout's copy of the pieces (js/print/compose.js), built after the page, in the English style chosen: the
// same as init() and trSet() do to the page's own lines and headings (before stanza numbers and line breaks)
export function englishStyle(/** @type {ParentNode} */ r) {
  if (P.tr !== "iast") return;
  r.querySelectorAll(".verse").forEach(function (v) {
    var ms = v.querySelectorAll(":scope>.mr>p");
    v.querySelectorAll(":scope>.en>p").forEach(function (p, i) {
      var m = ms[i];
      if (!m) return;
      p.innerHTML = m.innerHTML
        .split(/<br\s*\/?>/)
        .map(IA)
        .join("<br>");
      p.classList.add("ia");
    });
  });
  r.querySelectorAll(".ash").forEach(function (sec) {
    var h = sec.querySelector("header h2"),
      m = h && h.querySelector(":scope > .mr"),
      e = h && h.querySelector(":scope > .en");
    if (m && e) e.textContent = iaTitle(m.textContent || "");
  });
}

// Piece titles in the chosen English style: headings, contents, Previous/Next, and the left menu and search list
// (copies of the contents). Called again when the contents lists are built anew (js/features/library.js).
/** @param {boolean} [ia] */
export function titlesSet(ia) {
  if (!TRT) return;
  if (ia === undefined) ia = P.tr === "iast";
  titlesIn(document, ia);
}

// The titles inside r (the page, or a piece just built): its heading and its links to other pieces
/** @param {ParentNode} r @param {boolean} ia */
function titlesIn(r, ia) {
  r.querySelectorAll(".ash header h2 > .en, a[data-go] .en").forEach(function (e) {
    var a = e.closest("a[data-go], .ash"),
      t = a && TRT[a.getAttribute("data-go") || a.id];
    // not the language tag in the home list
    if (t && !e.closest("small, .lt")) e.textContent = enTitle(t, ia);
  });
}

/** @param {Title} t @param {boolean} ia @returns {string} */
function enTitle(t, ia) {
  if (ia && t.i === null) t.i = iaTitle(t.m);
  return ia ? t.i || "" : t.s;
}

/** A title in scholarly English (IAST), each word capitalised as a title: गणपत्यथर्वशीर्ष → Gaṇapatyatharvaśīrṣa
 * @param {string} s the title as written (Devanagari) */
export function iaTitle(s) {
  return IA(s).replace(/(^|[\s(])([^\s(])/g, function (/** @type {string} */ x, /** @type {string} */ a, /** @type {string} */ c) {
    return a + c.toUpperCase();
  });
}

// A piece's title as its heading shows it, built or not: in English (en) in the chosen style, else in the chosen
// script (js/text/search.js)
/** @param {string} id @param {boolean} [en] */
export function titleText(id, en) {
  var t = TRT && TRT[id];
  return !t ? "" : en ? enTitle(t, P.tr === "iast") : /** @type {any} */ (globalThis).SCR.to(t.m);
}

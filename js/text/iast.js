// IAST transliteration (Devanagari → Latin with diacritics, Vedic accents as marks)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "../core/state.js";
import { enCut, zsplit } from "./line-breaks.js";

export var ENS;
var IA, TRL, TRT;

export function init() {
  IA = (function () {
    var C = {
      क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "ṅ", च: "c", छ: "ch", ज: "j", झ: "jh", ञ: "ñ",
      ट: "ṭ", ठ: "ṭh", ड: "ḍ", ढ: "ḍh", ण: "ṇ", त: "t", थ: "th", द: "d", ध: "dh", न: "n",
      प: "p", फ: "ph", ब: "b", भ: "bh", म: "m", य: "y", र: "r", ल: "l", ळ: "ḷ", व: "v",
      श: "ś", ष: "ṣ", स: "s", ह: "h",
    };
    var NK = { ड: "ṛ", ढ: "ṛh", क: "q", ख: "x", ग: "ġ", ज: "z", फ: "f" }; // with nukta (Hindi)
    var V = { अ: "a", आ: "ā", इ: "i", ई: "ī", उ: "u", ऊ: "ū", ऋ: "ṛ", ॠ: "ṝ", ऌ: "ḷ", ए: "e", ऐ: "ai", ओ: "o", औ: "au" };
    var M = { "ा": "ā", "ि": "i", "ी": "ī", "ु": "u", "ू": "ū", "ृ": "ṛ", "ॄ": "ṝ", "े": "e", "ै": "ai", "ो": "o", "ौ": "au" };
    var S = { "॑": "̍", "॒": "̱", "᳚": "̎" }; // svarita, anudatta, dirgha svarita
    var O = { "ॐ": "om̐", "ऽ": "'", "।": "|", "॥": "||" };
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
  // English style. Each English line keeps its everyday text and its Marathi/Sanskrit source (taken here, before
  // anything else touches the lines), so the style switches in place without reloading (trSet). The scholarly
  // (IAST) text is made the first time it is needed. ENS keeps the everyday text so search still finds "sukhakarta".
  ENS = {};
  TRL = [];
  TRT = [];
  [].forEach.call(document.querySelectorAll(".verse"), function (v) {
    // Marathi and English lines pair up by position (refrain boxes have no data-l)
    var ms = v.querySelectorAll(":scope>.mr>p");
    [].forEach.call(v.querySelectorAll(":scope>.en>p"), function (p, i) {
      var id = p.getAttribute("data-l"),
        m = ms[i];
      if (!m) return;
      if (id) ENS[id] = p.textContent;
      TRL.push({ p: p, s: p.innerHTML, m: m.innerHTML, i: null });
    });
  });
  // Piece titles: headings, contents, Previous/Next, and the left menu and search list (copies of the contents)
  [].forEach.call(document.querySelectorAll(".ash"), function (sec) {
    var h = sec.querySelector("header h2"),
      m = h && h.querySelector(":scope > .mr"),
      e = h && h.querySelector(":scope > .en");
    if (m && e) TRT.push({ id: sec.id, s: e.textContent, m: m.textContent, i: null });
  });
  if (P.tr === "iast") trSet("iast", false);
}

// fin: the stanza numbers and line-break parts are already in place, so carry them over
export function trSet(st, fin) {
  var ia = st === "iast";
  TRL.forEach(function (x) {
    var p = x.p,
      sn = fin && p.querySelector(".sn");
    if (ia && x.i === null) x.i = x.m.split(/<br\s*\/?>/).map(IA).join("<br>");
    p.innerHTML = ia ? x.i : x.s;
    p.classList.toggle("ia", ia);
    if (sn) p.appendChild(sn);
    if (fin) zsplit(p, enCut, "");
  });
  TRT.forEach(function (t) {
    if (ia && t.i === null)
      t.i = IA(t.m).replace(/(^|[\s(])([^\s(])/g, function (x, a, c) {
        return a + c.toUpperCase();
      });
    var v = ia ? t.i : t.s;
    [].forEach.call(
      document.querySelectorAll("#" + t.id + ' header h2 > .en, a[data-go="' + t.id + '"] .en'),
      function (e) {
        if (!e.closest("small, .lt")) e.textContent = v; // not the language tag in the home list
      },
    );
  });
}

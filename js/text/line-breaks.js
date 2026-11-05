// Preferred line breaks
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P, dfs } from "../core/state.js";
import { onPiece } from "../core/page.js";

export var ZW;

export function init() {
  // Where a line may break when it is too long for the screen:
  //   Marathi: at a zero-width space (U+200B) typed in the line;
  //   English: after a single "|" or a comma.
  // Browsers fill a row greedily and may break at any later space instead, so each part is wrapped in an
  // inline-block span (.zs): the row then breaks between parts. The text itself is not changed.
  ZW = "\u200b";
  onPiece(breakLines);
  if (!P.fsu) P.fs = dfs();
}

// The preferred breaks in every line inside r (the page, or a printout's copy: js/print/compose.js)
export function breakLines(/** @type {ParentNode} */ r) {
  [].forEach.call(r.querySelectorAll(".verse .mr p"), function (p) {
    if (p.textContent.indexOf(ZW) >= 0)
      zsplit(
        p,
        function (t) {
          return t.split(ZW);
        },
        ZW,
      );
  });
  [].forEach.call(r.querySelectorAll(".verse .en p"), function (p) {
    zsplit(p, enCut, "");
  });
  [].forEach.call(r.querySelectorAll(".ash.prose .verse p"), glue);
  [].forEach.call(r.querySelectorAll(".ash.lines .verse p"), shortRef);
}

// The digits of every script a text is shown in (Latin, Devanagari, Kannada, Telugu, Gujarati), zero first
var DIGITS = "0123456789०१२३४५६७८९೦೧೨೩೪೫೬೭೮೯౦౧౨౩౪౫౬౭౮౯૦૧૨૩૪૫૬૭૮૯";
var REF = new RegExp("[" + DIGITS + "]+(?:\\.[" + DIGITS + "]+)+(?=[\\s॥|]*$)");

// A text set line by line (layout: lines) may number its verses by a long reference (Pavamana Suktam: ॥ ९.००१.०६ ॥,
// the Rigveda's book, hymn and verse). A phone's row has no room for it, so the reference is wrapped (.ref > span) with
// its last part, the verse, as a short number (data-short: ६, its zeros dropped), which css/02-core.css shows instead on a
// phone; the first verse of each hymn keeps its whole reference, so the reader still sees which hymn it is. The words
// are not changed: the reference stays in the text, for search, the printout and a screen reader.
export function shortRef(/** @type {HTMLElement} */ p) {
  var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT),
    t,
    last = null;
  // (the last text with more than dandas in it: a ॥ set against the number is glued outside it)
  while ((t = w.nextNode())) if (/[^\s॥|]/.test(t.data)) last = t;
  var m = last && REF.exec(last.data);
  if (!m || !last || (last.parentElement && last.parentElement.closest(".ref"))) return;
  var verse = m[0].slice(m[0].lastIndexOf(".") + 1),
    short = verse.replace(new RegExp("^[" + DIGITS.replace(/[^0०೦౦૦]/g, "") + "]+(?=.)"), ""),
    s = document.createElement("span");
  s.className = "ref";
  // (a hymn's first verse: no short number)
  if (DIGITS.indexOf(short) % 10 !== 1 || short.length !== 1) s.setAttribute("data-short", short);
  var tail = last.splitText(m.index);
  tail.splitText(m[0].length);
  tail.parentNode.replaceChild(s, tail);
  // (the whole reference in a span of its own, which a phone hides)
  s.appendChild(document.createElement("span")).appendChild(tail);
}

export function enCut(t) {
  return t.replace(/([^|]\||,)( +)(?=\S)/g, "$1$2\u0000").split("\u0000");
}

export function zsplit(p, cut, sep) {
  [].slice.call(p.childNodes).forEach(function (n) {
    if (n.nodeType !== 3) return;
    var a = cut(n.data);
    if (a.length < 2) return;
    var f = document.createDocumentFragment();
    a.forEach(function (part, i) {
      if (i && sep) f.appendChild(document.createTextNode(sep));
      // spaces at either end stay outside the span, so they show between parts
      var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(part);
      if (m[1]) f.appendChild(document.createTextNode(m[1]));
      if (m[2]) {
        var s = document.createElement("span");
        s.className = "zs";
        s.textContent = m[2];
        f.appendChild(s);
      }
      if (m[3]) f.appendChild(document.createTextNode(m[3]));
    });
    p.replaceChild(f, n);
  });
  // keep the stanza number with the last part of the line
  var sn = p.lastElementChild,
    last = sn && sn.previousSibling;
  while (last && last.nodeType === 3 && !last.data.trim()) last = last.previousSibling;
  if (sn && sn.className === "sn" && last && last.className === "zs") last.appendChild(sn);
}

// A Vedic chant shown in one language runs on as paragraphs (css/02-core.css, "Vedic chants in one language"):
// there a row may break at any space, so each danda (। ॥ |), with a verse number between two of them (a reference
// such as ॥ ९.००१.०१ ॥ too: Pavamana Suktam's Rigveda hymn and verse; its booklet sometimes leaves the last ॥ out,
// or sets it against the number, and the number is glued all the same), is glued
// to the word before it (to the last part of a word joined by hyphens, शक्ति-कूट-…-धारिणी: whole, it may be wider than a
// phone's row) (a nowrap span, .nb), and a line written on two rows (<br>) gets a space beside it
// (.brs, shown only while the line runs on). A long word in English letters is glued by its last three letters only:
// whole, it could be wider than a phone's row and run off the screen, where the rest of it may now break. The words
// themselves are not changed.
export function glue(p) {
  var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT),
    ns = [],
    n;
  while ((n = w.nextNode())) ns.push(n);
  ns.forEach(function (n) {
    var re = /[^\s-]+(?: +(?:[।॥|]+|[0-9०-९೦-೯]+(?:\.[0-9०-९೦-೯]+)*(?= *[॥|]| *$)))+/g,
      t = n.data,
      f = document.createDocumentFragment(),
      at = 0,
      m;
    while ((m = re.exec(t))) {
      var s = document.createElement("span"),
        w0 = (/^\S+/.exec(m[0]) || [""])[0],
        // (a long word in English letters: glued by its last three letters, each with its marks)
        cut = /[A-Za-z]/.test(w0) && w0.length > 12 ? w0.length - ((/(?:\P{M}\p{M}*){3}$/u.exec(w0) || [""])[0].length || w0.length) : 0;
      s.className = "nb";
      s.textContent = m[0].slice(cut);
      f.appendChild(document.createTextNode(t.slice(at, m.index + cut)));
      f.appendChild(s);
      at = m.index + m[0].length;
    }
    if (!at) return;
    f.appendChild(document.createTextNode(t.slice(at)));
    n.parentNode.replaceChild(f, n);
  });
  [].forEach.call(p.querySelectorAll("br"), function (b) {
    var s = document.createElement("span");
    s.className = "brs";
    s.textContent = " ";
    b.parentNode.insertBefore(s, b);
  });
}

// Latin digits → Devanagari digits
export function DV(n) {
  return SCR.to(
    String(n).replace(/[0-9]/g, function (d) {
      return "०१२३४५६७८९"[d];
    }),
  ); // (Kannada digits in Kannada letters)
}

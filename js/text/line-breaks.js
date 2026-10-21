// Preferred line breaks
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P, dfs } from "../core/state.js";

export var ZW;

export function init() {
  // Where a line may break when it is too long for the screen:
  //   Marathi: at a zero-width space (U+200B) typed in the line;
  //   English: after a single "|" or a comma.
  // Browsers fill a row greedily and may break at any later space instead, so each part is wrapped in an
  // inline-block span (.zs): the row then breaks between parts. The text itself is not changed.
  ZW = "\u200b";
  [].forEach.call(document.querySelectorAll(".verse .mr p"), function (p) {
    if (p.textContent.indexOf(ZW) >= 0)
      zsplit(
        p,
        function (t) {
          return t.split(ZW);
        },
        ZW
      );
  });
  [].forEach.call(document.querySelectorAll(".verse .en p"), function (p) {
    zsplit(p, enCut, "");
  });
  [].forEach.call(document.querySelectorAll(".ash.prose .verse p"), glue);
  if (!P.fsu) P.fs = dfs();
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
// there a row may break at any space, so each danda (। ॥ |), with a verse number between two of them, is glued
// to the word before it (a nowrap span, .nb), and a line written on two rows (<br>) gets a space beside it
// (.brs, shown only while the line runs on). The words themselves are not changed.
export function glue(p) {
  var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT),
    ns = [],
    n;
  while ((n = w.nextNode())) ns.push(n);
  ns.forEach(function (n) {
    var re = /\S+(?: +(?:[।॥|]+|[0-9०-९೦-೯]+(?= +[॥|])))+/g,
      t = n.data,
      f = document.createDocumentFragment(),
      at = 0,
      m;
    while ((m = re.exec(t))) {
      var s = document.createElement("span");
      s.className = "nb";
      s.textContent = m[0];
      f.appendChild(document.createTextNode(t.slice(at, m.index)));
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

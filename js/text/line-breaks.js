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

// Latin digits → Devanagari digits
export function DV(n) {
  return SCR.to(
    String(n).replace(/[0-9]/g, function (d) {
      return "०१२३४५६७८९"[d];
    }),
  ); // (Kannada digits in Kannada letters)
}

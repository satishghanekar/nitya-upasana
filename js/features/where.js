// @ts-check
// Where am I, and Go to (Satish, 2026-11-14): in a long text or a session, the top bar's title says where the reading is
// (पवमानसूक्तम् · तृतीयोऽध्यायः · ९.४७) and is a button that opens the Go to sheet (#goto), which lists the places to go
// to. Both are drawn from the text's outline (js/text/outline.js), worked out from the text file, so nothing here names a
// text. In a short text and on Home the title is the Home link, as before. With the bars tucked away the pill at the top
// (#tkb) says the same and opens the same sheet (Satish 2026-11-14: the name in view while reading is the one to tap).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { outline, placeAt, sessionOutline, verseAt, verseByNumber } from "../text/outline.js";
import { byId, onPiece, root } from "../core/page.js";
import { goLine } from "./bars.js";
import { jumpTo, ovDone, ovPush } from "./history.js";
import { runIds } from "./today-card.js";
import { menuWords } from "../core/strings.js";
import { esc, scr, ui } from "../core/words.js";

/**
 * @typedef {import("../text/outline.js").Outline} Outline
 * @typedef {import("../text/outline.js").Place} Place
 * @typedef {import("../text/content.js").Piece} Piece
 */

/** @type {HTMLElement} */ var btn; // #where, in the top bar beside the Home link
/** @type {HTMLElement} */ var homeLink; // #bt
/** @type {HTMLElement} */ var pill; // #tkb, the tucked bars' pill
/** @type {HTMLElement} */ var from; // the button the sheet was opened with, given focus back
/** @type {HTMLElement} */ var sheet; // #goto
/** @type {HTMLElement} */ var list; // #gtl
/** @type {Record<string, Outline | null>} each built text's outline, by piece id */
var outlines = {};
/** @type {Record<string, Piece>} every piece, by piece id */
var pieces = {};
/** @type {Record<string, Piece>} every piece, by text id */
var byText = {};
/** @type {Record<string, number>} where each line starts down the page, while the page keeps its layout */
var tops = {};
var stale = true;
// what the button shows now, so a scroll that changes nothing writes nothing
var said = "";
// the reading language of the labels: the first one shown, as the top bar's title
var lang = /** @type {"mr" | "en"} */ ("mr");

export function init() {
  btn = byId("where");
  homeLink = byId("bt");
  pill = byId("tkb");
  from = btn;
  sheet = byId("goto");
  list = byId("gtl");
  /** @type {any} */
  var C = /** @type {any} */ (window).CONTENT;
  if (C)
    C.categories.forEach(function (/** @type {{ pieces: Piece[] }} */ c) {
      c.pieces.forEach(function (p) {
        pieces[p.id] = p;
        byText[p.text] = p;
      });
    });
  // a text's outline, once, when it is first built; and its lines measured again whenever its size changes, for
  // whatever reason: folded, the dhrupad shown after every verse, the languages, the text size, a pinch, a font arriving
  var ro = typeof ResizeObserver === "function" ? new ResizeObserver(dirty) : null;
  onPiece(function (sec) {
    var p = pieces[sec.id];
    if (p && !(sec.id in outlines)) outlines[sec.id] = outline(p, C && C.outline);
    if (ro) ro.observe(sec);
    dirty();
  });
  addEventListener("resize", dirty, { passive: true });
  btn.onclick = function () {
    open(sheet.hidden, btn);
  };
  // (the pill's own tap, outside a long text, brings the bars back: js/features/bars.js)
  pill.addEventListener("click", function () {
    if (pill.hasAttribute("aria-haspopup")) open(true, pill);
  });
  byId("gtx").onclick = function () {
    open(false);
  };
  // the dimmed page around the sheet: a tap there closes it
  sheet.addEventListener("click", function (e) {
    if (e.target === sheet) open(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !sheet.hidden) open(false);
  });
  // a place: its row, a part's or a group's button, a text of the session
  list.addEventListener("click", function (e) {
    var b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest("[data-line]"));
    if (b) return go(/** @type {string} */ (b.dataset.piece), /** @type {string} */ (b.dataset.line));
    var x = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest("[data-more]"));
    if (x) {
      var kids = /** @type {HTMLElement} */ (byId(/** @type {string} */ (x.getAttribute("aria-controls"))));
      kids.hidden = !kids.hidden;
      x.setAttribute("aria-expanded", String(!kids.hidden));
    }
  });
  // a verse by its number: in the heading the reading is in first
  byId("gtf").addEventListener("submit", function (e) {
    e.preventDefault();
    var c = here(),
      o = c && outlines[c.id],
      inp = /** @type {HTMLInputElement} */ (byId("gtn"));
    if (!c || !o) return;
    var path = placeAt(o.places, top, readLine()),
      sec = path.length ? path[0].key : "s0",
      v = verseByNumber(o.verses, inp.value, sec);
    if (v) go(c.id, v.line);
    else {
      byId("gtm").textContent = menuWords("goto").none(inp.value);
      inp.select();
    }
  });
}

function dirty() {
  stale = true;
}

/** Where a line starts down the page (the first of its languages shown), or null when it is not shown @param {string} l */
function top(l) {
  if (stale) {
    tops = {};
    stale = false;
  }
  if (l in tops) return tops[l];
  var el = /** @type {HTMLElement | null} */ (document.querySelector('.wrap > .ash [data-l="' + l + '"]'));
  var t = el && el.getClientRects().length ? el.getBoundingClientRect().top + scrollY : null;
  if (t !== null) tops[l] = t;
  return t;
}

/** The reading line: where a place gone to is put (goLine(), js/features/bars.js), a third of the way down the screen,
 * so the title names the place just gone to */
function readLine() {
  return scrollY + innerHeight * 0.3 + 2;
}

/** The text being read (from mark(), js/features/bars.js) @type {HTMLElement | null} */
var current = null;
function here() {
  return current;
}

/** The session's texts, as pieces, while one is read; else null @returns {Piece[] | null} */
function session() {
  var ids = root.hasAttribute("data-run") ? runIds() : null;
  if (!ids) return null;
  var ps = ids
    .map(function (id) {
      return byText[id];
    })
    .filter(Boolean);
  return ps.length > 1 ? ps : null;
}

/** The lang of the labels: English, or Marathi in the letters it is shown in */
function tl() {
  return lang === "en" ? "en" : /** @type {any} */ (window).SCR.k || "mr";
}

/** A number as the reading language writes it, beside the text's title @param {number} n */
function digits(n) {
  return lang === "en"
    ? String(n)
    : scr(
        String(n).replace(/[0-9]/g, function (d) {
          return "०१२३४५६७८९"[+d];
        }),
      );
}

/** A label as the reading language writes it: Marathi in the chosen letters, or English @param {{ mr: string, en: string }} l */
function say(l) {
  return lang === "en" ? l.en : scr(l.mr);
}

/** The places the reading is in, and the verse when the deepest place has no smaller ones of its own @param {HTMLElement} c */
function where(c) {
  var o = outlines[c.id];
  if (!o) return [];
  var y = readLine(),
    path = placeAt(o.places, top, y),
    out = path.map(function (p) {
      return say(p.label);
    }),
    last = path[path.length - 1];
  // a verse number where it says more than the place does: in a heading or a group of verses, not a part (९.४७); the
  // group itself is then left out, as the verse says more ("स्तोत्रम् · ४८", not "स्तोत्रम् · २६–५० · ४८")
  if (!last || last.kind !== "part") {
    var v = verseAt(o.verses, top, y, path.length ? path[0].key : undefined);
    if (v) {
      if (last && last.kind === "group") out.pop();
      out.push(say(v.n));
    }
  }
  return out;
}

/**
 * Called by mark() (js/features/bars.js) as the page scrolls or changes: the title is the Home link, or, in a long text
 * or a session, the Go to button saying where the reading is.
 * @param {HTMLElement | null} c  the text being read, or null on Home
 * @param {boolean} onText  the title shows that text (its heading has gone under the top bar, and no page covers it)
 * @param {"mr" | "en"} l  the reading language of the title
 * @param {string} title  the title as mark() writes it ("३. पवमानसूक्तम्")
 */
export function whereMark(c, onText, l, title) {
  if (!btn) return; // (before this part has started)
  lang = l;
  current = c;
  var s = c ? session() : null,
    long = !!(c && outlines[c.id]),
    on = !!(c && onText && (long || s));
  if (btn.hidden === on) {
    btn.hidden = !on;
    homeLink.hidden = on;
    if (!on && !sheet.hidden) open(false);
    // the pill: a button that opens Go to, or, outside a long text, a name a tap on brings the bars back with (hidden
    // from screen readers and Tab then: the bars come back as soon as focus moves into them)
    if (on) {
      pill.setAttribute("aria-haspopup", "dialog");
      pill.removeAttribute("aria-hidden");
      pill.removeAttribute("tabindex");
    } else {
      pill.removeAttribute("aria-haspopup");
      pill.removeAttribute("aria-label");
      pill.setAttribute("aria-hidden", "true");
      pill.setAttribute("tabindex", "-1");
      byId("tkw").textContent = "";
      said = "";
    }
  }
  if (!on || !c) return;
  var i = s
      ? s.findIndex(function (p) {
          return p.id === c.id;
        })
      : -1,
    first = (i >= 0 && s ? digits(i + 1) + " / " + digits(s.length) + " · " : "") + title,
    path = where(c),
    second = path.length ? path.join(" · ") : menuWords("goto").title,
    key = first + "|" + second;
  if (key === said) return;
  said = key;
  byId("wh1").textContent = first;
  var w2 = byId("wh2");
  placeIn(w2, path, second);
  w2.lang = path.length ? tl() : ui();
  byId("wh1").lang = tl();
  var tkw = byId("tkw");
  placeIn(tkw, path, "");
  tkw.lang = tl();
  // its spoken name starts with what it does (WCAG 2.5.3): "Go to: पवमानसूक्तम्, तृतीयोऽध्यायः, ९.४७"
  var name = menuWords("goto").open([title].concat(path).join(", "));
  btn.setAttribute("aria-label", name);
  pill.setAttribute("aria-label", name);
}

/**
 * Where the reading is, written in: the headings, then the place itself (the verse, the part) on its own, so that where
 * the room runs out (a small phone) the headings give way and "९.४८" stays in sight (Satish 2026-11-14: "तृतीयोऽ…")
 * @param {HTMLElement} el @param {string[]} path @param {string} none  what it says with no place
 */
function placeIn(el, path, none) {
  el.textContent = path.length ? "" : none;
  if (!path.length) return;
  var at = document.createElement("span");
  at.className = "wh-at";
  at.textContent = path[path.length - 1];
  if (path.length > 1) {
    var into = document.createElement("span");
    into.className = "wh-in";
    // (its last space kept by white-space: pre, css/07-bottom-bar-folds.css)
    into.textContent = path.slice(0, -1).join(" · ") + " · ";
    el.appendChild(into);
  }
  el.appendChild(at);
}

/** Open or close the sheet @param {boolean} o @param {HTMLElement} [by]  the button it is opened with */
export function open(o, by) {
  if (o === !sheet.hidden) return;
  if (o) {
    from = by || btn;
    ovPush();
    draw();
    byId("gtm").textContent = "";
  }
  sheet.hidden = !o;
  expanded(o);
  document.documentElement.style.overflow = o ? "hidden" : "";
  if (o) {
    var on = /** @type {HTMLElement | null} */ (list.querySelector("[aria-current]"));
    /** @type {HTMLElement} */ (sheet.querySelector(".rsc")).focus({ preventScroll: true });
    if (on) on.scrollIntoView({ block: "center" });
  } else {
    // back to the button it was opened with; the top bar's when that has gone (the bars came back)
    try {
      from.focus({ preventScroll: true });
      if (document.activeElement !== from) btn.focus({ preventScroll: true });
    } catch (e) {}
    ovDone();
  }
}

/** Both buttons that open the sheet say whether it is open @param {boolean} o */
function expanded(o) {
  btn.setAttribute("aria-expanded", String(o));
  pill.setAttribute("aria-expanded", String(o));
}

/** The places as rows and number grids: the current place's open, the others closed */
function draw() {
  var c = current,
    w = menuWords("goto");
  if (!c) return;
  var s = session(),
    o = outlines[c.id],
    y = readLine(),
    path = o ? placeAt(o.places, top, y) : [],
    at = path.map(function (p) {
      return p.key;
    }),
    n = 0;
  /** @param {Place} p @param {boolean} isHere @param {boolean} inText */
  function row(p, isHere, inText) {
    var kids = p.kids || [],
      id = "gtk" + ++n,
      open = isHere && kids.length > 0,
      h =
        '<div class="gt-sec' +
        (isHere ? " on" : "") +
        '"><div class="gt-row"><button type="button" class="gt-go" data-piece="' +
        p.piece +
        '" data-line="' +
        p.line +
        '"' +
        (isHere && !open ? ' aria-current="location"' : "") +
        ">" +
        (p.kind === "text" && s ? '<span class="gt-no">' + digits(s.indexOf(pieces[p.piece]) + 1) + ".</span> " : "") +
        '<span lang="' +
        tl() +
        '">' +
        esc(say(p.label)) +
        "</span>" +
        (isHere ? ' <span class="gt-here">' + esc(w.here) + "</span>" : "") +
        "</button>";
    if (kids.length && !(p.kind === "text" && !inText))
      h +=
        '<button type="button" class="gt-more" data-more aria-controls="' +
        id +
        '" aria-expanded="' +
        open +
        '" aria-label="' +
        esc(w.more(say(p.label))) +
        '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>';
    h += "</div>";
    if (kids.length && !(p.kind === "text" && !inText)) {
      var grid = kids.every(function (k) {
        return !k.kids;
      });
      // ranges of verses (१०१–१२५) need wider buttons than numbers
      var wide = kids.some(function (k) {
        return k.kind === "group";
      });
      h += '<div class="' + (grid ? "gt-grid" + (wide ? " gt-wide" : "") : "gt-sub") + '" id="' + id + '"' + (open ? "" : " hidden") + ">";
      kids.forEach(function (k) {
        var on = at.indexOf(k.key) >= 0;
        if (grid)
          h +=
            '<button type="button" data-piece="' +
            k.piece +
            '" data-line="' +
            k.line +
            '"' +
            (on ? ' aria-current="location"' : "") +
            ' lang="' +
            tl() +
            '">' +
            esc(say(k.short || k.label)) +
            "</button>";
        else h += row(k, on, true);
      });
      h += "</div>";
    }
    return h + "</div>";
  }
  var html = "";
  if (s) {
    var ol = sessionOutline(
      s.map(function (p) {
        return { id: p.id, title: p.title, line: firstLine(p) };
      }),
      outlines,
    );
    var cid = c.id;
    html = ol
      .map(function (t) {
        return row(t, t.piece === cid, t.piece === cid);
      })
      .join("");
  } else if (o)
    html = o.places
      .map(function (p) {
        return row(p, at.indexOf(p.key) >= 0, true);
      })
      .join("");
  list.innerHTML = html;
  // the verse box, where a heading has more verses than its rows show: in a text with groups of verses
  var groups =
    !!o &&
    o.places.some(function (p) {
      return (
        p.kind === "group" ||
        (p.kids || []).some(function (k) {
          return k.kind === "group";
        })
      );
    });
  byId("gtf").hidden = !groups;
  byId("gtsub").textContent = s ? "" : say(/** @type {Piece} */ (pieces[c.id]).title);
}

/** @param {Piece} p */
function firstLine(p) {
  var all = (p.lead || []).concat(p.items);
  for (var i = 0; i < all.length; i++) {
    var ls = all[i].lines;
    if (ls && ls.length) return ls[0].l;
  }
  return "";
}

/** Go to a place: the sheet's Back step becomes the jump's, so Back returns to where the reading was
 * @param {string} piece @param {string} line */
function go(piece, line) {
  // closed without its own Back step: jumpTo() replaces it with the place gone to (as a search result does)
  sheet.hidden = true;
  expanded(false);
  document.documentElement.style.overflow = "";
  jumpTo(
    function () {
      goLine(line, true);
    },
    "#" + piece,
    line,
  );
  // Follow, if it is listening, carries on from here rather than pulling the page back to where it last heard
  // (js/features/listen.js): told by an event, as a feature imports no other for this
  document.dispatchEvent(new CustomEvent("nitya-jump", { detail: { piece: piece, line: line } }));
}

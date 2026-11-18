// @ts-check
// Writing the print view (#pv, or the preview's page) from the texts chosen: what each part of a text prints, the
// blocks that never split across a page, one language or both side by side, the contents and a routine's page. The
// print pop-up (js/features/print.js) makes one writer, giving it the printout's language and dhrupad as chosen
// there. See "How a printout is made" in js/features/print.js.

import { LEAD, P } from "../core/state.js";
import { compose } from "./compose.js";
import { DAYS, MONTHS, dv } from "../core/words.js";
import { TAG_WORDS, tagFor } from "./select.js";
import { menuWords } from "../core/strings.js";

/**
 * What the print pop-up adds around the texts (a printout of more than one text): whether to print the cover and the
 * closing page, and the words for them in a language (js/features/print.js works them out: they need features)
 * @typedef {{ cover: boolean, time: (ids: string[], L: string) => string, panchang: () => string, qr: () => Element | null }} Extras
 */
/**
 * @param {{ pv: HTMLElement, plang: () => string, pref: () => number, extras?: () => Extras, land?: () => boolean }} o
 *   the print view, the printout's language ("mr", "en" or "both") and dhrupad (1 once, 0 after every verse) as chosen
 *   in the pop-up, what it adds around the texts, and whether one language prints on sideways pages
 */
export function createWriter(o) {
  var pv = o.pv,
    plang = o.plang,
    pref = o.pref,
    extras = o.extras,
    land = o.land;
  // A text of at most SHORT rows is short: kept whole, it may follow the text before it on a page (write()). Its rows:
  // each line as many as it may wrap to (ROW letters a row, fewer than an upright page's line holds at its size) and
  // each note or label one. Enough room left for its title, credit and spacing on the smallest page printed (Letter,
  // upright); tests/print.spec.mjs checks every short text prints on one page
  var SHORT = 22,
    ROW = 40;
  /** @param {HTMLElement} box */
  function rows(box) {
    var n = box.querySelectorAll(".pvnote, .pvlab").length;
    [].forEach.call(box.querySelectorAll(".pvl"), function (/** @type {Element} */ l) {
      n += Math.max(1, Math.ceil((l.textContent || "").trim().length / ROW));
    });
    return n;
  }
  // the faces of the other scripts the original can be shown in (js/render.js SCRIPTS): Modern's, Bold's and
  // Traditional's (css/00-fonts.css: Tiro's Kannada and Telugu; Gujarati keeps Noto Serif's, as Tiro has none)
  /** @type {Record<string, string[]>} */
  var IND = {
    kn: ["Noto Sans Kannada", "SC Kn Classic", "SC Kn Tiro"],
    te: ["Noto Sans Telugu", "SC Te Classic", "SC Te Tiro"],
    gu: ["Noto Sans Gujarati", "SC Gu Classic", "SC Gu Classic"],
  };
  // a font's place in IND
  /** @param {string} f */
  function indAt(f) {
    return f === "std" ? 0 : f === "bold" ? 1 : 2;
  }
  // the original's language is named by the letters it is shown in (P.ind): menuWords("print").langs; a new script
  // (js/render.js) adds its name there

  // ---- Writing the print view ----
  /** An element of the print view @param {string} tag @param {string} [cls] @param {string} [html] */
  function mk(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  // The printout's ornaments, one set used everywhere (Satish 2026-11-17, "a book-like feel"): a rule with a diamond
  // under a title, three diamonds where a text ends, a lotus on the cover. Drawn (SVG, in the accent colour through
  // currentColor), never a background: Safari leaves backgrounds off the paper unless the reader asks for them
  /** @type {Record<string, string>} */
  var ORN = {
    rule: '<svg viewBox="0 0 200 12" aria-hidden="true"><path d="M0 6H91M109 6H200" fill="none" stroke="currentColor" stroke-width="1"/><path d="M100 1.5 104.5 6 100 10.5 95.5 6z" fill="currentColor"/></svg>',
    end: '<svg viewBox="0 0 44 12" aria-hidden="true"><path d="M8 2 12 6 8 10 4 6zM22 1 27 6 22 11 17 6zM36 2 40 6 36 10 32 6z" fill="currentColor"/></svg>',
    lotus:
      '<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor"><circle cx="32" cy="32" r="30" stroke-width="1.2"/><circle cx="32" cy="32" r="22" stroke-width=".8"/><path d="M32 12c6 10 6 14 0 20-6-6-6-10 0-20zM52 32c-10 6-14 6-20 0 6-6 10-6 20 0zM32 52c-6-10-6-14 0-20 6 6 6 10 0 20zM12 32c10-6 14-6 20 0-6 6-10 6-20 0z"/></g></svg>',
  };
  /** @param {string} kind  "rule", "end" or "lotus" */
  function orn(kind) {
    return mk("span", "pvorn pvorn-" + kind, ORN[kind]);
  }
  // A note of the text's own that heads what follows (प्रथमोऽध्यायः, खिलमन्त्रः, फलश्रुति), not a "↻ ३ वेळा" about the
  // lines before it: printed as a heading, kept with what follows it
  /** @param {Element} u */
  function isHeading(u) {
    return !/^\s*↻/.test((u.querySelector(".mr") || u).textContent || "");
  }
  // the original's language as the page marks it (Marathi, or the language of the letters it is shown in: Kannada,
  // Telugu, Gujarati)
  function olang() {
    return IND[P.ind] ? P.ind : "mr";
  }
  // the language printed: "mr" (the original), "en" or "both"
  /** @param {Element} host @param {string} k  "mr" or "en" @returns {string}  the inner HTML of its part in that language */
  function part(host, k) {
    var x = host.querySelector(":scope > ." + k) || host.querySelector("." + k);
    return x ? x.innerHTML : "";
  }
  // A note's text for the paper: in the original language without the ↻, which Safari draws from a Devanagari font
  // as a mark that reads as ७ (Satish, 2026-10-23: just "ध्रुपद"); English keeps it
  /** @param {Element} host @param {string} k */
  function note(host, k) {
    var h = part(host, k);
    return k === "en" ? h : h.replace(/^\s*↻\s*/, "");
  }
  // An element's text in a language, marked with its language (lang, for the fonts: css/15-print.css)
  /** @param {string} tag @param {string} cls @param {string} k "mr" or "en" @param {string} html */
  function inLang(tag, cls, k, html) {
    var e = mk(tag, cls + (k === "en" ? " pve" : " pvo"), html);
    e.setAttribute("lang", k === "en" ? "en" : olang());
    return e;
  }
  // A danda (। ॥, | in English) stays at the end of the line with the word before it, and a verse number stays whole
  // (॥ १ ॥): the spaces inside such a run become no-break spaces. In the text itself, not in a span of its own:
  // Safari printed the space beside such a span so narrow that the last two words of a line ran together.
  /** @param {Element} el */
  function glue(el) {
    // First the reading page's own spans around words go: Safari prints a space at the edge of a span next to
    // nothing, so the words ran together (tested in Safari, Satish 2026-10-23: a span edge at a space glues the
    // words, a no-break space does not). A word kept with its danda (.nb) and, in a Vedic paragraph, the
    // preferred-break parts (.zs) are unwrapped; a run-on line's space (.brs) becomes a plain space.
    [].forEach.call(el.querySelectorAll(".brs"), function (/** @type {Element} */ b) {
      b.replaceWith(" ");
    });
    [].forEach.call(el.querySelectorAll(el.classList.contains("pvpr") ? ".nb, .zs" : ".nb"), function (/** @type {Element} */ x) {
      x.replaceWith.apply(x, [].slice.call(x.childNodes));
    });
    el.normalize();
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT),
      n;
    while ((n = /** @type {Text | null} */ (w.nextNode())))
      n.data = n.data.replace(/\S+(?: +(?:[।॥|]+|[0-9०-९೦-೯]+(?= +[॥|])))+/g, function (/** @type {string} */ run) {
        return run.replace(/ +/g, "\u00a0");
      });
  }

  // What a text prints, by what each part of it is (never by what the reading page happens to show): the dhrupad at
  // the top and its ↻ markers with the dhrupad "once", its repeats after each stanza with "after every verse"
  // (the text file's refrain), every stanza, every line said once, and every note of the text's own.
  // Returns its parts in order, each with its role.
  /** @param {HTMLElement} sec @returns {{ el: HTMLElement, role: string }[]} */
  function parts(sec) {
    var once = pref() === 1;
    /** @type {{ el: HTMLElement, role: string }[]} */
    var out = [];
    // in the page's order: [once] lines and [note]s before the dhrupad at the top come first (.items.lead)
    [].forEach.call(sec.querySelectorAll(".rftop, .items > .item, .items > .rmk"), function (/** @type {HTMLElement} */ u) {
      var role = "";
      if (u.classList.contains("rftop")) role = once ? "refrain" : "";
      else if (u.classList.contains("rmk") && u.classList.contains("nt")) {
        // a note of the text's own: "↻ ३ वेळा" (repeat the lines above) belongs to what is before it, a heading such
        // as फलश्रुति to what follows. With the dhrupad after every verse, lines already written out again (the
        // repeats after the first, refrain lines) need no "3 times" too, or it reads as nine.
        var rep = /^\s*↻/.test((u.querySelector(".mr") || u).textContent || ""),
          prev = out[out.length - 1];
        role = !rep ? "before" : !once && prev && prev.el.querySelector(".verse p.rf") ? "" : "after";
      } else if (u.classList.contains("rmk"))
        // a "↻ dhrupad" marker; none before the first stanza, where the dhrupad at the top is just above it
        role =
          once &&
          out.some(function (x) {
            return x.role === "main";
          })
            ? "after"
            : "";
      else if (u.classList.contains("rf")) role = once ? "" : "after";
      else role = "main";
      if (role) out.push({ el: u, role: role });
    });
    return out;
  }
  // The parts grouped into blocks that never split: a heading note with what follows it; a marker, a repeated dhrupad
  // or a "3 times" with the stanza before it; the dhrupad at the top with the first stanza
  /** @param {{ el: HTMLElement, role: string }[]} ps @returns {HTMLElement[][]} */
  function group(ps) {
    /** @type {HTMLElement[][]} */
    var out = [],
      /** @type {HTMLElement[]} */
      head = [],
      /** @type {HTMLElement | null} */
      top = null;
    ps.forEach(function (x) {
      var last = out[out.length - 1];
      if (x.role === "refrain") top = x.el;
      else if (x.role === "before") head.push(x.el);
      else if (x.role === "after" && last) last.push(x.el);
      else {
        out.push((top ? [top] : []).concat(head, [x.el]));
        head = [];
        top = null;
      }
    });
    // (set in the loop above, which the type checks cannot follow)
    var last = /** @type {HTMLElement | null} */ (top);
    if (head.length || last) out.push((last ? [last] : []).concat(head));
    return out;
  }
  // The lines of a part (a stanza, the dhrupad, a line said once) in a language: each as written, with the stanza
  // number the page adds; a dhrupad line inside a stanza only when the dhrupad is said after every verse
  /** @param {HTMLElement} u @param {string} k @returns {{ html: string, rf: boolean }[]} */
  function linesOf(u, k) {
    var v = u.querySelector(".verse");
    if (!v) return [];
    return [].filter
      .call(v.querySelectorAll(":scope > ." + k + " > p"), function (/** @type {HTMLElement} */ p) {
        // (with the dhrupad once, a stanza's refrain lines are left out, unless the text always shows them:
        // refrain: always, section class norf)
        return pref() !== 1 || !p.classList.contains("rf") || !!u.closest(".norf");
      })
      .map(function (/** @type {HTMLElement} */ p) {
        return { html: p.innerHTML, rf: p.classList.contains("rf") || u.classList.contains("rf") };
      });
  }
  // how a part prints: the dhrupad at the top and a [dhrupad bold] block bold, a repeated dhrupad lighter
  /** @param {HTMLElement} u */
  function look(u) {
    var v = u.querySelector(".verse");
    return u.classList.contains("rftop") || (v && v.classList.contains("bold")) ? " pvbold" : u.classList.contains("rf") ? " pvrf" : "";
  }

  // One language: a stanza (with what goes with it), each line of verse a line on paper, centred, as on the reading
  // page (Satish, 2026-10-23: so the dhrupad, its markers and every stanza share one centre). A row of the text's
  // column (.pvcol)
  /** @param {HTMLElement[]} us @param {string} k */
  function verseBlock(us, k) {
    var row = mk("div", "pvk pvst"),
      b = mk("div", "pvsc");
    row.appendChild(b);
    us.forEach(function (u) {
      if (u.classList.contains("rmk")) return b.appendChild(inLang("p", "pvnote" + (u.classList.contains("nt") && isHeading(u) ? " pvhd" : ""), k, note(u, k)));
      var lab = u.querySelector(".lab");
      if (lab) b.appendChild(inLang("p", "pvlab", k, part(lab, k)));
      var st = mk("div", "pvsz" + look(u) + (u.classList.contains("rftop") ? " pvref" : "") + (u.classList.contains("dh") ? " pvdh" : "")),
        // a stanza's own refrain lines (आरती ज्ञानराजा ॥ धृ. ॥) are printed as a dhrupad sung again: after the stanza
        rf = mk("div", "pvsz pvrf");
      // the dhrupad at the top: its lines in a box as wide as they are, the line beside it hugging them (.pvrefin)
      var top = u.classList.contains("rftop") ? st.appendChild(mk("div", "pvrefin")) : st;
      linesOf(u, k).forEach(function (l) {
        var p = inLang("p", "pvl" + (l.rf ? " pvrf" : ""), k, l.html);
        glue(p);
        (l.rf && !look(u) ? rf : top).appendChild(p);
      });
      if (top !== st && !top.firstChild) st.removeChild(top);
      if (st.firstChild) b.appendChild(st);
      if (rf.firstChild) b.appendChild(rf);
    });
    return row;
  }
  // the paragraphs of a Vedic text: a new one at a stanza marked para, and a stanza said once (dh) on its own; a note
  // of the text's own (फलश्रुति) between them
  /** @param {HTMLElement[]} units @returns {HTMLElement[][]} */
  function paras(units) {
    /** @type {HTMLElement[][]} */
    var gs = [],
      /** @type {HTMLElement[] | null} */
      cur = null,
      /** @type {HTMLElement | null} a heading waiting for what follows it */
      head = null;
    units.forEach(function (u) {
      if (u.classList.contains("rmk")) {
        // a heading starts the next paragraph, in its block (so it never ends a page alone); a "↻ ३ वेळा" stands alone
        if (isHeading(u)) head = u;
        else gs.push([u]);
        cur = null;
        return;
      }
      if (!u.querySelector(".verse")) return;
      var dh = u.classList.contains("dh");
      if (dh || !cur || u.classList.contains("para")) {
        cur = head ? [head] : [];
        head = null;
        gs.push(cur);
      }
      /** @type {HTMLElement[]} */ (cur).push(u);
      if (dh) cur = null;
    });
    if (head) gs.push([head]);
    return gs;
  }
  // One language, a Vedic text: running paragraphs, as in a printed booklet (a line of verse runs on after the last)
  /** @param {HTMLElement[]} g @param {string} k */
  function proseBlock(g, k) {
    if (g[0].classList.contains("rmk") && g.length === 1)
      return /** @type {HTMLElement} */ (
        mk("div", "pvk", "").appendChild(inLang("p", "pvnote" + (isHeading(g[0]) ? " pvhd" : ""), k, note(g[0], k))).parentNode
      );
    // a heading, then the paragraph it heads, in one block
    /** @type {HTMLElement | null} */
    var hd = g[0].classList.contains("rmk") ? inLang("p", "pvnote pvhd", k, note(g[0], k)) : null;
    if (hd) g = g.slice(1);
    // the lines run on as one text, not a span each: Safari printed the space between two such spans so narrow that
    // the words ran together. (pvLines: the lines, for the tests)
    /** @type {string[]} */
    var ls = [];
    g.forEach(function (u) {
      linesOf(u, k).forEach(function (l) {
        ls.push(l.html.replace(/<br[^>]*>/gi, " "));
      });
    });
    var p = inLang("p", "pvpr", k, ls.join(" "));
    p.normalize();
    /** @type {any} */ (p).pvLines = ls.map(function (h) {
      return mk("span", "", h).textContent;
    });
    glue(p);
    // a paragraph of a single line said once (the closing peace chant) is centred, and never splits
    var one = g.length === 1 && g[0].classList.contains("dh") && linesOf(g[0], k).length === 1,
      b = mk("div", one ? "pvk pvcen" : "pvk pvflow");
    if (hd) b.appendChild(hd);
    b.appendChild(p);
    return b;
  }
  // One language, a Vedic text set line by line (layout: lines): as its booklet, each line a row of its own starting
  // at the left, each verse a block never split between pages, a hymn (a paragraph) further apart
  /** @param {HTMLElement[]} g @param {string} k */
  function linesBlock(g, k) {
    if (g[0].classList.contains("rmk") && g.length === 1) return proseBlock(g, k);
    // a heading goes into the first verse's block, never split from it
    /** @type {HTMLElement | null} */
    var hd = g[0].classList.contains("rmk") ? inLang("p", "pvnote pvhd", k, note(g[0], k)) : null;
    if (hd) g = g.slice(1);
    var box = mk("div", "pvlines");
    g.forEach(function (u, i) {
      var ls = linesOf(u, k),
        one = u.classList.contains("dh") && ls.length === 1,
        v = mk("div", "pvk pvlv" + (one ? " pvcen" : "") + (i === 0 ? " pvpara" : ""));
      if (hd && i === 0) v.appendChild(hd);
      ls.forEach(function (l) {
        var p = inLang("p", "pvl pvll", k, l.html.replace(/<br[^>]*>/gi, " "));
        p.normalize();
        glue(p);
        v.appendChild(p);
      });
      box.appendChild(v);
    });
    return box;
  }
  // Both languages, side by side: a table, each line of the original beside its English line
  /** @param {HTMLElement[]} us @param {boolean} flow  a Vedic paragraph (its rows may run on to the next page) */
  function sideBlock(us, flow) {
    var t = mk("table", "pvt"),
      order = LEAD === "en" ? ["en", "mr"] : ["mr", "en"],
      cg = mk("colgroup");
    order.forEach(function (k) {
      cg.appendChild(mk("col", k === "en" ? "pvce" : "pvco"));
    });
    t.appendChild(cg);
    var body = mk("tbody");
    t.appendChild(body);
    // a note or a label: across both columns, the original then its English
    /** @param {Element} x @param {string} cls */
    function across(x, cls) {
      var tr = mk("tr", cls),
        td = mk("td");
      /** @type {HTMLTableCellElement} */ (td).colSpan = 2;
      order.forEach(function (k, i) {
        var h = /pvnoterow/.test(cls) ? note(x, k) : part(x, k);
        if (!h) return;
        if (i && td.firstChild) td.appendChild(document.createTextNode(" · "));
        td.appendChild(inLang("span", "", k, h));
      });
      tr.appendChild(td);
      body.appendChild(tr);
    }
    us.forEach(function (u) {
      if (u.classList.contains("rmk")) return across(u, u.classList.contains("nt") && isHeading(u) ? "pvnoterow pvhdrow" : "pvnoterow");
      var lab = u.querySelector(".lab");
      if (lab) across(lab, "pvlabrow");
      var a = linesOf(u, "mr"),
        e = linesOf(u, "en");
      a.forEach(function (l, i) {
        var tr = mk("tr", "pvrow" + look(u) + (l.rf ? " pvrf" : "") + (i === a.length - 1 ? " pvend" : "") + (u.classList.contains("rftop") ? " pvref" : ""));
        order.forEach(function (k) {
          var td = inLang("td", "", k, k === "en" ? (e[i] ? e[i].html : "") : l.html);
          glue(td);
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    });
    return /** @type {HTMLElement} */ (mk("div", flow ? "pvk pvflow" : "pvk pvst").appendChild(t).parentNode);
  }

  // Build the print view: contents (when more than one text prints, or a routine's page 1), then every text.
  // mode: "one" (one language) or "side" (both, side by side). ids: the texts printed (their Library ids), or null for
  // every text. rp: a routine printout (the builder's Routine tab): its texts in routine order, page 1 with the week at
  // a glance, and each text's tag under its title. into: where to write it (the print view, or the preview's page)
  // sp: one day (the builder's Routine tab, one day): its texts in order (Home's, for the day Home shows), the contents
  // headed by the day and the session
  /**
   * @param {string} mode @param {string[] | null} ids @param {import("../print/what.js").RoutinePlan | null} [rp]
   * @param {HTMLElement} [into] @param {{ session: string, day?: number } | null} [sp]
   */
  function build(mode, ids, rp, into, sp) {
    var src = compose(ids, plang(), rp ? true : sp ? sessionName(sp.session, sp.day) : false);
    try {
      write(into || pv, mode, src, rp || null, sp || null);
    } finally {
      src.el.remove();
    }
  }
  // A routine printout's words are in the language printed (with both, the main one): Marathi in the chosen script
  function rlang() {
    return plang() === "both" ? (LEAD === "en" ? "en" : "mr") : plang() === "en" ? "en" : "mr";
  }
  /** The language a routine printout's words are in: English, Marathi, or with the original in other letters that
   * language's own words (Kannada days and sessions, not Marathi's written in Kannada letters) */
  function rw() {
    return rlang() === "en" ? "en" : /** @type {any} */ (window).SCR.k || "mr";
  }
  /** @param {number} n */
  function rnum(n) {
    return rlang() === "mr" ? /** @type {any} */ (window).SCR.to(dv(n)) : String(n);
  }
  /** A piece's text id (content/library.json) from its section's id on the page @param {string} sid */
  function textOf(sid) {
    var id = sid;
    /** @type {any} */ (window).CONTENT.categories.forEach(function (/** @type {any} */ g) {
      g.pieces.forEach(function (/** @type {any} */ p) {
        if (p.id === sid) id = p.text;
      });
    });
    return id;
  }
  /** A text's tag in a routine printout @param {import("../print/what.js").RoutinePlan} rp @param {string} id */
  function rtag(rp, id) {
    return tagFor(rp.where[id], rw());
  }
  // A session's printout heads its contents with its day and the session: "Tuesday · Evening" (all of a day: the day)
  /** @param {string} s @param {number} [day] the weekday (the day Home shows), else today */
  function sessionName(s, day) {
    var d = typeof day === "number" ? day : new Date().getDay(),
      k = /** @type {any} */ (window).SCR.k || "mr",
      mr = /** @type {Record<string, string>} */ (TAG_WORDS[k].sessions)[s],
      en = /** @type {Record<string, string>} */ (TAG_WORDS.en.sessions)[s];
    return { mr: /** @type {any} */ (DAYS)[k][d] + (mr ? " · " + mr : ""), en: DAYS.en[d] + (en ? " · " + en : "") };
  }
  // A title (a text's, the printout's, a category's) in the language printed: with both, the original's, the English
  // under it, smaller
  /** @param {string} tag @param {string} cls @param {string} mrHtml @param {string} enHtml @param {string} [numMr] @param {string} [numEn] */
  function title(tag, cls, mrHtml, enHtml, numMr, numEn) {
    var L = plang(),
      h = mk(tag, cls),
      k = L === "en" ? "en" : "mr",
      lead = L === "both" && LEAD === "en" ? "en" : k;
    var n = lead === "en" ? numEn : numMr;
    if (n) h.appendChild(inLang("span", "pvnum", lead, n));
    h.appendChild(inLang("span", "pvtt", lead, lead === "en" ? enHtml : mrHtml));
    if (L === "both") h.appendChild(inLang("span", "pvsec", lead === "en" ? "mr" : "en", lead === "en" ? mrHtml : enHtml));
    return h;
  }
  /** a text's title, from its section on the page @param {HTMLElement} sec @param {string} tag @param {string} cls */
  function titleOf(sec, tag, cls) {
    var h = /** @type {HTMLElement} */ (sec.querySelector("header h2"));
    return title(tag, cls, part(h, "mr"), part(h, "en"), (h.querySelector(".nm") || {}).textContent || "", (h.querySelector(".ne") || {}).textContent || "");
  }
  // The contents: the printout's title, then each category and its texts, as a plain list (no page numbers)
  /** @param {HTMLElement} into @param {any} src */
  function contents(into, src) {
    var cov = mk("section", "pvcov"),
      ex = extras ? extras() : null,
      L = rw();
    cov.appendChild(title("h1", "pvh", /** @type {any} */ (window).SCR.to("नित्य उपासना"), "Nitya Upasana"));
    cov.lastChild && /** @type {HTMLElement} */ (cov.lastChild).appendChild(orn("rule"));
    src.groups.forEach(function (/** @type {any} */ g) {
      if (!g.secs.length) return;
      var nm = mk("div");
      g.name.forEach(function (/** @type {Node} */ x) {
        nm.appendChild(x.cloneNode(true));
      });
      // two texts a row, each row a list of its own set as one unbreakable box (.pvtr): Safari split a row whose
      // title ran to two lines across two pages, whatever "break-inside: avoid" said. The category's heading and
      // its first row are one such box too (.pvhead), so a heading never ends a page alone.
      var rows = mk("div", "pvtocw"),
        head = rows.appendChild(mk("div", "pvhead")),
        /** @type {HTMLElement | null} */
        ol = null;
      head.appendChild(title("h3", "pvcat", part(nm, "mr"), part(nm, "en")));
      g.secs.forEach(function (/** @type {HTMLElement} */ sec, /** @type {number} */ i) {
        var li = titleOf(sec, "li", "");
        li.setAttribute("data-sid", sec.id);
        // how long it takes to chant (the contents has no page numbers: no browser says where its pages break)
        var t = ex ? ex.time([textOf(sec.id)], L) : "";
        if (t) li.appendChild(inLang("span", "pvtime", L === "en" ? "en" : "mr", t));
        if (i % 2 === 0) ol = (i ? rows : head).appendChild(mk("ol", "pvtoc pvtr"));
        /** @type {HTMLElement} */ (ol).appendChild(li);
      });
      cov.appendChild(rows);
    });
    into.appendChild(cov);
  }
  // Today's date in a language: "मंगळवार, १७ नोव्हेंबर २०२६", "Tuesday, 17 November 2026"
  /** @param {string} L "en", or the original's letters (rw()) */
  function dateText(L) {
    var n = new Date(),
      k = L === "en" ? "en" : L;
    if (k === "en") return DAYS.en[n.getDay()] + ", " + n.getDate() + " " + MONTHS.en[n.getMonth()] + " " + n.getFullYear();
    return (
      /** @type {any} */ (DAYS)[k][n.getDay()] + ", " + rnum(n.getDate()) + " " + /** @type {any} */ (MONTHS)[k][n.getMonth()] + " " + rnum(n.getFullYear())
    );
  }
  // A line of the printout's own words in its language (the main one's, with both)
  /** @param {string} tag @param {string} cls @param {string} text */
  function own(tag, cls, text) {
    var e = inLang(tag, cls, rw() === "en" ? "en" : "mr", "");
    e.textContent = text;
    return e;
  }
  // The cover of a printout of more than one text (Satish 2026-11-17, "a book-like feel"): the lotus, the site's name,
  // what is printed (the session, or how many texts) and how long it takes, and the day. A frame as tall as what is in
  // it, never the page's height: Safari prints a little smaller and its pages are not known (a page-tall frame ran on
  // to a second page), and its lines are borders, which Safari always prints
  /** @param {HTMLElement} into @param {any} src @param {{ session: string, day?: number } | null} sp @param {Extras} ex */
  function cover(into, src, sp, ex) {
    var L = rw(),
      pw = menuWords("print", L),
      // (not .pvcov: the contents is the one page that lists the texts)
      sec = mk("section", "pvcover"),
      fr = sec.appendChild(mk("div", "pvframe")).appendChild(mk("div", "pvframein"));
    fr.appendChild(orn("lotus"));
    fr.appendChild(title("h1", "pvh pvbig", /** @type {any} */ (window).SCR.to("नित्य उपासना"), "Nitya Upasana"));
    fr.appendChild(orn("rule"));
    if (sp) {
      var nm = sessionName(sp.session, sp.day);
      fr.appendChild(title("p", "pvwhat", nm.mr, nm.en));
    }
    var t = ex.time(
      src.secs.map(function (/** @type {HTMLElement} */ x) {
        return textOf(x.id);
      }),
      L,
    );
    fr.appendChild(own("p", "pvmeta", pw.texts(src.secs.length) + (t ? " · " + t : "")));
    fr.appendChild(own("p", "pvdate", dateText(L)));
    var pn = ex.panchang();
    if (pn) fr.appendChild(inLang("p", "pvpan", L === "en" ? "en" : "mr", "")).textContent = pn;
    into.appendChild(sec);
  }
  // A text's credit (its author or source) as plain text in a language: the Wikipedia link is for the screen
  /** @param {HTMLElement} sec @param {string} cl "mr" or "en" */
  function creditText(sec, cl) {
    var cr = /** @type {HTMLElement | null} */ (sec.querySelector(".cr"));
    if (!cr) return "";
    var c = /** @type {HTMLElement} */ (cr.cloneNode(true)),
      other = c.querySelectorAll(cl === "en" ? ".mr" : ".en");
    [].forEach.call(c.querySelectorAll(".crx, .rec"), function (/** @type {Element} */ x) {
      x.remove();
    });
    if (c.querySelector(cl === "en" ? ".en" : ".mr"))
      [].forEach.call(other, function (/** @type {Element} */ x) {
        x.remove();
      });
    // the second, smaller author line (<small>) is a sentence of its own: a space before it
    [].forEach.call(c.querySelectorAll("small"), function (/** @type {Element} */ x) {
      x.before(" ");
    });
    return c.textContent.replace(/\s+/g, " ").trim();
  }
  // The closing page: the texts printed and where each comes from, the site to open with its QR code, and the day it
  // was printed. Its own page (rule 1), its blocks never split
  /** @param {HTMLElement} into @param {any} src @param {Extras} ex */
  function closing(into, src, ex) {
    var L = rw(),
      k = L === "en" ? "en" : "mr",
      cl = plang() === "both" ? (LEAD === "en" ? "en" : "mr") : plang() === "en" ? "en" : "mr",
      sec = mk("section", "pvclose");
    sec.appendChild(orn("end"));
    var box = sec.appendChild(mk("div", "pvk pvsrc"));
    box.appendChild(title("h3", "pvsrch", menuWords("print", /** @type {any} */ (window).SCR.k || "mr").sources, menuWords("print", "en").sources));
    // (not a .pvtoc: the contents is the one list of the texts printed)
    var ol = box.appendChild(mk("ol", "pvsl"));
    src.secs.forEach(function (/** @type {HTMLElement} */ s2) {
      var li = titleOf(s2, "li", ""),
        t = creditText(s2, cl);
      li.setAttribute("data-sid", s2.id);
      if (t) li.appendChild(inLang("span", "pvwho", cl, "")).textContent = t;
      ol.appendChild(li);
    });
    var site = sec.appendChild(mk("div", "pvk pvsite")),
      q = ex.qr(),
      url = q ? (/https?:\/\/[^\s"]+/.exec(q.getAttribute("aria-label") || "") || [""])[0] : "";
    if (q) site.appendChild(mk("div", "pvqr")).appendChild(q);
    var at = site.appendChild(mk("div", "pvat"));
    at.appendChild(title("p", "pvsn", /** @type {any} */ (window).SCR.to("नित्य उपासना"), "Nitya Upasana"));
    if (url) at.appendChild(mk("p", "pvurl pve", "")).textContent = url.replace(/^https?:\/\/|\/$/g, "");
    at.appendChild(own("p", "pvdate", menuWords("print", L).printed(dateText(L))));
    var pn = ex.panchang();
    if (pn && k !== "en") at.appendChild(inLang("p", "pvpan", "mr", "")).textContent = pn;
    into.appendChild(sec);
  }
  // Page 1 of a routine printout: whose routine and the month, the week at a glance (days × sessions, each cell the
  // numbers of its texts), then the contents in printing order, each text with its tag
  /** @param {HTMLElement} into @param {any} src @param {import("../print/what.js").RoutinePlan} rp */
  function routinePage(into, src, rp) {
    var L = rw(),
      tw = TAG_WORDS[L],
      now = new Date(),
      cov = mk("section", "pvcov pvrt"),
      h = mk("h1", "pvh pvrh");
    h.textContent = rp.name;
    cov.appendChild(h);
    var sub = mk("p", "pvsub");
    sub.textContent = menuWords("print", L).cover(now.getMonth(), now.getFullYear());
    cov.appendChild(sub);
    if (rp.grid.length) {
      var h3 = mk("h3", "pvcat");
      h3.textContent = menuWords("print", L).week;
      if (rp.days.length === 1) h3.textContent = /** @type {any} */ (DAYS)[L][rp.days[0]];
      cov.appendChild(h3);
      var tb = mk("table", "pvgrid"),
        th0 = mk("thead"),
        hr = mk("tr");
      hr.appendChild(mk("th"));
      rp.days.forEach(function (d) {
        var th = mk("th");
        th.textContent = tw.days[d];
        hr.appendChild(th);
      });
      th0.appendChild(hr);
      tb.appendChild(th0);
      var bd = mk("tbody");
      rp.grid.forEach(function (row) {
        var tr = mk("tr"),
          th = mk("th");
        th.textContent = tw.sessions[row.session];
        tr.appendChild(th);
        row.cells.forEach(function (c) {
          var td = mk("td", c.nums.length ? "" : "pvnone");
          td.textContent = c.nums.length ? c.nums.map(rnum).join(" ") : "–";
          tr.appendChild(td);
        });
        bd.appendChild(tr);
      });
      tb.appendChild(bd);
      cov.appendChild(tb);
    }
    var h4 = mk("h3", "pvcat");
    h4.textContent = menuWords("print", L).contents;
    cov.appendChild(h4);
    var ol = mk("ol", "pvtoc");
    src.secs.forEach(function (/** @type {HTMLElement} */ sec) {
      var li = titleOf(sec, "li", ""),
        tg = mk("span", "pvtag");
      li.setAttribute("data-sid", sec.id);
      tg.textContent = rtag(rp, textOf(sec.id));
      li.appendChild(tg);
      ol.appendChild(li);
    });
    cov.appendChild(ol);
    into.appendChild(cov);
  }
  /**
   * @param {HTMLElement} into @param {string} mode @param {any} src @param {import("../print/what.js").RoutinePlan | null} rp
   * @param {{ session: string, day?: number } | null} sp
   */
  function write(into, mode, src, rp, sp) {
    var side = mode === "side",
      k = plang() === "en" ? "en" : "mr";
    into.innerHTML = "";
    into.setAttribute("data-lang", plang());
    into.setAttribute("data-mode", side ? "side" : "one");
    // one text on its own prints as just that text: no contents (a routine's page 1 always prints); more than one, a
    // cover before the contents and a closing page after the texts, unless turned off in the pop-up
    var ex = extras ? extras() : null,
      book = !rp && src.secs.length > 1 && !!ex && ex.cover;
    if (book) cover(into, src, sp || null, /** @type {Extras} */ (ex));
    if (rp && !(/** @type {any} */ (rp).only)) routinePage(into, src, rp);
    else if (src.secs.length > 1) contents(into, src);
    src.secs.forEach(function (/** @type {HTMLElement} */ sec) {
      var vedic = sec.classList.contains("prose"),
        byLine = sec.classList.contains("lines"),
        box = mk("section", "pvs" + (vedic ? " pvved" : ""));
      box.setAttribute("data-sid", sec.id);
      var hd = titleOf(sec, "h2", "pvtitle");
      hd.appendChild(orn("rule"));
      // a routine printout: the text's tag under its title
      if (rp) {
        var tg = mk("span", "pvtag");
        tg.textContent = rtag(rp, textOf(sec.id));
        hd.appendChild(tg);
      }
      box.appendChild(hd);
      var ps = parts(sec);
      if (vedic)
        // a Vedic text: running paragraphs in one language; side by side, each line beside its English, the rows of a
        // paragraph running on from page to page. The dhrupad never applies to it
        paras(
          ps.map(function (x) {
            return x.el;
          }),
        ).forEach(function (g) {
          box.appendChild(side ? sideBlock(g, !(g.length === 1 && g[0].classList.contains("rmk"))) : byLine ? linesBlock(g, k) : proseBlock(g, k));
        });
      else if (side)
        group(ps).forEach(function (g) {
          box.appendChild(sideBlock(g, false));
        });
      else {
        // one column of stanzas, centred on the page as wide as its widest stanza (a table: the browser sizes it, and
        // breaks pages between its rows, never inside one)
        var col = mk("div", "pvcol");
        group(ps).forEach(function (g) {
          col.appendChild(verseBlock(g, k));
        });
        box.appendChild(col);
      }
      // the author line in the language printed (with both, the main one's), then the end mark. Inside the last block,
      // so neither lands alone at the top of a page (Safari doesn't keep a line with the one before it); in a text's
      // column, in its last cell, centred under the column
      var t = creditText(sec, plang() === "both" ? (LEAD === "en" ? "en" : "mr") : k),
        ks = box.querySelectorAll(".pvk"),
        last = /** @type {HTMLElement | null} */ (ks[ks.length - 1] || null),
        at = last ? /** @type {HTMLElement} */ (last.querySelector(".pvsc") || last) : box;
      // (the end mark on the credit's line, after it, so it takes no room of its own: an aarti side by side still
      // fits one sideways page; on a line of its own when there is no credit)
      if (t) {
        var pc = at.appendChild(mk("p", "pvcr"));
        pc.textContent = t;
        pc.appendChild(orn("end"));
      } else {
        // no credit: at the end of the text's last line (its last row, side by side), never a line of its own
        var ends = last ? last.querySelectorAll(".pvl, .pvpr, tr:last-child > td:last-child") : [];
        /** @type {HTMLElement} */ (ends[ends.length - 1] || at).appendChild(orn("end"));
      }
      // A short text (an aarti, an ashtak: SHORT rows at most) is one block that never splits, so it may follow the
      // text before it on the same page instead of starting a page of its own (Satish 2026-11-17: a session wasted a
      // page an aarti); a long one starts a page (css/15-print.css, rule 1). Not side by side, not a Vedic text, and
      // not on sideways pages (shorter: a whole aarti could be taller than one)
      if (!side && !vedic && !(land && land()) && rows(box) <= SHORT) {
        var whole = mk("div", "pvk pvwhole");
        while (box.firstChild) whole.appendChild(box.firstChild);
        box.appendChild(whole);
        box.classList.add("pvshort");
      }
      into.appendChild(box);
    });
    if (book) closing(into, src, /** @type {Extras} */ (ex));
  }
  return { IND: IND, indAt: indAt, olang: olang, build: build };
}

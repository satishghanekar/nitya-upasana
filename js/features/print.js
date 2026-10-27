// Print
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// How a printout is made (ARCHITECTURE.md, "Printing"):
//   1. The texts chosen are built afresh from the text files (js/print/compose.js), as the reading page builds them
//      (the script, the English style, the stanza numbers), whatever the reading page has folded or hidden.
//   2. From them the print view (#pv) is written in markup of its own, pv… classes only, so nothing of the reading
//      page's look reaches the paper: its whole look is css/15-print.css. What prints is decided here, by what each
//      part of a text is (a stanza, the dhrupad, a note, a Vedic paragraph), never by what the screen shows.
//   3. The browser lays the pages out, by four rules in css/15-print.css: every text starts on a new page; a stanza
//      (with its dhrupad, marker or note) is never split; a Vedic paragraph splits only between lines and never leaves
//      one line alone at the foot or top of a page; side by side, a row is never split.
// Nothing is measured, so every browser prints the same way, at once, from the tap that asked for it. The contents
// list the texts without page numbers (Satish, 2026-10-23: a browser cannot say where its pages break).

import { flash, pieceEl, root } from "../core/page.js";
import { LEAD, P, change } from "../core/state.js";
import { ovDone, ovDrop, ovPush } from "./history.js";
import { focusBack } from "./more-menu.js";
import { FEAT_SW } from "../core/features.js";
import { compose } from "../print/compose.js";
import { createWhat, whatWords } from "../print/what.js";
import { shelvesNow } from "./library.js";
import { todaySessions, runIds, shownSession } from "./today-card.js";
import { cur } from "../core/apply.js";
import { active, list as people } from "../store/store.js";
import { loaded } from "../text/load.js";
import { MONTHS, dv } from "../core/words.js";
import { TAG_WORDS, tagFor } from "../print/select.js";
import { cleanRoutine } from "../core/routine.js";

// The page each printout is made for: one language upright, both languages side by side on a sideways page
var CHOICE = { one: { page: "up" }, both: { page: "land" } };

export function init() {
  (function () {
    var pm = document.getElementById("prm"),
      pv = /** @type {HTMLElement} */ (document.getElementById("pv")),
      b1 = document.getElementById("pr1"),
      b2 = document.getElementById("pr2"),
      bgo = document.getElementById("prgo"),
      bpr = document.getElementById("prgp"),
      po = pm.querySelector(".pro"),
      pw = document.getElementById("prw"),
      pv2 = document.getElementById("prv"),
      bsf = document.getElementById("prsf"),
      bcp = document.getElementById("prcp"),
      last = "as", // the layout last chosen, carried to Safari
      pn = pm.querySelector(".prn:not(#prw):not(#prv)"),
      busy = false,
      /** @type {{ m: string, ids: string[] | null, rp: any } | null} the printout being made from the builder */
      job = null,
      /** @type {{ m: string, ids: string[] | null, rp: any } | null} the printout just printed, until the reader is back */
      again = null,
      seen = false; // the browser has started printing (beforeprint) since the last window.print()
    // the original's language, by the letters it is shown in (P.ind), as the Print pop-up names it: in Marathi
    // menus, then in English. A new script (js/render.js) adds its name here.
    var NAMES = { mr: ["मराठी", "Marathi"], kn: ["कन्नड", "Kannada"] };

    // ---- Writing the print view ----
    /** An element of the print view @param {string} tag @param {string} [cls] @param {string} [html] */
    function mk(tag, cls, html) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html !== undefined) e.innerHTML = html;
      return e;
    }
    // the original's language as the page marks it (Marathi, or the language of the letters it is shown in: Kannada)
    function olang() {
      return P.ind === "kn" ? "kn" : "mr";
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
      while ((n = w.nextNode()))
        n.data = n.data.replace(/\S+(?: +(?:[।॥|]+|[0-9०-९೦-೯]+(?= +[॥|])))+/g, function (run) {
          return run.replace(/ +/g, "\u00a0");
        });
    }

    // What a text prints, by what each part of it is (never by what the reading page happens to show): the dhrupad at
    // the top and its ↻ markers with the dhrupad "once", its repeats after each stanza with "after every verse"
    // (the text file's refrain), every stanza, every line said once, and every note of the text's own.
    // Returns its parts in order, each with its role.
    /** @param {HTMLElement} sec @returns {{ el: HTMLElement, role: string }[]} */
    function parts(sec) {
      var once = pref() === 1,
        out = [];
      // in the page's order: [once] lines and [note]s before the dhrupad at the top come first (.items.lead)
      [].forEach.call(sec.querySelectorAll(".rftop, .items > .item, .items > .rmk"), function (/** @type {HTMLElement} */ u) {
        var role = "";
        if (u.classList.contains("rftop")) role = once ? "refrain" : "";
        else if (u.classList.contains("rmk") && u.classList.contains("nt"))
          // a note of the text's own: "↻ ३ वेळा" (repeat the lines above) belongs to what is before it, a heading such
          // as फलश्रुति to what follows
          role = /^\s*↻/.test((u.querySelector(".mr") || u).textContent) ? "after" : "before";
        else if (u.classList.contains("rmk")) role = once ? "after" : "";
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
      var out = [],
        head = [],
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
      if (head.length || top) out.push((top ? [top] : []).concat(head));
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
        if (u.classList.contains("rmk")) return b.appendChild(inLang("p", "pvnote", k, note(u, k)));
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
      var gs = [],
        cur = null;
      units.forEach(function (u) {
        if (u.classList.contains("rmk")) {
          gs.push([u]);
          cur = null;
          return;
        }
        if (!u.querySelector(".verse")) return;
        var dh = u.classList.contains("dh");
        if (dh || !cur || u.classList.contains("para")) {
          cur = [];
          gs.push(cur);
        }
        cur.push(u);
        if (dh) cur = null;
      });
      return gs;
    }
    // One language, a Vedic text: running paragraphs, as in a printed booklet (a line of verse runs on after the last)
    /** @param {HTMLElement[]} g @param {string} k */
    function proseBlock(g, k) {
      if (g[0].classList.contains("rmk")) return mk("div", "pvk", "").appendChild(inLang("p", "pvnote", k, note(g[0], k))).parentNode;
      // the lines run on as one text, not a span each: Safari printed the space between two such spans so narrow that
      // the words ran together. (pvLines: the lines, for the tests)
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
      b.appendChild(p);
      return b;
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
        td.colSpan = 2;
        order.forEach(function (k, i) {
          var h = cls === "pvnoterow" ? note(x, k) : part(x, k);
          if (!h) return;
          if (i && td.firstChild) td.appendChild(document.createTextNode(" · "));
          td.appendChild(inLang("span", "", k, h));
        });
        tr.appendChild(td);
        body.appendChild(tr);
      }
      us.forEach(function (u) {
        if (u.classList.contains("rmk")) return across(u, "pvnoterow");
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
      return mk("div", flow ? "pvk pvflow" : "pvk pvst").appendChild(t).parentNode;
    }

    // Build the print view: contents (when more than one text prints, or a routine's page 1), then every text.
    // mode: "one" (one language) or "side" (both, side by side). ids: the texts printed (their Library ids), or null for
    // every text. rp: a routine printout (the builder's Routine tab): its texts in routine order, page 1 with the week at
    // a glance, and each text's tag under its title. into: where to write it (the print view, or the preview's page)
    /** @param {string} mode @param {string[] | null} ids @param {import("../print/what.js").RoutinePlan | null} [rp] @param {HTMLElement} [into] */
    function build(mode, ids, rp, into) {
      var src = compose(ids, plang(), !!rp);
      try {
        write(into || pv, mode, src, rp || null);
      } finally {
        src.el.remove();
      }
    }
    // A routine printout's words are in the language printed (with both, the main one): Marathi in the chosen script
    function rlang() {
      return plang() === "both" ? (LEAD === "en" ? "en" : "mr") : plang() === "en" ? "en" : "mr";
    }
    /** @param {string} s */
    function rmr(s) {
      return rlang() === "mr" ? SCR.to(s) : s;
    }
    /** @param {number} n */
    function rnum(n) {
      return rlang() === "mr" ? SCR.to(dv(n)) : String(n);
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
      return rmr(tagFor(rp.where[id], rlang()));
    }
    var DAYS_MR = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
      DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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
      var cov = mk("section", "pvcov");
      cov.appendChild(title("h1", "pvh", SCR.to("नित्य उपासना"), "Nitya Upasana"));
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
          ol = null;
        head.appendChild(title("h3", "pvcat", part(nm, "mr"), part(nm, "en")));
        g.secs.forEach(function (/** @type {HTMLElement} */ sec, i) {
          var li = titleOf(sec, "li", "");
          li.setAttribute("data-sid", sec.id);
          if (i % 2 === 0) ol = (i ? rows : head).appendChild(mk("ol", "pvtoc pvtr"));
          ol.appendChild(li);
        });
        cov.appendChild(rows);
      });
      into.appendChild(cov);
    }
    // Page 1 of a routine printout: whose routine and the month, the week at a glance (days × sessions, each cell the
    // numbers of its texts), then the contents in printing order, each text with its tag
    /** @param {HTMLElement} into @param {any} src @param {import("../print/what.js").RoutinePlan} rp */
    function routinePage(into, src, rp) {
      var L = rlang(),
        tw = TAG_WORDS[L],
        now = new Date(),
        cov = mk("section", "pvcov pvrt"),
        h = mk("h1", "pvh pvrh");
      h.textContent = rp.name;
      cov.appendChild(h);
      var sub = mk("p", "pvsub");
      sub.textContent = L === "mr" ? rmr("नित्य उपासना · " + MONTHS.mr[now.getMonth()] + " " + dv(now.getFullYear())) : "Nitya Upasana · " + MONTHS.en[now.getMonth()] + " " + now.getFullYear();
      cov.appendChild(sub);
      if (rp.grid.length) {
        var h3 = mk("h3", "pvcat");
        h3.textContent = L === "mr" ? rmr("आठवडा एका नजरेत") : "The week at a glance";
        if (rp.days.length === 1) h3.textContent = L === "mr" ? rmr(DAYS_MR[rp.days[0]]) : DAYS_EN[rp.days[0]];
        cov.appendChild(h3);
        var tb = mk("table", "pvgrid"),
          th0 = mk("thead"),
          hr = mk("tr");
        hr.appendChild(mk("th"));
        rp.days.forEach(function (d) {
          var th = mk("th");
          th.textContent = rmr(tw.days[d]);
          hr.appendChild(th);
        });
        th0.appendChild(hr);
        tb.appendChild(th0);
        var bd = mk("tbody");
        rp.grid.forEach(function (row) {
          var tr = mk("tr"),
            th = mk("th");
          th.textContent = rmr(tw.sessions[row.session]);
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
      h4.textContent = L === "mr" ? rmr("अनुक्रमणिका") : "Contents";
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
    /** @param {HTMLElement} into @param {string} mode @param {any} src @param {import("../print/what.js").RoutinePlan | null} rp */
    function write(into, mode, src, rp) {
      var side = mode === "side",
        k = plang() === "en" ? "en" : "mr";
      into.innerHTML = "";
      into.setAttribute("data-lang", plang());
      into.setAttribute("data-mode", side ? "side" : "one");
      // one text on its own prints as just that text: no contents (a routine's page 1 always prints)
      if (rp && !(/** @type {any} */ (rp).only)) routinePage(into, src, rp);
      else if (src.secs.length > 1) contents(into, src);
      src.secs.forEach(function (/** @type {HTMLElement} */ sec) {
        var vedic = sec.classList.contains("prose"),
          box = mk("section", "pvs" + (vedic ? " pvved" : ""));
        box.setAttribute("data-sid", sec.id);
        var hd = titleOf(sec, "h2", "pvtitle");
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
            box.appendChild(side ? sideBlock(g, !g[0].classList.contains("rmk")) : proseBlock(g, k));
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
        var cr = /** @type {HTMLElement | null} */ (sec.querySelector(".cr"));
        if (cr) {
          // the author line in the language printed (with both, the main one's), as plain text: its Wikipedia link is
          // for the screen. Inside the last block, so it never lands alone at the top of a page (in one language,
          // after the column, kept with it: inside a stanza it would widen it)
          var c = /** @type {HTMLElement} */ (cr.cloneNode(true)),
            cl = plang() === "both" ? (LEAD === "en" ? "en" : "mr") : k,
            other = c.querySelectorAll(cl === "en" ? ".mr" : ".en");
          [].forEach.call(c.querySelectorAll(".crx"), function (/** @type {Element} */ x) {
            x.remove();
          });
          if (c.querySelector(cl === "en" ? ".en" : ".mr"))
            [].forEach.call(other, function (/** @type {Element} */ x) {
              x.remove();
            });
          var t = c.textContent.replace(/\s+/g, " ").trim();
          if (t) {
            var pc = mk("p", "pvcr");
            pc.textContent = t;
            // inside the last block, so it never goes to a page of its own (Safari doesn't keep a line with the one
            // before it); in a text's column, in its last cell, centred under the column
            var ks = box.querySelectorAll(".pvk"),
              last = ks[ks.length - 1];
            if (!last) box.appendChild(pc);
            else (last.querySelector(".pvsc") || last).appendChild(pc);
          }
        }
        into.appendChild(box);
      });
    }

    var LTR = /-(US|CA|MX|PH)$/i.test(navigator.language || ""),
      // the texts being printed (their Library ids), or null for the whole Library: what the builder's What step
      // has ticked (chosen()), set as Print is tapped, for that printout only. It is put back to null when the printout
      // is done, so the browser's own Print menu prints the whole Library
      /** @type {string[] | null} */
      sel = null;
    // The pop-up's two choices, Portrait and Landscape, for what is printed: one language in a column, upright or
    // sideways; both languages side by side on sideways pages
    function choice() {
      return CHOICE[plang() === "both" ? "both" : "one"];
    }
    // Sideways pages for a layout ("one" or "side"): with both languages, side by side; with one, as the reader
    // last chose in the pop-up (P.por), or its default; upright only while Landscape is held back (FEAT_SW)
    function land(mode) {
      if (!FEAT_SW) return false;
      if (plang() === "both") return mode === "side";
      return (P.por || choice().page) === "land";
    }
    // Letter paper: as picked under How (P.ppr), else as the device's region suggests
    function letter() {
      return P.ppr ? P.ppr === "letter" : LTR;
    }
    // the sheet as it prints, [width, height] in mm
    function sheet(mode) {
      var pp = letter() ? [215.9, 279.4] : [210, 297]; // upright
      return land(mode) ? [pp[1], pp[0]] : pp;
    }
    // The printout's font: one of the same three as Settings → Text font (Modern, Traditional, Bold), picked in the
    // pop-up, else the text font the page is read in. It is the page's font (data-font) only while printing, so
    // picking one for the printout leaves the reading page as it is
    var FONTS = ["std", "classic", "bold"];
    function pfn() {
      return FONTS.indexOf(P.pfn) >= 0 ? P.pfn : FONTS.indexOf(P.fnt) >= 0 ? P.fnt : "classic";
    }
    // The printout's language: picked under How (the original, English or both), else as the page shows it (P.lang).
    // Like the font, it is the printout's only: the reading page keeps its own
    function plang() {
      return ["mr", "en", "both"].indexOf(P.plang) >= 0 ? P.plang : P.lang;
    }
    // The printout's dhrupad (once, or after every verse) likewise: picked in the pop-up, else as the page shows it
    function pref() {
      return P.pref === 0 || P.pref === 1 ? P.pref : P.ref;
    }
    // The fonts the printout uses, asked for ahead (a browser prints only the faces it has loaded): the chosen font's
    // regular and bold, the Vedic texts' Tiro Devanagari Sanskrit, and Kannada letters' when they are on
    function fontsAhead() {
      if (!document.fonts || !document.fonts.load) return;
      var f = pfn(),
        want = f === "classic" ? ['400 16px "SC Classic"', '700 16px "SC Bold"', '400 16px "Tiro Devanagari Sanskrit"'] : f === "bold" ? ['600 16px "SC Bold"', '800 16px "SC Bold"'] : [];
      if (olang() === "kn") want.push(f === "std" ? '400 16px "Noto Sans Kannada"' : '400 16px "SC Kn Classic"');
      want.forEach(function (x) {
        try {
          document.fonts.load(x, "कॅ॑A").catch(function () {});
        } catch (e) {}
      });
    }
    function pon(mode) {
      root.setAttribute("data-print", mode);
      root.setAttribute("data-font", pfn());
      root.setAttribute("data-ref", String(pref()));
    }
    function poff() {
      root.removeAttribute("data-print");
      root.setAttribute("data-font", P.fnt);
      root.setAttribute("data-ref", String(P.ref));
    }

    // ---- The print builder (print redesign P4, mockup 1): What (js/print/what.js), then How (the rows below) ----
    // On a phone one step at a time (data-step on #prm: Next, and ‹ What to print back); from 760px side by side
    // (css/03-menus-print-view.css). The bottom bar keeps the running total and Next or Print.
    var what = createWhat(/** @type {HTMLElement} */ (document.getElementById("prwl")), {
        shelves: shelvesNow,
        today: todaySessions,
        // each person's routine: their own, else the default one (content/routines.json)
        people: function () {
          return people().map(function (p) {
            return { id: p.id, name: p.name, routine: p.routine || loaded.routine || null };
          });
        },
        me: function () {
          var a = active();
          return a ? a.id : "";
        },
        onChange: function () {
          summary();
          preview();
        },
      }),
      bnx = document.getElementById("prnx"),
      wide = window.matchMedia ? matchMedia("(min-width: 760px)") : null;
    // the texts ticked (their Library ids), or null for every text; on the Routine tab, the routine's in routine order
    function chosen() {
      return what.pick();
    }
    // a routine printout's plan (the Routine tab on show), else null
    function rplan() {
      return what.plan();
    }
    // the bottom bar and the preview follow every choice
    function refresh() {
      summary();
      preview();
    }
    // The preview under How: the first page of the first text ticked, as it prints, made small. Written as the print
    // view is (build), into a frame the size of the page, cut off at the page's foot
    var shv = document.getElementById("prsheet"),
      pshown = "";
    // the first text ticked, in the Library's order (as it prints); a routine's first text
    function first() {
      var c = chosen(),
        f = null;
      if (rplan()) return c && c.length ? [c[0]] : null;
      /** @type {any} */ (window).CONTENT.categories.forEach(function (/** @type {any} */ g) {
        g.pieces.forEach(function (/** @type {any} */ p) {
          if (!f && (!c || c.indexOf(p.text) >= 0)) f = p.text;
        });
      });
      return f ? [f] : null;
    }
    function preview() {
      if (pm.hidden) return;
      var M = P.ui === "mr",
        ids = first(),
        rp = rplan(),
        m = dm(),
        k = ids ? [m, ids[0], plang(), LEAD, pref(), P.tr, P.ind, pfn(), land(m), letter(), rp ? rp.key : ""].join("|") : "",
        sh = sheet(m),
        w = 120; // its width (css/03-menus-print-view.css .prsheet)
      shv.setAttribute("aria-label", M ? "पहिल्या पानाची झलक" : "Preview of the first page");
      shv.style.height = Math.round((w * sh[1]) / sh[0]) + "px";
      if (k === pshown && shv.firstChild) return;
      pshown = k;
      shv.textContent = "";
      if (!ids) return;
      // (a routine's first text with its tag, without page 1)
      var box = document.createElement("div");
      box.id = "pv";
      build(m, ids, rp ? Object.assign({}, rp, { only: true }) : null, box);
      var mm = 96 / 25.4,
        f = document.createElement("iframe");
      f.setAttribute("aria-hidden", "true");
      f.tabIndex = -1;
      f.title = "Preview";
      f.style.cssText = "border:0;width:" + sh[0] * mm + "px;height:" + sh[1] * mm + "px;transform-origin:0 0;transform:scale(" + w / (sh[0] * mm) + ")";
      shv.appendChild(f);
      try {
        var d = /** @type {Document} */ (f.contentDocument);
        d.open();
        d.write('<!doctype html><html data-print="' + m + '"' + attrs() + '><head><base href="' + location.href.replace(/"/g, "%22") + '"><style>' + pcss() + "\nhtml,body{margin:0;overflow:hidden;background:#fff}body{box-sizing:content-box;padding:17mm 19mm 0;height:" + (sh[1] - 36) + "mm}</style></head><body>" + box.outerHTML + "</body></html>");
        d.close();
      } catch (e) {}
    }
    // the paper, and the button that changes it (Letter or A4)
    function paperRow() {
      var M = P.ui === "mr",
        o = letter() ? "A4" : "Letter";
      document.getElementById("prp").textContent = document.getElementById("prq").textContent = letter() ? "Letter" : "A4";
      document.getElementById("prpa").textContent = M ? o + " वापरा" : "Use " + o;
      // Safari keeps the paper picked in its own dialog: when it is not the region's, it is told to pick it there
      [].forEach.call(document.querySelectorAll(".przp"), function (/** @type {HTMLElement} */ x) {
        x.textContent = letter() ? "Letter" : "A4";
      });
      document.getElementById("prz").hidden = !(root.classList.contains("wk") && letter() !== LTR);
    }
    document.getElementById("prpa").onclick = function () {
      change({ ppr: letter() ? "a4" : "letter" });
      paperRow();
      refresh();
    };
    // the bottom bar: "5 texts" (or the one text's name), or that a text must be picked (Next and Print wait for one)
    function summary() {
      var w = whatWords(),
        t = what.total(),
        el = document.getElementById("prsum");
      el.textContent = "";
      el.lang = P.ui === "mr" ? "mr" : "en";
      var a = document.createElement("span");
      // one text: its name
      a.textContent = t.one || (t.texts ? w.texts(t.texts) : w.pick);
      if (t.one) a.lang = t.oneLang;
      el.appendChild(a);
      bpr.disabled = bnx.disabled = !t.texts;
    }
    function step(s) {
      pm.setAttribute("data-step", s);
      pm.scrollTop = 0;
    }
    bnx.onclick = function () {
      step("how");
      bpr.focus({ preventScroll: true });
    };
    document.getElementById("prbk").onclick = function () {
      step("what");
      bnx.focus({ preventScroll: true });
    };
    // The page as it prints: the browser is told with @page, set as each printout is made (Chrome, Edge and
    // Firefox follow it; Safari keeps the sheet the reader picks in its dialog, so the pop-up tells them to
    // pick Landscape there)
    var pst = document.createElement("style");
    pst.media = "print";
    document.head.appendChild(pst);
    function setPage(mode) {
      // the paper only when picked under How: otherwise the printer's own, as before
      var sz = P.ppr ? (letter() ? "letter " : "A4 ") : "";
      pst.textContent = sz || land(mode) ? "@page { size: " + sz + (land(mode) ? "landscape" : "portrait") + " }" : "";
    }
    // Above the choices: the dhrupad setting for the printout and its font (the three of Settings → Text font), with
    // a word of the text in each; neither changes the reading page
    var fn = document.getElementById("prfn"),
      dh = document.getElementById("prdg");
    [].forEach.call(document.querySelectorAll("#sfn button"), function (b) {
      fn.appendChild(b.cloneNode(true));
    });
    // each font a tile: a word of the text in that font (set in rows), over the font's name (mockup 1)
    [].forEach.call(fn.children, function (b) {
      var nm = document.createElement("span"),
        x = document.createElement("span");
      nm.className = "prfm";
      x.className = "prfx";
      x.setAttribute("aria-hidden", "true");
      while (b.firstChild) nm.appendChild(b.firstChild);
      b.appendChild(x);
      b.appendChild(nm);
    });
    fn.onclick = function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      change({ pfn: b.dataset.v });
      fontsAhead();
      rows();
      refresh();
    };
    // the sample line in the printout's font (set here: the page's own font rules follow the text font)
    var FAM = { classic: "SC Classic", bold: "SC Bold" };
    // the sample: the first words of the first verse, in each language printed (the main one first), in the
    // printout's font. Set here: the page's own font rules follow the text font
    /** @param {string} lang @param {string} [font] (else the printout's) */
    function fam(lang, font) {
      var f = font || pfn(),
        kn = lang === "kn",
        base = kn ? '"Noto Sans Kannada", var(--body)' : lang === "en" ? "var(--lat)" : "var(--body)";
      // (Kannada letters: Noto Serif Kannada for Traditional and Bold alike, css/09-settings-page.css)
      return f === "std" ? base : '"' + (kn ? "SC Kn Classic" : FAM[f]) + '", ' + base;
    }
    function words(k) {
      var a1 = pieceEl("a1"), // (built if not opened yet: js/core/page.js)
        p = a1 && a1.querySelector(".item:not(.dh) .verse ." + k + " p"),
        t = p ? p.textContent.replace(/\s+/g, " ").trim() : "";
      t = t.split(/[,|।]/)[0].trim();
      return t.length > 26 ? t.slice(0, 26).replace(/\s+\S*$/, "") + "…" : t;
    }
    function rows() {
      var or = P.ind === "kn" ? "kn" : "mr",
        ks = plang() === "both" ? (LEAD === "en" ? ["en", "mr"] : ["mr", "en"]) : [plang() === "en" ? "en" : "mr"];
      [].forEach.call(dh.children, function (b) {
        b.setAttribute("aria-pressed", b.dataset.v === String(pref()) ? "true" : "false");
      });
      // each tile: the first word of the text in the main language printed, in that tile's font (in the language of
      // the word, not as .mr or .en: those follow the menus' language here)
      var lang = ks[0] === "en" ? "en" : or,
        w = words(ks[0]).split(" ")[0].replace(/…$/, "");
      [].forEach.call(fn.children, function (b) {
        b.setAttribute("aria-pressed", b.dataset.v === pfn() ? "true" : "false");
        var x = b.querySelector(".prfx");
        x.textContent = w;
        x.setAttribute("lang", lang);
        x.style.setProperty("font-family", fam(lang, b.dataset.v), "important");
        x.style.setProperty("font-weight", b.dataset.v === "bold" ? "600" : "400", "important");
      });
    }
    dh.onclick = function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      change({ pref: +b.dataset.v });
      rows();
      refresh();
    };
    // the site's CSS as the printer sees it: print rules on, screen-only rules off, no @page
    function pcss() {
      if (pcss.t) return pcss.t;
      var out = [];
      function walk(rules) {
        [].forEach.call(rules, function (r) {
          if (r.type === 4) {
            var m = r.media.mediaText;
            if (/print/.test(m)) walk(r.cssRules);
            else if (!/screen/.test(m)) out.push(r.cssText);
          } else if (r.type !== 6) out.push(r.cssText);
        });
      }
      [].forEach.call(document.styleSheets, function (sh) {
        try {
          walk(sh.cssRules);
        } catch (e) {}
      });
      return (pcss.t = out.join("\n"));
    }
    // the page's own attributes as the printout has them (its font and dhrupad), for a copy of it in a frame
    function attrs() {
      var at = "";
      [].forEach.call(root.attributes, function (a) {
        var v = a.name === "data-font" ? pfn() : a.name === "data-ref" ? String(pref()) : a.value;
        if (a.name !== "data-print") at += " " + a.name + '="' + v.replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '"';
      });
      return at;
    }
    // the browser's own menu prints what the pop-up offers first: one language in a column, both side by side
    function dm() {
      return plang() === "both" && FEAT_SW ? "side" : "one";
    }
    // ---- Opening the print dialog ----
    // Safari and every iOS browser open the print dialog only in answer to a tap. The print view is written at once
    // (nothing is measured), so Print opens it from the same tap; should a browser still ignore it, the pop-up comes
    // back with one button, Print now, whose own tap opens the dialog.
    var iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
      standalone = navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
    // the page choice as chosen, and Safari's Landscape note with it
    function pages1() {
      var up = !land("one");
      b1.setAttribute("aria-pressed", String(up));
      b2.setAttribute("aria-pressed", String(!up));
      document.getElementById("prl").hidden = !(root.classList.contains("wk") && land(dm()));
    }
    bpr.onclick = function () {
      var m = dm();
      go(m === "one" ? "as" : m);
    };
    // the pop-up: the choices (ready false), or Print now (ready true)
    function pmMode(ready) {
      bpr.hidden = pn.hidden = po.hidden = ready;
      document.getElementById("prst").hidden = document.getElementById("prsum").hidden = bnx.hidden = ready;
      // (neither step: the title shows, without ‹ What to print)
      if (ready) pm.setAttribute("data-step", "ready");
      // both languages print side by side on Landscape only (stacked took a third more paper): no choice to
      // make, the row just says so; upright only while Landscape is held back (FEAT_SW)
      var one = !FEAT_SW || plang() === "both";
      document.getElementById("prpg").hidden = one;
      document.getElementById("prpv").hidden = !one;
      // Safari keeps the sheet picked in its own dialog: it is told to pick Landscape there
      document.getElementById("prl").hidden = !(root.classList.contains("wk") && land(dm()));
      // Safari on a Mac: Chrome turns the page itself and prints the border and page numbers (Satish, 2026-10)
      document.getElementById("prc").hidden = !root.classList.contains("wk") || iOS;
      bgo.hidden = !ready;
      pw.hidden = pv2.hidden = bsf.hidden = bcp.hidden = true;
    }
    // ---- The iPhone Home Screen app cannot print: hand the printout over to Safari ----
    // Safari opens at this site's address with the print choices in it (read by js/render.js), and offers
    // Print now there. iOS 17 and later open an x-safari-https:// address in Safari; Copy link is for the rest.
    // On Satish's iPhone neither the Print tap nor a second one (Print now) opened the dialog in the app, so the
    // app goes straight to this step once a layout is chosen.
    function link(mode) {
      var s = {};
      ["lang", "lead", "l2", "ui", "ind", "ref", "pref", "fnt", "pfn", "plang", "ppr", "tr", "por"].forEach(function (k) {
        s[k] = P[k];
      });
      var rp = rplan(),
        r = "";
      // a routine printout: whose (name and routine: Safari keeps its own storage) and the days and sessions chosen
      if (rp) {
        var c = what.routine();
        r = "&r=" + encodeURIComponent(JSON.stringify({ n: rp.name, r: rp.routine, w: c.span, d: rp.days, s: c.sessions }));
      }
      return location.origin + location.pathname + "?print=" + mode + "&s=" + encodeURIComponent(JSON.stringify(s)) + (chosen() ? "&t=" + /** @type {string[]} */ (chosen()).join(",") : "") + r;
    }
    // open: the pop-up is already open (its Back step is in place); tapped: Print now was tapped and the
    // dialog still did not open (not the Home Screen app: another app's browser, or Safari holding it back),
    // so the note names Share → Print too
    function toSafari(open, tapped) {
      pmMode(true);
      bgo.hidden = true;
      bsf.hidden = bcp.hidden = false;
      pw.hidden = !!tapped;
      pv2.hidden = !tapped;
      if (!open) ovPush();
      pm.hidden = false;
      bsf.focus();
    }
    bsf.onclick = function () {
      var u = "x-safari-" + link(last);
      bsf.setAttribute("data-to", u); // (for the tests)
      location.href = u;
    };
    bcp.onclick = function () {
      var u = link(last);
      try {
        navigator.clipboard.writeText(u).then(
          function () {
            flash("लिंक कॉपी झाली: Safari मध्ये पेस्ट करा", "Link copied: paste it into Safari");
          },
          function () {
            window.prompt("Copy this link and paste it into Safari", u);
          },
        );
      } catch (e) {
        window.prompt("Copy this link and paste it into Safari", u);
      }
    };
    // print, and if the browser ignored it, offer Print now (or, after a Print now tap, say why)
    function tryPrint(again) {
      seen = false;
      window.print();
      setTimeout(function () {
        if (seen || !busy) return;
        if (!again) return ready();
        // a tap did not open it either: the iPhone Home Screen app (on some iOS versions) cannot print, and
        // neither can some apps' own browsers (a link opened from a chat app)
        if (!iOS) return unready();
        unready();
        toSafari(false, !standalone);
      }, 1000);
    }
    function ready() {
      pmMode(true);
      ovPush();
      pm.hidden = false;
      bgo.focus();
    }
    bgo.onclick = function () {
      pm.hidden = true;
      ovDrop();
      tryPrint(true);
    };
    // a print view left waiting for Print now (the pop-up closed instead) is put away
    function unready() {
      if (!busy) return;
      busy = false;
      sel = null;
      poff();
    }
    function go(mode) {
      last = mode;
      // the iPhone Home Screen app cannot print: straight to Open in Safari
      if (iOS && standalone) return toSafari(true);
      pm.hidden = true;
      ovDrop();
      // the chosen button has just been hidden: keyboard focus goes back to Print, not to the top of the page
      focusBack(opener || document.getElementById("asp"));
      busy = true;
      if (mode === "as") mode = "one";
      sel = chosen();
      job = { m: mode, ids: sel, rp: rplan() };
      setPage(mode);
      build(mode, sel, rplan());
      pon(mode);
      tryPrint(false);
    }
    // Open the builder: at What with the ticks as last left; with a session (tab "today"), at What on the Today tab with
    // it chosen; with a text, just it ticked and at How (on a phone; ‹ What to print shows the choice)
    /** @param {{ ids?: string[], tab?: string, from?: HTMLElement | null }} [o] */
    function openPrint(o) {
      o = o || {};
      opener = o.from || document.getElementById("asp");
      unready();
      pmMode(false);
      // the language names follow what is printed: the original's place holds Marathi or Kannada, and with
      // both languages shown the main one comes first (left, or on top)
      var M = P.ui === "mr",
        en = M ? "इंग्रजी" : "English",
        or = (NAMES[P.ind] || NAMES.mr)[M ? 0 : 1],
        l1 = LEAD === "en" ? en : or,
        l2 = LEAD === "en" ? or : en;
      // the page: Portrait or Landscape (one language), a tap picks it; both languages: Landscape, side by side
      function opt(b, page) {
        b.textContent = page === "land" ? (M ? "आडवे" : "Landscape") : M ? "उभे" : "Portrait";
        b.setAttribute("data-page", page);
        b.onclick = function () {
          change({ por: page });
          pages1();
          refresh();
        };
      }
      opt(b1, "up");
      opt(b2, "land");
      // the language: the main one, the other, or both (the main one first, as on the page). Both prints side by side
      // on Landscape, so the page row then says so instead of offering a choice
      var lg = document.getElementById("prlg"),
        LV = LEAD === "en" ? ["en", "mr", "both"] : ["mr", "en", "both"];
      lg.textContent = "";
      LV.forEach(function (v) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("data-v", v);
        b.textContent = v === "both" ? (M ? "दोन्ही" : "Both") : v === "en" ? en : or;
        lg.appendChild(b);
      });
      lg.onclick = function (e) {
        var b = /** @type {HTMLElement} */ (e.target).closest("button");
        if (!b) return;
        change({ plang: b.getAttribute("data-v") });
        langRow();
        pmMode(false);
        pages1();
        rows();
        refresh();
      };
      langRow();
      document.getElementById("prpv").textContent = !FEAT_SW
        ? M
          ? "उभे: वर " + l1 + ", खाली " + l2
          : "Portrait: " + l1 + " above " + l2
        : M
          ? "आडवे: शेजारी शेजारी"
          : "Landscape, side by side";
      pages1();
      rows();
      paperRow();
      document.getElementById("prx").setAttribute("aria-label", M ? "रद्द" : "Cancel");
      // What, drawn afresh (the Library's categories, the reading languages and the menu language may have changed)
      // a session is the Today tab's choice, and the Library tab starts with nothing ticked, so a text ticked there
      // prints on its own (not with the session's texts)
      if (o.ids && o.tab === "today") {
        what.today(o.ids);
        what.set([]);
      } else if (o.ids) what.set(o.ids);
      what.tab(o.tab || "texts");
      what.render();
      fontsAhead();
      // on a phone, a session (the Today tab, with the session chosen) opens at What, so another one is a tap away;
      // a text opens at How
      var how = !!o.ids && o.tab !== "today";
      step(how ? "how" : "what");
      ovPush();
      pm.hidden = false;
      refresh();
      // (a card taller than the screen stays at its top: Next or Print is in the bar at the bottom)
      (how || (wide && wide.matches) ? bpr : bnx).focus({ preventScroll: true });
    }
    var opener = /** @type {HTMLElement | null} */ (null);
    function langRow() {
      [].forEach.call(document.getElementById("prlg").children, function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === plang()));
      });
    }
    // The builder opened from elsewhere (the tests; a future entry point): the event "nitya-print", its detail as for
    // openPrint ({ ids, tab }). Print and Print this text are no longer in ⋯ More (Satish, 2026-10-22): Print in the
    // bottom bar opens it, at the session or the text being read, and its Library tab picks any texts
    document.addEventListener("nitya-print", function (e) {
      openPrint(/** @type {CustomEvent} */ (e).detail || {});
    });
    // Print in the bottom bar: while reading, the session being read (js/features/today-card.js runIds), else the text
    // on screen; on Home, the session Home shows. A session opens at What on the Today tab, with it chosen; a text at How
    document.getElementById("asp").onclick = function () {
      var b = document.getElementById("asp"),
        ids = runIds(),
        sec = cur(),
        t = null;
      if (!sec && !(ids && ids.length))
        ids = (todaySessions().filter(function (s) {
          return s.session === shownSession();
        })[0] || { ids: [] }).ids;
      if (ids && ids.length) return openPrint({ ids: ids, tab: "today", from: b });
      shelvesNow().forEach(function (s) {
        s.texts.forEach(function (x) {
          if (sec && x.sec === sec.id) t = x;
        });
      });
      openPrint(t ? { ids: [t.id], from: b } : { from: b });
    };
    function pmClose() {
      unready();
      pm.hidden = true;
      ovDone();
      focusBack(opener || document.getElementById("asp"));
    }
    document.getElementById("prx").onclick = pmClose;
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !pm.hidden) pmClose();
    });
    pm.addEventListener("click", function (e) {
      if (e.target === pm) pmClose();
    });
    // Printing from the browser's own menu (or Share → Print on a phone) gets the same print view (one
    // language in a column, both side by side): contents, then every piece, never the home page
    // Safari lays the page out again after afterprint (its print sheet, a change of paper there): until the reader is
    // back on the page, that is still the printout chosen, not the whole Library
    window.addEventListener("beforeprint", function () {
      seen = true;
      if (!busy) {
        var j = again || { m: dm(), ids: null, rp: null };
        setPage(j.m);
        build(j.m, j.ids, j.rp);
        pon(j.m);
      }
    });
    // a tap or a key on the page (Ctrl+P too): the reader is back, and the browser's own Print prints the whole Library
    ["pointerdown", "keydown"].forEach(function (t) {
      document.addEventListener(
        t,
        function () {
          again = null;
        },
        true,
      );
    });
    window.addEventListener("afterprint", function () {
      if (busy) again = job;
      busy = false;
      sel = null;
      poff();
    });
    // Opened by the Home Screen app's Open in Safari (see js/render.js): the printout once the fonts are in, then
    // Print now asks for the tap that Safari needs
    if (window.PRQ) {
      var mode = window.PRQ;
      window.PRQ = "";
      what.set(window.PRT || null);
      // a routine printout (Open in Safari carries it: js/render.js reads it)
      var rr = /** @type {any} */ (window).PRR;
      if (rr && rr.days.length) what.carry({ id: "link", name: rr.name, routine: cleanRoutine(rr.routine) }, { who: "link", span: rr.span, days: rr.days, day: rr.days[0], sessions: rr.sessions });
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
        setTimeout(function () {
          go(mode);
        }, 300);
      });
    }
  })();
}

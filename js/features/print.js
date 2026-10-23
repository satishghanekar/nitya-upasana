// Print
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { flash, pieceEl, root } from "../core/page.js";
import { LEAD, P, change } from "../core/state.js";
import { DV } from "../text/line-breaks.js";
import { fit } from "../print/fit.js";
import { plan, choose, splitPoint, splitAt } from "../print/pages.js";
import { LAYOUT } from "../print/profiles.js";
import { ovDone, ovDrop, ovPush } from "./history.js";
import { focusBack } from "./more-menu.js";
import { FEAT_SW } from "../core/features.js";
import { CHOICE } from "../print/profiles.js";
import { compose } from "../print/compose.js";
import { createWhat, whatWords } from "../print/what.js";
import { shelvesNow } from "./library.js";
import { todaySessions, runIds } from "./today-card.js";
import { cur } from "../core/apply.js";
import { active, list as people } from "../store/store.js";
import { loaded } from "../text/load.js";
import { MONTHS, dv } from "../core/words.js";
import { TAG_WORDS, tagFor } from "../print/select.js";
import { cleanRoutine } from "../core/routine.js";

export function init() {
  // Print: single column (as on screen; running paragraphs for a prose piece in one language), or, with both
  // languages shown, Marathi | English side by side or one above the other.
  // A separate print view (#pv) is built from the visible text just before printing, so that
  // a heading always stays with its dhrupad and first stanza and stanzas are never split.
  (function () {
    var pm = document.getElementById("prm"),
      pv = document.getElementById("pv"),
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
      seen = false; // the browser has started printing (beforeprint) since the last window.print()
    // the original's language, by the letters it is shown in (P.ind), as the Print pop-up names it: in Marathi
    // menus, then in English. A new script (js/render.js) adds its name here.
    var NAMES = { mr: ["मराठी", "Marathi"], kn: ["कन्नड", "Kannada"] };
    function lbl(m, e) {
      return '<span class="mr">' + m + '</span><span class="en" lang="en">' + e + "</span>";
    }
    function cl(el) {
      var c = el.cloneNode(true);
      c.removeAttribute("id");
      [].forEach.call(c.querySelectorAll("[id]"), function (x) {
        x.removeAttribute("id");
      });
      return c;
    }
    // A block of the printout (.pvk): what is never split between pages, unless it runs on (js/print/pages.js).
    // o.keep: kept on the same page as the block after it; o.flow: may run on to the next page between its lines;
    // o.span: across the whole page (a title, the contents' headings), never in a column
    /** @param {Node[]} nodes @param {{ keep?: boolean, flow?: boolean, span?: boolean, cls?: string }} [o] */
    function keep(nodes, o) {
      var d = document.createElement("div");
      d.className = "pvk" + (o && o.cls ? " " + o.cls : "");
      if (o && o.keep) d.setAttribute("data-keep", "1");
      if (o && o.flow) {
        d.setAttribute("data-flow", "1");
        d.classList.add("pvflow");
      }
      if (o && o.span) d.setAttribute("data-span", "1");
      nodes.forEach(function (n) {
        d.appendChild(n);
      });
      return d;
    }
    // A prose piece (layout: prose in its text file, content/texts/) printed in one language reads as running paragraphs, as in a printed
    // booklet: its stanzas run on, each line after the last, and a paragraph starts at a stanza marked para
    // or a dh stanza (said once: a paragraph of its own; one of a single line, the closing peace chant, is
    // centred). Each paragraph is one item; its lines keep their data-l.
    // the paragraphs of a Vedic text: a new one at a stanza marked para, and a stanza said once (dh) on its own
    function paras(units) {
      var gs = [],
        cur = null;
      units.forEach(function (u) {
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
    function prose(units) {
      return paras(units).map(function (g) {
        var it = document.createElement("div"),
          v = document.createElement("div");
        it.className = "item pvpara";
        v.className = "pvprose";
        ["mr", "en"].forEach(function (k) {
          var c = document.createElement("div"),
            p = document.createElement("p");
          c.className = k;
          if (k === "en") c.setAttribute("lang", "en");
          p.className = "pvpr";
          g.forEach(function (u) {
            [].forEach.call(u.querySelectorAll(".verse ." + k + " p"), function (x) {
              var s = document.createElement("span");
              s.className = "pvln";
              if (x.hasAttribute("data-l")) s.setAttribute("data-l", x.getAttribute("data-l"));
              s.innerHTML = x.innerHTML.replace(/<br[^>]*>/gi, " ");
              // a line's preferred break points (.zs) are for lines of verse: here the words just run on
              [].forEach.call(s.querySelectorAll(".zs"), function (z) {
                while (z.firstChild) z.parentNode.insertBefore(z.firstChild, z);
                z.parentNode.removeChild(z);
              });
              glue(s);
              if (p.firstChild) p.appendChild(document.createTextNode(" "));
              p.appendChild(s);
            });
          });
          c.appendChild(p);
          v.appendChild(c);
        });
        if (g.length === 1 && g[0].classList.contains("dh") && g[0].querySelectorAll(".verse .mr p").length === 1) it.classList.add("pvcen");
        it.appendChild(v);
        return it;
      });
    }
    // A danda (। ॥, | in English) stays at the end of the line with the word before it, and a verse number
    // stays whole (॥ १ ॥): each such run is kept on one line (.pvnb). (Not by unbreakable spaces: a line may
    // still break after a danda, before one.)
    function glue(el) {
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT),
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
          s.className = "pvnb";
          s.textContent = m[0];
          f.appendChild(document.createTextNode(t.slice(at, m.index)));
          f.appendChild(s);
          at = m.index + m[0].length;
        }
        if (!at) return;
        f.appendChild(document.createTextNode(t.slice(at)));
        n.parentNode.replaceChild(f, n);
      });
    }
    function td(nodes) {
      var t = document.createElement("td");
      nodes.forEach(function (n) {
        t.appendChild(n);
      });
      return t;
    }
    // Build the print view (#pv): contents, then every piece in the text language, from a copy of the pieces made
    // for it (js/print/compose.js), so whatever the reading page has folded or hidden is printed in full.
    // mode: "one" (one column) or "side" (Marathi and English side by side). ids: the texts printed (their Library
    // ids), or null for every text. rp: a routine printout (the builder's Routine tab, P5): its texts in routine order,
    // page 1 with the week at a glance, and each text's tag under its title
    /** @param {string} mode @param {string[] | null} ids @param {import("../print/what.js").RoutinePlan | null} [rp] */
    function build(mode, ids, rp) {
      var src = compose(ids, plang(), !!rp);
      try {
        build2(mode, src, rp || null);
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
    // Page 1 of a routine printout (PLAN §3 A, mockup 3): whose routine and the month, the week at a glance (days ×
    // sessions, each cell the numbers of its texts), then the contents in printing order, each text with its tag.
    // Built as blocks (keep), so the page plan (js/print/pages.js) lays it out like any other page
    /** @param {{ secs: HTMLElement[] }} src @param {import("../print/what.js").RoutinePlan} rp */
    function routinePage(src, rp) {
      var L = rlang(),
        tw = TAG_WORDS[L],
        now = new Date(),
        cov = cover(true),
        h = document.createElement("h1");
      h.className = "pvh pvrh";
      h.textContent = rp.name;
      var sub = document.createElement("p");
      sub.className = "pvsub";
      sub.textContent = L === "mr" ? rmr("नित्य उपासना · " + MONTHS.mr[now.getMonth()] + " " + dv(now.getFullYear())) : "Nitya Upasana · " + MONTHS.en[now.getMonth()] + " " + now.getFullYear();
      var top = [h, sub];
      if (rp.grid.length) {
        var h3 = document.createElement("h3");
        h3.textContent = L === "mr" ? rmr("आठवडा एका नजरेत") : "The week at a glance";
        if (rp.days.length === 1) h3.textContent = L === "mr" ? rmr(DAYS_MR[rp.days[0]]) : DAYS_EN[rp.days[0]];
        top.push(h3);
        var tb = document.createElement("table"),
          hr = document.createElement("tr");
        tb.className = "pvgrid";
        hr.appendChild(document.createElement("th"));
        rp.days.forEach(function (d) {
          var th = document.createElement("th");
          th.textContent = rmr(tw.days[d]);
          hr.appendChild(th);
        });
        var th0 = document.createElement("thead");
        th0.appendChild(hr);
        tb.appendChild(th0);
        var bd = document.createElement("tbody");
        rp.grid.forEach(function (row) {
          var tr = document.createElement("tr"),
            th = document.createElement("th");
          th.textContent = rmr(tw.sessions[row.session]);
          tr.appendChild(th);
          row.cells.forEach(function (c) {
            var td = document.createElement("td");
            td.textContent = c.nums.length ? c.nums.map(rnum).join(" ") : "–";
            if (!c.nums.length) td.className = "pvnone";
            tr.appendChild(td);
          });
          bd.appendChild(tr);
        });
        tb.appendChild(bd);
        top.push(tb);
      }
      cov.appendChild(keep(top, { span: true, keep: true }));
      var h4 = document.createElement("h3");
      h4.textContent = L === "mr" ? rmr("अनुक्रमणिका") : "Contents";
      cov.appendChild(keep([h4], { span: true, keep: true }));
      // the contents in one column (each text's tag beside it)
      src.secs.forEach(function (sec) {
        var tg = document.createElement("span");
        tg.className = "pvtag";
        tg.textContent = rtag(rp, textOf(sec.id));
        cov.appendChild(entry(sec, [tg], true));
      });
      pv.appendChild(cov);
    }
    var DAYS_MR = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
      DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    // the first pages: the title and the contents (data-sid "", not a text)
    function cover(routine) {
      var cov = document.createElement("section");
      cov.className = "pvcov pvtoc" + (routine ? " pvrt" : "");
      return cov;
    }
    // A line of the contents: the text's number and title as its heading shows them, and its page (.pgn, filled in when
    // the pages are planned: a placeholder as wide as a page number until then). In one column (span) on a routine's
    // page 1, else in the contents' two columns
    /** @param {HTMLElement} sec @param {Node[]} extra @param {boolean} span */
    function entry(sec, extra, span) {
      var ol = document.createElement("ol"),
        li = document.createElement("li"),
        pg = document.createElement("span");
      li.innerHTML = sec.querySelector("header h2").innerHTML;
      li.setAttribute("data-sid", sec.id);
      extra.forEach(function (x) {
        li.appendChild(x);
      });
      pg.className = "pgn";
      pg.textContent = "000";
      li.appendChild(pg);
      ol.appendChild(li);
      return keep([ol], { span: span, cls: "pvte" });
    }
    // the title and the contents page: the categories and their pieces in order (js/print/compose.js)
    function contents(src) {
      var cov = cover(false),
        h = document.createElement("h1");
      h.className = "pvh";
      h.innerHTML = lbl(SCR.to("नित्य उपासना"), "Nitya Upasana");
      cov.appendChild(keep([h], { span: true, keep: true }));
      src.groups.forEach(function (g) {
        if (!g.secs.length) return;
        var h3 = document.createElement("h3");
        g.name.forEach(function (x) {
          h3.appendChild(x.cloneNode(true));
        });
        cov.appendChild(keep([h3], { span: true, keep: true }));
        g.secs.forEach(function (sec) {
          cov.appendChild(entry(sec, [], false));
        });
      });
      pv.appendChild(cov);
    }
    // What a piece prints, by what each part of it is (never by what the reading page happens to show): the dhrupad at
    // the top and its ↻ markers with the dhrupad "once", its repeats after each stanza with "after every verse"
    // (the text file's refrain), every stanza, every line said once, and every note of the text's own.
    // Returns its parts in order, each with its role.
    /** @param {HTMLElement} sec @returns {{ el: HTMLElement, role: string }[]} */
    function parts(sec) {
      var once = pref() === 1,
        out = [],
        rt = sec.querySelector(".rftop");
      if (rt && once) {
        var r = cl(rt);
        r.classList.add("pvref");
        out.push({ el: r, role: "refrain" });
      }
      [].forEach.call(sec.querySelectorAll(".items > .item, .items > .rmk"), function (/** @type {HTMLElement} */ u) {
        var role = "";
        if (u.classList.contains("rmk") && u.classList.contains("nt"))
          // a note of the text's own: "↻ ३ वेळा" (repeat the lines above) belongs to what is before it, a heading such
          // as फलश्रुति to what follows
          role = /^\s*↻/.test((u.querySelector(".mr") || u).textContent) ? "after" : "before";
        else if (u.classList.contains("rmk")) role = once ? "after" : "";
        else if (u.classList.contains("rf")) role = once ? "" : "after";
        else role = "main";
        if (role) out.push({ el: cl(u), role: role });
      });
      return out;
    }
    // The parts grouped into blocks: a heading note with what follows it; a marker, a repeated dhrupad or a "3 times"
    // with the stanza before it; the dhrupad at the top kept with the first stanza
    // (verse: a stanza, which two columns must hold whole; a line said once, a closing line or a note may instead run
    // across both columns)
    /** @param {{ el: HTMLElement, role: string }[]} ps @returns {{ els: HTMLElement[], keep?: boolean, verse?: boolean }[]} */
    function group(ps) {
      var out = [],
        head = [];
      ps.forEach(function (x) {
        var last = out[out.length - 1];
        if (x.role === "refrain") out.push({ els: [x.el], keep: true, verse: true });
        else if (x.role === "before") head.push(x.el);
        else if (x.role === "after" && last && !last.keep) last.els.push(x.el);
        else {
          out.push({ els: head.concat([x.el]), verse: x.role === "main" && x.el.classList.contains("item") && !x.el.classList.contains("dh") });
          head = [];
        }
      });
      if (head.length) out.push({ els: head });
      return out;
    }
    // Side by side: a table of rows, each line of the original beside its English line, for the parts given
    /** @param {HTMLElement[]} us @param {boolean} [flow] a Vedic text (its rows run on from page to page) */
    function sideTable(us, flow) {
      var t = document.createElement("table");
      t.className = "pvt pvside" + (flow ? " pvprs" : "");
      // column widths (the English line is longer than its Devanagari, so its column is wider)
      var cg = document.createElement("colgroup");
      (LEAD === "en" ? ["pvce", "pvcm"] : ["pvcm", "pvce"]).forEach(function (c) {
        var col = document.createElement("col");
        col.className = c;
        cg.appendChild(col);
      });
      t.appendChild(cg);
      us.forEach(function (u) {
        if (u.classList.contains("rmk")) {
          var tr = document.createElement("tr"),
            c = td([u]);
          c.colSpan = 2;
          tr.appendChild(c);
          t.appendChild(tr);
          return;
        }
        var lab = u.querySelector(".lab");
        if (lab) {
          var lr = document.createElement("tr"),
            lc = td([lab]);
          lc.colSpan = 2;
          lr.appendChild(lc);
          t.appendChild(lr);
        }
        var v = u.querySelector(".verse");
        if (!v) return;
        var ms = v.querySelectorAll(".mr p"),
          es = v.querySelectorAll(".en p"),
          bold = u.classList.contains("pvref") || v.classList.contains("bold");
        [].forEach.call(ms, function (mp, i) {
          var tr = document.createElement("tr");
          // the dhrupad at the top is bold; its repeats after each stanza are lighter, as on screen
          if (bold) tr.className = "pvb";
          if (u.classList.contains("pvref")) tr.className += " pvrefrow";
          if (i === ms.length - 1) tr.className += " pvend";
          var a = document.createElement("td"),
            b = document.createElement("td");
          a.className = "pvm mr";
          b.className = "pve en";
          // the original's language as the page marks it (Marathi, or the language of the letters it is shown in)
          a.setAttribute("lang", (mp.closest("[lang]") || root).getAttribute("lang") || "mr");
          b.setAttribute("lang", "en");
          a.innerHTML = mp.innerHTML;
          b.innerHTML = es[i] ? es[i].innerHTML : "";
          if (mp.classList.contains("rf") || u.classList.contains("rf")) tr.classList.add("rfl");
          // English first (Settings → In Both, show first): English on the left
          tr.appendChild(LEAD === "en" ? b : a);
          tr.appendChild(LEAD === "en" ? a : b);
          t.appendChild(tr);
        });
      });
      return t;
    }
    /** @param {string} mode @param {any} src @param {import("../print/what.js").RoutinePlan | null} rp */
    function build2(mode, src, rp) {
      pv.innerHTML = "";
      pv.removeAttribute("data-paged");
      pv.setAttribute("data-lang", plang());
      var side = mode === "side";
      // one text on its own prints as just that text: no title or contents page (a routine's page 1 always prints)
      if (rp && !(/** @type {any} */ (rp).only)) routinePage(src, rp);
      else if (src.secs.length > 1) contents(src);
      src.secs.forEach(function (sec) {
        var box = document.createElement("section"),
          vedic = sec.classList.contains("prose");
        box.className = "pvs" + (vedic ? " pvved" : "") + (side ? " pvsd" : "");
        box.setAttribute("data-sid", sec.id);
        // the title, across the page and kept with what follows it
        var hd = document.createElement("h2");
        hd.innerHTML = sec.querySelector("h2").innerHTML;
        // a routine printout: the text's tag under its title (PLAN §3 B), inside the title so it always stays with it
        if (rp) {
          var tg = document.createElement("span");
          tg.className = "pvtag";
          tg.textContent = rtag(rp, textOf(sec.id));
          hd.appendChild(tg);
        }
        box.appendChild(keep([hd], { span: true, keep: true, cls: "pvtitle" }));
        var ps = parts(sec);
        if (vedic) {
          // a Vedic text: running paragraphs in one language; side by side, each line beside its English, the rows of a
          // paragraph running on from page to page. The dhrupad never applies to it
          var units = ps.map(function (x) {
            return x.el;
          });
          if (side)
            paras(units).forEach(function (g) {
              box.appendChild(keep([sideTable(g, true)], { flow: true }));
            });
          else
            prose(units).forEach(function (u) {
              // a paragraph of a single line said once (the closing peace chant) never runs on
              box.appendChild(keep([u], { flow: !u.classList.contains("pvcen") }));
            });
        } else
          group(ps).forEach(function (g) {
            box.appendChild(keep(side ? [sideTable(g.els)] : g.els, { keep: g.keep, cls: g.verse ? "pvst" : "" }));
          });
        var cr = sec.querySelector(".cr");
        if (cr) {
          // the author line prints as plain text: the Wikipedia link is for the screen
          var pc = cl(cr);
          pc.className = "pvcr";
          [].forEach.call(pc.querySelectorAll(".crx"), function (x) {
            x.remove();
          });
          [].forEach.call(pc.querySelectorAll("a"), function (a) {
            a.replaceWith(document.createTextNode(a.textContent));
          });
          // inside the piece's last block, so it never lands alone at the top of a page
          var ks = box.querySelectorAll(".pvk");
          ks[ks.length - 1].appendChild(pc);
        }
        pv.appendChild(box);
      });
    }
    // ---- Page numbers in the printed contents ----
    // A browser cannot print "page N" for a heading, so the print view is laid out once in a hidden
    // frame the size of a printed page (the paper picked under How, else Letter in the US and Canada and A4
    // elsewhere; upright or sideways as the reader chose) and each piece's first page is worked out from the
    // heights, as the browser breaks pages.
    var LTR = /-(US|CA|MX|PH)$/i.test(navigator.language || ""),
      pcache = {}, // page plans laid out ahead, by pkey()
      shots = {}, // the How step's preview: the first page of the first text ticked, by pkey(), as laid out ahead
      // the texts being printed (their Library ids), or null for the whole Library: what the builder's What step
      // has ticked (chosen()), set as Print is tapped, for that printout only. It is put back to null when the printout
      // is done, so the browser's own Print menu prints the whole Library
      /** @type {string[] | null} */
      sel = null;
    // The pop-up's two choices, Portrait and Landscape, for what is printed (CHOICE in js/print/profiles.js):
    // one language in a column, upright or sideways; both languages side by side on sideways pages only (stacked,
    // upright, only while Landscape is held back)
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
    // Traditional prints its bold lines in "SC Bold" (css/07-bottom-bar-folds.css): loaded ahead, so they are measured
    // and printed in it
    function boldFont() {
      if (pfn() === "classic" && document.fonts && document.fonts.load)
        try {
          document.fonts.load('700 16px "SC Bold"', "कA");
        } catch (e) {}
    }
    function pon(mode) {
      boldFont();
      root.setAttribute("data-print", mode);
      root.setAttribute("data-font", pfn());
      root.setAttribute("data-ref", String(pref()));
    }
    function poff() {
      root.removeAttribute("data-print");
      root.setAttribute("data-font", P.fnt);
      root.setAttribute("data-ref", String(P.ref));
    }
    // the page plan's key: the layout, the choices that change it, and the texts (null: every text)
    // (a routine printout's own key: whose, the days and sessions, as its page 1 and tags differ)
    /** @param {string} mode @param {string[] | null} ids @param {import("../print/what.js").RoutinePlan | null} [rp] */
    function pkey(mode, ids, rp) {
      return [mode, plang(), LEAD, pref(), P.tr, P.ui, pfn(), land(mode), letter(), ids ? ids.join(",") : "", rp ? rp.key : ""].join("|");
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
    // each text's pages in the whole Library's plan as the Print button prints it (laid out ahead: warm)
    function counts() {
      var pg = pcache[pkey(dm(), null)];
      what.counts(pg ? pg.n : null, pg ? pg.toc : 1);
      summary();
      preview();
    }
    // The preview under How (mockup 1): the first page of the first text ticked, as it prints, made small. Laid out
    // ahead like the page plans (warm); until it is, an empty sheet the paper's shape
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
      var M = P.ui === "mr",
        ids = first(),
        k = ids ? pkey(dm(), ids, rplan()) : "",
        sh = sheet(dm()),
        w = 120; // its width (css/03-menus-print-view.css .prsheet)
      shv.setAttribute("aria-label", M ? "पहिल्या पानाची झलक" : "Preview of the first page");
      shv.style.height = Math.round((w * sh[1]) / sh[0]) + "px";
      if (k === pshown && shv.firstChild) return;
      pshown = k;
      shv.textContent = "";
      shv.classList.toggle("prsw", !shots[k]);
      if (!shots[k]) return warmSoon(300);
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
        d.write('<!doctype html><html data-print="' + dm() + '"' + attrs() + '><head><base href="' + location.href.replace(/"/g, "%22") + '"><style>' + pcss() + "\nhtml,body{margin:0;overflow:hidden;background:#fff}body{padding:9mm 9mm 0}.prpg{height:" + (sh[1] - 23) + "mm;overflow:hidden}</style></head><body><div class=\"prpg\">" + shots[k] + "</div></body></html>");
        d.close();
      } catch (e) {}
    }
    // the print view (#pv) as its first page alone: its first page box (layout)
    function page1() {
      var c = /** @type {HTMLElement} */ (pv.cloneNode(true)),
        f = c.querySelector(".pvpg");
      if (!f) return c.outerHTML;
      [].forEach.call(c.querySelectorAll(".pvpg"), function (x) {
        if (x !== f) x.remove();
      });
      [].slice.call(c.children).forEach(function (x) {
        if (!x.querySelector(".pvpg")) x.remove();
      });
      return c.outerHTML;
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
      counts();
      warmSoon(1500);
    };
    // the bottom bar: "5 texts · ~8 pages", or that a text must be picked (Next and Print wait for one)
    function summary() {
      var w = whatWords(),
        t = what.total(),
        el = document.getElementById("prsum");
      el.textContent = "";
      el.lang = P.ui === "mr" ? "mr" : "en";
      var a = document.createElement("span"),
        b = document.createElement("span");
      // one text: its name
      a.textContent = t.one || (t.texts ? w.texts(t.texts) : w.pick);
      if (t.one) a.lang = t.oneLang;
      b.textContent = t.texts && t.pages ? w.pages(t.pages) : "";
      el.appendChild(a);
      el.appendChild(b);
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
      rows();
      counts();
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
      counts();
      warmSoon(1500);
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
    // Lay the print view (#pv) out on pages in a hidden frame the size of a printed page (the paper picked under How,
    // else Letter in the US and Canada and A4 elsewhere; upright or sideways as chosen), and call back with the result
    // (layout): the printout's pages as HTML, and each piece's first page and page count
    function pages(mode, cb) {
      var mm = 96 / 25.4,
        f = document.createElement("iframe"),
        at = "",
        done = false;
      f.setAttribute("aria-hidden", "true");
      f.tabIndex = -1;
      // Safari (macOS 26, from Satish's PDFs) prints everything about 16/15 larger than Chrome, so a
      // page holds less: lay it out on a page that much smaller
      var sf = root.classList.contains("wk") ? 15 / 16 : 1,
        sh = sheet(mode);
      f.style.cssText = "position:fixed;left:-10000px;top:0;border:0;visibility:hidden;width:" + ((sh[0] - 18) * mm * sf - (pfn() !== "std" ? 16 : 12)) + "px;height:" + (sh[1] - 23) * mm * sf + "px";
      at = attrs();
      boldFont();
      document.body.appendChild(f);
      function end(r) {
        if (done) return;
        done = true;
        if (f.parentNode) f.parentNode.removeChild(f);
        cb(r);
      }
      // the text is fitted and the pages planned once the fonts are in, or after 2.5 s with the fonts there
      // are (a font that never arrives must not stop the print); a slow phone then still gets the fitted
      // text and the page numbers, however long the planning takes
      var started = false;
      function run() {
        if (started) return;
        started = true;
        try {
          // sizes first (they change the heights), then the pages
          fit(f.contentWindow, d, mode, pv);
          end(layout(f.contentWindow, d, (sh[1] - 23) * sf, mm));
        } catch (e) {
          end(null);
        }
      }
      setTimeout(run, 2500);
      try {
        var d = f.contentDocument;
        d.open();
        d.write('<!doctype html><html data-print="' + mode + '"' + at + '><head><base href="' + location.href.replace(/"/g, "%22") + '"><style>' + pcss() + "\nhtml,body{margin:0;overflow:hidden}</style></head><body>" + pv.outerHTML + "</body></html>");
        d.close();
        // lay out once so the fonts the copy uses start loading, then wait for them before measuring
        d.documentElement.offsetHeight;
        // fonts.ready alone can resolve before a face the layout needs has even started to load (a script's face,
        // Kannada's, is fetched only for the characters that use it), and then every page is measured in the fallback
        // font and prints taller than planned. So each font the copy sets is asked for by name, with the characters
        // it holds, and the pages are planned once those are in
        var cw = /** @type {Window} */ (f.contentWindow),
          want = /** @type {Record<string, boolean>} */ ({}),
          chars = Array.from(new Set(d.getElementById("pv").textContent.replace(/\s+/g, ""))).join("");
        [].forEach.call(d.querySelectorAll("#pv *"), function (/** @type {Element} */ el) {
          var s = cw.getComputedStyle(el);
          want[s.fontStyle + " " + s.fontWeight + " 16px " + s.fontFamily] = true;
        });
        // (and in the page itself, which prints them: a face not yet loaded there prints in the fallback, taller)
        Promise.all(
          Object.keys(want).reduce(function (a, font) {
            return a.concat(
              [d, document].map(function (x) {
                return x.fonts.load(font, chars).catch(function () {});
              }),
            );
          }, /** @type {Promise<any>[]} */ ([])),
        )
          .then(function () {
            return d.fonts.ready;
          })
          .then(run, run);
      } catch (e) {
        end(null);
      }
    }
    // ---- The pages (the rules: js/print/pages.js) ----
    // Each section of the print view (the contents, then each piece) is measured as it is set, given its size and
    // layout (choose), and then laid out page by page as page boxes (.pvpg) in this page-sized copy, each one checked
    // against the page's height as the browser lays it out. The boxes themselves are what prints: a forced page break
    // after each, so every browser prints these pages, and the contents' page numbers are read off them.
    // Returns { html: the print view's pages, n: { piece: its pages }, toc: the contents' pages, z: { piece: its size } },
    // and each piece's first page under its id.
    function layout(w, d, hmm, mm) {
      var p = d.getElementById("pv"),
        cs = w.getComputedStyle(p),
        W = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
        H = hmm * mm - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
        // a page is filled to 96% of its height; Safari to 90%, as its printed pages held up to a tenth less than planned
        // in Satish's Safari PDFs (and it prints about 16/15 larger: see pages())
        C = H * (root.classList.contains("wk") ? 0.9 : 0.96),
        G = LAYOUT.cols.gap * mm,
        one = d.documentElement.getAttribute("data-print") === "one",
        // a browser without CSS zoom (Firefox before 126) prints every piece at its own size
        zoomOK = !w.CSS || !w.CSS.supports || w.CSS.supports("zoom", "1"),
        out = { html: "", n: {}, toc: 0, z: {} },
        rng = d.createRange(),
        page = 0;
      function hgt(/** @type {Element} */ e) {
        return e.getBoundingClientRect().height;
      }
      // Every section is laid out at once, in rounds: in each round every section first reads what it needs of the
      // layout (so the frame is laid out once for all of them), then makes its changes. Laid out one section and one
      // block at a time, a whole Library took over 600 layouts of the frame, run while the page loads; this way it takes
      // about as many as its longest text has pages. Each section's work is a generator (job): every `yield` ends a
      // read or a write step, alternately, starting with a read.
      //
      // How a box at a zoom measures: at its zoomed size (Chrome), or unzoomed (a browser that measures it so). One probe
      // tells which, for every size
      var probe = d.createElement("div");
      probe.style.cssText = "position:absolute;visibility:hidden;width:10px;height:1000px;zoom:0.5";
      d.body.appendChild(probe);
      var zoomed = Math.abs(hgt(probe) - 500) < 50;
      d.body.removeChild(probe);
      function zr(/** @type {number} */ k) {
        return zoomed ? k : 1;
      }
      // the widest line of a block, as set (its lines, markers and labels, in the language printed)
      function lineW(/** @type {HTMLElement} */ b) {
        var m = 0;
        [].forEach.call(b.querySelectorAll("p, .rmk > span, .lab > span, li"), function (/** @type {HTMLElement} */ x) {
          if (!x.getClientRects().length) return;
          rng.selectNodeContents(x);
          m = Math.max(m, rng.getBoundingClientRect().width);
        });
        return m;
      }
      // each block's height as stacked (the gap to the next one included), as the section is now set (read only)
      function heights(/** @type {HTMLElement[]} */ ks) {
        var tops = ks.map(function (k) {
            return k.getBoundingClientRect().top;
          }),
          last = ks[ks.length - 1],
          lb = last.getBoundingClientRect().bottom + parseFloat(w.getComputedStyle(last).marginBottom || "0");
        return ks.map(function (k, i) {
          return (i + 1 < ks.length ? tops[i + 1] : lb) - tops[i];
        });
      }
      /** @type {{ sec: HTMLElement, g: Generator<void, void, void>, res: { n: number, k: number }, done: boolean }[]} */
      var jobs = [];
      [].forEach.call(p.children, function (/** @type {HTMLElement} */ sec) {
        var ks = /** @type {HTMLElement[]} */ ([].filter.call(sec.children, function (/** @type {HTMLElement} */ c) {
          return c.classList.contains("pvk");
        }));
        if (!ks.length) return;
        var res = { n: 1, k: 1 };
        jobs.push({ sec: sec, g: job(sec, ks, res), res: res, done: false });
      });
      while (
        jobs.some(function (j) {
          return !j.done;
        })
      ) {
        // a read step for each, then a write step for each
        for (var ph = 0; ph < 2; ph++)
          jobs.forEach(function (j) {
            if (!j.done) j.done = !!j.g.next().done;
          });
      }
      jobs.forEach(function (j) {
        var sec = j.sec,
          id = sec.getAttribute("data-sid") || "";
        if (sec.classList.contains("pvcov")) out.toc = j.res.n;
        else {
          out[id] = page + 1;
          out.n[id] = j.res.n;
          if (Math.abs(j.res.k - 1) > 0.001) out.z[id] = Math.round(j.res.k * 1000) / 1000;
        }
        page += j.res.n;
      });
      /**
       * One section: measured, given its size and layout, then laid out in page boxes (see the rounds above)
       * @param {HTMLElement} sec @param {HTMLElement[]} ks @param {{ n: number, k: number }} res
       * @returns {Generator<void, void, void>}
       */
      function* job(sec, ks, res) {
        var cov = sec.classList.contains("pvcov"),
          vedic = sec.classList.contains("pvved"),
          side = sec.classList.contains("pvsd"),
          // two columns: the Library's contents, and an aarti or ashtak in one language
          two = cov ? !sec.classList.contains("pvrt") : one && !vedic && !side,
          flow = ks.map(function (k) {
            return k.hasAttribute("data-flow");
          }),
          span = ks.map(function (k) {
            return k.hasAttribute("data-span");
          }),
          kept = ks.map(function (k) {
            return k.hasAttribute("data-keep");
          }),
          // a stanza (or the dhrupad at the top) must fit a column whole for the piece to go into two columns
          verse = ks.map(function (k) {
            return k.classList.contains("pvst");
          });
        // read: the blocks as set across the page
        var hs = heights(ks),
          lw = ks.map(lineW),
          hc = hs;
        yield;
        if (cov) {
          // the contents are also measured at a column's width (a line may wrap there)
          sec.style.width = (W - G) / 2 + "px";
          yield;
          hc = heights(ks);
          yield;
          sec.style.width = "";
        }
        // (now in a write step)
        // its blocks at a size (k: a zoom on its pages) in one or two columns. At size k a page is C/k high and W/k wide in
        // the block's own units; a paragraph that runs on is about k times as tall there (its lines are shorter). In two
        // columns, a block with a line too wide for a column runs across both
        function items(/** @type {number} */ k, /** @type {1 | 2} */ c) {
          var col = (W / k - G) / 2;
          return ks.map(function (_, i) {
            // (a line of the contents may wrap in its column: only its own data-span puts it across the page)
            return { h: flow[i] ? hs[i] * k : c === 2 ? hc[i] : hs[i], span: span[i] || (c === 2 && !cov && lw[i] > col * LAYOUT.margin), keep: kept[i], flow: flow[i] };
          });
        }
        function at(/** @type {number} */ k, /** @type {1 | 2} */ c) {
          if (c === 2 && !two) return null;
          var it = items(k, c);
          if (c === 2 && (it.filter(function (x) { return !x.span; }).length < 2 || it.some(function (x, i) { return x.span && verse[i]; }))) return null;
          return plan(it, C / k, c);
        }
        // the sizes it may take, largest first: the steps of the fixed scale its lines have room for (LAYOUT.grow; fit.js
        // wrote data-grow), its own, then smaller as far as the floor allows (data-fit: what the fitting already took off)
        var sizes = [1];
        if (zoomOK && !cov) {
          var pt = Number(sec.getAttribute("data-pt")) || 0,
            room = Number(sec.getAttribute("data-grow")) || 1,
            low = LAYOUT.floor / (Number(sec.getAttribute("data-fit")) || 1),
            steps = LAYOUT.grow[vedic ? "prose" : "verse"];
          sizes = [];
          for (var j = steps.length - 1; pt && j >= 0; j--) {
            var g = steps[j] / pt;
            if (g >= 1.01 && g <= room) sizes.push(g);
          }
          sizes.push(1);
          // (a Vedic text only a little smaller, to 90%, where a few lines would otherwise spill onto a page: its svara
          // marks need their size)
          for (var t = 98; t >= (vedic ? Math.max(low, 0.9) : low) * 100 - 1e-9; t -= 2) sizes.push(t / 100);
        } else if (zoomOK) {
          // the contents: a little smaller (to the floor) where that keeps them on fewer pages, as a long Library's do
          for (t = 96; t >= LAYOUT.floor * 100 - 1e-9; t -= 4) sizes.push(t / 100);
        }
        var own = Math.min.apply(null, [/** @type {1 | 2} */ (1), 2].map(function (c) {
            var r = at(1, /** @type {1 | 2} */ (c));
            return r ? r.n : Infinity;
          })),
          pick = choose(at, sizes, own),
          tries = sizes.filter(function (k) {
            return k <= pick.k + 1e-6;
          });
        // laid out for real, at the size chosen; one that takes more pages than planned (a paragraph's lines rewrap)
        // tries the next sizes down, and the first that takes no more pages than planned wins (else the fewest). The
        // sizes are laid out side by side, each in a copy of the section beside it, in the same rounds: a text that runs
        // on in paragraphs (whose lines rewrap) tries them all from the start, any other only once its own size fails
        function colsAt(/** @type {number} */ k) {
          return choose(function (x, c) {
            return Math.abs(x - k) < 1e-6 ? at(x, c) : null;
          }, [k]).cols;
        }
        var wide = flow.some(Boolean),
          runs = /** @type {{ k: number, S: HTMLElement, r: { n: number }, g: Generator<void, void, void>, done: boolean }[]} */ ([]);
        function add(/** @type {number} */ k, /** @type {boolean} */ own) {
          var S = own ? sec : /** @type {HTMLElement} */ (sec.cloneNode(false)),
            r = { n: 0 };
          if (!own) sec.parentNode.insertBefore(S, sec.nextSibling);
          runs.push({
            k: k,
            S: S,
            r: r,
            g: assemble(k, own ? pick.cols : colsAt(k), r, S, own ? ks : ks.map(function (b) {
              return /** @type {HTMLElement} */ (b.cloneNode(true));
            })),
            done: false,
          });
        }
        // (from a write step, each run in step with the others: they end in a read step)
        function* drive() {
          for (;;) {
            runs.forEach(function (x) {
              if (!x.done) x.done = !!x.g.next().done;
            });
            if (
              runs.every(function (x) {
                return x.done;
              })
            )
              return;
            yield;
          }
        }
        function best() {
          var b = runs[0];
          for (var q = 0; q < runs.length; q++) {
            if (runs[q].r.n <= pick.n) return runs[q];
            if (runs[q].r.n < b.r.n) b = runs[q];
          }
          return b;
        }
        (wide ? tries.slice(0, 4) : [pick.k]).forEach(function (k, q) {
          add(k, !q);
        });
        yield* drive();
        if (!wide && runs[0].r.n > pick.n && tries.length > 1) {
          yield;
          tries.slice(1, 4).forEach(function (k) {
            add(k, false);
          });
          runs[0].done = true;
          yield* drive();
        }
        var won = best();
        res.n = won.r.n;
        res.k = won.k;
        if (runs.length > 1) {
          yield;
          if (won.S !== sec) sec.innerHTML = won.S.innerHTML;
          runs.forEach(function (x) {
            if (x.S !== sec) x.S.remove();
          });
        }

        // The page boxes at size k in c columns, from a write step to a read step; r.n: the pages they take
        /**
         * @param {number} k @param {1 | 2} c @param {{ n: number }} r @param {HTMLElement} S  the section (or a copy of it)
         * @param {HTMLElement[]} K  its blocks @returns {Generator<void, void, void>}
         */
        function* assemble(k, c, r, S, K) {
          K.forEach(function (b) {
            if (b.parentNode) b.parentNode.removeChild(b);
            b.classList.remove("pvtall");
          });
          S.innerHTML = "";
          var boxes = /** @type {HTMLElement[]} */ ([]),
            Wk = W / k,
            Ck = C / k,
            // each box is laid out at its size (its zoom) and measured so, as it prints: at a zoom, line heights round
            // to the pixel at the smaller size, and a page of 40 lines measured unzoomed came out a line short on paper.
            // lim is a page's height as measured
            lim = Ck * zr(k),
            // a page laid out a pixel or two over (rounding) still fits: a page is only filled to 96% (Safari 90%), and
            // this is a small part of what is left
            slack = lim * 0.004,
            extra = 0;
          function box() {
            var b = d.createElement("div");
            b.className = "pvpg";
            b.style.width = Wk + "px";
            if (Math.abs(k - 1) > 0.001) b.style.zoom = String(k);
            S.appendChild(b);
            boxes.push(b);
            return b;
          }
          if (c === 2) {
            // two columns: as planned, each page checked; a page that comes out taller than planned is planned again a
            // little shorter
            for (var tryN = 0, fill = 1; ; tryN++, fill *= 0.96) {
              boxes.forEach(function (b) {
                b.remove();
              });
              boxes = [];
              var pl = plan(items(k, 2), Ck * fill, 2);
              pl.pages.forEach(function (rows) {
                var bx = box();
                rows.forEach(function (row) {
                  if ("span" in row) return bx.appendChild(K[row.span]);
                  var band = d.createElement("div");
                  band.className = "pv2b";
                  row.cols.forEach(function (list) {
                    var cc = d.createElement("div");
                    cc.className = "pv2c";
                    list.forEach(function (i) {
                      cc.appendChild(K[i]);
                    });
                    band.appendChild(cc);
                  });
                  bx.appendChild(band);
                });
              });
              extra = pl.n - pl.pages.length;
              yield;
              if (tryN >= 4 || boxes.every(function (b) { return hgt(b) <= lim + slack; })) break;
              yield;
            }
            r.n = boxes.length + extra;
            return;
          }
          // one column: all that is left goes on the page, and what does not fit moves on to the next: a paragraph that
          // runs past the foot from a line end, any other block (with the blocks kept with it) whole. An aarti or ashtak
          // in one language is centred as wide as its longest line
          var centre = one && !vedic && !side && !cov,
            cw = Math.min(
              Wk,
              4 +
                Math.max.apply(
                  null,
                  lw.filter(function (_, i) {
                    return !span[i];
                  }).concat([0]),
                ),
            ),
            bx = box();
          // blocks onto a box: those that run across the page as they are, the others in a column
          function place(/** @type {HTMLElement} */ to, /** @type {HTMLElement[]} */ list) {
            var col = /** @type {HTMLElement | null} */ (null);
            list.forEach(function (b) {
              if (b.hasAttribute("data-span")) {
                col = null;
                to.appendChild(b);
                return;
              }
              if (!col) {
                col = d.createElement("div");
                col.className = "pvcol";
                if (centre) col.style.width = cw + "px";
                to.appendChild(col);
              }
              col.appendChild(b);
            });
          }
          // a box's blocks, in order
          function blocksOf(/** @type {HTMLElement} */ b) {
            return /** @type {HTMLElement[]} */ ([].slice.call(b.querySelectorAll(".pvk"))).filter(function (x) {
              return !x.parentElement || !x.parentElement.closest(".pvk");
            });
          }
          // the margin at a block's top or foot as it lays out at the top or foot of a page: its own, or one of its first
          // (last) child's that runs out through it, whichever is larger, as measured
          function edge(/** @type {HTMLElement} */ b, /** @type {boolean} */ top) {
            var mx = 0,
              x = /** @type {Element | null} */ (b);
            for (var dp = 0; x && dp < 6; dp++) {
              var st = w.getComputedStyle(x);
              mx = Math.max(mx, parseFloat(top ? st.marginTop : st.marginBottom) || 0);
              if (dp && /flow-root|flex|grid|table|inline/.test(st.display)) break;
              if ((parseFloat(top ? st.paddingTop : st.paddingBottom) || 0) + (parseFloat(top ? st.borderTopWidth : st.borderBottomWidth) || 0) > 0) break;
              var kids2 = [].filter.call(x.children, function (/** @type {Element} */ c) {
                return c.getClientRects().length > 0;
              });
              x = kids2.length ? kids2[top ? 0 : kids2.length - 1] : null;
            }
            return mx * zr(k);
          }
          // the space a block (or the rest of it, pad) takes above its first line at the top of a page
          function lead(/** @type {HTMLElement} */ b, /** @type {boolean} */ pad) {
            return edge(b, true) + (pad ? (parseFloat(w.getComputedStyle(b).paddingTop) || 0) * zr(k) : 0);
          }
          // All of it is set down one tall page and laid out once; every page's end is found from that one layout, and
          // the pages are then made in one go and checked. Should a page still run over (the space around a cut is a
          // little different from where the block was), the pages from there on are planned again, a little shorter by
          // as much as it ran over. A whole text so takes a few layouts, not one for each block or page
          var first = 0,
            limP = lim,
            list = K.slice();
          for (var pass = 0; ; pass++) {
            // write: what is left, down one tall page
            boxes.splice(first).forEach(function (b) {
              b.remove();
            });
            list.forEach(function (b) {
              b.classList.remove("pvtall");
              if (b.parentNode) b.parentNode.removeChild(b);
            });
            [].forEach.call(S.querySelectorAll(".pvcol"), function (/** @type {HTMLElement} */ x) {
              if (!x.children.length) x.remove();
            });
            bx = box();
            place(bx, list);
            yield;
            // read: every page's end
            var kids = blocksOf(bx),
              n = kids.length,
              tops = kids.map(function (x) {
                return x.getBoundingClientRect().top;
              }),
              // (a block's space below it counts: the page holds it)
              bottoms = kids.map(function (x) {
                return x.getBoundingClientRect().bottom + edge(x, false);
              }),
              pageTop = bx.getBoundingClientRect().top,
              ps = 0,
              from = /** @type {number | undefined} */ (undefined),
              /** @type {Record<number, boolean>} */ start = {},
              /** @type {Record<number, { node: Node, offset: number, y: number }[]>} */ splits = {},
              /** @type {Record<number, number>} */ tall = {},
              // (only the page that ran over last time is planned shorter: the others take the full height)
              cap = limP;
            for (var guard = 0; ps < n && guard < 1000; guard++) {
              // the first block that runs past the foot of this page, and the blocks kept together with it (s to e)
              var i = -1;
              for (var m = ps; m < n && i < 0; m++) if (bottoms[m] - pageTop > cap + 0.5) i = m;
              if (i < 0) break;
              var s = i,
                e = i;
              while (s > ps && kids[s - 1].hasAttribute("data-keep")) s--;
              while (e < n - 1 && kids[e].hasAttribute("data-keep")) e++;
              var last = kids[e],
                // (the first part of a paragraph cut ends with the space below a paragraph)
                sp = last.hasAttribute("data-flow") ? splitPoint(last, pageTop + cap - 2 - edge(last, false), ps === e ? from : undefined) : null;
              if (sp) {
                // a paragraph runs on from a line end: its rest starts the next page
                (splits[e] = splits[e] || []).push(sp);
                pageTop = sp.y - lead(last, true);
                cap = lim;
                from = sp.y;
                ps = e;
                continue;
              }
              from = undefined;
              if (s > ps) {
                start[s] = true;
                pageTop = tops[s] - lead(kids[s], false);
                cap = lim;
                ps = s;
                continue;
              }
              // alone on its page and still taller than one: it runs on, between its lines, and counts for each page
              for (m = ps; m <= e; m++) tall[m] = Math.max(0, Math.ceil((bottoms[e] - pageTop) / lim - 0.01) - 1);
              if (e + 1 < n) {
                start[e + 1] = true;
                pageTop = tops[e + 1] - lead(kids[e + 1], false);
              }
              cap = lim;
              ps = e + 1;
            }
            yield;
            // write: the pages, each a box
            /** @type {HTMLElement[][]} */
            var pgs = [[]],
              tallPg = [-1];
            kids.forEach(function (b, i) {
              var pts = splits[i] || [],
                pieces = [b];
              // (the last split first, so the points before it stay where they were)
              for (var j = pts.length - 1; j >= 0; j--) pieces.splice(1, 0, splitAt(b, pts[j]));
              if (start[i] && pgs[pgs.length - 1].length) pgs.push([]), tallPg.push(-1);
              pieces.forEach(function (x, j) {
                if (j) pgs.push([]), tallPg.push(-1);
                pgs[pgs.length - 1].push(x);
              });
              if (i in tall) {
                pieces[pieces.length - 1].classList.add("pvtall");
                tallPg[pgs.length - 1] = tall[i];
              }
            });
            bx.remove();
            boxes.pop();
            pgs.forEach(function (list, j) {
              var b = box();
              if (tallPg[j] >= 0) b.classList.add("pvtallpg"), b.setAttribute("data-more", String(tallPg[j]));
              place(b, list);
            });
            yield;
            // read: each page checked
            var bad = -1;
            for (var q = first; q < boxes.length && bad < 0; q++) if (!boxes[q].classList.contains("pvtallpg") && hgt(boxes[q]) > lim + slack) bad = q;
            if (bad < 0) break;
            if (pass >= 3) {
              // (still over after three plans: each page that runs over gives its last blocks a page of their own)
              yield* mend();
              break;
            }
            limP = (bad === first ? limP : lim) - (hgt(boxes[bad]) - lim + 1);
            first = bad;
            list = [].concat.apply(
              [],
              boxes.slice(bad).map(function (b) {
                return blocksOf(b);
              }),
            );
            yield;
          }
          // from a read step to a read step: every page that runs over moves its last blocks (with those kept with them)
          // on to a new page after it, a paragraph from a line end; one alone and too tall runs on
          function* mend() {
            for (var fix = 0; fix < 100; fix++) {
              var b = -1;
              for (var q = 0; q < boxes.length && b < 0; q++) if (!boxes[q].classList.contains("pvtallpg") && hgt(boxes[q]) > lim + slack) b = q;
              if (b < 0) return;
              var bb = boxes[b],
                bk = blocksOf(bb),
                top = bb.getBoundingClientRect().top,
                i = -1;
              for (var m = 0; m < bk.length && i < 0; m++) if (bk[m].getBoundingClientRect().bottom + edge(bk[m], false) - top > lim + 0.5) i = m;
              if (i < 0) i = bk.length - 1;
              var s = i,
                e = i;
              while (s > 0 && bk[s - 1].hasAttribute("data-keep")) s--;
              while (e < bk.length - 1 && bk[e].hasAttribute("data-keep")) e++;
              var last = bk[e],
                sp = last.hasAttribute("data-flow") ? splitPoint(last, top + lim - 2) : null,
                tallH = sp || s > 0 ? 0 : bk[e].getBoundingClientRect().bottom - top;
              yield;
              var moved;
              if (sp) moved = [splitAt(last, sp)].concat(bk.slice(e + 1));
              else if (s > 0) moved = bk.slice(s);
              else {
                bk.slice(0, e + 1).forEach(function (x) {
                  x.classList.add("pvtall");
                });
                bb.classList.add("pvtallpg");
                bb.setAttribute("data-more", String(Math.max(0, Math.ceil(tallH / lim - 0.01) - 1)));
                moved = bk.slice(e + 1);
              }
              if (moved.length) {
                moved.forEach(function (x) {
                  x.remove();
                });
                [].forEach.call(bb.querySelectorAll(".pvcol"), function (/** @type {HTMLElement} */ x) {
                  if (!x.children.length) x.remove();
                });
                var nb = box();
                boxes.pop();
                S.insertBefore(nb, bb.nextSibling);
                boxes.splice(b + 1, 0, nb);
                place(nb, moved);
              }
              yield;
            }
          }
          r.n =
            boxes.length +
            boxes.reduce(function (a, b) {
              return a + (Number(b.getAttribute("data-more")) || 0);
            }, 0);
        }
      }
      // the contents' page numbers, in the language printed
      [].forEach.call(p.querySelectorAll(".pvte li[data-sid]"), function (/** @type {HTMLElement} */ li) {
        var n = out[li.getAttribute("data-sid") || ""],
          s = li.querySelector(".pgn");
        if (s) s.textContent = n ? (plang() !== "mr" ? String(n) : DV(n)) : "";
      });
      out.html = p.innerHTML;
      return out;
    }
    // the print view as laid out on pages (layout), or as built when the pages could not be laid out: then each block
    // still keeps together on paper (css/03-menus-print-view.css)
    function usePages(pg) {
      if (pg && pg.html) {
        pv.innerHTML = pg.html;
        pv.setAttribute("data-paged", "1");
      }
    }
    // A routine's plan for the preview of its first text alone: its tag, but no page 1
    /** @param {import("../print/what.js").RoutinePlan} rp */
    function onlyTags(rp) {
      return Object.assign({}, rp, { only: true });
    }
    // Printing from the browser's own menu cannot wait, so the numbers for what it prints (dm) are kept ready, and so
    // are those of the layout last chosen in the pop-up: then the Print button prints at once, while the tap
    // still counts on an iPhone, instead of asking for a second tap (Print now)
    var wm = "one";
    // the browser's own menu prints what the pop-up offers first: one language in a column, both side by side
    function dm() {
      return plang() === "both" && FEAT_SW ? "side" : "one";
    }
    // While the builder is open, first the preview's page (one text: quick); then the whole Library as the browser's
    // menu prints it (the builder's page counts are read from it), then what the builder has ticked, as the Print
    // button prints it
    function warm() {
      var c = chosen(),
        rp = rplan(),
        f = pm.hidden ? null : first(),
        todo = /** @type {[string, string[] | null, boolean, any][]} */ ([
          [dm(), f, true, rp],
          [dm(), null, false, null],
          [wm, c, false, rp],
        ]).filter(function (x, i) {
          var k = pkey(x[0], x[1], x[3]);
          return i ? !pcache[k] : f && !shots[k];
        });
      if (!todo.length || busy) return;
      var m = todo[0][0],
        ids = todo[0][1],
        shot = todo[0][2],
        wr = todo[0][3],
        k = pkey(m, ids, wr);
      // (the preview's one text, from a routine, with its tag but without page 1)
      build(m, ids, shot && wr ? onlyTags(wr) : wr);
      pages(m, function (pg) {
        if (pg) pcache[k] = pg;
        // (the preview's page is taken from the print view, unless a print began while this was laid out: the print
        // view is then that printout's, and must stay so; the preview is taken next time)
        if (shot && !busy) {
          usePages(pg);
          shots[k] = page1();
        }
        if (!pm.hidden) counts();
        if (todo.length > 1) warmSoon(500);
      });
    }
    // Performance: the warm-up lays out a hidden copy of every piece, so it waits until the reader has
    // stopped tapping and then for an idle moment (Safari has no requestIdleCallback: it just runs then)
    var wt = 0;
    function warmSoon(ms) {
      clearTimeout(wt);
      wt = setTimeout(function () {
        if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 2000 });
        else warm();
      }, ms);
    }
    // (in the builder sooner: the preview and the page counts wait for it)
    document.addEventListener("click", function (e) {
      warmSoon(pm.contains(/** @type {Node} */ (e.target)) ? 800 : 2500);
    });
    warmSoon(3000);
    // ---- Opening the print dialog ----
    // Safari and every iOS browser open the print dialog only in answer to a tap, and a tap counts for
    // about a second (through timers; not always through promises). Laying the print view out takes longer
    // than that on a phone, so window.print() there is quietly ignored. Then the pop-up comes back with
    // one button, Print now, whose own tap opens the dialog at once (the print view is already laid out).
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
      document.getElementById("prl").hidden = !(root.classList.contains("wk") && land(ready ? wm : dm()));
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
      var t0 = Date.now();
      last = mode;
      // the iPhone Home Screen app cannot print: straight to Open in Safari
      if (iOS && standalone) return toSafari(true);
      pm.hidden = true;
      ovDrop();
      // the chosen button has just been hidden: keyboard focus goes back to Print, not to the top of the page
      focusBack(opener || document.getElementById("asp"));
      busy = true;
      if (mode === "as") mode = "one";
      wm = mode;
      sel = chosen();
      var rp = rplan();
      setPage(mode);
      build(mode, sel, rp);
      var k = pkey(mode, sel, rp);
      // laid out ahead (warm): print straight away
      if (pcache[k]) return done(pcache[k]);
      pages(mode, done);
      function done(pg) {
        usePages(pg);
        if (pg) pcache[k] = pg;
        pon(mode);
        // the tap no longer counts: ask for another one rather than have the print quietly ignored
        if ((iOS || root.classList.contains("wk")) && Date.now() - t0 > 900) return ready();
        setTimeout(function () {
          tryPrint(false);
        }, 60);
      }
    }
    // Open the builder: from Print (More), at What with the ticks as last left; from Print this text or Print this
    // session, with just those texts ticked and at How (on a phone; ‹ What to print shows the choice)
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
          wm = dm();
          pages1();
          warmSoon(1500);
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
        wm = dm();
        langRow();
        pmMode(false);
        pages1();
        rows();
        counts();
        warmSoon(1500);
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
      // What, drawn afresh (the Library's categories, the reading languages and the menu language may have changed),
      // with the page counts as far as they are laid out; the rest are laid out soon
      if (o.ids) what.set(o.ids);
      what.tab(o.tab || "texts");
      what.render();
      counts();
      warmSoon(300);
      step(o.ids ? "how" : "what");
      ovPush();
      pm.hidden = false;
      // (a card taller than the screen stays at its top: Next or Print is in the bar at the bottom)
      (o.ids || (wide && wide.matches) ? bpr : bnx).focus({ preventScroll: true });
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
    // Print in the bottom bar (while reading): the session being read (js/features/today-card.js runIds), else the text
    // on screen, at How (the Today tab shows the session's choice)
    document.getElementById("asp").onclick = function () {
      var b = document.getElementById("asp"),
        ids = runIds(),
        sec = cur(),
        t = null;
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
    window.addEventListener("beforeprint", function () {
      seen = true;
      if (!busy) {
        var m = dm();
        setPage(m);
        build(m, null);
        if (pcache[pkey(m, null)]) usePages(pcache[pkey(m, null)]);
        pon(m);
      }
    });
    window.addEventListener("afterprint", function () {
      busy = false;
      sel = null;
      poff();
    });
    // Opened by the Home Screen app's Open in Safari (see js/render.js): lay the printout out once the fonts
    // are in, then Print now asks for the tap that Safari needs
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

// @ts-check
// Print
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// How a printout is made (ARCHITECTURE.md, "Printing"):
//   1. The texts chosen are built afresh from the text files (js/print/compose.js), as the reading page builds them
//      (the script, the English style, the stanza numbers), whatever the reading page has folded or hidden.
//   2. From them the print view (#pv) is written (js/print/write.js) in markup of its own, pv… classes only, so nothing of the reading
//      page's look reaches the paper: its whole look is css/15-print.css. What prints is decided here, by what each
//      part of a text is (a stanza, the dhrupad, a note, a Vedic paragraph), never by what the screen shows.
//   3. The browser lays the pages out, by four rules in css/15-print.css: every text starts on a new page; a stanza
//      (with its dhrupad, marker or note) is never split; a Vedic paragraph splits only between lines and never leaves
//      one line alone at the foot or top of a page; side by side, a row is never split.
// Nothing is measured, so every browser prints the same way, at once, from the tap that asked for it. The contents
// list the texts without page numbers (Satish, 2026-10-23: a browser cannot say where its pages break). The pop-up's
// "about 12 pages" is counted apart, in a hidden frame, by the same rules (js/print/pages.js); the printout waits for
// nothing of it.

import { byId, note as message, pieceEl, root } from "../core/page.js";
import { LEAD, P, change } from "../core/state.js";
import { ovDone, ovDrop, ovPush } from "./history.js";
import { focusBack } from "./more-menu.js";
import { FEAT_SW } from "../core/features.js";
import { countPages } from "../print/pages.js";
import { createWhat, whatWords } from "../print/what.js";
import { createWriter } from "../print/write.js";
import { shelvesNow } from "./library.js";
import { shownSessions, shownDay, runDay, runIds, shownSession } from "./today-card.js";
import { cur } from "../core/apply.js";
import { active, followed } from "../store/store.js";
import { ui } from "../core/words.js";
import { BASES, baseRoutine, cleanRoutine, routinePart } from "../core/routine.js";
import { loaded } from "../text/load.js";
import { menuWords } from "../core/strings.js";

// The page each printout is made for: one language upright, both languages side by side on a sideways page
var CHOICE = { one: { page: "up" }, both: { page: "land" } };

export function init() {
  (function () {
    var pm = byId("prm"),
      pv = /** @type {HTMLElement} */ (byId("pv")),
      b1 = byId("pr1"),
      b2 = byId("pr2"),
      bgo = byId("prgo"),
      bpr = /** @type {HTMLButtonElement} */ (byId("prgp")),
      po = /** @type {HTMLElement} */ (pm.querySelector(".pro")),
      pw = byId("prw"),
      pv2 = byId("prv"),
      bsf = byId("prsf"),
      bcp = byId("prcp"),
      last = "as", // the layout last chosen, carried to Safari
      pn = /** @type {HTMLElement} */ (pm.querySelector(".prn:not(#prw):not(#prv)")),
      busy = false,
      /** @type {{ m: string, ids: string[] | null, rp: any, sp: { session: string } | null } | null} the printout being made from the builder */
      job = null,
      /** @type {{ m: string, ids: string[] | null, rp: any, sp: { session: string } | null } | null} the printout just printed, until the reader is back */
      again = null,
      seen = false; // the browser has started printing (beforeprint) since the last window.print()
    // Writing the print view (js/print/write.js), with the printout's language and dhrupad as chosen here
    var writer = createWriter({ pv: pv, plang: plang, pref: pref }),
      IND = writer.IND,
      indAt = writer.indAt,
      olang = writer.olang,
      build = writer.build;

    var LTR = /-(US|CA|MX|PH)$/i.test(navigator.language || ""),
      // the texts being printed (their Library ids), or null for the whole Library: what the builder's What step
      // has ticked (chosen()), set as Print is tapped, for that printout only. It is put back to null when the printout
      // is done, so the browser's own Print menu prints the whole Library
      /** @type {string[] | null} */
      sel = null,
      // a choice other than the one made, while the pages it would take are counted (the hints' "about 2 pages more")
      /** @type {{ ref?: number, land?: boolean } | null} */
      alt = null;
    // The pop-up's two choices, Portrait and Landscape, for what is printed: one language in a column, upright or
    // sideways; both languages side by side on sideways pages
    function choice() {
      return CHOICE[plang() === "both" ? "both" : "one"];
    }
    // Sideways pages for a layout ("one" or "side"): with both languages, side by side; with one, as the reader
    // last chose in the pop-up (P.por), or its default; upright only while Landscape is held back (FEAT_SW)
    /** @param {string} mode */
    function land(mode) {
      if (!FEAT_SW) return false;
      if (plang() === "both") return mode === "side";
      if (alt && alt.land !== undefined) return alt.land;
      return (P.por || choice().page) === "land";
    }
    // Letter paper: as picked under How (P.ppr), else as the device's region suggests
    function letter() {
      return P.ppr ? P.ppr === "letter" : LTR;
    }
    // the sheet as it prints, [width, height] in mm
    /** @param {string} mode */
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
      if (alt && alt.ref !== undefined) return alt.ref;
      return P.pref === 0 || P.pref === 1 ? P.pref : P.ref;
    }
    // The fonts the printout uses, asked for ahead (a browser prints only the faces it has loaded): the chosen font's
    // regular and bold, the Vedic texts' Tiro Devanagari Sanskrit, and Kannada letters' when they are on
    function fontsAhead() {
      if (!document.fonts || !document.fonts.load) return;
      var f = pfn(),
        want =
          f === "classic"
            ? ['400 16px "SC Classic"', '700 16px "SC Bold"', '400 16px "Tiro Devanagari Sanskrit"']
            : f === "bold"
              ? ['600 16px "SC Bold"', '800 16px "SC Bold"']
              : ['400 16px "SC Sans"', '700 16px "SC Sans"'];
      if (IND[olang()]) want.push('400 16px "' + IND[olang()][indAt(f)] + '"');
      want.forEach(function (x) {
        try {
          document.fonts.load(x, "कॅ॑A").catch(function () {});
        } catch (e) {}
      });
    }
    /** @param {string} mode */
    function pon(mode) {
      root.setAttribute("data-print", mode);
      root.setAttribute("data-font", pfn());
      root.setAttribute("data-ref", String(pref()));
      // sideways pages: the printout is set a little tighter (css/15-print.css); a media query on orientation cannot
      // say, as Chrome matches it against the sheet before @page turns it
      if (land(mode)) root.setAttribute("data-land", "");
      else root.removeAttribute("data-land");
    }
    function poff() {
      root.removeAttribute("data-print");
      root.removeAttribute("data-land");
      root.setAttribute("data-font", P.fnt);
      root.setAttribute("data-ref", String(P.ref));
    }

    // ---- The print builder (print redesign P4, mockup 1): What (js/print/what.js), then How (the rows below) ----
    // On a phone one step at a time (data-step on #prm: Next, and ‹ What to print back); from 760px side by side
    // (css/03-menus-print-view.css). The bottom bar keeps the running total and Next or Print.
    var what = createWhat(/** @type {HTMLElement} */ (byId("prwl")), {
        shelves: shelvesNow,
        today: shownSessions,
        // the routines to print (Satish, 2026-11-02: no "Whose routine"; another person's prints once switched to): the
        // person reading's (named: their own or the ready-made one they follow), then the four ready-made ones
        // (content/routines.json), to print for someone without the app
        people: function () {
          var a = active(),
            bw = /** @type {Record<string, string>} */ (menuWords("routine").bases);
          return (a ? [{ id: a.id, name: a.name, routine: followed(a) }] : []).concat(
            BASES.map(function (b) {
              return { id: "base:" + b, name: bw[b], routine: baseRoutine(loaded.routines, b) };
            }),
          );
        },
        me: function () {
          var a = active();
          return a ? a.id : "";
        },
        onChange: function () {
          pagesSoon();
          preview();
        },
      }),
      bnx = /** @type {HTMLButtonElement} */ (byId("prnx")),
      wide = typeof window.matchMedia === "function" ? matchMedia("(min-width: 760px)") : null;
    // the texts ticked (their Library ids), or null for every text; on the Routine tab, the routine's in routine order
    function chosen() {
      return what.pick();
    }
    // a routine printout's plan (the Routine tab on show), else null
    function rplan() {
      return what.plan();
    }
    // one day's printout (the Routine tab on show, one day), else null
    function splan() {
      return what.session();
    }
    // the bottom bar, the hints and the preview follow every choice
    function refresh() {
      pagesSoon();
      preview();
    }
    // The preview under How: the first page of the first text ticked, as it prints, made small. Written as the print
    // view is (build), into a frame the size of the page, cut off at the page's foot
    var shv = byId("prsheet"),
      pshown = "";
    // the first text ticked, in the Library's order as this phone lists it (as it prints); a routine's or a session's first text
    function first() {
      var c = chosen(),
        /** @type {string | null} */
        f = null;
      if (rplan() || splan()) return c && c.length ? [c[0]] : null;
      shelvesNow().forEach(function (sh) {
        sh.texts.forEach(function (t) {
          if (!f && (!c || c.indexOf(t.id) >= 0)) f = t.id;
        });
      });
      return f ? [f] : null;
    }
    function preview() {
      if (pm.hidden) return;
      var ids = first(),
        rp = rplan(),
        m = dm(),
        k = ids ? [m, ids[0], plang(), LEAD, pref(), P.tr, P.ind, pfn(), land(m), letter(), rp ? rp.key : ""].join("|") : "",
        sh = sheet(m),
        w = 120; // its width (css/03-menus-print-view.css .prsheet)
      shv.setAttribute("aria-label", menuWords("print").preview);
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
        d.write(
          '<!doctype html><html data-print="' +
            m +
            '"' +
            (land(m) ? " data-land" : "") +
            attrs() +
            // no <base>: a frame written with document.open() has the page's own address already, and Safari refuses a
            // <base> there (the Content-Security-Policy's base-uri), with an error in the console
            "><head><style>" +
            pcss() +
            "\nhtml,body{margin:0;overflow:hidden;background:#fff}body{box-sizing:content-box;padding:17mm 19mm 0;height:" +
            (sh[1] - 36) +
            "mm}</style></head><body>" +
            box.outerHTML +
            "</body></html>",
        );
        d.close();
      } catch (e) {}
    }
    // the paper, and the button that changes it (Letter or A4)
    function paperRow() {
      var o = letter() ? "A4" : "Letter";
      [].forEach.call(document.querySelectorAll(".prpaper"), function (/** @type {HTMLElement} */ x) {
        x.textContent = letter() ? "Letter" : "A4";
      });
      byId("prpa").textContent = menuWords("print").use(o);
      // Safari keeps the paper picked in its own dialog: when it is not the region's, it is told to pick it there
      [].forEach.call(document.querySelectorAll(".przp"), function (/** @type {HTMLElement} */ x) {
        x.textContent = letter() ? "Letter" : "A4";
      });
      byId("prz").hidden = !(root.classList.contains("wk") && letter() !== LTR);
    }
    byId("prpa").onclick = function () {
      change({ ppr: letter() ? "a4" : "letter" });
      paperRow();
      refresh();
    };
    // the bottom bar: "5 texts" (or the one text's name), or that a text must be picked (Next and Print wait for one)
    function summary() {
      var w = whatWords(),
        t = what.total(),
        el = byId("prsum");
      el.textContent = "";
      el.lang = ui();
      var a = document.createElement("span");
      // one text: its name
      a.textContent = t.one || (t.texts ? w.texts(t.texts) : w.pick);
      if (t.one) a.lang = t.oneLang;
      el.appendChild(a);
      // and about how many pages, once counted
      var n = t.texts ? count(null) : -1;
      if (n > 0) {
        var b = document.createElement("b");
        b.textContent = menuWords("print").about(n);
        el.appendChild(b);
      }
      bpr.disabled = bnx.disabled = !t.texts;
    }
    // ---- About how many pages: the bottom bar ("about 12 pages") and the hints under Dhrupad and Page ----
    // The printout is written as for printing into a hidden frame as wide as the page's text, and its blocks' places
    // are counted into pages by the print rules (js/print/pages.js). A count waits for the choices to settle, is kept by
    // what it was for, and is not shown once a newer choice has overtaken it
    /** @type {Record<string, number>} */
    var counted = {},
      /** @type {HTMLIFrameElement | null} */
      cf = null,
      cwait = 0, // the pause before counting
      cnow = 0, // the latest round of counts asked for
      /** @type {Promise<any>} */
      queue = Promise.resolve();
    // what a count is for: what is printed and how, with one choice changed (o)
    /** @param {{ ref?: number, land?: boolean } | null} o */
    function pageKey(o) {
      alt = o;
      try {
        var m = dm(),
          c = chosen(),
          rp = rplan(),
          sp = splan();
        return [
          m,
          c ? c.join(",") : "*",
          plang(),
          LEAD,
          pref(),
          P.tr,
          P.ind,
          pfn(),
          land(m),
          letter(),
          rp ? rp.key : "",
          sp ? sp.session + "@" + sp.day : "",
        ].join("|");
      } finally {
        alt = null;
      }
    }
    // the pages counted for it, or -1 while not yet
    /** @param {{ ref?: number, land?: boolean } | null} o */
    function count(o) {
      var k = pageKey(o);
      return k in counted ? counted[k] : -1;
    }
    // a printout's blocks as laid out (js/print/pages.js Block), each text's in a list of its own, read from the print
    // rules themselves (css/15-print.css), so the count follows them whatever they become: break-before: page starts a
    // new text, break-inside: avoid is never split, break-after: avoid stays with what follows, and any other block
    // with no blocks in it splits between its lines
    /** @param {Element} el @param {import("../print/pages.js").Block[][]} out */
    function blocks(el, out) {
      var w = /** @type {Window} */ (el.ownerDocument.defaultView);
      [].forEach.call(el.children, function (/** @type {Element} */ c) {
        var cs = w.getComputedStyle(c),
          whole = /^avoid/.test(cs.breakInside) || /^avoid/.test(cs.pageBreakInside);
        if (cs.display === "none") return;
        if (/^(page|always|left|right)$/.test(cs.breakBefore) || cs.pageBreakBefore === "always") out.push([]);
        // a box around blocks (a text, its column, a wrapper without a box of its own): the blocks in it
        if (
          cs.display === "contents" ||
          (!whole &&
            // (a stanza centred as an inline-block is a box of its own too)
            [].some.call(c.children, function (/** @type {Element} */ x) {
              return w.getComputedStyle(x).display !== "inline";
            }))
        )
          return blocks(c, out);
        var r = c.getBoundingClientRect();
        if (!r.height) return;
        /** @type {import("../print/pages.js").Block} */
        var b = { top: r.top, bottom: r.bottom };
        if (/^avoid/.test(cs.breakAfter) || /^avoid/.test(cs.pageBreakAfter)) b.keep = true;
        if (!whole) b.line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
        out[out.length - 1].push(b);
      });
      return out;
    }
    // count the pages, with one choice changed (o); null when a newer round has begun
    /** @param {{ ref?: number, land?: boolean } | null} o @param {string} k @param {number} round @returns {Promise<number | null>} */
    function countNow(o, k, round) {
      if (round !== cnow || pm.hidden) return Promise.resolve(null);
      var html = "",
        h = 0;
      alt = o;
      try {
        var m = dm(),
          sh = sheet(m),
          box = document.createElement("div");
        box.id = "pv";
        build(m, chosen(), rplan(), box, splan());
        h = ((sh[1] - 36) * 96) / 25.4; // the page less its top and bottom margins (css/15-print.css @page)
        html =
          '<!doctype html><html data-print="' +
          m +
          '"' +
          (land(m) ? " data-land" : "") +
          attrs() +
          // (no <base>: as in the preview above)
          "><head><style>" +
          pcss() +
          "\nhtml,body{margin:0;background:#fff}body{width:" +
          (sh[0] - 38) +
          "mm}</style></head><body>" +
          box.outerHTML +
          "</body></html>";
      } finally {
        alt = null;
      }
      if (!cf) {
        cf = document.createElement("iframe");
        cf.setAttribute("aria-hidden", "true");
        cf.tabIndex = -1;
        cf.title = "Pages";
        cf.style.cssText = "position:fixed;left:-10000px;top:0;width:1200px;height:900px;border:0;visibility:hidden";
        document.body.appendChild(cf);
      }
      var d = /** @type {Document} */ (cf.contentDocument);
      d.open();
      d.write(html);
      d.close();
      void d.body.offsetHeight; // laid out, so the fonts it uses are asked for before waiting for them
      return (d.fonts ? d.fonts.ready : Promise.resolve()).then(function () {
        if (round !== cnow || !cf || cf.contentDocument !== d) return null;
        counted[k] = countPages(blocks(/** @type {Element} */ (d.getElementById("pv")), [[]]), h);
        return counted[k];
      });
    }
    // the counts the pop-up shows: for the choices made; beside Every verse, Once's; beside one language on
    // Landscape, Portrait's
    function wants() {
      /** @type {({ ref?: number, land?: boolean } | null)[]} */
      var w = [null];
      if (pref() === 0) w.push({ ref: 1 });
      if (FEAT_SW && plang() !== "both" && land("one")) w.push({ land: false });
      return w;
    }
    // the bottom bar and the hints now, with what is counted, and the counts still missing a moment later
    function pagesSoon() {
      clearTimeout(cwait);
      var round = ++cnow;
      summary();
      hints();
      if (pm.hidden || !what.total().texts) return;
      cwait = setTimeout(function () {
        wants().forEach(function (o) {
          var k = pageKey(o);
          if (k in counted) return;
          queue = queue
            .then(function () {
              return countNow(o, k, round);
            })
            .then(function (n) {
              if (n !== null && round === cnow) {
                summary();
                hints();
              }
            })
            .catch(function (e) {
              console.warn("Counting the pages failed", e);
            });
        });
      }, 300);
    }
    function pagesStop() {
      clearTimeout(cwait);
      cnow++;
      if (cf) cf.remove();
      cf = null;
    }
    // The star on the recommended choices (Once, and Portrait for one language: the fewest pages) and before their hint
    var SVG = "http://www.w3.org/2000/svg";
    function star() {
      var s = document.createElementNS(SVG, "svg"),
        p = document.createElementNS(SVG, "path");
      s.setAttribute("class", "prbest");
      s.setAttribute("viewBox", "0 0 24 24");
      s.setAttribute("aria-hidden", "true");
      p.setAttribute("d", "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z");
      s.appendChild(p);
      return s;
    }
    /** @param {Element} b */
    function best(b) {
      b.appendChild(star());
      b.setAttribute("aria-describedby", "prrec");
    }
    // the hints under Dhrupad and Page: what the choice made gives, the recommended one's with its star; a choice
    // that takes more pages says about how many more
    function hints() {
      var pw = menuWords("print"),
        n = count(null),
        side = plang() === "both",
        up = !land("one"),
        other = LEAD === "en" ? /** @type {Record<string, string>} */ (pw.langs)[olang()] : pw.langs.en;
      /** @param {{ ref?: number, land?: boolean }} o */
      function more(o) {
        var a = n > 0 ? count(o) : -1;
        return a > 0 && n > a ? n - a : 0;
      }
      hint("prdhh", pref() === 1, pref() === 1 ? pw.onceHint : pw.everyHint(more({ ref: 1 })));
      hint("prpgh", side || up, side ? pw.sideHint(other) : up ? pw.upHint : pw.landHint(more({ land: false })));
      byId("prpgh").hidden = !FEAT_SW;
    }
    /** @param {string} id @param {boolean} starred @param {string} words */
    function hint(id, starred, words) {
      var p = byId(id);
      p.textContent = "";
      p.lang = ui();
      if (starred) p.appendChild(star());
      p.appendChild(document.createTextNode(words));
    }
    /** @param {string} s */
    function step(s) {
      pm.setAttribute("data-step", s);
      pm.scrollTop = 0;
    }
    bnx.onclick = function () {
      step("how");
      bpr.focus({ preventScroll: true });
    };
    byId("prbk").onclick = function () {
      step("what");
      bnx.focus({ preventScroll: true });
    };
    // The page as it prints: the browser is told with @page, set as each printout is made (Chrome, Edge and
    // Firefox follow it; Safari keeps the sheet the reader picks in its dialog, so the pop-up tells them to
    // pick Landscape there)
    var pst = document.createElement("style");
    pst.media = "print";
    document.head.appendChild(pst);
    /** @param {string} mode */
    function setPage(mode) {
      // the paper only when picked under How: otherwise the printer's own, as before
      var sz = P.ppr ? (letter() ? "letter " : "A4 ") : "";
      pst.textContent = sz || land(mode) ? "@page { size: " + sz + (land(mode) ? "landscape" : "portrait") + " }" : "";
    }
    // Above the choices: the dhrupad setting for the printout and its font (the three of Settings → Text font), with
    // a word of the text in each; neither changes the reading page
    var fn = byId("prfn"),
      dh = byId("prdg");
    best(/** @type {Element} */ (dh.querySelector('[data-v="1"]')));
    [].forEach.call(document.querySelectorAll("#sfn button"), function (/** @type {any} */ b) {
      fn.appendChild(b.cloneNode(true));
    });
    // each font a tile: a word of the text in that font (set in rows), over the font's name (mockup 1)
    [].forEach.call(fn.children, function (/** @type {any} */ b) {
      var nm = document.createElement("span"),
        x = document.createElement("span");
      nm.className = "prfm";
      x.className = "prfx";
      x.setAttribute("aria-hidden", "true");
      while (b.firstChild) nm.appendChild(b.firstChild);
      b.appendChild(x);
      b.appendChild(nm);
    });
    // the font recommended for print: Traditional (classic), the book-style face (the fonts take the same pages, so
    // it is the look that decides): a star, as on Once and Portrait, and no hint
    best(/** @type {Element} */ (fn.querySelector('[data-v="classic"]')));
    fn.onclick = function (e) {
      var b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest("button"));
      if (!b) return;
      change({ pfn: b.dataset.v });
      fontsAhead();
      rows();
      refresh();
    };
    // the sample line in the printout's font (set here: the page's own font rules follow the text font)
    /** @type {Record<string, string>} */
    var FAM = { classic: "SC Classic", bold: "SC Bold" };
    // the sample: the first words of the first verse, in each language printed (the main one first), in the
    // printout's font. Set here: the page's own font rules follow the text font
    /** @param {string} lang @param {string} [font] (else the printout's) */
    function fam(lang, font) {
      var f = font || pfn(),
        ind = IND[lang],
        base = ind ? '"' + ind[0] + '", var(--body)' : lang === "en" ? '"SC Sans", var(--lat)' : "var(--body)";
      return f === "std" ? base : '"' + (ind ? ind[indAt(f)] : FAM[f]) + '", ' + base;
    }
    /** @param {string} k */
    function words(k) {
      var a1 = pieceEl("a1"), // (built if not opened yet: js/core/page.js)
        p = a1 && a1.querySelector(".item:not(.dh) .verse ." + k + " p"),
        t = p ? p.textContent.replace(/\s+/g, " ").trim() : "";
      t = t.split(/[,|।]/)[0].trim();
      return t.length > 26 ? t.slice(0, 26).replace(/\s+\S*$/, "") + "…" : t;
    }
    function rows() {
      var or = olang(),
        ks = plang() === "both" ? (LEAD === "en" ? ["en", "mr"] : ["mr", "en"]) : [plang() === "en" ? "en" : "mr"];
      [].forEach.call(dh.children, function (/** @type {any} */ b) {
        b.setAttribute("aria-pressed", b.dataset.v === String(pref()) ? "true" : "false");
      });
      // each tile: the first word of the text in the main language printed, in that tile's font (in the language of
      // the word, not as .mr or .en: those follow the menus' language here)
      var lang = ks[0] === "en" ? "en" : or,
        w = words(ks[0]).split(" ")[0].replace(/…$/, "");
      [].forEach.call(fn.children, function (/** @type {any} */ b) {
        b.setAttribute("aria-pressed", b.dataset.v === pfn() ? "true" : "false");
        var x = b.querySelector(".prfx");
        x.textContent = w;
        x.setAttribute("lang", lang);
        x.style.setProperty("font-family", fam(lang, b.dataset.v), "important");
        x.style.setProperty("font-weight", b.dataset.v === "bold" ? "600" : "400", "important");
      });
    }
    dh.onclick = function (e) {
      var b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest("button"));
      if (!b) return;
      change({ pref: Number(b.dataset.v) });
      rows();
      refresh();
    };
    // the site's CSS as the printer sees it: print rules on, screen-only rules off, no @page
    /** @type {string} the site's CSS for the printer, worked out once */
    var pcssT = "";
    function pcss() {
      if (pcssT) return pcssT;
      /** @type {string[]} */
      var out = [];
      /** @param {any} rules */
      function walk(rules) {
        [].forEach.call(rules, function (/** @type {any} */ r) {
          if (r.type === 4) {
            var m = r.media.mediaText;
            if (/print/.test(m)) walk(r.cssRules);
            else if (!/screen/.test(m)) out.push(r.cssText);
          } else if (r.type !== 6) out.push(r.cssText);
        });
      }
      [].forEach.call(document.styleSheets, function (/** @type {any} */ sh) {
        try {
          walk(sh.cssRules);
        } catch (e) {}
      });
      return (pcssT = out.join("\n"));
    }
    // the page's own attributes as the printout has them (its font and dhrupad), for a copy of it in a frame
    function attrs() {
      var at = "";
      [].forEach.call(root.attributes, function (/** @type {any} */ a) {
        var v = a.name === "data-font" ? pfn() : a.name === "data-ref" ? String(pref()) : a.value;
        if (a.name !== "data-print" && a.name !== "data-land") at += " " + a.name + '="' + v.replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '"';
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
      standalone = /** @type {any} */ (navigator).standalone || (typeof window.matchMedia === "function" && matchMedia("(display-mode: standalone)").matches);
    // the page choice as chosen, and Safari's Landscape note with it
    function pages1() {
      var up = !land("one");
      b1.setAttribute("aria-pressed", String(up));
      b2.setAttribute("aria-pressed", String(!up));
      byId("prl").hidden = !(root.classList.contains("wk") && land(dm()));
    }
    bpr.onclick = function () {
      var m = dm();
      go(m === "one" ? "as" : m);
    };
    // the pop-up: the choices (ready false), or Print now (ready true)
    /** @param {boolean} ready */
    function pmMode(ready) {
      bpr.hidden = pn.hidden = po.hidden = ready;
      byId("prst").hidden = byId("prsum").hidden = bnx.hidden = ready;
      // (neither step: the title shows, without ‹ What to print)
      if (ready) pm.setAttribute("data-step", "ready");
      // both languages print side by side on Landscape only (stacked took a third more paper): no choice to
      // make, the row just says so; upright only while Landscape is held back (FEAT_SW)
      var one = !FEAT_SW || plang() === "both";
      byId("prpg").hidden = one;
      byId("prpv").hidden = !one;
      // Safari keeps the sheet picked in its own dialog: it is told to pick Landscape there
      byId("prl").hidden = !(root.classList.contains("wk") && land(dm()));
      // Safari on a Mac and Firefox: Chrome turns the page itself and prints the border and page numbers (Satish,
      // 2026-10); Firefox drops the page numbers (no @page margin boxes, checked in Firefox 157)
      byId("prc").hidden = !((root.classList.contains("wk") && !iOS) || root.classList.contains("ff"));
      // Safari (WebKit, every iPhone browser too) scales the printout down a little and has no page numbers
      byId("prs").hidden = !root.classList.contains("wk");
      bgo.hidden = !ready;
      pw.hidden = pv2.hidden = bsf.hidden = bcp.hidden = true;
    }
    // ---- The iPhone Home Screen app cannot print: hand the printout over to Safari ----
    // Safari opens at this site's address with the print choices in it (read by js/render.js), and offers
    // Print now there. iOS 17 and later open an x-safari-https:// address in Safari; Copy link is for the rest.
    // On Satish's iPhone neither the Print tap nor a second one (Print now) opened the dialog in the app, so the
    // app goes straight to this step once a layout is chosen.
    /** @param {string} mode */
    function link(mode) {
      /** @type {Record<string, any>} */
      var s = {};
      ["lang", "lead", "l2", "ui", "ind", "ref", "pref", "fnt", "pfn", "plang", "ppr", "tr", "por"].forEach(function (k) {
        s[k] = P[k];
      });
      var rp = rplan(),
        r = "";
      // a routine printout: whose (name, printed on its first page, and the routine: Safari keeps its own storage) and
      // the days and sessions chosen; of the routine, just those days and sessions
      if (rp) {
        var c = what.routine();
        r = "&r=" + encodeURIComponent(JSON.stringify({ n: rp.name, r: routinePart(rp.routine, rp.days, rp.sessions), w: c.span, d: rp.days, s: c.sessions }));
      }
      // a session's printout: which, so Safari prints it in this order with its heading
      var sp = splan();
      if (sp && sp.session) r += "&o=" + sp.session + (typeof sp.day === "number" ? "&od=" + sp.day : "");
      return (
        location.origin +
        location.pathname +
        "?print=" +
        mode +
        "&s=" +
        encodeURIComponent(JSON.stringify(s)) +
        (chosen() ? "&t=" + /** @type {string[]} */ (chosen()).join(",") : "") +
        r
      );
    }
    // open: the pop-up is already open (its Back step is in place); tapped: Print now was tapped and the
    // dialog still did not open (not the Home Screen app: another app's browser, or Safari holding it back),
    // so the note names Share → Print too
    /** @param {boolean} open @param {boolean} [tapped] */
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
    function openSafari() {
      var u = "x-safari-" + link(last);
      bsf.setAttribute("data-to", u); // (for the tests)
      location.href = u;
    }
    bsf.onclick = openSafari;
    // Print in the Home Screen app goes to Safari in the one tap, no pop-up between (Satish, 2026-10-27): iOS 17 and
    // later open an x-safari-https:// address in Safari. Once the app is left, the builder is closed, so the app is as
    // it was on coming back; if Safari did not open (an older iOS, or iOS held it back), Open in Safari and Copy link
    var IOS17 = (function () {
      var v = /OS (\d+)_\d+(?:_\d+)? like Mac OS X/.exec(navigator.userAgent);
      return !!v && Number(v[1]) >= 17;
    })();
    function toSafariNow() {
      if (!IOS17) return toSafari(true);
      var gone = false;
      function away() {
        if (document.visibilityState !== "hidden" || gone) return;
        gone = true;
        document.removeEventListener("visibilitychange", away);
        pmClose();
      }
      document.addEventListener("visibilitychange", away);
      openSafari();
      setTimeout(function () {
        document.removeEventListener("visibilitychange", away);
        if (!gone && !pm.hidden) toSafari(true);
      }, 2000);
    }
    bcp.onclick = function () {
      var u = link(last);
      try {
        navigator.clipboard.writeText(u).then(
          function () {
            message(menuWords("print").linkCopied);
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
    /** @param {boolean} again */
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
    /** @param {string} mode */
    function go(mode) {
      last = mode;
      // nothing chosen that the Library has (a print link naming texts since removed): What, to choose again, never
      // the whole Library
      if (!what.total().texts) {
        message(menuWords("print").gone, 4000);
        return openPrint({});
      }
      // the iPhone Home Screen app cannot print: straight to Safari (iOS 17 and later open it in the same tap), else
      // Open in Safari
      if (iOS && standalone) return toSafariNow();
      pagesStop();
      pm.hidden = true;
      ovDrop();
      // the chosen button has just been hidden: keyboard focus goes back to where Print was opened from (Share, as
      // Print is in its closed menu), not to the top of the page
      focusBack(opener || byId("tmb"));
      busy = true;
      if (mode === "as") mode = "one";
      sel = chosen();
      job = { m: mode, ids: sel, rp: rplan(), sp: splan() };
      setPage(mode);
      build(mode, sel, rplan(), undefined, splan());
      pon(mode);
      tryPrint(false);
    }
    // Open the builder: at What with the ticks as last left; with a session (tab "today"), at What on the Routine tab
    // with it chosen; with a text, just it ticked and at How (on a phone; ‹ What to print shows the choice)
    /** @param {{ ids?: string[], tab?: string, session?: string, day?: number, from?: HTMLElement | null }} [o] */
    function openPrint(o) {
      o = o || {};
      opener = o.from || byId("tmb");
      unready();
      pmMode(false);
      // the language names follow what is printed: the original's place holds Marathi or Kannada, and with
      // both languages shown the main one comes first (left, or on top)
      var pw = menuWords("print"),
        en = pw.langs.en,
        or = /** @type {Record<string, string>} */ (pw.langs)[olang()],
        l1 = LEAD === "en" ? en : or,
        l2 = LEAD === "en" ? or : en;
      // the page: Portrait or Landscape (one language), a tap picks it; both languages: Landscape, side by side
      /** @param {HTMLElement} b @param {string} page */
      function opt(b, page) {
        b.textContent = page === "land" ? pw.landscape : pw.portrait;
        if (page === "up") best(b);
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
      var lg = byId("prlg"),
        // (the main language first, as Settings has it: LEAD is English only while both are shown)
        LV = P.lead === "en" ? ["en", "mr", "both"] : ["mr", "en", "both"];
      lg.textContent = "";
      LV.forEach(function (v) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("data-v", v);
        b.textContent = v === "both" ? pw.both : v === "en" ? en : or;
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
      byId("prpv").textContent = !FEAT_SW ? pw.stacked(l1, l2) : pw.side;
      pages1();
      rows();
      paperRow();
      byId("prx").setAttribute("aria-label", pw.cancel);
      // What, drawn afresh (the Library's categories, the reading languages and the menu language may have changed)
      // a session is the Routine tab's choice, and the Library tab starts with nothing ticked, so a text ticked there
      // prints on its own (not with the session's texts)
      if (o.ids && o.tab === "today") {
        what.today(o.ids, o.session, o.day);
        what.set([]);
      } else if (o.ids) what.set(o.ids);
      what.tab(o.tab || "texts");
      what.render();
      fontsAhead();
      // on a phone, a session (the Routine tab, with the session chosen) opens at What, so another one is a tap away;
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
      [].forEach.call(byId("prlg").children, function (/** @type {any} */ b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === plang()));
      });
    }
    // The builder opened from elsewhere (the tests; a future entry point): the event "nitya-print", its detail as for
    // openPrint ({ ids, tab }). One Print (in the top bar's Share menu; not also Print this text,
    // Satish, 2026-10-22) opens it, at the session or the text being read, and its Library tab picks any texts
    document.addEventListener("nitya-print", function (e) {
      openPrint(/** @type {CustomEvent} */ (e).detail || {});
    });
    // Print (#menu-print in the Share menu, on every screen: Satish, 2026-11-13):
    // while reading, the session being read (js/features/today-card.js runIds), else the text
    // on screen; on Home, the session Home shows, on the day it shows, even with a session still being read (Home in the
    // bottom bar leaves it running). A session opens at What on the Routine tab, with it chosen and headed by its day; a
    // text at How
    /** @param {HTMLElement} b the Print button tapped */
    function printFrom(b) {
      var sec = cur(),
        ids = sec ? runIds() : null,
        s = "",
        /** @type {{ id: string } | null} */
        t = null;
      if (!sec) {
        s = shownSession();
        ids = (
          shownSessions().filter(function (x) {
            return x.session === s;
          })[0] || { ids: [] }
        ).ids;
      }
      if (ids && ids.length) return openPrint({ ids: ids, tab: "today", session: s, day: sec ? runDay() : shownDay().day, from: b });
      shelvesNow().forEach(function (s) {
        s.texts.forEach(function (x) {
          if (sec && x.sec === sec.id) t = x;
        });
      });
      var one = /** @type {{ id: string } | null} */ (t);
      openPrint(one ? { ids: [one.id], from: b } : { from: b });
    }
    byId("menu-print").onclick = function () {
      printFrom(byId("menu-print"));
    };
    function pmClose() {
      pagesStop();
      unready();
      pm.hidden = true;
      ovDone();
      focusBack(opener || byId("tmb"));
    }
    byId("prx").onclick = pmClose;
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
        var j = again || { m: dm(), ids: null, rp: null, sp: null };
        setPage(j.m);
        build(j.m, j.ids, j.rp, undefined, j.sp);
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
    /** @type {any} what js/render.js hands over from Open in Safari */
    var W = window;
    if (W.PRQ) {
      var mode = W.PRQ;
      W.PRQ = "";
      // a session from Home: the Routine tab with its texts in Home's order (js/render.js reads it)
      if (W.PRO) {
        what.today(W.PRT || [], W.PRO, W.PROD);
        what.tab("today");
      } else what.set(W.PRT || null);
      // a routine printout (Open in Safari carries it: js/render.js reads it)
      var rr = /** @type {any} */ (window).PRR;
      if (rr && rr.days.length)
        what.carry(
          { id: "link", name: rr.name, routine: cleanRoutine(rr.routine) },
          { who: "link", span: rr.span, days: rr.days, day: rr.days[0], sessions: rr.sessions },
        );
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
        setTimeout(function () {
          go(mode);
        }, 300);
      });
    }
  })();
}

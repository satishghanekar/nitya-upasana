// Print
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { flash, root, secs } from "../core/page.js";
import { shared, P, save } from "../core/state.js";
import { DV } from "../text/line-breaks.js";
import { fit } from "../print/fit.js";
import { LAYOUT } from "../print/profiles.js";
import { ovDone, ovDrop, ovPush } from "./history.js";
import { FEAT_SW } from "../core/features.js";
import { CHOICE } from "../print/profiles.js";

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
    function shown(el) {
      return el.offsetParent !== null || (getComputedStyle(el).display !== "none" && el.getClientRects().length > 0);
    }
    function cl(el) {
      var c = el.cloneNode(true);
      c.removeAttribute("id");
      [].forEach.call(c.querySelectorAll("[id]"), function (x) {
        x.removeAttribute("id");
      });
      return c;
    }
    function keep(nodes) {
      var d = document.createElement("div");
      d.className = "pvk";
      nodes.forEach(function (n) {
        d.appendChild(n);
      });
      return d;
    }
    // A prose piece (content/pieces.js) printed in one language reads as running paragraphs, as in a printed
    // booklet: its stanzas run on, each line after the last, and a paragraph starts at a stanza marked para
    // or a dh stanza (said once: a paragraph of its own; one of a single line, the closing peace chant, is
    // centred). Each paragraph is one item; its lines keep their data-l.
    function prose(units) {
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
      return gs.map(function (g) {
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
    // Build the print view (#pv) from the page: contents, then every piece in the text language.
    // mode: "one" (one column) or "side" (Marathi and English side by side)
    function build(mode) {
      // Folded sections and pieces are printed in full: open them while the text is copied
      var fa = ["data-pf", "data-xf"].map(function (a) {
          var v = root.getAttribute(a);
          root.removeAttribute(a);
          return [a, v];
        }),
        fs = secs.filter(function (x) {
          return x.classList.contains("af");
        });
      fs.forEach(function (x) {
        x.classList.remove("af");
      });
      try {
        build2(mode);
      } finally {
        fa.forEach(function (a) {
          if (a[1] !== null) root.setAttribute(a[0], a[1]);
        });
        fs.forEach(function (x) {
          x.classList.add("af");
        });
      }
    }
    function build2(mode) {
      pv.innerHTML = "";
      var h = document.createElement("h1");
      h.className = "pvh";
      h.innerHTML = lbl(SCR.to("संकटहर चतुर्थी"), "Sankathara Chaturthi");
      pv.appendChild(h);
      var tc = document.createElement("div");
      tc.className = "pvtoc";
      [].forEach.call(document.querySelectorAll(".tocg"), function (g) {
        var as = g.querySelectorAll("ol.toc li a");
        if (!as.length) return;
        var h3 = document.createElement("h3");
        h3.innerHTML = g.querySelector(".gh").innerHTML;
        tc.appendChild(h3);
        var ol = document.createElement("ol");
        [].forEach.call(as, function (a) {
          var li = document.createElement("li"),
            m = a.querySelector(".m");
          li.innerHTML = m ? m.innerHTML : a.innerHTML;
          li.setAttribute("data-sid", a.getAttribute("data-go") || "");
          ol.appendChild(li);
        });
        ol.style.gridTemplateRows = "repeat(" + Math.ceil(as.length / 2) + ", auto)"; // two columns, top to bottom
        tc.appendChild(ol);
      });
      pv.appendChild(tc);
      secs.forEach(function (sec) {
        var box = document.createElement("section");
        box.className = "pvs";
        box.setAttribute("data-sid", sec.id);
        var hd = document.createElement("h2");
        hd.innerHTML = sec.querySelector("h2").innerHTML;
        // the Pooja and Aarti headings are on the contents page only, not above a piece (Satish, 2026-10)
        var pre = [];
        pre.push(hd);
        var units = [],
          rt = sec.querySelector(".rftop");
        if (rt && shown(rt)) {
          var r = cl(rt);
          r.classList.add("pvref");
          units.push(r);
        }
        [].forEach.call(sec.querySelectorAll(".items > .item, .items > .rmk"), function (u) {
          if (shown(u)) units.push(cl(u));
        });
        if (mode === "side") {
          var first = true,
            t,
            hold = null;
          function flushT() {
            if (!t) return;
            if (first && !hold && t.querySelector(".pvrefrow")) {
              hold = t;
              t = null;
              return;
            }
            var k = first ? keep(pre.concat(hold ? [hold] : [], [t])) : keep([t]);
            first = false;
            box.appendChild(k);
            t = null;
          }
          units.forEach(function (u, ui) {
            if (!u.classList.contains("rmk") || !t) {
              flushT();
              t = document.createElement("table");
              t.className = "pvt pvside";
              // column widths (the English line is longer than its Devanagari, so its column is wider)
              var cg = document.createElement("colgroup");
              (shared.LEAD === "en" ? ["pvce", "pvcm"] : ["pvcm", "pvce"]).forEach(function (c) {
                var col = document.createElement("col");
                col.className = c;
                cg.appendChild(col);
              });
              t.appendChild(cg);
            }
            if (u.classList.contains("rmk")) {
              var tr = document.createElement("tr");
              var c = td([u]);
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
            var v = u.querySelector(".verse"),
              ms = v.querySelectorAll(".mr p"),
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
              if (mp.classList.contains("rf")) {
                tr.classList.add("rfl");
              }
              // English first (Settings → In Both, show first): English on the left
              tr.appendChild(shared.LEAD === "en" ? b : a);
              tr.appendChild(shared.LEAD === "en" ? a : b);
              t.appendChild(tr);
            });
          });
          flushT();
          if (first && hold) {
            t = hold;
            hold = null;
            flushT();
          }
        } else {
          var head = pre.slice();
          if (units[0] && units[0].classList.contains("pvref")) head.push(units.shift());
          var gs = [],
            wait = [],
            flow = P.lang !== "both" && sec.classList.contains("prose");
          if (flow)
            gs = prose(units).map(function (u) {
              return [u];
            });
          else
            units.forEach(function (u) {
              if (u.classList.contains("rmk") && gs.length) {
                gs[gs.length - 1].push(u);
                return;
              }
              if (u.classList.contains("rmk")) {
                wait.push(u);
                return;
              }
              gs.push(wait.concat([u]));
              wait = [];
            });
          if (wait.length) gs.push(wait);
          gs.forEach(function (g) {
            var k = keep(head.concat(g));
            // a paragraph runs on from one page to the next (see paginate)
            if (flow) k.classList.add("pvflow");
            box.appendChild(k);
            head = [];
          });
          if (head.length) box.appendChild(keep(head));
        }
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
          // inside the piece's last unbroken block, so it never lands alone at the top of a page
          var ks = box.querySelectorAll(".pvk");
          (ks.length ? ks[ks.length - 1] : box).appendChild(pc);
        }
        pv.appendChild(box);
      });
    }
    // ---- Page numbers in the printed contents ----
    // A browser cannot print "page N" for a heading, so the print view is laid out once in a hidden
    // frame the size of a printed page (Letter in the US and Canada, A4 elsewhere, upright or sideways
    // as the reader chose) and each piece's first page is worked out from the heights, as the browser
    // breaks pages.
    var LTR = /-(US|CA|MX|PH)$/i.test(navigator.language || ""),
      PAPER = LTR ? [215.9, 279.4] : [210, 297], // upright, in mm
      pcache = {}; // page plans laid out ahead, by pkey()
    // The pop-up's two choices, Portrait and Landscape, for what is printed (CHOICE in js/print/profiles.js):
    // one language in a column, upright or sideways; both languages side by side on sideways pages only (stacked,
    // upright, only while Landscape is held back)
    function choice() {
      return CHOICE[P.lang === "both" ? "both" : "one"];
    }
    // Sideways pages for a layout ("one" or "side"): with both languages, side by side; with one, as the reader
    // last chose in the pop-up (P.por), or its default; upright only while Landscape is held back (FEAT_SW)
    function land(mode) {
      if (!FEAT_SW) return false;
      if (P.lang === "both") return mode === "side";
      return (P.por || choice().page) === "land";
    }
    // the sheet as it prints, [width, height] in mm
    function sheet(mode) {
      return land(mode) ? [PAPER[1], PAPER[0]] : PAPER;
    }
    // The printout's font: picked in the pop-up, else the text font. It is the page's font (data-font) only while
    // printing, so picking one for the printout leaves the reading page as it is (Satish, 2026-10)
    var FONTS = ["std", "classic", "bold", "hand"];
    function pfn() {
      return FONTS.indexOf(P.pfn) >= 0 ? P.pfn : P.fnt;
    }
    // The printout's dhrupad (once, or after every verse) likewise: picked in the pop-up, else as the page shows it
    function pref() {
      return P.pref === 0 || P.pref === 1 ? P.pref : P.ref;
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
    function pkey(mode) {
      return [mode, P.lang, shared.LEAD, pref(), P.tr, P.ui, pfn(), land(mode)].join("|");
    }
    // The page as it prints: the browser is told with @page, set as each printout is made (Chrome, Edge and
    // Firefox follow it; Safari keeps the sheet the reader picks in its dialog, so the pop-up tells them to
    // pick Landscape there)
    var pst = document.createElement("style");
    pst.media = "print";
    document.head.appendChild(pst);
    function setPage(mode) {
      pst.textContent = land(mode) ? "@page { size: landscape }" : "";
    }
    // Above the choices: the dhrupad setting for the printout and its font
    // (the four of Settings → Text font), with a line of the text in it; neither changes the reading page
    var fn = document.getElementById("prfn"),
      dh = document.getElementById("prdg");
    [].forEach.call(document.querySelectorAll("#sfn button"), function (b) {
      fn.appendChild(b.cloneNode(true));
    });
    fn.onclick = function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      P.pfn = b.dataset.v;
      save();
      rows();
    };
    // the sample line in the printout's font (set here: the page's own font rules follow the text font)
    var FAM = { classic: "SC Classic", bold: "SC Bold", hand: "SC Hand" };
    // the sample: the first words of the first verse, in each language printed (the main one first), in the
    // printout's font. Set here: the page's own font rules follow the text font
    function fam(lang) {
      var f = pfn(),
        kn = lang === "kn",
        base = kn ? '"Noto Sans Kannada", var(--body)' : lang === "en" ? "var(--lat)" : "var(--body)";
      return f === "std" ? base : '"' + (kn ? FAM[f].replace("SC ", "SC Kn ") : FAM[f]) + '", ' + base;
    }
    function words(k) {
      var p = document.querySelector("#a1 .item:not(.dh) .verse ." + k + " p"),
        t = p ? p.textContent.replace(/\s+/g, " ").trim() : "";
      t = t.split(/[,|।]/)[0].trim();
      return t.length > 26 ? t.slice(0, 26).replace(/\s+\S*$/, "") + "…" : t;
    }
    function rows() {
      var or = P.ind === "kn" ? "kn" : "mr",
        ks = P.lang === "both" ? (shared.LEAD === "en" ? ["en", "mr"] : ["mr", "en"]) : [P.lang === "en" ? "en" : "mr"];
      [].forEach.call(dh.children, function (b) {
        b.setAttribute("aria-pressed", b.dataset.v === String(pref()) ? "true" : "false");
      });
      [].forEach.call(fn.children, function (b) {
        b.setAttribute("aria-pressed", b.dataset.v === pfn() ? "true" : "false");
      });
      var fs = document.getElementById("prfs");
      fs.textContent = "";
      fs.classList.toggle("one", ks.length === 1);
      ks.forEach(function (k, i) {
        // (in the language of the line, not as .mr or .en: those follow the menus' language here)
        var lang = k === "en" ? "en" : or,
          e = i ? document.createElement("span") : fs;
        if (i) {
          fs.appendChild(document.createTextNode(" · "));
          e.setAttribute("lang", lang);
          e.textContent = words(k);
          fs.appendChild(e);
        } else {
          fs.setAttribute("lang", lang);
          fs.appendChild(document.createTextNode(words(k)));
        }
        e.style.setProperty("font-family", fam(lang), "important");
        e.style.setProperty("font-weight", lang === "kn" && pfn() === "bold" ? "500" : "400", "important");
      });
    }
    dh.onclick = function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      P.pref = +b.dataset.v;
      save();
      rows();
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
    // lay out the current print view (#pv) and call back with { piece id: first page }
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
      [].forEach.call(root.attributes, function (a) {
        var v = a.name === "data-font" ? pfn() : a.name === "data-ref" ? String(pref()) : a.value;
        if (a.name !== "data-print") at += " " + a.name + '="' + v.replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '"';
      });
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
          end(paginate(f.contentWindow, d, (sh[1] - 23) * sf, mm));
        } catch (e) {
          end(null);
        }
      }
      setTimeout(run, 2500);
      try {
        var d = f.contentDocument;
        d.open();
        d.write('<!doctype html><html data-print="' + mode + '"' + at + '><head><base href="' + location.href.replace(/"/g, "%22") + '"><style>' + pcss() + "\nhtml,body{margin:0;overflow:hidden}#pv .pvtoc{break-after:column}#pv .pvs+.pvs{break-before:column}</style></head><body>" + pv.outerHTML + "</body></html>");
        d.close();
        // lay out once so the fonts the copy uses start loading, then wait for them before measuring
        d.documentElement.offsetHeight;
        d.fonts.ready.then(run);
      } catch (e) {
        end(null);
      }
    }
    // The site decides every page break, because a forced break ("start a new page here") is the one
    // page rule Chrome and Safari both follow. Each piece starts on a new page; its blocks (stanzas,
    // verse groups) are packed onto pages with 4% to spare, and a break is forced before each block
    // that starts a page. The contents numbers come from the same plan, so they match the printout.
    function paginate(w, d, hmm, mm) {
      var p = d.getElementById("pv"),
        cs = w.getComputedStyle(p),
        pl = parseFloat(cs.paddingLeft),
        cw = p.clientWidth - pl - parseFloat(cs.paddingRight),
        secs = [].slice.call(p.querySelectorAll(".pvs")),
        // Measured against Chrome's own PDFs: the frame is 12px narrower than the page (16px with the
        // optional text fonts; printed text runs a little wider, so a near-full line wraps).
        H = hmm * mm - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
        // a page is packed to 96% of its height; Safari to 90%, as its printed pages held up to a tenth less
        // than its plan in Satish's Safari PDFs (Kannada and both languages, sideways)
        C = H * (root.classList.contains("wk") ? 0.9 : 0.96),
        plan = {},
        z = {},
        out = { z: z, b: {}, t: {} };
      if (!secs.length) return out;
      function pack(hs, k, fl) {
        var n = 1,
          used = 0,
          br = [];
        hs.forEach(function (h, i) {
          // set smaller, a block of lines is that much shorter; a paragraph also fits more words on each
          // line, so it takes fewer lines too (Satish's Safari PDFs: English prose at 88% took two pages
          // where heights scaled once had planned three)
          h *= fl && fl[i] ? k * k : k;
          // a block starts a new page when it does not fit below the last one; but a block taller than a
          // page (it happens on a sideways page) breaks between its lines anyway, so it starts below the
          // last block when a quarter of the page is still free, rather than leaving that space empty. A
          // paragraph of prose (.pvflow) runs on from page to page like a book's: never a forced break
          if (used > 0 && used + h > C && !(fl && fl[i]) && (h <= C || C - used < C / 4)) {
            n++;
            used = 0;
            br.push(i);
          }
          // a block taller than a page runs onto the next one: it counts for every page it takes, so a
          // piece set smaller to keep it on one page is preferred
          used += h;
          while (used > C) {
            n++;
            used -= C;
          }
        });
        return { n: n, b: br, f: used / H };
      }
      // 1. pieces made of blocks: measure each block and pack them onto pages. Measured 20px narrower
      // than the frame (a near-full line then wraps here first), so heights err on the tall side.
      var pw = p.style.cssText;
      p.style.cssText = "box-sizing:border-box;width:" + (p.offsetWidth - 20) + "px";
      secs.forEach(function (e) {
        var id = e.getAttribute("data-sid"),
          kids = [].slice.call(e.children);
        if (!kids.length) return;
        var top = e.getBoundingClientRect().top,
          tops = kids.map(function (c) {
            return c.getBoundingClientRect().top;
          }),
          hs = kids.map(function (c, i) {
            return (i + 1 < kids.length ? tops[i + 1] : c.getBoundingClientRect().bottom) - (i ? tops[i] : top);
          }),
          fl = kids.map(function (c) {
            return c.classList.contains("pvflow");
          }),
          r = pack(hs, 1, fl);
        // a piece that would take fewer pages a little smaller is set at the largest size that does (no
        // smaller than LAYOUT.page.minZoom): one that spills a little onto another page, or one whose
        // blocks are too big to share a page and leave half of each page empty. (Not prose, which fills
        // its pages anyway: it keeps its size.)
        if (r.n > 1 && fl.indexOf(true) < 0) {
          var fewest = r,
            at = 1;
          for (var t = 98; t >= LAYOUT.page.minZoom * 100; t -= 2) {
            var q = pack(hs, t / 100);
            if (q.n < fewest.n) {
              fewest = q;
              at = t / 100;
            }
          }
          if (at < 1) {
            r = fewest;
            z[id] = at;
          }
        }
        // Safari keeps this plan (step 2 is Chrome's): prose that spills onto a page is set at the largest size
        // that takes a page fewer, as step 2 does for Chrome (in Satish's Safari PDFs the last line or two of the
        // Atharvashirsha printed alone on a page). Safari prints prose shorter than this plan (in his October
        // 18 PDFs, an English tail planned at over a quarter of a page printed as 3 lines, and Marathi sideways
        // planned onto a third page fitted in two), so a spill of up to 45% of a page counts. The 90% packing
        // is its spare room.
        if (root.classList.contains("wk") && fl.indexOf(true) >= 0 && r.n > 1 && r.f < 0.45) {
          for (var u = 98; u >= LAYOUT.page.minZoom * 100; u -= 2) {
            var v = pack(hs, u / 100, fl);
            if (v.n < r.n) {
              r = v;
              z[id] = u / 100;
              break;
            }
          }
        }
        plan[id] = r;
        if (r.b.length) out.b[id] = r.b;
        // a block taller than a page even at the size chosen may break inside, between its lines
        var tall = [];
        hs.forEach(function (h, i) {
          if (h * (z[id] || 1) > C || fl[i]) tall.push(i);
        });
        if (tall.length) out.t[id] = tall;
      });
      p.style.cssText = pw;
      // pages the contents take
      var first = secs[0].getBoundingClientRect().top - p.getBoundingClientRect().top - parseFloat(cs.paddingTop),
        page = Math.max(1, Math.ceil((first - 1) / H));
      // 2. lay the print view out as a row of page-sized columns, which the browser breaks as it breaks
      // pages: each piece's plan (size and forced breaks) goes in first, then the columns show where each
      // block really lands. The browser breaks a little differently from the plain sum of heights, above
      // all in a piece set smaller (by up to a block on a sideways page), so a block it moves to the next
      // page gets a forced break of its own there, and the contents numbers follow. (Not in Safari: its
      // plan, from the heights, is the one its printouts were checked against.)
      if (!root.classList.contains("wk")) {
        var st = d.createElement("style");
        st.textContent = "#pv .pvbr{break-before:column}";
        d.head.appendChild(st);
        secs.forEach(function (e) {
          var id = e.getAttribute("data-sid"),
            kids = [].slice.call(e.children);
          if (!plan[id]) return;
          if (z[id]) e.style.zoom = z[id];
          (out.t[id] || []).forEach(function (i) {
            kids[i].classList.add("pvtall");
          });
          plan[id].b.forEach(function (i) {
            var br = d.createElement("div");
            br.className = "pvbr";
            e.insertBefore(br, kids[i]);
          });
        });
        p.style.cssText =
          "padding-top:0;padding-bottom:0;box-sizing:content-box;overflow:visible;column-gap:0;column-fill:auto;column-width:" + cw + "px;height:" + H + "px";
        var x0 = p.getBoundingClientRect().left + pl,
          y0 = p.getBoundingClientRect().top;
        // the page (column) an element starts on, and the one it ends on
        var col = function (el) {
          return Math.floor((el.getBoundingClientRect().left - x0) / cw + 0.01);
        };
        var endCol = function (el) {
          var rr = el.getClientRects();
          return rr.length ? Math.floor((rr[rr.length - 1].left - x0) / cw + 0.01) : col(el);
        };
        secs.forEach(function (e) {
          var id = e.getAttribute("data-sid");
          if (!e.firstElementChild || !plan[id]) return;
          var ks = [].filter.call(e.children, function (c) {
              return !c.classList.contains("pvbr");
            }),
            last = col(ks[0]),
            br = [];
          // a block that starts a page gets a forced break there; not a paragraph of prose, which runs on
          // from the page before
          ks.forEach(function (c, i) {
            if (i && col(c) !== last && !c.classList.contains("pvflow")) br.push(i);
            last = endCol(c);
          });
          // the pages the piece takes, and how far down its last page it ends
          var measure = function () {
            var l = e.lastElementChild,
              rr = l.getClientRects(),
              b = rr[rr.length - 1] || l.getBoundingClientRect();
            return { n: endCol(l) + 1 - col(ks[0]), f: (b.bottom - y0) / H };
          };
          var r = measure(),
            k = 0;
          // prose runs on to wherever it ends, and the printer may end it a line or so from where it ends
          // here: one that only just spills onto a page, or only just fills one, is set slightly smaller so
          // it ends well inside a page (and the contents numbers after it hold)
          if (ks[0].classList.contains("pvflow")) {
            if (r.n > 1 && r.f < 0.15) k = (0.94 * (r.n - 1)) / (r.n - 1 + r.f);
            else if (r.f > 0.94) k = (r.n - 1 + 0.9) / (r.n - 1 + r.f);
            k *= z[id] || 1;
            if (k >= LAYOUT.page.minZoom && k < (z[id] || 1)) {
              z[id] = Math.round(k * 100) / 100;
              e.style.zoom = z[id];
              r = measure();
            }
          }
          plan[id] = { n: r.n };
          if (br.length) out.b[id] = br;
          else delete out.b[id];
        });
      }
      secs.forEach(function (e) {
        var id = e.getAttribute("data-sid");
        out[id] = page + 1;
        page += (plan[id] && plan[id].n) || 1;
      });
      return out;
    }
    // write the page numbers into the printed contents
    function pnums(pg) {
      // the page plan (see paginate): pieces set slightly smaller, and a forced page break before
      // each block that starts a page
      [].forEach.call(pv.querySelectorAll(".pvbr"), function (e) {
        e.parentNode.removeChild(e);
      });
      [].forEach.call(pv.querySelectorAll(".pvs"), function (e) {
        var id = e.getAttribute("data-sid");
        var kids = [].slice.call(e.children);
        e.style.zoom = (pg && pg.z && pg.z[id]) || "";
        var tall = (pg && pg.t && pg.t[id]) || [];
        kids.forEach(function (k, i) {
          k.classList.toggle("pvtall", tall.indexOf(i) >= 0);
        });
        ((pg && pg.b && pg.b[id]) || []).forEach(function (i) {
          var br = document.createElement("div");
          br.className = "pvbr";
          if (kids[i]) e.insertBefore(br, kids[i]);
        });
      });
      [].forEach.call(pv.querySelectorAll(".pvtoc li[data-sid]"), function (li) {
        var n = pg && pg[li.getAttribute("data-sid")],
          s = li.querySelector(".pgn");
        if (s) s.parentNode.removeChild(s);
        if (!n) return;
        s = document.createElement("span");
        s.className = "pgn";
        s.textContent = P.lang !== "mr" ? n : DV(n);
        li.appendChild(s);
      });
    }
    // Printing from the browser's own menu cannot wait, so the numbers for what it prints (dm) are kept ready, and so
    // are those of the layout last chosen in the pop-up: then the Print button prints at once, while the tap
    // still counts on an iPhone, instead of asking for a second tap (Print now)
    var wm = "one";
    // the browser's own menu prints what the pop-up offers first: one language in a column, both side by side
    function dm() {
      return P.lang === "both" && FEAT_SW ? "side" : "one";
    }
    function warm() {
      var m = [dm(), wm].filter(function (x) {
        return !pcache[pkey(x)];
      })[0];
      if (!m || busy) return;
      var k = pkey(m);
      build(m);
      pages(m, function (pg) {
        if (pg) pcache[k] = pg;
        if (m !== wm) warmSoon(500);
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
    document.addEventListener("click", function () {
      warmSoon(2500);
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
      // both languages print side by side on Landscape only (stacked took a third more paper): no choice to
      // make, the row just says so; upright only while Landscape is held back (FEAT_SW)
      var one = !FEAT_SW || P.lang === "both";
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
      ["lang", "lead", "l2", "ui", "ind", "ref", "pref", "fnt", "pfn", "tr", "por"].forEach(function (k) {
        s[k] = P[k];
      });
      return location.origin + location.pathname + "?print=" + mode + "&s=" + encodeURIComponent(JSON.stringify(s));
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
      document.getElementById("prb").focus();
      busy = true;
      if (mode === "as") mode = "one";
      wm = mode;
      setPage(mode);
      build(mode);
      var k = pkey(mode);
      // laid out ahead (warm): print straight away
      if (pcache[k]) return done(pcache[k]);
      pages(mode, done);
      function done(pg) {
        pnums(pg);
        if (pg) pcache[k] = pg;
        pon(mode);
        // the tap no longer counts: ask for another one rather than have the print quietly ignored
        if ((iOS || root.classList.contains("wk")) && Date.now() - t0 > 900) return ready();
        setTimeout(function () {
          tryPrint(false);
        }, 60);
      }
    }
    document.getElementById("prb").onclick = function () {
      unready();
      pmMode(false);
      // the language names follow what is printed: the original's place holds Marathi or Kannada, and with
      // both languages shown the main one comes first (left, or on top)
      var M = P.ui === "mr",
        en = M ? "इंग्रजी" : "English",
        or = (NAMES[P.ind] || NAMES.mr)[M ? 0 : 1],
        l1 = shared.LEAD === "en" ? en : or,
        l2 = shared.LEAD === "en" ? or : en;
      // the page: Portrait or Landscape (one language), a tap picks it; both languages: Landscape, side by side
      function opt(b, page) {
        b.textContent = page === "land" ? (M ? "आडवे" : "Landscape") : M ? "उभे" : "Portrait";
        b.setAttribute("data-page", page);
        b.onclick = function () {
          P.por = page;
          save();
          wm = dm();
          pages1();
          warmSoon(1500);
        };
      }
      opt(b1, "up");
      opt(b2, "land");
      document.getElementById("prpv").textContent = !FEAT_SW
        ? M
          ? "उभे: वर " + l1 + ", खाली " + l2
          : "Portrait: " + l1 + " above " + l2
        : M
          ? "आडवे: शेजारी शेजारी"
          : "Landscape, side by side";
      pages1();
      rows();
      document.getElementById("prp").textContent = document.getElementById("prq").textContent = LTR ? "Letter" : "A4";
      ovPush();
      pm.hidden = false;
      // (a card taller than the screen stays at its top: the Print button is below)
      bpr.focus({ preventScroll: true });
    };
    function pmClose() {
      unready();
      pm.hidden = true;
      ovDone();
      document.getElementById("prb").focus();
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
        build(m);
        if (pcache[pkey(m)]) pnums(pcache[pkey(m)]);
        pon(m);
      }
    });
    window.addEventListener("afterprint", function () {
      busy = false;
      poff();
    });
    // Opened by the Home Screen app's Open in Safari (see js/render.js): lay the printout out once the fonts
    // are in, then Print now asks for the tap that Safari needs
    if (window.PRQ) {
      var mode = window.PRQ;
      window.PRQ = "";
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
        setTimeout(function () {
          go(mode);
        }, 300);
      });
    }
  })();
}

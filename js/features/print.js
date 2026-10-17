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
  // Print: single column (as on screen), two columns, or Marathi | English side by side.
  // A separate print view (#pv) is built from the visible text just before printing, so that
  // a heading always stays with its dhrupad and first stanza and stanzas are never split.
  (function () {
    var pm = document.getElementById("prm"),
      pv = document.getElementById("pv"),
      b1 = document.getElementById("pr1"),
      b2 = document.getElementById("pr2"),
      bgo = document.getElementById("prgo"),
      po = pm.querySelector(".pro"),
      pw = document.getElementById("prw"),
      bsf = document.getElementById("prsf"),
      bcp = document.getElementById("prcp"),
      last = "as", // the layout last chosen, carried to Safari
      pn = pm.querySelector(".prn:not(#prw)"),
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
    function td(nodes) {
      var t = document.createElement("td");
      nodes.forEach(function (n) {
        t.appendChild(n);
      });
      return t;
    }
    // Build the print view (#pv) from the page: contents, then every piece in the text language.
    // mode: "two" (two columns), "one" (one column) or "side" (Marathi and English side by side)
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
        var pre = [];
        var gp = sec.previousElementSibling;
        if (gp && gp.classList.contains("grp")) {
          var gl = document.createElement("div");
          gl.className = "pvg";
          gl.innerHTML = gp.innerHTML;
          [].forEach.call(gl.querySelectorAll(".allb"), function (x) {
            x.remove(); // Open all / Fold all is for the screen only
          });
          pre.push(gl);
        }
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
        } else if (mode === "one") {
          var head = pre.slice();
          if (units[0] && units[0].classList.contains("pvref")) head.push(units.shift());
          var gs = [],
            wait = [];
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
            box.appendChild(keep(head.concat(g)));
            head = [];
          });
          if (head.length) box.appendChild(keep(head));
        } else {
          // Two columns, newspaper style: the heading (and dhrupad) across the page, then the stanzas
          // run down the left column to the foot of the page and on down the right column.
          var head2 = pre.slice();
          if (units[0] && units[0].classList.contains("pvref")) head2.push(units.shift());
          var cols = document.createElement("div"),
            gs2 = [],
            wait2 = [];
          cols.className = "pvc";
          units.forEach(function (u) {
            if (u.classList.contains("rmk") && gs2.length) {
              gs2[gs2.length - 1].push(u);
              return;
            }
            if (u.classList.contains("rmk")) {
              wait2.push(u);
              return;
            }
            gs2.push(wait2.concat([u]));
            wait2 = [];
          });
          if (wait2.length) gs2.push(wait2);
          gs2.forEach(function (g) {
            g.forEach(function (u) {
              u.removeAttribute("style"); // drop the on-screen grid placement
            });
          });
          if (root.classList.contains("wk")) {
            // Safari and iOS browsers ignore CSS columns when printing. Instead, cut the piece into
            // blocks small enough for one page (even sideways) and fill each block's left column
            // first, then its right one. A short piece is a single block.
            // estimated printed lines per column in one block, and how much longer a line may be than on an
            // upright page, for the paper as the reader turned it
            var sh = sheet(mode),
              CAP = Math.round((22 * (sh[1] - 23)) / (PAPER[1] - 23)),
              wide = (sh[0] - 18) / (PAPER[0] - 18);
            function gl(g) {
              var n = 0;
              g.forEach(function (u) {
                if (u.classList.contains("rmk")) {
                  n += 1;
                  return;
                }
                [].forEach.call(u.querySelectorAll(".verse ." + (P.lang === "en" ? "en" : "mr") + " p"), function (x) {
                  n += Math.ceil(x.textContent.length / ((P.lang === "en" ? 42 : 48) * wide)) || 1;
                });
                n += 1;
              });
              return n;
            }
            var blocks = [],
              cur2 = [],
              cn2 = 4; // the heading and dhrupad share the first block's page
            gs2.forEach(function (g) {
              var n = gl(g);
              if (cur2.length && cn2 + n > 2 * CAP) {
                blocks.push(cur2);
                cur2 = [];
                cn2 = 0;
              }
              cur2.push(g);
              cn2 += n;
            });
            if (cur2.length) blocks.push(cur2);
            blocks.forEach(function (bk, bi) {
              var ls = bk.map(gl),
                tot = ls.reduce(function (a, b) {
                  return a + b;
                }, 0),
                k = bk.length,
                best = 1e9,
                l = 0;
              for (var j = 1; j <= bk.length; j++) {
                l += ls[j - 1];
                var m = Math.max(l, tot - l);
                if (m < best) {
                  best = m;
                  k = j;
                }
              }
              var t2 = document.createElement("table");
              t2.className = "pvt pv2";
              var tr2 = document.createElement("tr");
              tr2.appendChild(td([].concat.apply([], bk.slice(0, k))));
              tr2.appendChild(td([].concat.apply([], bk.slice(k))));
              t2.appendChild(tr2);
              box.appendChild(keep(bi ? [t2] : head2.concat([t2])));
            });
            if (!blocks.length) box.appendChild(keep(head2));
          } else {
            gs2.forEach(function (g) {
              cols.appendChild(keep(g));
            });
            var hk = keep(head2);
            hk.classList.add("pvhd");
            box.appendChild(hk);
            box.appendChild(cols);
          }
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
    // What the pop-up recommends for what is printed (CHOICE in js/print/profiles.js): one language, or both
    function choice() {
      return CHOICE[P.lang === "both" ? "both" : "one"];
    }
    // Sideways pages for a layout ("two", "one" or "side"): as the reader picked in the pop-up (P.por "up"
    // or "land"), or else the way that layout prints best; upright only while Sideways is held back (FEAT_SW)
    function land(mode) {
      if (!FEAT_SW) return false;
      if (P.por) return P.por === "land";
      return choice().sheet[mode] === "land";
    }
    // the sheet as it prints, [width, height] in mm
    function sheet(mode) {
      return land(mode) ? [PAPER[1], PAPER[0]] : PAPER;
    }
    function pkey(mode) {
      return [mode, P.lang, shared.LEAD, P.ref, P.tr, P.ui, P.fnt, land(mode)].join("|");
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
    // Upright / Sideways in the pop-up: neither pressed (each layout on its best page), or the one the reader
    // picked, for every layout; a second tap on it goes back to each layout's best
    function orient() {
      var o = FEAT_SW ? P.por : "up",
        any = [b1, b2].some(function (b) {
          return !b.hidden && land(b.getAttribute("data-mode"));
        });
      document.getElementById("pou").setAttribute("aria-pressed", String(o === "up"));
      document.getElementById("pol").setAttribute("aria-pressed", String(o === "land"));
      document.getElementById("prom").textContent = o === "land" ? "आडव्या" : o === "up" ? "उभ्या" : "प्रत्येक पर्यायावर दिलेल्या";
      document.getElementById("proe").textContent = o === "land" ? "sideways" : o === "up" ? "upright" : "turned as each choice says";
      document.getElementById("prl").hidden = !(any && root.classList.contains("wk"));
      // each choice says the page it prints on, and the one that prints best is marked Recommended
      var M = P.ui === "mr";
      [b1, b2].forEach(function (b) {
        var m = b.getAttribute("data-mode"),
          sub = b.querySelector(".prsub");
        if (!m || !sub) return;
        sub.textContent = (land(m) ? (M ? "आडवे पान" : "Sideways pages") : M ? "उभे पान" : "Upright pages") + (m === choice().best ? (M ? " · शिफारस" : " · Recommended") : "");
      });
    }
    [["pou", "up"], ["pol", "land"]].forEach(function (o) {
      document.getElementById(o[0]).onclick = function () {
        P.por = P.por === o[1] ? "" : o[1];
        save();
        orient();
      };
    });
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
      f.style.cssText = "position:fixed;left:-10000px;top:0;border:0;visibility:hidden;width:" + ((sh[0] - 18) * mm * sf - (P.fnt && P.fnt !== "std" ? 16 : 12)) + "px;height:" + (sh[1] - 23) * mm * sf + "px";
      [].forEach.call(root.attributes, function (a) {
        if (a.name !== "data-print") at += " " + a.name + '="' + a.value.replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '"';
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
    // Chrome's two-column flow (.pvc) can't take forced breaks, so its pages are found by laying the
    // print view out as a row of page-sized columns, as the browser breaks pages.
    function paginate(w, d, hmm, mm) {
      var p = d.getElementById("pv"),
        cs = w.getComputedStyle(p),
        pl = parseFloat(cs.paddingLeft),
        cw = p.clientWidth - pl - parseFloat(cs.paddingRight),
        secs = [].slice.call(p.querySelectorAll(".pvs")),
        // Measured against Chrome's own PDFs: the frame is 12px narrower than the page (16px with the
        // optional text fonts; printed text runs a little wider, so a near-full line wraps), and pages
        // with two columns of text hold 4px more than the plain sum of heights.
        H = hmm * mm - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) + (p.querySelector(".pvc") ? 4 : 0),
        C = H * 0.96,
        plan = {},
        z = {},
        out = { z: z, b: {}, t: {}, c: {} };
      if (!secs.length) return out;
      function pack(hs, k) {
        var n = 1,
          used = 0,
          br = [];
        hs.forEach(function (h, i) {
          h *= k;
          // a block starts a new page when it does not fit below the last one; but a block taller than a
          // page (it happens on a sideways page) breaks between its lines anyway, so it starts below the
          // last block when a quarter of the page is still free, rather than leaving that space empty
          if (used > 0 && used + h > C && (h <= C || C - used < C / 4)) {
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
        return { n: n, b: br, f: used / C };
      }
      // 1. pieces made of blocks: measure each block and pack them onto pages. Measured 20px narrower
      // than the frame (a near-full line then wraps here first), so heights err on the tall side.
      var pw = p.style.cssText;
      p.style.cssText = "box-sizing:border-box;width:" + (p.offsetWidth - 20) + "px";
      secs.forEach(function (e) {
        var id = e.getAttribute("data-sid"),
          kids = [].slice.call(e.children);
        if (!kids.length || e.querySelector(".pvc")) return;
        var top = e.getBoundingClientRect().top,
          tops = kids.map(function (c) {
            return c.getBoundingClientRect().top;
          }),
          hs = kids.map(function (c, i) {
            return (i + 1 < kids.length ? tops[i + 1] : c.getBoundingClientRect().bottom) - (i ? tops[i] : top);
          }),
          r = pack(hs, 1);
        // a piece that would take fewer pages a little smaller is set at the largest size that does (no
        // smaller than LAYOUT.page.minZoom): one that spills a little onto another page, or one whose
        // blocks are too big to share a page and leave half of each page empty
        if (r.n > 1) {
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
        plan[id] = r;
        if (r.b.length) out.b[id] = r.b;
        // a block taller than a page even at the size chosen may break inside, between its lines
        var tall = [];
        hs.forEach(function (h, i) {
          if (h * (z[id] || 1) > C) tall.push(i);
        });
        if (tall.length) out.t[id] = tall;
      });
      p.style.cssText = pw;
      // pages the contents take
      var first = secs[0].getBoundingClientRect().top - p.getBoundingClientRect().top - parseFloat(cs.paddingTop),
        page = Math.max(1, Math.ceil((first - 1) / H));
      // 2. lay the print view out as a row of page-sized columns, which the browser breaks as it breaks
      // pages. Chrome's two-column pieces: count the columns each takes. Pieces made of blocks: their plan
      // (size and forced breaks) goes in first, then the columns show where each block really lands. The
      // browser breaks a little differently from the plain sum of heights, above all in a piece set
      // smaller (by up to a block on a sideways page), so a block it moves to the next page gets a forced
      // break of its own there, and the contents numbers follow. (Not in Safari, which prints two columns
      // as tables of blocks: its plan, from the heights, is the one its printouts were checked against.)
      var fix = !root.classList.contains("wk"),
        st = d.createElement("style");
      st.textContent = "#pv .pvbr{break-before:column}";
      d.head.appendChild(st);
      secs.forEach(function (e) {
        var id = e.getAttribute("data-sid"),
          kids = [].slice.call(e.children);
        if (!fix || !plan[id] || e.querySelector(".pvc")) return;
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
      // Two passes: pages their full height for the pieces made of blocks, then 3% shorter for the
      // two-column pieces, which are cut into pages here (below): the browser's flow and these columns
      // can differ by a line or so, so a part cut from a slightly shorter page always fits its page.
      if (fix)
        [H, H * 0.97].forEach(function (h, pass) {
          p.style.cssText =
            "padding-top:0;padding-bottom:0;box-sizing:content-box;overflow:visible;column-gap:0;column-fill:auto;column-width:" + cw + "px;height:" + h + "px";
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
          // the pages a piece takes, and how far down its last page it ends
          var measure = function (e) {
            var l = e.lastElementChild,
              rr = l.getClientRects(),
              b = rr[rr.length - 1] || l.getBoundingClientRect();
            return { n: endCol(l) + 1 - col(e.firstElementChild), f: (b.bottom - y0) / h };
          };
          secs.forEach(function (e) {
            var id = e.getAttribute("data-sid"),
              flow = e.querySelector(".pvc");
            if (!e.firstElementChild) return;
            if (!pass) {
              if (!plan[id] || flow) return;
              var ks = [].filter.call(e.children, function (c) {
                  return !c.classList.contains("pvbr");
                }),
                last = col(ks[0]),
                br = [];
              ks.forEach(function (c, i) {
                if (i && col(c) !== last) br.push(i);
                last = endCol(c);
              });
              plan[id] = measure(e);
              if (br.length) out.b[id] = br;
              else delete out.b[id];
              return;
            }
            if (!flow) return;
            var r = measure(e),
              k = 0;
            // only just spilling onto a page, or only just filling one: set slightly smaller so it
            // ends well inside a page
            if (r.n > 1 && r.f < 0.15) k = (0.94 * (r.n - 1)) / (r.n - 1 + r.f);
            else if (r.f > 0.94) k = (r.n - 1 + 0.9) / (r.n - 1 + r.f);
            if (k >= LAYOUT.page.minZoom && k < 1) {
              z[id] = Math.round(k * 100) / 100;
              e.style.zoom = z[id];
              r = measure(e);
            }
            plan[id] = r;
            // The browser's own two-column flow breaks pages a little differently from these columns (on
            // a sideways page by enough to move a block onto another page), so the flow is cut where the
            // columns say each page ends: each page's part is a flow of its own, after a forced break, that
            // fills its left column to the foot of the page and then its right one, as it did here (only
            // the piece's last part balances its two columns).
            var cut = [],
              at = null;
            [].forEach.call(flow.children, function (c, i) {
              if (at !== null && col(c) !== at) cut.push(i);
              at = endCol(c);
            });
            if (cut.length) out.c[id] = cut;
          });
        });
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
        var id = e.getAttribute("data-sid"),
          fl = e.querySelectorAll(".pvc");
        // two columns: the flow in one piece again, then cut where each page ends
        if (fl[0]) fl[0].classList.remove("pvcf");
        for (var j = 1; j < fl.length; j++) {
          while (fl[j].firstChild) fl[0].appendChild(fl[j].firstChild);
          fl[j].parentNode.removeChild(fl[j]);
        }
        if (fl[0] && pg && pg.c && pg.c[id]) {
          var ch = [].slice.call(fl[0].children),
            prev = fl[0];
          pg.c[id].forEach(function (from, n) {
            var part = document.createElement("div"),
              br = document.createElement("div");
            part.className = "pvc";
            prev.classList.add("pvcf");
            br.className = "pvbr";
            ch.slice(from, pg.c[id][n + 1] || ch.length).forEach(function (c) {
              part.appendChild(c);
            });
            prev.parentNode.insertBefore(br, prev.nextSibling);
            br.parentNode.insertBefore(part, br.nextSibling);
            prev = part;
          });
        }
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
    // Printing from the browser's own menu cannot wait, so the single-column numbers are kept ready, and so
    // are those of the layout last chosen in the pop-up: then the Print button prints at once, while the tap
    // still counts on an iPhone, instead of asking for a second tap (Print now)
    var wm = "one";
    function warm() {
      var m = ["one", wm].filter(function (x) {
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
    // the pop-up: the layout choices (ready false), or Print now (ready true)
    function pmMode(ready) {
      b1.hidden = b2.hidden = pn.hidden = ready;
      po.hidden = ready || !FEAT_SW;
      bgo.hidden = !ready;
      pw.hidden = bsf.hidden = bcp.hidden = true;
    }
    // ---- The iPhone Home Screen app cannot print: hand the printout over to Safari ----
    // Safari opens at this site's address with the print choices in it (read by js/render.js), and offers
    // Print now there. iOS 17 and later open an x-safari-https:// address in Safari; Copy link is for the rest.
    // On Satish's iPhone neither the Print tap nor a second one (Print now) opened the dialog in the app, so the
    // app goes straight to this step once a layout is chosen.
    function link(mode) {
      var s = {};
      ["lang", "lead", "l2", "ui", "ind", "ref", "fnt", "tr", "por"].forEach(function (k) {
        s[k] = P[k];
      });
      return location.origin + location.pathname + "?print=" + mode + "&s=" + encodeURIComponent(JSON.stringify(s));
    }
    // open: the pop-up is already open (its Back step is in place)
    function toSafari(open) {
      pmMode(true);
      bgo.hidden = true;
      pw.hidden = bsf.hidden = bcp.hidden = false;
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
        // a tap did not open it either: the iPhone Home Screen app (on some iOS versions) cannot print
        if (!(iOS && standalone)) return unready();
        unready();
        toSafari();
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
      root.removeAttribute("data-print");
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
        root.setAttribute("data-print", mode);
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
        l2 = shared.LEAD === "en" ? or : en,
        tl = " (" + (P.lang === "en" ? en : or) + ")";
      // a choice: its layout's name, and under it the page it prints on (filled in by orient)
      function opt(b, mode, name) {
        b.textContent = name;
        var sub = document.createElement("span");
        sub.className = "prsub";
        b.appendChild(sub);
        b.setAttribute("data-mode", mode);
        b.onclick = function () {
          go(mode === "one" ? "as" : mode);
        };
      }
      if (P.lang === "both") {
        opt(b1, "side", (M ? "शेजारी शेजारी: " : "Side by side: ") + l1 + " | " + l2);
        opt(b2, "one", M ? "वर " + l1 + ", खाली " + l2 : "Stacked: " + l1 + " above " + l2);
      } else {
        opt(b1, "two", (M ? "दोन स्तंभ" : "Two columns") + tl);
        opt(b2, "one", (M ? "एक स्तंभ" : "Single column") + tl);
      }
      // the recommended choice comes first, and has the focus
      var rec = b1.getAttribute("data-mode") === choice().best ? b1 : b2;
      rec.parentNode.insertBefore(rec, rec.parentNode.firstChild);
      orient();
      document.getElementById("prp").textContent = document.getElementById("prq").textContent = LTR ? "Letter" : "A4";
      ovPush();
      pm.hidden = false;
      rec.focus();
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
    // Printing from the browser's own menu (or Share → Print on a phone) gets the same print view,
    // single column: contents, then every piece in the chosen text language, never the home page
    window.addEventListener("beforeprint", function () {
      seen = true;
      if (!busy) {
        setPage("one");
        build("one");
        if (pcache[pkey("one")]) pnums(pcache[pkey("one")]);
        root.setAttribute("data-print", "one");
      }
    });
    window.addEventListener("afterprint", function () {
      busy = false;
      root.removeAttribute("data-print");
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

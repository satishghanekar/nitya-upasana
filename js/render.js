// Builds the HTML of a piece from CONTENT (made from the text files in content/texts/ by js/text/content.js): for the
// reading page the first time the piece is opened (js/core/page.js), for the printout (js/print/compose.js) and
// for the search index (js/text/search.js).
// Each line keeps its two languages side by side in the data; this file decides how they are shown.
(function () {
  "use strict";
  var ICON_PREV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  var LOTUS = '<div class="fin" aria-hidden="true"><svg viewBox="0 0 160 28" width="160" height="28" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 20H56"/><path d="M104 20H152"/><circle cx="62" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="98" cy="20" r="1.4" fill="currentColor" stroke="none"/><path d="M80 4C75 9 74.5 15 80 21C85.5 15 85 9 80 4Z"/><path d="M80 21C73 20 68.5 15.5 67.5 10.5C73 11.5 77.5 15 80 21Z"/><path d="M80 21C87 20 91.5 15.5 92.5 10.5C87 11.5 82.5 15 80 21Z"/><path d="M70 22.5C74 24.5 86 24.5 90 22.5"/></svg></div>';
  var PNQ = '<div class="pnq"><a class="pnh" href="./" aria-label="Home"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.6 12 3.5l9 7.1"/><path d="M5.2 9v11h13.6V9"/><path d="M12 11.2c1.3 1.5 1.6 2.8 0 4.3-1.6-1.5-1.3-2.8 0-4.3z"/><path d="M9.3 17.6h5.4"/></svg></a><button type="button" class="pns" aria-label="Library and search" aria-expanded="false"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h14M4 11h8M4 16h5"/><circle cx="16" cy="15.5" r="3.6"/><path d="M18.6 18.1l2.6 2.6"/></svg></button></div>';

  // A pair of spans: the original text, then English
  function two(t) {
    return '<span class="mr">' + t.mr + '</span><span class="en" lang="en">' + t.en + "</span>";
  }
  function lines(list, lang, pad) {
    return list
      .map(function (x) {
        return pad + "<p" + (x.rf ? ' class="rf"' : "") + (x.l ? ' data-l="' + x.l + '"' : "") + ">" + x[lang] + "</p>\n";
      })
      .join("");
  }
  function verse(list, pad, bold) {
    return (
      pad + '<div class="verse' + (bold ? " bold" : "") + '">\n' +
      pad + '  <div class="mr">\n' + lines(list, "mr", pad + "    ") + pad + "  </div>\n" +
      pad + '  <div class="en" lang="en">\n' + lines(list, "en", pad + "    ") + pad + "  </div>\n" +
      pad + "</div>\n"
    );
  }
  function item(x) {
    // the dhrupad's marker (↻ ध्रुपद) or a note of the text's own (nt: Phalashruti, ↻ ३ वेळा); the English gets the ↻ when
    // the original has one, so a note that is a heading (फलश्रुति) does not look like a repeat
    if (x.rmk) {
      var ra = !x.nt || /^↻/.test(x.rmk.mr) ? '<i class="ra">↻ </i>' : "";
      return '      <div class="rmk' + (x.nt ? " nt" : "") + '"><span class="mr">' + x.rmk.mr + '</span><span class="en" lang="en">' + ra + x.rmk.en + "</span></div>\n";
    }
    return '      <div class="item' + (x.kind ? " " + x.kind : "") + (x.para ? " para" : "") + '">\n' + verse(x.lines, "        ", x.bold) + "      </div>\n";
  }
  function navLink(cls, p, label, iconFirst) {
    if (!p) return "      <span></span>\n";
    var small = iconFirst ? ICON_PREV + two(label) : two(label) + ICON_NEXT;
    // ("./#a3", not "#a3": the piece may not be built yet, js/core/page.js, and a bare "#a3" would point at nothing)
    return '      <a class="' + cls + '" href="./#' + p.id + '" data-go="' + p.id + '"><small>' + small + "</small>" + two(p.title) + "</a>\n";
  }
  function piece(p, prev, next, ui) {
    var h =
      '  <section id="' + p.id + '" class="ash' + (p.cls ? " " + p.cls : "") + (p.prose ? " prose" : "") + '"' + (p.lang ? ' lang="' + p.lang + '"' : "") + ">\n" +
      "    <header>\n" +
      '      <h2><span class="no"><span class="nm">' + p.no.mr + '</span><span class="ne">' + p.no.en + "</span></span> " + two(p.title) + "</h2>\n" +
      '      <div class="tag">' + two(p.tag) + "</div>\n" +
      "    </header>\n";
    // [once] lines and [note]s that come before the dhrupad at the top (js/text/content.js)
    if (p.lead) h += '    <div class="items lead">\n' + p.lead.map(item).join("") + "    </div>\n";
    if (p.refrain)
      h += '    <div class="rftop">\n      <div class="lab">' + two(p.refrain.label) + "</div>\n" + verse(p.refrain.lines, "      ") + "    </div>\n";
    h += '    <div class="items">\n' + p.items.map(item).join("") + "    </div>\n";
    h += "    " + LOTUS + "\n";
    h += '    <div class="cr">' + p.credit + "</div>\n";
    h += '    <nav class="pn">\n' + navLink("prev", prev, ui.prev, true) + "      " + PNQ + "\n" + navLink("next", next, ui.next, false) + "    </nav>\n";
    return h + "  </section>\n";
  }

  // ---- The same words in another Indian script (Settings → Main language → ಕನ್ನಡ) ----
  // The text is written once, in Devanagari. Kannada letters sit at the same place in their Unicode block, 0x380
  // further on, so each letter moves across one for one. A few signs have no Kannada twin: the dandas and the Vedic
  // accent marks stay as they are (Kannada books use them too), ॐ is written ಓಂ, and the Marathi eyelash ऱ and the
  // ॅ of English words (टॅब, tab) take their usual Kannada spelling. The choice is read from the saved settings
  // here, before the page script runs, so every later step (search, English spelling, printing) sees the new text.
  // To add another script, give it an entry in SCRIPTS.
  var SCRIPTS = {
    kn: { off: 0x380, sp: { "ॐ": "ಓಂ", "ऱ": "ರ", "ॅ": "್ಯಾ", "ॉ": "ಾ", "ऑ": "ಆ", "ॲ": "ಅ" }, back: [[/ಓಂ(?![ಀ-೿])/g, "ॐ"]] },
  };
  var KEEP = /[॒॑।॥]/;
  // ---- Print handed over from the iPhone Home Screen app (js/features/print.js, "Open in Safari") ----
  // The app cannot print, so it opens Safari at …/?print=as&s={…} (and &t=…, when only some texts are printed): the
  // reader's print choices (language, dhrupad, font, page) are saved here first, before anything reads them, and the
  // address is put back to the plain one.
  // js/features/print.js then lays the printout out and offers Print now (window.PRQ is the chosen layout).
  try {
    var q = /[?&]print=(two|as|side)(?:&s=([^&#]*))?/.exec(location.search);
    if (q) {
      var got = JSON.parse(decodeURIComponent(q[2] || "") || "{}"),
        prefs = JSON.parse(localStorage.getItem("aarti2-prefs") || "{}");
      ["lang", "lead", "l2", "ui", "ind", "ref", "pref", "fnt", "pfn", "plang", "ppr", "tr", "por"].forEach(function (k) {
        if (typeof got[k] === "string" || typeof got[k] === "number") prefs[k] = got[k];
      });
      // a first visit in Safari: these choices are already up to date, so the start-up changes for older settings
      // (js/core/state.js) must not reset them
      if (!prefs.sv) prefs.sv = 6;
      localStorage.setItem("aarti2-prefs", JSON.stringify(prefs));
      window.PRQ = q[1] === "two" ? "as" : q[1]; // two columns (no longer offered): a link from before
      // only some texts (their Library ids, comma separated): js/features/print.js prints just those
      var t = /[?&]t=([a-z0-9,-]+)/.exec(location.search);
      if (t) window.PRT = t[1].split(",").filter(Boolean);
      // a session from Home (the print builder's Today tab): its texts print in the order given, headed by the session
      var o = /[?&]o=(morning|afternoon|evening|all)(?:&|#|$)/.exec(location.search);
      if (o) window.PRO = o[1];
      // and its day (the weekday Home showed), for the heading
      var od = /[?&]od=([0-6])(?:&|#|$)/.exec(location.search);
      if (od) window.PROD = +od[1];
      // a routine printout (the print builder's Routine tab): whose (name and routine) and the days and sessions;
      // js/features/print.js cleans the routine before using it
      var r = /[?&]r=([^&#]*)/.exec(location.search);
      if (r) {
        var rr = JSON.parse(decodeURIComponent(r[1]));
        if (rr && typeof rr.n === "string" && Array.isArray(rr.d) && Array.isArray(rr.s))
          window.PRR = {
            name: rr.n.slice(0, 40),
            routine: rr.r,
            span: rr.w === "day" ? "day" : "week",
            days: rr.d.filter(function (x) {
              return x === +x && x >= 0 && x <= 6;
            }),
            sessions: rr.s.filter(function (x) {
              return x === "morning" || x === "afternoon" || x === "evening";
            }),
          };
      }
      history.replaceState(null, "", location.pathname + location.hash);
    }
  } catch (e) {}
  var ind = "";
  try {
    ind =(JSON.parse(localStorage.getItem("aarti2-prefs") || "{}").ind || "");
  } catch (e) {}
  var S = SCRIPTS[ind],
    OLD = [], // [node, "", text] or [element, attribute, value]: what SCR.page() changed
    ROOTS = ".ash, #home h1, #btt",
    // built by the site script, already in the chosen script: the Library's list by category (js/features/library.js)
    LATER = "#jl";
  window.SCR = {
    k: S ? ind : "", // "" while the text is shown as written
    // Devanagari → the chosen script
    to: function (t) {
      return !S ? t : t.replace(/[ऀ-ॿ]/g, function (c) {
        return S.sp[c] || (KEEP.test(c) ? c : String.fromCharCode(c.charCodeAt(0) + S.off));
      });
    },
    // and back, for the English spelling (IAST) and search
    from: function (t) {
      if (!S) return t;
      S.back.forEach(function (b) { t = t.replace(b[0], b[1]); });
      var lo = 0x900 + S.off, hi = lo + 0x7f;
      return t.replace(/[ঀ-෿]/g, function (c) {
        var n = c.charCodeAt(0);
        return n >= lo && n <= hi ? String.fromCharCode(n - S.off) : c;
      });
    },
    // Rewrite the text (and its tooltips) in the pieces, the home contents, the site's name and the
    // contents lists. What was there is kept (OLD), so switching back to Devanagari puts it back exactly.
    page: function () {
      if (!S) return;
      document.documentElement.setAttribute("data-scr", ind);
      [].forEach.call(document.querySelectorAll(ROOTS), function (r) {
        SCR.el(r, OLD);
      });
    },
    // A piece just built on the reading page (js/core/page.js): in the chosen script, put back by SCR.set like the rest
    add: function (r) {
      SCR.el(r, OLD);
    },
    // Rewrite one element (a piece, a heading) in the chosen script. old: where to note what was there, so
    // SCR.set can put it back (the page's own copy); a printout's copy (js/print/compose.js) passes none.
    el: function (r, old) {
      if (!S) return;
      var OLD = old || [];
      var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT), n;
      while ((n = w.nextNode())) if (/[ऀ-ॿ]/.test(n.data)) {
        OLD.push([n, "", n.data]);
        n.data = SCR.to(n.data);
      }
      [].forEach.call(r.querySelectorAll("[title], [aria-label]"), function (e) {
        ["title", "aria-label"].forEach(function (a) {
          var v = e.getAttribute(a);
          if (v && /[ऀ-ॿ]/.test(v)) {
            OLD.push([e, a, v]);
            e.setAttribute(a, SCR.to(v));
          }
        });
      });
      // the language of the text, for screen readers (the English parts keep lang="en")
      [].forEach.call((r.matches(".ash[lang]") ? [r] : []).concat([].slice.call(r.querySelectorAll(".mr, .ash [lang]:not([lang='en'])"))), function (e) {
        OLD.push([e, "lang", e.getAttribute("lang")]);
        e.lang = ind;
      });
      // Poet links: the Kannada Wikipedia page when there is one, else the English page beside it
      [].forEach.call(r.querySelectorAll(".cr"), function (c) {
        var en = c.querySelectorAll(".en a[href]"), W = (window.CONTENT && CONTENT.wiki && CONTENT.wiki[ind]) || {};
        [].forEach.call(c.querySelectorAll(".mr a[href]"), function (a, i) {
          var h = decodeURI(a.getAttribute("href")), to = W[h] || (en[i] && en[i].getAttribute("href"));
          if (!to) return;
          ["href", "hreflang", "aria-label"].forEach(function (x) {
            OLD.push([a, x, a.getAttribute(x)]);
          });
          a.href = to;
          a.hreflang = W[h] ? ind : "en";
          var l = a.getAttribute("aria-label") || "";
          a.setAttribute("aria-label", l.replace(/ — .*$/, "") + (W[h] ? " — ವಿಕಿಪೀಡಿಯ" : " — Wikipedia (English)") + " ↗");
        });
      });
    },
    // Switch scripts in place (Settings → Main language): put the Devanagari back, then rewrite it in the new script.
    // Parts built later from the converted text (the contents lists) are turned back letter by letter.
    set: function (k) {
      if (k === (S ? ind : "")) return;
      for (var i = OLD.length - 1; i >= 0; i--) {
        var o = OLD[i];
        if (!o[1]) o[0].data = o[2];
        else if (o[2] === null) o[0].removeAttribute(o[1]);
        else o[0].setAttribute(o[1], o[2]);
      }
      OLD = [];
      if (S) [].forEach.call(document.querySelectorAll(LATER), function (r) {
        var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT), n;
        while ((n = w.nextNode())) n.data = SCR.from(n.data);
      });
      document.documentElement.removeAttribute("data-scr");
      ind = k;
      S = SCRIPTS[k];
      SCR.k = S ? k : "";
      if (S) {
        SCR.page();
        [].forEach.call(document.querySelectorAll(LATER), function (r) {
          var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT), n;
          while ((n = w.nextNode())) if (/[ऀ-ॿ]/.test(n.data)) n.data = SCR.to(n.data);
        });
      }
    },
  };

  // One piece: for the reading page when it is first opened (js/core/page.js), with the pieces before and after it in
  // reading order for its Previous / Next; for the printout (js/print/compose.js) without them
  window.renderPiece = function (p, C, prev, next) {
    return piece(p, prev || null, next || null, C.ui);
  };
})();

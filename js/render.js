// @ts-check
// Builds the HTML of a piece from CONTENT (made from the text files in content/texts/ by js/text/content.js): for the
// reading page the first time the piece is opened (js/core/page.js), for the printout (js/print/compose.js) and
// for the search index (js/features/search.js).
// Each line keeps its two languages side by side in the data; this file decides how they are shown.
/**
 * @typedef {import("./text/content.js").Piece} Piece
 * @typedef {import("./text/content.js").Item} Item
 * @typedef {import("./text/content.js").Content} Content
 * @typedef {{ mr: string, en: string }} Pair
 * @typedef {{ mr: string, en: string, l?: string, rf?: true, who?: string }} Line  a line of a stanza, or of the dhrupad (no l); who:
 *   in a text marked with who sings, lead, chorus or together
 */
(function () {
  "use strict";
  // what this script hands the page script (SCR, renderPiece, the print hand-over) lives on window
  /** @type {any} */
  var W = window;
  var ICON_PREV =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  var ICON_NEXT =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  var LOTUS =
    '<div class="fin" aria-hidden="true"><svg viewBox="0 0 160 28" width="160" height="28" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 20H56"/><path d="M104 20H152"/><circle cx="62" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="98" cy="20" r="1.4" fill="currentColor" stroke="none"/><path d="M80 4C75 9 74.5 15 80 21C85.5 15 85 9 80 4Z"/><path d="M80 21C73 20 68.5 15.5 67.5 10.5C73 11.5 77.5 15 80 21Z"/><path d="M80 21C87 20 91.5 15.5 92.5 10.5C87 11.5 82.5 15 80 21Z"/><path d="M70 22.5C74 24.5 86 24.5 90 22.5"/></svg></div>';
  var PNQ =
    '<div class="pnq"><a class="pnh" href="./" aria-label="Home"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.6 12 3.5l9 7.1"/><path d="M5.2 9v11h13.6V9"/><path d="M12 11.2c1.3 1.5 1.6 2.8 0 4.3-1.6-1.5-1.3-2.8 0-4.3z"/><path d="M9.3 17.6h5.4"/></svg></a><button type="button" class="pns" aria-label="Library and search" aria-expanded="false"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h14M4 11h8M4 16h5"/><circle cx="16" cy="15.5" r="3.6"/><path d="M18.6 18.1l2.6 2.6"/></svg></button></div>';

  // A pair of spans: the original text, then English
  /** @param {Pair} t */
  /** A pair in its two languages; tw: the key of one of the site's words (js/strings/, "text"), so SCR.el puts a script's
   * own word in, never Marathi's in its letters @param {Pair} t @param {string} [tw] */
  function two(t, tw) {
    return '<span class="mr"' + (tw ? ' data-tw="' + tw + '"' : "") + ">" + t.mr + '</span><span class="en" lang="en">' + t.en + "</span>";
  }
  // The dhrupad's label: its word, and how it is sung (the brackets) in a part of its own, .lab-how, left out on
  // screen where both languages show. The text's own language's parts are marked for SCR.el below (data-tw)
  /** @param {Pair} t */
  function refrainLabel(t) {
    /** @param {string} s @param {boolean} tw */
    function parts(s, tw) {
      var m = /^(.*?) (\(.*\))$/.exec(s) || ["", s, ""];
      return (
        "<span" +
        (tw ? ' data-tw="refrainWord"' : "") +
        ">" +
        m[1] +
        '</span> <span class="lab-how"' +
        (tw ? ' data-tw="refrainHow"' : "") +
        ">" +
        m[2] +
        "</span>"
      );
    }
    return two({ mr: parts(t.mr, true), en: parts(t.en, false) });
  }
  /** @param {Line[]} list @param {"mr" | "en"} lang @param {string} pad */
  function lines(list, lang, pad) {
    return list
      .map(function (/** @type {Line} */ x, /** @type {number} */ i) {
        // who sings it (a text marked with who sings), and data-turn where a turn starts: the label goes there (CSS)
        var who = x.who ? ' data-who="' + x.who + '"' + (i && list[i - 1].who === x.who ? "" : " data-turn") : "";
        return pad + "<p" + (x.rf ? ' class="rf"' : "") + (x.l ? ' data-l="' + x.l + '"' : "") + who + ">" + x[lang] + "</p>\n";
      })
      .join("");
  }
  /** @param {Line[]} list @param {string} pad @param {boolean} [bold] */
  function verse(list, pad, bold) {
    return (
      pad +
      '<div class="verse' +
      (bold ? " bold" : "") +
      '">\n' +
      pad +
      '  <div class="mr">\n' +
      lines(list, "mr", pad + "    ") +
      pad +
      "  </div>\n" +
      pad +
      '  <div class="en" lang="en">\n' +
      lines(list, "en", pad + "    ") +
      pad +
      "  </div>\n" +
      pad +
      "</div>\n"
    );
  }
  /** A stanza with lines written out again (a [refrain] block: p.rf) @param {Item | undefined} x */
  function repeated(x) {
    return !!(
      x &&
      x.lines &&
      x.lines.some(function (/** @type {Line} */ l) {
        return l.rf;
      })
    );
  }
  /** @param {Item} x @param {number} i @param {Item[]} all */
  function item(x, i, all) {
    // the dhrupad's marker (↻ ध्रुपद) or a note of the text's own (nt: Phalashruti, ↻ ३ वेळा); the English gets the ↻ when
    // the original has one, so a note that is a heading (फलश्रुति) does not look like a repeat
    if (x.rmk) {
      var ra = !x.nt || /^↻/.test(x.rmk.mr) ? '<i class="ra">↻ </i>' : "";
      return (
        '      <div class="rmk' +
        (x.nt ? " nt" : "") +
        // "↻ ३ वेळा" after lines written out again (refrain lines): those repeats show with the dhrupad after every
        // verse, so the note shows only with it once, or it reads as nine (as on paper, js/print/write.js parts())
        (x.nt && ra && i > 0 && repeated(all[i - 1]) ? " rep" : "") +
        '"><span class="mr"' +
        (x.nt ? "" : ' data-tw="refrainNote"') +
        ">" +
        x.rmk.mr +
        '</span><span class="en" lang="en">' +
        ra +
        x.rmk.en +
        "</span></div>\n"
      );
    }
    return (
      '      <div class="item' +
      (x.kind ? " " + x.kind : "") +
      (x.para ? " para" : "") +
      '">\n' +
      verse(/** @type {Line[]} */ (x.lines), "        ", x.bold) +
      "      </div>\n"
    );
  }
  /** @param {string} cls @param {Piece | null} p @param {Pair} label @param {boolean} iconFirst */
  function navLink(cls, p, label, iconFirst) {
    if (!p) return "      <span></span>\n";
    var small = iconFirst ? ICON_PREV + two(label, cls) : two(label, cls) + ICON_NEXT;
    // ("./#a3", not "#a3": the piece may not be built yet, js/core/page.js, and a bare "#a3" would point at nothing)
    return '      <a class="' + cls + '" href="./#' + p.id + '" data-go="' + p.id + '"><small>' + small + "</small>" + two(p.title) + "</a>\n";
  }
  /**
   * A text sung in more than one way: the switch between them, just under its heading (js/features/versions.js; not in
   * it: a tap on the heading folds the text); the one shown is pressed. The label's id is the piece's, so each switch is
   * named by its own.
   * @param {Piece} p @param {Content} C
   */
  function versions(p, C) {
    var all = C.versions && C.versions[p.text];
    if (!all) return "";
    var id = "ver-" + p.id;
    return (
      '    <div class="ver" role="group" aria-labelledby="' +
      id +
      '">\n      <span class="vlab" id="' +
      id +
      '">' +
      two(C.ui.version, "version") +
      "</span>\n" +
      all
        .map(function (/** @type {any} */ v) {
          return '      <button type="button" data-ver="' + v.ver + '" aria-pressed="' + (v.ver === p.ver) + '">' + two(v.name) + "</button>\n";
        })
        .join("") +
      "    </div>\n"
    );
  }
  /** A text marked with who sings (its lines carry who: js/text/content.js) @param {Piece} p */
  function marked(p) {
    return p.items.some(function (/** @type {Item} */ x) {
      return (x.lines || []).some(function (/** @type {Line} */ l) {
        return !!l.who;
      });
    });
  }
  /**
   * A text marked with who sings: under its heading, solo or group, and in the group view the part this person sings
   * (js/features/who-sings.js presses the buttons and keeps them up to date). Each row is named by its label.
   * @param {Piece} p @param {Content} C
   */
  function singing(p, C) {
    if (!marked(p)) return "";
    var w = C.ui.who;
    /** @param {string} k */
    var word = function (k) {
      return two({ mr: w.mr[k], en: w.en[k] }, "who." + k);
    };
    /** @param {string} attr @param {string} k */
    var button = function (attr, k) {
      return '        <button type="button" data-' + attr + '="' + k + '" aria-pressed="false">' + word(k) + "</button>\n";
    };
    return (
      '    <div class="sing">\n' +
      '      <div class="sing-mode" role="group" aria-labelledby="sing-' +
      p.id +
      '">\n        <span class="vlab" id="sing-' +
      p.id +
      '">' +
      word("sing") +
      "</span>\n" +
      button("sing", "solo") +
      button("sing", "group") +
      '      </div>\n      <div class="sing-part" role="group" aria-labelledby="part-' +
      p.id +
      '">\n        <span class="vlab" id="part-' +
      p.id +
      '">' +
      word("part") +
      "</span>\n" +
      button("part", "lead") +
      button("part", "chorus") +
      "      </div>\n    </div>\n"
    );
  }
  /** @param {Piece} p @param {Piece | null} prev @param {Piece | null} next @param {Content} C */
  function piece(p, prev, next, C) {
    var ui = C.ui;
    var h =
      '  <section id="' +
      p.id +
      '" class="ash' +
      (p.cls ? " " + p.cls : "") +
      (p.prose ? " prose" : "") +
      (marked(p) ? " who" : "") +
      '"' +
      (p.lang ? ' lang="' + p.lang + '"' : "") +
      ">\n" +
      "    <header>\n" +
      '      <h2><span class="no"><span class="nm">' +
      p.no.mr +
      '</span><span class="ne">' +
      p.no.en +
      "</span></span> " +
      two(p.title) +
      "</h2>\n" +
      '      <div class="tag">' +
      two(p.tag, "lang." + (p.lang || W.CONTENT.pageLanguage)) +
      "</div>\n" +
      "    </header>\n" +
      versions(p, C) +
      singing(p, C);
    // [once] lines and [note]s that come before the dhrupad at the top (js/text/content.js)
    if (p.lead) h += '    <div class="items lead">\n' + p.lead.map(item).join("") + "    </div>\n";
    if (p.refrain)
      h += '    <div class="rftop">\n      <div class="lab">' + refrainLabel(p.refrain.label) + "</div>\n" + verse(p.refrain.lines, "      ") + "    </div>\n";
    h += '    <div class="items">\n' + p.items.map(item).join("") + "    </div>\n";
    h += "    " + LOTUS + "\n";
    h += '    <div class="cr">' + p.credit + "</div>\n";
    h += '    <nav class="pn">\n' + navLink("prev", prev, ui.prev, true) + "      " + PNQ + "\n" + navLink("next", next, ui.next, false) + "    </nav>\n";
    return h + "  </section>\n";
  }

  // ---- The same words in another Indian script (Settings → Main language → ಕನ್ನಡ, తెలుగు, ગુજરાતી) ----
  // The text is written once, in Devanagari. Kannada, Telugu and Gujarati letters sit at the same place in their
  // Unicode blocks (0x380, 0x300 and 0x180 further on), so each letter moves across one for one. A few signs have no
  // twin there: the dandas and the Vedic accent marks stay as they are (books in these scripts use them too), ॐ is
  // written ಓಂ and ఓం, and the Marathi eyelash ऱ and the ॅ of English words (टॅब, tab) take the usual spelling. Gujarati
  // has its own ૐ, ૅ and ૉ; its block has no ऱ, ऴ or ॲ, and its fonts have no ᳚, written there as ॑॑, which looks the
  // same. The choice is read from the saved settings here, before the page script runs, so every later step (search,
  // English spelling, printing) sees the new text.
  // To add another script, give it an entry in SCRIPTS (and its fonts: css/00-fonts.css, css/09-settings-page.css).
  /** @type {Record<string, { off: number, sp: Record<string, string>, back: [RegExp, string][] }>} */
  var SCRIPTS = {
    kn: { off: 0x380, sp: { ॐ: "ಓಂ", ऱ: "ರ", "ॅ": "್ಯಾ", "ॉ": "ಾ", ऑ: "ಆ", ॲ: "ಅ" }, back: [[/ಓಂ(?![ಀ-೿])/g, "ॐ"]] },
    te: { off: 0x300, sp: { ॐ: "ఓం", ऱ: "ర", "ॅ": "్యా", "ॉ": "ా", ऑ: "ఆ", ॲ: "అ" }, back: [[/ఓం(?![ఀ-౿])/g, "ॐ"]] },
    gu: { off: 0x180, sp: { ऱ: "ર", ऴ: "ળ", ॲ: "અ", "᳚": "॑॑" }, back: [[/॑॑/g, "᳚"]] },
  };
  var KEEP = /[॒॑।॥᳚]/;
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
      W.PRQ = q[1] === "two" ? "as" : q[1]; // two columns (no longer offered): a link from before
      // only some texts (their Library ids, comma separated): js/features/print.js prints just those
      var t = /[?&]t=([a-z0-9,-]+)/.exec(location.search);
      if (t) W.PRT = t[1].split(",").filter(Boolean);
      // one day (the print builder's Routine tab, one day): its texts print in the order given, headed by the session
      var o = /[?&]o=(morning|afternoon|evening|all)(?:&|#|$)/.exec(location.search);
      if (o) W.PRO = o[1];
      // and its day (the weekday Home showed), for the heading
      var od = /[?&]od=([0-6])(?:&|#|$)/.exec(location.search);
      if (od) W.PROD = +od[1];
      // a week's printout (the print builder's Routine tab, the whole week): whose (name and routine) and the sessions;
      // js/features/print.js cleans the routine before using it
      var r = /[?&]r=([^&#]*)/.exec(location.search);
      if (r) {
        var rr = JSON.parse(decodeURIComponent(r[1]));
        if (rr && typeof rr.n === "string" && Array.isArray(rr.d) && Array.isArray(rr.s))
          W.PRR = {
            name: rr.n.slice(0, 40),
            routine: rr.r,
            span: rr.w === "day" ? "day" : "week",
            days: rr.d.filter(function (/** @type {any} */ x) {
              return x === +x && x >= 0 && x <= 6;
            }),
            sessions: rr.s.filter(function (/** @type {any} */ x) {
              return x === "morning" || x === "afternoon" || x === "evening";
            }),
          };
      }
      history.replaceState(null, "", location.pathname + location.hash);
    }
  } catch (e) {}
  var ind = "";
  try {
    ind = JSON.parse(localStorage.getItem("aarti2-prefs") || "{}").ind || "";
  } catch (e) {}
  var S = SCRIPTS[ind],
    /** @type {[any, string, string | null][]} [node, "", text] or [element, attribute, value]: what SCR.page() changed */
    OLD = [],
    ROOTS = ".ash, #main > h1, #btt",
    // built by the site script, already in the chosen script: the Library's list by category (js/features/library.js)
    LATER = "#jl";
  var SCR = {
    k: S ? ind : "", // "" while the text is shown as written
    // Devanagari → the chosen script
    /** @param {string} t */
    to: function (t) {
      return !S
        ? t
        : t.replace(/[ऀ-ॿ᳚]/g, function (/** @type {string} */ c) {
            return S.sp[c] || (KEEP.test(c) ? c : String.fromCharCode(c.charCodeAt(0) + S.off));
          });
    },
    // and back, for the English spelling (IAST) and search
    /** @param {string} t */
    from: function (t) {
      if (!S) return t;
      S.back.forEach(function (b) {
        t = t.replace(b[0], b[1]);
      });
      var lo = 0x900 + S.off,
        hi = lo + 0x7f;
      return t.replace(/[ঀ-෿]/g, function (/** @type {string} */ c) {
        var n = c.charCodeAt(0);
        return n >= lo && n <= hi ? String.fromCharCode(n - S.off) : c;
      });
    },
    // Rewrite the text (and its tooltips) in the pieces, the home contents, the site's name and the
    // contents lists. What was there is kept (OLD), so switching back to Devanagari puts it back exactly.
    page: function () {
      if (!S) return;
      document.documentElement.setAttribute("data-scr", ind);
      document.querySelectorAll(ROOTS).forEach(function (r) {
        SCR.el(r, OLD);
      });
    },
    // A piece just built on the reading page (js/core/page.js): in the chosen script, put back by SCR.set like the rest
    /** @param {Element} r */
    add: function (r) {
      SCR.el(r, OLD);
    },
    // Rewrite one element (a piece, a heading) in the chosen script. old: where to note what was there, so
    // SCR.set can put it back (the page's own copy); a printout's copy (js/print/compose.js) passes none.
    /** @param {Element} r @param {[any, string, string | null][]} [old] */
    el: function (r, old) {
      if (!S) return;
      var OLD = old || [];
      var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT),
        n;
      while ((n = /** @type {Text | null} */ (w.nextNode())))
        if (/[ऀ-ॿ]/.test(n.data)) {
          OLD.push([n, "", n.data]);
          n.data = SCR.to(n.data);
        }
      // The site's words around a text (data-tw: the dhrupad's label and marker, its language, Previous / Next, its
      // credit's words): this language's own (js/strings/, CONTENT.text), never Marathi's written in its letters; "a.b" a
      // word in a group, "a:0" / "a:1" the words before and after the name in a sentence ("{name} यांचे मानले जाते")
      var tw = (W.CONTENT && W.CONTENT.text && W.CONTENT.text[ind]) || null;
      if (tw)
        r.querySelectorAll("[data-tw]").forEach(function (e) {
          var k = e.getAttribute("data-tw") || "",
            half = k.split(":"),
            v = half[0].split(".").reduce(function (/** @type {any} */ o, /** @type {string} */ x) {
              return o && o[x];
            }, tw);
          if (typeof v !== "string") return;
          if (half.length > 1) v = v.split("{name}")[+half[1]] || "";
          var n = e.firstChild;
          if (!n || n.nodeType !== 3) e.insertBefore((n = document.createTextNode("")), e.firstChild);
          OLD.push([n, "", /** @type {Text} */ (n).data]);
          /** @type {Text} */ (n).data = v;
        });
      r.querySelectorAll("[title], [aria-label]").forEach(function (e) {
        ["title", "aria-label"].forEach(function (a) {
          var v = e.getAttribute(a);
          if (v && /[ऀ-ॿ]/.test(v)) {
            OLD.push([e, a, v]);
            e.setAttribute(a, SCR.to(v));
          }
        });
      });
      // the language of the text, for screen readers (the English parts keep lang="en")
      /** @type {HTMLElement[]} */ (
        (r.matches(".ash[lang]") ? [r] : []).concat(Array.prototype.slice.call(r.querySelectorAll(".mr, .ash [lang]:not([lang='en'])")))
      ).forEach(function (e) {
        OLD.push([e, "lang", e.getAttribute("lang")]);
        e.lang = ind;
      });
      // The credits' links: the page on this script's Wikipedia where it has one, else the nearest (js/text/content.js
      // wrote each one's, data-kn, data-te, data-gu: "kn https://…", and what a screen reader hears, data-kn-label)
      /** @type {NodeListOf<HTMLAnchorElement>} */ (r.querySelectorAll(".cr .mr a[data-wiki]")).forEach(function (a) {
        var to = a.getAttribute("data-" + ind);
        if (!to) return;
        ["href", "hreflang", "aria-label"].forEach(function (x) {
          OLD.push([a, x, a.getAttribute(x)]);
        });
        var sp = to.indexOf(" ");
        a.hreflang = to.slice(0, sp);
        a.href = to.slice(sp + 1);
        a.setAttribute("aria-label", (a.getAttribute("aria-label") || "").replace(/ — .*$/, "") + (a.getAttribute("data-" + ind + "-label") || ""));
      });
    },
    // Switch scripts in place (Settings → Main language): put the Devanagari back, then rewrite it in the new script.
    // Parts built later from the converted text (the contents lists) are turned back letter by letter.
    /** @param {string} k */
    set: function (k) {
      if (k === (S ? ind : "")) return;
      for (var i = OLD.length - 1; i >= 0; i--) {
        var o = OLD[i];
        if (!o[1]) o[0].data = o[2];
        else if (o[2] === null) o[0].removeAttribute(o[1]);
        else o[0].setAttribute(o[1], o[2]);
      }
      OLD = [];
      if (S)
        document.querySelectorAll(LATER).forEach(function (r) {
          var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT),
            n;
          while ((n = /** @type {Text | null} */ (w.nextNode()))) n.data = SCR.from(n.data);
        });
      document.documentElement.removeAttribute("data-scr");
      ind = k;
      S = SCRIPTS[k];
      SCR.k = S ? k : "";
      if (S) {
        SCR.page();
        document.querySelectorAll(LATER).forEach(function (r) {
          var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT),
            n;
          while ((n = /** @type {Text | null} */ (w.nextNode()))) if (/[ऀ-ॿ]/.test(n.data)) n.data = SCR.to(n.data);
        });
      }
    },
  };
  W.SCR = SCR;

  // One piece: for the reading page when it is first opened (js/core/page.js), with the pieces before and after it in
  // reading order for its Previous / Next; for the printout (js/print/compose.js) without them
  /** @param {Piece} p @param {Content} C @param {Piece} [prev] @param {Piece} [next] */
  W.renderPiece = function (p, C, prev, next) {
    return piece(p, prev || null, next || null, C);
  };
})();

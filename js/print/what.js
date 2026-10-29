// @ts-check
// The print builder, step 1, What (print redesign P4, PLAN §3.1, mockup 1): the Library's categories as the Library
// lists them (the family's own categories too), a checkbox for each text, search, Select all or Clear for each
// category and for everything. (No page counts: the browser lays the pages out as it prints, js/features/print.js.)
// A second tab, Today, offers the sessions of the day Home shows from the reading person's routine (and all of that day),
// one tap each; on another day than today the tab is named by its weekday ("Wednesday"):
// a tap chooses that session (P4b). Today keeps its own choice, apart from the Library's ticks: ticking one text on
// the Library tab prints that text, not the session as well (Satish, 2026-10-27). A session prints in Home's order, as
// one list headed by the day and the session (session() says which), never sorted into the Library's categories.
// A third tab, Routine (P5, mockup 1 panel 2), prints a person's routine: the whole week or one day, the days and the
// sessions chosen, each text once in routine order with a tag saying when it is said (js/print/select.js). The tab on
// show is what prints: Texts its ticks, Today the session chosen, Routine its own list (plan() gives its page 1 too).
// Ticking changes nothing on the reading page; js/features/print.js reads pick() and plan() when Print is tapped.
// The words follow the menu language (P.ui); the titles follow the reading languages, as in the routine builder: the
// first language large, the second under it.
// No init(): js/features/print.js creates it (createWhat) when it starts.

import { DAYS, esc, lead, num, scr, scrKey, second, ui } from "../core/words.js";
import { searchKey } from "../features/text-picker.js";
import { SESSIONS } from "../core/routine.js";
import { TAG_WORDS, selectRoutine, tagFor, weekGrid, weekOrder } from "./select.js";

/**
 * @typedef {{ id: string, sec: string, title: string, titleEn: string, language: string }} WhatText
 * @typedef {{ category: { id: string, name: { mr: string, en: string } }, texts: WhatText[] }} WhatShelf
 * @typedef {{ session: string, name: string, ids: string[], day?: number, today?: boolean }} WhatSession  one of the
 *   sessions of the day Home shows and its texts, with that day's weekday and whether it is today
 * @typedef {{ id: string, name: string, routine: import("../core/routine.js").Routine | null }} WhatPerson  a person and
 *   their routine (their own, or the default one)
 * @typedef {{ shelves: () => WhatShelf[], today: () => WhatSession[], people: () => WhatPerson[], me: () => string,
 *   onChange: () => void }} WhatOptions
 * @typedef {{ who: string, span: "week" | "day", days: number[], day: number, sessions: string[] }} RoutineChoice  the
 *   Routine tab's choices (a print link carries them)
 * @typedef {{ name: string, routine: import("../core/routine.js").Routine | null, days: number[], sessions: string[],
 *   ids: string[], where: import("./select.js").Where, grid: import("./select.js").GridRow[], key: string }} RoutinePlan
 *   what a routine printout holds: page 1's name, grid and tags, and its texts in order
 */

const W = {
  en: {
    what: "What to print",
    search: "Search the Library",
    all: "All texts",
    selectAll: "Select all",
    clear: "Clear",
    none: "No text matches",
    /** @param {number} n */
    texts: function (n) {
      return n + (n === 1 ? " text" : " texts");
    },
    pick: "Pick at least one text",
    tabs: { texts: "Library", today: "Today", routine: "Routine" },
    todayInfo: "Tap a session to print its texts.",
    allToday: "All of today",
    /** @param {string} d the weekday */
    allDay: function (d) {
      return "All of " + d;
    },
    empty: "No texts",
    who: "Whose routine",
    week: "Whole week",
    oneDay: "One day",
    days: "Days",
    sessions: "Sessions",
    order: "Printed once each, in routine order",
    noTexts: "no texts",
    nothing: "No texts on the days and at the times chosen",
  },
  mr: {
    what: "काय प्रिंट करायचे",
    search: "संग्रहात शोधा",
    all: "सर्व रचना",
    selectAll: "सर्व निवडा",
    clear: "सर्व काढा",
    none: "अशी रचना नाही",
    /** @param {number} n */
    texts: function (n) {
      return num(n) + " रचना";
    },
    pick: "किमान एक रचना निवडा",
    tabs: { texts: "संग्रह", today: "आज", routine: "दिनक्रम" },
    todayInfo: "सत्र निवडा: त्यातील रचना प्रिंट होतील.",
    allToday: "आजचे सर्व",
    /** @param {string} d the weekday */
    allDay: function (d) {
      return d + "चे सर्व";
    },
    empty: "एकही रचना नाही",
    who: "कोणाचा दिनक्रम",
    week: "पूर्ण आठवडा",
    oneDay: "एक दिवस",
    days: "वार",
    sessions: "वेळ",
    order: "प्रत्येक रचना एकदाच, दिनक्रमाच्या क्रमाने",
    noTexts: "रचना नाहीत",
    nothing: "निवडलेल्या वारी आणि वेळी एकही रचना नाही",
  },
};

/** The tabs, in order */
const TABS = ["texts", "today", "routine"];

/** The words in the menu language */
export function whatWords() {
  return W[ui()];
}

/** A title in a reading language: as written (Kannada letters when chosen), or its English name */
/** @param {WhatText} t @param {"mr" | "en"} l */
function titleIn(t, l) {
  return l === "mr" ? scr(t.title) : t.titleEn;
}
/** @param {WhatText} t @param {"mr" | "en"} l */
function langIn(t, l) {
  return l === "mr" ? scrKey() || t.language : "en";
}

/**
 * @param {HTMLElement} el  the empty container (#prwl)
 * @param {WhatOptions} o
 */
export function createWhat(el, o) {
  /** @type {Record<string, boolean>} the texts taken off (everything is chosen at first, and a text added later too) */
  var off = {},
    q = "",
    /** @type {string[] | null | undefined} ticks given before the Library was read (a print link), put in place once it is */
    pending,
    tab = "texts",
    /** @type {string[]} the Today tab's choice: the texts of the session tapped (none at first), in Home's order */
    day = [],
    /** the session they are ("morning", "afternoon", "evening" or "all"; "" when not known) */
    dayS = "",
    /** @type {number | undefined} and its weekday (the day Home shows; undefined: today) */
    dayW,
    /** @type {RoutineChoice} the Routine tab's choices: whose, the whole week or one day (today at first), the sessions */
    rc = { who: "", span: "week", days: [0, 1, 2, 3, 4, 5, 6], day: new Date().getDay(), sessions: SESSIONS.slice() },
    /** @type {WhatPerson | null} a person a print link carries (Safari keeps its own storage: Open in Safari) */
    carried = null;

  function all() {
    /** @type {WhatText[]} */
    var out = [];
    o.shelves().forEach(function (s) {
      out = out.concat(s.texts);
    });
    if (pending !== undefined && out.length) {
      var ids = pending;
      pending = undefined;
      off = {};
      if (ids)
        out.forEach(function (t) {
          if (/** @type {string[]} */ (ids).indexOf(t.id) < 0) off[t.id] = true;
        });
    }
    return out;
  }
  /** The chosen texts' Library ids, or null for every text; on the Routine tab, the routine's texts in routine order */
  function pick() {
    if (tab === "routine") {
      var r = rplan();
      return r ? r.ids : [];
    }
    if (tab === "today") return day.filter(known);
    var a = all(),
      on = a.filter(function (t) {
        return !off[t.id];
      });
    return on.length === a.length
      ? null
      : on.map(function (t) {
          return t.id;
        });
  }
  /** The chosen texts (on the Routine tab, in routine order) */
  function chosen() {
    if (tab === "routine" || tab === "today") return /** @type {WhatText[]} */ (/** @type {string[]} */ (pick()).map(byId).filter(Boolean));
    return all().filter(function (t) {
      return !off[t.id];
    });
  }

  // ---- The Routine tab ----
  /** The people, a person carried by a print link first */
  function people() {
    var ps = o.people();
    return carried
      ? [carried].concat(
          ps.filter(function (p) {
            return p.id !== /** @type {WhatPerson} */ (carried).id;
          }),
        )
      : ps;
  }
  /** Whose routine prints: as picked, else the person reading */
  function person() {
    var ps = people();
    function find(/** @type {string} */ id) {
      return ps.filter(function (p) {
        return p.id === id;
      })[0];
    }
    return find(rc.who) || find(o.me()) || ps[0] || null;
  }
  function rdays() {
    return rc.span === "day" ? [rc.day] : rc.days.slice();
  }
  /** @param {string} id */
  function known(id) {
    return !!byId(id);
  }
  /** Whether a session has a text on the days chosen (else its chip is greyed and it is left out) @param {WhatPerson} p @param {string} s */
  function hasTexts(p, s) {
    return selectRoutine(p.routine, rdays(), /** @type {any} */ ([s]), known).ids.length > 0;
  }
  /** What the routine printout holds, or null when there is nobody @returns {RoutinePlan | null} */
  function rplan() {
    var p = person();
    if (!p) return null;
    var pp = p,
      d = rdays(),
      ses = /** @type {any[]} */ (
        rc.sessions.filter(function (s) {
          return hasTexts(pp, s);
        })
      ),
      sel = selectRoutine(p.routine, d, ses, known);
    return {
      name: p.name,
      routine: p.routine,
      days: weekOrder(d),
      sessions: ses,
      ids: sel.ids,
      where: sel.where,
      grid: weekGrid(p.routine, d, ses, sel.ids),
      key: [p.id, p.name, weekOrder(d).join(""), ses.join(",")].join("/"),
    };
  }
  /** The tag in the menu language (Marathi in the chosen script) @param {RoutinePlan} r @param {string} id */
  function tagIn(r, id) {
    return ui() === "mr" ? scr(tagFor(r.where[id], "mr")) : tagFor(r.where[id], "en");
  }
  /** Draw the Routine tab's choices and list (again after each tap, keeping the focus on the button tapped) */
  function drawRoutine() {
    var box = /** @type {HTMLElement | null} */ (el.querySelector(".prrt"));
    if (!box) return;
    var a = /** @type {HTMLElement | null} */ (document.activeElement),
      at = a && box.contains(a) ? a.getAttribute("data-rk") : null,
      w = whatWords(),
      tw = TAG_WORDS[ui()],
      l = lead(),
      s2 = second(),
      ps = people(),
      p = person(),
      r = rplan(),
      d = rdays(),
      me = p ? p.id : "";
    var h =
      '<div class="prrw">' +
      (ps.length > 1
        ? '<select class="prwho" data-rk="who" aria-label="' +
          esc(w.who) +
          '">' +
          ps
            .map(function (x) {
              return '<option value="' + esc(x.id) + '"' + (x.id === me ? " selected" : "") + ">" + esc(x.name) + "</option>";
            })
            .join("") +
          "</select>"
        : '<span class="prwho" title="' + esc(w.who) + '">' + esc(p ? p.name : "") + "</span>") +
      '<span class="prrs">' +
      ["week", "day"]
        .map(function (k) {
          return (
            '<button type="button" data-rk="span-' +
            k +
            '" data-rspan="' +
            k +
            '" aria-pressed="' +
            (rc.span === k) +
            '">' +
            esc(k === "week" ? w.week : w.oneDay) +
            "</button>"
          );
        })
        .join("") +
      "</span></div>" +
      '<div class="prchips" role="group" aria-label="' +
      esc(w.days) +
      '">' +
      [1, 2, 3, 4, 5, 6, 0]
        .map(function (n) {
          return (
            '<button type="button" class="prchip' +
            (n === new Date().getDay() ? " prtoday" : "") +
            '" data-rk="day-' +
            n +
            '" data-rday="' +
            n +
            '" aria-pressed="' +
            (d.indexOf(n) >= 0) +
            '">' +
            esc(ui() === "mr" ? scr(tw.days[n]) : tw.days[n]) +
            "</button>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="prchips" role="group" aria-label="' +
      esc(w.sessions) +
      '">' +
      SESSIONS.map(function (s) {
        var any = !!p && hasTexts(p, s),
          nm = ui() === "mr" ? scr(tw.sessions[s]) : tw.sessions[s];
        return (
          '<button type="button" class="prchip" data-rk="ses-' +
          s +
          '" data-rses="' +
          s +
          '" aria-pressed="' +
          (any && rc.sessions.indexOf(s) >= 0) +
          '"' +
          (any ? "" : " disabled") +
          ">" +
          esc(nm) +
          (any ? "" : " <small>· " + esc(w.noTexts) + "</small>") +
          "</button>"
        );
      }).join("") +
      "</div>" +
      '<div class="prcg"><span>' +
      esc(w.order) +
      "</span></div>";
    if (r && r.ids.length) {
      var rr = r;
      h +=
        '<ol class="prrl">' +
        r.ids
          .map(function (id, i) {
            var t = /** @type {WhatText} */ (byId(id));
            return (
              '<li data-id="' +
              esc(id) +
              '" data-sec="' +
              esc(t.sec) +
              '"><span class="prrn">' +
              num(i + 1) +
              '.</span><span class="tt"><span class="t1" lang="' +
              langIn(t, l) +
              '">' +
              esc(titleIn(t, l)) +
              "</span>" +
              (s2 ? '<span class="t2" lang="' + langIn(t, s2) + '">' + esc(titleIn(t, s2)) + "</span>" : "") +
              '<span class="prtag">' +
              esc(tagIn(rr, id)) +
              "</span></span></li>"
            );
          })
          .join("") +
        "</ol>";
    } else h += '<p class="prre">' + esc(w.nothing) + "</p>";
    box.innerHTML = h;
    var f = at && /** @type {HTMLElement | null} */ (box.querySelector('[data-rk="' + at + '"]'));
    if (f) f.focus();
  }
  /** A tap on the Routine tab @param {HTMLElement} t */
  function routineTap(t) {
    var b = /** @type {HTMLElement | null} */ (t.closest(".prrt button"));
    if (!b) return false;
    if (b.dataset.rspan) rc.span = b.dataset.rspan === "day" ? "day" : "week";
    else if (b.dataset.rday) {
      var n = Number(b.dataset.rday),
        i = rc.days.indexOf(n);
      if (rc.span === "day") rc.day = n;
      // (the last day stays: a week of no days prints nothing)
      else if (i >= 0) {
        if (rc.days.length > 1) rc.days.splice(i, 1);
      } else rc.days.push(n);
    } else if (b.dataset.rses) {
      var s = b.dataset.rses,
        j = rc.sessions.indexOf(s);
      if (j >= 0) rc.sessions.splice(j, 1);
      else rc.sessions.push(s);
    } else return false;
    drawRoutine();
    o.onChange();
    return true;
  }
  /** The ticks as given (a print link carries them): null for every text @param {string[] | null} ids */
  function set(ids) {
    pending = ids;
    all();
    if (el.firstChild) sync();
  }

  function render() {
    var w = whatWords(),
      l = lead(),
      s2 = second();
    el.lang = ui();
    el.innerHTML =
      '<div class="prtabs" role="tablist">' +
      TABS.map(function (k) {
        return (
          '<button type="button" role="tab" id="prtab-' +
          k +
          '" data-tab="' +
          k +
          '" aria-controls="prtp-' +
          k +
          '">' +
          esc(k === "today" ? dayName() || w.tabs.today : w.tabs[/** @type {"texts" | "routine"} */ (k)]) +
          "</button>"
        );
      }).join("") +
      "</div>" +
      '<div class="prtp" id="prtp-today" role="tabpanel" aria-labelledby="prtab-today"><p class="prti">' +
      esc(w.todayInfo) +
      "</p>" +
      todayHtml() +
      "</div>" +
      '<div class="prtp" id="prtp-routine" role="tabpanel" aria-labelledby="prtab-routine"><div class="prrt"></div></div>' +
      '<div class="prtp" id="prtp-texts" role="tabpanel" aria-labelledby="prtab-texts">' +
      '<input type="search" class="tpkq prwq" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' +
      esc(w.search) +
      '" aria-label="' +
      esc(w.search) +
      '">' +
      '<div class="prcg prcga"><span>' +
      esc(w.all) +
      '</span><button type="button" class="prcb" data-cat=""></button></div>' +
      o
        .shelves()
        .map(function (s) {
          var c = s.category;
          return (
            '<div class="prgr" data-cat="' +
            esc(c.id) +
            '"><div class="prcg"><span lang="' +
            (l === "mr" ? scrKey() || "mr" : "en") +
            '">' +
            esc(l === "mr" ? scr(c.name.mr) : c.name.en) +
            " · " +
            num(s.texts.length) +
            "</span>" +
            '<button type="button" class="prcb" data-cat="' +
            esc(c.id) +
            '"></button></div>' +
            '<ul class="tpkl">' +
            s.texts
              .map(function (t) {
                return (
                  '<li data-id="' +
                  esc(t.id) +
                  '" data-sec="' +
                  esc(t.sec) +
                  '"><label class="tpkr"><input type="checkbox" value="' +
                  esc(t.id) +
                  '">' +
                  '<span class="tpkc" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>' +
                  '<span class="tt"><span class="t1" lang="' +
                  langIn(t, l) +
                  '">' +
                  esc(titleIn(t, l)) +
                  "</span>" +
                  (s2 ? '<span class="t2" lang="' + langIn(t, s2) + '">' + esc(titleIn(t, s2)) + "</span>" : "") +
                  "</span></label></li>"
                );
              })
              .join("") +
            "</ul></div>"
          );
        })
        .join("") +
      '<p class="tpkn" hidden>' +
      esc(w.none) +
      "</p></div>";
    showTab();
    drawRoutine();
    /** @type {HTMLInputElement} */ (el.querySelector(".prwq")).value = q;
    filter();
    sync();
  }

  /** The weekday Home shows, in the menu language, or "" when it shows today */
  function dayName() {
    var x = o.today()[0];
    if (!x || x.today !== false || typeof x.day !== "number") return "";
    return ui() === "mr" ? scr(DAYS.mr[x.day]) : DAYS.en[x.day];
  }
  /** The day's sessions with texts, and all of the day when more than one has texts */
  function sessions() {
    var ss = o.today(),
      full = ss.filter(function (x) {
        return x.ids.length;
      });
    if (full.length > 1) {
      /** @type {string[]} */
      var ids = [];
      full.forEach(function (x) {
        x.ids.forEach(function (id) {
          if (ids.indexOf(id) < 0) ids.push(id);
        });
      });
      var dn = dayName();
      ss = ss.concat([{ session: "all", name: dn ? whatWords().allDay(dn) : whatWords().allToday, ids: ids, day: ss[0].day, today: ss[0].today }]);
    }
    return ss;
  }
  function todayHtml() {
    var l = lead();
    return (
      '<ul class="prtd">' +
      sessions()
        .map(function (x) {
          var names = x.ids
            .map(function (id) {
              var t = byId(id);
              return t ? titleIn(t, l) : "";
            })
            .filter(Boolean)
            .join(" · ");
          return (
            '<li><button type="button" class="prses" data-s="' +
            esc(x.session) +
            '"' +
            (x.ids.length ? "" : " disabled") +
            '><span class="prsn">' +
            esc(x.name) +
            '</span><span class="prsc"></span>' +
            '<span class="prsl" lang="' +
            (l === "mr" ? scrKey() || "mr" : "en") +
            '">' +
            esc(names || whatWords().empty) +
            "</span></button></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }
  /** @param {string} id */
  function byId(id) {
    return (
      all().filter(function (t) {
        return t.id === id;
      })[0] || null
    );
  }
  /** Whether these are the texts of the session chosen on the Today tab @param {string[]} ids */
  function same(ids) {
    return (
      day.length === ids.length &&
      day.every(function (id) {
        return ids.indexOf(id) >= 0;
      })
    );
  }
  function showTab() {
    [].forEach.call(el.querySelectorAll(".prtabs button"), function (/** @type {HTMLElement} */ b) {
      var on = b.dataset.tab === tab;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    [].forEach.call(el.querySelectorAll(".prtp"), function (/** @type {HTMLElement} */ p) {
      p.hidden = p.id !== "prtp-" + tab;
    });
  }

  /** The ticks and the Select all / Clear buttons follow the choice */
  function sync() {
    var w = whatWords();
    sessions().forEach(function (x) {
      var b = /** @type {HTMLElement | null} */ (el.querySelector('.prses[data-s="' + x.session + '"]'));
      if (!b) return;
      b.setAttribute("aria-pressed", String(!!x.ids.length && same(x.ids)));
      /** @type {HTMLElement} */ (b.querySelector(".prsc")).textContent = x.ids.length ? w.texts(x.ids.length) : "";
    });
    [].forEach.call(el.querySelectorAll(".tpkl input"), function (/** @type {HTMLInputElement} */ x) {
      x.checked = !off[x.value];
    });
    [].forEach.call(el.querySelectorAll(".prcb"), function (/** @type {HTMLElement} */ b) {
      var ins = b.dataset.cat ? el.querySelectorAll('.prgr[data-cat="' + b.dataset.cat + '"] input') : el.querySelectorAll(".tpkl input"),
        full = [].every.call(ins, function (/** @type {HTMLInputElement} */ x) {
          return x.checked;
        });
      b.textContent = full ? w.clear : w.selectAll;
      b.setAttribute("data-on", full ? "1" : "0");
    });
  }

  /** Show only the texts that match the search, and the categories that have one */
  function filter() {
    var key = searchKey(q),
      n = 0;
    [].forEach.call(el.querySelectorAll(".prgr"), function (/** @type {HTMLElement} */ g) {
      var m = 0;
      [].forEach.call(g.querySelectorAll("li"), function (/** @type {HTMLElement} */ li) {
        var t = all().filter(function (x) {
            return x.id === li.dataset.id;
          })[0],
          ok = !key || (!!t && (searchKey(t.title).indexOf(key) >= 0 || searchKey(scr(t.title)).indexOf(key) >= 0 || searchKey(t.titleEn).indexOf(key) >= 0));
        li.hidden = !ok;
        if (ok) m++;
      });
      g.hidden = !m;
      n += m;
    });
    /** @type {HTMLElement} */ (el.querySelector(".tpkn")).hidden = n > 0;
  }

  el.addEventListener("change", function (e) {
    var x = /** @type {HTMLInputElement} */ (e.target);
    if (x.classList.contains("prwho")) {
      rc.who = x.value;
      drawRoutine();
      o.onChange();
      return;
    }
    if (x.type !== "checkbox") return;
    if (x.checked) delete off[x.value];
    else off[x.value] = true;
    sync();
    o.onChange();
  });
  el.addEventListener("input", function (e) {
    var x = /** @type {HTMLInputElement} */ (e.target);
    if (!x.classList.contains("prwq")) return;
    q = x.value;
    filter();
  });
  el.addEventListener("click", function (e) {
    var t = /** @type {HTMLElement} */ (e.target),
      tb = /** @type {HTMLElement | null} */ (t.closest(".prtabs button")),
      ss = /** @type {HTMLElement | null} */ (t.closest(".prses"));
    if (tb) {
      tab = tb.dataset.tab || "texts";
      showTab();
      // the tab on show is what prints
      o.onChange();
      return;
    }
    if (routineTap(t)) return;
    if (ss) {
      var at = ss.dataset.s,
        x = sessions().filter(function (y) {
          return y.session === at;
        })[0];
      if (x) {
        day = x.ids.slice();
        dayS = x.session;
        dayW = x.day;
      }
      sync();
      o.onChange();
      return;
    }
    var b = /** @type {HTMLElement | null} */ (t.closest(".prcb"));
    if (!b) return;
    var clear = b.getAttribute("data-on") === "1",
      cat = b.dataset.cat;
    o.shelves().forEach(function (s) {
      if (cat && s.category.id !== cat) return;
      s.texts.forEach(function (t) {
        if (clear) off[t.id] = true;
        else delete off[t.id];
      });
    });
    sync();
    o.onChange();
  });

  // the tabs: ← and → move between them (WAI-ARIA tabs)
  el.addEventListener("keydown", function (e) {
    var b = /** @type {HTMLElement} */ (e.target);
    if (!b.closest || !b.closest(".prtabs") || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    tab = TABS[(TABS.indexOf(tab) + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    showTab();
    o.onChange();
    var nb = /** @type {HTMLElement | null} */ (el.querySelector('.prtabs [data-tab="' + tab + '"]'));
    if (nb) nb.focus();
    e.preventDefault();
  });

  return {
    render: render,
    /** The tab shown: "texts", "today" or "routine" @param {string} t */
    tab: function (t) {
      tab = TABS.indexOf(t) >= 0 ? t : "texts";
      if (el.firstChild) showTab();
    },
    pick: pick,
    set: set,
    /**
     * The Today tab's choice: a session's texts, in Home's order, which session (else the one of the day's that has
     * those texts) and its weekday (else today)
     * @param {string[]} ids @param {string} [s] @param {number} [d]
     */
    today: function (ids, s, d) {
      day = ids.slice();
      dayW = d;
      dayS =
        s ||
        (
          sessions().filter(function (x) {
            return x.ids.length && same(x.ids);
          })[0] || { session: "" }
        ).session;
      if (el.firstChild) sync();
    },
    /**
     * The session the Today tab prints (Today on show with a session chosen): its texts print in Home's order, headed by
     * its day (the weekday, when known), else null
     */
    session: function () {
      return tab === "today" && day.length ? { session: dayS, day: dayW } : null;
    },
    /** What a routine printout holds (the Routine tab on show), else null */
    plan: function () {
      return tab === "routine" ? rplan() : null;
    },
    /** The Routine tab's choices, for a print link */
    routine: function () {
      var p = person();
      return { who: p ? p.id : "", span: rc.span, days: rdays(), day: rc.day, sessions: rc.sessions.slice() };
    },
    /**
     * The Routine tab as a print link gives it (Open in Safari): the person (name and routine; Safari keeps its own
     * storage) and the choices
     * @param {WhatPerson} p @param {RoutineChoice} c
     */
    carry: function (p, c) {
      carried = p;
      rc = { who: p.id, span: c.span === "day" ? "day" : "week", days: c.days.slice(), day: c.days[0], sessions: c.sessions.slice() };
      tab = "routine";
      if (el.firstChild) {
        showTab();
        drawRoutine();
      }
    },
    /** The chosen texts' sections, in the Library's order */
    secs: function () {
      return chosen().map(function (t) {
        return t.sec;
      });
    },
    /** The texts chosen: how many, and the name of the one when there is only one */
    total: function () {
      var c = chosen();
      return { texts: c.length, one: c.length === 1 ? titleIn(c[0], lead()) : "", oneLang: c.length === 1 ? langIn(c[0], lead()) : "" };
    },
  };
}

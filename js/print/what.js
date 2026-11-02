// @ts-check
// The print builder, step 1, What (print redesign P4, PLAN §3.1, mockup 1): the Library's categories as the Library
// lists them (the family's own categories too), a checkbox for each text, search, Select all or Clear for each
// category and for everything. (No page counts: the browser lays the pages out as it prints, js/features/print.js.)
// Tab two, Routine (Satish, 2026-11-01: Today and Routine made one, three choices in place of a dozen buttons), prints
// from a person's routine: whose (the person reading at first), when (the day Home shows, the whole week, or another
// day) and which session (all, or one; each shows how many texts it has, and one without any is greyed). One day prints
// as Home lists it, one list headed by the day and the session; for the person reading on the day Home shows, Home's own
// lists. The whole week prints each text once in routine order with a tag saying when it is said, after page 1, the
// week at a glance (js/print/select.js). The tab on show is what prints: Library its ticks, Routine its list. A session
// chosen on Home opens the tab at it, and the Library tab with nothing ticked, so ticking one text there prints that
// text, not the session as well (Satish, 2026-10-27).
// Ticking changes nothing on the reading page; js/features/print.js reads pick() and plan() when Print is tapped.
// The words follow the menu language (P.ui); the titles follow the reading languages, as in the routine builder: the
// first language large, the second under it.
// No init(): js/features/print.js creates it (createWhat) when it starts.

import { esc, lead, num, scr, scrKey, second, ui } from "../core/words.js";
import { searchKey } from "../features/text-picker.js";
import { SESSIONS } from "../core/routine.js";
import { selectRoutine, tagFor, weekGrid, weekOrder } from "./select.js";
import { menuWords } from "../core/strings.js";

/**
 * @typedef {{ id: string, sec: string, title: string, titleEn: string, language: string }} WhatText
 * @typedef {{ category: { id: string, name: { mr: string, en: string } }, texts: WhatText[] }} WhatShelf
 * @typedef {{ session: string, name: string, ids: string[], day?: number, today?: boolean }} WhatSession  one of the
 *   sessions of the day Home shows and its texts, with that day's weekday and whether it is today
 * @typedef {{ id: string, name: string, routine: import("../core/routine.js").Routine | null }} WhatPerson  a person and
 *   their routine (their own, or the ready-made one they follow)
 * @typedef {{ shelves: () => WhatShelf[], today: () => WhatSession[], people: () => WhatPerson[], me: () => string,
 *   onChange: () => void }} WhatOptions
 * @typedef {{ who: string, span: "week" | "day", days: number[], day: number, sessions: string[] }} RoutineChoice  the
 *   Routine tab's choices as a print link carries them (a week's printout: js/render.js reads them)
 * @typedef {{ name: string, routine: import("../core/routine.js").Routine | null, days: number[], sessions: string[],
 *   ids: string[], where: import("./select.js").Where, grid: import("./select.js").GridRow[], key: string }} RoutinePlan
 *   what a routine printout holds: page 1's name, grid and tags, and its texts in order
 */

/** The tabs, in order */
const TABS = ["texts", "routine"];

/** The words in the menu language */
export function whatWords() {
  return menuWords("printWhat");
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
    /** The Routine tab's choices: whose ("" the person reading), when ("home" the day Home shows, "week", or a weekday,
     * 0 = Sunday) and which session ("all", or one of SESSIONS) */
    rc = { who: "", when: /** @type {string | number} */ ("home"), ses: "all" },
    /** @type {string[] | null} a session's texts as given (Home's, or a print link's: Safari keeps its own storage), in
     * their order; dropped at the next choice */
    given = null,
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
  /** The chosen texts' Library ids, or null for every text; on the Routine tab, its list in order */
  function pick() {
    if (tab === "routine") return rids();
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
  /** The chosen texts (on the Routine tab, in its order) */
  function chosen() {
    if (tab === "routine") return /** @type {WhatText[]} */ (/** @type {string[]} */ (pick()).map(byId).filter(Boolean));
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
  /** The day Home shows: its weekday, and whether it is today */
  function home() {
    var x = o.today()[0];
    return { day: x && typeof x.day === "number" ? x.day : new Date().getDay(), today: !x || x.today !== false };
  }
  /** The weekday printed (one day) */
  function wday() {
    return rc.when === "home" ? home().day : Number(rc.when);
  }
  /** @param {string} id */
  function known(id) {
    return !!byId(id);
  }
  /** The texts of one day, of a session or all of them ("all"), in routine order: the person reading's on the day Home
   * shows as Home lists them, else from the routine @param {string} s */
  function dayIds(s) {
    var p = person();
    if (rc.when === "home" && (!p || p.id === o.me())) {
      /** @type {string[]} */
      var ids = [];
      o.today().forEach(function (x) {
        if (s === "all" || x.session === s)
          x.ids.forEach(function (id) {
            if (known(id) && ids.indexOf(id) < 0) ids.push(id);
          });
      });
      return ids;
    }
    return p ? selectRoutine(p.routine, [wday()], /** @type {any} */ (s === "all" ? SESSIONS : [s]), known).ids : [];
  }
  /** How many texts a session has (or all of them: "all") on the day or the week chosen @param {string} s */
  function countFor(s) {
    if (rc.when !== "week") return dayIds(s).length;
    var p = person();
    return p ? selectRoutine(p.routine, [0, 1, 2, 3, 4, 5, 6], /** @type {any} */ (s === "all" ? SESSIONS : [s]), known).ids.length : 0;
  }
  /** The session printed: as picked (as given, with a session's texts), else all (one without texts on the day or
   * week chosen is greyed) */
  function ses() {
    return given || (rc.ses !== "all" && countFor(rc.ses)) ? rc.ses : "all";
  }
  /** What a week's printout holds, or null when there is nobody @returns {RoutinePlan | null} */
  function rplan() {
    var p = person();
    if (!p) return null;
    var pp = p,
      d = [0, 1, 2, 3, 4, 5, 6],
      s = ses(),
      sl = /** @type {any[]} */ (
        (s === "all" ? SESSIONS : [s]).filter(function (x) {
          return selectRoutine(pp.routine, d, /** @type {any} */ ([x]), known).ids.length > 0;
        })
      ),
      sel = selectRoutine(p.routine, d, sl, known);
    return {
      name: p.name,
      routine: p.routine,
      days: weekOrder(d),
      sessions: sl,
      ids: sel.ids,
      where: sel.where,
      grid: weekGrid(p.routine, d, sl, sel.ids),
      key: [p.id, p.name, weekOrder(d).join(""), sl.join(",")].join("/"),
    };
  }
  /** The Routine tab's texts, in order: the week's, or the day's (as given, with a session's texts) */
  function rids() {
    if (rc.when !== "week") return given ? given.filter(known) : dayIds(ses());
    var r = rplan();
    return r ? r.ids : [];
  }
  /** The tag in the menu language, in its own words @param {RoutinePlan} r @param {string} id */
  function tagIn(r, id) {
    return tagFor(r.where[id], ui());
  }
  /** A weekday's name in the menu language @param {number} d */
  function dayWord(d) {
    return scr(menuWords("dates").days[d]);
  }
  /** Draw the Routine tab's choices and list (again after each choice, keeping the focus where it was) */
  function drawRoutine() {
    var box = /** @type {HTMLElement | null} */ (el.querySelector(".prrt"));
    if (!box) return;
    var a = /** @type {HTMLElement | null} */ (document.activeElement),
      at = a && box.contains(a) ? a.getAttribute("data-rk") : null,
      w = whatWords(),
      sw = menuWords("today").sessions,
      l = lead(),
      s2 = second(),
      ps = people(),
      p = person(),
      hm = home(),
      wk = rc.when === "week",
      s = ses(),
      ids = rids(),
      r = wk ? rplan() : null,
      me = p ? p.id : "";
    // When: the day Home shows first (today, mostly), the whole week, then the other days, Monday first
    var whens = /** @type {(string | number)[]} */ (["home", "week"]).concat(
      [1, 2, 3, 4, 5, 6, 0].filter(function (d) {
        return d !== hm.day;
      }),
    );
    var h =
      '<div class="prrf"><label class="prfl"><span>' +
      esc(w.who) +
      "</span>" +
      (ps.length > 1
        ? '<select class="prwho" data-rk="who">' +
          ps
            .map(function (x) {
              return '<option value="' + esc(x.id) + '"' + (x.id === me ? " selected" : "") + ">" + esc(x.name) + "</option>";
            })
            .join("") +
          "</select>"
        : '<span class="prwho">' + esc(p ? p.name : "") + "</span>") +
      '</label><label class="prfl"><span>' +
      esc(w.when) +
      '</span><select class="prwhen" data-rk="when">' +
      whens
        .map(function (v) {
          var t = v === "home" ? (hm.today ? w.today(dayWord(hm.day)) : dayWord(hm.day)) : v === "week" ? w.week : dayWord(/** @type {number} */ (v));
          return '<option value="' + v + '"' + (String(v) === String(rc.when) ? " selected" : "") + ">" + esc(t) + "</option>";
        })
        .join("") +
      "</select></label></div>" +
      '<div class="prss" role="group" aria-label="' +
      esc(w.sessions) +
      '">' +
      ["all"]
        .concat(SESSIONS)
        .map(function (k) {
          var n = countFor(k);
          return (
            '<button type="button" data-rk="ses-' +
            k +
            '" data-rses="' +
            k +
            '" aria-pressed="' +
            (k === s) +
            '"' +
            (n ? "" : " disabled") +
            '><span class="prsn">' +
            esc(k === "all" ? w.allS : sw[/** @type {"morning"} */ (k)]) +
            '</span><span class="prsc">' +
            (n ? num(n) : "–") +
            "</span></button>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="prcg"><span>' +
      esc(wk ? w.order : dayWord(wday()) + (s === "all" ? "" : " · " + sw[/** @type {"morning"} */ (s)])) +
      "</span></div>";
    if (ids.length) {
      h +=
        '<ol class="prrl">' +
        ids
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
              (r ? '<span class="prtag">' + esc(tagIn(r, id)) + "</span>" : "") +
              "</span></li>"
            );
          })
          .join("") +
        "</ol>";
    } else h += '<p class="prre">' + esc(w.nothing) + "</p>";
    box.innerHTML = h;
    var f = at && /** @type {HTMLElement | null} */ (box.querySelector('[data-rk="' + at + '"]'));
    if (f) f.focus();
  }
  /** A choice on the Routine tab: whose, when, or a session @param {HTMLElement} t */
  function routinePick(t) {
    if (t.classList.contains("prwho")) rc.who = /** @type {HTMLSelectElement} */ (t).value;
    else if (t.classList.contains("prwhen")) {
      var v = /** @type {HTMLSelectElement} */ (t).value;
      rc.when = v === "home" || v === "week" ? v : Number(v);
    } else {
      var b = /** @type {HTMLElement | null} */ (t.closest(".prss button"));
      if (!b || !b.dataset.rses) return false;
      rc.ses = b.dataset.rses;
    }
    given = null;
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
          esc(w.tabs[/** @type {"texts" | "routine"} */ (k)]) +
          "</button>"
        );
      }).join("") +
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

  /** @param {string} id */
  function byId(id) {
    return (
      all().filter(function (t) {
        return t.id === id;
      })[0] || null
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
    if (routinePick(x)) return;
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
      tb = /** @type {HTMLElement | null} */ (t.closest(".prtabs button"));
    if (tb) {
      tab = tb.dataset.tab || "texts";
      showTab();
      // the tab on show is what prints
      o.onChange();
      return;
    }
    if (t.closest(".prss") && routinePick(t)) return;
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
    /** The tab shown: "texts" or "routine" ("today", as before: the Routine tab) @param {string} t */
    tab: function (t) {
      tab = t === "today" ? "routine" : TABS.indexOf(t) >= 0 ? t : "texts";
      if (el.firstChild) showTab();
    },
    pick: pick,
    set: set,
    /**
     * A session's texts as given (Home's Print, a print link), in their order: the person reading, the day Home shows
     * (or the weekday given: a print link opened on another day), and the session (else the one with those texts)
     * @param {string[]} ids @param {string} [s] @param {number} [d]
     */
    today: function (ids, s, d) {
      var hd = home().day,
        hit = o.today().filter(function (x) {
          return x.ids.length === ids.length && x.ids.join() === ids.join();
        })[0];
      rc = { who: "", when: typeof d !== "number" || d === hd ? "home" : d, ses: s || (hit ? hit.session : "all") };
      given = ids.slice();
      if (el.firstChild) drawRoutine();
    },
    /**
     * One day's printout (the Routine tab on show, one day): its texts print in order, headed by its weekday and the
     * session ("all": the day alone), else null
     */
    session: function () {
      return tab === "routine" && rc.when !== "week" ? { session: ses(), day: wday() } : null;
    },
    /** What a week's printout holds (the Routine tab on show, the whole week), else null */
    plan: function () {
      return tab === "routine" && rc.when === "week" ? rplan() : null;
    },
    /** The Routine tab's choices for a week's printout, for a print link */
    routine: function () {
      var p = person(),
        r = rplan();
      return { who: p ? p.id : "", span: "week", days: [0, 1, 2, 3, 4, 5, 6], day: home().day, sessions: r ? r.sessions : SESSIONS.slice() };
    },
    /**
     * The Routine tab as a print link gives it (Open in Safari): the person (name and routine; Safari keeps its own
     * storage) and the choices (a link made before 2026-11 may name one day, or several sessions: those print all)
     * @param {WhatPerson} p @param {RoutineChoice} c
     */
    carry: function (p, c) {
      carried = p;
      rc = { who: p.id, when: c.span === "day" ? c.days[0] : "week", ses: c.sessions.length === 1 ? c.sessions[0] : "all" };
      given = null;
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

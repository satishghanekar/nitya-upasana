// Bars tuck away while reading (CSS: "Bars tuck away while reading")
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { onPiece, root } from "../core/page.js";
import { P, setLead } from "../core/state.js";
import { skLang } from "./sankashti.js";
import { markNow, todayLang } from "./today-card.js";
import { calLang } from "./vedic-calendar.js";
import { libLang } from "./library.js";
import { pdfLang } from "./pdfs.js";
import { autoFs, pullSoon } from "../text/autofit.js";
import { cur, foldSet, unfold } from "../core/apply.js";
import { asLabel, asShow, asc } from "./bottom-bar.js";
import { szSet } from "./settings-panel.js";
import { setJ, setP } from "./overlays.js";
import { spSet } from "./languages.js";
import { fillWords, menuWords } from "../core/strings.js";
import { num, shown, ui } from "../core/words.js";

export var TK;
var tkStrip, MQ900, MQ1000, MQ1024, tailF;

export function init() {
  // Phones and tablets without the side menu. Scrolling down past the top of the page tucks the top and
  // bottom bars away (data-tuck); scrolling up, the end of the page, a tap on a blank part of the page,
  // a menu opening, keyboard focus in a bar or a jump (Contents, Prev / Next) brings them back.
  // (y starts at 0, the top: the browser restores a reload's scroll position only after start-up, and reading
  // scrollY here, mid start-up, would make it lay the page out early)
  // h: the page height, kept up to date as the page grows or shrinks (folds, fonts, a resize), so the
  // scroll handler below never asks the browser for it, which could make it lay the page out mid-scroll
  TK = { y: 0, acc: 0, hold: 0, h: 0, show: 0 };
  // A piece just built (js/core/page.js) takes the text language and the order of its two languages, as apply() sets
  onPiece(function (sec) {
    sec.setAttribute("data-lang", P.lang);
    leadOrder(sec.querySelectorAll(".verse, header h2"), leadOf());
  });
  if (window.ResizeObserver)
    new ResizeObserver(function () {
      TK.h = document.documentElement.scrollHeight;
    }).observe(document.body);
  tkStrip = document.getElementById("tuck");
  addEventListener(
    "scroll",
    function () {
      var y = scrollY,
        d = y - TK.y;
      TK.y = y;
      if (Date.now() < TK.hold) return;
      if (y < 80 || y + innerHeight >= (TK.h || document.documentElement.scrollHeight) - 4) return showSoon();
      // small movements add up, so a slow drag still counts; a change of direction starts again
      TK.acc = d > 0 === TK.acc > 0 ? TK.acc + d : d;
      if (TK.acc > 24) {
        clearTimeout(TK.show);
        tuck(true);
      } else if (TK.acc < -24) showSoon();
    },
    { passive: true },
  );
  // a jump by the browser (Back, Forward, a link to #piece) brings the bars back; jumps made by the site
  // (Contents, Prev / Next, search) do so in jumpTo(). A big leap between scroll events is not used as a
  // sign of a jump: a fast flick on an iPhone also scrolls in big leaps, and the bars popped up mid-page.
  addEventListener("popstate", tuckHold);
  addEventListener("hashchange", tuckHold);
  // a tap on a blank part of the page (not a line, a link, a button or a dhrupad marker) brings the bars back
  document.addEventListener("click", function (e) {
    if (!root.hasAttribute("data-tuck") || !e.target.closest) return;
    if (e.target.closest(".verse p, a, button, input, select, label, .rmk, .rmkpop, #asc, .bar")) return;
    tuck(false);
  });
  tkStrip.addEventListener("click", function () {
    tuck(false);
  });
  document.addEventListener("focusin", function (e) {
    if (e.target.closest && e.target.closest(".bar, #asc")) tuck(false);
  });
  // Both languages, English first (Settings → In Both, show first). Each stanza's English block and each piece
  // title's English part are moved in front of the Marathi, so the page, screen readers, the dhrupad bubble and
  // the printout all read English first; data-lead="en" on the page gives English the reading size (CSS below).
  // Outside Both, or with Marathi first, everything is in its original order.
  setLead("mr");
  // Apply every setting in P to the page
  MQ900 = matchMedia("(min-width: 900px)");
  MQ1000 = matchMedia("(min-width: 1000px)");
  MQ1024 = matchMedia("(min-width: 1024px)");
  // The parts of apply() that read where things are on screen (the current piece for the top bar title,
  // and the menus) wait for the next frame, when the browser lays the page out
  // anyway; reading them straight away cost one extra full-page layout per change.
  tailF = 0;
}

function tuck(on) {
  // never on Home (data-home): its bars stay put. A long Home (the week, a session of eleven texts) scrolled past the
  // tuck point, and the bars hid and came back mid-scroll, which iPhones drew in the middle of the page (Satish,
  // 2026-10-27)
  on = on && !root.hasAttribute("data-rail") && !root.hasAttribute("data-menu") && !root.hasAttribute("data-home");
  if (on === root.hasAttribute("data-tuck")) return;
  if (on) root.setAttribute("data-tuck", "1");
  else root.removeAttribute("data-tuck");
}

// Scrolling brings the bars back only once the page has stopped moving (no scroll for 150 ms, momentum included): an
// iPhone draws a fixed bar made visible mid-scroll where it was before the scroll, in the middle of the page (Satish,
// 2026-10-29; hiding them mid-scroll is safe, so that stays at once)
function showSoon() {
  if (!root.hasAttribute("data-tuck")) return;
  clearTimeout(TK.show);
  TK.show = setTimeout(function () {
    tuck(false);
  }, 150);
}

export function tuckHold() {
  clearTimeout(TK.show);
  TK.hold = Date.now() + 700;
  TK.acc = 0;
  tuck(false);
}

// Highlight the current piece in the Library and in Home's list; update the progress line
export function mark() {
  var c = cur();
  // On the home page (no piece at the top yet): Language and Dhrupad step aside in the top bar, and the bottom bar
  // keeps only Print and Reading (css/10-today.css)
  if (c) root.removeAttribute("data-home");
  else if (!root.hasAttribute("data-home")) root.setAttribute("data-home", "1");
  // Top bar title: the site's name, or once a piece's heading has scrolled under the bar, that piece ("३. देवीची आरती"),
  // in the first reading language shown: English when it is the main one, with both shown too (Satish, 2026-10-30)
  var en = shown()[0] === "en",
    tt = en ? "Nitya Upasana" : SCR.to("नित्य उपासना"),
    bt0 = document.getElementById("bt"),
    hd = c && c.classList.contains("ash") && c.querySelector("header");
  if (hd && hd.getBoundingClientRect().bottom < 64) {
    var no = c.querySelector("h2 .no ." + (en ? "ne" : "nm")),
      nm = c.querySelector("h2 > ." + (en ? "en" : "mr"));
    if (nm) tt = (no ? no.textContent + " " : "") + nm.textContent;
    bt0.classList.add("pc");
  } else bt0.classList.remove("pc");
  var btt = document.getElementById("btt");
  if (btt.textContent !== tt) btt.textContent = tt;
  btt.lang = en ? "en" : SCR.k || "mr";
  // its spoken name starts with what it does and contains the words shown (WCAG 2.5.3)
  var bl = menuWords("bar").home(tt);
  if (bt0.getAttribute("aria-label") !== bl) bt0.setAttribute("aria-label", bl);
  bt0.lang = ui(); // its spoken name is in the menu language, the title in it in its own (btt)
  // the slim strip shown while the bars are tucked away carries the same name and progress line
  var tkt = document.getElementById("tkt");
  if (tkt.textContent !== tt) tkt.textContent = tt;
  tkt.lang = en ? "en" : SCR.k || "mr";
  bt0.setAttribute("data-tl", en ? "en" : "mr");
  [].forEach.call(document.querySelectorAll("#jump a"), function (a) {
    a.classList.toggle("on", !!c && a.getAttribute("data-go") === c.id);
  });
  markNow(c);
  var pg = document.getElementById("prog");
  if (pg) {
    var dh = document.documentElement.scrollHeight - innerHeight;
    pg.style.transform = document.getElementById("tkp").style.transform = "scaleX(" + (dh > 0 ? Math.min(1, Math.max(0, scrollY / dh)) : 0) + ")";
  }
}

export function goHome() {
  setP(false);
  setJ(false);
  window.scrollTo(0, 0);
}

// A line's Marathi and English <p> share a data-l id; return the one currently visible.
function lineEl(id) {
  var l = [].slice.call(document.querySelectorAll('[data-l="' + id + '"]'));
  for (var i = 0; i < l.length; i++) {
    if (l[i].offsetParent !== null) return l[i];
  }
  return l[0] || null;
}

// Scroll to a line (from search) and flash it
export function goLine(id, flash) {
  unfold(document.querySelector('[data-l="' + id + '"]'));
  var el = lineEl(id);
  if (!el) return;
  // A line that is hidden in the current dhrupad mode: go to the start of its piece instead
  if (el.offsetParent === null) {
    var sec = el.closest(".ash");
    if (sec) sec.scrollIntoView();
    return;
  }
  // Upper third of the screen, clear of the top bar and of the phone's toolbar at the bottom
  scrollTo(0, Math.max(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.3));
  if (flash) {
    [].forEach.call(document.querySelectorAll('[data-l="' + id + '"]'), function (p) {
      p.classList.remove("fl");
      void p.offsetWidth;
      p.classList.add("fl");
    });
  }
}

// The language read first: English first only when both are shown and English leads
function leadOf() {
  return P.lang === "both" && P.lead === "en" ? "en" : "mr";
}

function leadSet() {
  var L = leadOf();
  if (L === "en") root.setAttribute("data-lead", "en");
  else root.removeAttribute("data-lead");
  setLead(L);
  // (checked every time: the contents lists are built after the first call)
  leadOrder(document.querySelectorAll(".wrap .verse, .wrap .ash header h2, #jl ol.toc .m, #jl .gh"), L);
}

// Each of els with its two languages in the order L ("en": English first): the page, or a printout's copy of the
// pieces (js/print/compose.js)
export function leadOrder(/** @type {ArrayLike<Element>} */ els, /** @type {string} */ L) {
  [].forEach.call(els, function (/** @type {Element} */ v) {
    var m = v.querySelector(":scope > .mr"),
      e = v.querySelector(":scope > .en");
    if (!m || !e) return;
    var enFirst = !!(e.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (enFirst !== (L === "en")) v.insertBefore(L === "en" ? e : m, L === "en" ? m : e);
  });
}

// A text size the reader chose (pinch, A− A+, Ctrl +), rather than the automatic one: data-fsu on the page. A Vedic chant
// in one language is fitted to a printed page's measure only at the automatic size (css/02-core.css)
export function fsuMark() {
  if (P.fsu) root.setAttribute("data-fsu", "1");
  else root.removeAttribute("data-fsu");
}

function applyTail() {
  tailF = 0;
  if (asc) {
    asLabel();
    asShow();
  }
  mark();
}

/** The menu language the page's words were last filled in */
var filled = "";

export function apply() {
  root.style.setProperty("--fs", P.fs + "px");
  fsuMark();
  if (P.th === "auto") root.removeAttribute("data-pref");
  else root.setAttribute("data-pref", P.th);
  // Text language on the pieces and the printout; menu language on the bar, menus, home page and dialogs
  [].forEach.call(document.querySelectorAll(".wrap > .ash,#pv,#jl"), function (e) {
    e.setAttribute("data-lang", P.lang);
  });
  [].forEach.call(document.querySelectorAll(".bar,#shr,#asc,#none,.libhd,.rch,#jtb,#spv,#panel,#home > *,#qrm,#prm,#inm,#rsh,#szt,#szr,#fl"), function (e) {
    e.setAttribute("data-lang", P.ui);
  });
  // the page's own words (index.html data-w), when the menu language is not the one they show
  if (filled !== P.ui) {
    filled = P.ui;
    fillWords();
  }
  root.lang = SCR.k || "mr"; // the page is Marathi (or Kannada); English parts carry lang="en" themselves (screen readers pick the voice from this)
  [].forEach.call(document.querySelectorAll("#su button"), function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === P.ui));
  });
  if (["std", "classic", "bold"].indexOf(P.fnt) < 0) P.fnt = "classic";
  root.setAttribute("data-font", P.fnt);
  [].forEach.call(document.querySelectorAll("#sfn button"), function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === P.fnt));
  });
  var qi = document.getElementById("q");
  qi.placeholder = menuWords("bar").find;
  qi.setAttribute("aria-label", qi.placeholder);
  root.setAttribute("data-ref", String(P.ref));
  root.setAttribute("data-hc", String(P.hc));
  // (media queries answer without laying the page out; innerWidth would, right after the changes above)
  var wide = MQ900.matches,
    two = wide && (P.cols === 2 || (P.cols !== 1 && MQ1000.matches));
  root.setAttribute("data-cols", two ? "2" : "1");
  if (MQ1024.matches) root.setAttribute("data-rail", "1");
  else root.removeAttribute("data-rail");
  document.getElementById("colrow").hidden = !wide;
  [].forEach.call(document.querySelectorAll("#sc button"), function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === (two ? "2" : "1")));
  });
  leadSet();
  spSet();
  foldSet();
  autoFs();
  root.style.setProperty("--fs", P.fs + "px");
  pullSoon();
  // The Sankashti line (on the day only) is re-drawn only when the menu language, the day or the place changes
  try {
    skLang();
  } catch (e) {}
  // the Today card's words follow the menu language, and its titles the script (Kannada letters)
  todayLang();
  // the Vedic calendar line on Home (and the calendar page when open): menu language, script, day and place
  try {
    calLang();
  } catch (e) {}
  // the Library's "Edit categories" button (menu language) and the categories sheet when open
  try {
    libLang();
  } catch (e) {}
  // the Books tab's "online only" / "saved on this phone" (menu language)
  try {
    pdfLang();
  } catch (e) {}
  [].forEach.call(document.querySelectorAll("#st button"), function (b) {
    b.setAttribute("aria-pressed", b.dataset.v === P.th);
  });
  document.getElementById("tc").setAttribute("aria-pressed", String(!!P.hc));
  // Keep screen on: the minutes chosen, in the menu language's digits
  [].forEach.call(document.querySelectorAll("#tw button"), function (/** @type {HTMLElement} */ b) {
    var v = +b.dataset.v;
    b.setAttribute("aria-pressed", String(v === P.wake));
    if (v) b.textContent = num(v);
  });
  if (!tailF) tailF = requestAnimationFrame(applyTail);
  szSet();
}

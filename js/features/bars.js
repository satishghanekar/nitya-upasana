// Bars tuck away while reading (CSS: "Bars tuck away while reading")
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { LI, RB_LOOP, RB_ONCE, root } from "../core/page.js";
import { shared, P } from "../core/state.js";
import { foldSet, skDot, skRender } from "./date-card.js";
import { autoFs, pullSoon } from "../text/autofit.js";
import { cur, hb, pfSet, pjOpen } from "../core/apply.js";
import { asLabel, asShow, asb, asc } from "./bottom-bar.js";
import { szSet } from "./settings-panel.js";
import { setJ, setP } from "./overlays.js";
import { spSet } from "./languages.js";

export var TK;
var tkStrip, MQ900, MQ1000, MQ1100, tailF;

export function init() {
  // Phones and tablets without the side menu. Scrolling down past the top of the page tucks the top and
  // bottom bars away (data-tuck); scrolling up, the end of the page, a tap on a blank part of the page,
  // a menu opening, keyboard focus in a bar or a jump (Contents, Prev / Next) brings them back.
  // (y starts at 0, the top: the browser restores a reload's scroll position only after start-up, and reading
  // scrollY here, mid start-up, would make it lay the page out early)
  // h: the page height, kept up to date as the page grows or shrinks (folds, fonts, a resize), so the
  // scroll handler below never asks the browser for it, which could make it lay the page out mid-scroll
  TK = { y: 0, acc: 0, hold: 0, h: 0 };
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
      if (y < 80 || y + innerHeight >= (TK.h || document.documentElement.scrollHeight) - 4) return tuck(false);
      // small movements add up, so a slow drag still counts; a change of direction starts again
      TK.acc = (d > 0) === (TK.acc > 0) ? TK.acc + d : d;
      if (TK.acc > 24) tuck(true);
      else if (TK.acc < -24) tuck(false);
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
  // when autoscroll stops, the bars come back, so ▶ (and the rest) is at hand again
  if (window.MutationObserver)
    new MutationObserver(function () {
      if (!asc.classList.contains("on")) tuckHold();
    }).observe(asc, { attributes: true, attributeFilter: ["class"] });
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
  shared.LEAD = "mr";
  // Apply every setting in P to the page
  MQ900 = matchMedia("(min-width: 900px)");
  MQ1000 = matchMedia("(min-width: 1000px)");
  MQ1100 = matchMedia("(min-width: 1100px)");
  // The parts of apply() that read where things are on screen (the current piece for the top bar title,
  // the menus and the autoscroll speed) wait for the next frame, when the browser lays the page out
  // anyway; reading them straight away cost one extra full-page layout per change.
  tailF = 0;
}

function tuck(on) {
  on = on && !root.hasAttribute("data-rail") && !root.hasAttribute("data-menu");
  if (on === root.hasAttribute("data-tuck")) return;
  if (on) root.setAttribute("data-tuck", "1");
  else root.removeAttribute("data-tuck");
}

export function tuckHold() {
  TK.hold = Date.now() + 700;
  TK.acc = 0;
  tuck(false);
}

// Highlight the current piece in the menus; update the progress line
export function mark() {
  var c = cur(),
    ct = c ? c.getBoundingClientRect().top : -1e9;
  // a section row (पूजा / आरती) at the top, below the last piece passed: that section is current, not the piece above it
  [].forEach.call(document.querySelectorAll(".grp"), function (g) {
    var t = g.getBoundingClientRect().top;
    if (g.offsetParent !== null && t <= 90 && t > ct) {
      c = g;
      ct = t;
    }
  });
  // Top bar title: the site's name, or once a piece's heading has scrolled under the bar, that piece ("३. देवीची आरती")
  var en = P.lang === "en",
    tt = en ? "Sankathara Chaturthi" : SCR.to("संकटहर चतुर्थी"),
    bt0 = document.getElementById("bt"),
    hd = c && c.classList.contains("ash") && c.querySelector("header");
  if (hd && hd.getBoundingClientRect().bottom < 64) {
    var no = c.querySelector("h2 .no ." + (en ? "ne" : "nm")),
      nm = c.querySelector("h2 > ." + (en ? "en" : "mr"));
    if (nm) tt = (no ? no.textContent + " " : "") + nm.textContent;
    bt0.classList.add("pc");
  } else bt0.classList.remove("pc");
  if (document.getElementById("btt").textContent !== tt) document.getElementById("btt").textContent = tt;
  // its spoken name starts with what it does and contains the words shown (WCAG 2.5.3)
  var bl = (P.ui === "mr" ? "मुख्य पान: " : "Home: ") + tt;
  if (bt0.getAttribute("aria-label") !== bl) bt0.setAttribute("aria-label", bl);
  // the slim strip shown while the bars are tucked away carries the same name and progress line
  var tkt = document.getElementById("tkt");
  if (tkt.textContent !== tt) tkt.textContent = tt;
  tkt.lang = en ? "en" : SCR.k || "mr";
  bt0.setAttribute("data-tl", en ? "en" : "mr");
  [].forEach.call(document.querySelectorAll("#jump a,#rail a"), function (a) {
    var g = a.getAttribute("data-go"),
      on = c ? g === c.id : g === "home" && !!a.closest("#rail");
    a.classList.toggle("on", on);
    if (on && a.closest("#rail")) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
  var pg = document.getElementById("prog");
  if (pg) {
    var dh = document.documentElement.scrollHeight - innerHeight;
    pg.style.transform = document.getElementById("tkp").style.transform =
      "scaleX(" + (dh > 0 ? Math.min(1, Math.max(0, scrollY / dh)) : 0) + ")";
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
  pjOpen(document.querySelector('[data-l="' + id + '"]'));
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

function leadSet() {
  var L = P.lang === "both" && P.lead === "en" ? "en" : "mr";
  if (L === "en") root.setAttribute("data-lead", "en");
  else root.removeAttribute("data-lead");
  shared.LEAD = L;
  // (checked every time: the contents lists are built after the first call)
  [].forEach.call(document.querySelectorAll(".wrap .verse, .wrap .ash header h2, #home ol.toc .m, #rail ul a, #jl li > a"), function (v) {
    var m = v.querySelector(":scope > .mr"),
      e = v.querySelector(":scope > .en");
    if (!m || !e) return;
    var enFirst = !!(e.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (enFirst !== (L === "en")) v.insertBefore(L === "en" ? e : m, L === "en" ? m : e);
  });
}

function applyTail() {
  tailF = 0;
  if (asb) {
    asLabel();
    asShow();
  }
  mark();
}

export function apply() {
  root.style.setProperty("--fs", P.fs + "px");
  if (P.th === "auto") root.removeAttribute("data-pref");
  else root.setAttribute("data-pref", P.th);
  // Text language on the pieces and the printout; menu language on the bar, menus, home page and dialogs
  // (the Contents fold row #tfr follows the text language, like the पूजा and आरती rows below it)
  [].forEach.call(document.querySelectorAll(".grp,.wrap > .ash,#pv,#home .tocg,#tfr,#jl,#rail"), function (e) {
    e.setAttribute("data-lang", P.lang);
  });
  [].forEach.call(document.querySelectorAll(".bar,#none,#panel,#home > :not(.tocg):not(#tfr),#qrm,#prm,#inm,#rsh,#szt,#szr,#fl"), function (e) {
    e.setAttribute("data-lang", P.ui);
  });
  root.lang = SCR.k || "mr"; // the page is Marathi (or Kannada); English parts carry lang="en" themselves (screen readers pick the voice from this)
  [].forEach.call(document.querySelectorAll("#su button"), function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === P.ui));
  });
  if (["std", "classic", "bold", "hand"].indexOf(P.fnt) < 0) P.fnt = "std";
  root.setAttribute("data-font", P.fnt);
  [].forEach.call(document.querySelectorAll("#sfn button"), function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === P.fnt));
  });
  var qi = document.getElementById("q");
  qi.placeholder = P.ui === "mr" ? "ओळ शोधा (मराठी किंवा इंग्रजी अक्षरे)" : "Find a line (Marathi or English letters)";
  qi.setAttribute("aria-label", P.ui === "mr" ? "ओळ शोधा" : "Find a line");
  root.setAttribute("data-ref", String(P.ref));
  root.setAttribute("data-hc", String(P.hc));
  // (media queries answer without laying the page out; innerWidth would, right after the changes above)
  var wide = MQ900.matches,
    two = wide && (P.cols === 2 || (P.cols !== 1 && MQ1000.matches));
  root.setAttribute("data-cols", two ? "2" : "1");
  if (MQ1100.matches) root.setAttribute("data-rail", "1");
  else root.removeAttribute("data-rail");
  document.getElementById("colrow").hidden = !wide;
  [].forEach.call(document.querySelectorAll("#sc button"), function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === (two ? "2" : "1")));
  });
  // Dhrupad button: icon and label show the current setting
  var rbb = document.getElementById("rb");
  var rOn = !P.ref;
  if (rbb.getAttribute("data-s") !== String(rOn)) {
    rbb.innerHTML = rOn ? RB_LOOP : RB_ONCE;
    rbb.setAttribute("data-s", String(rOn));
  }
  rbb.setAttribute("aria-pressed", String(rOn));
  rbb.setAttribute(
    "aria-label",
    rOn
      ? "Refrain (dhrupad) after every verse. Tap to show it once"
      : "Refrain (dhrupad) shown once. Tap to repeat after every verse",
  );
  leadSet();
  spSet();
  var IN = P.ind === "kn" ? "Kannada" : "Marathi",
    LB = { mr: [LI.mr, IN], en: [LI.en, "English"], both: shared.LEAD === "en" ? [LI.bothEn, "English and " + IN] : [LI.both, IN + " and English"] }[P.lang],
    lk = P.lang + shared.LEAD + SCR.k;
  if (hb.getAttribute("data-l") !== lk) {
    hb.innerHTML = LB[0];
    hb.setAttribute("data-l", lk);
  }
  hb.setAttribute("aria-label", "Language: " + LB[1] + ". Tap to change");
  pfSet();
  autoFs();
  root.style.setProperty("--fs", P.fs + "px");
  pullSoon();
  // The date card is rebuilt only when the menu language or the day changes (rebuilding it on
  // every language switch cost a second page layout on slow phones); otherwise just re-check its wrap
  var sk = P.ui + new Date().toDateString();
  try {
    if (sk !== shared.skKey) {
      shared.skKey = sk;
      skRender();
    } else skDot();
  } catch (e) {}
  foldSet();
  [].forEach.call(document.querySelectorAll("#st button"), function (b) {
    b.setAttribute("aria-pressed", b.dataset.v === P.th);
  });
  document.getElementById("tc").setAttribute("aria-pressed", String(!!P.hc));
  document.getElementById("tw").setAttribute("aria-pressed", String(!!P.wake));
  document.getElementById("tas").setAttribute("aria-pressed", String(!!P.ason));
  if (!tailF) tailF = requestAnimationFrame(applyTail);
  szSet();
}

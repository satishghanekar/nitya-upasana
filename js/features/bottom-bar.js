// Bottom bar (#asc) and autoscroll
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { root, secs } from "../core/page.js";
import { shared, P, save } from "../core/state.js";
import { FEAT_AS } from "../core/features.js";
import { rmkClose, rmkOpen } from "../text/dhrupad-markers.js";
import { cur } from "../core/apply.js";
import { TL, tlLabel, tlStop } from "./tilt.js";
import { apply } from "./bars.js";
import { wake } from "./wake-lock.js";
import { goHomeNav } from "./history.js";

export var asc, asb;
var AS, ASPD;

export function init() {
  // The bottom bar is the footer menu on every page: ‹ Prev, Home, Contents + search, ▶, Next ›.
  // Its parts share the "as" prefix (asc, asv, ash, asq, asb, asn) because it began as the autoscroll bar.
  // ▶ appears only when autoscroll is released (FEAT_AS) and switched on in Settings (P.ason; root data-ason).
  //
  // Autoscroll (held back for a later release, see FEAT_AS): runs through every open section (Pooja, aartis,
  // and any added later). Turning it on folds the home card and the contents, opens every piece, and scrolls
  // line by line: each sung line gets the same time (a little more for long lines), whatever its height.
  // With the dhrupad shown once, each ↻ ध्रुपद marker holds the page while the dhrupad is sung and shows it
  // in the bubble. While running the bar shows Home, Search, speed − / + and ⏸ (CSS: #asc.on).
  // AS: on = running; u = steps from asBuild(); i = current step; t = seconds into it; raf = animation frame;
  // last = previous frame time; y = furthest scroll so far; held / down / ht = paused by the reader's touch;
  // sec = id of the piece whose speed the bar shows.
  AS = { on: 0, u: [], i: 0, t: 0, raf: 0, last: 0, y: 0 };
  asc = document.getElementById("asc");
  asb = document.getElementById("asb");
  ASPD = [0, 7.5, 6.2, 5.2, 4.5, 3.9, 3.4, 3, 2.6, 2.3, 2]; // seconds per line for speeds 1–10
  if (!P.asp || typeof P.asp !== "object") P.asp = {};
  asb.onclick = function () {
    if (AS.on) asStop();
    else asStart();
  };
  document.getElementById("asm").onclick = function () {
    asSpeed(-1);
  };
  document.getElementById("asp").onclick = function () {
    asSpeed(1);
  };
  addEventListener(
    "pointerdown",
    function (e) {
      if (!AS.on && !AS.held) return;
      var t = e.target && e.target.closest ? e.target : document.body;
      if (t.closest("#asc")) return;
      if (t.closest(".bar, #panel, #jump, #help, #qrm, #prm, #inm, #rail")) asStop();
      else {
        AS.down = 1;
        asHold();
      }
    },
    { passive: true, capture: true },
  );
  ["pointerup", "pointercancel", "touchend", "touchcancel"].forEach(function (n) {
    addEventListener(n, function (e) {
      // a drag hands the touch to the browser (pointercancel) while the finger is still down
      if (n === "pointercancel" || (e.touches && e.touches.length)) return;
      AS.down = 0;
      asLetGo(400);
    }, { passive: true, capture: true });
  });
  // the page still gliding after a flick: wait for it to settle
  addEventListener("scroll", function () {
    if (AS.held && !AS.down) asLetGo(400);
  }, { passive: true });
  addEventListener("wheel", function (e) {
    if (!AS.on && !AS.held) return;
    if (e.target && e.target.closest && e.target.closest("#asc")) return;
    asHold();
    asLetGo(700);
  }, { passive: true, capture: true });
  addEventListener("keydown", function (e) {
    if (!AS.on && !AS.held) return;
    if (e.target && e.target.closest && e.target.closest("#asc")) return;
    if (e.key === " " || /^(Arrow|Page|Home|End)/.test(e.key)) {
      asHold();
      asLetGo(700);
    }
  }, { capture: true });
  document.getElementById("asv").onclick = function () {
    asGo(".prev");
  };
  document.getElementById("asn").onclick = function () {
    asGo(".next");
  };
  document.getElementById("ash").onclick = function () {
    asStop();
    goHomeNav();
  };
  document.getElementById("asq").onclick = function () {
    document.getElementById("hm").onclick();
  };
  document.getElementById("tas").onclick = function () {
    P.ason = P.ason ? 0 : 1;
    if (!P.ason) asStop();
    save();
    apply();
  };
  // The bar is always there, like the top bar (data-asb leaves room for it under the text).
  // asShow() keeps ▶ in step with the settings, and Prev / Next with the piece on screen.
  asc.hidden = false;
  root.setAttribute("data-asb", "1");
  // the bar steps aside while Settings (#panel) or Contents (#jump) is open
  (function () {
    var ms = [document.getElementById("panel"), document.getElementById("jump")];
    function menu() {
      if (ms.some(function (m) { return m && !m.hidden; })) root.setAttribute("data-menu", "1");
      else root.removeAttribute("data-menu");
    }
    var mo = new MutationObserver(menu);
    ms.forEach(function (m) {
      if (m) mo.observe(m, { attributes: true, attributeFilter: ["hidden"] });
    });
    menu();
  })();
  addEventListener("scroll", asShow, { passive: true });
}

// speed of a piece: its own if the reader set one, else the general one
function asSpd(id) {
  return P.asp[id] || P.as;
}

// the piece whose speed the − / + buttons change: the one scrolling, else the one on screen
// (c: the piece on screen, when the caller already has it; finding it costs a page layout)
function asSec(c) {
  var a = AS.on && AS.u[AS.i];
  if (a) return a.sec;
  if (c === undefined) c = cur();
  return c ? c.id : "";
}

// the bottom of whatever sits at the top of the screen: the top bar, or the slim strip while it is tucked away
export function topEdge() {
  var bar = document.querySelector(root.hasAttribute("data-tuck") ? "#tuck" : "body > .bar");
  return bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 60;
}

function asSpot() {
  // the reading spot: a third of the way down the screen, below the top bar
  var top = topEdge();
  return top + (innerHeight - top) * 0.3;
}

export function asLabel() {
  var mr = P.ui === "mr",
    l = document.getElementById("asl"),
    c = cur();
  l.lang = mr ? "mr" : "en";
  var v = asSpd(asSec(c));
  l.innerHTML =
    '<span class="asw">' + (mr ? "वेग" : "Speed") + " </span>" +
    (mr
      ? String(v).replace(/\d/g, function (d) {
          return "०१२३४५६७८९"[d];
        })
      : v);
  l.setAttribute("aria-label", (mr ? "वेग " : "Speed ") + v);
  asb.setAttribute("aria-label", AS.on ? (mr ? "स्वयं-स्क्रोल थांबवा" : "Pause autoscroll") : mr ? "आपोआप पुढे सरकवा" : "Autoscroll");
  asb.setAttribute("aria-pressed", String(!!AS.on));
  document.getElementById("asm").setAttribute("aria-label", mr ? "हळू" : "Slower");
  document.getElementById("asp").setAttribute("aria-label", mr ? "जलद" : "Faster");
  [
    ["asv", "‹ मागील", "‹ Prev", ".prev"],
    ["asn", "पुढील ›", "Next ›", ".next"],
  ].forEach(function (x) {
    var b = document.getElementById(x[0]),
      a = c ? c.querySelector(".pn " + x[3]) : x[3] === ".next" && !document.getElementById("p1").hidden ? secs[0] : null,
      t = a && a.querySelector(mr ? ":scope > .mr" : ":scope > .en");
    b.textContent = mr ? x[1] : x[2];
    b.lang = mr ? "mr" : "en";
    b.setAttribute("aria-label", (mr ? x[1] : x[2]).replace(/[‹›]/g, "").trim() + (t ? ": " + t.textContent : ""));
    b.disabled = !a;
  });
  document.getElementById("ash").setAttribute("aria-label", mr ? "मुख्य पान: अनुक्रमणिका" : "Home: contents");
  tlLabel();
  document.getElementById("asq").setAttribute("aria-label", mr ? "अनुक्रमणिका आणि शोध" : "Contents and search");
}

// The steps to scroll through: each open piece's heading, its dhrupad at the top, every sung line in order,
// and a hold at each tappable dhrupad marker. Lines are taken in the main text language only.
function asBuild() {
  var u = [],
    main = P.lang === "en" ? ".en" : ".mr",
    both = P.lang === "both";
  secs.forEach(function (x) {
    if (x.offsetParent === null) return;
    u.push({ el: x.querySelector("header"), w: 1.2, sec: x.id });
    var ls = [].slice.call(x.querySelectorAll(".rftop .verse " + main + " p, .items .verse " + main + " p, .items > .rmk")).filter(function (e) {
      return e.offsetParent !== null || e.getClientRects().length;
    });
    var tot = 0,
      n = 0;
    ls.forEach(function (e) {
      if (e.tagName === "P") {
        tot += e.textContent.length;
        n++;
      }
    });
    var avg = n ? tot / n : 1,
      src = x.querySelector(".rftop .verse " + main),
      dl = src ? src.querySelectorAll("p").length : 0;
    // Marathi + English: the page moves through each whole stanza (both languages, whatever the layout)
    // in the time its Marathi lines take, so the stanza in view is always the one being sung
    var lw = function (e) {
        return Math.max(0.75, Math.min(1.4, e.textContent.length / avg));
      },
      lastV = null;
    ls.forEach(function (e) {
      if (both && e.tagName === "P") {
        var v = e.closest(".verse");
        if (v === lastV) u[u.length - 1].w += lw(e);
        else u.push({ el: v, w: lw(e), sec: x.id });
        lastV = v;
        return;
      }
      lastV = null;
      if (e.tagName === "P") u.push({ el: e, w: lw(e), sec: x.id });
      else if (e.classList.contains("rmkt") && dl) u.push({ el: e, w: dl, hold: 1, sec: x.id });
    });
  });
  return u;
}

function asY(e) {
  return e.getBoundingClientRect().top + scrollY;
}

// Start from the line at the reading spot
function asStartAt() {
  var spot = scrollY + asSpot(),
    k = 0;
  for (var j = 0; j < AS.u.length; j++) {
    if (asY(AS.u[j].el) <= spot + 4) k = j;
    else break;
  }
  return k;
}

function asStep(now) {
  if (!AS.on) return;
  var dt = Math.min(0.1, (now - (AS.last || now)) / 1000);
  AS.last = now;
  var u = AS.u,
    a = u[AS.i],
    b = u[AS.i + 1];
  if (!a || !b) return asStop(true);
  var T = ASPD[asSpd(a.sec)] * a.w;
  AS.t += dt;
  // a new piece: show its own speed
  if (a.sec !== AS.sec) {
    AS.sec = a.sec;
    asLabel();
  }
  if (a.hold && !a.shown) {
    a.shown = 1;
    if (!shared.rmkPop || shared.rmkPop.m !== a.el) rmkOpen(a.el);
    if (shared.rmkPop) {
      clearTimeout(rmkClose.t);
      rmkClose.t = setTimeout(rmkClose, T * 1000 + 600);
      var h = document.createElement("div");
      h.className = "ash-h";
      h.lang = P.ui === "mr" ? "mr" : "en";
      h.textContent = P.ui === "mr" ? "ध्रुपद म्हणा, मग पुढे" : "Sing the dhrupad, then on";
      shared.rmkPop.el.appendChild(h);
    }
  }
  // a hold keeps the page still while the dhrupad is sung, then moves on
  var f = a.hold ? Math.max(0, (AS.t - T * 0.85) / (T * 0.15)) : AS.t / T,
    ya = asY(a.el),
    yb = asY(b.el),
    want = ya + (yb - ya) * Math.min(1, f) - asSpot();
  // never scroll back up (two-column layouts list stanzas side by side)
  want = Math.max(want, AS.y);
  var max = document.documentElement.scrollHeight - innerHeight;
  if (want > max) want = max;
  AS.y = want;
  if (Math.abs(want - scrollY) >= 0.5) scrollTo(0, want);
  if (AS.t >= T) {
    AS.t = 0;
    AS.i++;
    if (AS.i >= u.length - 1 || (want >= max - 1 && yb - asSpot() > max)) return asStop(true);
  }
  AS.raf = requestAnimationFrame(asStep);
}

function asStart() {
  if (!FEAT_AS) return;
  if (TL.on) tlStop();
  // keep the piece in view where it is while the rest folds away
  var c0 = cur(),
    t0 = c0 && c0.getBoundingClientRect().top;
  // fold the home card and contents, open every piece; a folded section (Pooja / Aarti) stays folded and is skipped,
  // unless every section is folded, then all open again
  P.fold = 1;
  P.tf = 1;
  if (P.pf && P.xf) P.pf = P.xf = 0;
  P.af = [];
  save();
  apply();
  if (c0 && c0.offsetParent !== null) scrollBy(0, c0.getBoundingClientRect().top - t0);
  asRun();
}

// Start (or carry on) scrolling from the line in view (from the home page: the first open piece)
function asRun() {
  AS.u = asBuild();
  if (AS.u.length < 2) return;
  var c = cur();
  if (!c) {
    var a1 = AS.u[0].el;
    scrollTo(0, asY(a1) - asSpot());
    AS.i = 0;
  } else AS.i = asStartAt();
  AS.y = scrollY;
  AS.t = 0;
  AS.last = 0;
  AS.u.forEach(function (x) {
    x.shown = 0;
  });
  // Carrying on mid-piece: skip a dhrupad hold just passed, and start from where the page is now, not a line back
  var a = AS.u[AS.i],
    b = AS.u[AS.i + 1];
  if (a && a.hold && b) {
    AS.i++;
    a = b;
    b = AS.u[AS.i + 1];
  }
  if (a && b && !a.hold) {
    var ya = asY(a.el),
      yb = asY(b.el),
      f = yb > ya ? (scrollY + asSpot() - ya) / (yb - ya) : 0;
    AS.t = ASPD[asSpd(a.sec)] * a.w * Math.max(0, Math.min(0.95, f));
  }
  AS.on = 1;
  asc.classList.add("on");
  asLabel();
  if (!shared.wl) wake(true);
  AS.raf = requestAnimationFrame(asStep);
}

export function asStop() {
  if (AS.held) {
    AS.held = 0;
    AS.down = 0;
    clearTimeout(AS.ht);
    AS.on = 1;
  }
  if (!AS.on) return;
  AS.on = 0;
  cancelAnimationFrame(AS.raf);
  asc.classList.remove("on");
  asLabel();
  if (!P.wake) wake(false);
}

// − / + set the speed of the piece being sung; it is remembered for that piece only
function asSpeed(d) {
  var id = asSec(),
    o = asSpd(id),
    v = Math.max(1, Math.min(10, o + d));
  if (v === o || !id) return;
  // keep the same point in the current line
  if (AS.on && AS.u[AS.i]) AS.t *= ASPD[v] / ASPD[o];
  P.asp[id] = v;
  save();
  asLabel();
}

// The reader takes over: touching, wheeling or keys outside the controls pause it.
// Scrolling by hand doesn't stop it: while a finger is on the text (or the wheel turns) it lets go of the page,
// and once the page settles it carries on from the line in view. Holding a finger still pauses it the same way.
// A tap on the top bar or a menu stops it (▶ starts again).
function asHold() {
  if (!AS.on && !AS.held) return;
  if (AS.on) {
    AS.on = 0;
    cancelAnimationFrame(AS.raf);
  }
  AS.held = 1;
  clearTimeout(AS.ht);
}

function asLetGo(ms) {
  if (!AS.held) return;
  clearTimeout(AS.ht);
  AS.ht = setTimeout(function () {
    if (!AS.held || AS.down) return;
    AS.held = 0;
    asRun();
  }, ms);
}

// Previous / Next follow the links in each piece's .pn block (kept in the page but never shown on screen,
// the bar replaced it); Home and Search work as in the top bar
function asGo(sel) {
  var c = cur(),
    a = c && c.querySelector(".pn " + sel);
  if (a) a.click();
  else if (!c && sel === ".next") {
    // from the home page: the first piece (the Pooja, or Aarti 1 when the Pooja is folded)
    var f = document.querySelector('#home a[data-go="' + (P.pf ? "a1" : "p1") + '"]');
    if (f) f.click();
  }
}

export function asShow() {
  var c = cur(),
    id = c ? c.id : "";
  if (FEAT_AS && P.ason) root.setAttribute("data-ason", "1");
  else root.removeAttribute("data-ason");
  if (id !== asShow.id) {
    asShow.id = id;
    asLabel();
  }
}

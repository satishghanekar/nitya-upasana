// Tilt to scroll (bottom bar, phones and tablets)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { flash, root } from "../core/page.js";
import { shared, P } from "../core/state.js";
import { FEAT_TL } from "../core/features.js";
import { asStop, asc } from "./bottom-bar.js";
import { wake } from "./wake-lock.js";

export var TL;
var tlb, tlDot;

export function init() {
  // (the first asLabel() and asShow() run from apply() at start-up, in the frame after it)

  // Tap the tilt button holding the phone however is comfortable: that angle is "still". Leaning the top of the
  // screen away scrolls down, leaning it back towards you scrolls up, faster the further it leans (4° either way
  // does nothing). A finger on the page holds it; letting go makes the new angle "still". ⏸ stops it.
  // The angle is the screen's own (portrait or sideways), from the phone's motion sensor; nothing leaves the phone.
  // iPhones ask "Allow motion access?" the first time (requestPermission must run inside the tap).
  // TL: on = running; p = smoothed angle; base = the "still" angle; got = the sensor has answered;
  // held = finger on the page; ht = timer to carry on; raf / last = animation frame; acc = part-pixel left over.
  TL = { on: 0, p: null, base: null, got: 0, held: 0, ht: 0, raf: 0, last: 0, acc: 0, d: 0 };
  tlb = document.getElementById("tlb");
  tlDot = document.querySelector("#tlm i");
  if (FEAT_TL && "DeviceOrientationEvent" in window && window.matchMedia && matchMedia("(pointer: coarse)").matches) root.setAttribute("data-tilt", "1");
  tlb.onclick = function () {
    if (!FEAT_TL) return;
    // eslint-disable-next-line compat/compat -- checked for before use (tilt only shows where it exists)
    var D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === "function")
      D.requestPermission()
        .then(function (s) {
          if (s === "granted") tlStart();
          else flash("सेटिंग्जमध्ये Motion access ला परवानगी द्या", "Motion access was not allowed");
        })
        .catch(function () {
          flash("हा फोन झुकणे ओळखत नाही", "Tilt isn't available on this device");
        });
    else tlStart();
  };
  document.getElementById("tlx").onclick = tlStop;
  // a finger on the page holds it; once lifted (and the page has settled) the angle then is the new "still"
  addEventListener(
    "pointerdown",
    function (e) {
      if (!TL.on) return;
      var t = e.target && e.target.closest ? e.target : document.body;
      if (t.closest("#asc")) return;
      if (t.closest(".bar, #panel, #jump, #help, #qrm, #prm, #inm, #rail, #pzv")) return tlStop();
      TL.held = 1;
      clearTimeout(TL.ht);
    },
    { passive: true, capture: true },
  );
  ["pointerup", "touchend", "touchcancel"].forEach(function (n) {
    addEventListener(
      n,
      function (e) {
        if (!TL.held || (e.touches && e.touches.length)) return;
        clearTimeout(TL.ht);
        TL.ht = setTimeout(function () {
          TL.base = TL.p;
          TL.acc = 0;
          TL.held = 0;
        }, 400);
      },
      { passive: true, capture: true },
    );
  });
  // turning the phone round, or switching away, starts afresh
  addEventListener("orientationchange", function () {
    TL.p = TL.base = null;
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") tlStop();
  });
  tlLabel();
}

export function tlLabel() {
  var mr = P.ui === "mr",
    s = document.getElementById("tls");
  s.lang = mr ? "mr" : "en";
  document.getElementById("tll").textContent = mr ? "झुकवून सरकवा" : "Tilt to scroll";
  document.getElementById("tlh").textContent = mr ? "दूर झुकवा = खाली · जवळ = वर" : "lean away = down · toward = up";
  document.getElementById("tlx").setAttribute("aria-label", mr ? "झुकवून सरकवणे थांबवा" : "Stop tilt to scroll");
  // (also called from asLabel, before TL is set up)
  var b = document.getElementById("tlb");
  b.setAttribute("aria-label", mr ? "झुकवून सरकवा" : "Tilt to scroll");
  b.setAttribute("aria-pressed", String(!!(TL && TL.on)));
}

// the screen's angle from flat (0) to upright (90), whichever way round the phone is held
function tlPitch(e) {
  if (e.beta == null) return null;
  var r = Math.PI / 180,
    b = e.beta * r,
    g = (e.gamma || 0) * r,
    // eslint-disable-next-line compat/compat -- checked first; old iOS has window.orientation instead
    o = typeof window.orientation === "number" ? window.orientation : (screen.orientation && screen.orientation.angle) || 0,
    a = (((o % 360) + 360) % 360) * r,
    // which way is up, seen from the phone (x right, y top, z out of the screen)
    ux = -Math.sin(g) * Math.cos(b),
    uy = Math.sin(b),
    uz = Math.cos(g) * Math.cos(b);
  return Math.atan2(ux * Math.sin(a) + uy * Math.cos(a), uz) / r;
}

function tlRead(e) {
  var p = tlPitch(e);
  if (p == null || isNaN(p)) return;
  TL.got = 1;
  TL.p = TL.p == null ? p : TL.p + 0.25 * (p - TL.p);
  if (TL.base == null) TL.base = TL.p;
}

function tlStep(now) {
  if (!TL.on) return;
  var dt = Math.min(0.1, (now - (TL.last || now)) / 1000);
  TL.last = now;
  var d = TL.base == null || TL.p == null || TL.held ? 0 : TL.base - TL.p;
  // the dot: lower when leaning away (the page goes down), higher when leaning back
  var k = Math.round(Math.max(-10, Math.min(10, d / 2)));
  if (k !== TL.d) {
    TL.d = k;
    tlDot.style.transform = "translateY(" + k + "px)";
  }
  var m = Math.abs(d) - 4;
  if (m > 0) {
    TL.acc += (d > 0 ? 1 : -1) * Math.min(900, 2.5 * Math.pow(m, 1.7)) * dt;
    var n = TL.acc > 0 ? Math.floor(TL.acc) : Math.ceil(TL.acc);
    if (n) {
      TL.acc -= n;
      scrollBy(0, n);
    }
  } else TL.acc = 0;
  TL.raf = requestAnimationFrame(tlStep);
}

function tlStart() {
  if (TL.on) return;
  asStop();
  TL.on = 1;
  TL.p = TL.base = null;
  TL.got = TL.held = 0;
  TL.acc = TL.last = 0;
  addEventListener("deviceorientation", tlRead);
  asc.classList.add("tl");
  tlLabel();
  if (!shared.wl) wake(true);
  TL.raf = requestAnimationFrame(tlStep);
  // some phones and tablets have no motion sensor, or the browser keeps it from the page
  setTimeout(function () {
    if (TL.on && !TL.got) {
      tlStop();
      flash("हा फोन झुकणे ओळखत नाही", "Tilt isn't available on this device");
    }
  }, 1500);
}

export function tlStop() {
  if (!TL.on) return;
  TL.on = 0;
  clearTimeout(TL.ht);
  cancelAnimationFrame(TL.raf);
  removeEventListener("deviceorientation", tlRead);
  asc.classList.remove("tl");
  tlLabel();
  if (!P.wake) wake(false);
  tlb.focus({ preventScroll: true });
}

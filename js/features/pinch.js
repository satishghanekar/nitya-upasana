// Pinch with two fingers to change the text size (the page itself never zooms)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { root } from "../core/page.js";
import { shared, P, dfs, save } from "../core/state.js";
import { pn } from "../core/apply.js";
import { apply } from "./bars.js";
import { fsTap, szSet } from "./settings-panel.js";
import { setJ, setP } from "./overlays.js";

var pz, szTm, szrTm, szaT, szt, szr, pzF, wz, wzT;
// Where a pinch does nothing (neither resizes the text nor zooms): the home card
var NO_PINCH = "#home .top";

export function init() {
  pz = null;
  szTm = 0;
  szrTm = 0;
  szaT = 0;
  szt = document.getElementById("szt");
  szr = document.getElementById("szr");
  szr.onclick = function () {
    szr.hidden = true;
    P.fsu = 0;
    P.fs = dfs();
    apply();
    save();
    showSz();
  };
  // Pinch changes the text size, never the page zoom. The two-finger touch is cancelled as soon as it
  // starts (not only when the fingers move), so Safari can't begin its own zoom first; the size is
  // applied once per frame, so the page keeps up with the fingers; and if the page still ends up
  // zoomed (a pinch that began mid-scroll can't be cancelled), it is put back to normal straight away.
  pzF = 0;
  // The page never zooms anywhere (decided 2026-10-16): a page that zooms on some parts and not others looks
  // broken on a phone. On the home card a pinch does nothing at all, since the card has no verses to resize.
  document.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length === 2 && document.getElementById("pzv").hidden) {
        if (e.cancelable) e.preventDefault();
        if (e.target.closest && e.target.closest(NO_PINCH)) {
          pz = null;
          return;
        }
        szr.hidden = true;
        pz = { d: dist(e) || 1, fs: P.fs };
      }
    },
    { passive: false },
  );
  document.addEventListener(
    "touchmove",
    function (e) {
      // a two-finger move that is not resizing the text (it began on the home card) is stopped too
      if (!pz && e.touches.length === 2 && e.cancelable && document.getElementById("pzv").hidden) e.preventDefault();
      if (pz && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        var v = Math.max(14, Math.min(52, Math.round((pz.fs * dist(e)) / pz.d)));
        // on the Settings page only the page and its preview follow the fingers; the reading view catches up after
        if (!pn.hidden) {
          if (v !== P.fs) fsTap(v, 1);
          return;
        }
        if (v !== P.fs) {
          P.fs = v;
          P.fsu = 1;
          if (!pzF)
            pzF = requestAnimationFrame(function () {
              pzF = 0;
              root.style.setProperty("--fs", P.fs + "px");
            });
        }
        showSz();
      }
    },
    { passive: false },
  );
  document.addEventListener(
    "touchend",
    function (e) {
      if (e.touches.length < 2) unzoom();
      if (pz && e.touches.length < 2) {
        pz = null;
        save();
        szSet();
        // Offer a one-tap way back to the default size for a few seconds (Settings has its own reset)
        if (P.fs !== (shared.FSA || dfs()) && pn.hidden) {
          clearTimeout(szTm);
          szTm = setTimeout(function () {
            szt.classList.remove("on");
            szr.hidden = false;
            inView(szr);
            clearTimeout(szrTm);
            szrTm = setTimeout(function () {
              szr.hidden = true;
            }, 4000);
          }, 700);
        }
      }
    },
    { passive: true },
  );
  // Safari's own gesture events: always stopped (pinch resizes the text)
  addEventListener("gestureend", unzoom);
  ["gesturestart", "gesturechange"].forEach(function (n) {
    document.addEventListener(
      n,
      function (e) {
        e.preventDefault();
      },
      { passive: false },
    );
  });
  // Keep the size bubble and the Default size button where the reader can see them while either is up
  if (window.visualViewport)
    ["scroll", "resize"].forEach(function (n) {
      visualViewport.addEventListener(n, function () {
        if (szt.classList.contains("on")) inView(szt);
        if (!szr.hidden) inView(szr);
      });
    });
  wz = 0;
  wzT = 0;
  addEventListener(
    "wheel",
    function (e) {
      if (!e.ctrlKey || !document.getElementById("pzv").hidden) return;
      e.preventDefault();
      wz = (wz || P.fs) * Math.exp(-e.deltaY * 0.01);
      clearTimeout(wzT);
      wzT = setTimeout(function () {
        wz = 0;
      }, 400);
      var v = Math.round(wz);
      if (v !== P.fs) deskSz(v, 1);
    },
    { passive: false },
  );
  document.addEventListener("keydown", function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || !document.getElementById("pzv").hidden) return;
    var k = e.key;
    if (k === "+" || k === "=") deskSz(P.fs + 2, 1);
    else if (k === "-" || k === "_") deskSz(P.fs - 2, 1);
    else if (k === "0") deskSz(0, 0);
    else return;
    e.preventDefault();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      setP(false);
      setJ(false);
    }
  });
}

function dist(e) {
  var a = e.touches[0],
    b = e.touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function showSz() {
  var m = (P.ui === "mr" ? "अक्षरांचा आकार " : "Text size ") + Math.round((P.fs / (shared.FSA || dfs())) * 100) + "%";
  szt.textContent = m;
  // The bubble changes with every move of the fingers, so screen readers don't read it;
  // the size is announced once, when the fingers (or the wheel) stop
  clearTimeout(szaT);
  szaT = setTimeout(function () {
    document.getElementById("sza").textContent = m;
  }, 700);
  inView(szt);
  szt.classList.add("on");
  clearTimeout(szTm);
  szTm = setTimeout(function () {
    szt.classList.remove("on");
  }, 900);
}

// The bubble and the button are fixed near the top of the screen. On iPhones, "fixed" follows the layout
// viewport, which can differ from what is on screen (at the bottom of the page as the toolbar collapses, or
// while a pinch the browser could not stop has the page zoomed), so they could end up out of view or out of
// reach. They are placed in the visible part of the page instead (the same place when the two agree).
// The distance from the top comes from the CSS (below the top bar, and below the notch on iPhones).
function inView(el) {
  var vv = window.visualViewport;
  el.style.top = el.style.left = "";
  if (!vv || (vv.scale === 1 && !vv.offsetTop && !vv.offsetLeft)) return;
  var t = parseFloat(getComputedStyle(el).top) || 84;
  el.style.top = Math.round(vv.offsetTop + t / vv.scale) + "px";
  el.style.left = Math.round(vv.offsetLeft + vv.width / 2) + "px";
}

function unzoom() {
  var vv = window.visualViewport,
    vm = document.querySelector('meta[name="viewport"]');
  if (!vv || !vm || vv.scale < 1.01) return;
  var c = vm.getAttribute("content");
  vm.setAttribute("content", c + ",maximum-scale=1");
  setTimeout(function () {
    vm.setAttribute("content", c);
  }, 300);
}

// On a computer: Ctrl/⌘ + and −, Ctrl/⌘ 0 and a trackpad pinch (which the browser sends as Ctrl + wheel) change
// the text size the same way a pinch does on a phone, instead of zooming the whole page
function deskSz(v, fsu) {
  v = Math.max(14, Math.min(52, v));
  if (!pn.hidden) return fsTap(v, fsu);
  P.fsu = fsu;
  if (fsu) {
    P.fs = v;
    if (!pzF)
      pzF = requestAnimationFrame(function () {
        pzF = 0;
        root.style.setProperty("--fs", P.fs + "px");
      });
  } else {
    P.fs = dfs();
    apply();
  }
  save();
  szSet();
  showSz();
}

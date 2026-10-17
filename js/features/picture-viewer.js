// Full-screen picture (#pzv): pinch or double-tap to zoom (1x to 5x), drag to move
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { P } from "../core/state.js";
import { ovDone, ovPush } from "./history.js";

export function init() {
  // Works with fingers and a mouse (scroll wheel zooms). The text-size pinch is off while it is open.
  (function () {
    var v = document.getElementById("pzv"),
      im = document.getElementById("pzi"),
      ib = document.getElementById("iconb"),
      hint = document.getElementById("pzh");
    if (!v || !im || !ib) return;
    var s = 1,
      tx = 0,
      ty = 0,
      pts = {},
      g = null,
      lastTap = 0,
      moved = false;
    function draw() {
      // keep the picture from being dragged out of view
      var w = im.offsetWidth,
        h = im.offsetHeight,
        mx = Math.max(0, ((s - 1) * w) / 2 + 40),
        my = Math.max(0, ((s - 1) * h) / 2 + 40);
      if (s <= 1.01) {
        s = 1;
        tx = ty = 0;
      }
      tx = Math.max(-mx, Math.min(mx, tx));
      ty = Math.max(-my, Math.min(my, ty));
      im.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
      v.classList.toggle("zoomed", s > 1);
    }
    // zoom to scale ns, keeping the screen point (px, py) still
    function zoomAt(ns, px, py) {
      ns = Math.max(1, Math.min(5, ns));
      var r = v.getBoundingClientRect(),
        cx = r.left + r.width / 2 + tx,
        cy = r.top + r.height / 2 + ty;
      tx += (px - cx) * (1 - ns / s);
      ty += (py - cy) * (1 - ns / s);
      s = ns;
      draw();
    }
    function open() {
      // the full-size picture (140 KB) is fetched on the first open, not with the page (the service worker
      // still keeps a copy for offline use); the small card picture shows until it arrives
      if (!im.getAttribute("src")) im.src = im.getAttribute("data-src");
      ovPush();
      s = 1;
      tx = ty = 0;
      draw();
      hint.textContent = P.ui === "mr" ? "मोठे करण्यासाठी दोन बोटांनी पसरा किंवा दोनदा टॅप करा" : "Pinch or double-tap to zoom";
      v.hidden = false;
      document.documentElement.style.overflow = "hidden";
      document.getElementById("pzx").focus();
    }
    function close(fromPop) {
      if (v.hidden) return;
      v.hidden = true;
      document.documentElement.style.overflow = "";
      if (!fromPop) ovDone();
      try {
        ib.focus({ preventScroll: true });
      } catch (e) {}
    }
    ib.addEventListener("click", function (e) {
      e.stopPropagation();
      open();
    });
    document.getElementById("pzx").onclick = function () {
      close();
    };
    addEventListener("popstate", function () {
      close(true);
    });
    document.addEventListener("keydown", function (e) {
      if (v.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "+" || e.key === "=") zoomAt(s * 1.5, innerWidth / 2, innerHeight / 2);
      if (e.key === "-") zoomAt(s / 1.5, innerWidth / 2, innerHeight / 2);
    });
    v.addEventListener("pointerdown", function (e) {
      if (e.target.closest("#pzx")) return;
      try {
        v.setPointerCapture(e.pointerId);
      } catch (x) {}
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var k = Object.keys(pts);
      if (k.length === 1) {
        moved = false;
        g = { x: e.clientX, y: e.clientY, tx: tx, ty: ty };
      } else if (k.length === 2) {
        var a = pts[k[0]],
          b = pts[k[1]];
        g = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        moved = true;
      }
    });
    v.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId] || !g) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var k = Object.keys(pts);
      if (k.length >= 2 && g.d) {
        var a = pts[k[0]],
          b = pts[k[1]];
        zoomAt((g.s * Math.hypot(a.x - b.x, a.y - b.y)) / g.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
      } else if (k.length === 1 && g.tx !== undefined) {
        var dx = e.clientX - g.x,
          dy = e.clientY - g.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
        if (s > 1) {
          tx = g.tx + dx;
          ty = g.ty + dy;
          draw();
        }
      }
    });
    function up(e) {
      if (!pts[e.pointerId]) return;
      delete pts[e.pointerId];
      var k = Object.keys(pts);
      if (k.length === 1) {
        // one finger lifted from a pinch: carry on dragging with the other
        var p = pts[k[0]];
        g = { x: p.x, y: p.y, tx: tx, ty: ty };
        return;
      }
      if (k.length) return;
      g = null;
      if (moved || e.type === "pointercancel") return;
      var now = Date.now();
      if (now - lastTap < 320) {
        // double tap: zoom in where tapped, or back out
        lastTap = 0;
        if (s > 1) {
          s = 1;
          draw();
        } else zoomAt(2.5, e.clientX, e.clientY);
        return;
      }
      lastTap = now;
      // a single tap outside the picture closes it (after the double-tap wait)
      if (e.target !== im && s === 1)
        setTimeout(function () {
          if (lastTap === now) close();
        }, 330);
    }
    v.addEventListener("pointerup", up);
    v.addEventListener("pointercancel", up);
    v.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        zoomAt(s * Math.exp(-e.deltaY / 300), e.clientX, e.clientY);
      },
      { passive: false },
    );
    addEventListener("resize", function () {
      if (!v.hidden) draw();
    });
  })();
}

// Stage 4 mockup: one text at a time on the phone. Injected over the real app by mockups/shoot-reading.mjs.
// Not app code. Titles are read from the page, never retyped.
(function () {
  var NEXT = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  var PREV = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  var TICK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var HOME = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>';

  function title(id, bare) {
    var s = document.getElementById(id);
    if (!s) return "";
    var h = s.querySelector("h2");
    return (!bare && h.querySelector(".nm") ? h.querySelector(".nm").textContent + " " : "") + h.querySelector(".mr").textContent;
  }
  function btn(cls, icon, label, t, iconAfter) {
    return '<button type="button" class="' + cls + '">' + (iconAfter ? "" : icon) + '<span class="mkt"><small>' + label + "</small>" + t + "</span>" + (iconAfter ? icon : "") + "</button>";
  }

  // mode "library": prev/next in the Library's order (the piece's own links); mode "session": the session's texts
  window.mockRead = function (sec, mode) {
    var cur = document.getElementById(sec);
    document.documentElement.setAttribute("data-mock1", "");
    document.querySelectorAll(".mockcur").forEach(function (e) { e.classList.remove("mockcur"); });
    cur.classList.add("mockcur");
    var old = cur.querySelector(".mkend");
    if (old) old.remove();
    var h = "";
    if (mode === "session") {
      var ids = [].map.call(document.querySelectorAll("section.inrun"), function (s) { return s.id; });
      var i = ids.indexOf(sec),
        n = ids.length;
      h += '<div class="mkpips">' + ids.map(function (_, k) { return '<i class="' + (k < i ? "d" : k === i ? "c" : "") + '"></i>'; }).join("") + "</div>";
      h += '<div class="mkpos">Evening session · <b>' + (i + 1) + " of " + n + "</b></div>";
      if (i < n - 1) h += btn("mknext", TICK, "Done · next", title(ids[i + 1], true), false);
      else h += btn("mknext", HOME, "Done · the evening session is complete", "Back to Home", false);
      if (i > 0) h += btn("", PREV, "Previous", title(ids[i - 1], true), false);
    } else {
      var nx = cur.querySelector(".pn a.next"),
        pv = cur.querySelector(".pn a.prev");
      if (nx) h += btn("mknext", NEXT, "Next", title(nx.dataset.go), true);
      if (pv) h += btn("", PREV, "Previous", title(pv.dataset.go), false);
    }
    var d = document.createElement("div");
    d.className = "mkend";
    d.innerHTML = h;
    cur.appendChild(d);
    if (!document.querySelector(".mkbadge")) {
      var b = document.createElement("span");
      b.className = "mkbadge";
      b.textContent = "Mockup · stage 4";
      document.body.appendChild(b);
    }
  };
})();

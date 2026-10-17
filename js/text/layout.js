// Layout helpers that run once
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

export function init() {
  [].forEach.call(document.querySelectorAll(".items"), function (b) {
    var row = 1,
      pair = [],
      lone = false,
      cur = null;
    function flush() {
      if (!pair.length) return;
      var h = 0;
      pair.forEach(function (g, i) {
        g.forEach(function (e, k) {
          e.style.gridRow = String(row + k);
          e.style.gridColumn = lone ? "1 / -1" : String(i + 1);
          if (i) e.classList.add("c2");
          else if (!lone) e.classList.add("c1");
        });
        h = Math.max(h, g.length);
      });
      row += h;
      pair = [];
      lone = false;
    }
    function full(e) {
      flush();
      e.style.gridRow = String(row++);
      e.style.gridColumn = "1 / -1";
    }
    [].forEach.call(b.children, function (e) {
      var main = e.classList.contains("item") && !e.classList.contains("rf");
      if (main && e.classList.contains("dh")) {
        cur = null;
        full(e);
        return;
      }
      if (main) {
        if (pair.length === 2) flush();
        if (pair.length === 1) {
          var a = nLines(pair[0][0]),
            c = nLines(e);
          if (Math.abs(a - c) > 1 && Math.min(a, c) * 2 < Math.max(a, c)) {
            lone = true;
            flush();
          }
        }
        cur = [e];
        pair.push(cur);
        return;
      }
      if (cur) cur.push(e);
      else full(e);
    });
    flush();
  });
  // Desktop + Both: each Marathi line sits beside its English line (rows matched by position)
  [].forEach.call(document.querySelectorAll(".verse"), function (v) {
    [".mr", ".en"].forEach(function (c) {
      var b = v.querySelector(":scope>" + c);
      if (b)
        [].forEach.call(b.children, function (p, i) {
          if (p.tagName === "P") p.style.gridRow = String(i + 1);
        });
    });
  });
  // Contents rail (wide screens), built from the home contents
  (function () {
    var r = document.getElementById("rail");
    if (!r) return;
    var h = "";
    [].forEach.call(document.querySelectorAll(".tocg"), function (g) {
      var as = g.querySelectorAll("ol.toc li a");
      if (!as.length) return;
      // the group name is a link to its section row (पूजा → Pooja, आरती → Aarti)
      var gh = g.querySelector(".gh"),
        gid = /पूजा/.test(gh.textContent) ? "g-pooja" : /आरती/.test(gh.textContent) ? "g-aarti" : "";
      h += gid
        ? '<a class="rg" href="#' + gid + '" data-go="' + gid + '">' + gh.innerHTML + "</a><ul>"
        : '<div class="rg">' + gh.innerHTML + "</div><ul>";
      [].forEach.call(as, function (a) {
        var m = a.querySelector(".m");
        h +=
          '<li><a href="' +
          a.getAttribute("href") +
          '" data-go="' +
          a.getAttribute("data-go") +
          '">' +
          (m ? m.innerHTML : a.innerHTML) +
          "</a></li>";
      });
      h += "</ul>";
    });
    r.innerHTML =
      '<a class="rhome" href="#home" data-go="home"><svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M8.6 5.5c.5-1.9 1.8-3.1 3.4-3.7 1.6.6 2.9 1.8 3.4 3.7\"/><path d=\"M8.4 5.6h7.2\"/><path d=\"M8.4 5.6c-.4 3.6.6 6.3 2.4 7.4.1 3.3 0 6.3 1.9 7.6 1.6 1 3.5 0 3.2-1.8-.2-1-1.3-1.3-1.8-.6\"/><path d=\"M15.6 5.6c.4 3.6-.6 6.2-2.6 7.2\"/><path d=\"M8.4 5.6C5.6 4.5 2.4 6 2.8 9.6c.3 2.6 2.4 3.7 4.8 3\"/><path d=\"M15.6 5.6c2.8-1.1 6 .4 5.6 4-.3 2.6-2.4 3.7-4.8 3\"/><path d=\"M12 7v1.8\"/><path d=\"M9.3 13.6l-.9 1.6\"/></svg><span class="mr">' + SCR.to("मुखपृष्ठ") + '</span><span class="en" lang="en">Home</span></a>' +
      h;
  })();
  // Gentle fade-in for verses that scroll into view (never for content already on screen; skipped if the device asks for less motion)
  (function () {
    if (
      !("IntersectionObserver" in window) ||
      (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)
    )
      return;
    var ready = false;
    var io = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          if (!ready) return;
          var t = e.target;
          t.classList.add("fx-in");
          setTimeout(function () {
            t.classList.remove("fx-in");
          }, 700);
        });
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    [].forEach.call(document.querySelectorAll(".ash header,.ash .item,.rftop,.fin"), function (x) {
      io.observe(x);
    });
    setTimeout(function () {
      ready = true;
    }, 400);
  })();
}

// Two-column screens read across: stanza 1 | stanza 2, then 3 | 4. Each stanza keeps its own dhrupad marker/repeat under it.
// Two stanzas of very different length (Atharvashirsha: 7 lines beside 1) don't pair: the first goes alone across both columns.
function nLines(e) {
  return e.querySelectorAll(".verse > .mr > p").length || e.querySelectorAll("p").length || 1;
}

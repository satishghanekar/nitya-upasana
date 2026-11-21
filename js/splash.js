// @ts-check
// The splash (#spl in index.html): from the very first paint until the site script has set up the page, the app's
// picture for the time of day with today's weekday star ringed, as on Home, and the app's name. While it waits, the
// seven stars light up one after another (css/02-core.css, "Splash"). It goes once js/main.js sets data-ready. The
// first opening of the day plays the launch animation instead, and any other opening keeps the splash about 1.5 s
// (below, and js/features/launch.js).
// A plain script, run as the page is read, so it needs no module and nothing else to load first. It also puts the
// reader's theme on the page now (from the boot copy of the settings), so the splash is light, sepia or dark to match.
(function () {
  // Star centres per picture, Sunday (र) to Saturday (श): the same as STARS in js/core/time-of-day.js
  // (tests/unit/time-of-day.test.mjs checks they match)
  /** @type {Record<string, number[][]>} */
  var STARS = {
    sunrise: [
      [14.1, 40.5],
      [20.9, 26.6],
      [32.8, 16.8],
      [49.9, 13.2],
      [66.9, 16.8],
      [79.1, 26.8],
      [85.4, 40.5],
    ],
    midday: [
      [16.0, 44.3],
      [22.0, 30.0],
      [33.6, 19.9],
      [49.9, 15.8],
      [66.3, 19.9],
      [77.9, 30.3],
      [83.9, 44.5],
    ],
    sunset: [
      [13.8, 39.3],
      [21.1, 25.6],
      [33.7, 15.8],
      [49.9, 12.2],
      [66.5, 15.8],
      [79.1, 25.9],
      [86.4, 39.3],
    ],
  };
  try {
    var th = JSON.parse(localStorage.getItem("aarti2-prefs") || "{}").th;
    if (th === "light" || th === "dark" || th === "sepia") document.documentElement.setAttribute("data-pref", th);
  } catch (e) {}
  var found = document.getElementById("spl");
  if (!found) return;
  var sp = /** @type {HTMLElement} */ (found);
  // the version, small at the foot, on a line of its own under who made the site (from <meta name="version">, as Settings → About shows it)
  var ver = sp.querySelector(".spl-ver"),
    meta = document.querySelector('meta[name="version"]');
  if (ver && meta) ver.textContent = "Version " + (meta.getAttribute("content") || "").replace(/^aarti-v/, "");
  // the same picture as Home: sunrise before 12:00, midday until 17:00, then sunset (js/core/time-of-day.js)
  var now = new Date(),
    h = now.getHours(),
    pic = h < 12 ? "sunrise" : h < 17 ? "midday" : "sunset",
    box = /** @type {HTMLElement} */ (sp.querySelector(".splm")),
    img = sp.querySelector("img");
  if (!box || !img) return;
  img.src = "picture-" + pic + "-360.webp";
  var today = STARS[pic][now.getDay()];
  // The first opening of the day plays the launch animation instead (css/02-core.css, "The launch animation";
  // js/features/launch.js adds the day's lines): night, the seven stars coming out one by one, today's growing while
  // the others dim, the day opening out of it. Only on Home (not a link to a text or the install page), never for a
  // reader who asks for less motion, and once a day: the day is kept on this phone (localStorage "nitya-launch").
  // Every other time the app is opened (Satish, 2026-11-21) the plain splash stays a moment, about 1.5 s, while the
  // stars light in turn (#spl.brief; js/features/launch.js ends it): once a visit, not again when the page reloads
  // (sessionStorage "nitya-opened", gone when the app or the tab is closed).
  var key = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate(),
    full = false,
    brief = false;
  try {
    var home = window.top === window && !location.hash && !location.search && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    full = home && localStorage.getItem("nitya-launch") !== key;
    brief = home && !full && !sessionStorage.getItem("nitya-opened");
    if (full) localStorage.setItem("nitya-launch", key);
    if (home) sessionStorage.setItem("nitya-opened", "1");
  } catch (e) {
    full = brief = false;
  }
  // a tap or a key ends either (once the page is ready: css/02-core.css)
  if (full || brief) {
    sp.setAttribute("data-t0", String(Math.round(performance.now())));
    var skip = function () {
      sp.classList.add("skip");
    };
    sp.addEventListener("click", skip);
    document.addEventListener("keydown", skip, { once: true });
  }
  if (brief) sp.classList.add("brief");
  if (full) {
    sp.classList.add("launch");
    sp.style.setProperty("--sx", today[0] + "%");
    sp.style.setProperty("--sy", today[1] + "%");
    // each star seen through a small round window onto the picture, the rest of it still dark
    STARS[pic].forEach(function (s, i) {
      var w = document.createElement("i");
      w.className = "splw" + (i === now.getDay() ? " splt" : "");
      w.style.left = s[0] + "%";
      w.style.top = s[1] + "%";
      w.style.backgroundImage = "url(picture-" + pic + "-360.webp)";
      // (the window is 17% of the picture: this puts the star's centre in its middle)
      w.style.backgroundPosition = ((s[0] - 8.5) / 0.83).toFixed(2) + "% " + ((s[1] - 8.5) / 0.83).toFixed(2) + "%";
      w.style.animationDelay = (0.15 + i * 0.13).toFixed(2) + "s, 1.25s, 2.35s";
      box.appendChild(w);
    });
    var rays = document.createElement("i");
    rays.className = "splx";
    rays.style.left = today[0] + "%";
    rays.style.top = today[1] + "%";
    box.appendChild(rays);
    var om = document.createElement("i");
    om.className = "splo";
    box.appendChild(om);
  } else {
    // a glow on each star, lit in turn from र to श, while the page starts
    STARS[pic].forEach(function (s, i) {
      var glow = document.createElement("i");
      glow.className = "spls";
      glow.style.left = s[0] + "%";
      glow.style.top = s[1] + "%";
      glow.style.animationDelay = (i * 0.22).toFixed(2) + "s";
      box.appendChild(glow);
    });
  }
  // the ring on today's star
  var ring = document.createElement("i");
  ring.className = "splr";
  ring.style.left = today[0] + "%";
  ring.style.top = today[1] + "%";
  box.appendChild(ring);
  // set up: its picture and name may show now (css/02-core.css)
  sp.setAttribute("data-set", "");
})();

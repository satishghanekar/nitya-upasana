// @ts-check
// The splash (#spl in index.html): from the very first paint until the site script has set up the page, the app's
// picture for the time of day with today's weekday star ringed, as on Home, and the app's name. While it waits, the
// seven stars light up one after another (css/02-core.css, "Splash"). It goes once js/main.js sets data-ready.
// A plain script, run as the page is read, so it needs no module and nothing else to load first. It also puts the
// reader's theme on the page now (from the boot copy of the settings), so the splash is light, sepia or dark to match.
(function () {
  // Star centres per picture, Sunday (र) to Saturday (श): the same as STARS in js/core/time-of-day.js
  // (tests/unit/time-of-day.test.mjs checks they match)
  /** @type {Record<string, number[][]>} */
  var STARS = {
    sunrise: [[14.1, 40.5], [20.9, 26.6], [32.8, 16.8], [49.9, 13.2], [66.9, 16.8], [79.1, 26.8], [85.4, 40.5]],
    midday: [[16.0, 44.3], [22.0, 30.0], [33.6, 19.9], [49.9, 15.8], [66.3, 19.9], [77.9, 30.3], [83.9, 44.5]],
    sunset: [[13.8, 39.3], [21.1, 25.6], [33.7, 15.8], [49.9, 12.2], [66.5, 15.8], [79.1, 25.9], [86.4, 39.3]],
  };
  try {
    var th = JSON.parse(localStorage.getItem("aarti2-prefs") || "{}").th;
    if (th === "light" || th === "dark" || th === "sepia") document.documentElement.setAttribute("data-pref", th);
  } catch (e) {}
  var sp = document.getElementById("spl");
  if (!sp) return;
  // the same picture as Home: sunrise before 12:00, midday until 17:00, then sunset (js/core/time-of-day.js)
  var now = new Date(),
    h = now.getHours(),
    pic = h < 12 ? "sunrise" : h < 17 ? "midday" : "sunset",
    box = /** @type {HTMLElement} */ (sp.querySelector(".splm")),
    img = sp.querySelector("img");
  if (!box || !img) return;
  img.src = "picture-" + pic + "-360.webp";
  // a glow on each star, lit in turn from र to श, and the ring on today's
  STARS[pic].forEach(function (s, i) {
    var glow = document.createElement("i");
    glow.className = "spls";
    glow.style.left = s[0] + "%";
    glow.style.top = s[1] + "%";
    glow.style.animationDelay = (i * 0.22).toFixed(2) + "s";
    box.appendChild(glow);
  });
  var ring = document.createElement("i"),
    today = STARS[pic][now.getDay()];
  ring.className = "splr";
  ring.style.left = today[0] + "%";
  ring.style.top = today[1] + "%";
  box.appendChild(ring);
})();

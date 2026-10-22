// The files the site is built from, listed once. Read by:
// - js/features/offline.js: "Check for updates" compares them with the saved copy, and the offline badge waits for them;
// - sw.js (importScripts): the files saved on the phone for offline use;
// - tests/site-files.spec.mjs: checks this list against the <link> and <script> tags in index.html.
// When adding a file, add it here AND to index.html (the page loads files from its tags, not from this list).
// eslint-disable-next-line no-unused-vars, no-redeclare -- declared here, read as a global by the site script and sw.js
var SITE_PARTS = (function () {
  // The styles, in the order index.html loads them. The order matters: a later rule refines an earlier one.
  var css = [
    "00-fonts",
    "01-theme",
    "02-core",
    "03-menus-print-view",
    "04-columns-rail",
    "05-home-card",
    "06-help-polish",
    "07-bottom-bar-folds",
    "08-contents-book",
    "09-settings-page",
    "10-today",
    "11-profiles",
    "12-calendar",
    "13-library",
    "14-builder",
    "99-fallbacks",
  ].map(function (f) {
    return "css/" + f + ".css";
  });
  // The plain scripts, in load order: this list, the code that builds the pieces
  var scripts = ["js/parts.js", "js/render.js"];
  // The site script: js/main.js (loaded with <script type="module">) and the parts it imports
  var modules = [
    "main",
    "text/load",
    "text/content",
    "text/format",
    "store/db",
    "store/migrate",
    "store/profiles",
    "store/store",
    "core/page",
    "core/state",
    "core/words",
    "core/features",
    "core/time-of-day",
    "features/day-picture",
    "text/iast",
    "core/library",
    "features/library",
    "text/layout",
    "features/astronomy",
    "features/sankashti",
    "core/routine",
    "core/ticks",
    "features/today-card",
    "core/panchang-names",
    "core/panchang",
    "core/festivals",
    "features/vedic-calendar",
    "text/dhrupad-markers",
    "text/stanza-numbers",
    "text/line-breaks",
    "text/autofit",
    "core/apply",
    "features/bottom-bar",
    "features/bars",
    "features/settings-panel",
    "features/dhrupad-button",
    "features/reading-sheet",
    "features/wake-lock",
    "features/overlays",
    "features/history",
    "features/languages",
    "features/contents-list",
    "features/clicks",
    "features/pinch",
    "text/search-core",
    "text/search",
    "core/startup",
    "features/picture-viewer",
    "features/help",
    "print/profiles",
    "print/compose",
    "print/fit",
    "print/what",
    "print/select",
    "features/print",
    "features/share",
    "features/more-menu",
    "features/offline",
    "store/backup",
    "features/profiles",
    "features/backup",
    "features/text-picker",
    "features/routine-builder",
  ].map(function (f) {
    return "js/" + f + ".js";
  });
  // The texts: the list of texts and categories, then one file per text, as listed in content/library.json
  // (js/text/load.js reads them; tests/site-files.spec.mjs checks this list against library.json)
  var content = [
    "library.json",
    "categories.json",
    "routines.json",
    "festivals.json",
    "texts/atharvashirsha.txt",
    "texts/shree-rudra.txt",
    "texts/shri-sukta.txt",
    "texts/purusha-suktam.txt",
    "texts/lalita-sahasranama.txt",
    "texts/sukhkarta.txt",
    "texts/shendur-lal-chadhayo.txt",
    "texts/durge-durghat-bhari.txt",
    "texts/lavathavati-vikrala.txt",
    "texts/trigunatmak-traimurti.txt",
    "texts/aarti-dnyanaraja.txt",
    "texts/yei-o-vitthale.txt",
    "texts/ghalin-lotangan.txt",
    "texts/jai-ganesh-deva.txt",
    "texts/jai-jagdish-hare.txt",
    "texts/jaydeva-jaydeva-samartha.txt",
    "texts/jay-jay-aarti-shrigururaya.txt",
    "texts/ovaloon-aarti-chaitanyabrahma.txt",
    "texts/aarti-kariton-guruvar.txt",
    "texts/dhanya-jagin-guruvarya.txt",
    "texts/aarti-belaguve.txt",
    "texts/svastha-karin-shayan.txt",
    "texts/ovaloo-sapreme-aarti.txt",
    "texts/sadguru-padukashtak.txt",
    "texts/ananyata-maj-ghado.txt",
    "texts/anudin-anutapen.txt",
    "texts/ashtak-monday.txt",
    "texts/ashtak-tuesday.txt",
    "texts/ashtak-wednesday.txt",
    "texts/ashtak-thursday.txt",
    "texts/ashtak-friday.txt",
    "texts/ashtak-saturday.txt",
    "texts/ashtak-sunday.txt",
    "texts/haachi-subodh.txt",
    "texts/brahmachaitanya-sarikha.txt",
    "texts/swami-majha-pahila.txt",
  ].map(function (f) {
    return "content/" + f;
  });
  // Font files kept for offline use: Modern and Traditional, the default (Bold's Noto Serif downloads when picked)
  var fonts = [
    "inter-latin",
    "inter-latin-ext",
    "noto-sans-deva-devanagari",
    "noto-sans-deva-latin",
    "noto-sans-deva-latin-ext",
    "tiro-marathi-devanagari",
    "tiro-marathi-latin",
    "tiro-marathi-latin-ext",
    "tiro-sanskrit-devanagari",
    "tiro-sanskrit-latin",
    "tiro-sanskrit-latin-ext",
    "noto-sans-kannada-kannada",
    "noto-serif-kannada-kannada",
  ].map(function (f) {
    return "fonts/" + f + ".woff2";
  });
  // The pictures and icons kept for offline use: the app's three time-of-day pictures (sunrise, midday, sunset;
  // js/core/time-of-day.js picks one), each small (home card) and full size (full-screen view), the tab icons
  // and the installed app icons. Not in "all": "Check for updates" compares text files only.
  var images = [
    "picture-sunrise-360.webp",
    "picture-midday-360.webp",
    "picture-sunset-360.webp",
    "picture-sunrise.webp",
    "picture-midday.webp",
    "picture-sunset.webp",
    "icon-32.png",
    "favicon-midday-32.png",
    "favicon-sunset-32.png",
    "icon-180.png",
    "icon-192.png",
    "icon-maskable-192.png",
  ];
  return { css: css, scripts: scripts, modules: modules, content: content, fonts: fonts, images: images, all: css.concat(scripts, modules, content) };
})();

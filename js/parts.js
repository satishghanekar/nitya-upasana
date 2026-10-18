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
    "99-fallbacks",
  ].map(function (f) {
    return "css/" + f + ".css";
  });
  // The plain scripts, in load order: this list, the text of the pieces, the code that builds them
  var scripts = ["js/parts.js", "content/pieces.js", "js/render.js"];
  // The site script: js/main.js (loaded with <script type="module">) and the parts it imports
  var modules = [
    "main",
    "core/page",
    "core/state",
    "core/features",
    "text/iast",
    "text/layout",
    "features/astronomy",
    "features/date-card",
    "text/dhrupad-markers",
    "text/stanza-numbers",
    "text/line-breaks",
    "text/autofit",
    "core/apply",
    "features/bottom-bar",
    "features/tilt",
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
    "text/search",
    "core/startup",
    "features/picture-viewer",
    "features/help",
    "print/profiles",
    "print/fit",
    "features/print",
    "features/share",
    "features/offline",
  ].map(function (f) {
    return "js/" + f + ".js";
  });
  // Font files kept for offline use (the rest download only when a font choice needs them)
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
  ].map(function (f) {
    return "fonts/" + f + ".woff2";
  });
  return { css: css, scripts: scripts, modules: modules, fonts: fonts, all: css.concat(scripts, modules) };
})();

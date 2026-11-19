// @ts-check
// Which way this device and browser puts the site on the home screen (pure, unit-tested in
// tests/unit/install-kind.test.mjs; no init(): used by js/features/install-page.js).
// The install page shows one way for each kind: a one-tap Install button where the browser offers it (Chrome, Edge,
// Samsung Internet), the steps with an arrow at the browser's own button where it doesn't (Safari on an iPhone or an
// iPad, Chrome on an iPhone, Firefox on Android, Safari on a Mac), and a way out of an app's own browser (WhatsApp,
// Instagram, Facebook, Gmail), which can install nothing.

/**
 * The kinds:
 * - "app": opened from the home screen icon already: no install page
 * - "ios26": Safari on an iPhone, iOS 26 and later (⋯ in the address bar at the bottom, or Share where the
 *   layout chosen in Settings shows it: the page can't tell which, so the arrow points at the bottom)
 * - "ios": Safari on an iPhone, older (Share in the toolbar at the bottom)
 * - "ipad": Safari on an iPad (Share at the top right)
 * - "iosBrowser": Chrome, Edge or Firefox on an iPhone or an iPad (Share beside the address)
 * - "iosInApp": an app's own browser on an iPhone or an iPad: Open in Safari first
 * - "android": Chrome (or Edge, Opera) on Android: one-tap Install, or ⋮ → Install app
 * - "samsung": Samsung Internet: one-tap Install, or ☰ → Add page to → Home screen
 * - "androidFirefox": Firefox on Android: ⋮ → Add app to Home screen
 * - "androidInApp": an app's own browser on Android: Open in Chrome first
 * - "desktop": Chrome or Edge on a computer: one-click Install, or the icon in the address bar
 * - "mac": Safari on a Mac: File → Add to Dock
 * - "firefox": Firefox on a computer: can't install; another browser, or the phone (the QR code)
 * @typedef {"app" | "ios26" | "ios" | "ipad" | "iosBrowser" | "iosInApp" | "android" | "samsung" | "androidFirefox" | "androidInApp" | "desktop" | "mac" | "firefox"} InstallKind
 */

// Apps whose own browser says its name in the user agent (Google's app is GSA, Facebook FBAN or FBAV)
var IN_APP = /GSA\/|FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|Snapchat|LinkedInApp|Twitter|MicroMessenger/;

/**
 * @param {string} ua navigator.userAgent
 * @param {{ platform?: string, touch?: number, standalone?: boolean }} [more] navigator.platform, navigator.maxTouchPoints,
 *   and whether the page was opened from the home screen icon
 * @returns {InstallKind}
 */
export function installKind(ua, more) {
  var m = more || {},
    android = /Android/.test(ua),
    // an iPad asks for the desktop site, so it says Macintosh: its touch screen gives it away
    ipad = !android && (/iPad/.test(ua) || (m.platform === "MacIntel" && (m.touch || 0) > 1)),
    ios = !android && (ipad || /iPhone|iPod/.test(ua));
  if (m.standalone) return "app";
  if (ios) {
    // an app's own browser has no "Safari/" (or says its name); Chrome, Edge and Firefox on iOS do have it
    if (IN_APP.test(ua) || !/Safari\//.test(ua)) return "iosInApp";
    if (/CriOS|EdgiOS|FxiOS|OPiOS/.test(ua)) return "iosBrowser";
    if (ipad) return "ipad";
    var v = /Version\/(\d+)/.exec(ua);
    return v && Number(v[1]) >= 26 ? "ios26" : "ios";
  }
  if (android) {
    // "; wv)" is Android's WebView, which every app's own browser is built on
    if (IN_APP.test(ua) || /; wv\)/.test(ua)) return "androidInApp";
    if (/SamsungBrowser/.test(ua)) return "samsung";
    if (/Firefox\//.test(ua)) return "androidFirefox";
    return "android";
  }
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return "mac";
  return "desktop";
}

/**
 * Where the arrow points, at the edge of the page nearest the browser's button: "top-right", "top-address" (Share inside the address bar, Chrome on an iPhone), "bottom-right",
 * "bottom", or "" (none: a button on the page itself, or a menu bar outside the window)
 * @param {InstallKind} kind
 */
export function arrowAt(kind) {
  if (kind === "samsung") return "bottom-right";
  if (kind === "ios26" || kind === "ios") return "bottom";
  if (kind === "iosBrowser") return "top-address";
  if (kind === "ipad" || kind === "android" || kind === "androidFirefox" || kind === "desktop") return "top-right";
  return "";
}

/** The browser offers its own install prompt (beforeinstallprompt) @param {InstallKind} kind */
export function oneTap(kind) {
  return kind === "android" || kind === "samsung" || kind === "desktop";
}

/**
 * The address that opens this page in Chrome from an app's own browser on Android (an intent: Android opens Chrome,
 * or the address in the default browser if Chrome isn't there)
 * @param {string} url the page's address, https
 */
export function chromeIntent(url) {
  return (
    "intent://" + url.replace(/^https?:\/\//, "") + "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" + encodeURIComponent(url) + ";end"
  );
}

/** The address that opens this page in Safari from an app's own browser on iOS 17 and later @param {string} url */
export function safariLink(url) {
  return "x-safari-" + url;
}

/** iOS 17 or later (x-safari- links open Safari) @param {string} ua */
export function ios17(ua) {
  var v = /OS (\d+)_\d+(?:_\d+)? like Mac OS X/.exec(ua);
  return !!v && Number(v[1]) >= 17;
}

/** The address with ?add, the install page's mark (the shared link and the QR code carry it) @param {string} origin @param {string} path */
export function addLink(origin, path) {
  return origin + path + "?add";
}

// "add" not followed by a letter or digit: ?address is not the mark, but ?add%20, ?add. or an invisible character
// picked up when the link is pasted from a message still is
var MARK = /^add(?![A-Za-z0-9_-])/;

/** The address carries the install page's mark @param {string} search location.search */
export function hasAdd(search) {
  return search
    .replace(/^\?/, "")
    .split("&")
    .some(function (p) {
      return MARK.test(p);
    });
}

/** The search part without the mark (empty when nothing else is left) @param {string} search */
export function withoutAdd(search) {
  var rest = search
    .replace(/^\?/, "")
    .split("&")
    .filter(function (p) {
      return p && !MARK.test(p);
    })
    .join("&");
  return rest ? "?" + rest : "";
}

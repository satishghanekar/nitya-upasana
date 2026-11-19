// @ts-check
// The install page (#install-page, Satish 2026-11-19): putting the site on the home screen in as few taps as this
// device allows. The shared link and the QR code carry ?add, which opens it at start-up (the mark is taken out of the
// address at once, so a reload, a bookmark or the home screen icon never brings it back); App in the Share menu
// (#inb) and Add to Home Screen in Settings (#inb2) open it any time until the site is opened from its icon.
// One way for each device and browser (js/core/install-kind.js):
// - Chrome, Edge, Samsung Internet: the browser's own install prompt, one tap. Chrome holds the prompt back until the
//   page has been tapped and looked at for a while (about 30 s), so until then the browser menu's steps show under the
//   button, with an arrow at the menu, and the button points to them.
// - Safari on an iPhone or an iPad, Chrome on an iPhone, Firefox on Android, Safari on a Mac: no website can install
//   itself there, so the steps, with an arrow at the edge nearest the browser's button. On an iPhone, "I've added it"
//   says to open it from the icon: Safari and the home screen app keep their data apart, so the welcome card (name and
//   routine, js/features/welcome.js) waits for the app.
// - An app's own browser (WhatsApp, Instagram, Facebook, Gmail): it can install nothing, so Open in Safari (iOS 17 and
//   later) or Open in Chrome (Android), and Copy link.
// - On a computer, the QR code too, to set up a phone.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { byId, note } from "../core/page.js";
import { esc, ui } from "../core/words.js";
import { menuWords } from "../core/strings.js";
import { addLink, arrowAt, chromeIntent, hasAdd, installKind, ios17, oneTap, safariLink, withoutAdd } from "../core/install-kind.js";
import { ovDone, ovPush } from "./history.js";
import { focusBack } from "./more-menu.js";

/** Opened at start-up by the shared link (?add): the welcome card waits (js/features/welcome.js reads this) */
export var fromLink = false;

/** @type {import("../core/install-kind.js").InstallKind} */
var kind = "desktop";
/** @type {any} the browser's install prompt, kept until Install asks for it */
var deferred = null;
/** what the page shows: "how" (the way to install), "done" (installed), "added" (an iPhone: added, open it from the icon) */
var state = "how";
/** @type {HTMLElement | null} the button that opened it */
var opener = null;

// The browser's buttons the steps point at
var SHARE =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
var PHONE =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M12 7v7"/><path d="M9 11l3 3 3-3"/><path d="M10.5 18.5h3"/></svg>';
var TICK =
  '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

/** A step's words with the browser's buttons drawn in (the words are the catalog's own HTML) @param {string} s */
function keys(s) {
  return s
    .replace("{more}", '<span class="install-key" lang="en">⋯</span>')
    .replace("{menu}", '<span class="install-key" lang="en">⋮</span>')
    .replace("{lines}", '<span class="install-key" lang="en">☰</span>')
    .replace(
      "{share}",
      // (named for screen readers where the words don't say Share)
      '<span class="install-key">' + SHARE + (/>Share</.test(s) ? "" : '<span class="sr" lang="en">Share</span>') + "</span>",
    );
}

/** @param {string} title @param {string[]} steps */
function stepList(title, steps) {
  return (
    '<h3 class="install-head">' +
    esc(title) +
    '</h3><ol class="install-steps">' +
    steps
      .map(function (s) {
        return "<li><span>" + keys(s) + "</span></li>";
      })
      .join("") +
    "</ol>"
  );
}

/** The address the page is shared at: the site's own, with the install page's mark */
function link() {
  return addLink(location.origin, location.pathname);
}

/** Write the page for this device, in the menu language */
function draw() {
  var page = byId("install-page"),
    w = menuWords("install"),
    st = /** @type {Record<string, string[]>} */ (w.steps),
    how = "",
    arrow = false;
  page.lang = ui();
  byId("install-what").textContent = w.what;
  // (opened by the shared link: not now; from a button: close)
  byId("install-close").textContent = opener ? w.close : w.later;
  if (state === "done" || state === "added") {
    how =
      '<div class="install-done"><span class="install-tick">' +
      TICK +
      "</span>" +
      (state === "done" ? '<h3 class="install-head">' + esc(w.done) + "</h3><p>" + esc(w.doneHow) + "</p>" : "<p>" + esc(w.addedHow) + "</p>") +
      "</div>";
  } else if (oneTap(kind)) {
    how =
      '<button type="button" class="install-go" id="install-go">' +
      PHONE +
      "<span>" +
      esc(kind === "desktop" ? w.installDesk : w.install) +
      '</span></button><p class="install-small">' +
      esc(w.oneTap) +
      '</p><div id="install-menu"' +
      (deferred ? " hidden" : "") +
      ">" +
      stepList(w.orMenu, st[kind]) +
      "</div>";
    arrow = !deferred;
  } else if (kind === "iosInApp") {
    how =
      '<h3 class="install-head">' +
      esc(w.safariFirst) +
      '</h3><p class="install-small install-left">' +
      esc(w.safariWhy) +
      "</p>" +
      (ios17(navigator.userAgent)
        ? '<a class="install-go" id="install-out" href="' + esc(safariLink(link())) + '">' + esc(w.openSafari) + "</a>"
        : '<p class="install-small install-left">' + w.safariOld + "</p>") +
      '<button type="button" class="install-copy" id="install-copy">' +
      esc(w.copy) +
      "</button>";
  } else if (kind === "androidInApp") {
    how =
      '<h3 class="install-head">' +
      esc(w.chromeFirst) +
      '</h3><p class="install-small install-left">' +
      esc(w.chromeWhy) +
      '</p><a class="install-go" id="install-out" href="' +
      esc(chromeIntent(link())) +
      '">' +
      esc(w.openChrome) +
      '</a><button type="button" class="install-copy" id="install-copy">' +
      esc(w.copy) +
      "</button>";
  } else if (kind === "firefox") {
    how = '<p class="install-small install-left">' + esc(w.firefox) + "</p>";
  } else {
    how = stepList(kind === "mac" ? w.addMac : w.add, st[kind]);
    arrow = true;
    if (kind !== "mac" && kind !== "androidFirefox") how += '<button type="button" class="install-copy" id="install-added">' + esc(w.added) + "</button>";
  }
  byId("install-how").innerHTML = how;
  var at = arrow ? arrowAt(kind) : "";
  byId("install-arrow").hidden = !at;
  byId("install-arrow").setAttribute("data-at", at);
  // a computer: the QR code, to set up a phone too
  var ph = byId("install-phone");
  ph.hidden = !(kind === "desktop" || kind === "mac" || kind === "firefox") || state !== "how";
  if (!ph.hidden && !ph.firstChild) {
    var q = document.querySelector("#qrm .qri svg");
    if (q) {
      var c = /** @type {Element} */ (q.cloneNode(true));
      c.setAttribute("aria-hidden", "true");
      c.removeAttribute("role");
      var box = document.createElement("span");
      box.className = "install-qr";
      box.appendChild(c);
      ph.appendChild(box);
      ph.appendChild(document.createElement("p"));
    }
  }
  var pp = ph.querySelector("p");
  if (pp) pp.innerHTML = "<b>" + esc(w.phone) + "</b> " + esc(w.phoneHow);
}

/** @param {boolean} o @param {HTMLElement | null} [from] the button that opened it */
function show(o, from) {
  var page = byId("install-page");
  if (o === !page.hidden) return;
  if (o) {
    opener = from || null;
    ovPush();
    draw();
    page.hidden = false;
    page.scrollTop = 0;
    // (at start-up the page is shown only once every part has started, data-ready, js/main.js: focus then)
    Promise.resolve().then(function () {
      byId("install-title").focus({ preventScroll: true });
    });
  } else {
    page.hidden = true;
    ovDone();
    if (opener) focusBack(opener);
    else {
      var h = document.getElementById("tsh");
      if (h)
        try {
          h.focus({ preventScroll: true });
        } catch (e) {}
    }
  }
}

/** Installed (the browser said so): the buttons go, and an open page says where to find it */
function installed() {
  [byId("inb"), byId("inb2")].forEach(function (b) {
    b.hidden = true;
  });
  state = "done";
  if (!byId("install-page").hidden) {
    draw();
    note(menuWords("install").done);
  }
}

/** Install: the browser's own prompt when it has one, else the menu's steps */
function install() {
  if (!deferred) {
    var m = document.getElementById("install-menu");
    if (m) {
      m.hidden = false;
      m.scrollIntoView({ block: "nearest" });
      var h = /** @type {HTMLElement | null} */ (m.querySelector("h3"));
      if (h) {
        h.tabIndex = -1;
        h.focus();
      }
    }
    return;
  }
  var d = deferred;
  deferred = null;
  d.prompt();
  d.userChoice.then(function (/** @type {any} */ c) {
    if (c && c.outcome === "accepted") installed();
    else if (!byId("install-page").hidden) draw();
  });
}

export function init() {
  var ua = navigator.userAgent,
    standalone = /** @type {any} */ (navigator).standalone || (typeof window.matchMedia === "function" && matchMedia("(display-mode: standalone)").matches);
  kind = installKind(ua, {
    platform: navigator.platform,
    touch: navigator.maxTouchPoints,
    standalone: !!standalone,
  });
  var page = byId("install-page"),
    marked = hasAdd(location.search);
  // the mark is taken out at once: a reload, a bookmark or the home screen icon opens the site itself
  if (marked)
    try {
      history.replaceState(history.state, "", location.pathname + withoutAdd(location.search) + location.hash);
    } catch (e) {}
  // App (Share menu) and Add to Home Screen (Settings), until the site is opened from its icon
  [byId("inb"), byId("inb2")].forEach(function (b) {
    b.hidden = kind === "app";
    b.onclick = function () {
      show(true, b);
    };
  });
  page.addEventListener("click", function (e) {
    var t = /** @type {HTMLElement} */ (e.target),
      b = /** @type {HTMLElement | null} */ (t.closest("button, a"));
    if (!b) return;
    if (b.id === "install-close") show(false);
    else if (b.id === "install-go") install();
    else if (b.id === "install-added") {
      state = "added";
      draw();
      var a = /** @type {HTMLElement | null} */ (byId("install-how").querySelector("p"));
      if (a) {
        a.tabIndex = -1;
        a.focus();
      }
    } else if (b.id === "install-copy") {
      try {
        navigator.clipboard.writeText(link()).then(function () {
          note(menuWords("install").copied);
        });
      } catch (e) {}
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !page.hidden) show(false);
  });
  // the browser's own prompt: kept for Install, and the menu's steps go
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    if (!page.hidden && state === "how") draw();
  });
  window.addEventListener("appinstalled", installed);
  if (marked && kind !== "app") {
    fromLink = true;
    show(true);
  }
}

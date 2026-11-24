// @ts-check
// A text's recording played in the app (Satish, 2026-11-24). The recording under a text's credit (▶ YouTube: the
// chanters, js/text/content.js) used to open YouTube, and Follow, which stops whenever the app is put away
// (js/features/listen.js), stopped with it. Now a tap plays it here: YouTube's own player (its privacy-enhanced one,
// js/text/format.js embedOf) under the credit, as part of the text, from the second the text starts, and Follow starts
// in the same tap, so it hears the recording and the page follows it. The player scrolls away with the text as Follow
// moves on; the sound carries on, and a bar over the bottom bar (#recording-bar) keeps the recording in reach: Play /
// Pause, its title (a tap scrolls back to the player), how far it has played, and Close.
// YouTube's rules for its embedded player (developers.google.com/youtube/terms/required-minimum-functionality): the
// player stays shown, at least 200 × 200 px, with its own controls; its sound is never played without it. The bar's
// Play and Pause are the player's own commands, sent as messages (enablejsapi): no script of YouTube's runs in the page,
// and the security policy lets in only the player's frame (_headers, frame-src).
// A long press, a tap with a key held, or no internet: the link opens YouTube as before.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { embedOf } from "../text/format.js";
import { titleText } from "../text/iast.js";
import { menuWords } from "../core/strings.js";
import { nameLang } from "../core/words.js";
import { byId, root } from "../core/page.js";
import { followOn } from "./listen.js";

var YT = "https://www.youtube-nocookie.com";

/** @type {HTMLElement | null} the player under the credit, while a recording is open */
var box = null;
/** @type {HTMLIFrameElement | null} */
var frame = null;
var playing = false;

/** @type {HTMLElement} */ var bar;
/** @type {HTMLButtonElement} */ var playBtn;
/** @type {HTMLElement} */ var titleEl;
/** @type {HTMLElement} */ var whoEl;
/** @type {HTMLProgressElement} */ var progress;

export function init() {
  bar = byId("recording-bar");
  playBtn = /** @type {HTMLButtonElement} */ (byId("recording-play"));
  titleEl = byId("recording-title");
  whoEl = byId("recording-who");
  progress = /** @type {HTMLProgressElement} */ (byId("recording-progress"));
  document.addEventListener("click", function (e) {
    var a = /** @type {HTMLAnchorElement | null} */ (/** @type {HTMLElement} */ (e.target).closest(".cr .rec a"));
    if (!a || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || !navigator.onLine) return;
    var src = embedOf(a.getAttribute("href") || "", location.origin);
    if (!src) return;
    e.preventDefault();
    open(a, src);
    // (in this tap: Safari starts the microphone only in one)
    followOn();
  });
  window.addEventListener("message", heard);
  playBtn.addEventListener("click", function () {
    command(playing ? "pauseVideo" : "playVideo");
  });
  byId("recording-show").addEventListener("click", function () {
    if (box) box.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  byId("recording-close").addEventListener("click", close);
  // the bar covers the foot of the page while it shows: the page leaves that much more room at its end
  // (--recording-bar-h, css/07-bottom-bar-folds.css), as for Follow's panel
  if (window.ResizeObserver)
    new ResizeObserver(function () {
      var h = bar.offsetHeight;
      if (h) root.style.setProperty("--recording-bar-h", h + 8 + "px");
      else root.style.removeProperty("--recording-bar-h");
    }).observe(bar);
}

/**
 * The player opened under the credit of the recording tapped, in place of one open before
 * @param {HTMLAnchorElement} a  the recording's link
 * @param {string} src  the player's address
 */
function open(a, src) {
  close();
  var cr = /** @type {HTMLElement} */ (a.closest(".cr")),
    piece = /** @type {HTMLElement | null} */ (cr.closest("section[id]")),
    who = a.textContent || "",
    w = menuWords("recording"),
    en = nameLang() !== "mr";
  box = document.createElement("div");
  box.className = "recording-player";
  frame = document.createElement("iframe");
  frame.title = who + " · YouTube";
  frame.allow = "autoplay; encrypted-media; picture-in-picture";
  frame.allowFullscreen = true;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.src = src;
  frame.addEventListener("load", function () {
    // (asks the player to say how far it has played, and when it plays or stops)
    post({ event: "listening", id: 1, channel: "widget" });
  });
  box.appendChild(frame);
  cr.after(box);
  titleEl.textContent = piece ? titleText(piece.id, en) : "";
  titleEl.setAttribute("lang", en ? "en" : "mr");
  whoEl.textContent = who;
  byId("recording-close").setAttribute("aria-label", w.close);
  progress.value = 0;
  // (it starts playing by itself where the phone allows; where it doesn't, YouTube's own play button in the player)
  show(true);
  bar.hidden = false;
}

/** The recording closed: the player taken out (its sound stops with it) and the bar put away */
function close() {
  if (box) box.remove();
  box = frame = null;
  playing = false;
  bar.hidden = true;
}

/** A message to the player @param {object} m */
function post(m) {
  if (frame && frame.contentWindow) frame.contentWindow.postMessage(JSON.stringify(m), YT);
}

/** One of the player's own commands (Play, Pause) @param {string} func */
function command(func) {
  post({ event: "command", func: func, args: [] });
  show(func === "playVideo");
}

/**
 * What the player tells the page: whether it plays, how far, out of how long. Only the open player's messages are read.
 * @param {MessageEvent} e
 */
function heard(e) {
  if (e.origin !== YT || !frame || e.source !== frame.contentWindow || typeof e.data !== "string") return;
  /** @type {any} */ var d;
  try {
    d = JSON.parse(e.data);
  } catch (err) {
    return;
  }
  var info = d && d.info;
  // (YouTube's player states: 1 playing, 3 loading on its way to play; 0 ended, 2 paused, 5 cued)
  if (d.event === "onStateChange" && typeof info === "number") show(info === 1 || info === 3);
  if (d.event !== "infoDelivery" || !info) return;
  if (typeof info.playerState === "number") show(info.playerState === 1 || info.playerState === 3);
  if (typeof info.duration === "number" && info.duration > 0) progress.max = info.duration;
  if (typeof info.currentTime === "number") progress.value = info.currentTime;
}

/** The bar's Play / Pause button as the player is @param {boolean} on  playing */
function show(on) {
  playing = on;
  bar.setAttribute("data-playing", on ? "1" : "0");
  var w = menuWords("recording");
  playBtn.setAttribute("aria-label", on ? w.pause : w.play);
}

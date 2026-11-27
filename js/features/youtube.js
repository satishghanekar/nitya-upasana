// @ts-check
// YouTube's player, for Play mode (js/features/play.js; Satish, 2026-11-26): the one part that talks to YouTube.
// Nothing is loaded until Play mode starts (a tap): then YouTube's player script (https://www.youtube.com/iframe_api,
// allowed by _headers' Content-Security-Policy) and one player, on youtube-nocookie.com, which stays for every text:
// the next video is loaded into it, so a phone that let the first one play lets the next ones start by themselves
// (iPhone, home screen and Safari, the Play mode test of 2026-11-26). YouTube's rules: the video is shown, never only
// its sound, at 200 × 200 px at least; it stops when the phone locks, and starts again only from a tap.
// The tests put a stand-in for YouTube's script in its place (tests/play.spec.mjs), so they never reach YouTube.
// No init(): Play mode calls attach() when it starts.

/** @typedef {"playing" | "paused" | "ended" | "waiting" | "error"} State */
/** @typedef {{ state: (s: State, code?: number) => void }} Listener */

var API = "https://www.youtube.com/iframe_api";
/** @type {any} the player, once made */
var player = null;
/** @type {Promise<void> | null} YouTube's script, loading or loaded */
var script = null;
/** @type {Listener | null} */
var heard = null;
// the video loaded has played since: loading the next one first repeats the last one's "ended", which must not move
// Play mode on again (seen in the test of 2026-11-26)
var played = false;
/** @type {any} what to play once the player is ready */
var waiting = null;

/** YouTube's script, loaded once @returns {Promise<void>} */
function load() {
  if (script) return script;
  /** @type {any} */
  var w = window;
  script = new Promise(function (ok, fail) {
    if (w.YT && w.YT.Player) return ok();
    var before = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = function () {
      if (typeof before === "function") before();
      ok();
    };
    var s = document.createElement("script");
    s.src = API;
    s.onerror = function () {
      script = null;
      fail(new Error("YouTube's player did not load"));
    };
    document.head.appendChild(s);
  });
  return script;
}

/**
 * Make the player in box (once) and tell listen what it does
 * @param {HTMLElement} box
 * @param {Listener} listen
 * @returns {Promise<void>}
 */
export function attach(box, listen) {
  heard = listen;
  if (player) return Promise.resolve();
  return load().then(function () {
    if (player) return;
    /** @type {any} */
    var YT = /** @type {any} */ (window).YT;
    var el = document.createElement("div");
    box.appendChild(el);
    player = new YT.Player(el, {
      host: "https://www.youtube-nocookie.com",
      width: "100%",
      height: "100%",
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: function () {
          if (waiting) {
            var x = waiting;
            waiting = null;
            play(x);
          }
        },
        onStateChange: function (/** @type {any} */ e) {
          var d = e.data;
          if (d === 1) {
            played = true;
            tell("playing");
          } else if (d === 2) tell("paused");
          else if (d === 3 || d === -1 || d === 5) tell("waiting");
          else if (d === 0 && played) tell("ended");
        },
        onError: function (/** @type {any} */ e) {
          tell("error", e && e.data);
        },
      },
    });
  });
}

/** @param {State} s @param {number} [code] */
function tell(s, code) {
  if (heard) heard.state(s, code);
}

/**
 * Play a video from its start second, to its end second if it has one
 * @param {{ video: string, start: number, end: number }} t
 */
export function play(t) {
  played = false;
  if (!player || typeof player.loadVideoById !== "function") {
    waiting = t;
    return;
  }
  var o = /** @type {any} */ ({ videoId: t.video, startSeconds: t.start || 0 });
  if (t.end) o.endSeconds = t.end;
  player.loadVideoById(o);
}

/** Go on after a pause (a tap: a phone starts sound only from one) */
export function resume() {
  if (player && player.playVideo) player.playVideo();
}

export function pause() {
  if (player && player.pauseVideo) player.pauseVideo();
}

/** The video stops; the player stays, for the next time */
export function stop() {
  waiting = null;
  if (player && player.stopVideo) player.stopVideo();
}

/** Where the video is and how long it is, in seconds @returns {[number, number]} */
export function times() {
  if (!player || !player.getCurrentTime) return [0, 0];
  return [player.getCurrentTime() || 0, player.getDuration() || 0];
}

/** It is playing now */
export function isPlaying() {
  return !!player && typeof player.getPlayerState === "function" && player.getPlayerState() === 1;
}

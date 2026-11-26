// @ts-nocheck
// Play mode's Phase 0 test (branch spike-play only, never merged): can a phone play the day's recordings one after
// another in YouTube's player, the next starting by itself, outside the cross-origin isolation Follow needs?
"use strict";
var LIST = [
  { name: "Ganapati Bappa Morya", id: "2zOJ9aZR-08", start: 10 },
  { name: "Vande Ganapati", id: "mt-vSIgsaxU", start: 15 },
  { name: "Gaiye Ganapati", id: "aASYnk-eaXI", start: 15 },
];
var T0 = Date.now(), player = null, at = 0, waitTimer = 0, ended = 0, played = false;
var $ = function (id) { return document.getElementById(id); };
function log(m) { var s = ((Date.now() - T0) / 1000).toFixed(1) + "s  " + m; $("log").textContent += s + "\n"; }
function item(i) { var x = LIST[i]; return { videoId: x.id, startSeconds: x.start, endSeconds: $("full").checked ? undefined : x.start + 20 }; }
var STATES = { "-1": "unstarted", 0: "ended", 1: "playing", 2: "paused", 3: "buffering", 5: "cued" };

// What this phone and this address are: the facts that decide the design
function facts() {
  var f = [
    "This page cross-origin isolated: " + window.crossOriginIsolated,
    "Installed (home screen): " + (matchMedia("(display-mode: standalone)").matches || navigator.standalone === true),
    "Browser: " + navigator.userAgent,
  ];
  Promise.all(["/", "/play"].map(function (u) {
    return fetch(u, { cache: "no-store" }).then(function (r) {
      return u + " → COEP " + (r.headers.get("cross-origin-embedder-policy") || "none") + ", COOP " + (r.headers.get("cross-origin-opener-policy") || "none");
    }, function (e) { return u + " → " + e.message; });
  })).then(function (rows) {
    f = f.concat(rows);
    $("facts").innerHTML = f.map(function (x) { return "<div>" + x.replace(/</g, "&lt;") + "</div>"; }).join("");
    f.forEach(log);
  });
}

function show() { $("now").textContent = "Playing " + (at + 1) + " of " + LIST.length + ": " + LIST[at].name + (at + 1 < LIST.length ? " · next: " + LIST[at + 1].name : " · the last one"); }

// After a load, the next should be playing within a few seconds; if not, the phone blocked it (no tap) and the app
// would need a tap per text
function expectPlaying(why) {
  clearTimeout(waitTimer);
  waitTimer = setTimeout(function () {
    if (player.getPlayerState() !== 1) {
      log("NOT PLAYING 8 s after " + why + " (state " + STATES[player.getPlayerState()] + "): blocked without a tap?");
      $("tapnext").hidden = false;
    }
  }, 8000);
}

function go(i, why) {
  at = i; played = false; show(); $("tapnext").hidden = true;
  log("load " + (i + 1) + " " + LIST[i].name + " (" + why + ")");
  player.loadVideoById(item(i));
  expectPlaying(why);
}

function onState(e) {
  log("state: " + STATES[e.data]);
  if (e.data === 1) { played = true; clearTimeout(waitTimer); $("tapnext").hidden = true; }
  // (loading the next one first repeats the last one's "ended": only an ending after this one has played counts)
  if (e.data === 0 && !played) log("(an old ended, ignored)");
  if (e.data === 0 && played) {
    ended++;
    if (at + 1 < LIST.length) go(at + 1, "the last one ended, no tap");
    else { log("ALL DONE: " + ended + " ended"); $("now").textContent = "All " + LIST.length + " played"; }
  }
}

function start() {
  if (player) { go(0, "Start tapped"); return; }
  log("loading YouTube's player script");
  window.onYouTubeIframeAPIReady = function () {
    log("script ready");
    player = new YT.Player("player", {
      host: "https://www.youtube-nocookie.com",
      videoId: LIST[0].id,
      playerVars: { playsinline: 1, rel: 0, start: LIST[0].start, end: LIST[0].start + 20, autoplay: 1 },
      events: {
        onReady: function () { log("player ready"); at = 0; show(); player.playVideo(); expectPlaying("Start tapped"); },
        onStateChange: onState,
        onError: function (e) { log("ERROR " + e.data + (e.data === 153 ? " (no referrer: YouTube refuses)" : e.data === 150 || e.data === 101 ? " (embedding not allowed by the owner)" : "")); },
      },
    });
  };
  var s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  s.onerror = function () { log("ERROR: YouTube's script didn't load (no internet, or blocked)"); };
  document.head.appendChild(s);
}

$("start").addEventListener("click", start);
$("pause").addEventListener("click", function () { if (!player) return; var p = player.getPlayerState() === 1; p ? player.pauseVideo() : player.playVideo(); log(p ? "Pause tapped" : "Play tapped"); });
$("next").addEventListener("click", function () { if (player && at + 1 < LIST.length) go(at + 1, "Next tapped"); });
$("tapnext").addEventListener("click", function () { player.playVideo(); log("Play next tapped"); });
$("copy").addEventListener("click", function () { navigator.clipboard.writeText($("facts").innerText + "\n\n" + $("log").textContent).then(function () { log("log copied"); }); });
document.addEventListener("visibilitychange", function () { log("page " + document.visibilityState + (player ? " (state " + STATES[player.getPlayerState()] + ")" : "")); });
facts();

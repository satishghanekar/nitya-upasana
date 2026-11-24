// @ts-check
// Listen (Satish, 2026-11-06): the phone hears the chanting and shows where it is. Tap Listen (the ear in the bottom
// bar) while an aarti or a chant is going on: the line being chanted is marked (.lsn) and kept in view, the text is
// opened if another one is on screen, the dhrupad shown after every stanza, and the place follows the chanting until
// Stop. Everything happens on the phone: no sound leaves it.
// - The model (a CTC model, wav2vec2, trained in the shravan-model repository), its download and its memory are
//   js/features/follow-model.js's; this part asks it for the model and hears through it.
// - Each start is a run of its own (Run, below), from the tap to Stop: its microphone, sound, timers and screen lock
//   are held on it and let go together (end()), and every step that waited checks it is still the run in charge
//   before going on. Stop and Follow again while the old run's steps still wait never leaves two runs going, nor a
//   microphone open after Stop (Satish, 2026-11-20).
// - The microphone feeds an AudioWorklet (js/worklets/listen-tap.js), so no sound is lost while the model works.
//   Every EVERY seconds of new sound (or as soon as the model is free after that), it hears the last WINDOW seconds.
//   Near the mark, its scores are lined up with the text there (js/core/align.js); when they don't fit, or the place
//   isn't known yet, js/core/follow.js looks for the letters it heard in the texts. The model writes a letter for each
//   20 ms it hears, so it says when the last letter it heard was said, as well as what it was (Satish, 2026-11-07: in
//   place of Whisper, which took about 1.7 s on an iPhone for every 5 s window, whatever it heard, and wrote only about
//   18 letters of it).
// - Each place found is where the chanting was when that letter was said, a moment before the model answers; from
//   there the mark moves on by itself at the chanting's pace (letters a second, measured from the places found,
//   js/core/follow.js nextPace), line by line, and the next place found puts it right (Satish, 2026-11-06: following
//   the model's answers alone lagged). The dhrupad sung after the stanza it is at is followed too; one heard anywhere
//   else (or sung again further on) keeps the mark where it is. It waits during silence, and stops after LOST with
//   nothing found.
// - Moving to another text needs it heard twice in a row, so one misheard window never takes the reader away.
// - The page scrolls only while the reader leaves it alone (CALM after a touch, a wheel or a key).
// - A watchdog, a few times a second, apart from the hearing: it moves the mark on and stops Follow after IDLE minutes
//   with nothing followed, even if a hearing never comes back. A model that stops answering (follow-model.js broken())
//   ends the run, and Follow offers to open the app again (restart()), as it does when the GPU fails.

import { choices, readLetters, resample } from "../core/hearing.js";
import { align, latest, logProbs, target } from "../core/align.js";
import { LEAST, PACE, ahead, correct, letters, lineAt, locate, makeDoc, nextPace, pieceLines, startOf } from "../core/follow.js";
import { pieceEl, root, topEdge } from "../core/page.js";
import { unfold } from "../core/apply.js";
import { fillWords, menuWords } from "../core/strings.js";
import { esc, nameLang, num } from "../core/words.js";
import { titleText } from "../text/iast.js";
import { P } from "../core/state.js";
import { keepPlace } from "./dhrupad-button.js";
import { jumpTo } from "./history.js";
import { leaveFor, startFor } from "./today-card.js";
import { heard, heardEnd } from "./routine-time.js";
import * as models from "./follow-model.js";
import * as fast from "./fast-mode-report.js";
import * as followed from "./follow-report.js";

var // seconds of sound heard each time (about 30 letters, enough to tell the place), and of new sound before the next
  WINDOW = 4,
  EVERY = 0.5,
  // quieter than this (the sound's RMS) is silence, not worth hearing
  QUIET = 0.003,
  // ms after the reader's own touch, wheel or key before Listen scrolls the page again
  CALM = 5000,
  // ms with nothing found (while there is sound) before the mark stops moving on
  LOST = 12000,
  // minutes with nothing followed (silence, or sound that isn't chanting: talk, the television) before Listen stops by
  // itself, so a phone left listening doesn't run its battery down (Satish, 2026-11-09); long enough for a pause
  // between the parts of a puja
  IDLE = 5,
  // hearings that fail one after another (the model throws each time) before Follow stops and says so, rather than
  // trying twice a second for as long as the phone is left
  FAILS = 5,
  // fast mode on trial (js/features/fast-mode-report.js): the hearings after the check sound before the GPU is trusted
  // for good (a GPU that brings the page down mostly does it within the first few)
  TRUSTED_AFTER = 10,
  // lining the window up with the text near the mark (js/core/align.js): how far back and ahead of it, in letters; the
  // least fit believed (a step's log-probability below the model's own reading), and the fewest letters covered.
  // On the held-out recordings (2026-11-07) it found the place in 97% of the windows of SJ's Lalita Sahasranama
  // against 71% by the letters, as close (about 2 letters), and as often elsewhere; 0.7 ms a window
  BACK = 60,
  FORTH = 250,
  FIT = -0.6,
  COVER = 10,
  // seconds at the end of the window that must fit near the mark too, or the place is looked for afresh: after a jump,
  // the window is mostly the old chanting for a second or two and fits there as a whole
  RECENT = 1,
  // when the window doesn't fit near the mark, the letters of only its last TAIL seconds are looked for first: for a
  // second or two after a jump the whole window is half the old chanting, which matches neither place. Together, on a
  // recording that jumps to another text every 45 s (2026-11-09): a new place found in 3.8 s on average instead of
  // 4.4, the jump into SJ's group chanting in 11 s instead of 25, and steady chanting followed as before (97–100%)
  TAIL = 2.5,
  // the app opened again by Follow (restart()): it offers to start once the page is back
  AGAIN = "nitya-follow-again";
// The panel while listening, a pill (Satish, 2026-11-11, in place of a card with a dot and Stop in words): a sound wave
// that moves with what the microphone hears, the text's name as its heading shows it, and a round stop button, named
// Stop for screen readers (css/07-bottom-bar-folds.css)
var WAVE = '<span class="lsn-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>',
  STOP = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/></svg>',
  // how often the wave follows the sound's level, in ms, and the level (the sound's RMS) that fills it
  LEVEL_EVERY = 90,
  LEVEL_FULL = 0.12;
var levelAt = 0;

/**
 * One start of Follow, from the tap to its end: what it holds, let go together by end(). phase: ask (the download
 * question, or Start), load (downloading and starting), run (listening).
 * @typedef {{ phase: "ask" | "load" | "run", ctx: AudioContext | null, stream: MediaStream | null,
 *   node: AudioWorkletNode | null, ticker: any, wake: any }} Run
 * @type {Run | null} the run in charge, or null when Follow is off */
var run = null;
/** @type {HTMLButtonElement} */ var btn;
/** @type {HTMLElement} */ var bar;
/** @type {HTMLElement} */ var msg;
/** @type {HTMLProgressElement} */ var prog;
/** @type {HTMLButtonElement} */ var yes;
/** @type {HTMLButtonElement} */ var no;
/** what the panel's yes button does now (Download, Start, Restart) @type {() => void} */ var onYes = begin;
/** @type {Float32Array} */ var ring = new Float32Array(0);
var got = 0;
/** the texts searched: every piece, in the page's order, and each one's letters @type {any[]} */ var order = [];
/** @type {import("../core/follow.js").Doc[] | null} */ var docs = null;
/** where the chanting was at a moment, moving on at `pace` letters a second @type {import("../core/follow.js").Mark | null} */ var mark = null;
var pace = PACE.start;
/** the place found before, for the pace @type {import("../core/follow.js").Mark | null} */ var before = null;
// when a place was last found; when Listen started or last followed anything (IDLE); the line marked now; whether
// the page just went to another text
var seenAt = 0,
  aliveAt = 0,
  shown = -1,
  jumped = false;
/** another text heard once, waiting to be heard again @type {{ doc: number, line: number } | null} */ var pending = null;
var touched = 0;
/** this start asked first to download the model (Follow's report) */
var asked = false;

/** Whether `r` is still the run in charge (a function, as it changes while a step waits) @param {Run} r */
function live(r) {
  return run === r;
}

/** The GPU where the browser has WebGPU and a GPU to give, else the CPU (js/features/follow-model.js). Exported for the
 * tests @returns {Promise<"gpu" | "cpu">} */
export function way() {
  return models.way();
}

/** The model's scores for each step of 16 kHz sound (js/features/follow-model.js). Exported for the tests, which
 * compare them with the model's Python side (models/chant-vN/check.json) @param {Float32Array} audio */
export function scores(audio) {
  return models.scores(audio);
}

export function init() {
  // another version of a text (js/features/versions.js): its letters are the ones followed from now on
  document.addEventListener("nitya-version", function () {
    docs = null;
  });
  btn = /** @type {HTMLButtonElement} */ (document.getElementById("lsb"));
  bar = /** @type {HTMLElement} */ (document.getElementById("lsn"));
  msg = /** @type {HTMLElement} */ (document.getElementById("lsnm"));
  prog = /** @type {HTMLProgressElement} */ (document.getElementById("lsnp"));
  yes = /** @type {HTMLButtonElement} */ (document.getElementById("lsny"));
  no = /** @type {HTMLButtonElement} */ (document.getElementById("lsnx"));
  if (!btn || !bar) return;
  // (a phone with no microphone access or no AudioWorklet can't listen: no button)
  btn.hidden = !models.supported();
  // (Settings → About says where the model runs here: the same choice Listen makes when started; asked only
  // when Settings opens, as asking for the GPU wakes it, and logs a warning where there is none)
  document.addEventListener("nitya-settings", function () {
    if (!btn.hidden) way().then(showWay);
  });
  btn.addEventListener("click", function () {
    if (run) stop();
    else start(false);
  });
  yes.addEventListener("click", function () {
    onYes();
  });
  no.addEventListener("click", function () {
    if (run) stop("Stop");
    else close();
  });
  // while the panel shows it covers the foot of the page, over the bottom bar: the page leaves that much more room at
  // its end (--lsnh, css/07-bottom-bar-folds.css), so the last lines of a text can still be scrolled up above it
  if (window.ResizeObserver)
    new ResizeObserver(function () {
      var h = bar.offsetHeight;
      if (h) root.style.setProperty("--lsnh", h + "px");
      else root.style.removeProperty("--lsnh");
    }).observe(bar);
  // Go to (js/features/where.js): the reader went to another place while Listen follows; its mark is set there, waiting,
  // so the page is not pulled back to where it last heard, and it follows on from there
  document.addEventListener("nitya-jump", function (e) {
    var d = /** @type {CustomEvent} */ (e).detail;
    if (!mark || !d) return;
    var all = texts(),
      i = order.findIndex(function (p) {
        return p.id === d.piece;
      });
    if (i < 0) return;
    var pos = startOf(order[i], all[i], d.line);
    if (pos < 0) return;
    mark = { doc: i, pos: pos, t: performance.now(), paused: true };
    pending = null;
    // (the stretch heard so far ends at the jump: what comes after it is not part of it, js/features/routine-time.js)
    heardEnd();
  });
  ["touchstart", "wheel", "keydown"].forEach(function (ev) {
    addEventListener(
      ev,
      function () {
        // (a new touch while Follow listens: the reader moved the page themselves, counted for Follow's report)
        if (run && run.phase === "run" && Date.now() - touched > 3000) followed.hand();
        touched = Date.now();
      },
      { passive: true },
    );
  });
  // the phone stops the microphone of a page out of sight anyway
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && run) stop("the app put away");
  });
  // Follow opened the app again (restart()): it offers to start, with one tap (sound and the microphone start only in one)
  var again = false;
  try {
    again = sessionStorage.getItem(AGAIN) === "1";
    sessionStorage.removeItem(AGAIN);
  } catch (e) {}
  if (again && !btn.hidden) start(true);
}

/**
 * Follow started by another tap than its own (a recording played in the app, js/features/recording-player.js), unless
 * it already follows or this phone can't. Called in the tap itself: Safari starts sound and the microphone only in one.
 */
export function followOn() {
  if (btn && !btn.hidden && !run) start(false);
}

/** The panel over the bottom bar: a message, and the buttons this step needs @param {string} text
 * @param {{ yes?: string, onYes?: () => void, no: string, progress?: boolean, on?: boolean }} o */
function panel(text, o) {
  bar.hidden = false;
  bar.classList.toggle("on", !!o.on);
  msg.innerHTML = (o.on ? WAVE : "") + text;
  prog.hidden = !o.progress;
  yes.hidden = !o.yes;
  yes.textContent = o.yes || "";
  onYes = o.onYes || begin;
  if (o.on) {
    no.innerHTML = STOP;
    no.setAttribute("aria-label", o.no);
  } else {
    no.textContent = o.no;
    no.removeAttribute("aria-label");
  }
  btn.setAttribute("aria-pressed", run ? "true" : "false");
}

/** The panel put away (a message read, with Follow off) */
function close() {
  bar.hidden = true;
  btn.setAttribute("aria-pressed", "false");
}

/** Follow tapped: the download question first if the model isn't on this phone yet; else it starts at once, or, when
 * the app was just opened again for it (`tapFirst`), once Start is tapped (sound starts only in a tap)
 * @param {boolean} tapFirst */
async function start(tapFirst) {
  var w = menuWords("listen"),
    /** @type {Run} */ r = { phase: "ask", ctx: null, stream: null, node: null, ticker: 0, wake: null };
  run = r;
  asked = false;
  btn.setAttribute("aria-pressed", "true");
  try {
    if (models.broken()) return offerRestart(r);
    await models.way();
    var ready = !!models.current() || (await models.stored());
    if (!live(r)) return;
    if (ready && !tapFirst) return begin();
    asked = !ready;
    if (ready) panel(esc(w.again), { yes: w.start, no: w.notNow });
    else panel(esc(w.ask(num(models.chosen().mb))), { yes: w.download, no: w.notNow });
  } catch (e) {
    failed(r, e);
  }
}

/** Settings → About → Follow: where Listen runs its model on this device (#lswr): a chip icon (with a bolt on the GPU),
 * "Listen: GPU" or "Listen: CPU", a line under it and a badge, in the menu language @param {"gpu" | "cpu"} w */
function showWay(w) {
  var row = document.getElementById("lswr");
  if (!row) return;
  row.setAttribute("data-way", w);
  [
    ["lsw", ""],
    ["lswn", "Note"],
    ["lswb", "Badge"],
  ].forEach(function (x) {
    var el = document.getElementById(x[0]);
    if (el) el.innerHTML = '<span data-w="listen.' + w + x[1] + '"></span>';
  });
  fillWords(row);
  row.hidden = false;
  // (the About tab's Follow group, left out until Follow is known to work in this browser)
  var grp = row.closest(".sp-follow");
  if (grp) grp.removeAttribute("data-off");
  fast.show();
}

// In the tap (Listen, Download or Start): Safari starts sound and asks for the microphone only in one
function begin() {
  if (!run) return;
  var r = run;
  var w = menuWords("listen"),
    /** @type {any} */ win = window,
    ctx = (r.ctx = new (win.AudioContext || win.webkitAudioContext)()),
    mic = navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      .then(function (s) {
        // (held on the run at once, so its end stops it; a run already ended stops it here)
        if (live(r)) r.stream = s;
        else stopTracks(s);
        return s;
      });
  r.phase = "load";
  models.use(true);
  var h = models.chosen(),
    had = !!models.current();
  // (Follow's report: this time counted from the tap, js/features/follow-report.js)
  followed.start(h === models.WAYS.gpu ? "gpu" : "cpu", models.modelName(h), asked);
  panel(esc(had ? w.starting : w.downloading), {
    no: w.stop,
    progress: !had,
  });
  prog.value = 0;
  var loaded = models.ensure({
    progress: function (p) {
      if (live(r)) prog.value = p;
    },
    starting: function () {
      if (live(r)) panel(esc(w.starting), { no: w.stop });
    },
  });
  Promise.all([mic, loaded])
    .then(function (x) {
      if (live(r)) return listen(r, ctx, x[0]);
    })
    .catch(function (e) {
      failed(r, e);
    });
}

/** A run that could not go on: ended, and the panel says why (the app opened again, if the model can't go on in this
 * page) @param {Run} r @param {any} e */
function failed(r, e) {
  if (!live(r)) return;
  if (models.broken()) return offerRestart(r);
  // (Stop, or the app put away, while it downloaded: nothing to say)
  if (e && e.name === "AbortError") return end(r, "Stop");
  var w = menuWords("listen"),
    why = models.whyFailed(e);
  console.warn("Listen:", e);
  end(r, "an error: " + ((e && e.message) || e));
  panel(esc(why), { no: w.close });
}

/** The model can't go on in this page (the GPU failed, or a hearing never came back): the run ended, and Restart
 * opens the app again, where the next way starts afresh @param {Run} r */
function offerRestart(r) {
  var w = menuWords("listen"),
    why = models.broken();
  end(r, why === "gpu" ? "the GPU failed: restart offered" : "the model stopped answering: restart offered");
  panel(esc(why === "gpu" ? w.gpuFailed : w.stuck), { yes: w.restart, onYes: restart, no: w.close });
}

/** The app opened again for Follow, which offers to start once it is back (init()) */
function restart() {
  try {
    sessionStorage.setItem(AGAIN, "1");
  } catch (e) {}
  location.reload();
}

/** Stop: the run in charge ended (the button, the panel's Stop, the app put away, nothing chanted for IDLE minutes)
 * @param {string} [why]  how it ended, for Follow's report */
function stop(why) {
  if (run) end(run, why);
}

/** @param {MediaStream} s */
function stopTracks(s) {
  s.getTracks().forEach(function (t) {
    t.stop();
  });
}

/** A run ended: everything it held let go, the page as it was before it started @param {Run} r @param {string} [why] */
function end(r, why) {
  if (!live(r)) return;
  run = null;
  models.use(false);
  followed.end(why || "Stop");
  // fast mode on trial: stopped by the reader (or the page hidden), not brought down: trusted if the model is running,
  // else tried again next time
  if (fast.trying()) {
    if (models.current()) fast.works();
    else fast.drop();
  }
  // the stretch heard so far adds to the reader's pace (js/features/routine-time.js)
  heardEnd();
  if (r.stream) stopTracks(r.stream);
  if (r.node) r.node.port.onmessage = null;
  if (r.ctx) r.ctx.close().catch(function () {});
  if (r.wake) r.wake.release().catch(function () {});
  clearInterval(r.ticker);
  r.stream = r.node = r.ctx = r.wake = null;
  mark = null;
  before = null;
  pace = PACE.start;
  shown = -1;
  pending = null;
  [].forEach.call(document.querySelectorAll(".lsn, .lsn-text"), function (/** @type {Element} */ x) {
    x.classList.remove("lsn", "lsn-text");
  });
  if (root.hasAttribute("data-following"))
    keepPlace(function () {
      root.removeAttribute("data-following");
      root.setAttribute("data-ref", String(P.ref));
    });
  close();
}

// ==== Listening ====

/** The microphone heard, once the model is ready @param {Run} r @param {AudioContext} ctx @param {MediaStream} s */
async function listen(r, ctx, s) {
  await ctx.resume();
  await ctx.audioWorklet.addModule(new URL(models.TAP, document.baseURI).href);
  // (Stop may have been tapped meanwhile)
  if (!live(r)) return;
  ring = new Float32Array(Math.round(ctx.sampleRate * WINDOW));
  got = 0;
  var node = (r.node = new AudioWorkletNode(ctx, "listen-tap"));
  node.port.onmessage = function (e) {
    if (live(r)) push(e.data);
  };
  ctx.createMediaStreamSource(s).connect(node);
  // (the tap writes nothing out; joined to the speakers only so that every browser runs it)
  node.connect(ctx.destination);
  r.phase = "run";
  followed.ready();
  // the dhrupad after every stanza while it listens, whatever the reader shows (Satish, 2026-11-11: with it shown once,
  // the mark had nowhere to go while it was sung); the reader's setting is left as it is (data-following, read by
  // js/features/bars.js apply())
  keepPlace(function () {
    root.setAttribute("data-following", "");
    root.setAttribute("data-ref", "0");
  });
  aliveAt = performance.now();
  r.ticker = setInterval(function () {
    watchdog(r);
  }, 250);
  panel(esc(menuWords("listen").listening), {
    no: menuWords("listen").stop,
    on: true,
  });
  /** @type {any} */ var nav = navigator;
  if (nav.wakeLock)
    nav.wakeLock
      .request("screen")
      .then(function (/** @type {any} */ l) {
        // (a run already ended lets its lock go at once)
        if (live(r)) r.wake = l;
        else l.release().catch(function () {});
      })
      .catch(function () {});
  hear(r).catch(function (e) {
    failed(r, e);
  });
}

/** A few times a second, apart from the hearing (which may be waiting on the model): the mark moved on, and Follow
 * stopped after IDLE minutes with nothing followed @param {Run} r */
function watchdog(r) {
  if (!live(r)) return;
  if (performance.now() - aliveAt > IDLE * 60000) {
    var w = menuWords("listen");
    stop("no chanting for " + IDLE + " minutes");
    panel(esc(w.idle(num(IDLE))), { no: w.close });
    return;
  }
  tick();
}

/** @param {Float32Array} chunk */
function push(chunk) {
  var power = 0;
  for (var i = 0; i < chunk.length; i++) {
    ring[(got + i) % ring.length] = chunk[i];
    power += chunk[i] * chunk[i];
  }
  got += chunk.length;
  // the wave in the panel, a few times a second (--lsnlv, 0 to 1)
  var now = performance.now();
  if (now - levelAt < LEVEL_EVERY || !chunk.length) return;
  levelAt = now;
  bar.style.setProperty("--lsnlv", Math.min(1, Math.sqrt(power / chunk.length) / LEVEL_FULL).toFixed(2));
}

/** The last WINDOW seconds (or what there is), oldest first */
function last() {
  var n = Math.min(got, ring.length),
    out = new Float32Array(n);
  for (var i = 0; i < n; i++) out[i] = ring[(got - n + i) % ring.length];
  return out;
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise(function (r) {
    setTimeout(r, ms);
  });
}

/** Hearing, as long as the run listens: the newest sound heard and followed, one window after another @param {Run} r */
async function hear(r) {
  var used = 0,
    hearings = 0,
    fails = 0;
  while (live(r) && r.ctx) {
    var rate = r.ctx.sampleRate,
      m = models.current();
    if (!m) throw new Error("the model was let go while listening");
    // at first, 2 seconds; then EVERY seconds of new sound at least
    if (got - used < rate * (used ? EVERY : 2)) {
      await sleep(100);
      continue;
    }
    used = got;
    var at = performance.now(),
      heard = last(),
      audio = resample(heard, rate, m.info.rate),
      power = 0;
    for (var i = 0; i < audio.length; i++) power += audio[i] * audio[i];
    // silence: the mark waits
    var level = Math.sqrt(power / audio.length);
    if (level < QUIET) {
      followed.quiet();
      pauseAt(at);
      continue;
    }
    try {
      var h0 = performance.now(),
        out = await models.scores(audio);
      followed.hearing(performance.now() - h0, level, mark ? order[mark.doc].id : "");
      fails = 0;
    } catch (/** @type {any} */ e) {
      if (!live(r)) return;
      followed.failed();
      fast.note("a hearing failed: " + ((e && e.message) || e));
      // (a model that stopped answering, or one that fails every time: the run ends, and says why)
      if (models.broken() || ++fails >= FAILS) throw e;
      console.warn("Listen:", e);
      await sleep(500);
      continue;
    }
    // fast mode on trial: trusted once it has heard this many windows without bringing the page down
    if (fast.trying() && ++hearings >= TRUSTED_AFTER) fast.works();
    if (!live(r) || r.phase !== "run") return;
    // a step's moment: the window began its length before `at`, and the step is that many 20 ms into it
    var began = at - (1000 * heard.length) / rate,
      outputs = out.dims[2];
    // near the mark: the window lined up with the text there; else (or if it doesn't fit) its letters looked for
    if (mark && alignAt(m, logProbs(out.data, outputs), outputs, began)) continue;
    var ch = choices(out.data, outputs),
      cut = Math.max(0, ch.length - Math.round((TAIL * 1000) / m.info.step_ms)),
      t = mark && cut ? readLetters(ch.slice(cut), m.names, m.info.blank, m.info.word) : null;
    if (t && letters(t.text).length >= LEAST && follow(t.text, began + (cut + t.last + 1) * m.info.step_ms)) continue;
    var hd = readLetters(ch, m.names, m.info.blank, m.info.word);
    if (hd.last >= 0) follow(hd.text, began + (hd.last + 1) * m.info.step_ms);
  }
}

/** The window lined up with the text around where the mark is now; the place, if it fits, followed. Whether it did.
 * @param {NonNullable<ReturnType<typeof models.current>>} m  the model @param {Float32Array} lp  the window's
 *   log-probabilities @param {number} outputs @param {number} began  when the window's sound began (performance.now()) */
function alignAt(m, lp, outputs, began) {
  if (!mark) return false;
  var doc = texts()[mark.doc],
    now = performance.now(),
    here = ahead(mark, pace, now, doc.text.length),
    from = Math.max(0, Math.floor(here - BACK)),
    tg = target(doc.text.slice(from, Math.ceil(here + FORTH)), m.ids, from),
    a = align(lp, outputs, tg.ids, m.info.blank, m.info.word);
  if (!a || a.fit < FIT || a.letters < COVER) return false;
  var fresh = align(latest(lp, outputs, Math.round((RECENT * 1000) / m.info.step_ms)), outputs, tg.ids, m.info.blank, m.info.word);
  if (!fresh || fresh.fit < FIT) return false;
  var pos = tg.at[a.end] + 1;
  // the dhrupad said again after a stanza (lined up back where it is written, once): the mark waits where it is until
  // the text goes on, as locate() has it; the first time through, it is followed like any line
  if (doc.refrain[lineAt(doc, pos - 1)] && pos < here - COVER) {
    followed.found("near", order[mark.doc].id, 0, false);
    pauseAt(now);
  } else place(mark.doc, pos, began + (a.step + 1) * m.info.step_ms, "near");
  return true;
}

// ==== Following ====

/** The texts searched: every piece, in the page's order, and each one's letters */
function texts() {
  if (docs) return docs;
  /** @type {any} */ var C = /** @type {any} */ (window).CONTENT;
  order = [];
  C.categories.forEach(function (/** @type {any} */ c) {
    c.pieces.forEach(function (/** @type {any} */ p) {
      order.push(p);
    });
  });
  return (docs = order.map(function (p) {
    return makeDoc(pieceLines(p));
  }));
}

/** The mark, stopped where it is now @param {number} now */
function pauseAt(now) {
  if (mark)
    mark = {
      doc: mark.doc,
      pos: ahead(mark, pace, now, texts()[mark.doc].text.length),
      t: now,
      paused: true,
    };
}

/** What the model heard, followed: the place found becomes the mark, which moves on at the chanting's pace (tick)
 * until the next place found. Exported for the tests, which give it what the model would write.
 * @param {string} heard @param {number} [end]  when the sound heard ended (performance.now()), so the time the
 *   model took is made up for @returns {boolean} whether it was found (or another text heard, to be heard again) */
export function follow(heard, end) {
  var all = texts(),
    now = performance.now(),
    at = end === undefined ? now : end,
    cur = mark
      ? {
          doc: mark.doc,
          line: lineAt(all[mark.doc], Math.max(0, ahead(mark, pace, now, all[mark.doc].text.length) - 1)),
        }
      : null,
    r = locate(heard, all, cur);
  if (!r) return false;
  // a dhrupad that can't be told apart from its other repeats: the mark waits where it is until the text goes on
  if (r.held) {
    if (mark) followed.found("search", order[mark.doc].id, 0, false);
    pauseAt(now);
    return true;
  }
  // another text: only once it is heard twice in a row
  if (cur && r.doc !== cur.doc && !(pending && pending.doc === r.doc)) {
    pending = { doc: r.doc, line: r.line };
    return true;
  }
  pending = null;
  place(r.doc, r.end, at, "search");
  return true;
}

/** A place found: the letter `pos` of a text was chanted at `at` (performance.now()); the mark set from there, the
 * pace measured, the text opened if it is another @param {number} doc @param {number} pos @param {number} at
 * @param {"near" | "search"} [how]  lined up near the mark, or found by searching the texts (Follow's report) */
function place(doc, pos, at, how) {
  var all = texts(),
    /** @type {import("../core/follow.js").Mark} */ found = {
      doc: doc,
      pos: pos,
      t: at,
    };
  // (Follow's report: how it was found, and how far from where the mark was)
  followed.found(how || "search", order[doc].id, mark && mark.doc === doc ? pos - ahead(mark, pace, at, all[doc].text.length) : 0, !!mark && mark.doc !== doc);
  pace = nextPace(pace, before, found);
  followed.pace(pace);
  before = found;
  // each place found also teaches the reader's own pace, pauses included (js/features/routine-time.js)
  heard(order[doc].id, pos, at);
  var moved = !mark || mark.doc !== doc;
  mark = correct(mark, pace, found, all[doc].text.length);
  seenAt = aliveAt = performance.now();
  if (moved) open(order[doc].id);
  tick();
}

/** The text being chanted on screen, and its name in the panel @param {string} id */
function open(id) {
  var el = pieceEl(id);
  if (!el) return;
  // (Satish, 2026-11-09: a Library text chanted during the day's routine was named but never shown: the page shows only
  // the session's texts while one is read. Now the session is left for it, as the Library does, and the text unfolded
  // if folded; and the page always goes to the line being chanted, even just after the reader touched it)
  leaveFor(el);
  unfold(el);
  if ((root.hasAttribute("data-hv") || !el.getClientRects().length) && !startFor(el)) {
    var to = el;
    jumpTo(function () {
      to.scrollIntoView();
    }, "#" + id);
  }
  jumped = true;
  shown = -1;
  var en = nameLang() !== "mr",
    said = menuWords("listen").following('<b lang="' + (en ? "en" : "mr") + '">' + esc(titleText(id, en)) + "</b>"),
    // the name as the text's heading shows it (its language, its letters, its font); the whole sentence for screen readers
    h = el.querySelector("header h2"),
    /** @type {Element[]} */ parts = h ? Array.prototype.slice.call(h.children) : [],
    name = parts.filter(function (x) {
      return !x.classList.contains("no") && x.getClientRects().length > 0;
    })[0];
  if (!name) {
    msg.innerHTML = WAVE + said;
    return;
  }
  var lang = /** @type {HTMLElement | null} */ (name.closest("[lang]"));
  msg.innerHTML =
    WAVE +
    '<span class="sr">' +
    said +
    '</span><b class="lsn-name" aria-hidden="true" lang="' +
    (lang ? lang.lang : "mr") +
    '">' +
    esc(name.textContent || "") +
    "</b>";
  /** @type {HTMLElement} */ (msg.lastChild).style.fontFamily = getComputedStyle(name).fontFamily;
}

/** Move the mark on: the line where the chanting is now marked and kept in view. Runs a few times a second while
 * listening, and at once when a place is found */
function tick() {
  if (!mark) return;
  var now = performance.now(),
    doc = texts()[mark.doc];
  // nothing found for a while (a long pause, or talk): the mark stops rather than run on alone
  if (!mark.paused && now - seenAt > LOST) {
    pauseAt(now);
    followed.lost(order[mark.doc].id, lineAt(doc, Math.max(0, mark.pos - 1)));
  }
  var line = lineAt(doc, Math.max(0, ahead(mark, pace, now, doc.text.length) - 1));
  if (line === shown) return;
  shown = line;
  var el = pieceEl(order[mark.doc].id);
  if (!el) return;
  var mr = el.querySelectorAll(".verse .mr p"),
    en = el.querySelectorAll(".verse .en p"),
    lines = [mr[line], en[line]].filter(Boolean),
    target = lines.filter(seen)[0];
  // (a line the page doesn't show, the dhrupad said again where it is shown once: the mark stays where it was)
  if (!target) return;
  [].forEach.call(document.querySelectorAll(".lsn, .lsn-text"), function (/** @type {Element} */ x) {
    x.classList.remove("lsn", "lsn-text");
  });
  lines.forEach(function (x) {
    x.classList.add("lsn");
  });
  // (the text being followed: its other lines step back, css/07-bottom-bar-folds.css)
  el.classList.add("lsn-text");
  var force = jumped;
  jumped = false;
  if (!force && Date.now() - touched < CALM) return;
  var box = target.getBoundingClientRect(),
    top = topEdge() + 24,
    low = innerHeight * 0.6;
  if (force || box.top < top || box.bottom > low)
    scrollBy({
      top: box.top - Math.max(top, innerHeight * 0.3),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
}

/** @param {Element} x */
function seen(x) {
  return x.getClientRects().length > 0;
}

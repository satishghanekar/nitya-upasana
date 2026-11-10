// @ts-check
// Listen (Satish, 2026-11-06): the phone hears the chanting and shows where it is. Tap Listen (the ear in the bottom
// bar) while an aarti or a chant is going on: the line being chanted is marked (.lsn) and kept in view, the text is
// opened if another one is on screen, and the place follows the chanting until Stop. Everything happens on the phone:
// no sound leaves it.
// - The model (a CTC model, wav2vec2, trained in the shravan-model repository) and the library that runs it
//   (vendor/onnxruntime/) are downloaded once, the first time, after the reader agrees: on the GPU where the browser
//   has WebGPU (models/chant-v4-q4/, 4-bit, and the library's WebGPU build, about 117 MB), else on the CPU
//   (models/chant-v4/, 8-bit, and its CPU build, about 122 MB; WAYS, way()), and kept in their own cache,
//   "nitya-listen", which a new version of the site leaves alone (sw.js). Each piece is checked against its SHA-256
//   before it is kept. (chant-v4, 2026-11-09: trained on four times as much
//   chanting as v3, it hears the family's voices and the Lalita Sahasranama a little better, at the same size and speed.)
// - The microphone feeds an AudioWorklet (js/worklets/listen-tap.js), so no sound is lost while the model works.
//   Every EVERY seconds of new sound (or as soon as the model is free after that), it hears the last WINDOW seconds.
//   Near the mark, its scores are lined up with the text there (js/core/align.js); when they don't fit, or the place
//   isn't known yet, js/core/follow.js looks for the letters it heard in the texts. The model writes a letter for each 20 ms it hears, so it says when the
//   last letter it heard was said, as well as what it was (Satish, 2026-11-07: in place of Whisper, which took about
//   1.7 s on an iPhone for every 5 s window, whatever it heard, and wrote only about 18 letters of it).
// - Each place found is where the chanting was when that letter was said, a moment before the model answers; from
//   there the mark moves on by itself at the chanting's pace (letters a second, measured from the places found,
//   js/core/follow.js nextPace), line by line, and the next place found puts it right (Satish, 2026-11-06: following
//   the model's answers alone lagged). It waits during the dhrupad and silence, and stops after LOST with nothing found.
// - Moving to another text needs it heard twice in a row, so one misheard window never takes the reader away.
// - The page scrolls only while the reader leaves it alone (CALM after a touch, a wheel or a key).

import { choices, normalize, readLetters, resample } from "../core/hearing.js";
import { align, latest, logProbs, target } from "../core/align.js";
import { LEAST, PACE, ahead, correct, letters, lineAt, locate, makeDoc, nextPace, pieceLines } from "../core/follow.js";
import { pieceEl, root } from "../core/page.js";
import { unfold } from "../core/apply.js";
import { fillWords, menuWords } from "../core/strings.js";
import { esc, nameLang, num } from "../core/words.js";
import { titleText } from "../text/iast.js";
import { jumpTo } from "./history.js";
import { leaveFor } from "./today-card.js";
import { topEdge } from "./bottom-bar.js";

var ORT = "vendor/onnxruntime/",
  TAP = "js/worklets/listen-tap.js",
  CACHE = "nitya-listen",
  /** The two ways to run the model (Satish, 2026-11-09): on the GPU where the browser has WebGPU, else on the CPU. On
   * an iPhone (Safari 27) a 4 s hearing took 712 ms on the CPU and 233 ms on the GPU with 4-bit weights (the 8-bit
   * model on the GPU: 825 ms; 16-bit: 142 ms but 189 MB), each hearing as well on the held-out recordings. Each way:
   * its model, its library (vendor/onnxruntime/README.md) and the library's WebAssembly, in pieces under 20 MB and
   * checked whole, and the download in MB as the question names it.
   * @type {Record<"gpu" | "cpu", { model: string, lib: string, wasm: { file: string, bytes: number }[], sha256: string, mb: number, ep: string }>} */
  WAYS = {
    gpu: {
      model: "models/chant-v4-q4/",
      lib: "ort.webgpu.bundle.min.mjs",
      wasm: [
        { file: "ort-wasm-simd-threaded.asyncify.wasm", bytes: 20000000 },
        { file: "ort-wasm-simd-threaded.asyncify.wasm.2", bytes: 6781914 },
      ],
      sha256: "39f9f0894d478800487ed9f7dbe92618498db320cf55c8e3d89adff8dce658da",
      mb: 117,
      ep: "webgpu",
    },
    cpu: {
      model: "models/chant-v4/",
      lib: "ort.wasm.bundle.min.mjs",
      wasm: [{ file: "ort-wasm-simd-threaded.wasm", bytes: 14239897 }],
      sha256: "3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2",
      mb: 122,
      ep: "wasm",
    },
  },
  // remembered when the GPU failed to start the model on this phone: the CPU from then on
  NO_GPU = "nitya-listen-cpu",
  // seconds of sound heard each time (about 30 letters, enough to tell the place), and of new sound before the next
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
  TAIL = 2.5;

/** off: nothing; ask: the download question; load: downloading and starting; run: listening @type {"off" | "ask" | "load" | "run"} */
var phase = "off";
/** @type {HTMLButtonElement} */ var btn;
/** @type {HTMLElement} */ var bar;
/** @type {HTMLElement} */ var msg;
/** @type {HTMLProgressElement} */ var prog;
/** @type {HTMLButtonElement} */ var yes;
/** @type {HTMLButtonElement} */ var no;
/** @type {any} */ var ort = null;
/** the way the model runs on this phone, once chosen (way()) @type {(typeof WAYS)["cpu"] | null} */ var how = null;
/** @type {any} */ var model = null;
/** @type {AudioContext | null} */ var ctx = null;
/** @type {MediaStream | null} */ var stream = null;
/** @type {AudioWorkletNode | null} */ var node = null;
/** @type {Float32Array} */ var ring = new Float32Array(0);
var got = 0;
/** @type {any} */ var wake = null;
/** the texts searched: every piece, in the page's order, and each one's letters @type {any[]} */ var order = [];
/** @type {import("../core/follow.js").Doc[] | null} */ var docs = null;
/** where the chanting was at a moment, moving on at `pace` letters a second @type {import("../core/follow.js").Mark | null} */ var mark = null;
var pace = PACE.start;
/** the place found before, for the pace @type {import("../core/follow.js").Mark | null} */ var before = null;
// when a place was last found; when Listen started or last followed anything (IDLE); the line marked now; whether
// the page just went to another text; the ticker
var seenAt = 0,
  aliveAt = 0,
  shown = -1,
  jumped = false,
  ticker = 0;
/** another text heard once, waiting to be heard again @type {{ doc: number, line: number } | null} */ var pending = null;
var touched = 0;

export function init() {
  btn = /** @type {HTMLButtonElement} */ (document.getElementById("lsb"));
  bar = /** @type {HTMLElement} */ (document.getElementById("lsn"));
  msg = /** @type {HTMLElement} */ (document.getElementById("lsnm"));
  prog = /** @type {HTMLProgressElement} */ (document.getElementById("lsnp"));
  yes = /** @type {HTMLButtonElement} */ (document.getElementById("lsny"));
  no = /** @type {HTMLButtonElement} */ (document.getElementById("lsnx"));
  if (!btn || !bar) return;
  // (a phone with no microphone access or no AudioWorklet can't listen: no button)
  btn.hidden = !(navigator.mediaDevices && window.AudioWorkletNode && window.WebAssembly);
  // (Settings → More → About says where the model runs here: the same choice Listen makes when started; asked only
  // when Settings opens, as asking for the GPU wakes it, and logs a warning where there is none)
  document.addEventListener("nitya-settings", function () {
    if (!btn.hidden) way().then(showWay);
  });
  btn.addEventListener("click", function () {
    if (phase === "off") start();
    else stop();
  });
  yes.addEventListener("click", begin);
  no.addEventListener("click", stop);
  ["touchstart", "wheel", "keydown"].forEach(function (ev) {
    addEventListener(
      ev,
      function () {
        touched = Date.now();
      },
      { passive: true },
    );
  });
  // the phone stops the microphone of a page out of sight anyway
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && phase !== "off") stop();
  });
}

/** The panel over the bottom bar: a message, and the buttons this step needs @param {string} text
 * @param {{ yes?: string, no: string, progress?: boolean, on?: boolean }} o */
function panel(text, o) {
  bar.hidden = false;
  bar.classList.toggle("on", !!o.on);
  msg.innerHTML = text;
  prog.hidden = !o.progress;
  yes.hidden = !o.yes;
  yes.textContent = o.yes || "";
  no.textContent = o.no;
  btn.setAttribute("aria-pressed", phase === "off" ? "false" : "true");
}

async function start() {
  var w = menuWords("listen");
  phase = "ask";
  btn.setAttribute("aria-pressed", "true");
  await way();
  if (model || (await stored())) begin();
  else panel(esc(w.ask(num(/** @type {any} */ (how).mb))), { yes: w.download, no: w.notNow });
}

/** The GPU where the browser has WebGPU and a GPU to give (and it hasn't failed here before), else the CPU. Exported for
 * the tests @returns {Promise<"gpu" | "cpu">} */
export async function way() {
  if (!how) {
    /** @type {any} */ var nav = navigator,
      gpu = false;
    try {
      gpu = !!nav.gpu && !localStorage.getItem(NO_GPU) && !!(await nav.gpu.requestAdapter());
    } catch (e) {
      gpu = false;
    }
    how = gpu ? WAYS.gpu : WAYS.cpu;
  }
  return how === WAYS.gpu ? "gpu" : "cpu";
}

/** Settings → More → About: where Listen runs its model on this device (#lswr): a chip icon (with a bolt on the GPU),
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
}

// In the tap (Listen, or Download): Safari starts sound and asks for the microphone only in one
function begin() {
  var w = menuWords("listen");
  /** @type {any} */ var win = window;
  ctx = new (win.AudioContext || win.webkitAudioContext)();
  var mic = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  phase = "load";
  panel(esc(model ? w.starting : w.downloading), { no: w.stop, progress: !model });
  prog.value = 0;
  Promise.all([mic, load()])
    .then(function (r) {
      return run(r[0]);
    })
    .catch(function (e) {
      if (phase === "off") return;
      console.warn("Listen:", e);
      var why = e && e.name === "NotAllowedError" ? w.noMic : !navigator.onLine ? w.offline : w.failed;
      stop();
      panel(esc(why), { no: w.close });
    });
}

function stop() {
  phase = "off";
  if (stream)
    stream.getTracks().forEach(function (t) {
      t.stop();
    });
  if (node) node.port.onmessage = null;
  if (ctx) ctx.close().catch(function () {});
  stream = null;
  node = null;
  ctx = null;
  if (wake) wake.release().catch(function () {});
  wake = null;
  clearInterval(ticker);
  mark = null;
  before = null;
  pace = PACE.start;
  shown = -1;
  pending = null;
  [].forEach.call(document.querySelectorAll(".lsn"), function (/** @type {Element} */ x) {
    x.classList.remove("lsn");
  });
  bar.hidden = true;
  btn.setAttribute("aria-pressed", "false");
}

// ==== The download, kept in its own cache ====

/** @returns {Promise<Cache | null>} */
function box() {
  return window.caches ? caches.open(CACHE).catch(() => null) : Promise.resolve(null);
}

/** @param {string} path */
function abs(path) {
  return new URL(path, document.baseURI).href;
}

/** Whether everything Listen needs is already on this phone */
async function stored() {
  var c = await box();
  if (!c) return false;
  var h = /** @type {(typeof WAYS)["cpu"]} */ (how),
    m = await c.match(abs(h.model + "model.json"));
  if (!m) return false;
  var info = await m.json(),
    files = [h.model + "letters.json", ORT + h.lib, TAP]
      .concat(
        h.wasm.map(function (x) {
          return ORT + x.file;
        }),
      )
      .concat(
        info.model.map(function (/** @type {any} */ x) {
          return h.model + x.file;
        }),
      );
  for (var f of files) if (!(await c.match(abs(f)))) return false;
  return true;
}

/** @param {ArrayBuffer | Uint8Array} buf */
async function sha256(buf) {
  var d = await crypto.subtle.digest("SHA-256", /** @type {BufferSource} */ (/** @type {unknown} */ (buf)));
  return Array.from(new Uint8Array(d))
    .map(function (b) {
      return b.toString(16).padStart(2, "0");
    })
    .join("");
}

/** One file: from the cache, else downloaded (counted in `done` as it comes), checked and kept
 * @param {Cache | null} c @param {string} path @param {string} [sum] @param {(n: number) => void} [tick] */
async function file(c, path, sum, tick) {
  var url = abs(path),
    m = c && (await c.match(url));
  if (m) {
    var kept = new Uint8Array(await m.arrayBuffer());
    if (tick) tick(kept.length);
    return kept;
  }
  // (no-store: never the service worker's copy, nor the browser's; this cache is the only one kept)
  var r = await fetch(url, { cache: "no-store" });
  if (!r.ok || !r.body) throw new Error(path + ": " + r.status);
  var reader = r.body.getReader(),
    /** @type {Uint8Array[]} */ parts = [],
    size = 0;
  for (;;) {
    var x = await reader.read();
    if (x.done) break;
    parts.push(x.value);
    size += x.value.length;
    if (tick) tick(x.value.length);
    if (phase === "off") throw new Error("stopped");
  }
  var all = join(parts, size);
  if (sum && (await sha256(all)) !== sum) throw new Error(path + " is damaged (its SHA-256 differs)");
  if (c) await c.put(url, new Response(all, { headers: { "Content-Type": r.headers.get("Content-Type") || "application/octet-stream" } }));
  return all;
}

/** @param {Uint8Array[]} parts @param {number} [size] */
function join(parts, size) {
  var all = new Uint8Array(
      size ||
        parts.reduce(function (n, x) {
          return n + x.length;
        }, 0),
    ),
    at = 0;
  parts.forEach(function (x) {
    all.set(x, at);
    at += x.length;
  });
  return all;
}

/** The library and the model, from the cache or downloaded; the progress bar counts the bytes */
async function load() {
  if (model) return;
  await way();
  var h = /** @type {(typeof WAYS)["cpu"]} */ (how),
    dir = h.model,
    c = await box(),
    info = JSON.parse(new TextDecoder().decode(await file(c, dir + "model.json"))),
    pieces = info.model,
    total =
      pieces.reduce(function (/** @type {number} */ n, /** @type {any} */ x) {
        return n + x.bytes;
      }, 0) +
      h.wasm.reduce(function (n, x) {
        return n + x.bytes;
      }, 0),
    done = 0;
  /** @param {number} n */
  function tick(n) {
    done += n;
    prog.value = Math.min(100, Math.round((100 * done) / total));
  }
  var wasm = [];
  for (var x of h.wasm) wasm.push(await file(c, ORT + x.file, undefined, tick));
  var binary = join(wasm);
  if ((await sha256(binary)) !== h.sha256) throw new Error("the library's WebAssembly is damaged");
  /** @param {any[]} list */
  async function joined(list) {
    var out = [];
    for (var p of list) out.push(await file(c, dir + p.file, p.sha256, tick));
    return join(out);
  }
  var weights = await joined(info.model),
    names = JSON.parse(new TextDecoder().decode(await file(c, dir + "letters.json")));
  // kept here too, so the service worker can give them offline (sw.js)
  await file(c, ORT + h.lib);
  await file(c, TAP);
  if (phase === "off") throw new Error("stopped");
  panel(esc(menuWords("listen").starting), { no: menuWords("listen").stop });
  if (!ort) {
    ort = await import(/* @vite-ignore */ abs(ORT + h.lib));
    ort.env.wasm.wasmBinary = binary.buffer;
    // every core (up to 4): the page is cross-origin isolated (_headers)
    ort.env.wasm.numThreads = window.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    // on the CPU, the model run in a worker of its own, not on the page's thread: there, each hearing held the page for
    // up to half a second, 42 s of every minute listening (Chromium on the M4, 2026-11-09), so scrolling and taps
    // stuck. (On the GPU the work is the GPU's, and the library has no worker for it)
    ort.env.wasm.proxy = h.ep === "wasm";
    // only real errors: on the GPU it notes, as an error, the few shape steps it leaves to the CPU (as meant)
    ort.env.logLevel = "error";
  }
  /** @type {Record<string, number>} */ var ids = {};
  names.forEach(function (/** @type {string} */ n, /** @type {number} */ i) {
    if (n && n !== "|") ids[n] = i;
  });
  try {
    var session = await ort.InferenceSession.create(weights, { executionProviders: [h.ep], logSeverityLevel: 3 });
  } catch (e) {
    if (h.ep === "wasm") throw e;
    // the GPU couldn't run it here: the CPU from now on, on this phone (its own model and library, downloaded now)
    console.warn("Listen: the GPU failed, the CPU instead:", e);
    try {
      localStorage.setItem(NO_GPU, "1");
    } catch (x) {}
    how = WAYS.cpu;
    showWay("cpu");
    ort = null;
    return load();
  }
  model = { info: info, names: names, ids: ids, session: session };
  if (c)
    tidy(
      c,
      [dir + "model.json", dir + "letters.json", ORT + h.lib, TAP].concat(
        h.wasm.map(function (w) {
          return ORT + w.file;
        }),
        pieces.map(function (/** @type {any} */ p) {
          return dir + p.file;
        }),
      ),
    );
}

/** An older model's files (a new chant-vN) taken out of the cache @param {Cache} c @param {string[]} keep */
function tidy(c, keep) {
  var want = keep.map(abs);
  c.keys()
    .then(function (ks) {
      ks.forEach(function (k) {
        if (want.indexOf(k.url) < 0) c.delete(k);
      });
    })
    .catch(function () {});
}

// ==== Listening ====

/** @param {MediaStream} s */
async function run(s) {
  if (phase === "off" || !ctx) {
    s.getTracks().forEach(function (t) {
      t.stop();
    });
    return;
  }
  stream = s;
  await ctx.resume();
  await ctx.audioWorklet.addModule(abs(TAP));
  // (Stop may have been tapped meanwhile)
  if (off() || !ctx) return;
  ring = new Float32Array(Math.round(ctx.sampleRate * WINDOW));
  got = 0;
  node = new AudioWorkletNode(ctx, "listen-tap");
  node.port.onmessage = function (e) {
    push(e.data);
  };
  ctx.createMediaStreamSource(s).connect(node);
  // (the tap writes nothing out; joined to the speakers only so that every browser runs it)
  node.connect(ctx.destination);
  phase = "run";
  aliveAt = performance.now();
  ticker = setInterval(tick, 250);
  panel(esc(menuWords("listen").listening), { no: menuWords("listen").stop, on: true });
  /** @type {any} */ var nav = navigator;
  if (nav.wakeLock)
    nav.wakeLock
      .request("screen")
      .then(function (/** @type {any} */ l) {
        wake = l;
      })
      .catch(function () {});
  loop();
}

// whether Listen is off (a function, as it changes while a step waits)
function off() {
  return phase === "off";
}

/** @param {Float32Array} chunk */
function push(chunk) {
  for (var i = 0; i < chunk.length; i++) ring[(got + i) % ring.length] = chunk[i];
  got += chunk.length;
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

async function loop() {
  var used = 0;
  while (phase === "run" && ctx) {
    if (performance.now() - aliveAt > IDLE * 60000) {
      var w = menuWords("listen");
      stop();
      panel(esc(w.idle(num(IDLE))), { no: w.close });
      break;
    }
    var rate = ctx.sampleRate;
    // at first, 2 seconds; then EVERY seconds of new sound at least
    if (got - used < rate * (used ? EVERY : 2)) {
      await sleep(100);
      continue;
    }
    used = got;
    var at = performance.now(),
      heard = last(),
      audio = resample(heard, rate, model.info.rate),
      power = 0;
    for (var i = 0; i < audio.length; i++) power += audio[i] * audio[i];
    // silence: the mark waits
    if (Math.sqrt(power / audio.length) < QUIET) {
      pauseAt(at);
      continue;
    }
    try {
      var out = await scores(audio);
    } catch (e) {
      console.warn("Listen:", e);
      await sleep(500);
      continue;
    }
    if (phase !== "run") break;
    // a step's moment: the window began its length before `at`, and the step is that many 20 ms into it
    var began = at - (1000 * heard.length) / rate,
      outputs = out.dims[2];
    // near the mark: the window lined up with the text there; else (or if it doesn't fit) its letters looked for
    if (mark && alignAt(logProbs(out.data, outputs), outputs, began)) continue;
    var ch = choices(out.data, outputs),
      cut = Math.max(0, ch.length - Math.round((TAIL * 1000) / model.info.step_ms)),
      t = mark && cut ? readLetters(ch.slice(cut), model.names, model.info.blank, model.info.word) : null;
    if (t && letters(t.text).length >= LEAST && follow(t.text, began + (cut + t.last + 1) * model.info.step_ms)) continue;
    var h = readLetters(ch, model.names, model.info.blank, model.info.word);
    if (h.last >= 0) follow(h.text, began + (h.last + 1) * model.info.step_ms);
  }
}

/** The window lined up with the text around where the mark is now; the place, if it fits, followed. Whether it did.
 * @param {Float32Array} lp  the window's log-probabilities @param {number} outputs @param {number} began  when the
 *   window's sound began (performance.now()) */
function alignAt(lp, outputs, began) {
  if (!mark) return false;
  var doc = texts()[mark.doc],
    now = performance.now(),
    here = ahead(mark, pace, now, doc.text.length),
    from = Math.max(0, Math.floor(here - BACK)),
    tg = target(doc.text.slice(from, Math.ceil(here + FORTH)), model.ids, from),
    a = align(lp, outputs, tg.ids, model.info.blank, model.info.word);
  if (!a || a.fit < FIT || a.letters < COVER) return false;
  var fresh = align(latest(lp, outputs, Math.round((RECENT * 1000) / model.info.step_ms)), outputs, tg.ids, model.info.blank, model.info.word);
  if (!fresh || fresh.fit < FIT) return false;
  var pos = tg.at[a.end] + 1;
  // the dhrupad said again after a stanza (lined up back where it is written, once): the mark waits where it is until
  // the text goes on, as locate() has it; the first time through, it is followed like any line
  if (doc.refrain[lineAt(doc, pos - 1)] && pos < here - COVER) pauseAt(now);
  else place(mark.doc, pos, began + (a.step + 1) * model.info.step_ms);
  return true;
}

/** The model's scores for each step of 16 kHz sound, each output's in turn (once Listen has started). Exported for
 * the tests, which compare them with the model's Python side (models/chant-vN/check.json)
 * @param {Float32Array} audio @returns {Promise<{ data: Float32Array, dims: number[] }>} */
export async function scores(audio) {
  var input = new ort.Tensor("float32", normalize(audio), [1, audio.length]);
  return (await model.session.run({ input_values: input })).logits;
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
  if (mark) mark = { doc: mark.doc, pos: ahead(mark, pace, now, texts()[mark.doc].text.length), t: now, paused: true };
}

/** What the model heard, followed: the place found becomes the mark, which moves on at the chanting's pace (tick)
 * until the next place found. Exported for the tests, which give it what the model would write.
 * @param {string} heard @param {number} [end]  when the sound heard ended (performance.now()), so the time the
 *   model took is made up for @returns {boolean} whether it was found (or another text heard, to be heard again) */
export function follow(heard, end) {
  var all = texts(),
    now = performance.now(),
    at = end === undefined ? now : end,
    cur = mark ? { doc: mark.doc, line: lineAt(all[mark.doc], Math.max(0, ahead(mark, pace, now, all[mark.doc].text.length) - 1)) } : null,
    r = locate(heard, all, cur);
  if (!r) return false;
  // the dhrupad: the mark waits where it is until the text goes on
  if (r.held) {
    pauseAt(now);
    return true;
  }
  // another text: only once it is heard twice in a row
  if (cur && r.doc !== cur.doc && !(pending && pending.doc === r.doc)) {
    pending = { doc: r.doc, line: r.line };
    return true;
  }
  pending = null;
  place(r.doc, r.end, at);
  return true;
}

/** A place found: the letter `pos` of a text was chanted at `at` (performance.now()); the mark set from there, the
 * pace measured, the text opened if it is another @param {number} doc @param {number} pos @param {number} at */
function place(doc, pos, at) {
  var all = texts(),
    /** @type {import("../core/follow.js").Mark} */ found = { doc: doc, pos: pos, t: at };
  pace = nextPace(pace, before, found);
  before = found;
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
  if (root.hasAttribute("data-hv") || !el.getClientRects().length) {
    var to = el;
    jumpTo(function () {
      to.scrollIntoView();
    }, "#" + id);
  }
  jumped = true;
  shown = -1;
  var en = nameLang() !== "mr";
  msg.innerHTML = menuWords("listen").following('<b lang="' + (en ? "en" : "mr") + '">' + esc(titleText(id, en)) + "</b>");
}

/** Move the mark on: the line where the chanting is now marked and kept in view. Runs a few times a second while
 * listening, and at once when a place is found */
function tick() {
  if (!mark) return;
  var now = performance.now(),
    doc = texts()[mark.doc];
  // nothing found for a while (a long pause, or talk): the mark stops rather than run on alone
  if (!mark.paused && now - seenAt > LOST) pauseAt(now);
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
  [].forEach.call(document.querySelectorAll(".lsn"), function (/** @type {Element} */ x) {
    x.classList.remove("lsn");
  });
  lines.forEach(function (x) {
    x.classList.add("lsn");
  });
  var force = jumped;
  jumped = false;
  if (!force && Date.now() - touched < CALM) return;
  var box = target.getBoundingClientRect(),
    top = topEdge() + 24,
    low = innerHeight * 0.6;
  if (force || box.top < top || box.bottom > low)
    scrollBy({ top: box.top - Math.max(top, innerHeight * 0.3), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

/** @param {Element} x */
function seen(x) {
  return x.getClientRects().length > 0;
}

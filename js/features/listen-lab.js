// @ts-check
// Listen lab (Satish, 2026-11-05): the chanting model (models/chant-v2/) run on the phone itself, to see before Listen
// is built whether a phone is fast enough to follow along. Opened by the address …/#listen-lab, or, in the app on the
// Home Screen (which has no address bar), by tapping the version in Settings → More five times; no button or menu;
// its words are English only and its look is set here, as the earlier Listen test's were. Nothing is kept: the model
// is downloaded each time it is loaded (76 MB, with cache "no-store", so the service worker leaves it alone), and the
// sound recorded is only held until it is transcribed.
// - Load (CPU) or Load (GPU): the library (vendor/onnxruntime/) and the model, with how long each took.
// - Check: a check sound, made here exactly as the model's Python side made it; the tokens must be the same, to the
//   token (models/chant-v2/check.json). Proves this phone computes what the Mac does.
// - Listen 6 s: six seconds from the microphone, then what the model heard and how long each step took.
// - Again: the last recording once more, for the timing alone.
// - Most tokens: how much each window may write (25, 40 or 60): about 25 are enough to find the place.
// The page is cross-origin isolated (_headers), so the model runs on every core (up to 4); "isolated" says so.
// Take it out when Listen is built (main.js, parts.js, index.html's modulepreload, its test).

import { features, nextToken, resample, tokensToText } from "../core/hearing.js";

var MODEL = "models/chant-v2/";
var ORT = "vendor/onnxruntime/";
var WASM_SHA256 = "3ad23231b5bd6d9dda55a7f84606315e0bf35b6750c28ee993c987c54cacab0f";

/** @type {HTMLElement | null} */ var box = null;
/** @type {HTMLElement} */ var out;
/** @type {any} */ var ort = null;
/** @type {any} */ var model = null;
/** @type {Float32Array | null} */ var last = null;
var busy = false,
  // the most tokens one window may write: about 25 are enough to find the place, and each takes about 20 ms
  most = 25;
/** @type {string[]} */ var log = [];

export function init() {
  window.addEventListener("hashchange", check);
  check();
  // five taps on the version within three seconds open the lab
  var ver = document.getElementById("ver"),
    taps = 0,
    first = 0;
  if (ver)
    ver.addEventListener("click", function () {
      var now = Date.now();
      if (now - first > 3000) {
        first = now;
        taps = 0;
      }
      if (++taps === 5) location.hash = "#listen-lab";
    });
}

function check() {
  if (location.hash === "#listen-lab") show();
  else if (box) hide();
}

/** @param {string} tag @param {Record<string, string>} [css] @param {string} [text] */
function el(tag, css, text) {
  var e = document.createElement(tag);
  if (css) Object.assign(e.style, css);
  if (text) e.textContent = text;
  return e;
}

/** @param {string} label @param {() => Promise<void> | void} fn */
function button(label, fn) {
  var b = /** @type {HTMLButtonElement} */ (
    el(
      "button",
      {
        minHeight: "44px",
        minWidth: "44px",
        padding: "0 14px",
        margin: "4px 6px 4px 0",
        font: "inherit",
        borderRadius: "10px",
        border: "1px solid var(--rule, #ccc)",
        background: "var(--surface, #f4ecd8)",
        color: "var(--ink, #222)",
        fontWeight: "600",
      },
      label,
    )
  );
  b.type = "button";
  b.addEventListener("click", function () {
    if (busy) return;
    setBusy(true);
    Promise.resolve()
      .then(fn)
      .catch(function (/** @type {any} */ e) {
        say("Failed: " + (e && e.message ? e.message : String(e)));
      })
      .finally(function () {
        setBusy(false);
      });
  });
  return b;
}

/** While one button's work runs, the others can't be pressed (and a test waits for them) @param {boolean} on */
function setBusy(on) {
  busy = on;
  if (box)
    [].forEach.call(box.querySelectorAll("button"), function (/** @type {HTMLButtonElement} */ b) {
      if (b.textContent === "Close") return;
      b.disabled = on;
      // (greyed out plainly while another button's work runs: the theme's own colours, at half strength)
      b.style.opacity = on ? "0.45" : "1";
    });
}

/** A line in the log, shown at the top @param {string} line */
function say(line) {
  log.unshift(line);
  out.textContent = log.join("\n");
}

function show() {
  if (box) return;
  box = el("div", {
    position: "fixed",
    inset: "0",
    zIndex: "9999",
    overflow: "auto",
    padding: "16px 16px 40px",
    background: "var(--bg, #fff)",
    color: "var(--ink, #222)",
    font: "16px/1.45 var(--lat, system-ui)",
  });
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Listen lab");
  var h = el("h2", { margin: "0 0 8px", font: "600 20px/1.3 var(--lat, system-ui)" }, "Listen lab");
  var about = el(
    "p",
    { margin: "0 0 12px" },
    "The chanting model on this phone. Load it (76 MB, on Wi-Fi), Check that it computes what the Mac does, then " +
      "Listen and chant for 6 seconds. Copy sends the results.",
  );
  var row = el("div");
  row.append(
    button("Load (CPU)", function () {
      return load("wasm");
    }),
    button("Load (GPU)", function () {
      return load("webgpu");
    }),
    button("Check", runCheck),
    button("Most tokens: 25", function () {
      most = most === 25 ? 40 : most === 40 ? 60 : 25;
      var b = /** @type {HTMLElement} */ (box && box.querySelector("[data-most]"));
      if (b) b.textContent = "Most tokens: " + most;
      say("Each window now writes at most " + most + " tokens.");
    }),
    button("Listen 6 s", listen),
    button("Again", again),
    button("Copy", function () {
      return navigator.clipboard.writeText(log.slice().reverse().join("\n")).then(function () {
        say("Copied.");
      });
    }),
    button("Close", function () {
      history.back();
    }),
  );
  var mostButton = row.children[3];
  if (mostButton) mostButton.setAttribute("data-most", "");
  out = el("pre", { whiteSpace: "pre-wrap", font: "14px/1.45 ui-monospace, monospace", margin: "12px 0 0" });
  out.setAttribute("aria-live", "polite");
  box.append(h, about, row, out);
  document.body.appendChild(box);
  /** @type {any} */ var nav = navigator;
  say(
    "Phone: " +
      navigator.userAgent +
      "\ncores " +
      (navigator.hardwareConcurrency || "?") +
      " · isolated " +
      window.crossOriginIsolated +
      " · WebGPU " +
      ("gpu" in nav ? "yes" : "no"),
  );
}

function hide() {
  if (box) box.remove();
  box = null;
}

/** A file from this site, never from the service worker's copy, with its size @param {string} url */
function get(url) {
  return fetch(url, { cache: "no-store" }).then(function (r) {
    if (!r.ok) throw new Error(url + ": " + r.status);
    return r.arrayBuffer();
  });
}

/** @param {ArrayBuffer} buf */
function sha256(buf) {
  return crypto.subtle.digest("SHA-256", buf).then(function (d) {
    return Array.from(new Uint8Array(d))
      .map(function (b) {
        return b.toString(16).padStart(2, "0");
      })
      .join("");
  });
}

/** Pieces of one file, fetched, checked and joined @param {{ file: string, bytes: number, sha256: string }[]} pieces */
async function joined(pieces) {
  var parts = [];
  for (var p of pieces) {
    var buf = await get(MODEL + p.file);
    if ((await sha256(buf)) !== p.sha256) throw new Error(p.file + " is damaged (its SHA-256 differs)");
    parts.push(new Uint8Array(buf));
  }
  var all = new Uint8Array(
    parts.reduce(function (n, x) {
      return n + x.length;
    }, 0),
  );
  var at = 0;
  parts.forEach(function (x) {
    all.set(x, at);
    at += x.length;
  });
  return all;
}

/** The library and the model, run on the CPU (wasm) or the GPU (webgpu) @param {string} ep */
async function load(ep) {
  var t0 = performance.now();
  if (!ort) {
    var a = await get(ORT + "ort-wasm-simd-threaded.jsep.wasm"),
      b = await get(ORT + "ort-wasm-simd-threaded.jsep.wasm.2"),
      wasm = new Uint8Array(a.byteLength + b.byteLength);
    wasm.set(new Uint8Array(a), 0);
    wasm.set(new Uint8Array(b), a.byteLength);
    if ((await sha256(wasm.buffer)) !== WASM_SHA256) throw new Error("the library's WebAssembly is damaged");
    var url = ORT + "ort.bundle.min.mjs";
    ort = await import(/* @vite-ignore */ new URL(url, location.href).href);
    ort.env.wasm.wasmBinary = wasm.buffer;
    // (several threads need a cross-origin isolated page; one is what every phone gets for now)
    ort.env.wasm.numThreads = window.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    say("Library loaded in " + Math.round(performance.now() - t0) + " ms");
  }
  var t1 = performance.now();
  var info = await (await fetch(MODEL + "model.json", { cache: "no-store" })).json(),
    melBuf = await get(MODEL + "mel.bin"),
    texts = await (await fetch(MODEL + "tokens.json", { cache: "no-store" })).json(),
    enc = await joined(info.encoder),
    dec = await joined(info.decoder);
  var t2 = performance.now();
  var opts = { executionProviders: [ep] },
    encoder = await ort.InferenceSession.create(enc, opts),
    decoder = await ort.InferenceSession.create(dec, opts);
  model = { info: info, mel: new Float32Array(melBuf), texts: texts, encoder: encoder, decoder: decoder, ep: ep };
  say(
    "Model loaded on the " +
      (ep === "webgpu" ? "GPU" : "CPU (" + ort.env.wasm.numThreads + (ort.env.wasm.numThreads > 1 ? " cores)" : " core)")) +
      ": download " +
      Math.round(t2 - t1) +
      " ms, start " +
      Math.round(performance.now() - t2) +
      " ms",
  );
}

/** What the model hears in up to 30 s of 16 kHz sound, with how long each step took @param {Float32Array} audio */
async function transcribe(audio) {
  if (!model) throw new Error("Load the model first");
  var t0 = performance.now(),
    e = await encode(audio),
    t2 = performance.now(),
    d = await decode(e.hidden, null),
    t3 = performance.now();
  return {
    tokens: d.wrote,
    text: tokensToText(d.wrote, model.texts, model.info.first_special),
    ms: { features: e.featuresMs, encoder: t2 - t0 - e.featuresMs, decoder: t3 - t2, total: t3 - t0 },
  };
}

/** The sound features and the encoder's output @param {Float32Array} audio */
async function encode(audio) {
  var info = model.info,
    t0 = performance.now(),
    feats = features(audio, model.mel, info.sound),
    t1 = performance.now(),
    input = new ort.Tensor("float32", feats, [1, info.sound.mels, feats.length / info.sound.mels]);
  return { hidden: (await model.encoder.run({ input_features: input })).last_hidden_state, featuresMs: t1 - t0 };
}

/** The decoder, token by token through its cache: each step's choice (the likeliest token it may write) and by how
 * much it beats the next best. Free, each choice is the next input, to the end token; forced, the next input is always
 * the next of `force` (the check: shravan/package.py forced) @param {any} hidden @param {number[] | null} force */
async function decode(hidden, force) {
  var info = model.info;
  /** @type {Record<string, any>} */ var past = {};
  var empty = new ort.Tensor("float32", new Float32Array(0), [1, 8, 0, 64]);
  for (var i = 0; i < info.layers; i++)
    ["decoder", "encoder"].forEach(function (s) {
      ["key", "value"].forEach(function (k) {
        past["past_key_values." + i + "." + s + "." + k] = empty;
      });
    });
  var step = info.start.slice(),
    /** @type {number[]} */ wrote = [],
    /** @type {[number, number][]} */ choices = [],
    limit = force ? force.length : most;
  for (var n = 0; n < limit; n++) {
    var feed = Object.assign(
      {
        input_ids: new ort.Tensor("int64", BigInt64Array.from(step.map(BigInt)), [1, step.length]),
        encoder_hidden_states: hidden,
        use_cache_branch: new ort.Tensor("bool", [n > 0], [1]),
      },
      past,
    );
    var res = await model.decoder.run(feed),
      logits = res.logits,
      vocab = logits.dims[2],
      row = logits.data.subarray((logits.dims[1] - 1) * vocab, logits.dims[1] * vocab),
      token = nextToken(row, info.never, info.never_first, n === 0),
      second = nextToken(row, info.never.concat([token]), info.never_first, n === 0);
    choices.push([token, row[token] - row[second]]);
    if (force) token = force[n];
    else if (token === info.end) break;
    wrote.push(token);
    Object.keys(past).forEach(function (k) {
      // (the encoder's keys and values are made on the first step only, then kept)
      if (n === 0 || k.indexOf(".decoder.") >= 0) past[k] = res[k.replace("past_key_values", "present")];
    });
    step = [token];
  }
  return { wrote: wrote, choices: choices };
}

/** @param {{ tokens: number[], ms: Record<string, number> }} r */
function timing(r) {
  return (
    "features " +
    Math.round(r.ms.features) +
    " ms · encoder " +
    Math.round(r.ms.encoder) +
    " ms · writing " +
    Math.round(r.ms.decoder) +
    " ms (" +
    r.tokens.length +
    " tokens, " +
    Math.round(r.ms.decoder / Math.max(r.tokens.length, 1)) +
    " ms each) · total " +
    Math.round(r.ms.total) +
    " ms"
  );
}

/** The check sound, exactly as shravan/package.py makes it (3 s of rising and falling tones) */
function tone() {
  var n = 48000,
    a = new Float32Array(n);
  for (var i = 0; i < n; i++) {
    var t = i / 16000;
    a[i] = 0.3 * Math.sin(2 * Math.PI * (220 + 60 * t) * t) + 0.2 * Math.sin(2 * Math.PI * 440 * t) * Math.cos(2 * Math.PI * 0.5 * t);
  }
  return a;
}

/** The check (models/chant-v2/check.json): the encoder's numbers within 0.25 of the Mac's, and the decoder, fed the
 * Mac's tokens, choosing as the Mac did at every step where the choice is clear (a margin over 0.3). Free-running
 * greedy can part ways at a near tie (two tokens 0.09 apart) without anything being wrong, so it isn't compared. */
async function runCheck() {
  if (!model) throw new Error("Load the model first");
  var want = await (await fetch(MODEL + "check.json", { cache: "no-store" })).json(),
    t0 = performance.now(),
    e = await encode(tone()),
    hidden = e.hidden,
    width = hidden.dims[2],
    worst = 0;
  Object.keys(want.hidden).forEach(function (row) {
    want.hidden[row].forEach(function (/** @type {number} */ v, /** @type {number} */ i) {
      worst = Math.max(worst, Math.abs(hidden.data[Number(row) * width + i] - v));
    });
  });
  var d = await decode(hidden, want.tokens),
    clear = 0,
    agree = 0;
  want.steps.forEach(function (/** @type {[number, number]} */ s, /** @type {number} */ i) {
    if (s[1] <= 0.3) return;
    clear++;
    if (d.choices[i] && d.choices[i][0] === s[0]) agree++;
  });
  // (the encoder's int8 arithmetic rounds in its own order in WebAssembly: Chromium came within 0.155 of the Mac on
  // numbers up to about 1.3, and the decoder still chose exactly as the Mac did; that agreement is what counts)
  var ok = worst < 0.25 && agree === clear;
  say(
    (ok ? "Check passed" : "Check FAILED") +
      ": the encoder within " +
      worst.toFixed(4) +
      " of the Mac's; the decoder chose as the Mac did at " +
      agree +
      " of " +
      clear +
      " clear steps · " +
      Math.round(performance.now() - t0) +
      " ms",
  );
}

async function listen() {
  var stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  /** @type {any} */ var w = window;
  var ctx = new (w.AudioContext || w.webkitAudioContext)(),
    src = ctx.createMediaStreamSource(stream),
    // (a ScriptProcessor: simple, and in every browser; the real Listen will use an AudioWorklet)
    node = ctx.createScriptProcessor(4096, 1, 1),
    /** @type {Float32Array[]} */ chunks = [];
  node.onaudioprocess = function (/** @type {AudioProcessingEvent} */ e) {
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };
  src.connect(node);
  node.connect(ctx.destination);
  say("Listening for 6 seconds…");
  await new Promise(function (res) {
    setTimeout(res, 6000);
  });
  node.disconnect();
  src.disconnect();
  stream.getTracks().forEach(function (t) {
    t.stop();
  });
  var rate = ctx.sampleRate;
  await ctx.close();
  var raw = new Float32Array(
    chunks.reduce(function (n, c) {
      return n + c.length;
    }, 0),
  );
  var at = 0;
  chunks.forEach(function (c) {
    raw.set(c, at);
    at += c.length;
  });
  last = resample(raw, rate, 16000);
  var r = await transcribe(last);
  say("Heard: " + (r.text || "(nothing)") + "\n  " + timing(r) + " · microphone at " + rate + " Hz");
}

async function again() {
  if (!last) throw new Error("Listen first");
  var r = await transcribe(last);
  say("Again: " + timing(r));
}

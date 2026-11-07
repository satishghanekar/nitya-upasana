// @ts-check
// Listen (Satish, 2026-11-06): the phone hears the chanting and shows where it is. Tap Listen (the ear in the bottom
// bar) while an aarti or a chant is going on: the line being chanted is marked (.lsn) and kept in view, the text is
// opened if another one is on screen, and the place follows the chanting until Stop. Everything happens on the phone:
// no sound leaves it.
// - The model (models/chant-v2/, Whisper base trained in the shravan-model repository, about 76 MB) and the library
//   that runs it (vendor/onnxruntime/, about 28 MB) are downloaded once, the first time, after the reader agrees, and
//   kept in their own cache, "nitya-listen", which a new version of the site leaves alone (sw.js). Each piece is
//   checked against its SHA-256 before it is kept.
// - The microphone feeds an AudioWorklet (js/worklets/listen-tap.js), so no sound is lost while the model works.
//   Every time the model is free, it hears the last WINDOW seconds (at most MOST tokens: on an iPhone with 4 cores,
//   about 1.1 s for the encoder and 20 ms a token, measured 2026-11-06) and js/core/follow.js finds the place.
// - Moving to another text needs it heard twice in a row, so one misheard window never takes the reader away.
// - The page scrolls only while the reader leaves it alone (CALM after a touch, a wheel or a key).

import { features, nextToken, resample, tokensToText } from "../core/hearing.js";
import { locate, makeDoc, pieceLines } from "../core/follow.js";
import { pieceEl, root } from "../core/page.js";
import { unfold } from "../core/apply.js";
import { menuWords } from "../core/strings.js";
import { esc, nameLang, num } from "../core/words.js";
import { titleText } from "../text/iast.js";
import { jumpTo } from "./history.js";
import { topEdge } from "./bottom-bar.js";

var MODEL = "models/chant-v2/",
  ORT = "vendor/onnxruntime/",
  TAP = "js/worklets/listen-tap.js",
  CACHE = "nitya-listen",
  // the library's WebAssembly, in two pieces (vendor/onnxruntime/README.md), checked whole
  WASM = [
    { file: "ort-wasm-simd-threaded.jsep.wasm", bytes: 20000000 },
    { file: "ort-wasm-simd-threaded.jsep.wasm.2", bytes: 8312028 },
  ],
  WASM_SHA256 = "3ad23231b5bd6d9dda55a7f84606315e0bf35b6750c28ee993c987c54cacab0f",
  // the download, in MB, as the question names it: the model's pieces (models/chant-v2/model.json) and the library
  SIZE_MB = 105,
  // seconds of sound heard each time, and the most tokens written for it: about 30 letters, the whole window
  WINDOW = 5,
  MOST = 40,
  // quieter than this (the sound's RMS) is silence, not worth hearing
  QUIET = 0.003,
  // ms after the reader's own touch, wheel or key before Listen scrolls the page again
  CALM = 5000;

/** off: nothing; ask: the download question; load: downloading and starting; run: listening @type {"off" | "ask" | "load" | "run"} */
var phase = "off";
/** @type {HTMLButtonElement} */ var btn;
/** @type {HTMLElement} */ var bar;
/** @type {HTMLElement} */ var msg;
/** @type {HTMLProgressElement} */ var prog;
/** @type {HTMLButtonElement} */ var yes;
/** @type {HTMLButtonElement} */ var no;
/** @type {any} */ var ort = null;
/** @type {any} */ var model = null;
/** @type {AudioContext | null} */ var ctx = null;
/** @type {MediaStream | null} */ var stream = null;
/** @type {AudioWorkletNode | null} */ var node = null;
/** @type {Float32Array} */ var ring = new Float32Array(0);
var got = 0;
/** @type {any} */ var wake = null;
/** the texts searched: every piece, in the page's order, and each one's letters @type {any[]} */ var order = [];
/** @type {import("../core/follow.js").Doc[] | null} */ var docs = null;
/** @type {{ doc: number, line: number } | null} */ var here = null;
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
  if (model || (await stored())) begin();
  else panel(esc(w.ask(num(SIZE_MB))), { yes: w.download, no: w.notNow });
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
  here = null;
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
  var m = await c.match(abs(MODEL + "model.json"));
  if (!m) return false;
  var info = await m.json(),
    files = [MODEL + "mel.bin", MODEL + "tokens.json", ORT + "ort.bundle.min.mjs", TAP]
      .concat(
        WASM.map(function (x) {
          return ORT + x.file;
        }),
      )
      .concat(
        info.encoder.concat(info.decoder).map(function (/** @type {any} */ x) {
          return MODEL + x.file;
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
  var c = await box(),
    info = JSON.parse(new TextDecoder().decode(await file(c, MODEL + "model.json"))),
    pieces = info.encoder.concat(info.decoder),
    total =
      pieces.reduce(function (/** @type {number} */ n, /** @type {any} */ x) {
        return n + x.bytes;
      }, 0) +
      WASM.reduce(function (n, x) {
        return n + x.bytes;
      }, 0),
    done = 0;
  /** @param {number} n */
  function tick(n) {
    done += n;
    prog.value = Math.min(100, Math.round((100 * done) / total));
  }
  var wasm = [];
  for (var x of WASM) wasm.push(await file(c, ORT + x.file, undefined, tick));
  var binary = join(wasm);
  if ((await sha256(binary)) !== WASM_SHA256) throw new Error("the library's WebAssembly is damaged");
  /** @param {any[]} list */
  async function joined(list) {
    var out = [];
    for (var p of list) out.push(await file(c, MODEL + p.file, p.sha256, tick));
    return join(out);
  }
  var enc = await joined(info.encoder),
    dec = await joined(info.decoder),
    mel = await file(c, MODEL + "mel.bin"),
    texts = JSON.parse(new TextDecoder().decode(await file(c, MODEL + "tokens.json")));
  // kept here too, so the service worker can give them offline (sw.js)
  await file(c, ORT + "ort.bundle.min.mjs");
  await file(c, TAP);
  if (phase === "off") throw new Error("stopped");
  panel(esc(menuWords("listen").starting), { no: menuWords("listen").stop });
  if (!ort) {
    ort = await import(/* @vite-ignore */ abs(ORT + "ort.bundle.min.mjs"));
    ort.env.wasm.wasmBinary = binary.buffer;
    // every core (up to 4): the page is cross-origin isolated (_headers)
    ort.env.wasm.numThreads = window.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
  }
  var opts = { executionProviders: ["wasm"] };
  model = {
    info: info,
    mel: new Float32Array(mel.buffer, mel.byteOffset, mel.length / 4),
    texts: texts,
    encoder: await ort.InferenceSession.create(enc, opts),
    decoder: await ort.InferenceSession.create(dec, opts),
  };
  if (c)
    tidy(
      c,
      [MODEL + "model.json", MODEL + "mel.bin", MODEL + "tokens.json", ORT + "ort.bundle.min.mjs", TAP].concat(
        WASM.map(function (w) {
          return ORT + w.file;
        }),
        pieces.map(function (/** @type {any} */ p) {
          return MODEL + p.file;
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
    var rate = ctx.sampleRate;
    // at first, 3 seconds; then a second of new sound at least
    if (got - used < rate * (used ? 1 : 3)) {
      await sleep(200);
      continue;
    }
    used = got;
    var audio = resample(last(), rate, model.info.sound.rate),
      power = 0;
    for (var i = 0; i < audio.length; i++) power += audio[i] * audio[i];
    if (Math.sqrt(power / audio.length) < QUIET) continue;
    try {
      var text = await hear(audio);
    } catch (e) {
      console.warn("Listen:", e);
      await sleep(500);
      continue;
    }
    if (phase !== "run") break;
    follow(text);
  }
}

/** What the model hears in up to 30 s of 16 kHz sound @param {Float32Array} audio @returns {Promise<string>} */
async function hear(audio) {
  var info = model.info,
    feats = features(audio, model.mel, info.sound),
    input = new ort.Tensor("float32", feats, [1, info.sound.mels, feats.length / info.sound.mels]),
    hidden = (await model.encoder.run({ input_features: input })).last_hidden_state;
  // the decoder, token by token through its cache (as the model's Python side runs it)
  /** @type {Record<string, any>} */ var past = {};
  var empty = new ort.Tensor("float32", new Float32Array(0), [1, 8, 0, 64]);
  for (var l = 0; l < info.layers; l++)
    ["decoder", "encoder"].forEach(function (s) {
      ["key", "value"].forEach(function (k) {
        past["past_key_values." + l + "." + s + "." + k] = empty;
      });
    });
  var step = info.start.slice(),
    /** @type {number[]} */ wrote = [];
  for (var n = 0; n < MOST; n++) {
    var res = await model.decoder.run(
        Object.assign(
          {
            input_ids: new ort.Tensor("int64", BigInt64Array.from(step.map(BigInt)), [1, step.length]),
            encoder_hidden_states: hidden,
            use_cache_branch: new ort.Tensor("bool", [n > 0], [1]),
          },
          past,
        ),
      ),
      logits = res.logits,
      vocab = logits.dims[2],
      token = nextToken(logits.data.subarray((logits.dims[1] - 1) * vocab, logits.dims[1] * vocab), info.never, info.never_first, n === 0);
    if (token === info.end) break;
    wrote.push(token);
    Object.keys(past).forEach(function (k) {
      // (the encoder's keys and values are made on the first step only, then kept)
      if (n === 0 || k.indexOf(".decoder.") >= 0) past[k] = res[k.replace("past_key_values", "present")];
    });
    step = [token];
  }
  return tokensToText(wrote, model.texts, info.first_special);
}

// ==== Following ====

/** What the model heard, followed: the place found, marked and kept in view (exported for the tests, which give it
 * what the model would write) @param {string} heard */
export function follow(heard) {
  if (!docs) {
    /** @type {any} */ var C = /** @type {any} */ (window).CONTENT;
    order = [];
    C.categories.forEach(function (/** @type {any} */ c) {
      c.pieces.forEach(function (/** @type {any} */ p) {
        order.push(p);
      });
    });
    docs = order.map(function (p) {
      return makeDoc(pieceLines(p));
    });
  }
  var r = locate(heard, docs, here);
  if (!r || r.held) return;
  // another text: only once it is heard twice in a row
  if (here && r.doc !== here.doc && !(pending && pending.doc === r.doc)) {
    pending = { doc: r.doc, line: r.line };
    return;
  }
  pending = null;
  var moved = !here || here.doc !== r.doc;
  here = { doc: r.doc, line: r.line };
  show(order[r.doc].id, r.line, moved);
}

/** Mark the line being chanted and keep it in view, opening its text first if another is on screen
 * @param {string} id @param {number} line @param {boolean} moved */
function show(id, line, moved) {
  var el = pieceEl(id);
  if (!el) return;
  var away = root.hasAttribute("data-hv") || !el.getClientRects().length;
  if (away) {
    unfold(el);
    var to = el;
    jumpTo(function () {
      to.scrollIntoView();
    }, "#" + id);
  }
  [].forEach.call(document.querySelectorAll(".lsn"), function (/** @type {Element} */ x) {
    x.classList.remove("lsn");
  });
  var mr = el.querySelectorAll(".verse .mr p"),
    en = el.querySelectorAll(".verse .en p"),
    marked = [mr[line], en[line]].filter(Boolean);
  // (a dhrupad said again where the page shows it once: the dhrupad at the top)
  if (!marked.some(seen)) marked = [].slice.call(el.querySelectorAll(".rftop .verse p"));
  marked.forEach(function (x) {
    x.classList.add("lsn");
  });
  if (moved) {
    var en2 = nameLang() !== "mr";
    msg.innerHTML = menuWords("listen").following('<b lang="' + (en2 ? "en" : "mr") + '">' + esc(titleText(id, en2)) + "</b>");
  }
  var target = marked.filter(seen)[0];
  if (!target || (!away && Date.now() - touched < CALM)) return;
  var box = target.getBoundingClientRect(),
    top = topEdge() + 24,
    low = innerHeight * 0.6;
  if (away || box.top < top || box.bottom > low)
    scrollBy({ top: box.top - Math.max(top, innerHeight * 0.3), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

/** @param {Element} x */
function seen(x) {
  return x.getClientRects().length > 0;
}

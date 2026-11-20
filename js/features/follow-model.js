// @ts-check
// Follow's model (2026-11-20, out of js/features/listen.js, which keeps the listening): the model and the library that
// runs it, from the download to the moment it is let go. Listen asks it for the model (ensure()), hears through it
// (scores()), and tells it when Follow starts and stops (use()); About's rows show it (js/features/follow-model-rows.js).
// - Two ways to run it (WAYS, way()): on the GPU where the browser has WebGPU (models/chant-v6-q4/, 4-bit, in ONNX
//   Runtime's own format, and the library's WebGPU build, about 117 MB), else on the CPU (models/chant-v6/, 8-bit, and
//   its CPU build, about 122 MB). Downloaded once, after the reader agrees, into a cache of its own, "nitya-listen",
//   which a new version of the site leaves alone (sw.js); each piece checked against its SHA-256 before it is kept,
//   and read straight into one buffer of the whole size (filesInto), never held twice.
// - One load at a time, whoever asks (ensure()): Stop and Follow again while it downloads or starts takes up the same
//   load, never a second one beside it (Satish, 2026-11-20: two loads at once held the model twice, as much as Safari
//   closed the page for).
// - Every wait ends (js/core/net.js): a download that stops coming in, a GPU that never answers the check sound, a
//   hearing that never comes back. A model that stops answering is given up (broken()): it can't be stopped or freed in
//   this page, so Follow offers to restart the app.
// - One library per page: a copy of ONNX Runtime, once loaded, stays in the page until it closes, with the memory it
//   took, and on the GPU the device it made. So a GPU that fails (or fails with its subgroups used) is not tried again,
//   nor the CPU loaded beside it, in this page: the reason is kept (js/features/fast-mode-report.js), and the app opens
//   again to start the next way afresh (Satish, 2026-11-20: the CPU's library loaded beside the GPU's held both).
// - Its memory is let go (release()) two minutes after Follow stops (LINGER: Stop and Follow again in a moment starts
//   at once), at once when the app is put away, or from About's Free memory (js/features/follow-model-rows.js). The
//   download stays; About's Downloaded switch takes it off the phone (remove()), or downloads it ahead (fetchFiles()).

import { fetchWithin, readBody, timedOut, within } from "../core/net.js";
import { choices, normalize } from "../core/hearing.js";
import { ALIKE_LEAST, alike, checkSound } from "../core/gpu-report.js";
import { menuWords } from "../core/strings.js";
import { num } from "../core/words.js";
import * as fast from "./fast-mode-report.js";
import * as followed from "./follow-report.js";

export var ORT = "vendor/onnxruntime/",
  TAP = "js/worklets/listen-tap.js",
  CACHE = "nitya-listen";
/** The two ways to run the model (Satish, 2026-11-09): on the GPU where the browser has WebGPU, else on the CPU. On
 * an iPhone (Safari 27) a 4 s hearing took 712 ms on the CPU and 233 ms on the GPU with 4-bit weights (the 8-bit
 * model on the GPU: 825 ms; 16-bit: 142 ms but 189 MB), each hearing as well on the held-out recordings. Each way:
 * its model, its library (vendor/onnxruntime/README.md) and the library's WebAssembly, in pieces under 20 MB and
 * checked whole, and the download in MB as the question names it.
 * @typedef {{ model: string, lib: string, wasm: { file: string, bytes: number }[], sha256: string, mb: number, ep: string }} Way
 * @type {Record<"gpu" | "cpu", Way>} */
export var WAYS = {
  gpu: {
    model: "models/chant-v6-q4/",
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
    model: "models/chant-v6/",
    lib: "ort.wasm.bundle.min.mjs",
    wasm: [{ file: "ort-wasm-simd-threaded.wasm", bytes: 14239897 }],
    sha256: "3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2",
    mb: 122,
    ep: "wasm",
  },
};
var // fast mode on trial (js/features/fast-mode-report.js): the most ms the GPU may take over the check sound before it
  // is given up (a GPU that hangs; a phone's takes well under a second, Chromium's software GPU in the tests 30 to 40 s)
  CHECK_WAIT = 60000,
  // remembered once the GPU has worked here with its subgroups turned off (below, sgOff)
  NO_SUBGROUPS = "nitya-gpu-no-subgroups",
  // ms a download may go with nothing coming in before it is given up (the connection dropped without saying so)
  STALL = 30000,
  // ms a small file (the model's list, its letters, the library) may take to start coming in
  ASK_WAIT = 30000,
  // a hearing that never comes back (a GPU or a worker that hung): given up after HEAR_TIMES the slowest hearing so far
  // (the check sound counts), and never sooner than HEAR_LEAST ms; the first, with nothing measured, after FIRST_WAIT
  HEAR_TIMES = 5,
  HEAR_LEAST = 20000,
  FIRST_WAIT = 60000,
  // ms the model stays in memory after Follow stops, so Stop and Follow again starts at once
  LINGER = 120000;

/** The GPU's subgroups turned off for ONNX Runtime (2026-11-20, the cross-device test of chant-v6-q4): with them, its
 * 4-bit kernel (MatMulNBits) takes a path that calls subgroupShuffle, tested only at SwiftShader's subgroup size of 4;
 * phones' GPUs have 64 or 128, and some Android drivers get it wrong. Without them it takes another kernel, as right
 * and as fast. A GPU that fails with them is tried once more without them (after the app opens again) before the CPU. */
var sgOff = false;
/** @type {any} the browser's own requestAdapter, once wrapped (guardGpu) */ var gpuAsk = null;
/** the adapters whose requestDevice is wrapped already (a browser may give the same one twice) */ var wrapped = new WeakSet();

/** the way the model runs on this phone, once chosen (way()) @type {Way | null} */ var how = null;
/** the choice under way, or made @type {Promise<void> | null} */ var choosing = null;
/** ONNX Runtime, once loaded in this page (never loaded twice: above) @type {any} */ var ort = null;
/** the model, while it is in memory @type {{ info: any, names: string[], ids: Record<string, number>, session: any } | null} */
var model = null;
/** the load under way, which every start waits on @type {Promise<void> | null} */ var loading = null;
/** what the load under way reports to: the start waiting on it now @type {Watch} */ var watch = { progress: none, starting: none };
/** why the model can't go on in this page ("gpu": the GPU failed; "stuck": a hearing never came back), or "" */
var broke = "";
/** Follow is on, from the tap to Stop (use()) */ var follow = false;
/** About's Download is under way (the files only: the model is started only for Follow) */ var fetchOnly = false;
/** @type {any} */ var lingerT = 0;
/** the slowest hearing so far, in ms (the hearing's time limit) */ var slowest = 0;

/** @typedef {{ progress: (percent: number) => void, starting: () => void }} Watch */

function none() {}

/** Whether this browser can follow at all: the microphone, an AudioWorklet and WebAssembly */
export function supported() {
  return !!(navigator.mediaDevices && window.AudioWorkletNode && window.WebAssembly);
}

/** The GPU where the browser has WebGPU and a GPU to give (and it hasn't failed here before), else the CPU: chosen
 * once, whoever asks first (About's two groups ask at the same moment, and asking for the GPU wakes it)
 * @returns {Promise<"gpu" | "cpu">} */
export function way() {
  if (!choosing)
    choosing = (async function () {
      /** @type {any} */ var nav = navigator,
        gpu = false;
      try {
        gpu = !!nav.gpu && !fast.failedHere() && !!(await nav.gpu.requestAdapter());
      } catch (e) {
        gpu = false;
      }
      how = gpu ? WAYS.gpu : WAYS.cpu;
    })();
  return choosing.then(function () {
    return how === WAYS.gpu ? "gpu" : "cpu";
  });
}

/** The way chosen, once way() has run @returns {Way} */
export function chosen() {
  return /** @type {Way} */ (how);
}

/** The model's folder name ("chant-v6-q4") @param {Way} h */
export function modelName(h) {
  return h.model.replace(/^models\/|\/$/g, "");
}

/** The model, while it is in memory */
export function current() {
  return model;
}

/** Why the model can't go on in this page, or "" (Follow then offers to restart the app) */
export function broken() {
  return broke;
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

/** @param {Uint8Array} b */
function text(b) {
  return new TextDecoder().decode(b);
}

function stopped() {
  var e = new Error("stopped");
  e.name = "AbortError";
  return e;
}

/** Whether everything Follow needs is already on this phone */
export async function stored() {
  try {
    // (asked without opening the cache: opening it makes an empty one, as if something were kept after Remove)
    if (!window.caches || !(await caches.has(CACHE))) return false;
    var c = await box();
    if (!c) return false;
    await way();
    var h = chosen(),
      m = await c.match(abs(h.model + "model.json"));
    if (!m) return false;
    var info = await m.json();
    for (var f of keepList(h, info)) if (!(await c.match(abs(f)))) return false;
    return true;
  } catch (e) {
    // (a copy that can't be read, a cache that refuses: as if nothing were kept, so it is downloaded again)
    return false;
  }
}

/** Every file a way keeps in the cache (the check sound only on the GPU) @param {Way} h @param {any} info */
function keepList(h, info) {
  return [h.model + "model.json", h.model + "letters.json", ORT + h.lib, TAP].concat(h.ep === "webgpu" ? [h.model + "check.json"] : []).concat(
    h.wasm.map(function (x) {
      return ORT + x.file;
    }),
    info.model.map(function (/** @type {any} */ x) {
      return h.model + x.file;
    }),
  );
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

/** A response from the network, given up if nothing answers in time (no-store: never the service worker's copy, nor
 * the browser's; this cache is the only one kept) @param {string} url @param {string} path */
function download(url, path) {
  return fetchWithin(url, { cache: "no-store" }, ASK_WAIT).then(function (r) {
    if (!r.ok || !r.body) throw new Error(path + ": " + r.status);
    return r;
  });
}

/** Kept in the cache; a full phone says so in words Follow can show (QuotaExceededError) @param {Cache} c
 * @param {string} url @param {Uint8Array} bytes @param {Response} r */
function keep(c, url, bytes, r) {
  return c.put(
    url,
    new Response(/** @type {BodyInit} */ (/** @type {unknown} */ (bytes)), {
      headers: { "Content-Type": r.headers.get("Content-Type") || "application/octet-stream" },
    }),
  );
}

/** One small file (the model's list of pieces, its letters, the library): from the cache, else downloaded and kept
 * @param {Cache | null} c @param {string} path */
async function file(c, path) {
  var url = abs(path),
    m = c && (await c.match(url));
  if (m) return new Uint8Array(await m.arrayBuffer());
  var r = await download(url, path),
    /** @type {Uint8Array[]} */ parts = [],
    size = await readBody(
      r,
      function (x) {
        parts.push(x);
      },
      { stall: STALL, stopped: unwanted, what: path },
    ),
    all = new Uint8Array(size);
  parts.reduce(function (at, x) {
    all.set(x, at);
    return at + x.length;
  }, 0);
  if (c) await keep(c, url, all, r);
  return all;
}

/**
 * Files read one after another into one buffer of their whole size, each straight into its place: from the cache, or
 * downloaded (checked against its SHA-256 where it has one) and kept. A file is never held twice: reading the files
 * into pieces and joining them once held the model three and four times over, 430 MB for its 122 MB (Chromium on the
 * M4, 2026-11-15), and Safari closed the page and opened it again, on an iPhone 16 Pro too.
 * @param {Cache | null} c @param {{ path: string, bytes: number, sha256?: string }[]} list @param {(n: number) => void} tick
 * @returns {Promise<Uint8Array>}
 */
async function filesInto(c, list, tick) {
  var all = new Uint8Array(
      list.reduce(function (n, x) {
        return n + x.bytes;
      }, 0),
    ),
    at = 0;
  for (var f of list) {
    var url = abs(f.path),
      m = c && (await c.match(url)),
      r = m || (await download(url, f.path)),
      n = 0,
      long = false,
      start = at,
      size = f.bytes;
    await readBody(
      r,
      function (x) {
        if (n + x.length > size) return !(long = true);
        all.set(x, start + n);
        n += x.length;
        tick(x.length);
      },
      { stall: STALL, stopped: unwanted, what: f.path },
    );
    var view = all.subarray(at, at + f.bytes);
    if (long || n !== f.bytes || (!m && f.sha256 && (await sha256(view)) !== f.sha256)) {
      // (a copy kept damaged is let go, so the next start downloads it again)
      if (m && c) await c.delete(url);
      throw new Error(f.path + " is damaged (its size or SHA-256 differs)");
    }
    // (the cache takes its own copy of the bytes, for the moment it writes them)
    if (!m && c) await keep(c, url, view, r);
    at += f.bytes;
  }
  return all;
}

/** Room on the phone for what is still to come: a phone too full fails before the download, not 100 MB into it
 * @param {Cache | null} c @param {{ path: string, bytes: number }[]} list */
async function roomFor(c, list) {
  /** @type {any} */ var st = navigator.storage;
  if (!c || !st || !st.estimate) return;
  var need = 0;
  for (var f of list) if (!(await c.match(abs(f.path)))) need += f.bytes;
  if (!need) return;
  var e = await st.estimate().catch(function () {
    return null;
  });
  if (!e || !e.quota) return;
  if (e.quota - (e.usage || 0) < need * 1.05) throw full(need);
}

/** The error a phone too full ends a download with; `mb` is what more Follow needs @param {number} bytes */
function full(bytes) {
  var e = /** @type {Error & { mb?: number }} */ (new Error("not enough space on this phone for " + Math.ceil(bytes / 1e6) + " MB"));
  e.name = "QuotaExceededError";
  e.mb = Math.ceil(bytes / 1e6);
  return e;
}

/** Another model's files (an older chant-vN, or the other way's) taken out of the cache, before this one downloads, so
 * the two are never kept at once @param {Cache} c @param {string[]} keep */
async function tidy(c, keep) {
  var want = keep.map(abs),
    ks = await c.keys().catch(function () {
      return /** @type {readonly Request[]} */ ([]);
    });
  await Promise.all(
    ks.map(function (k) {
      return want.indexOf(k.url) < 0 ? c.delete(k).catch(function () {}) : null;
    }),
  );
}

// ==== Loading ====

/** Whether nobody wants the load any more (Follow stopped, and was not started again meanwhile, and About's Download
 * isn't under way) */
function unwanted() {
  return !follow && !fetchOnly;
}

/**
 * The model in memory, loaded once whoever asks: a start that comes while another's load is under way takes it up, and
 * reports its own progress from then on. Fails with a TimeoutError (a download stalled, a GPU that never answered), an
 * AbortError (nobody wants it any more), a QuotaExceededError (`mb`: the room still needed), or, when the model can't
 * go on in this page, with broken() saying why.
 * @param {Watch} w @returns {Promise<void>}
 */
export function ensure(w) {
  watch = w;
  if (broke) return Promise.reject(new Error("Follow needs the app to open again: " + broke));
  if (model) return Promise.resolve();
  if (!loading)
    loading = load().finally(function () {
      loading = null;
    });
  return loading;
}

/** The library and the model, from the cache or downloaded; the progress counted in bytes */
async function load() {
  await way();
  var h = chosen(),
    dir = h.model,
    onGpu = h.ep === "webgpu",
    c = await box(),
    began = performance.now();
  if (onGpu) {
    try {
      sgOff = sgOff || localStorage.getItem(NO_SUBGROUPS) === "1" || fast.retryWithoutSubgroups();
    } catch (e) {}
    guardGpu();
  }
  var info = JSON.parse(text(await file(c, dir + "model.json"))),
    wasm = h.wasm.map(function (x) {
      return { path: ORT + x.file, bytes: x.bytes };
    }),
    pieces = info.model.map(function (/** @type {any} */ p) {
      return { path: dir + p.file, bytes: p.bytes, sha256: p.sha256 };
    }),
    total = wasm.concat(pieces).reduce(function (n, x) {
      return n + x.bytes;
    }, 0),
    done = 0;
  if (c) await tidy(c, keepList(h, info));
  await roomFor(c, wasm.concat(pieces));
  /** @param {number} n */
  function tick(n) {
    done += n;
    watch.progress(Math.min(100, Math.round((100 * done) / total)));
  }
  var binary = await filesInto(c, wasm, tick);
  if ((await sha256(binary)) !== h.sha256) throw new Error("the library's WebAssembly is damaged");
  var weights = await filesInto(c, pieces, tick),
    names = JSON.parse(text(await file(c, dir + "letters.json")));
  // kept here too, so the service worker can give them offline (sw.js)
  await file(c, ORT + h.lib);
  await file(c, TAP);
  if (onGpu) await file(c, dir + "check.json");
  if (unwanted()) throw stopped();
  // (About's Download alone: the files are kept, and the model is started only when Follow wants it)
  if (!follow) return;
  if (onGpu) {
    // fast mode on trial from here: a page that dies from now on is found out on the next opening
    if (!fast.trying()) await fast.begin(modelName(h));
    fast.took("download or cache", performance.now() - began);
    fast.step("starting the model");
  }
  watch.starting();
  if (!ort) {
    // (with the subgroups off, its own copy of the library, as the address names it: the GPU's device is asked for with
    // the subgroups left out from the start)
    ort = await import(/* @vite-ignore */ abs(ORT + h.lib) + (onGpu && sgOff ? "?subgroups=off" : ""));
    ort.env.wasm.wasmBinary = binary.buffer;
    // on the CPU every core (up to 4): the page is cross-origin isolated (_headers). On the GPU one: the work is the
    // GPU's, and each thread costs memory. Safari closed the page and opened it again as Follow started, on an iPhone
    // 16 Pro too (2026-11-15); with one thread and the 4-bit model in ONNX Runtime's own format (models/README.md) the
    // start took about 100 MB less in the page and 150 MB less in the GPU's process, and half the time (Chromium's
    // software GPU)
    ort.env.wasm.numThreads = onGpu ? 1 : window.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    // on the CPU, the model run in a worker of its own, not on the page's thread: there, each hearing held the page for
    // up to half a second, 42 s of every minute listening (Chromium on the M4, 2026-11-09), so scrolling and taps
    // stuck. (On the GPU the work is the GPU's, and the library has no worker for it)
    ort.env.wasm.proxy = !onGpu;
    // only real errors: on the GPU it notes, as an error, the few shape steps it leaves to the CPU (as meant)
    ort.env.logLevel = "error";
    var ver = String((ort.env.versions && ort.env.versions.common) || "");
    if (onGpu) fast.library(ver);
    followed.library(ver);
  }
  /** @type {Record<string, number>} */ var ids = {};
  names.forEach(function (/** @type {string} */ n, /** @type {number} */ i) {
    if (n && n !== "|") ids[n] = i;
  });
  /** @type {any} */ var session = null;
  try {
    var t = performance.now();
    session = await ort.InferenceSession.create(weights, {
      executionProviders: [h.ep],
      logSeverityLevel: 3,
    });
    // (the library has its own copy now)
    weights = new Uint8Array(0);
    if (onGpu) {
      fast.took("starting the model", performance.now() - t);
      watchGpu();
      // a GPU can start the model and still compute it wrong, or never answer: the check sound, heard before it is trusted
      fast.step("hearing the check sound");
      await checkOn(session, c, dir);
      fast.step("listening");
      if (sgOff)
        try {
          localStorage.setItem(NO_SUBGROUPS, "1");
        } catch (x) {}
    }
  } catch (e) {
    if (session) session.release().catch(function () {});
    if (!onGpu) {
      fast.cpu("standard mode (CPU) failed too: " + ((e && /** @type {any} */ (e).message) || e));
      throw e;
    }
    // the GPU couldn't run it here: kept for About's Share report and for the next opening, which tries the GPU without
    // its subgroups (if they were used) or else the CPU (fast-mode-report.js failedHere, retryWithoutSubgroups)
    fast.failed(e);
    give("gpu", e);
    throw e;
  }
  if (!follow) {
    // (Follow stopped while it started: let go at once, as nobody waits for it)
    session.release().catch(function () {});
    if (fetchOnly) return;
    throw stopped();
  }
  if (!onGpu) fast.cpu("standard mode (CPU) started and works");
  model = { info: info, names: names, ids: ids, session: session };
  changed();
}

/** Why a start or a download failed, in the reader's words @param {any} e */
export function whyFailed(e) {
  var w = menuWords("listen");
  if (e && e.name === "NotAllowedError") return w.noMic;
  if (e && e.name === "QuotaExceededError") return w.noSpace(num(e.mb || chosen().mb));
  if (timedOut(e)) return w.stalled;
  return !navigator.onLine ? w.offline : w.failed;
}

/** The GPU ONNX Runtime made, watched while fast mode is on trial: lost, or an error nobody caught, goes in the report */
function watchGpu() {
  try {
    Promise.resolve(ort.env.webgpu && ort.env.webgpu.device)
      .then(function (/** @type {any} */ d) {
        if (!d) return;
        if (d.lost)
          d.lost.then(function (/** @type {any} */ i) {
            fast.note("GPU device lost: " + (i && i.reason) + " " + (i && i.message));
          });
        if (d.addEventListener)
          d.addEventListener("uncapturederror", function (/** @type {any} */ e) {
            fast.note("GPU error: " + (e && e.error && e.error.message));
          });
      })
      .catch(function () {});
  } catch (e) {}
}

/** The check sound heard on the GPU and compared with the model's own answers (models/chant-vN/check.json): too slow
 * to answer (CHECK_WAIT) or too unlike them (ALIKE_LEAST), and the GPU is given up here
 * @param {any} session @param {Cache | null} c @param {string} dir */
async function checkOn(session, c, dir) {
  var check = JSON.parse(text(await file(c, dir + "check.json"))),
    input = new ort.Tensor("float32", normalize(checkSound()), [1, 48000]),
    t = performance.now(),
    out = (await within(session.run({ input_values: input }), CHECK_WAIT, "the GPU on the check sound")).logits,
    ms = performance.now() - t,
    data = out.data || (await out.getData()),
    n = out.dims[2],
    far = 0;
  // (the hearings that follow take about as long as this one: their time limit counts from it)
  slowest = Math.max(slowest, ms);
  Object.keys(check.scores || {}).forEach(function (step) {
    check.scores[step].forEach(function (/** @type {number} */ v, /** @type {number} */ o) {
      far = Math.max(far, Math.abs(data[Number(step) * n + o] - v));
    });
  });
  var a = alike(choices(data, n), check.ids);
  fast.checked({
    ms: Math.round(ms),
    alike: a,
    far: Math.round(far * 100) / 100,
  });
  if (a < ALIKE_LEAST) throw new Error("the GPU heard the check sound wrong: " + Math.round(a * 1000) / 10 + "% of steps right");
}

/** The GPU's device as ONNX Runtime asks for it: the features it asks for noted, and the subgroups taken out while
 * sgOff (wrapped once, before the library is loaded) */
function guardGpu() {
  /** @type {any} */ var g = /** @type {any} */ (navigator).gpu;
  if (!g || gpuAsk) return;
  gpuAsk = g.requestAdapter.bind(g);
  g.requestAdapter = function (/** @type {any} */ o) {
    return gpuAsk(o).then(function (/** @type {any} */ a) {
      if (!a || !a.requestDevice || wrapped.has(a)) return a;
      wrapped.add(a);
      var ask = a.requestDevice.bind(a);
      try {
        a.requestDevice = function (/** @type {any} */ d) {
          var want = Array.from((d && d.requiredFeatures) || []),
            has = want.indexOf("subgroups") >= 0;
          if (sgOff)
            want = want.filter(function (f) {
              return f !== "subgroups" && f !== "subgroup-size-control";
            });
          fast.subgroups(!has ? "none" : sgOff ? "off" : "on", want);
          return ask(Object.assign({}, d || {}, { requiredFeatures: want }));
        };
      } catch (e) {}
      return a;
    });
  };
}

// ==== Hearing ====

/** The longest a hearing may take before the model is given up @returns {number} */
function hearWait() {
  return slowest ? Math.max(HEAR_LEAST, HEAR_TIMES * slowest) : FIRST_WAIT;
}

/** The model's scores for each step of 16 kHz sound, each output's in turn. A hearing that never comes back (a GPU or
 * the library's worker hung) fails with a TimeoutError, and the model is given up in this page (broken())
 * @param {Float32Array} audio @returns {Promise<{ data: Float32Array, dims: number[] }>} */
export async function scores(audio) {
  var m = model;
  if (!m) throw new Error("the model is not loaded");
  var input = new ort.Tensor("float32", normalize(audio), [1, audio.length]),
    t = performance.now();
  try {
    var out = (await within(m.session.run({ input_values: input }), hearWait(), "the model")).logits;
  } catch (e) {
    if (timedOut(e)) give("stuck", e);
    throw e;
  }
  slowest = Math.max(slowest, performance.now() - t);
  return out;
}

/** The model can't go on in this page: let go as far as it can be, why kept for Follow and, on the GPU, for About's
 * report and the next opening (which then tries the next way) @param {"gpu" | "stuck"} why @param {any} e */
function give(why, e) {
  if (broke) return;
  broke = why;
  console.warn("Follow: the model can't go on in this page (" + why + "):", e);
  if (why === "stuck" && how === WAYS.gpu) {
    // (a GPU trusted before that hangs now, or one still on trial: the next opening tries the next way)
    if (fast.trying()) fast.failed(e);
    else fast.failedLater(modelName(chosen()), e);
  }
  var m = model;
  model = null;
  if (m) m.session.release().catch(function () {});
  changed();
}

// ==== In use, and let go ====

/** Follow started, at the tap (true), or stopped (false): the model stays in memory LINGER ms after it stops, then is
 * let go (at once if the app is put away) @param {boolean} on */
export function use(on) {
  follow = on;
  clearTimeout(lingerT);
  if (!on && model) {
    if (document.hidden) release();
    else lingerT = setTimeout(release, LINGER);
  }
  changed();
}

/** The model let go from memory (its download stays): the GPU's buffers and the page's copies. Never while Follow is on */
export function release() {
  clearTimeout(lingerT);
  if (!model || follow) return;
  var m = model;
  model = null;
  m.session.release().catch(function () {});
  changed();
}

/** The download taken off the phone (and the model out of memory). Never while Follow is on or a load is under way
 * @returns {Promise<boolean>} whether it was removed */
export async function remove() {
  if (follow || loading) return false;
  release();
  var gone = window.caches ? await caches.delete(CACHE).catch(() => false) : false;
  changed();
  return gone;
}

/** The files downloaded and kept, without starting the model (About's Download) @param {(percent: number) => void} progress */
export async function fetchFiles(progress) {
  fetchOnly = true;
  changed();
  try {
    await ensure({ progress: progress, starting: none });
  } finally {
    fetchOnly = false;
    changed();
  }
}

/** Something about the model changed: About's rows follow (js/features/follow-model-rows.js) */
function changed() {
  document.dispatchEvent(new Event("nitya-follow-model"));
}

/** What About's rows show @returns {{ follow: boolean, fetching: boolean, loaded: boolean }} */
export function state() {
  return { follow: follow, fetching: fetchOnly, loaded: !!model };
}

export function init() {
  // the app put away: nothing to keep the model for until Follow starts again
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && !follow) release();
  });
}

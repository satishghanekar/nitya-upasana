// @ts-check
// Hearing the chanting: the arithmetic around the chanting model (models/chant-vN/, trained in the shravan-model
// repository), with no page and no model in it, so the unit tests (tests/unit/hearing.test.mjs) check it in Node
// against what the model's own Python side computes (models/chant-vN/check.json).
// - sound → the model's input: 30 seconds of 16 kHz sound as 80 × 3000 log-mel numbers, exactly as Whisper's
//   feature extractor makes them (a 400-sample Hann window every 160 samples, 80 mel filters, log10, the top 8 kept);
// - the model's output → letters: its tokens' texts joined and read back as UTF-8 (GPT-2's byte-to-letter table);
// - choosing each token: the likeliest one, never one of the tokens the model must not write.
// No init(): nothing here touches the page.

/** Whisper's sound settings @typedef {{ rate: number, fft: number, hop: number, mels: number, seconds: number }} Sound */

/** Every sample rate's sound brought to `to` samples a second (a whole ratio averages each group, so no tone above
 * the new limit folds back as noise; any other ratio is read between samples)
 * @param {Float32Array} input @param {number} from @param {number} to @returns {Float32Array} */
export function resample(input, from, to) {
  if (from === to) return input;
  var ratio = from / to,
    n = Math.floor(input.length / ratio),
    out = new Float32Array(n);
  if (Number.isInteger(ratio)) {
    for (var i = 0; i < n; i++) {
      var s = 0;
      for (var j = 0; j < ratio; j++) s += input[i * ratio + j];
      out[i] = s / ratio;
    }
    return out;
  }
  for (var k = 0; k < n; k++) {
    var at = k * ratio,
      a = Math.floor(at),
      f = at - a;
    out[k] = input[a] * (1 - f) + (input[a + 1] || 0) * f;
  }
  return out;
}

/** The cosine and sine of each frequency at each sample of a window (worked out once per size) @type {Record<number, { c: Float32Array, s: Float32Array, w: Float32Array }>} */
var TABLES = {};

/** @param {number} fft */
function tables(fft) {
  if (TABLES[fft]) return TABLES[fft];
  var bins = fft / 2 + 1,
    c = new Float32Array(bins * fft),
    s = new Float32Array(bins * fft),
    w = new Float32Array(fft);
  // (the periodic Hann window, as numpy and torch make it for a spectrogram)
  for (var n = 0; n < fft; n++) w[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / fft);
  for (var k = 0; k < bins; k++)
    for (var m = 0; m < fft; m++) {
      c[k * fft + m] = Math.cos((2 * Math.PI * k * m) / fft);
      s[k * fft + m] = Math.sin((2 * Math.PI * k * m) / fft);
    }
  return (TABLES[fft] = { c: c, s: s, w: w });
}

/** The model's input for up to 30 seconds of sound (16 kHz, -1 … 1): 80 rows of 3000 numbers, row by row, as Whisper
 * makes them. Frames past the sound are silence and all come out the same, so only those that touch it are worked out.
 * @param {Float32Array} audio @param {Float32Array} filters  the mel filters, 201 × 80 (models/chant-vN/mel.bin)
 * @param {Sound} sound @returns {Float32Array} */
export function features(audio, filters, sound) {
  var fft = sound.fft,
    hop = sound.hop,
    mels = sound.mels,
    total = sound.rate * sound.seconds,
    frames = total / hop,
    bins = fft / 2 + 1,
    half = fft / 2,
    len = Math.min(audio.length, total),
    t = tables(fft),
    logs = new Float32Array(mels * frames),
    frame = new Float32Array(fft),
    power = new Float32Array(bins);
  // a sample of the sound padded to 30 s, its ends mirrored (as a centred spectrogram pads them)
  /** @param {number} i */
  function at(i) {
    if (i < 0) i = -i;
    if (i >= total) i = 2 * (total - 1) - i;
    return i < len ? audio[i] : 0;
  }
  var silent = Math.log10(1e-10),
    busy = Math.min(frames, Math.ceil((len + half) / hop) + 1),
    top = -Infinity;
  for (var f = 0; f < frames; f++) {
    if (f >= busy) {
      for (var q = 0; q < mels; q++) logs[q * frames + f] = silent;
      continue;
    }
    for (var n = 0; n < fft; n++) frame[n] = at(f * hop - half + n) * t.w[n];
    for (var k = 0; k < bins; k++) {
      var re = 0,
        im = 0,
        row = k * fft;
      for (var m = 0; m < fft; m++) {
        re += frame[m] * t.c[row + m];
        im -= frame[m] * t.s[row + m];
      }
      power[k] = re * re + im * im;
    }
    for (var p = 0; p < mels; p++) {
      var e = 0;
      for (var b = 0; b < bins; b++) e += filters[b * mels + p] * power[b];
      var v = Math.log10(Math.max(e, 1e-10));
      logs[p * frames + f] = v;
      if (v > top) top = v;
    }
  }
  if (silent > top) top = silent;
  // the top 8 (on a log10 scale) kept, then brought to about -1 … 1
  for (var z = 0; z < logs.length; z++) logs[z] = (Math.max(logs[z], top - 8) + 4) / 4;
  return logs;
}

/** GPT-2's table from a token's letters back to the bytes they stand for @type {Record<string, number> | null} */
var BYTES = null;

function byteTable() {
  if (BYTES) return BYTES;
  /** @type {number[]} */ var bs = [];
  for (var i = 33; i <= 126; i++) bs.push(i);
  for (i = 161; i <= 172; i++) bs.push(i);
  for (i = 174; i <= 255; i++) bs.push(i);
  var cs = bs.slice(),
    extra = 0;
  for (var b = 0; b < 256; b++)
    if (bs.indexOf(b) < 0) {
      bs.push(b);
      cs.push(256 + extra++);
    }
  /** @type {Record<string, number>} */ var t = {};
  bs.forEach(function (x, j) {
    t[String.fromCharCode(cs[j])] = x;
  });
  return (BYTES = t);
}

/** What the model wrote, as letters: its tokens' texts joined and read as UTF-8; special tokens (the start, the
 * language, the end) are left out @param {number[]} ids @param {string[]} texts  models/chant-vN/tokens.json
 * @param {number} firstSpecial @returns {string} */
export function tokensToText(ids, texts, firstSpecial) {
  var t = byteTable(),
    /** @type {number[]} */ bytes = [];
  ids.forEach(function (id) {
    if (id >= firstSpecial) return;
    for (var ch of texts[id] || "") if (t[ch] !== undefined) bytes.push(t[ch]);
  });
  return new TextDecoder().decode(new Uint8Array(bytes)).trim();
}

/** The likeliest next token that the model may write: never one of `never`, and on the first step never one of
 * `neverFirst` (a space, or the end before anything was written) @param {Float32Array} logits  one row, the
 * vocabulary's length @param {number[]} never @param {number[]} neverFirst @param {boolean} first @returns {number} */
export function nextToken(logits, never, neverFirst, first) {
  /** @type {Record<number, boolean>} */ var skip = {};
  never.forEach(function (i) {
    skip[i] = true;
  });
  if (first)
    neverFirst.forEach(function (i) {
      skip[i] = true;
    });
  var best = -1,
    most = -Infinity;
  for (var i = 0; i < logits.length; i++)
    if (!skip[i] && logits[i] > most) {
      most = logits[i];
      best = i;
    }
  return best;
}

// @ts-check
// Hearing the chanting: the arithmetic around the chanting model (models/chant-vN/, a CTC model, wav2vec2, trained in
// the shravan-model repository), with no page and no model in it, so the unit tests (tests/unit/hearing.test.mjs)
// check it in Node against what the model's own Python side computes (models/chant-vN/check.json).
// - sound → the model's input: the microphone's sound at 16 kHz, brought to mean 0 and spread 1, as it was trained;
// - the model's output → letters: for every 20 ms (step_ms) of sound it scores each of its outputs (a letter, the
//   word break "|", or the blank: nothing new said); the likeliest at each step, a letter held over several steps
//   counted once, the blank between two of the same letter. The step of the last letter says when it was said, so
//   Listen knows how far the chanting has gone, not only what it was (Satish, 2026-11-07: a CTC model in place of
//   Whisper, which took about two seconds on a phone whatever it heard).
// No init(): nothing here touches the page.

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

/** The sound as the model heard it in training: mean 0 and spread 1, so a quiet phone and a loud one sound alike
 * @param {Float32Array} audio @returns {Float32Array} */
export function normalize(audio) {
  var n = audio.length,
    mean = 0,
    v = 0;
  for (var i = 0; i < n; i++) mean += audio[i];
  mean /= n || 1;
  for (i = 0; i < n; i++) v += (audio[i] - mean) * (audio[i] - mean);
  var scale = 1 / Math.sqrt(v / (n || 1) + 1e-7),
    out = new Float32Array(n);
  for (i = 0; i < n; i++) out[i] = (audio[i] - mean) * scale;
  return out;
}

/** The likeliest output at each step @param {Float32Array} scores  steps × outputs, step by step
 * @param {number} outputs @returns {number[]} */
export function choices(scores, outputs) {
  var steps = scores.length / outputs,
    /** @type {number[]} */ out = [];
  for (var s = 0; s < steps; s++) {
    var best = 0,
      row = s * outputs;
    for (var o = 1; o < outputs; o++) if (scores[row + o] > scores[row + best]) best = o;
    out.push(best);
  }
  return out;
}

/** The model's choices as words, and the step its last letter began on (-1: no letter)
 * @param {number[]} ids  one a step (choices) @param {string[]} names  each output's letter, "" for one that is not a
 *   letter (models/chant-vN/letters.json) @param {number} blank @param {number} word  the word break
 * @returns {{ text: string, last: number }} */
export function readLetters(ids, names, blank, word) {
  var out = "",
    last = -1,
    before = -1;
  ids.forEach(function (id, step) {
    if (id !== before && id !== blank) {
      if (id === word) out += " ";
      else if (names[id]) {
        out += names[id];
        last = step;
      }
    }
    before = id;
  });
  return { text: out.split(" ").filter(Boolean).join(" "), last: last };
}

// @ts-check
// Lining the sound up with the text (Satish, 2026-11-07): where in a stretch of a text the last few seconds of
// chanting are, straight from the chanting model's scores (js/core/hearing.js), not from the letters it would write.
// Reading the letters first and then looking for them (js/core/follow.js locate) loses whatever the model was unsure
// of; here every letter of the text is scored against every 20 ms step, so a misheard letter costs only a little, and
// the place found is the letter, not only the line. Used while Listen knows roughly where the chanting is; when it
// doesn't (at the start, or lost), the letters and locate() find the place first.
//
// The method is CTC's own (the "forced alignment" of speech tools): the text's letters in order, each one held over
// one step or more, with "nothing said" (the blank) allowed between them, and the best path through the window's
// steps found by dynamic programming. The window may start and end anywhere in the stretch (the chanting began before
// it and goes on after). No init(): nothing here touches the page.

/** Each step's scores as log-probabilities (each row's log-softmax), so they can be added along a path
 * @param {Float32Array} scores  steps × outputs @param {number} outputs @returns {Float32Array} */
export function logProbs(scores, outputs) {
  var out = new Float32Array(scores.length);
  for (var row = 0; row < scores.length; row += outputs) {
    var top = -Infinity,
      sum = 0,
      o;
    for (o = 0; o < outputs; o++) if (scores[row + o] > top) top = scores[row + o];
    for (o = 0; o < outputs; o++) sum += Math.exp(scores[row + o] - top);
    var log = top + Math.log(sum);
    for (o = 0; o < outputs; o++) out[row + o] = scores[row + o] - log;
  }
  return out;
}

/** A stretch of text as the model's outputs: each letter's output, and where it is in the text's letters (a letter
 * the model has no output for is left out) @param {string} letters  as js/core/follow.js letters() gives them
 * @param {Record<string, number>} ids  each letter's output @param {number} from  where the stretch starts in the text
 * @returns {{ ids: number[], at: number[] }} */
export function target(letters, ids, from) {
  /** @type {number[]} */ var out = [],
    /** @type {number[]} */ at = [];
  for (var i = 0; i < letters.length; i++) {
    var id = ids[letters[i]];
    if (id !== undefined) {
      out.push(id);
      at.push(from + i);
    }
  }
  return { ids: out, at: at };
}

/** The best path of the window through a stretch of text. Returns the letter it ends on (an index into `ids`), the
 * step that letter began on, how many letters it covered, and how well it fits: the path's log-probability a step,
 * less that of the model's own likeliest output at each step (0 is as good as the model's own reading; the further
 * below, the less the window sounds like this stretch). Null when the stretch is empty.
 * @param {Float32Array} lp  log-probabilities, steps × outputs (logProbs) @param {number} outputs
 * @param {number[]} ids  the stretch's letters as outputs (target) @param {number} blank @param {number} word  the word
 *   break, said or not anywhere, counted as the blank
 * @returns {{ end: number, step: number, letters: number, fit: number } | null} */
export function align(lp, outputs, ids, blank, word) {
  var steps = lp.length / outputs,
    L = ids.length,
    S = 2 * L + 1;
  if (!L || !steps) return null;
  // states: 2k the blank before letter k, 2k + 1 letter k (2L: the blank after the last)
  var cur = new Float64Array(S),
    nxt = new Float64Array(S),
    // for each state, the letter last entered on the path to it and the step it was entered on
    lastL = new Int32Array(S),
    lastT = new Int32Array(S),
    nL = new Int32Array(S),
    nT = new Int32Array(S),
    // and the letter the path first entered (how much of the stretch it covered)
    firstL = new Int32Array(S),
    nF = new Int32Array(S),
    best = 0;
  /** @param {number} t @param {number} s */
  function emit(t, s) {
    var row = t * outputs;
    if (s % 2 === 0) return Math.max(lp[row + blank], lp[row + word]);
    return lp[row + ids[(s - 1) / 2]];
  }
  // the window may start anywhere: any state, at no cost for the text before it
  for (var s = 0; s < S; s++) {
    cur[s] = emit(0, s);
    lastL[s] = s % 2 ? (s - 1) / 2 : -1;
    lastT[s] = s % 2 ? 0 : -1;
    firstL[s] = s % 2 ? (s - 1) / 2 : s / 2;
  }
  for (var t = 1; t < steps; t++) {
    for (s = 0; s < S; s++) {
      // stay, or come from the state before, or (a letter) skip the blank between two different letters
      var v = cur[s],
        from = s;
      if (s > 0 && cur[s - 1] > v) {
        v = cur[s - 1];
        from = s - 1;
      }
      if (s > 1 && s % 2 && ids[(s - 1) / 2] !== ids[(s - 3) / 2] && cur[s - 2] > v) {
        v = cur[s - 2];
        from = s - 2;
      }
      nxt[s] = v + emit(t, s);
      nF[s] = firstL[from];
      if (s % 2 && from !== s) {
        nL[s] = (s - 1) / 2;
        nT[s] = t;
      } else {
        nL[s] = lastL[from];
        nT[s] = lastT[from];
      }
    }
    for (s = 0; s < S; s++) {
      cur[s] = nxt[s];
      lastL[s] = nL[s];
      lastT[s] = nT[s];
      firstL[s] = nF[s];
    }
  }
  // the window may end anywhere: the best state at the last step
  for (s = 1; s < S; s++) if (cur[s] > cur[best]) best = s;
  var own = 0;
  for (t = 0; t < steps; t++) {
    var row = t * outputs,
      top = -Infinity;
    for (var o = 0; o < outputs; o++) if (lp[row + o] > top) top = lp[row + o];
    own += top;
  }
  if (lastL[best] < 0) return null;
  return { end: lastL[best], step: lastT[best], letters: lastL[best] - firstL[best] + 1, fit: (cur[best] - own) / steps };
}

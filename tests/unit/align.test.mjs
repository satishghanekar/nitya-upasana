// Lining the sound up with the text (js/core/align.js): made-up scores, as the model would give them for a stretch of
// chanting, lined up with a text; the letter it ends on, when that letter began, and how well it fits.
import { describe, expect, test } from "vitest";
import { align, latest, logProbs, target } from "../../js/core/align.js";

// a small alphabet: 0 the blank, 1 the word break, then the letters
const IDS = { क: 2, म: 3, ल: 4, न: 5, ग: 6 };
const O = 7;
// scores for a run of outputs, one a step: the one given scores 5, the rest 0 (sure, but not certain); a step given
// as [a, b]: a likeliest, b next (the model unsure between two letters)
function scores(run) {
  const s = new Float32Array(run.length * O);
  run.forEach((o, t) => {
    const [a, b] = [].concat(o);
    s[t * O + a] = 5;
    if (b !== undefined) s[t * O + b] = 3.5;
  });
  return logProbs(s, O);
}

describe("logProbs", () => {
  test("each step's scores become log-probabilities, which add up to 1", () => {
    const lp = logProbs(new Float32Array([1, 2, 3, 0, 0, 0]), 3);
    expect(Math.exp(lp[0]) + Math.exp(lp[1]) + Math.exp(lp[2])).toBeCloseTo(1, 6);
    expect(Math.exp(lp[3])).toBeCloseTo(1 / 3, 6);
  });
});

describe("target", () => {
  test("the letters as outputs, with where each is in the text; a letter with no output left out", () => {
    expect(target("कमxल", IDS, 100)).toEqual({ ids: [2, 3, 4], at: [100, 101, 103] });
  });
});

describe("align", () => {
  const text = target("गकमलनगकम", IDS, 0);
  test("the window heard ends on the letter last said, wherever it is in the stretch", () => {
    // heard: क म ल, each held two steps, a blank between
    const a = align(scores([0, 2, 2, 0, 3, 3, 1, 4, 4, 0]), O, text.ids, 0, 1);
    expect(a.end).toBe(3);
    // (ल began on step 7)
    expect(a.step).toBe(7);
    expect(a.letters).toBe(3);
    expect(a.fit).toBeCloseTo(0, 1);
  });
  test("a misheard letter costs only a little: the place is still found", () => {
    // heard: क म न (ल misheard as न, ल the model's second choice)
    const a = align(scores([2, 2, 3, 3, [5, 4], [5, 4], 0]), O, target("गकमलगग", IDS, 0).ids, 0, 1);
    expect(a.end).toBe(3);
    expect(a.fit).toBeLessThan(-0.3);
  });
  test("the same letters twice in the stretch: one of the two places", () => {
    // heard: ग क म, at the start of "ग क म ल न ग क म" and at its end
    const a = align(scores([6, 6, 2, 2, 3, 3]), O, text.ids, 0, 1);
    expect([2, 7]).toContain(a.end);
  });
  test("a window that sounds like nothing in the stretch fits badly, or lines up with no letter at all", () => {
    const a = align(scores([5, 5, 5, 5, 4, 4, 4, 4]), O, target("कमकमकम", IDS, 0).ids, 0, 1);
    expect(a === null || a.fit < -2).toBe(true);
  });
  test("silence (only the blank) lines up with no letter", () => {
    expect(align(scores([0, 0, 0, 0]), O, text.ids, 0, 1)).toBeNull();
  });
  test("an empty stretch: nothing", () => {
    expect(align(scores([2, 3]), O, [], 0, 1)).toBeNull();
  });
});

describe("latest", () => {
  // a jump: the window is mostly the old place (क म ल, in the stretch) and ends on another text (न ग, never in it)
  const stretch = target("कमलकमल", IDS, 0).ids;
  const lp = scores([2, 2, 0, 3, 3, 0, 4, 4, 0, 2, 2, 0, 3, 3, 5, 5, 6, 6, 5, 6]);
  test("the window as a whole still fits the old place better than its newest steps do", () => {
    const whole = align(lp, O, stretch, 0, 1);
    const fresh = align(latest(lp, O, 6), O, stretch, 0, 1);
    expect(whole.fit).toBeGreaterThan(fresh === null ? -Infinity : fresh.fit);
    expect(fresh === null || fresh.fit < -0.6).toBe(true);
  });
  test("its last steps, each with every output; the whole window when it is shorter", () => {
    expect(latest(lp, O, 6).length).toBe(6 * O);
    expect(Array.from(latest(lp, O, 6))).toEqual(Array.from(lp.slice(14 * O)));
    expect(latest(lp, O, 50)).toBe(lp);
  });
});

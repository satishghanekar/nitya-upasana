// Hearing the chanting (js/core/hearing.js): the sound brought to the model and its answer read as letters must be
// exactly as the model's Python side does it, or the model hears something else on the phone than it was tested on.
// models/chant-v4/check.json holds what the model chose at each step of the check sound (shravan/package.py tone),
// and the words the Python side read from it.
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { choices, normalize, readLetters, resample } from "../../js/core/hearing.js";

const dir = new URL("../../models/chant-v4/", import.meta.url);
const model = JSON.parse(readFileSync(new URL("model.json", dir), "utf8"));
const check = JSON.parse(readFileSync(new URL("check.json", dir), "utf8"));
const names = JSON.parse(readFileSync(new URL("letters.json", dir), "utf8"));

describe("the model's answer into letters", () => {
  test("the check's choices read as the Python side's words", () => {
    expect(readLetters(check.ids, names, model.blank, model.word).text).toBe(check.text);
  });
  test("a letter held over several steps counts once; the blank between two of the same makes two", () => {
    const k = names.indexOf("क"),
      m = names.indexOf("म"),
      b = model.blank,
      w = model.word;
    expect(readLetters([b, k, k, k, b, m, m, b], names, b, w)).toEqual({ text: "कम", last: 5 });
    expect(readLetters([k, b, k], names, b, w).text).toBe("कक");
    // the word break is a space, never at either end nor two together
    expect(readLetters([w, k, w, b, w, m, w], names, b, w)).toEqual({ text: "क म", last: 5 });
    // nothing said: no letter, and no step
    expect(readLetters([b, b, w, b], names, b, w)).toEqual({ text: "", last: -1 });
  });
  test("each step's likeliest output", () => {
    expect(choices(new Float32Array([0, 3, 1, 9, 2, 2]), 3)).toEqual([1, 0]);
  });
  test("a step is 20 ms of sound", () => {
    expect(model.step_ms).toBe(20);
    expect(model.rate).toBe(16000);
  });
});

describe("the sound brought to the model", () => {
  test("mean 0 and spread 1", () => {
    const quiet = new Float32Array(1000).map((_, i) => 0.3 * Math.sin(i / 7) + 0.05);
    const out = normalize(quiet);
    const mean = out.reduce((a, v) => a + v, 0) / out.length;
    const spread = Math.sqrt(out.reduce((a, v) => a + (v - mean) ** 2, 0) / out.length);
    expect(Math.abs(mean)).toBeLessThan(1e-5);
    expect(spread).toBeCloseTo(1, 4);
    // (silence stays silence, not noise made loud)
    expect(normalize(new Float32Array(10)).every((v) => v === 0)).toBe(true);
  });
  test("48 kHz to 16 kHz: each three samples averaged", () => {
    expect(Array.from(resample(new Float32Array([1, 2, 3, 4, 5, 6]), 48000, 16000))).toEqual([2, 5]);
  });
  test("44.1 kHz to 16 kHz: read between samples, the length scaled", () => {
    expect(resample(new Float32Array(44100), 44100, 16000).length).toBe(16000);
  });
});

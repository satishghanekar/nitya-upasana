// Hearing the chanting (js/core/hearing.js): the sound features and the letters must be exactly what the model's
// Python side computes, or the model hears something else on the phone than it was tested on. models/chant-v2/check.json
// holds what the check sound (shravan/package.py tone) gave there.
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { features, nextToken, resample, tokensToText } from "../../js/core/hearing.js";

const dir = new URL("../../models/chant-v2/", import.meta.url);
const model = JSON.parse(readFileSync(new URL("model.json", dir), "utf8"));
const check = JSON.parse(readFileSync(new URL("check.json", dir), "utf8"));
const texts = JSON.parse(readFileSync(new URL("tokens.json", dir), "utf8"));
const bin = readFileSync(new URL("mel.bin", dir));
const filters = new Float32Array(bin.buffer, bin.byteOffset, bin.length / 4);

// the check sound, as the Python side makes it
function tone() {
  const a = new Float32Array(48000);
  for (let i = 0; i < a.length; i++) {
    const t = i / 16000;
    a[i] = 0.3 * Math.sin(2 * Math.PI * (220 + 60 * t) * t) + 0.2 * Math.sin(2 * Math.PI * 440 * t) * Math.cos(2 * Math.PI * 0.5 * t);
  }
  return a;
}

describe("sound into the model's input", () => {
  const f = features(tone(), filters, model.sound);
  test("80 rows of 3000 numbers, each frame as the Python side's to 5 decimals", () => {
    expect(f.length).toBe(80 * 3000);
    for (const [frame, values] of Object.entries(check.frames))
      values.forEach((v, mel) => expect(Math.abs(f[mel * 3000 + Number(frame)] - v)).toBeLessThan(1e-4));
  });
  test("silence past the sound is all one number, the lowest", () => {
    const tail = check.frames["2999"][0];
    // (a loop: 240,000 numbers are too many to spread into Math.min)
    expect(f.reduce((m, v) => Math.min(m, v), Infinity)).toBeCloseTo(tail, 4);
    // (the first row's frames 1000 to 2999, long past the 3 seconds: all the same number; check.json rounds it)
    const quiet = f.slice(1000, 3000);
    expect(quiet.every((v) => v === quiet[0])).toBe(true);
    expect(quiet[0]).toBeCloseTo(tail, 4);
  });
});

describe("the model's output into letters", () => {
  test("the check's tokens read as the Python side's text", () => {
    expect(tokensToText(check.tokens, texts, model.first_special)).toBe(check.text);
  });
  test("special tokens (the start, the language, the end) are left out", () => {
    expect(tokensToText([...model.start, ...check.tokens, model.end], texts, model.first_special)).toBe(check.text);
  });
});

describe("choosing each token", () => {
  const logits = new Float32Array(10).fill(0);
  logits[3] = 5;
  logits[7] = 9;
  test("the likeliest, unless the model must never write it", () => {
    expect(nextToken(logits, [], [], false)).toBe(7);
    expect(nextToken(logits, [7], [], false)).toBe(3);
    expect(nextToken(logits, [], [7], true)).toBe(3);
    expect(nextToken(logits, [], [7], false)).toBe(7);
  });
});

describe("the microphone's rate to the model's", () => {
  test("48 kHz to 16 kHz: each three samples averaged", () => {
    expect(Array.from(resample(new Float32Array([1, 2, 3, 4, 5, 6]), 48000, 16000))).toEqual([2, 5]);
  });
  test("44.1 kHz to 16 kHz: read between samples, the length scaled", () => {
    expect(resample(new Float32Array(44100), 44100, 16000).length).toBe(16000);
  });
});

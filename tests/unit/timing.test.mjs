// How long a text or a session takes (js/core/timing.js): the texts' lengths as chanted, the paces, the sums, the
// rounding, and learning a person's pace from what Follow hears.
import { describe, expect, test } from "vitest";
import { CONTENT as C, IDS, PIECES as piece, SITE } from "../content-files.mjs";
import {
  PACE_CHOICES,
  TIMING,
  addToLog,
  chantedLetters,
  cleanTiming,
  ended,
  learned,
  measure,
  minutes,
  paceFor,
  spanMinutes,
  spanOf,
} from "../../js/core/timing.js";

const T = cleanTiming(C.timing);

describe("a text's length, as it is chanted", () => {
  // the letters chanted in SG's recordings of whole texts (shravan-model's alignments, 2026-11-15): the site's count
  // must be the same, the dhrupad after every verse included, before the first only where the file says so
  test.each([
    ["aarti-sukhkarta", 472],
    ["aarti-durge-durghat-bhari", 502],
    ["aarti-jaydeva-jaydeva-samartha", 542],
    ["aarti-ghalin-lotangan", 529],
    ["ashtak-thursday", 945],
    ["vedic-chant-atharvashirsha", 2783],
  ])("%s: %i letters, as in the recording", (id, n) => {
    expect(chantedLetters(piece[id])).toBe(n);
  });
  test("the dhrupad shown at the top is a heading, not chanted there: only its repeats count", () => {
    const p = piece["aarti-sukhkarta"];
    const dh = p.refrain.lines.reduce((a, l) => a + chantedLetters({ items: [{ lines: [l] }] }), 0);
    const without = { ...p, items: p.items.filter((i) => i.kind !== "rf") };
    const stanzas = p.items.filter((i) => !i.kind && !i.rmk).length;
    expect(chantedLetters(p) - chantedLetters(without)).toBe(dh * stanzas);
  });
  test("a dhrupad sung before the first stanza counts once more", () => {
    const p = piece["aarti-kariton-guruvar"];
    const stanzas = p.items.filter((i) => !i.kind && !i.rmk).length;
    expect(p.items.filter((i) => i.kind === "rf").length).toBe(stanzas + 1);
  });
  test("every text has a length", () => {
    IDS.forEach((id) => expect(chantedLetters(piece[id]), id).toBeGreaterThan(0));
  });
});

describe("the paces", () => {
  test("content/site.json's timing is complete and as measured", () => {
    expect(cleanTiming(SITE.timing)).toEqual(SITE.timing);
    expect(T.paces.quick).toBeLessThan(T.paces.steady);
    expect(T.paces.steady).toBeLessThan(T.paces.slow);
  });
  test("anything missing or odd is the measured default", () => {
    expect(cleanTiming(undefined)).toEqual(TIMING);
    expect(cleanTiming({ paces: { quick: -1, steady: "x" }, between: NaN, learn: null })).toEqual(TIMING);
    expect(cleanTiming({ between: 0 }).between).toBe(0);
  });
  test("a pace picked is used as it is", () => {
    for (const c of ["quick", "steady", "slow"]) expect(paceFor(c, null, T)).toEqual({ lo: T.paces[c], hi: T.paces[c], how: "chosen" });
  });
  test("Auto: the range from quick to slow, until Follow has heard enough", () => {
    expect(paceFor("", null, T)).toEqual({ lo: T.paces.quick, hi: T.paces.slow, how: "range" });
    expect(paceFor("", { s: 100, n: T.learn.enough - 1 }, T).how).toBe("range");
    expect(paceFor("", { s: 160, n: 1500 }, T)).toEqual({ lo: 160 / 1500, hi: 160 / 1500, how: "learned" });
    expect(learned({}, T)).toBe(null);
  });
  test("a pace picked wins over one learned", () => {
    expect(paceFor("slow", { s: 160, n: 1500 }, T).how).toBe("chosen");
  });
  test("the choices are the ones migrate.js keeps", () => {
    expect(PACE_CHOICES).toEqual(["", "quick", "steady", "slow"]);
  });
});

describe("a session's time", () => {
  test("its texts one after another, with the time between them", () => {
    expect(spanOf([1000, 500], { lo: 0.1, hi: 0.2 }, T)).toEqual({ lo: 150 + T.between, hi: 300 + T.between });
    expect(spanOf([], { lo: 0.1, hi: 0.2 }, T)).toEqual({ lo: 0, hi: 0 });
  });
  test("whole minutes, never under 1", () => {
    expect(minutes(10)).toBe(1);
    expect(minutes(89)).toBe(1);
    expect(minutes(91)).toBe(2);
    expect(spanMinutes({ lo: 600, hi: 900 })).toEqual({ lo: 10, hi: 15 });
  });
  test("at the quick pace, SG's Thursday morning aartis come close to the 4.1 minutes they took", () => {
    const ids = ["aarti-sukhkarta", "aarti-durge-durghat-bhari", "aarti-jaydeva-jaydeva-samartha", "aarti-ghalin-lotangan"];
    const s = spanOf(
      ids.map((id) => chantedLetters(piece[id])),
      paceFor("quick", null, T),
      T,
    );
    expect(Math.abs(s.lo / 246 - 1)).toBeLessThan(0.15);
  });
});

describe("learning a pace from Follow", () => {
  const at = (id, pos, sec) => ({ id, pos, t: sec * 1000 });
  /** Places heard one after another, and what ended along the way */
  const run = (places) => {
    let st = null;
    const done = [];
    for (const h of places) {
      const r = measure(st, h, T);
      st = r.st;
      if (r.done) done.push(r.done);
    }
    return { st, done };
  };
  test("a steady stretch through one text counts, from its first place to its last", () => {
    const { st } = run([at("a1", 0, 0), at("a1", 100, 10), at("a1", 200, 20), at("a1", 300, 30), at("a1", 400, 40)]);
    expect(ended(st, T)).toEqual({ s: 40, n: 400 });
  });
  test("a stretch shorter than learn.least seconds does not", () => {
    const { st } = run([at("a1", 0, 0), at("a1", 100, 10)]);
    expect(ended(st, T)).toBe(null);
  });
  test("another text, a jump back, a jump far ahead or a long silence ends it", () => {
    const steady = [at("a1", 0, 0), at("a1", 150, 15), at("a1", 350, 35)];
    for (const breakIt of [at("a2", 10, 36), at("a1", 100, 36), at("a1", 3000, 37), at("a1", 360, 35 + T.learn.pause + 1)]) {
      const { done, st } = run([...steady, breakIt]);
      expect(done).toEqual([{ s: 35, n: 350 }]);
      expect(st.from).toBe(breakIt.pos);
    }
  });
  test("a place found a few letters behind leaves the stretch as it was", () => {
    const { st, done } = run([at("a1", 0, 0), at("a1", 200, 20), at("a1", 190, 21), at("a1", 400, 40)]);
    expect(done).toEqual([]);
    expect(ended(st, T)).toEqual({ s: 40, n: 400 });
  });
  test("an unbelievable pace is a mistake in following, not counted", () => {
    expect(ended({ id: "a1", from: 0, at: 0, pos: 100, t: 60000 }, T)).toBe(null);
  });
  test("the log adds up, and keeps learn.keep letters, the older scaled down", () => {
    expect(addToLog(null, { s: 40, n: 400 }, T)).toEqual({ s: 40, n: 400 });
    expect(addToLog({ s: 40, n: 400 }, { s: 20, n: 100 }, T)).toEqual({ s: 60, n: 500 });
    const big = addToLog({ s: 2000, n: T.learn.keep }, { s: 200, n: 1000 }, T);
    expect(big.n).toBe(T.learn.keep);
    expect(big.s / big.n).toBeCloseTo(2200 / (T.learn.keep + 1000), 3);
  });
});

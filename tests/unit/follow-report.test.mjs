// Follow's report (js/core/follow-report.js): a time's raw counts made into its account, and the accounts into the text
// shared from Settings → About
import { describe, expect, test } from "vitest";
import { KEEP, LEAST_MS, quantile, reportText, summarize } from "../../js/core/follow-report.js";

const raw = (o = {}) => ({
  at: "2026-11-21T00:42:00.000Z",
  tz: "Asia/Kolkata",
  app: "1.79.0",
  mode: "gpu",
  model: "chant-v7-q4",
  ort: "1.30.0",
  ms: 1080000,
  ready: 2400,
  downloaded: false,
  first: 5800,
  heard: [80, 84, 90, 141, 70, 84, 86, 300, 84, 84],
  failed: 0,
  quiet: 5,
  levels: [0.041, 0.05, 0.03],
  near: 6,
  search: 2,
  lost: [
    { text: "aarti-sukhkarta", line: 6 },
    { text: "ashtak-rudrashtakam", line: 2 },
  ],
  toText: 2,
  back: 1,
  forward: 0,
  paces: [7.2, 7.6, 8.9, 6.1, 7.6],
  hand: 1,
  end: "Stop",
  texts: { "aarti-sukhkarta": { ms: 250000, heard: 6, found: 5 }, "ashtak-rudrashtakam": { ms: 365000, heard: 4, found: 3 } },
  ...o,
});

describe("Follow's report", () => {
  test("keeps the last 6 times, of half a minute or more", () => {
    expect([KEEP, LEAST_MS]).toEqual([6, 30000]);
  });
  test("quantile: the value below which that share lies", () => {
    expect(quantile([], 0.5)).toBe(0);
    expect(quantile([5, 1, 3], 0.5)).toBe(3);
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 100], 0.95)).toBe(19);
  });
  test("a time's account: the typical and slowest hearings, the pace, the texts longest first", () => {
    const a = summarize(raw());
    expect(a).toMatchObject({ n: 10, typical: 84, slow: 300, level: 0.041, pace: 7.6, paceLo: 6.1, paceHi: 8.9 });
    expect(a.texts.map((t) => t.id)).toEqual(["ashtak-rudrashtakam", "aarti-sukhkarta"]);
    // small: about 600 bytes
    expect(JSON.stringify(a).length).toBeLessThan(1000);
    // at most 10 places lost and 12 texts
    const many = summarize(raw({ lost: Array.from({ length: 30 }, (_, i) => ({ text: "t", line: i })) }));
    expect(many.lost).toHaveLength(10);
  });
  test("the text: the phone once, then each time, newest first, in English", () => {
    const t = reportText(
      [summarize(raw()), summarize(raw({ mode: "cpu", at: "2026-11-20T14:10:00.000Z", end: "no chanting for 5 minutes" }))],
      { model: "SM-S928B", platform: "Android", platformVersion: "17", browser: "Google Chrome 158", installed: true, cores: 8, memory: 8, ua: "UA" },
      "1.79.0",
    );
    const lines = t.split("\n");
    expect(lines[0]).toBe("Nitya Upasana 1.79.0: Follow report (last 2 times)");
    expect(lines[1]).toBe("Phone: SM-S928B, Android 17, Google Chrome 158, installed app, 8 cores, 8 GB memory");
    expect(t).toContain("1) Sat 21 Nov, 6:12 am (Asia/Kolkata), 18 min, fast mode (GPU), app 1.79.0");
    expect(t).toContain("Start: model ready 2.4 s, first place found 5.8 s");
    expect(t).toContain("Speed: 10 hearings, 84 ms typical, 300 ms slowest 5%, 0 failed");
    expect(t).toContain("Sound: chanting 67%, quiet 33%, level 0.041 typical");
    expect(t).toContain("Found: 80% of hearings (60% near the mark, 20% by search)");
    expect(t).toContain("Lost: 2 times (aarti-sukhkarta line 7, ashtak-rudrashtakam line 3)");
    expect(t).toContain("Jumps: 2 to another text, 1 back, 0 forward");
    expect(t).toContain("Pace: 7.6 letters a second (6.1 to 8.9)");
    expect(t).toContain("Reader: scrolled by hand 1 time, ended with Stop");
    expect(t).toContain("Texts: ashtak-rudrashtakam 6:05 75%, aarti-sukhkarta 4:10 83%");
    expect(t).toContain("2) Fri 20 Nov, 7:40 pm (Asia/Kolkata), 18 min, standard mode (CPU)");
    expect(t).toContain("ended with no chanting for 5 minutes");
  });
  test("nothing found: never, and no division by nothing", () => {
    const t = reportText([summarize(raw({ heard: [], quiet: 0, near: 0, search: 0, first: -1, lost: [], texts: {} }))], {}, "1");
    expect(t).toContain("first place found never");
    expect(t).toContain("Found: 0% of hearings");
    expect(t).toContain("Lost: 0 times");
  });
});
